import { v } from 'convex/values'

export const wineCategoryValidator = v.union(
  v.literal('ate-200'),
  v.literal('200-350'),
  v.literal('350-500'),
)

export const wineToneValidator = v.union(
  v.literal('rubi'),
  v.literal('dourado'),
  v.literal('rose'),
  v.literal('verde'),
)

export const wineStatusValidator = v.union(
  v.literal('available'),
  v.literal('gifted'),
)

export const wineGiftStateValidator = v.union(
  v.object({
    status: v.literal('available'),
  }),
  v.object({
    status: v.literal('gifted'),
    giftedBy: v.string(),
    giftedAt: v.number(),
  }),
)

export const publicWineValidator = v.object({
  productCode: v.string(),
  name: v.string(),
  producer: v.string(),
  description: v.string(),
  tone: wineToneValidator,
  priceCents: v.number(),
  category: wineCategoryValidator,
  imageUrl: v.string(),
  status: wineStatusValidator,
})

export type WineCategory = 'ate-200' | '200-350' | '350-500'
export type WineTone = 'rubi' | 'dourado' | 'rose' | 'verde'
export type WineStatus = 'available' | 'gifted'
export type WineGiftState =
  | { status: 'available' }
  | { status: 'gifted'; giftedBy: string; giftedAt: number }

export type WineCatalogItem = {
  productCode: string
  name: string
  producer: string
  description: string
  tone: WineTone
  priceCents: number
  category: WineCategory
  imageUrl: string
}

export type PublicWine = WineCatalogItem & {
  status: WineStatus
}

export const WINE_PRODUCT_CODE_MAX_LENGTH = 32
export const WINE_NAME_MAX_LENGTH = 180
export const WINE_PRODUCER_MAX_LENGTH = 180
export const WINE_DESCRIPTION_MAX_LENGTH = 320
export const WINE_IMAGE_URL_MAX_LENGTH = 240
export const WINE_GIFTED_BY_MAX_LENGTH = 180

export const WINE_CATEGORY_ORDER: readonly WineCategory[] = [
  'ate-200',
  '200-350',
  '350-500',
]

export function assertValidWineCatalogItem(item: WineCatalogItem) {
  if (
    item.productCode.length === 0 ||
    item.productCode.length > WINE_PRODUCT_CODE_MAX_LENGTH ||
    item.name.length === 0 ||
    item.name.length > WINE_NAME_MAX_LENGTH ||
    item.producer.length === 0 ||
    item.producer.length > WINE_PRODUCER_MAX_LENGTH ||
    item.description.length === 0 ||
    item.description.length > WINE_DESCRIPTION_MAX_LENGTH ||
    item.imageUrl.length === 0 ||
    item.imageUrl.length > WINE_IMAGE_URL_MAX_LENGTH ||
    !Number.isSafeInteger(item.priceCents) ||
    item.priceCents <= 0
  ) {
    throw new Error(`Registro comercial inválido para o vinho ${item.productCode || '(sem código)'}.`)
  }
}
