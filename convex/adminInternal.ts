import { v } from 'convex/values'
import { makeFunctionReference } from 'convex/server'
import type { Id } from './_generated/dataModel'
import { internalMutation, type MutationCtx } from './_generated/server'
import { ADMIN_AUDIT_SCHEDULE_HOP_MS } from './adminAuditModel'

const AUDIT_SWEEP_PAGE_SIZE = 50
const ACCESS_LINK_SWEEP_PAGE_SIZE = 50

export async function expireAdminSessionRecord(
  ctx: Pick<MutationCtx, 'db'>,
  {
    sessionId,
    expectedExpiresAt,
  }: {
    sessionId: Id<'adminSessions'>
    expectedExpiresAt: number
  },
) {
  const session = await ctx.db.get(sessionId)
  if (!session || session.expiresAt !== expectedExpiresAt) {
    return { kind: 'ignored' } as const
  }

  await ctx.db.delete(sessionId)
  return { kind: 'expired' } as const
}

export const expireAdminSession = internalMutation({
  args: {
    sessionId: v.id('adminSessions'),
    expectedExpiresAt: v.number(),
  },
  returns: v.union(
    v.object({ kind: v.literal('expired') }),
    v.object({ kind: v.literal('ignored') }),
  ),
  handler: expireAdminSessionRecord,
})

export async function expireAdminAccessLinkRecord(
  ctx: Pick<MutationCtx, 'db'>,
  {
    linkId,
    expectedExpiresAt,
  }: {
    linkId: Id<'adminAccessLinks'>
    expectedExpiresAt: number
  },
) {
  const link = await ctx.db.get(linkId)
  if (
    !link ||
    link.expiresAt !== expectedExpiresAt ||
    Date.now() < expectedExpiresAt
  ) {
    return { kind: 'ignored' } as const
  }

  await ctx.db.delete(linkId)
  return { kind: 'expired' } as const
}

export const expireAdminAccessLink = internalMutation({
  args: {
    linkId: v.id('adminAccessLinks'),
    expectedExpiresAt: v.number(),
  },
  returns: v.union(
    v.object({ kind: v.literal('expired') }),
    v.object({ kind: v.literal('ignored') }),
  ),
  handler: expireAdminAccessLinkRecord,
})

const purgeLegacyRef = makeFunctionReference<
  'mutation',
  { cursor?: string },
  unknown
>('adminInternal:purgeLegacyAdminSessions')

export const purgeLegacyAdminSessions = internalMutation({
  args: { cursor: v.optional(v.string()) },
  returns: v.object({
    scanned: v.number(),
    deleted: v.number(),
    done: v.boolean(),
    nextCursor: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query('adminSessions')
      .withIndex('by_account', (query) => query.eq('accountId', undefined))
      .paginate({ cursor: args.cursor ?? null, numItems: 50 })
    let deleted = 0
    for (const session of page.page) {
      const current = await ctx.db.get(session._id)
      if (current?.accountId === undefined) {
        await ctx.db.delete(session._id)
        deleted += 1
      }
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, purgeLegacyRef, {
        cursor: page.continueCursor,
      })
    }
    return {
      scanned: page.page.length,
      deleted,
      done: page.isDone,
      ...(page.isDone ? {} : { nextCursor: page.continueCursor }),
    }
  },
})

export async function expireAuditEventRecord(
  ctx: Pick<MutationCtx, 'db' | 'scheduler'>,
  {
    eventId,
    expectedExpiresAt,
  }: {
    eventId: Id<'adminAuditEvents'>
    expectedExpiresAt: number
  },
) {
  const event = await ctx.db.get(eventId)
  if (!event || event.expiresAt !== expectedExpiresAt) {
    return { kind: 'ignored' } as const
  }
  const now = Date.now()
  if (now < expectedExpiresAt) {
    await ctx.scheduler.runAt(
      Math.min(expectedExpiresAt, now + ADMIN_AUDIT_SCHEDULE_HOP_MS),
      makeFunctionReference<
        'mutation',
        {
          eventId: Id<'adminAuditEvents'>
          expectedExpiresAt: number
        },
        unknown
      >('adminInternal:expireAuditEvent'),
      { eventId, expectedExpiresAt },
    )
    return { kind: 'ignored' } as const
  }
  await ctx.db.delete(eventId)
  return { kind: 'expired' } as const
}

