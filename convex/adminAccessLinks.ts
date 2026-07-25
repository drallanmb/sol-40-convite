import { v } from 'convex/values'
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from './_generated/server'
import type { Id } from './_generated/dataModel'
import { appendAuditEvent } from './adminAuditModel'
import { hashAdminToken, validateAdminToken } from './adminSecurity'

export const ADMIN_ACCESS_LINK_TTL_MS = 72 * 60 * 60 * 1_000

export const adminAccessPurposeValidator = v.union(
  v.literal('activation'),
  v.literal('reset'),
)

const publicStatusValidator = v.union(
  v.object({ kind: v.literal('valid') }),
  v.object({ kind: v.literal('invalid') }),
)

export const getStatus = query({
  args: {
    token: v.string(),
    purpose: adminAccessPurposeValidator,
  },
  returns: publicStatusValidator,
  handler: async (ctx, args) => {
    if (!validateAdminToken(args.token)) return { kind: 'invalid' } as const
    const tokenHash = await hashAdminToken(args.token)
    const links = await ctx.db
      .query('adminAccessLinks')
      .withIndex('by_token_hash', (query) => query.eq('tokenHash', tokenHash))
      .take(2)
    const link = links.length === 1 ? links[0] : null
    if (
      link === null ||
      link.purpose !== args.purpose ||
      link.consumedAt !== undefined ||
      link.revokedAt !== undefined ||
      Date.now() >= link.expiresAt
    ) {
      return { kind: 'invalid' } as const
    }
    return { kind: 'valid' } as const
  },
})

export const prepareAccessLink = internalMutation({
  args: {
    accountId: v.id('adminAccounts'),
    purpose: adminAccessPurposeValidator,
    tokenHash: v.string(),
    now: v.number(),
  },
  returns: v.union(
    v.object({ kind: v.literal('created') }),
    v.object({ kind: v.literal('invalid') }),
  ),
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId)
    if (
      account === null ||
      (args.purpose === 'activation' && account.state === 'active') ||
      (args.purpose === 'reset' && account.state !== 'active')
    ) {
      return { kind: 'invalid' } as const
    }
    const collision = await ctx.db
      .query('adminAccessLinks')
      .withIndex('by_token_hash', (query) =>
        query.eq('tokenHash', args.tokenHash),
      )
      .first()
    if (collision) return { kind: 'invalid' } as const

    const priorLinks = await ctx.db
      .query('adminAccessLinks')
      .withIndex('by_account_purpose', (query) =>
        query.eq('accountId', args.accountId).eq('purpose', args.purpose),
      )
      .collect()
    for (const prior of priorLinks) {
      if (
        prior.consumedAt === undefined &&
        prior.revokedAt === undefined &&
        prior.expiresAt > args.now
      ) {
        await ctx.db.patch(prior._id, { revokedAt: args.now })
      }
    }
    await ctx.db.insert('adminAccessLinks', {
      accountId: args.accountId,
      purpose: args.purpose,
      tokenHash: args.tokenHash,
      credentialVersion: account.credentialVersion,
      createdAt: args.now,
      expiresAt: args.now + ADMIN_ACCESS_LINK_TTL_MS,
    })
    await appendAuditEvent(ctx, {
      actorKind: 'system',
      subjectAccountId: args.accountId,
      area: 'accounts',
      action: 'access_link_generated',
      targetType: 'adminAccount',
      targetId: args.accountId,
      targetLabel: account.displayName,
      occurredAt: args.now,
    })
    return { kind: 'created' } as const
  },
})

export const readAccessLinkSnapshot = internalQuery({
  args: {
    tokenHash: v.string(),
    purpose: adminAccessPurposeValidator,
    now: v.number(),
  },
  returns: v.union(
    v.object({ kind: v.literal('invalid') }),
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
    const links = await ctx.db
      .query('adminAccessLinks')
      .withIndex('by_token_hash', (query) =>
        query.eq('tokenHash', args.tokenHash),
      )
      .take(2)
    const link = links.length === 1 ? links[0] : null
    if (
      link === null ||
      link.purpose !== args.purpose ||
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
      account.credentialVersion !== link.credentialVersion
    ) {
      return { kind: 'invalid' } as const
    }
    return {
      kind: 'ready',
      linkId: link._id,
      accountId: account._id,
      credentialVersion: account.credentialVersion,
      email: account.email,
      displayName: account.displayName,
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
      account.credentialVersion !== args.expectedCredentialVersion
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
      updatedAt: args.now,
      ...(args.purpose === 'activation' ? { activatedAt: args.now } : {}),
    })
    await ctx.db.patch(link._id, { consumedAt: args.now })
    await revokeAccountSessions(ctx, account._id)

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
    return { kind: 'completed' } as const
  },
})

export const revokeAccessLink = mutation({
  args: { token: v.string() },
  returns: v.object({ kind: v.literal('invalid') }),
  handler: async () => ({ kind: 'invalid' } as const),
})
