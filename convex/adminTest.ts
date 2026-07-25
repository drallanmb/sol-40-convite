import { v } from 'convex/values'
import type { FunctionReference } from 'convex/server'
import { internal } from './_generated/api'
import {
  internalAction,
  internalMutation,
  internalQuery,
} from './_generated/server'
import type { Id } from './_generated/dataModel'
import { ADMIN_SESSION_TTL_MS } from './adminModel'
import {
  expireAdminSessionRecord,
  sweepExpiredAuditEventsHandler,
} from './adminInternal'
import { ADMIN_AUDIT_RETENTION_MS } from './adminAuditModel'
import {
  hashAdminToken,
  requireAdminSession,
} from './adminSecurity'
import {
  expireRsvpSessionRecord,
  insertInvitation,
  startExpiredRsvpSessionSweepHandler,
} from './rsvpInternal'
import {
  createRsvpSession,
  encodeOpaqueToken,
  resolveActiveRsvpSession,
} from './rsvpSecurity'
import { applyModerationTransition } from './adminPosts'
import { WINE_CATALOG } from './wineCatalog'
import {
  readWineGiftState,
  transitionWineGiftState,
} from './wineOperations'

const SMOKE_TOKEN = 'c29sNDAtaW50ZXJuYWwtc21va2UtdG9rZW4tMDAwMDA'

/**
 * Read-only deployment preflight for the Phase 8 Preview runbook. It returns
 * only aggregate state: no account identifiers, e-mails, links, tokens or
 * audit payloads can cross this boundary.
 */
export const checkPhase8DeploymentReadiness = internalQuery({
  args: {},
  handler: async (ctx) => {
    const accounts = await ctx.db.query('adminAccounts').collect()
    const config = await ctx.db
      .query('adminAuthConfig')
      .withIndex('by_key', (index) => index.eq('key', 'primary'))
      .unique()
    const now = Date.now()
    const pendingLinks = await ctx.db
      .query('adminAccessLinks')
      .withIndex('by_expires_at', (index) => index.gt('expiresAt', now))
      .collect()
    const visibleAuditEvents = await ctx.db
      .query('adminAuditEvents')
      .withIndex('by_expires_at', (index) => index.gt('expiresAt', now))
      .collect()

    return {
      deploymentShape: 'phase8',
      bootstrapState:
        config?.bootstrapCompletedAt !== undefined
          ? 'complete'
          : config?.ownerAccountId !== undefined
            ? 'pending'
            : 'available',
      legacyCutoffSet: config?.legacyDisabledAt !== undefined,
      accountCounts: {
        owner: accounts.filter((account) => account.role === 'owner').length,
        manager: accounts.filter((account) => account.role === 'manager')
          .length,
        seller: accounts.filter((account) => account.role === 'seller').length,
      },
      activePendingLinkCount: pendingLinks.filter(
        (link) =>
          link.consumedAt === undefined && link.revokedAt === undefined,
      ).length,
      visibleAuditEventCount: visibleAuditEvents.length,
    }
  },
})

function summarizeDurations(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right)
  const percentile = (fraction: number) =>
    sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)]
  return {
    samples: sorted.length,
    p50Ms: percentile(0.5),
    p95Ms: percentile(0.95),
  }
}

/**
 * Node-runtime KDF benchmark. The passphrase and envelope never leave this
 * action; only bounded timing summaries and boolean outcomes are returned.
 */
