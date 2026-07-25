import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx } from './_generated/server'
import {
  nextWineUpdatedAt,
  WINE_GIFTED_BY_MAX_LENGTH,
  type WineGiftState,
  type WineStatus,
} from './wineModel'

export function readWineGiftState(wine: Doc<'wines'>): WineGiftState {
  if (wine.status === 'available') {
    if (wine.giftedBy !== undefined || wine.giftedAt !== undefined) {
      throw new Error(
        `Invariante violada: vinho disponível ${wine.productCode} com atribuição.`,
      )
    }
    return { status: 'available' }
  }
  if (
    !wine.giftedBy?.trim() ||
    wine.giftedBy.length > WINE_GIFTED_BY_MAX_LENGTH ||
    wine.giftedAt === undefined
  ) {
    throw new Error(
      `Invariante violada: vinho presenteado ${wine.productCode} sem estado completo.`,
    )
  }
  return {
    status: 'gifted',
    giftedBy: wine.giftedBy,
    giftedAt: wine.giftedAt,
  }
}

export function normalizeWineGiftState(state: WineGiftState): WineGiftState {
  if (state.status === 'available') return state
  const giftedBy = state.giftedBy.trim()
  if (
    giftedBy.length === 0 ||
    giftedBy.length > WINE_GIFTED_BY_MAX_LENGTH ||
    !Number.isSafeInteger(state.giftedAt) ||
    state.giftedAt <= 0
  ) {
    throw new Error('Estado operacional de presente inválido.')
  }
  return { status: 'gifted', giftedBy, giftedAt: state.giftedAt }
}

export async function transitionWineGiftState(
  ctx: MutationCtx,
  {
    wineId,
    expectedStatus,
    expectedUpdatedAt,
    target,
    now = Date.now(),
  }: {
    wineId: Id<'wines'>
    expectedStatus: WineStatus
    expectedUpdatedAt: number
    target: WineGiftState
    now?: number
  },
) {
  const wine = await ctx.db.get(wineId)
  if (!wine) return { kind: 'not_found' } as const
  readWineGiftState(wine)
  if (
    wine.status !== expectedStatus ||
    wine.updatedAt !== expectedUpdatedAt
  ) {
    return { kind: 'conflict', wine } as const
  }
  const normalized = normalizeWineGiftState(target)
  const updatedAt = nextWineUpdatedAt(wine.updatedAt, now)
  await ctx.db.patch(wine._id, {
    status: normalized.status,
    giftedBy: normalized.status === 'gifted' ? normalized.giftedBy : undefined,
    giftedAt: normalized.status === 'gifted' ? normalized.giftedAt : undefined,
    updatedAt,
  })
  const updated = await ctx.db.get(wine._id)
  if (!updated) throw new Error('Vinho desapareceu durante a atualização.')
  return { kind: 'updated', wine: updated } as const
}
