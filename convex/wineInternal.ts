import { v } from 'convex/values'
import type { Doc } from './_generated/dataModel'
import { internalMutation } from './_generated/server'
import { WINE_CATALOG } from './wineCatalog'
import {
  assertValidWineCatalogItem,
  WINE_GIFTED_BY_MAX_LENGTH,
  wineGiftStateValidator,
  type WineCatalogItem,
  type WineGiftState,
} from './wineModel'

const ensureResultValidator = v.object({
  created: v.number(),
  updated: v.number(),
  unchanged: v.number(),
  unexpectedProductCodes: v.array(v.string()),
  total: v.number(),
})

const smokeResultValidator = v.object({
  productCode: v.string(),
  previousState: wineGiftStateValidator,
  currentState: wineGiftStateValidator,
})

function commercialFieldsChanged(
  stored: Doc<'wines'>,
  canonical: WineCatalogItem,
) {
  return (
    stored.productCode !== canonical.productCode ||
    stored.name !== canonical.name ||
    stored.producer !== canonical.producer ||
    stored.description !== canonical.description ||
    stored.tone !== canonical.tone ||
    stored.priceCents !== canonical.priceCents ||
    stored.category !== canonical.category ||
    stored.imageUrl !== canonical.imageUrl
  )
}

function readGiftState(wine: Doc<'wines'>): WineGiftState {
  if (wine.status === 'available') {
    return { status: 'available' }
  }
  if (wine.giftedBy === undefined || wine.giftedAt === undefined) {
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

function assertValidGiftState(state: WineGiftState) {
  if (state.status === 'available') {
    return
  }
  if (
    state.giftedBy.trim().length === 0 ||
    state.giftedBy.length > WINE_GIFTED_BY_MAX_LENGTH ||
    !Number.isSafeInteger(state.giftedAt) ||
    state.giftedAt <= 0
  ) {
    throw new Error('Estado operacional de presente inválido.')
  }
}

/**
 * Reconcilia o conteúdo comercial canônico sem tocar no estado de presente.
 * Uso explícito de operação/deploy; nunca deve ser exposto ao cliente público.
 */
export const ensureWineCatalog = internalMutation({
  args: {},
  returns: ensureResultValidator,
  handler: async (ctx) => {
    const existingBefore = await ctx.db.query('wines').collect()
    const countsByCode = new Map<string, number>()
    for (const wine of existingBefore) {
      countsByCode.set(
        wine.productCode,
        (countsByCode.get(wine.productCode) ?? 0) + 1,
      )
    }
    const duplicateCodes = [...countsByCode.entries()]
      .filter(([, count]) => count > 1)
      .map(([productCode]) => productCode)
      .sort()
    if (duplicateCodes.length > 0) {
      throw new Error(
        `Invariante violada: código de vinho duplicado (${duplicateCodes.join(', ')}).`,
      )
    }

    let created = 0
    let updated = 0
    let unchanged = 0

    for (const canonical of WINE_CATALOG) {
      assertValidWineCatalogItem(canonical)
      const matches = await ctx.db
        .query('wines')
        .withIndex('by_product_code', (query) =>
          query.eq('productCode', canonical.productCode),
        )
        .collect()

      if (matches.length > 1) {
        throw new Error(
          `Invariante violada: código de vinho duplicado (${canonical.productCode}).`,
        )
      }

      const stored = matches[0]
      if (!stored) {
        await ctx.db.insert('wines', {
          ...canonical,
          status: 'available',
          updatedAt: Date.now(),
        })
        created += 1
        continue
      }

      if (commercialFieldsChanged(stored, canonical)) {
        await ctx.db.patch(stored._id, {
          ...canonical,
          updatedAt: Date.now(),
        })
        updated += 1
      } else {
        unchanged += 1
      }
    }

    const storedAfter = await ctx.db.query('wines').collect()
    const canonicalCodes = new Set(WINE_CATALOG.map((wine) => wine.productCode))
    const unexpectedProductCodes = storedAfter
      .map((wine) => wine.productCode)
      .filter((productCode) => !canonicalCodes.has(productCode))
      .sort()

    return {
      created,
      updated,
      unchanged,
      unexpectedProductCodes,
      total: storedAfter.length,
    }
  },
})

/**
 * Costura operacional/dev para smoke reativo. Sempre devolve o snapshot
 * anterior, permitindo que o operador restaure sem presumir o estado inicial.
 */
export const setWineGiftStateForSmoke = internalMutation({
  args: {
    productCode: v.string(),
    state: wineGiftStateValidator,
  },
  returns: smokeResultValidator,
  handler: async (ctx, { productCode, state }) => {
    assertValidGiftState(state)
    const matches = await ctx.db
      .query('wines')
      .withIndex('by_product_code', (query) => query.eq('productCode', productCode))
      .collect()

    if (matches.length === 0) {
      throw new Error(`Vinho não encontrado para smoke (${productCode}).`)
    }
    if (matches.length > 1) {
      throw new Error(
        `Invariante violada: código de vinho duplicado (${productCode}).`,
      )
    }

    const wine = matches[0]
    const previousState = readGiftState(wine)
    const updatedAt = Date.now()

    if (state.status === 'available') {
      await ctx.db.patch(wine._id, {
        status: 'available',
        giftedBy: undefined,
        giftedAt: undefined,
        updatedAt,
      })
    } else {
      await ctx.db.patch(wine._id, {
        status: 'gifted',
        giftedBy: state.giftedBy,
        giftedAt: state.giftedAt,
        updatedAt,
      })
    }

    return {
      productCode,
      previousState,
      currentState: state,
    }
  },
})
