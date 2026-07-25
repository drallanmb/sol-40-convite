import { v } from 'convex/values'
import type { FunctionReference } from 'convex/server'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import { mutation, query, type MutationCtx } from './_generated/server'
import {
  MAX_FINAL_IMAGE_BYTES,
  UPLOAD_RESERVATION_TTL_MS,
  VALIDATION_RETRY_MS,
  normalizeMemoryText,
} from './postModel'
import { postRateLimiter, toPostRetryAfterSeconds } from './postRateLimits'
import {
  hashPostCapability,
  hashPostDeviceKey,
  validatePostCapability,
} from './postSecurity'

const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])

const postInternalApi = (internal as unknown as {
  postInternal: {
    validatePhoto: FunctionReference<
      'action',
      'internal',
      { reservationId: Id<'postUploadReservations'> },
      null
    >
    expireReservation: FunctionReference<
      'mutation',
      'internal',
      { reservationId: Id<'postUploadReservations'> },
      unknown
    >
  }
}).postInternal

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

const photoErrorCodeValidator = v.union(
  v.literal('missing_storage'),
  v.literal('too_large'),
  v.literal('unsupported_metadata'),
  v.literal('empty'),
  v.literal('unsupported_type'),
  v.literal('mime_mismatch'),
  v.literal('heic_requires_conversion'),
)

const submissionStatusValidator = v.union(
  v.object({ kind: v.literal('invalid_capability') }),
  v.object({ kind: v.literal('awaiting_upload') }),
  v.object({ kind: v.literal('processing') }),
  v.object({ kind: v.literal('accepted') }),
  v.object({
    kind: v.literal('rejected'),
    code: photoErrorCodeValidator,
  }),
  v.object({ kind: v.literal('expired') }),
)

const requestUploadResultValidator = v.union(
  v.object({ kind: v.literal('invalid_request') }),
  v.object({ kind: v.literal('token_conflict') }),
  v.object({
    kind: v.literal('reserved'),
    reservationId: v.id('postUploadReservations'),
    uploadUrl: v.string(),
  }),
  rateLimitedValidator,
)

const photoSubmitResultValidator = v.union(
  v.object({ kind: v.literal('invalid_capability') }),
  v.object({ kind: v.literal('storage_conflict') }),
  v.object({ kind: v.literal('processing') }),
  v.object({ kind: v.literal('accepted') }),
  v.object({ kind: v.literal('expired') }),
  v.object({
    kind: v.literal('rejected'),
    code: photoErrorCodeValidator,
  }),
  v.object({ kind: v.literal('invalid_content') }),
  v.object({ kind: v.literal('invalid_author') }),
  v.object({ kind: v.literal('invalid_message') }),
  v.object({ kind: v.literal('invalid_control') }),
)

