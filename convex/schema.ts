import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
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
})
