import { v } from 'convex/values'
import type { FunctionReference } from 'convex/server'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import {
  internalAction,
  internalMutation,
  internalQuery,
} from './_generated/server'
import { mediaTypeValidator } from './postModel'
import { validateImageBytes } from './uploadValidation'

const postInternalApi = (internal as unknown as {
  postInternal: {
    readReservationForValidation: FunctionReference<
      'query',
      'internal',
      { reservationId: Id<'postUploadReservations'> },
      {
        reservationId: Id<'postUploadReservations'>
        state: string
        storageId?: Id<'_storage'>
      } | null
    >
    acceptPhoto: FunctionReference<
      'mutation',
      'internal',
      {
        reservationId: Id<'postUploadReservations'>
        storageId: Id<'_storage'>
        mediaType: 'image/jpeg' | 'image/png' | 'image/webp'
        mediaSize: number
      },
      unknown
    >
    rejectPhoto: FunctionReference<
      'mutation',
      'internal',
      {
        reservationId: Id<'postUploadReservations'>
        storageId: Id<'_storage'>
        code:
          | 'missing_storage'
          | 'too_large'
          | 'unsupported_metadata'
          | 'empty'
          | 'unsupported_type'
          | 'mime_mismatch'
          | 'heic_requires_conversion'
      },
      unknown
    >
  }
}).postInternal

const validationReservationValidator = v.union(
  v.null(),
  v.object({
    reservationId: v.id('postUploadReservations'),
    state: v.string(),
    storageId: v.optional(v.id('_storage')),
  }),
)

const photoErrorCodeValidator = v.union(
  v.literal('missing_storage'),
  v.literal('too_large'),
  v.literal('unsupported_metadata'),
  v.literal('empty'),
  v.literal('unsupported_type'),
  v.literal('mime_mismatch'),
  v.literal('heic_requires_conversion'),
)

export const readReservationForValidation = internalQuery({
  args: {
    reservationId: v.id('postUploadReservations'),
  },
  returns: validationReservationValidator,
  handler: async (ctx, args) => {
    const reservation = await ctx.db.get(args.reservationId)
    if (!reservation) {
      return null
    }
    return {
      reservationId: reservation._id,
      state: reservation.state,
      ...(reservation.storageId === undefined
        ? {}
        : { storageId: reservation.storageId }),
    }
  },
})

