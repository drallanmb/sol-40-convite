import { v } from 'convex/values'
import { mutation, query, type MutationCtx } from './_generated/server'
import { normalizeMemoryText } from './postModel'
import { postRateLimiter, toPostRetryAfterSeconds } from './postRateLimits'
import {
  hashPostDeviceKey,
  validatePostCapability,
} from './postSecurity'

const rateLimitedValidator = v.object({
  kind: v.literal('rate_limited'),
  retryAfterSeconds: v.number(),
})

const invalidTextResultValidator = v.union(
  v.object({ kind: v.literal('invalid_device_key') }),
  v.object({ kind: v.literal('invalid_content') }),
  v.object({ kind: v.literal('invalid_author') }),
  v.object({ kind: v.literal('invalid_message') }),
  v.object({ kind: v.literal('invalid_control') }),
)

const textSubmitResultValidator = v.union(
  v.object({ kind: v.literal('submitted') }),
  invalidTextResultValidator,
  rateLimitedValidator,
)

const publicMemoryValidator = v.object({
  id: v.id('posts'),
  author: v.string(),
  message: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  createdAt: v.number(),
})

function maximumRetrySeconds(...values: Array<number | undefined>) {
  return toPostRetryAfterSeconds(
    values.reduce(
      (maximum, value) => Math.max(maximum, value ?? 0),
      0,
    ),
  )
}

async function consumeTextLimits(ctx: MutationCtx, deviceKeyHash: string) {
  const globalStatus = await postRateLimiter.check(ctx, 'submitTextGlobal', {
    key: undefined,
  })
  const deviceStatus = await postRateLimiter.check(ctx, 'submitTextByDevice', {
    key: deviceKeyHash,
  })

  if (!globalStatus.ok || !deviceStatus.ok) {
    return {
      kind: 'rate_limited',
      retryAfterSeconds: maximumRetrySeconds(
        globalStatus.retryAfter,
        deviceStatus.retryAfter,
      ),
    } as const
  }

  const globalConsumption = await postRateLimiter.limit(
    ctx,
    'submitTextGlobal',
    { key: undefined },
  )
  const deviceConsumption = await postRateLimiter.limit(
    ctx,
    'submitTextByDevice',
    { key: deviceKeyHash },
  )

  if (!globalConsumption.ok || !deviceConsumption.ok) {
    throw new Error('Post text limiter transaction invariant failed')
  }

  return { kind: 'consumed' } as const
}

export const submitTextMemory = mutation({
  args: {
    deviceKey: v.string(),
    author: v.optional(v.string()),
    message: v.string(),
  },
  returns: textSubmitResultValidator,
  handler: async (ctx, args) => {
    if (!validatePostCapability(args.deviceKey)) {
      return { kind: 'invalid_device_key' } as const
    }

    const normalized = normalizeMemoryText({
      author: args.author,
      message: args.message,
    })
    if (normalized.kind !== 'valid') {
      return normalized
    }

    const deviceKeyHash = await hashPostDeviceKey(args.deviceKey)
    const limiterResult = await consumeTextLimits(ctx, deviceKeyHash)
    if (limiterResult.kind === 'rate_limited') {
      return limiterResult
    }

    await ctx.db.insert('posts', {
      ...(normalized.author === undefined
        ? {}
        : { author: normalized.author }),
      message: normalized.message!,
      status: 'pendente',
      source: 'convidado',
      createdAt: Date.now(),
    })

    return { kind: 'submitted' } as const
  },
})

export const listApproved = query({
  args: {},
  returns: v.array(publicMemoryValidator),
  handler: async (ctx) => {
    const approved = await ctx.db
      .query('posts')
      .withIndex('by_status', (index) => index.eq('status', 'aprovado'))
      .order('desc')
      .take(100)

    return Promise.all(
      approved.map(async (post) => {
        const imageUrl =
          post.storageId === undefined
            ? undefined
            : await ctx.storage.getUrl(post.storageId)

        return {
          id: post._id,
          author: post.author ?? 'De alguém que te ama',
          ...(post.message === undefined ? {} : { message: post.message }),
          ...(imageUrl === null ? {} : { imageUrl }),
          createdAt: post.createdAt,
        }
      }),
    )
  },
})
