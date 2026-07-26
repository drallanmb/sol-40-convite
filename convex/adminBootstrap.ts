import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import {
  internalMutation,
  internalQuery,
  query,
  type MutationCtx,
} from './_generated/server'
import { appendAuditEvent, buildAuditChanges } from './adminAuditModel'
import {
  ADMIN_ACCESS_LINK_TTL_MS,
  scheduleAdminAccessLinkExpiration,
} from './adminAccessLinks'
import { normalizeAdminEmail } from './adminAccountModel'
import { adminRateLimiter } from './adminRateLimits'

export const BOOTSTRAP_OWNER_EMAIL = 'allanmesquitab@gmail.com'
export const BOOTSTRAP_OWNER_NAME = 'Allan'

function nextAccountUpdatedAt(current: number, now: number) {
  return Math.max(now, current + 1)
}

export const getBootstrapStatus = query({
  args: {},
  returns: v.union(
    v.object({ kind: v.literal('available') }),
    v.object({ kind: v.literal('pending') }),
    v.object({ kind: v.literal('complete') }),
  ),
  handler: async (ctx) => {
    const configs = await ctx.db
      .query('adminAuthConfig')
      .withIndex('by_key', (query) => query.eq('key', 'primary'))
      .take(2)
    if (configs.length === 0) return { kind: 'available' } as const
    if (configs.length !== 1) return { kind: 'complete' } as const
    return configs[0].bootstrapCompletedAt === undefined
      ? ({ kind: 'pending' } as const)
      : ({ kind: 'complete' } as const)
  },
})

