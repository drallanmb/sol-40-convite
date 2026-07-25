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
    giftNote: v.optional(v.string()),
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
  palettePrimary: v.string(),
  paletteSecondary: v.string(),
  status: wineStatusValidator,
})

export type WineCategory = 'ate-200' | '200-350' | '350-500'
export type WineTone = 'rubi' | 'dourado' | 'rose' | 'verde'
export type WineStatus = 'available' | 'gifted'
export type WineGiftState =
  | { status: 'available' }
  | {
      status: 'gifted'
      giftedBy: string
      giftNote?: string
      giftedAt: number
    }

export type WineCatalogItem = {
  productCode: string
  name: string
  producer: string
  description: string
  tone: WineTone
  priceCents: number
  category: WineCategory
  palettePrimary: string
  paletteSecondary: string
  paletteReferenceUrl: string
  paletteReferencedAt: string
}

export type PublicWine = Omit<
  WineCatalogItem,
  'paletteReferenceUrl' | 'paletteReferencedAt'
> & {
  status: WineStatus
}

export const WINE_PRODUCT_CODE_MAX_LENGTH = 32
export const WINE_NAME_MAX_LENGTH = 180
export const WINE_PRODUCER_MAX_LENGTH = 180
export const WINE_DESCRIPTION_MAX_LENGTH = 320
export const WINE_PALETTE_REFERENCE_URL_MAX_LENGTH = 500
export const WINE_GIFTED_BY_MAX_LENGTH = 180
export const WINE_GIFT_NOTE_MAX_LENGTH = 500
const HEX_COLOR_PATTERN = /^#[0-9A-F]{6}$/u
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u

export const WINE_CATEGORY_ORDER: readonly WineCategory[] = [
  'ate-200',
  '200-350',
  '350-500',
]

export function nextWineUpdatedAt(current: number, now: number) {
  return Math.max(now, current + 1)
}

function saturationPercent(hex: string) {
  const channels = [1, 3, 5].map((offset) =>
    Number.parseInt(hex.slice(offset, offset + 2), 16) / 255,
  )
  const maximum = Math.max(...channels)
  const minimum = Math.min(...channels)
  const lightness = (maximum + minimum) / 2
  if (maximum === minimum) return 0
  return (
    ((maximum - minimum) /
      (1 - Math.abs(2 * lightness - 1))) *
    100
  )
}

export function assertMutedPalette(primary: string, secondary: string) {
  if (!HEX_COLOR_PATTERN.test(primary) || !HEX_COLOR_PATTERN.test(secondary)) {
    throw new Error('Paleta inválida: use dois hex no formato #RRGGBB.')
  }
  if (primary === secondary) {
    throw new Error('Paleta inválida: as duas cores devem ser distintas.')
  }
  if (saturationPercent(primary) > 75 || saturationPercent(secondary) > 75) {
    throw new Error('Paleta inválida: as duas cores devem permanecer muted.')
  }
}

export function assertHttpsReference(value: string) {
  if (
    value.length === 0 ||
    value.length > WINE_PALETTE_REFERENCE_URL_MAX_LENGTH
  ) {
    throw new Error('Referência https inválida para a paleta.')
  }
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password) {
      throw new Error()
    }
  } catch {
    throw new Error('Referência https inválida para a paleta.')
  }
}

export function assertReferenceDate(value: string) {
  if (!ISO_DATE_PATTERN.test(value)) {
    throw new Error('Data de referência inválida para a paleta.')
  }
  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error('Data de referência inválida para a paleta.')
  }
}

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
    !Number.isSafeInteger(item.priceCents) ||
    item.priceCents <= 0
  ) {
    throw new Error(`Registro comercial inválido para o vinho ${item.productCode || '(sem código)'}.`)
  }
  assertMutedPalette(item.palettePrimary, item.paletteSecondary)
  assertHttpsReference(item.paletteReferenceUrl)
  assertReferenceDate(item.paletteReferencedAt)
}
