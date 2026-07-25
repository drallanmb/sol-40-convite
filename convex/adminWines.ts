import { v } from 'convex/values'
import type { Doc } from './_generated/dataModel'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import { requireAnyAdmin, type AdminPrincipal } from './adminAccountModel'
import { appendAuditEvent, buildAuditChanges } from './adminAuditModel'
import { requireAdminSession } from './adminSecurity'
import {
  WINE_CATEGORY_ORDER,
  WINE_GIFTED_BY_MAX_LENGTH,
  WINE_GIFT_NOTE_MAX_LENGTH,
  wineCategoryValidator,
  wineStatusValidator,
} from './wineModel'
import {
  editWineGiftDetails,
  readWineGiftState,
  transitionWineGiftState,
} from './wineOperations'

const unauthorizedValidator = v.object({ kind: v.literal('unauthorized') })
const adminWineValidator = v.object({
  id: v.id('wines'),
  productCode: v.string(),
  name: v.string(),
  producer: v.string(),
  priceCents: v.number(),
  category: wineCategoryValidator,
  status: wineStatusValidator,
  giftedBy: v.optional(v.string()),
  giftNote: v.optional(v.string()),
  giftedAt: v.optional(v.number()),
  updatedAt: v.number(),
})
const resultValidator = v.union(
  unauthorizedValidator,
  v.object({ kind: v.literal('not_found') }),
  v.object({ kind: v.literal('invalid'), message: v.string() }),
  v.object({
    kind: v.literal('conflict'),
    wine: adminWineValidator,
  }),
  v.object({
    kind: v.literal('updated'),
    wine: adminWineValidator,
  }),
)

function projectWine(wine: Doc<'wines'>) {
  readWineGiftState(wine)
  return {
    id: wine._id,
    productCode: wine.productCode,
    name: wine.name,
    producer: wine.producer,
    priceCents: wine.priceCents,
    category: wine.category,
    status: wine.status,
    ...(wine.giftedBy === undefined ? {} : { giftedBy: wine.giftedBy }),
    ...(wine.giftNote === undefined ? {} : { giftNote: wine.giftNote }),
    ...(wine.giftedAt === undefined ? {} : { giftedAt: wine.giftedAt }),
    updatedAt: wine.updatedAt,
  }
}

function compareWines(left: Doc<'wines'>, right: Doc<'wines'>) {
  return (
    WINE_CATEGORY_ORDER.indexOf(left.category) -
      WINE_CATEGORY_ORDER.indexOf(right.category) ||
    left.priceCents - right.priceCents ||
    left.productCode.localeCompare(right.productCode)
  )
}

async function authorize(ctx: QueryCtx | MutationCtx, token: string) {
  const authorization = await requireAdminSession(ctx, token)
  if (authorization.kind === 'unauthorized') return authorization
  return requireAnyAdmin(authorization.principal)
    ? ({
        kind: 'authorized',
        principal: authorization.principal,
      } as const)
    : ({ kind: 'forbidden' } as const)
}

async function auditGiftChange(
  ctx: MutationCtx,
  principal: AdminPrincipal,
  action: 'gift_confirmed' | 'gift_updated' | 'gift_reopened',
  before: Doc<'wines'>,
  after: Doc<'wines'>,
) {
  await appendAuditEvent(ctx, {
    principal,
    area: 'gifts',
    action,
    targetType: 'wine',
    targetId: after._id,
    targetLabel: after.name,
    changes: buildAuditChanges({
      before,
      after,
      allowedFields: ['status', 'giftedBy', 'giftNote'],
    }),
  })
}

export const listAdmin = query({
  args: { token: v.string() },
  returns: v.union(
    unauthorizedValidator,
    v.object({ kind: v.literal('ready'), wines: v.array(adminWineValidator) }),
  ),
  handler: async (ctx, args) => {
    if ((await authorize(ctx, args.token)).kind !== 'authorized') {
      return { kind: 'unauthorized' } as const
    }
    const wines = await ctx.db.query('wines').collect()
    wines.sort(compareWines)
    return { kind: 'ready', wines: wines.map(projectWine) } as const
  },
})

