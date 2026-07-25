import { v } from 'convex/values'
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
