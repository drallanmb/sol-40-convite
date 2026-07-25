import { v } from 'convex/values'
import { query } from './_generated/server'
import { requireOwner } from './adminAccountModel'
import {
  adminAuditActionValidator,
  adminAuditAreaValidator,
  auditChangeValidator,
} from './adminAuditModel'
import { requireAdminSession } from './adminSecurity'

const auditEventValidator = v.object({
  id: v.id('adminAuditEvents'),
  actorKind: v.union(
    v.literal('account'),
    v.literal('legacy'),
    v.literal('system'),
    v.literal('anonymous'),
  ),
  actorAccountId: v.optional(v.id('adminAccounts')),
  actorName: v.optional(v.string()),
  actorRole: v.optional(
    v.union(v.literal('owner'), v.literal('manager'), v.literal('seller')),
  ),
  area: adminAuditAreaValidator,
  action: adminAuditActionValidator,
  targetType: v.optional(v.string()),
  targetId: v.optional(v.string()),
  targetLabel: v.optional(v.string()),
  changes: v.array(auditChangeValidator),
  occurredAt: v.number(),
})

export const listAuditEvents = query({
  args: {
    token: v.string(),
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
    actorAccountId: v.optional(v.id('adminAccounts')),
    area: v.optional(adminAuditAreaValidator),
    action: v.optional(adminAuditActionValidator),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
  },
  returns: v.union(
    v.object({ kind: v.literal('unauthorized') }),
    v.object({ kind: v.literal('forbidden') }),
    v.object({
      kind: v.literal('ready'),
      events: v.array(auditEventValidator),
      nextCursor: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const authorization = await requireAdminSession(ctx, args.token)
    if (authorization.kind === 'unauthorized') return authorization
    if (!requireOwner(authorization.principal)) {
      return { kind: 'forbidden' } as const
    }
    const now = Date.now()
    const from = Math.max(0, args.from ?? 0)
    const to = Math.min(now, args.to ?? now)
    const limit = Math.min(50, Math.max(1, Math.trunc(args.limit ?? 25)))
    if (from > to) {
      return { kind: 'ready' as const, events: [] }
    }
    const page = await ctx.db
      .query('adminAuditEvents')
      .withIndex('by_occurred_at', (index) =>
        index.gte('occurredAt', from).lte('occurredAt', to),
      )
      .order('desc')
      .paginate({ cursor: args.cursor ?? null, numItems: limit })
    const events = page.page
      .filter(
        (event) =>
          event.expiresAt > now &&
          (args.actorAccountId === undefined ||
            event.actorAccountId === args.actorAccountId) &&
          (args.area === undefined || event.area === args.area) &&
          (args.action === undefined || event.action === args.action),
      )
      .map((event) => ({
        id: event._id,
        actorKind: event.actorKind,
        actorAccountId: event.actorAccountId,
        actorName: event.actorName,
        actorRole: event.actorRole,
        area: event.area,
        action: event.action,
        targetType: event.targetType,
        targetId: event.targetId,
        targetLabel: event.targetLabel,
        changes: event.changes,
        occurredAt: event.occurredAt,
      }))
    return {
      kind: 'ready',
      events,
      ...(page.isDone ? {} : { nextCursor: page.continueCursor }),
    } as const
  },
})
