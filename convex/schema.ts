import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import {
  mediaTypeValidator,
  postStatusValidator,
  uploadStateValidator,
} from './postModel'
import { attendanceValidator } from './rsvpModel'

export default defineSchema({
  rsvps: defineTable({
    phone: v.string(),
    displayName: v.string(),
    contact: v.optional(v.string()),
    updatedAt: v.number(),
  }).index('by_phone', ['phone']),

  rsvpGuests: defineTable({
    rsvpId: v.id('rsvps'),
    publicRef: v.string(),
    name: v.string(),
    attendance: attendanceValidator,
    sortOrder: v.number(),
    respondedAt: v.optional(v.number()),
  })
    .index('by_rsvp', ['rsvpId'])
    .index('by_rsvp_sort', ['rsvpId', 'sortOrder'])
    .index('by_rsvp_public_ref', ['rsvpId', 'publicRef']),

  rsvpSessions: defineTable({
    tokenHash: v.string(),
    rsvpId: v.id('rsvps'),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index('by_token_hash', ['tokenHash'])
    .index('by_expires_at', ['expiresAt']),

  posts: defineTable({
    author: v.optional(v.string()),
    message: v.optional(v.string()),
    storageId: v.optional(v.id('_storage')),
    mediaType: v.optional(mediaTypeValidator),
    mediaSize: v.optional(v.number()),
    status: postStatusValidator,
    source: v.literal('convidado'),
    uploadReservationId: v.optional(v.id('postUploadReservations')),
    createdAt: v.number(),
    moderatedAt: v.optional(v.number()),
    approvedAt: v.optional(v.number()),
  })
    .index('by_status', ['status'])
    .index('by_storage_id', ['storageId'])
    .index('by_upload_reservation', ['uploadReservationId']),

  postUploadReservations: defineTable({
    tokenHash: v.string(),
    deviceKeyHash: v.string(),
    state: uploadStateValidator,
    storageId: v.optional(v.id('_storage')),
    author: v.optional(v.string()),
    message: v.optional(v.string()),
    postId: v.optional(v.id('posts')),
    errorCode: v.optional(v.string()),
    expiresAt: v.number(),
    validationRequestedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_storage_id', ['storageId'])
    .index('by_expires_at', ['expiresAt']),
})
