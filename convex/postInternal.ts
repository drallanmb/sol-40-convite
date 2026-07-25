import { v } from 'convex/values'
import type { FunctionReference } from 'convex/server'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import {
  internalAction,
  internalMutation,
  internalQuery,
  type MutationCtx,
} from './_generated/server'
import { mediaTypeValidator } from './postModel'
import { validateImageBytes } from './uploadValidation'

const ORPHAN_STORAGE_AGE_MS = 24 * 60 * 60 * 1_000
const ORPHAN_SWEEP_PAGE_SIZE = 50
export const TERMINAL_RESERVATION_RETENTION_MS = 7 * 24 * 60 * 60 * 1_000
export const TERMINAL_RESERVATION_PAGE_SIZE = 50

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
    sweepOrphanStorage: FunctionReference<
      'mutation',
      'internal',
      { cursor?: string },
      unknown
    >
    retireTerminalReservations: FunctionReference<
      'mutation',
      'internal',
      Record<string, never>,
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
      terminalAt: Date.now(),
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

    const metadata = await ctx.db.system.get('_storage', args.storageId)
    if (metadata) {
      await ctx.storage.delete(args.storageId)
    }
    await ctx.db.patch(reservation._id, {
      state: 'rejected',
      errorCode: args.code,
      terminalAt: Date.now(),
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
    if (reservation.state === 'expired') {
      if (reservation.storageId !== undefined) {
        const postOwner = await ctx.db
          .query('posts')
          .withIndex('by_storage_id', (index) =>
            index.eq('storageId', reservation.storageId),
          )
          .first()
        const metadata = await ctx.db.system.get(
          '_storage',
          reservation.storageId,
        )
        if (!postOwner && metadata) {
          await ctx.storage.delete(reservation.storageId)
        }
      }
      return { kind: 'expired' } as const
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
        const metadata = await ctx.db.system.get(
          '_storage',
          reservation.storageId,
        )
        if (metadata) {
          await ctx.storage.delete(reservation.storageId)
        }
      }
    }
    await ctx.db.patch(reservation._id, {
      state: 'expired',
      terminalAt: Date.now(),
    })
    return { kind: 'expired' } as const
  },
})

const TERMINAL_STATES = ['accepted', 'rejected', 'expired'] as const

async function deleteTerminalReservationIfSafe(
  ctx: MutationCtx,
  reservationId: Id<'postUploadReservations'>,
  cutoff: number,
) {
  const reservation = await ctx.db.get(reservationId)
  if (
    !reservation ||
    !TERMINAL_STATES.includes(
      reservation.state as (typeof TERMINAL_STATES)[number],
    ) ||
    reservation.terminalAt === undefined ||
    reservation.terminalAt >= cutoff
  ) {
    return false
  }

  if (reservation.state === 'accepted') {
    if (
      reservation.postId === undefined ||
      reservation.storageId === undefined
    ) {
      return false
    }
    const post = await ctx.db.get(reservation.postId)
    if (
      !post ||
      post.uploadReservationId !== reservation._id ||
      post.storageId !== reservation.storageId
    ) {
      return false
    }
  } else if (reservation.storageId !== undefined) {
    const postOwner = await ctx.db
      .query('posts')
      .withIndex('by_storage_id', (index) =>
        index.eq('storageId', reservation.storageId),
      )
      .first()
    if (postOwner) {
      return false
    }
    const metadata = await ctx.db.system.get(
      '_storage',
      reservation.storageId,
    )
    if (metadata) {
      await ctx.storage.delete(reservation.storageId)
    }
  }

  await ctx.db.delete(reservation._id)
  return true
}

export const retireTerminalReservations = internalMutation({
  args: {},
  returns: v.object({
    scanned: v.number(),
    deleted: v.number(),
    migrated: v.number(),
    done: v.boolean(),
  }),
  handler: async (ctx) => {
    const cutoff = Date.now() - TERMINAL_RESERVATION_RETENTION_MS
    const terminalCandidates = await ctx.db
      .query('postUploadReservations')
      .withIndex('by_terminal_at', (index) =>
        index.lt('terminalAt', cutoff),
      )
      .order('asc')
      .take(TERMINAL_RESERVATION_PAGE_SIZE)
    let deleted = 0
    for (const candidate of terminalCandidates) {
      if (
        await deleteTerminalReservationIfSafe(
          ctx,
          candidate._id,
          cutoff,
        )
      ) {
        deleted += 1
      }
    }

    let migrated = 0
    let legacyBudget = TERMINAL_RESERVATION_PAGE_SIZE
    for (const state of TERMINAL_STATES) {
      if (legacyBudget === 0) {
        break
      }
      const candidates = await ctx.db
        .query('postUploadReservations')
        .withIndex('by_state_expires_at', (index) =>
          index.eq('state', state).lt('expiresAt', cutoff),
        )
        .order('asc')
        .take(legacyBudget)
      legacyBudget -= candidates.length
      for (const candidate of candidates) {
        const current = await ctx.db.get(candidate._id)
        if (
          current &&
          current.state === state &&
          current.terminalAt === undefined
        ) {
          await ctx.db.patch(current._id, {
            terminalAt: current.expiresAt,
          })
          migrated += 1
        }
      }
    }

    const done =
      terminalCandidates.length < TERMINAL_RESERVATION_PAGE_SIZE &&
      migrated === 0
    if (!done) {
      await ctx.scheduler.runAfter(
        0,
        postInternalApi.retireTerminalReservations,
        {},
      )
    }

    return {
      scanned: terminalCandidates.length,
      deleted,
      migrated,
      done,
    }
  },
})

export const sweepOrphanStorage = internalMutation({
  args: {
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    scanned: v.number(),
    deleted: v.number(),
    done: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const page = await ctx.db.system
      .query('_storage')
      .order('asc')
      .paginate({
        cursor: args.cursor ?? null,
        numItems: ORPHAN_SWEEP_PAGE_SIZE,
      })
    const cutoff = Date.now() - ORPHAN_STORAGE_AGE_MS
    let deleted = 0

    for (const metadata of page.page) {
      if (metadata._creationTime >= cutoff) {
        continue
      }

      const [postOwner, reservationOwner] = await Promise.all([
        ctx.db
          .query('posts')
          .withIndex('by_storage_id', (index) =>
            index.eq('storageId', metadata._id),
          )
          .first(),
        ctx.db
          .query('postUploadReservations')
          .withIndex('by_storage_id', (index) =>
            index.eq('storageId', metadata._id),
          )
          .first(),
      ])
      if (postOwner || reservationOwner) {
        continue
      }

      const currentMetadata = await ctx.db.system.get(
        '_storage',
        metadata._id,
      )
      if (currentMetadata) {
        await ctx.storage.delete(metadata._id)
        deleted += 1
      }
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        postInternalApi.sweepOrphanStorage,
        { cursor: page.continueCursor },
      )
    }

    return {
      scanned: page.page.length,
      deleted,
      done: page.isDone,
    }
  },
})