export const consumeMasterAttempt = internalMutation({
  args: {
    operation: v.union(v.literal('bootstrap'), v.literal('recovery')),
  },
  returns: v.union(
    v.object({ kind: v.literal('allowed') }),
    v.object({
      kind: v.literal('rate_limited'),
      retryAfterSeconds: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const name =
      args.operation === 'bootstrap'
        ? 'bootstrapGlobal'
        : 'masterRecoveryGlobal'
    const result = await adminRateLimiter.limit(ctx, name, {
      key: args.operation,
    })
    if (!result.ok) {
      return {
        kind: 'rate_limited',
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((result.retryAfter ?? 0) / 1_000),
        ),
      } as const
    }
    return { kind: 'allowed' } as const
  },
})

export const finishBootstrap = internalMutation({
  args: {
    email: v.string(),
    tokenHash: v.string(),
    now: v.number(),
  },
  returns: v.union(
    v.object({ kind: v.literal('created') }),
    v.object({ kind: v.literal('pending') }),
    v.object({ kind: v.literal('unavailable') }),
  ),
  handler: async (ctx, args) => {
    if (normalizeAdminEmail(args.email) !== BOOTSTRAP_OWNER_EMAIL) {
      return { kind: 'unavailable' } as const
    }
    const configs = await ctx.db
      .query('adminAuthConfig')
      .withIndex('by_key', (query) => query.eq('key', 'primary'))
      .take(2)
    if (configs.length > 0) {
      if (
        configs.length === 1 &&
        configs[0].bootstrapCompletedAt === undefined
      ) {
        return { kind: 'pending' } as const
      }
      return { kind: 'unavailable' } as const
    }
    const ownerRows = await ctx.db
      .query('adminAccounts')
      .withIndex('by_role', (query) => query.eq('role', 'owner'))
      .take(2)
    if (ownerRows.length !== 0) return { kind: 'unavailable' } as const

    const ownerAccountId = await ctx.db.insert('adminAccounts', {
      email: BOOTSTRAP_OWNER_EMAIL,
      displayName: BOOTSTRAP_OWNER_NAME,
      role: 'owner',
      state: 'pending',
      credentialVersion: 0,
      createdAt: args.now,
      updatedAt: args.now,
    })
    await ctx.db.insert('adminAuthConfig', {
      key: 'primary',
      ownerAccountId,
    })
    const expiresAt = args.now + ADMIN_ACCESS_LINK_TTL_MS
    const linkId = await ctx.db.insert('adminAccessLinks', {
      accountId: ownerAccountId,
      purpose: 'activation',
      tokenHash: args.tokenHash,
      credentialVersion: 0,
      createdAt: args.now,
      expiresAt,
    })
    await scheduleAdminAccessLinkExpiration(ctx, linkId, expiresAt)
    await appendAuditEvent(ctx, {
      actorKind: 'system',
      subjectAccountId: ownerAccountId,
      area: 'accounts',
      action: 'account_created',
      targetType: 'adminAccount',
      targetId: ownerAccountId,
      targetLabel: BOOTSTRAP_OWNER_NAME,
      occurredAt: args.now,
    })
    return { kind: 'created' } as const
  },
})

export const regenerateBootstrapActivation = internalMutation({
  args: {
    expectedAccountId: v.id('adminAccounts'),
    expectedCredentialVersion: v.number(),
    expectedUpdatedAt: v.number(),
    tokenHash: v.string(),
    now: v.number(),
  },
  returns: v.union(
    v.object({ kind: v.literal('created') }),
    v.object({ kind: v.literal('conflict') }),
    v.object({ kind: v.literal('unavailable') }),
  ),
  handler: async (ctx, args) => {
    const configs = await ctx.db
      .query('adminAuthConfig')
      .withIndex('by_key', (query) => query.eq('key', 'primary'))
      .take(2)
    const config = configs.length === 1 ? configs[0] : null
    if (
      config === null ||
      config.bootstrapCompletedAt !== undefined ||
      config.ownerAccountId === undefined
    ) {
      return { kind: 'unavailable' } as const
    }
    const owner = await ctx.db.get(config.ownerAccountId)
    if (
      owner === null ||
      owner.role !== 'owner' ||
      owner.state !== 'pending'
    ) {
      return { kind: 'unavailable' } as const
    }
    if (
      owner._id !== args.expectedAccountId ||
      owner.credentialVersion !== args.expectedCredentialVersion ||
      owner.updatedAt !== args.expectedUpdatedAt
    ) {
      return { kind: 'conflict' } as const
    }
    const collision = await ctx.db
      .query('adminAccessLinks')
      .withIndex('by_token_hash', (query) =>
        query.eq('tokenHash', args.tokenHash),
      )
      .first()
    if (collision) return { kind: 'conflict' } as const

    const links = await ctx.db
      .query('adminAccessLinks')
      .withIndex('by_account_purpose', (query) =>
        query.eq('accountId', owner._id).eq('purpose', 'activation'),
      )
      .collect()
    for (const link of links) {
      if (link.consumedAt === undefined && link.revokedAt === undefined) {
        await ctx.db.patch(link._id, { revokedAt: args.now })
      }
    }
    const expiresAt = args.now + ADMIN_ACCESS_LINK_TTL_MS
    const linkId = await ctx.db.insert('adminAccessLinks', {
      accountId: owner._id,
      purpose: 'activation',
      tokenHash: args.tokenHash,
      credentialVersion: owner.credentialVersion,
      createdAt: args.now,
      expiresAt,
    })
    await scheduleAdminAccessLinkExpiration(ctx, linkId, expiresAt)
    await ctx.db.patch(owner._id, {
      updatedAt: nextAccountUpdatedAt(owner.updatedAt, args.now),
    })
    await appendAuditEvent(ctx, {
      actorKind: 'system',
      subjectAccountId: owner._id,
      area: 'accounts',
      action: 'access_link_generated',
      targetType: 'adminAccount',
      targetId: owner._id,
      targetLabel: owner.displayName,
      occurredAt: args.now,
    })
    return { kind: 'created' } as const
  },
})

async function deleteAccountSessions(
  ctx: MutationCtx,
  accountId: Id<'adminAccounts'>,
) {
  const sessions = await ctx.db
    .query('adminSessions')
    .withIndex('by_account', (query) => query.eq('accountId', accountId))
    .collect()
  for (const session of sessions) await ctx.db.delete(session._id)
  return sessions.length
}

export const finishMasterRecovery = internalMutation({
  args: {
    expectedAccountId: v.id('adminAccounts'),
    expectedCredentialVersion: v.number(),
    expectedUpdatedAt: v.number(),
    tokenHash: v.string(),
    now: v.number(),
  },
  returns: v.union(
    v.object({ kind: v.literal('created') }),
    v.object({ kind: v.literal('conflict') }),
    v.object({ kind: v.literal('unavailable') }),
  ),
  handler: async (ctx, args) => {
    const configs = await ctx.db
      .query('adminAuthConfig')
      .withIndex('by_key', (query) => query.eq('key', 'primary'))
      .take(2)
    const config = configs.length === 1 ? configs[0] : null
    if (
      config === null ||
      config.bootstrapCompletedAt === undefined ||
      config.ownerAccountId === undefined
    ) {
      return { kind: 'unavailable' } as const
    }
    const owner = await ctx.db.get(config.ownerAccountId)
    if (
      owner === null ||
      owner.role !== 'owner' ||
      owner.state !== 'active'
    ) {
      return { kind: 'unavailable' } as const
    }
    if (
      owner._id !== args.expectedAccountId ||
      owner.credentialVersion !== args.expectedCredentialVersion ||
      owner.updatedAt !== args.expectedUpdatedAt
    ) {
      return { kind: 'conflict' } as const
    }
    const collision = await ctx.db
      .query('adminAccessLinks')
      .withIndex('by_token_hash', (query) =>
        query.eq('tokenHash', args.tokenHash),
      )
      .first()
    if (collision) return { kind: 'conflict' } as const

    const nextVersion = owner.credentialVersion + 1
    const links = await ctx.db
      .query('adminAccessLinks')
      .withIndex('by_account_purpose', (query) =>
        query.eq('accountId', owner._id).eq('purpose', 'reset'),
      )
      .collect()
    for (const link of links) {
      if (link.consumedAt === undefined && link.revokedAt === undefined) {
        await ctx.db.patch(link._id, { revokedAt: args.now })
      }
    }
    await ctx.db.patch(owner._id, {
      passwordHash: undefined,
      credentialVersion: nextVersion,
      updatedAt: nextAccountUpdatedAt(owner.updatedAt, args.now),
    })
    const revokedSessions = await deleteAccountSessions(ctx, owner._id)
    const expiresAt = args.now + ADMIN_ACCESS_LINK_TTL_MS
    const linkId = await ctx.db.insert('adminAccessLinks', {
      accountId: owner._id,
      purpose: 'reset',
      tokenHash: args.tokenHash,
      credentialVersion: nextVersion,
      createdAt: args.now,
      expiresAt,
    })
    await scheduleAdminAccessLinkExpiration(ctx, linkId, expiresAt)
    await appendAuditEvent(ctx, {
      actorKind: 'system',
      subjectAccountId: owner._id,
      area: 'auth',
      action: 'master_recovery_started',
      targetType: 'adminAccount',
      targetId: owner._id,
      targetLabel: owner.displayName,
      occurredAt: args.now,
    })
    await appendAuditEvent(ctx, {
      actorKind: 'system',
      subjectAccountId: owner._id,
      area: 'sessions',
      action: 'sessions_revoked',
      targetType: 'adminAccount',
      targetId: owner._id,
      targetLabel: owner.displayName,
      changes: buildAuditChanges({
        before: { sessionCount: revokedSessions },
        after: { sessionCount: 0 },
        allowedFields: ['sessionCount'],
      }),
      occurredAt: args.now,
    })
    return { kind: 'created' } as const
  },
})

export const readOwnerLinkGenerationSnapshot = internalQuery({
  args: {
    purpose: v.union(v.literal('activation'), v.literal('reset')),
  },
  returns: v.union(
    v.object({ kind: v.literal('unavailable') }),
    v.object({
      kind: v.literal('ready'),
      accountId: v.id('adminAccounts'),
      credentialVersion: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const configs = await ctx.db
      .query('adminAuthConfig')
      .withIndex('by_key', (query) => query.eq('key', 'primary'))
      .take(2)
    const config = configs.length === 1 ? configs[0] : null
    const expectsCompletedBootstrap = args.purpose === 'reset'
    if (
      config === null ||
      config.ownerAccountId === undefined ||
      (expectsCompletedBootstrap
        ? config.bootstrapCompletedAt === undefined
        : config.bootstrapCompletedAt !== undefined)
    ) {
      return { kind: 'unavailable' } as const
    }
    const owner = await ctx.db.get(config.ownerAccountId)
    const expectedState =
      args.purpose === 'activation' ? 'pending' : 'active'
    if (
      owner === null ||
      owner.role !== 'owner' ||
      owner.state !== expectedState
    ) {
      return { kind: 'unavailable' } as const
    }
    return {
      kind: 'ready',
      accountId: owner._id,
      credentialVersion: owner.credentialVersion,
      updatedAt: owner.updatedAt,
    } as const
  },
})