function maximumRetrySeconds(...values: Array<number | undefined>) {
  return toPostRetryAfterSeconds(
    values.reduce<number>(
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

async function consumeUploadLimits(ctx: MutationCtx, deviceKeyHash: string) {
  const globalStatus = await postRateLimiter.check(
    ctx,
    'requestUploadGlobal',
    { key: undefined },
  )
  const deviceStatus = await postRateLimiter.check(
    ctx,
    'requestUploadByDevice',
    { key: deviceKeyHash },
  )

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
    'requestUploadGlobal',
    { key: undefined },
  )
  const deviceConsumption = await postRateLimiter.limit(
    ctx,
    'requestUploadByDevice',
    { key: deviceKeyHash },
  )

  if (!globalConsumption.ok || !deviceConsumption.ok) {
    throw new Error('Post upload limiter transaction invariant failed')
  }

  return { kind: 'consumed' } as const
}

export const requestUpload = mutation({
  args: {
    deviceKey: v.string(),
    token: v.string(),
  },
  returns: requestUploadResultValidator,
  handler: async (ctx, args) => {
    if (
      !validatePostCapability(args.deviceKey) ||
      !validatePostCapability(args.token)
    ) {
      return { kind: 'invalid_request' } as const
    }

    const [deviceKeyHash, tokenHash] = await Promise.all([
      hashPostDeviceKey(args.deviceKey),
      hashPostCapability(args.token),
    ])
    const tokenMatches = await ctx.db
      .query('postUploadReservations')
      .withIndex('by_token_hash', (index) => index.eq('tokenHash', tokenHash))
      .take(1)
    if (tokenMatches.length > 0) {
      return { kind: 'token_conflict' } as const
    }

    const limiterResult = await consumeUploadLimits(ctx, deviceKeyHash)
    if (limiterResult.kind === 'rate_limited') {
      return limiterResult
    }

    const now = Date.now()
    const uploadUrl = await ctx.storage.generateUploadUrl()
    const reservationId = await ctx.db.insert('postUploadReservations', {
      tokenHash,
      deviceKeyHash,
      state: 'awaiting_upload',
      expiresAt: now + UPLOAD_RESERVATION_TTL_MS,
      createdAt: now,
    })
    await ctx.scheduler.runAt(
      now + UPLOAD_RESERVATION_TTL_MS,
      postInternalApi.expireReservation,
      { reservationId },
    )

    return {
      kind: 'reserved',
      reservationId,
      uploadUrl,
    } as const
  },
})

async function rejectClaimedStorage(
  ctx: MutationCtx,
  {
    reservationId,
    storageId,
    code,
  }: {
    reservationId: Id<'postUploadReservations'>
    storageId: Id<'_storage'>
    code:
      | 'missing_storage'
      | 'too_large'
      | 'unsupported_metadata'
  },
) {
  if (code !== 'missing_storage') {
    await ctx.storage.delete(storageId)
  }
  await ctx.db.patch(reservationId, {
    state: 'rejected',
    errorCode: code,
    terminalAt: Date.now(),
  })
  return { kind: 'rejected', code } as const
}

export const submitPhotoMemory = mutation({
  args: {
    reservationId: v.id('postUploadReservations'),
    token: v.string(),
    storageId: v.id('_storage'),
    author: v.optional(v.string()),
    message: v.optional(v.string()),
  },
  returns: photoSubmitResultValidator,
  handler: async (ctx, args) => {
    if (!validatePostCapability(args.token)) {
      return { kind: 'invalid_capability' } as const
    }

    const tokenHash = await hashPostCapability(args.token)
    const reservation = await ctx.db.get(args.reservationId)
    if (!reservation || reservation.tokenHash !== tokenHash) {
      return { kind: 'invalid_capability' } as const
    }
    if (reservation.state === 'accepted') {
      return { kind: 'accepted' } as const
    }
    if (reservation.state === 'rejected') {
      return {
        kind: 'rejected',
        code: reservation.errorCode as
          | 'missing_storage'
          | 'too_large'
          | 'unsupported_metadata'
          | 'empty'
          | 'unsupported_type'
          | 'mime_mismatch'
          | 'heic_requires_conversion',
      } as const
    }
    if (
      reservation.state === 'expired' ||
      Date.now() >= reservation.expiresAt
    ) {
      if (reservation.state !== 'expired') {
        await ctx.db.patch(reservation._id, {
          state: 'expired',
          terminalAt: Date.now(),
        })
      }
      return { kind: 'expired' } as const
    }
    if (reservation.state === 'processing') {
      if (reservation.storageId !== args.storageId) {
        return { kind: 'storage_conflict' } as const
      }

      const lastRequestedAt = reservation.validationRequestedAt ?? 0
      if (Date.now() - lastRequestedAt >= VALIDATION_RETRY_MS) {
        await ctx.db.patch(reservation._id, {
          validationRequestedAt: Date.now(),
        })
        await ctx.scheduler.runAfter(
          0,
          postInternalApi.validatePhoto,
          { reservationId: reservation._id },
        )
      }
      return { kind: 'processing' } as const
    }

    const normalized = normalizeMemoryText({
      author: args.author,
      message: args.message,
      hasStorageId: true,
    })
    if (normalized.kind !== 'valid') {
      return normalized
    }

    const reservationOwners = await ctx.db
      .query('postUploadReservations')
      .withIndex('by_storage_id', (index) =>
        index.eq('storageId', args.storageId),
      )
      .take(2)
    const postOwners = await ctx.db
      .query('posts')
      .withIndex('by_storage_id', (index) =>
        index.eq('storageId', args.storageId),
      )
      .take(1)
    if (reservationOwners.length > 0 || postOwners.length > 0) {
      return { kind: 'storage_conflict' } as const
    }

    const metadata = await ctx.db.system.get('_storage', args.storageId)
    if (!metadata) {
      return rejectClaimedStorage(ctx, {
        reservationId: reservation._id,
        storageId: args.storageId,
        code: 'missing_storage',
      })
    }
    if (metadata.size > MAX_FINAL_IMAGE_BYTES) {
      return rejectClaimedStorage(ctx, {
        reservationId: reservation._id,
        storageId: args.storageId,
        code: 'too_large',
      })
    }
    if (
      metadata.contentType === undefined ||
      !ALLOWED_UPLOAD_MIME_TYPES.has(metadata.contentType)
    ) {
      return rejectClaimedStorage(ctx, {
        reservationId: reservation._id,
        storageId: args.storageId,
        code: 'unsupported_metadata',
      })
    }

    await ctx.db.patch(reservation._id, {
      state: 'processing',
      storageId: args.storageId,
      ...(normalized.author === undefined
        ? {}
        : { author: normalized.author }),
      ...(normalized.message === undefined
        ? {}
        : { message: normalized.message }),
      validationRequestedAt: Date.now(),
    })
    await ctx.scheduler.runAfter(
      0,
      postInternalApi.validatePhoto,
      { reservationId: reservation._id },
    )

    return { kind: 'processing' } as const
  },
})

export const getSubmissionStatus = query({
  args: {
    reservationId: v.id('postUploadReservations'),
    token: v.string(),
  },
  returns: submissionStatusValidator,
  handler: async (ctx, args) => {
    if (!validatePostCapability(args.token)) {
      return { kind: 'invalid_capability' } as const
    }
    const tokenHash = await hashPostCapability(args.token)
    const reservation = await ctx.db.get(args.reservationId)
    if (!reservation || reservation.tokenHash !== tokenHash) {
      return { kind: 'invalid_capability' } as const
    }
    if (
      reservation.state !== 'accepted' &&
      Date.now() >= reservation.expiresAt
    ) {
      return { kind: 'expired' } as const
    }
    if (reservation.state === 'rejected') {
      return {
        kind: 'rejected',
        code: reservation.errorCode as
          | 'missing_storage'
          | 'too_large'
          | 'unsupported_metadata'
          | 'empty'
          | 'unsupported_type'
          | 'mime_mismatch'
          | 'heic_requires_conversion',
      } as const
    }
    return { kind: reservation.state } as const
  },
})

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