export const smokePhase8Scrypt = internalAction({
  args: {},
  handler: async (ctx) => {
    const passphrase = 'Brisa dourada de Preview sobre o mar 2026'
    const hashed = await ctx.runAction(
      internal.adminPasswordActions.hashAdminPassword,
      { password: passphrase, context: {} },
    )
    if (hashed.kind !== 'hashed') {
      throw new Error('Phase 8 smoke passphrase was rejected.')
    }

    const correctDurations: number[] = []
    const incorrectDurations: number[] = []
    for (let sample = 0; sample < 2; sample += 1) {
      const correctStartedAt = Date.now()
      const correct = await ctx.runAction(
        internal.adminPasswordActions.verifyAdminPassword,
        { password: passphrase, envelope: hashed.envelope },
      )
      correctDurations.push(Date.now() - correctStartedAt)
      if (correct.kind !== 'verified' || !correct.valid) {
        throw new Error('Phase 8 correct KDF probe failed.')
      }

      const incorrectStartedAt = Date.now()
      const incorrect = await ctx.runAction(
        internal.adminPasswordActions.verifyAdminPassword,
        {
          password: `${passphrase} incorreta`,
          envelope: hashed.envelope,
        },
      )
      incorrectDurations.push(Date.now() - incorrectStartedAt)
      if (incorrect.kind !== 'verified' || incorrect.valid) {
        throw new Error('Phase 8 incorrect KDF probe failed.')
      }
    }

    return {
      kind: 'passed',
      correct: summarizeDurations(correctDurations),
      incorrect: summarizeDurations(incorrectDurations),
    } as const
  },
})

/**
 * Bounded retention probe. It creates one expired and one active aggregate
 * event, runs the same sweep handler as the cron, and removes the control row.
 */
export const smokePhase8Retention = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const expiredId = await ctx.db.insert('adminAuditEvents', {
      actorKind: 'system',
      actorName: 'Preview smoke',
      area: 'auth',
      action: 'login_failed',
      changes: [],
      occurredAt: now - ADMIN_AUDIT_RETENTION_MS - 1,
      expiresAt: now - 1,
    })
    const activeId = await ctx.db.insert('adminAuditEvents', {
      actorKind: 'system',
      actorName: 'Preview smoke',
      area: 'auth',
      action: 'login_failed',
      changes: [],
      occurredAt: now,
      expiresAt: now + ADMIN_AUDIT_RETENTION_MS,
    })

    try {
      const sweep = await sweepExpiredAuditEventsHandler(ctx)
      return {
        kind: 'passed',
        expiredDeleted: (await ctx.db.get(expiredId)) === null,
        activeRetained: (await ctx.db.get(activeId)) !== null,
        scanned: sweep.scanned,
        deleted: sweep.deleted,
      } as const
    } finally {
      const expired = await ctx.db.get(expiredId)
      if (expired) await ctx.db.delete(expiredId)
      const active = await ctx.db.get(activeId)
      if (active) await ctx.db.delete(activeId)
    }
  },
})

/**
 * Internal-only and self-cleaning: proves the deployed session schema and
 * expiry guard without returning a reusable capability or leaving a session.
 */
export const smokeSessionLifecycle = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const expiresAt = now + ADMIN_SESSION_TTL_MS
    const sessionId = await ctx.db.insert('adminSessions', {
      tokenHash: await hashAdminToken(SMOKE_TOKEN),
      createdAt: now,
      expiresAt,
    })

    const before = await requireAdminSession(ctx, SMOKE_TOKEN, now)
    const expired = await expireAdminSessionRecord(ctx, {
      sessionId,
      expectedExpiresAt: expiresAt,
    })
    const repeated = await expireAdminSessionRecord(ctx, {
      sessionId,
      expectedExpiresAt: expiresAt,
    })
    const after = await requireAdminSession(ctx, SMOKE_TOKEN, now)

    return {
      createdAndAuthorized: before.kind === 'authorized',
      expiryResult: expired.kind,
      repeatedExpiryResult: repeated.kind,
      revokedAfterExpiry: after.kind === 'unauthorized',
    }
  },
})

/**
 * Internal-only and self-cleaning. Exercises the deployed public-session
 * expiry and historical sweep seams without returning any capability data.
 */
