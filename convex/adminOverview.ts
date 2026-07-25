import { v } from 'convex/values'
import { query } from './_generated/server'
import { requireOperational } from './adminAccountModel'
import { requireAdminSession } from './adminSecurity'

const overviewReadyValidator = v.object({
  kind: v.literal('ready'),
  familyCount: v.number(),
  confirmedCount: v.number(),
  refusedCount: v.number(),
  pendingCount: v.number(),
  pendingMemoryCount: v.number(),
  giftedWineCount: v.number(),
  totalWineCount: v.number(),
  badges: v.object({
    guests: v.number(),
    memories: v.number(),
  }),
})

export const get = query({
  args: { token: v.string() },
  returns: v.union(
    v.object({ kind: v.literal('unauthorized') }),
    v.object({ kind: v.literal('forbidden') }),
    overviewReadyValidator,
  ),
  handler: async (ctx, args) => {
    const authorization = await requireAdminSession(ctx, args.token)
    if (authorization.kind === 'unauthorized') {
      return { kind: 'unauthorized' } as const
    }
    if (!requireOperational(authorization.principal)) {
      return { kind: 'forbidden' } as const
    }

    const [families, guests, pendingMemories, wines] = await Promise.all([
      ctx.db.query('rsvps').collect(),
      ctx.db.query('rsvpGuests').collect(),
      ctx.db
        .query('posts')
        .withIndex('by_status', (index) => index.eq('status', 'pendente'))
        .collect(),
      ctx.db.query('wines').collect(),
    ])

    let confirmedCount = 0
    let refusedCount = 0
    let pendingCount = 0
    for (const guest of guests) {
      if (guest.attendance === 'yes') confirmedCount += 1
      else if (guest.attendance === 'no') refusedCount += 1
      else pendingCount += 1
    }

    const giftedWineCount = wines.reduce(
      (count, wine) => count + (wine.status === 'gifted' ? 1 : 0),
      0,
    )
    const pendingMemoryCount = pendingMemories.length

    return {
      kind: 'ready',
      familyCount: families.length,
      confirmedCount,
      refusedCount,
      pendingCount,
      pendingMemoryCount,
      giftedWineCount,
      totalWineCount: wines.length,
      badges: {
        guests: pendingCount,
        memories: pendingMemoryCount,
      },
    } as const
  },
})