export const validatePhoto = internalAction({
  args: {
    reservationId: v.id('postUploadReservations'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const reservation = await ctx.runQuery(
      postInternalApi.readReservationForValidation,
      args,
    )
    if (
      reservation === null ||
      reservation.state !== 'processing' ||
      reservation.storageId === undefined
    ) {
      return null
    }

    const blob = await ctx.storage.get(reservation.storageId)
    if (blob === null) {
      await ctx.runMutation(postInternalApi.rejectPhoto, {
        reservationId: reservation.reservationId,
        storageId: reservation.storageId,
        code: 'missing_storage',
      })
      return null
    }

    const bytes = new Uint8Array(await blob.arrayBuffer())
    const verdict = validateImageBytes({
      bytes,
      declaredMime: blob.type,
    })
    if (verdict.kind === 'rejected') {
      await ctx.runMutation(postInternalApi.rejectPhoto, {
        reservationId: reservation.reservationId,
        storageId: reservation.storageId,
        code: verdict.code,
      })
      return null
    }

    await ctx.runMutation(postInternalApi.acceptPhoto, {
      reservationId: reservation.reservationId,
      storageId: reservation.storageId,
      mediaType: verdict.mediaType,
      mediaSize: verdict.mediaSize,
    })
    return null
  },
})

export const acceptPhoto = internalMutation({
  args: {
    reservationId: v.id('postUploadReservations'),
    storageId: v.id('_storage'),
    mediaType: mediaTypeValidator,
    mediaSize: v.number(),
  },
  returns: v.union(
    v.object({
      kind: v.literal('accepted'),
      postId: v.id('posts'),
    }),
    v.object({ kind: v.literal('ignored') }),
  ),
  handler: async (ctx, args) => {
    const reservation = await ctx.db.get(args.reservationId)
    if (!reservation) {
      return { kind: 'ignored' } as const
    }
    if (reservation.state === 'accepted' && reservation.postId !== undefined) {
      return {
        kind: 'accepted',
        postId: reservation.postId,
      } as const
    }
    if (
      reservation.state !== 'processing' ||
      reservation.storageId !== args.storageId
    ) {
      return { kind: 'ignored' } as const
    }

    const existingPosts = await ctx.db
      .query('posts')
      .withIndex('by_upload_reservation', (index) =>
        index.eq('uploadReservationId', reservation._id),
      )
      .take(2)
    let postId: Id<'posts'>
    if (existingPosts.length > 0) {
      postId = existingPosts[0]._id
    } else {
      postId = await ctx.db.insert('posts', {
        ...(reservation.author === undefined
          ? {}
          : { author: reservation.author }),
        ...(reservation.message === undefined
          ? {}
          : { message: reservation.message }),
        storageId: args.storageId,
        mediaType: args.mediaType,
        mediaSize: args.mediaSize,
        status: 'pendente',
        source: 'convidado',
        uploadReservationId: reservation._id,
        createdAt: Date.now(),
      })
    }
    await ctx.db.patch(reservation._id, {
      state: 'accepted',
      postId,
    })
    return { kind: 'accepted', postId } as const
  },
})

export const rejectPhoto = internalMutation({
  args: {
    reservationId: v.id('postUploadReservations'),
    storageId: v.id('_storage'),
    code: photoErrorCodeValidator,
  },
  returns: v.union(
    v.object({
      kind: v.literal('rejected'),
      code: photoErrorCodeValidator,
    }),
    v.object({ kind: v.literal('ignored') }),
  ),
  handler: async (ctx, args) => {
    const reservation = await ctx.db.get(args.reservationId)
    if (!reservation) {
      return { kind: 'ignored' } as const
    }
    if (reservation.state === 'rejected') {
      return {
        kind: 'rejected',
        code: (reservation.errorCode ?? args.code) as
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
      reservation.state !== 'processing' ||
      reservation.storageId !== args.storageId
    ) {
      return { kind: 'ignored' } as const
    }

    const postOwner = await ctx.db
      .query('posts')
      .withIndex('by_storage_id', (index) =>
        index.eq('storageId', args.storageId),
      )
      .first()
    if (postOwner) {
      return { kind: 'ignored' } as const
    }

    await ctx.storage.delete(args.storageId)
    await ctx.db.patch(reservation._id, {
      state: 'rejected',
      errorCode: args.code,
    })
    return { kind: 'rejected', code: args.code } as const
  },
})

export const expireReservation = internalMutation({
  args: {
    reservationId: v.id('postUploadReservations'),
  },
  returns: v.union(
    v.object({ kind: v.literal('active') }),
    v.object({ kind: v.literal('owned') }),
    v.object({ kind: v.literal('expired') }),
    v.object({ kind: v.literal('missing') }),
  ),
  handler: async (ctx, args) => {
    const reservation = await ctx.db.get(args.reservationId)
    if (!reservation) {
      return { kind: 'missing' } as const
    }
    if (reservation.state === 'accepted') {
      return { kind: 'owned' } as const
    }
    if (Date.now() < reservation.expiresAt) {
      return { kind: 'active' } as const
    }
    if (reservation.storageId !== undefined) {
      const postOwner = await ctx.db
        .query('posts')
        .withIndex('by_storage_id', (index) =>
          index.eq('storageId', reservation.storageId),
        )
        .first()
      if (!postOwner) {
        await ctx.storage.delete(reservation.storageId)
      }
    }
    await ctx.db.patch(reservation._id, { state: 'expired' })
    return { kind: 'expired' } as const
  },
})