export const smokeRsvpSessionLifecycle = internalMutation({
  args: {},
  handler: async (ctx) => {
    const suffix = String(Date.now()).slice(-8)
    let familyId: Id<'rsvps'> | null = null
    const createdSessionIds: Id<'rsvpSessions'>[] = []

    try {
      const inserted = await insertInvitation(ctx, {
        phone: `799${suffix}`,
        displayName: `Smoke RSVP lifecycle ${suffix}`,
        guests: [],
      })
      familyId = inserted.rsvpId
      const now = Date.now()
      const expiredBytes = new Uint8Array(32)
      const activeBytes = new Uint8Array(32)
      crypto.getRandomValues(expiredBytes)
      crypto.getRandomValues(activeBytes)
      const expiredToken = encodeOpaqueToken(expiredBytes)
      const activeToken = encodeOpaqueToken(activeBytes)
      const expired = await createRsvpSession(ctx, {
        rsvpId: inserted.rsvpId,
        token: expiredToken,
        now,
        expiresAt: now - 1,
      })
      const active = await createRsvpSession(ctx, {
        rsvpId: inserted.rsvpId,
        token: activeToken,
        now,
        expiresAt: now + 60_000,
      })
      if (expired.kind !== 'created' || active.kind !== 'created') {
        throw new Error('Smoke RSVP sessions were not created.')
      }
      const sessions = await ctx.db
        .query('rsvpSessions')
        .withIndex('by_rsvp', (index) => index.eq('rsvpId', inserted.rsvpId))
        .collect()
      createdSessionIds.push(...sessions.map((session) => session._id))
      const expiredRow = sessions.find(
        (session) => session.tokenHash === expired.tokenHash,
      )
      if (!expiredRow) throw new Error('Smoke expired RSVP session is missing.')

      const firstExpiry = await expireRsvpSessionRecord(ctx, {
        sessionId: expiredRow._id,
        expectedExpiresAt: expiredRow.expiresAt,
      })
      const repeatedExpiry = await expireRsvpSessionRecord(ctx, {
        sessionId: expiredRow._id,
        expectedExpiresAt: expiredRow.expiresAt,
      })
      const firstSweep = await startExpiredRsvpSessionSweepHandler(ctx)
      const repeatedSweep = await startExpiredRsvpSessionSweepHandler(ctx)
      const activeAuthorization = await resolveActiveRsvpSession(
        ctx,
        activeToken,
        now,
      )

      return {
        expiryDeleted: firstExpiry.kind === 'expired',
        expiryRetryIgnored: repeatedExpiry.kind === 'ignored',
        sweepIdempotent:
          firstSweep.deleted === 0 &&
          repeatedSweep.deleted === 0 &&
          firstSweep.done &&
          repeatedSweep.done,
        activeControlAuthorized: activeAuthorization !== null,
      }
    } finally {
      for (const sessionId of createdSessionIds) {
        const session = await ctx.db.get(sessionId)
        if (session) await ctx.db.delete(sessionId)
      }
      if (familyId) {
        const family = await ctx.db.get(familyId)
        if (family) await ctx.db.delete(familyId)
      }
    }
  },
})

const FAMILY_SMOKE_PREFIX = 'Smoke admin RSVP 06-06'

export const setupFamilyCascadeSmoke = internalMutation({
  args: {
    suffix: v.string(),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    if (!/^\d{8}$/u.test(args.suffix)) {
      throw new Error('Invalid smoke family suffix.')
    }
    const phone = `799${args.suffix}`
    const preExisting = await ctx.db
      .query('rsvps')
      .withIndex('by_phone', (index) => index.eq('phone', phone))
      .take(2)
    if (preExisting.length > 0) {
      throw new Error('Smoke family fixture collided with pre-existing data.')
    }

    const inserted = await insertInvitation(ctx, {
      phone,
      displayName: `${FAMILY_SMOKE_PREFIX} ${args.suffix}`,
      guests: [{ name: 'Pessoa smoke', attendance: 'pending' }],
    })
    const session = await createRsvpSession(ctx, {
      rsvpId: inserted.rsvpId,
      token: args.token,
    })
    if (session.kind !== 'created') {
      throw new Error('Smoke session was not created.')
    }

    return {
      familyId: inserted.rsvpId,
      guestId: inserted.guestIds[0],
    }
  },
})

