import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { mutation, query } from './_generated/server'
import { appendAuditEvent } from './adminAuditModel'
import {
  requireOwner,
  requireSelfOrOwner,
} from './adminAccountModel'
import { requireAdminSession } from './adminSecurity'

const sessionViewValidator = v.object({
  id: v.id('adminSessions'),
  label: v.string(),
  createdAt: v.number(),
  expiresAt: v.number(),
  isCurrent: v.boolean(),
})

const sessionListResultValidator = v.union(
  v.object({
    kind: v.literal('ready'),
    sessions: v.array(sessionViewValidator),
  }),
  v.object({ kind: v.literal('unauthorized') }),
  v.object({ kind: v.literal('forbidden') }),
)

async function listSessionsForAccount(
  ctx: Parameters<typeof requireAdminSession>[0],
  accountId: Id<'adminAccounts'>,
  currentSessionId: Id<'adminSessions'>,
) {
  const sessions = await ctx.db
    .query('adminSessions')
    .withIndex('by_account', (index) => index.eq('accountId', accountId))
    .collect()
  return sessions
    .filter((session) => session.expiresAt > Date.now())
    .sort((left, right) => right.createdAt - left.createdAt)
    .map((session) => ({
      id: session._id,
      label: session.deviceLabel ?? 'Aparelho sem nome',
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      isCurrent: session._id === currentSessionId,
    }))
}

export const listOwnSessions = query({
  args: { token: v.string() },
  returns: sessionListResultValidator,
  handler: async (ctx, args) => {
    const authorization = await requireAdminSession(ctx, args.token)
    if (
      authorization.kind === 'unauthorized' ||
      authorization.principal.kind !== 'account'
    ) {
      return { kind: 'unauthorized' } as const
    }
    return {
      kind: 'ready',
      sessions: await listSessionsForAccount(
        ctx,
        authorization.principal.account._id,
        authorization.session._id,
      ),
    } as const
  },
})

export const listAccountSessions = query({
  args: {
    token: v.string(),
    accountId: v.id('adminAccounts'),
  },
  returns: sessionListResultValidator,
  handler: async (ctx, args) => {
    const authorization = await requireAdminSession(ctx, args.token)
    if (authorization.kind === 'unauthorized') {
      return { kind: 'unauthorized' } as const
    }
    if (!requireOwner(authorization.principal)) {
      return { kind: 'forbidden' } as const
    }
    return {
      kind: 'ready',
      sessions: await listSessionsForAccount(
        ctx,
        args.accountId,
        authorization.session._id,
      ),
    } as const
  },
})

export const revokeSession = mutation({
  args: {
    token: v.string(),
    sessionId: v.id('adminSessions'),
  },
  returns: v.union(
    v.object({
      kind: v.literal('revoked'),
      revokedCurrent: v.boolean(),
    }),
    v.object({ kind: v.literal('not_found') }),
    v.object({ kind: v.literal('unauthorized') }),
    v.object({ kind: v.literal('forbidden') }),
  ),
  handler: async (ctx, args) => {
    const authorization = await requireAdminSession(ctx, args.token)
    if (authorization.kind === 'unauthorized') {
      return { kind: 'unauthorized' } as const
    }
    const target = await ctx.db.get(args.sessionId)
    if (target === null || target.accountId === undefined) {
      return { kind: 'not_found' } as const
    }
    if (!requireSelfOrOwner(authorization.principal, target.accountId)) {
      return { kind: 'forbidden' } as const
    }
    const revokedCurrent = target._id === authorization.session._id
    await ctx.db.delete(target._id)
    await appendAuditEvent(ctx, {
      principal: authorization.principal,
      subjectAccountId: target.accountId,
      area: 'sessions',
      action: 'session_revoked',
      targetType: 'adminSession',
      targetId: target._id,
      targetLabel: target.deviceLabel ?? 'Aparelho sem nome',
    })
    return { kind: 'revoked', revokedCurrent } as const
  },
})
