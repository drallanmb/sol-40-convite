import { v } from 'convex/values'
import { makeFunctionReference } from 'convex/server'
import {
  internalMutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from './_generated/server'
import type { Id } from './_generated/dataModel'
import { appendAuditEvent } from './adminAuditModel'
import { buildAuditChanges } from './adminAuditModel'
import { adminRateLimiter } from './adminRateLimits'
import { hashAdminToken, validateAdminToken } from './adminSecurity'

export const ADMIN_ACCESS_LINK_TTL_MS = 72 * 60 * 60 * 1_000

const expireAdminAccessLink = makeFunctionReference<
  'mutation',
  {
    linkId: Id<'adminAccessLinks'>
    expectedExpiresAt: number
  },
  unknown
>('adminInternal:expireAdminAccessLink')

export async function scheduleAdminAccessLinkExpiration(
  ctx: Pick<MutationCtx, 'scheduler'>,
  linkId: Id<'adminAccessLinks'>,
  expiresAt: number,
) {
  await ctx.scheduler.runAt(expiresAt, expireAdminAccessLink, {
    linkId,
    expectedExpiresAt: expiresAt,
  })
}

function nextAccountUpdatedAt(current: number, now: number) {
  return Math.max(now, current + 1)
}

export const adminAccessPurposeValidator = v.union(
  v.literal('activation'),
  v.literal('reset'),
)

const publicStatusValidator = v.union(
  v.object({ kind: v.literal('valid') }),
  v.object({ kind: v.literal('invalid') }),
)

async function resolveAccessLink(
  ctx: Pick<QueryCtx, 'db'>,
  {
    tokenHash,
    purpose,
    now,
  }: {
    tokenHash: string
    purpose: 'activation' | 'reset'
    now: number
  },
) {
  const links = await ctx.db
    .query('adminAccessLinks')
    .withIndex('by_token_hash', (query) =>
      query.eq('tokenHash', tokenHash),
    )
    .take(2)
  const link = links.length === 1 ? links[0] : null
  if (
    link === null ||
    link.purpose !== purpose ||
    link.consumedAt !== undefined ||
    link.revokedAt !== undefined ||
    now >= link.expiresAt
  ) {
    return { kind: 'invalid' } as const
  }

  const account = await ctx.db.get(link.accountId)
  const expectedState = purpose === 'activation' ? 'pending' : 'active'
  if (
    account === null ||
    account.state !== expectedState ||
    account.credentialVersion !== link.credentialVersion ||
    account.passwordHash !== undefined
  ) {
    return { kind: 'invalid' } as const
  }

  if (account.role === 'owner' && purpose === 'activation') {
    const configs = await ctx.db
      .query('adminAuthConfig')
      .withIndex('by_key', (query) => query.eq('key', 'primary'))
      .take(2)
    if (
      configs.length !== 1 ||
      configs[0].ownerAccountId !== account._id ||
      configs[0].bootstrapCompletedAt !== undefined
    ) {
      return { kind: 'invalid' } as const
    }
  }

  return { kind: 'ready', link, account } as const
}

export const getStatus = query({
  args: {
    token: v.string(),
    purpose: adminAccessPurposeValidator,
  },
  returns: publicStatusValidator,
  handler: async (ctx, args) => {
    if (!validateAdminToken(args.token)) return { kind: 'invalid' } as const
    const tokenHash = await hashAdminToken(args.token)
    const resolved = await resolveAccessLink(ctx, {
      tokenHash,
      purpose: args.purpose,
      now: Date.now(),
    })
    return resolved.kind === 'ready'
      ? ({ kind: 'valid' } as const)
      : ({ kind: 'invalid' } as const)
  },
})

function retryAfterSeconds(retryAfterMs: number | undefined) {
  return Math.max(1, Math.ceil((retryAfterMs ?? 0) / 1_000))
}

export const prepareAccessLinkConsumption = internalMutation({
  args: {
    purpose: adminAccessPurposeValidator,
    tokenHash: v.string(),
    now: v.number(),
  },
  returns: v.union(
    v.object({ kind: v.literal('invalid') }),
    v.object({
      kind: v.literal('rate_limited'),
      retryAfterSeconds: v.number(),
    }),
    v.object({
      kind: v.literal('ready'),
      linkId: v.id('adminAccessLinks'),
      accountId: v.id('adminAccounts'),
      credentialVersion: v.number(),
      email: v.string(),
      displayName: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    if (!/^[a-f0-9]{64}$/u.test(args.tokenHash)) {
      return { kind: 'invalid' } as const
    }

    const resolved = await resolveAccessLink(ctx, args)
    if (resolved.kind !== 'ready') return resolved

    const [globalLimit, tokenLimit] = await Promise.all([
      adminRateLimiter.limit(ctx, 'accessLinkGlobal', {
        key: 'access-link-consumption',
      }),
      adminRateLimiter.limit(ctx, 'accessLinkToken', {
        key: args.tokenHash,
      }),
    ])
    if (!globalLimit.ok || !tokenLimit.ok) {
      return {
        kind: 'rate_limited',
        retryAfterSeconds: Math.max(
          retryAfterSeconds(globalLimit.retryAfter),
          retryAfterSeconds(tokenLimit.retryAfter),
        ),
      } as const
    }

    return {
      kind: 'ready',
      linkId: resolved.link._id,
      accountId: resolved.account._id,
      credentialVersion: resolved.account.credentialVersion,
      email: resolved.account.email,
      displayName: resolved.account.displayName,
    } as const
  },
})

async function revokeAccountSessions(
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

export const finishAccessLink = internalMutation({
  args: {
    linkId: v.id('adminAccessLinks'),
    tokenHash: v.string(),
    purpose: adminAccessPurposeValidator,
    expectedCredentialVersion: v.number(),
    passwordHash: v.string(),
    now: v.number(),
  },
  returns: v.union(
    v.object({ kind: v.literal('completed') }),
    v.object({ kind: v.literal('invalid') }),
  ),
  handler: async (ctx, args) => {
    const link = await ctx.db.get(args.linkId)
    if (
      link === null ||
      link.tokenHash !== args.tokenHash ||
      link.purpose !== args.purpose ||
      link.credentialVersion !== args.expectedCredentialVersion ||
      link.consumedAt !== undefined ||
      link.revokedAt !== undefined ||
      args.now >= link.expiresAt
    ) {
      return { kind: 'invalid' } as const
    }
    const account = await ctx.db.get(link.accountId)
    const expectedState = args.purpose === 'activation' ? 'pending' : 'active'
    if (
      account === null ||
      account.state !== expectedState ||
      account.credentialVersion !== args.expectedCredentialVersion ||
      account.passwordHash !== undefined
    ) {
      return { kind: 'invalid' } as const
    }

    let ownerConfigId: Id<'adminAuthConfig'> | undefined
    if (account.role === 'owner' && args.purpose === 'activation') {
      const configs = await ctx.db
        .query('adminAuthConfig')
        .withIndex('by_key', (query) => query.eq('key', 'primary'))
        .take(2)
      if (
        configs.length !== 1 ||
        configs[0].ownerAccountId !== account._id ||
        configs[0].bootstrapCompletedAt !== undefined
      ) {
        return { kind: 'invalid' } as const
      }
      ownerConfigId = configs[0]._id
    }

    const nextVersion = account.credentialVersion + 1
    await ctx.db.patch(account._id, {
      passwordHash: args.passwordHash,
      state: 'active',
      credentialVersion: nextVersion,
      updatedAt: nextAccountUpdatedAt(account.updatedAt, args.now),
      ...(args.purpose === 'activation' ? { activatedAt: args.now } : {}),
    })
    await ctx.db.patch(link._id, { consumedAt: args.now })
    const revokedSessions = await revokeAccountSessions(ctx, account._id)

    if (ownerConfigId) {
      await ctx.db.patch(ownerConfigId, {
        legacyDisabledAt: args.now,
        bootstrapCompletedAt: args.now,
      })
    }

    await appendAuditEvent(ctx, {
      actorKind: 'system',
      subjectAccountId: account._id,
      area: 'auth',
      action:
        args.purpose === 'activation'
          ? 'activation_completed'
          : 'password_reset',
      targetType: 'adminAccount',
      targetId: account._id,
      targetLabel: account.displayName,
      occurredAt: args.now,
    })
    await appendAuditEvent(ctx, {
      actorKind: 'system',
      subjectAccountId: account._id,
      area: 'sessions',
      action: 'sessions_revoked',
      targetType: 'adminAccount',
      targetId: account._id,
      targetLabel: account.displayName,
      changes: buildAuditChanges({
        before: { sessionCount: revokedSessions },
        after: { sessionCount: 0 },
        allowedFields: ['sessionCount'],
      }),
      occurredAt: args.now,
    })
    return { kind: 'completed' } as const
  },
})