export const advanceFamilyCascadeSmokeGeneration = internalMutation({
  args: {
    familyId: v.id('rsvps'),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const before = await resolveActiveRsvpSession(ctx, args.token)
    const family = await ctx.db.get(args.familyId)
    if (!family) throw new Error('Smoke family was not found.')
    await ctx.db.patch(family._id, {
      generation: (family.generation ?? 0) + 1,
    })
    const after = await resolveActiveRsvpSession(ctx, args.token)
    return {
      beforeAuthorized: before !== null,
      afterUnauthorized: after === null,
    }
  },
})

export const issueFamilyCascadeSmokeSession = internalMutation({
  args: {
    familyId: v.id('rsvps'),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const created = await createRsvpSession(ctx, {
      rsvpId: args.familyId,
      token: args.token,
    })
    if (created.kind !== 'created') {
      throw new Error('Smoke orphan control session was not created.')
    }
    return { created: true }
  },
})

export const removeFamilyCascadeSmokeFamily = internalMutation({
  args: {
    familyId: v.id('rsvps'),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const guests = await ctx.db
      .query('rsvpGuests')
      .withIndex('by_rsvp', (index) => index.eq('rsvpId', args.familyId))
      .take(3)
    if (guests.length !== 1) {
      throw new Error('Smoke family guest shape changed.')
    }
    for (const guest of guests) await ctx.db.delete(guest._id)
    await ctx.db.delete(args.familyId)
    return {
      familyAbsent: (await ctx.db.get(args.familyId)) === null,
      capabilityUnauthorized:
        (await resolveActiveRsvpSession(ctx, args.token)) === null,
    }
  },
})

export const inspectFamilyCascadeSmoke = internalMutation({
  args: {
    familyId: v.id('rsvps'),
  },
  handler: async (ctx, args) => {
    const guests = await ctx.db
      .query('rsvpGuests')
      .withIndex('by_rsvp', (index) => index.eq('rsvpId', args.familyId))
      .collect()
    const sessions = await ctx.db
      .query('rsvpSessions')
      .withIndex('by_rsvp', (index) => index.eq('rsvpId', args.familyId))
      .collect()
    return {
      familyMissing: (await ctx.db.get(args.familyId)) === null,
      guestCount: guests.length,
      sessionCount: sessions.length,
    }
  },
})

export const cleanupFamilyCascadeSmoke = internalMutation({
  args: {
    familyId: v.id('rsvps'),
  },
  handler: async (ctx, args) => {
    const guests = await ctx.db
      .query('rsvpGuests')
      .withIndex('by_rsvp', (index) => index.eq('rsvpId', args.familyId))
      .collect()
    const sessions = await ctx.db
      .query('rsvpSessions')
      .withIndex('by_rsvp', (index) => index.eq('rsvpId', args.familyId))
      .collect()
    for (const guest of guests) await ctx.db.delete(guest._id)
    for (const session of sessions) await ctx.db.delete(session._id)
    const family = await ctx.db.get(args.familyId)
    if (family) await ctx.db.delete(family._id)
    return { cleaned: true }
  },
})

type FamilyCascadeFixture = {
  familyId: Id<'rsvps'>
  guestId: Id<'rsvpGuests'>
}

type PurgeResult = {
  scanned: number
  deleted: number
  done: boolean
  nextCursor?: string
}

