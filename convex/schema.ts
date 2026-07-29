import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import {
  mediaTypeValidator,
  postStatusValidator,
  uploadStateValidator,
} from './postModel'
import { attendanceValidator } from './rsvpModel'
import {
  wineCategoryValidator,
  wineStatusValidator,
  wineToneValidator,
} from './wineModel'
import {
  adminAccountStateValidator,
  adminRoleValidator,
} from './adminAccountModel'
import {
  adminAuditActionValidator,
  adminAuditActorKindValidator,
  adminAuditAreaValidator,
  auditChangeValidator,
} from './adminAuditModel'

export default defineSchema({
  rsvps: defineTable({
    phone: v.string(),
    displayName: v.string(),
    contact: v.optional(v.string()),
    generation: v.optional(v.number()),
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
    generation: v.optional(v.number()),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index('by_token_hash', ['tokenHash'])
    .index('by_expires_at', ['expiresAt'])
    .index('by_rsvp', ['rsvpId']),

  adminSessions: defineTable({
    tokenHash: v.string(),
    accountId: v.optional(v.id('adminAccounts')),
    credentialVersion: v.optional(v.number()),
    deviceLabel: v.optional(v.string()),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index('by_token_hash', ['tokenHash'])
    .index('by_account', ['accountId'])
    .index('by_expires_at', ['expiresAt']),

  adminAccounts: defineTable({
    email: v.string(),
    displayName: v.string(),
    role: adminRoleValidator,
    state: adminAccountStateValidator,
    passwordHash: v.optional(v.string()),
    credentialVersion: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    activatedAt: v.optional(v.number()),
    disabledAt: v.optional(v.number()),
  })
    .index('by_email', ['email'])
    .index('by_role', ['role']),

  adminAuthConfig: defineTable({
    key: v.literal('primary'),
    ownerAccountId: v.optional(v.id('adminAccounts')),
    legacyDisabledAt: v.optional(v.number()),
    bootstrapCompletedAt: v.optional(v.number()),
  }).index('by_key', ['key']),

  adminAccessLinks: defineTable({
    accountId: v.id('adminAccounts'),
    purpose: v.union(v.literal('activation'), v.literal('reset')),
    tokenHash: v.string(),
    credentialVersion: v.number(),
    createdAt: v.number(),
    expiresAt: v.number(),
    consumedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
  })
    .index('by_token_hash', ['tokenHash'])
    .index('by_account', ['accountId'])
    .index('by_account_purpose', ['accountId', 'purpose'])
    .index('by_expires_at', ['expiresAt']),

  adminAuditEvents: defineTable({
    actorKind: adminAuditActorKindValidator,
    actorAccountId: v.optional(v.id('adminAccounts')),
    actorName: v.optional(v.string()),
    actorRole: v.optional(adminRoleValidator),
    subjectAccountId: v.optional(v.id('adminAccounts')),
    area: adminAuditAreaValidator,
    action: adminAuditActionValidator,
    targetType: v.optional(v.string()),
    targetId: v.optional(v.string()),
    targetLabel: v.optional(v.string()),
    changes: v.array(auditChangeValidator),
    occurredAt: v.number(),
    expiresAt: v.number(),
  })
    .index('by_occurred_at', ['occurredAt'])
    .index('by_actor_occurred_at', ['actorAccountId', 'occurredAt'])
    .index('by_area_occurred_at', ['area', 'occurredAt'])
    .index('by_action_occurred_at', ['action', 'occurredAt'])
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
    moderationRevision: v.optional(v.number()),
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
    terminalAt: v.optional(v.number()),
    validationRequestedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_token_hash', ['tokenHash'])
    .index('by_storage_id', ['storageId'])
    .index('by_expires_at', ['expiresAt'])
    .index('by_terminal_at', ['terminalAt'])
    .index('by_state_expires_at', ['state', 'expiresAt']),

  wines: defineTable({
    catalogKey: v.optional(v.string()),
    productCode: v.string(),
    name: v.string(),
    producer: v.string(),
    description: v.string(),
    tone: wineToneValidator,
    priceCents: v.number(),
    category: wineCategoryValidator,
    palettePrimary: v.string(),
    paletteSecondary: v.string(),
    paletteReferenceUrl: v.string(),
    paletteReferencedAt: v.string(),
    imageUrl: v.optional(v.string()),
    status: wineStatusValidator,
    giftedBy: v.optional(v.string()),
    giftNote: v.optional(v.string()),
    giftedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index('by_catalog_key', ['catalogKey'])
    .index('by_product_code', ['productCode'])
    .index('by_category_price_code', ['category', 'priceCents', 'productCode']),
})
