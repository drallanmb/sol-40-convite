import { v } from 'convex/values'
import type { FunctionReference } from 'convex/server'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import { internalMutation, type MutationCtx } from './_generated/server'

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

const purgeLegacyRef = (internal as unknown as {
  adminInternal: {
    purgeLegacyAdminSessions: FunctionReference<
      'mutation',
      'internal',
      { cursor?: string },
      unknown
    >
  }
}).adminInternal.purgeLegacyAdminSessions

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
