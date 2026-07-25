import { internalMutation } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { ADMIN_SESSION_TTL_MS } from './adminModel'
import { expireAdminSessionRecord } from './adminInternal'
import {
  hashAdminToken,
  requireAdminSession,
} from './adminSecurity'
import { insertInvitation } from './rsvpInternal'
import { createRsvpSession } from './rsvpSecurity'
import { applyModerationTransition } from './adminPosts'
import { WINE_CATALOG } from './wineCatalog'
import {
  readWineGiftState,
  transitionWineGiftState,
} from './wineOperations'

const SMOKE_TOKEN = 'c29sNDAtaW50ZXJuYWwtc21va2UtdG9rZW4tMDAwMDA'

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

const FAMILY_SMOKE_PREFIX = 'Smoke admin RSVP 06-03'
const FAMILY_SMOKE_MAX_ROWS = 8

/**
 * Bounded, internal and self-cleaning. The fixture is required to be disjoint
 * from existing rows; every created id is tracked and removed from `finally`.
 */
export const smokeFamilyCascade = internalMutation({
  args: {},
  handler: async (ctx) => {
    const suffix = String(Date.now()).slice(-8)
    const phone = `799${suffix}`
    const preExisting = await ctx.db
      .query('rsvps')
      .withIndex('by_phone', (index) => index.eq('phone', phone))
      .take(2)
    if (preExisting.length > 0) {
      throw new Error('Smoke family fixture collided with pre-existing data.')
    }

    let familyId: Awaited<ReturnType<typeof insertInvitation>>['rsvpId'] | null = null
    const createdGuestIds: Array<Awaited<ReturnType<typeof insertInvitation>>['guestIds'][number]> = []
    let createdSessionId: Id<'rsvpSessions'> | null = null

    try {
      const inserted = await insertInvitation(ctx, {
        phone,
        displayName: `${FAMILY_SMOKE_PREFIX} ${suffix}`,
        guests: [{ name: 'Pessoa smoke', attendance: 'pending' }],
      })
      familyId = inserted.rsvpId
      createdGuestIds.push(...inserted.guestIds)
      const session = await createRsvpSession(ctx, {
        rsvpId: inserted.rsvpId,
        token: 'A'.repeat(43),
      })
      if (session.kind !== 'created') throw new Error('Smoke session was not created.')
      const storedSession = await ctx.db
        .query('rsvpSessions')
        .withIndex('by_token_hash', (index) => index.eq('tokenHash', session.tokenHash))
        .unique()
      if (!storedSession) throw new Error('Smoke session row was not found.')
      createdSessionId = storedSession._id

      const guests = await ctx.db
        .query('rsvpGuests')
        .withIndex('by_rsvp', (index) => index.eq('rsvpId', inserted.rsvpId))
        .take(FAMILY_SMOKE_MAX_ROWS + 1)
      const sessions = await ctx.db
        .query('rsvpSessions')
        .withIndex('by_rsvp', (index) => index.eq('rsvpId', inserted.rsvpId))
        .take(FAMILY_SMOKE_MAX_ROWS + 1)
      if (
        guests.length !== 1 ||
        sessions.length !== 1 ||
        guests.length + sessions.length > FAMILY_SMOKE_MAX_ROWS
      ) {
        throw new Error('Smoke family fixture exceeded its bounded shape.')
      }

      for (const guest of guests) await ctx.db.delete(guest._id)
      for (const publicSession of sessions) await ctx.db.delete(publicSession._id)
      await ctx.db.delete(inserted.rsvpId)
      familyId = null

      return {
        createdFamily: true,
        indexedGuestCount: guests.length,
        indexedSessionCount: sessions.length,
        cascadeRemovedEverything:
          (await ctx.db.get(inserted.rsvpId)) === null &&
          (await ctx.db.get(guests[0]._id)) === null &&
          (await ctx.db.get(sessions[0]._id)) === null,
      }
    } finally {
      if (createdSessionId) {
        const row = await ctx.db.get(createdSessionId)
        if (row) await ctx.db.delete(createdSessionId)
      }
      for (const guestId of createdGuestIds) {
        const row = await ctx.db.get(guestId)
        if (row) await ctx.db.delete(guestId)
      }
      if (familyId) {
        const row = await ctx.db.get(familyId)
        if (row) await ctx.db.delete(familyId)
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
