import { v } from 'convex/values'
import type { Doc } from './_generated/dataModel'
import { query } from './_generated/server'
import { FEATURED_WINE_CODES, WINE_CATALOG } from './wineCatalog'
import {
  publicWineValidator,
  WINE_CATEGORY_ORDER,
  type PublicWine,
} from './wineModel'

const CANONICAL_CODES = new Set(WINE_CATALOG.map((wine) => wine.productCode))

function toPublicWine(wine: Doc<'wines'>): PublicWine {
  if (wine.palettePrimary === undefined || wine.paletteSecondary === undefined) {
    throw new Error(
      `Catálogo público indisponível: paleta ausente para ${wine.productCode}.`,
    )
  }
  return {
    productCode: wine.productCode,
    name: wine.name,
    producer: wine.producer,
    description: wine.description,
    tone: wine.tone,
    priceCents: wine.priceCents,
    category: wine.category,
    palettePrimary: wine.palettePrimary,
    paletteSecondary: wine.paletteSecondary,
    status: wine.status,
  }
}

export const listCatalog = query({
  args: {},
  returns: v.array(publicWineValidator),
  handler: async (ctx) => {
    const catalog: Array<Doc<'wines'>> = []

    for (const category of WINE_CATEGORY_ORDER) {
      const categoryRows = await ctx.db
        .query('wines')
        .withIndex('by_category_price_code', (index) =>
          index.eq('category', category),
        )
        .collect()
      catalog.push(
        ...categoryRows.filter((wine) => CANONICAL_CODES.has(wine.productCode)),
      )
    }

    if (
      catalog.length !== WINE_CATALOG.length ||
      new Set(catalog.map((wine) => wine.productCode)).size !==
        WINE_CATALOG.length
    ) {
      throw new Error(
        'Catálogo público indisponível: reconciliação canônica necessária.',
      )
    }

    return catalog.map(toPublicWine)
  },
})

export const listFeatured = query({
  args: {},
  returns: v.array(publicWineValidator),
  handler: async (ctx) => {
    const featured: PublicWine[] = []

    for (const productCode of FEATURED_WINE_CODES) {
      const matches = await ctx.db
        .query('wines')
        .withIndex('by_product_code', (index) =>
          index.eq('productCode', productCode),
        )
        .collect()
      if (matches.length !== 1) {
        throw new Error(
          `Destaque indisponível: código ${productCode} não é único.`,
        )
      }
      featured.push(toPublicWine(matches[0]))
    }

    return featured
  },
})