export const markGifted = mutation({
  args: {
    token: v.string(),
    wineId: v.id('wines'),
    expectedUpdatedAt: v.number(),
    giftedBy: v.string(),
    giftNote: v.optional(v.string()),
  },
  returns: resultValidator,
  handler: async (ctx, args) => {
    const authorization = await authorize(ctx, args.token)
    if (authorization.kind !== 'authorized') {
      return { kind: 'unauthorized' } as const
    }
    const giftedBy = args.giftedBy.trim()
    const giftNote = args.giftNote?.trim() || undefined
    if (!giftedBy || giftedBy.length > WINE_GIFTED_BY_MAX_LENGTH) {
      return {
        kind: 'invalid',
        message: 'Informe o nome de quem presenteou.',
      } as const
    }
    if (
      giftNote !== undefined &&
      giftNote.length > WINE_GIFT_NOTE_MAX_LENGTH
    ) {
      return {
        kind: 'invalid',
        message: 'A observação deve ter no máximo 500 caracteres.',
      } as const
    }
    const result = await transitionWineGiftState(ctx, {
      wineId: args.wineId,
      expectedStatus: 'available',
      expectedUpdatedAt: args.expectedUpdatedAt,
      target: {
        status: 'gifted',
        giftedBy,
        ...(giftNote === undefined ? {} : { giftNote }),
        giftedAt: Date.now(),
      },
    })
    if (result.kind === 'conflict') {
      return { kind: 'conflict', wine: projectWine(result.wine) } as const
    }
    if (result.kind === 'not_found') return result
    await auditGiftChange(
      ctx,
      authorization.principal,
      'gift_confirmed',
      result.previousWine,
      result.wine,
    )
    return { kind: 'updated', wine: projectWine(result.wine) } as const
  },
})

export const makeAvailable = mutation({
  args: {
    token: v.string(),
    wineId: v.id('wines'),
    expectedUpdatedAt: v.number(),
  },
  returns: resultValidator,
  handler: async (ctx, args) => {
    const authorization = await authorize(ctx, args.token)
    if (authorization.kind !== 'authorized') {
      return { kind: 'unauthorized' } as const
    }
    const result = await transitionWineGiftState(ctx, {
      wineId: args.wineId,
      expectedStatus: 'gifted',
      expectedUpdatedAt: args.expectedUpdatedAt,
      target: { status: 'available' },
    })
    if (result.kind === 'conflict') {
      return { kind: 'conflict', wine: projectWine(result.wine) } as const
    }
    if (result.kind === 'not_found') return result
    await auditGiftChange(
      ctx,
      authorization.principal,
      'gift_reopened',
      result.previousWine,
      result.wine,
    )
    return { kind: 'updated', wine: projectWine(result.wine) } as const
  },
})

export const editGift = mutation({
  args: {
    token: v.string(),
    wineId: v.id('wines'),
    expectedUpdatedAt: v.number(),
    giftedBy: v.string(),
    giftNote: v.optional(v.string()),
  },
  returns: resultValidator,
  handler: async (ctx, args) => {
    const authorization = await authorize(ctx, args.token)
    if (authorization.kind !== 'authorized') {
      return { kind: 'unauthorized' } as const
    }
    const giftedBy = args.giftedBy.trim()
    const giftNote = args.giftNote?.trim() || undefined
    if (!giftedBy || giftedBy.length > WINE_GIFTED_BY_MAX_LENGTH) {
      return {
        kind: 'invalid',
        message: 'Informe o nome de quem presenteou.',
      } as const
    }
    if (
      giftNote !== undefined &&
      giftNote.length > WINE_GIFT_NOTE_MAX_LENGTH
    ) {
      return {
        kind: 'invalid',
        message: 'A observação deve ter no máximo 500 caracteres.',
      } as const
    }
    const result = await editWineGiftDetails(ctx, {
      wineId: args.wineId,
      expectedUpdatedAt: args.expectedUpdatedAt,
      giftedBy,
      ...(giftNote === undefined ? {} : { giftNote }),
    })
    if (result.kind === 'conflict') {
      return { kind: 'conflict', wine: projectWine(result.wine) } as const
    }
    if (result.kind === 'not_found') return result
    await auditGiftChange(
      ctx,
      authorization.principal,
      'gift_updated',
      result.previousWine,
      result.wine,
    )
    return { kind: 'updated', wine: projectWine(result.wine) } as const
  },
})