export const expireAuditEvent = internalMutation({
  args: {
    eventId: v.id('adminAuditEvents'),
    expectedExpiresAt: v.number(),
  },
  returns: v.union(
    v.object({ kind: v.literal('expired') }),
    v.object({ kind: v.literal('ignored') }),
  ),
  handler: expireAuditEventRecord,
})

const continueAuditSweepRef = makeFunctionReference<
  'mutation',
  { cursor: string; cutoff: number },
  unknown
>('adminInternal:continueExpiredAuditEventsSweep')

async function sweepExpiredAuditEventsPage(
  ctx: MutationCtx,
  {
    cursor,
    cutoff,
  }: {
    cursor: string | null
    cutoff: number
  },
) {
  const page = await ctx.db
    .query('adminAuditEvents')
    .withIndex('by_expires_at', (query) =>
      query.lte('expiresAt', cutoff),
    )
    .order('asc')
    .paginate({ cursor, numItems: AUDIT_SWEEP_PAGE_SIZE })
  let deleted = 0
  for (const candidate of page.page) {
    const current = await ctx.db.get(candidate._id)
    if (current && current.expiresAt <= cutoff) {
      await ctx.db.delete(current._id)
      deleted += 1
    }
  }
  if (!page.isDone) {
    await ctx.scheduler.runAfter(0, continueAuditSweepRef, {
      cursor: page.continueCursor,
      cutoff,
    })
  }
  return {
    scanned: page.page.length,
    deleted,
    done: page.isDone,
    ...(page.isDone ? {} : { nextCursor: page.continueCursor }),
  }
}

export async function sweepExpiredAuditEventsHandler(ctx: MutationCtx) {
  return sweepExpiredAuditEventsPage(ctx, {
    cursor: null,
    cutoff: Date.now(),
  })
}

const auditSweepResultValidator = v.object({
  scanned: v.number(),
  deleted: v.number(),
  done: v.boolean(),
  nextCursor: v.optional(v.string()),
})

export const startExpiredAuditEventsSweep = internalMutation({
  args: {},
  returns: auditSweepResultValidator,
  handler: sweepExpiredAuditEventsHandler,
})

export const continueExpiredAuditEventsSweep = internalMutation({
  args: { cursor: v.string(), cutoff: v.number() },
  returns: auditSweepResultValidator,
  handler: (ctx, args) =>
    sweepExpiredAuditEventsPage(ctx, {
      cursor: args.cursor,
      cutoff: args.cutoff,
    }),
})

const continueAccessLinkSweepRef = makeFunctionReference<
  'mutation',
  { cursor: string; cutoff: number },
  unknown
>('adminInternal:continueExpiredAccessLinksSweep')

async function sweepExpiredAccessLinksPage(
  ctx: MutationCtx,
  {
    cursor,
    cutoff,
  }: {
    cursor: string | null
    cutoff: number
  },
) {
  const page = await ctx.db
    .query('adminAccessLinks')
    .withIndex('by_expires_at', (query) =>
      query.lte('expiresAt', cutoff),
    )
    .order('asc')
    .paginate({ cursor, numItems: ACCESS_LINK_SWEEP_PAGE_SIZE })
  let deleted = 0
  for (const candidate of page.page) {
    const current = await ctx.db.get(candidate._id)
    if (current && current.expiresAt <= cutoff) {
      await ctx.db.delete(current._id)
      deleted += 1
    }
  }
  if (!page.isDone) {
    await ctx.scheduler.runAfter(0, continueAccessLinkSweepRef, {
      cursor: page.continueCursor,
      cutoff,
    })
  }
  return {
    scanned: page.page.length,
    deleted,
    done: page.isDone,
    ...(page.isDone ? {} : { nextCursor: page.continueCursor }),
  }
}

export async function sweepExpiredAccessLinksHandler(ctx: MutationCtx) {
  return sweepExpiredAccessLinksPage(ctx, {
    cursor: null,
    cutoff: Date.now(),
  })
}

const accessLinkSweepResultValidator = v.object({
  scanned: v.number(),
  deleted: v.number(),
  done: v.boolean(),
  nextCursor: v.optional(v.string()),
})

export const startExpiredAccessLinksSweep = internalMutation({
  args: {},
  returns: accessLinkSweepResultValidator,
  handler: sweepExpiredAccessLinksHandler,
})

export const continueExpiredAccessLinksSweep = internalMutation({
  args: { cursor: v.string(), cutoff: v.number() },
  returns: accessLinkSweepResultValidator,
  handler: (ctx, args) =>
    sweepExpiredAccessLinksPage(ctx, {
      cursor: args.cursor,
      cutoff: args.cutoff,
    }),
})