const familyCascadeSmokeRefs = (internal as unknown as {
  adminTest: {
    setupFamilyCascadeSmoke: FunctionReference<
      'mutation',
      'internal',
      { suffix: string; token: string },
      FamilyCascadeFixture
    >
    advanceFamilyCascadeSmokeGeneration: FunctionReference<
      'mutation',
      'internal',
      { familyId: Id<'rsvps'>; token: string },
      { beforeAuthorized: boolean; afterUnauthorized: boolean }
    >
    issueFamilyCascadeSmokeSession: FunctionReference<
      'mutation',
      'internal',
      { familyId: Id<'rsvps'>; token: string },
      { created: boolean }
    >
    removeFamilyCascadeSmokeFamily: FunctionReference<
      'mutation',
      'internal',
      { familyId: Id<'rsvps'>; token: string },
      { familyAbsent: boolean; capabilityUnauthorized: boolean }
    >
    inspectFamilyCascadeSmoke: FunctionReference<
      'mutation',
      'internal',
      { familyId: Id<'rsvps'> },
      { familyMissing: boolean; guestCount: number; sessionCount: number }
    >
    cleanupFamilyCascadeSmoke: FunctionReference<
      'mutation',
      'internal',
      { familyId: Id<'rsvps'> },
      { cleaned: boolean }
    >
  }
  rsvpInternal: {
    purgeRsvpSessionsBatch: FunctionReference<
      'mutation',
      'internal',
      {
        rsvpId: Id<'rsvps'>
        command:
          | { kind: 'olderThanGeneration'; commandGeneration: number }
          | { kind: 'deleteAll' }
      },
      PurgeResult
    >
  }
})

/**
 * Internal-only and self-cleaning. Separate bounded mutations let the action
 * exercise each paginated cleanup transaction against the real deployment.
 */
export const smokeFamilyCascade = internalAction({
  args: {},
  handler: async (ctx) => {
    const suffixBytes = new Uint8Array(4)
    const oldTokenBytes = new Uint8Array(32)
    const orphanTokenBytes = new Uint8Array(32)
    crypto.getRandomValues(suffixBytes)
    crypto.getRandomValues(oldTokenBytes)
    crypto.getRandomValues(orphanTokenBytes)
    const suffix = String(
      new DataView(suffixBytes.buffer).getUint32(0) % 100_000_000,
    ).padStart(8, '0')
    const oldToken = encodeOpaqueToken(oldTokenBytes)
    const orphanToken = encodeOpaqueToken(orphanTokenBytes)
    let fixture: FamilyCascadeFixture | null = null

    try {
      fixture = await ctx.runMutation(
        familyCascadeSmokeRefs.adminTest.setupFamilyCascadeSmoke,
        { suffix, token: oldToken },
      )
      const logical = await ctx.runMutation(
        familyCascadeSmokeRefs.adminTest.advanceFamilyCascadeSmokeGeneration,
        { familyId: fixture.familyId, token: oldToken },
      )
      const firstPurge = await ctx.runMutation(
        familyCascadeSmokeRefs.rsvpInternal.purgeRsvpSessionsBatch,
        {
          rsvpId: fixture.familyId,
          command: {
            kind: 'olderThanGeneration',
            commandGeneration: 1,
          },
        },
      )
      const repeatedPurge = await ctx.runMutation(
        familyCascadeSmokeRefs.rsvpInternal.purgeRsvpSessionsBatch,
        {
          rsvpId: fixture.familyId,
          command: {
            kind: 'olderThanGeneration',
            commandGeneration: 1,
          },
        },
      )
      await ctx.runMutation(
        familyCascadeSmokeRefs.adminTest.issueFamilyCascadeSmokeSession,
        { familyId: fixture.familyId, token: orphanToken },
      )
      const removed = await ctx.runMutation(
        familyCascadeSmokeRefs.adminTest.removeFamilyCascadeSmokeFamily,
        { familyId: fixture.familyId, token: orphanToken },
      )
      const orphanPurge = await ctx.runMutation(
        familyCascadeSmokeRefs.rsvpInternal.purgeRsvpSessionsBatch,
        {
          rsvpId: fixture.familyId,
          command: { kind: 'deleteAll' },
        },
      )
      const inspected = await ctx.runMutation(
        familyCascadeSmokeRefs.adminTest.inspectFamilyCascadeSmoke,
        { familyId: fixture.familyId },
      )

      return {
        createdFamily: true,
        logicalPhoneRevocationImmediate:
          logical.beforeAuthorized && logical.afterUnauthorized,
        staleGenerationPurged:
          firstPurge.deleted === 1 && firstPurge.done,
        purgeRetryIdempotent:
          repeatedPurge.deleted === 0 && repeatedPurge.done,
        familyAbsenceRevocationImmediate:
          removed.familyAbsent && removed.capabilityUnauthorized,
        orphanSessionsPurged:
          orphanPurge.deleted === 1 && orphanPurge.done,
        fixturesRemoved:
          inspected.familyMissing &&
          inspected.guestCount === 0 &&
          inspected.sessionCount === 0,
      }
    } finally {
      if (fixture) {
        await ctx.runMutation(
          familyCascadeSmokeRefs.adminTest.cleanupFamilyCascadeSmoke,
          { familyId: fixture.familyId },
        )
      }
    }
  },
})

const MODERATION_SMOKE_MESSAGE = 'Smoke admin moderation 06-04'
const GIFT_SMOKE_BY = 'Smoke admin gift 06-04'

/**
 * Bounded real-backend proof. Every created row is removed and every existing
 * wine is restored in finally through the same transition helper as production.
 */
export const smokeModerationAndGift = internalMutation({
  args: {},
  handler: async (ctx) => {
    let postId: Id<'posts'> | null = null
    let wineId: Id<'wines'> | null = null
    let createdWine = false
    let previousWineState: ReturnType<typeof readWineGiftState> | null = null

    try {
      postId = await ctx.db.insert('posts', {
        message: MODERATION_SMOKE_MESSAGE,
        status: 'pendente',
        source: 'convidado',
        createdAt: Date.now(),
      })
      const post = await ctx.db.get(postId)
      if (!post) throw new Error('Smoke post was not created.')
      const moderated = await applyModerationTransition(ctx, {
        post,
        targetStatus: 'aprovado',
        now: Date.now(),
      })
      if (
        moderated.status !== 'aprovado' ||
        moderated.moderationRevision !== 1
      ) {
        throw new Error('Smoke moderation transition failed.')
      }

      const canonical = WINE_CATALOG[0]
      const matches = await ctx.db
        .query('wines')
        .withIndex('by_product_code', (index) =>
          index.eq('productCode', canonical.productCode),
        )
        .take(2)
      if (matches.length > 1) throw new Error('Smoke wine code is duplicated.')
      if (matches.length === 0) {
        wineId = await ctx.db.insert('wines', {
          ...canonical,
          status: 'available',
          updatedAt: Date.now(),
        })
        createdWine = true
      } else {
        wineId = matches[0]._id
      }
      const wine = await ctx.db.get(wineId)
      if (!wine) throw new Error('Smoke wine was not found.')
      previousWineState = readWineGiftState(wine)
      const gifted = await transitionWineGiftState(ctx, {
        wineId,
        expectedStatus: wine.status,
        expectedUpdatedAt: wine.updatedAt,
        target: {
          status: 'gifted',
          giftedBy: GIFT_SMOKE_BY,
          giftedAt: Date.now(),
        },
      })
      if (
        gifted.kind !== 'updated' ||
        gifted.wine.status !== 'gifted' ||
        gifted.wine.giftedBy !== GIFT_SMOKE_BY
      ) {
        throw new Error('Smoke gift transition failed.')
      }

      return {
        moderationTransitioned: true,
        giftTransitioned: true,
        fixturesBounded: true,
      }
    } finally {
      if (postId) {
        const post = await ctx.db.get(postId)
        if (post) await ctx.db.delete(postId)
      }
      if (wineId) {
        const wine = await ctx.db.get(wineId)
        if (wine) {
          if (createdWine) {
            await ctx.db.delete(wineId)
          } else if (previousWineState) {
            const restored = await transitionWineGiftState(ctx, {
              wineId,
              expectedStatus: wine.status,
              expectedUpdatedAt: wine.updatedAt,
              target: previousWineState,
            })
            if (restored.kind !== 'updated') {
              throw new Error('Smoke wine snapshot restoration failed.')
            }
          }
        }
      }
    }
  },
})
