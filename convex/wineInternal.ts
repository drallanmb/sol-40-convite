import { v } from 'convex/values'
import type { Doc } from './_generated/dataModel'
import { internalMutation } from './_generated/server'
import { WINE_CATALOG } from './wineCatalog'
import {
  assertValidWineCatalogItem,
  nextWineUpdatedAt,
  wineGiftStateValidator,
  wineCatalogKey,
  type WineCatalogItem,
} from './wineModel'
import {
  normalizeWineGiftState,
  readWineGiftState,
  transitionWineGiftState,
} from './wineOperations'

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
    (stored.catalogKey ?? stored.productCode) !== wineCatalogKey(canonical) ||
    stored.name !== canonical.name ||
    stored.producer !== canonical.producer ||
    stored.description !== canonical.description ||
    stored.tone !== canonical.tone ||
    stored.priceCents !== canonical.priceCents ||
    stored.category !== canonical.category ||
    stored.palettePrimary !== canonical.palettePrimary ||
    stored.paletteSecondary !== canonical.paletteSecondary ||
    stored.paletteReferenceUrl !== canonical.paletteReferenceUrl ||
    stored.paletteReferencedAt !== canonical.paletteReferencedAt ||
    stored.imageUrl !== undefined
  )
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
    const countsByKey = new Map<string, number>()
    for (const wine of existingBefore) {
      const key = wine.catalogKey ?? wine.productCode
      countsByKey.set(
        key,
        (countsByKey.get(key) ?? 0) + 1,
      )
    }
    const duplicateKeys = [...countsByKey.entries()]
      .filter(([, count]) => count > 1)
      .map(([catalogKey]) => catalogKey)
      .sort()
    if (duplicateKeys.length > 0) {
      throw new Error(
        `Invariante violada: registro de garrafa duplicado (${duplicateKeys.join(', ')}).`,
      )
    }

    let created = 0
    let updated = 0
    let unchanged = 0

    for (const canonical of WINE_CATALOG) {
      assertValidWineCatalogItem(canonical)
      const catalogKey = wineCatalogKey(canonical)
      let matches = await ctx.db
        .query('wines')
        .withIndex('by_catalog_key', (query) =>
          query.eq('catalogKey', catalogKey),
        )
        .collect()

      if (matches.length === 0 && catalogKey === canonical.productCode) {
        matches = (
          await ctx.db
            .query('wines')
            .withIndex('by_product_code', (query) =>
              query.eq('productCode', canonical.productCode),
            )
            .collect()
        ).filter((wine) => wine.catalogKey === undefined)
      }

      if (matches.length > 1) {
        throw new Error(
          `Invariante violada: registro de garrafa duplicado (${catalogKey}).`,
        )
      }

      const stored = matches[0]
      if (!stored) {
        const now = Date.now()
        await ctx.db.insert('wines', {
          ...canonical,
          catalogKey,
          status: 'available',
          updatedAt: now,
        })
        created += 1
        continue
      }

      if (commercialFieldsChanged(stored, canonical)) {
        const now = Date.now()
        await ctx.db.patch(stored._id, {
          ...canonical,
          catalogKey,
          imageUrl: undefined,
          updatedAt: nextWineUpdatedAt(stored.updatedAt, now),
        })
        updated += 1
      } else {
        unchanged += 1
      }
    }

    const storedAfter = await ctx.db.query('wines').collect()
    const canonicalKeys = new Set(WINE_CATALOG.map(wineCatalogKey))
    const unexpectedProductCodes = storedAfter
      .map((wine) => wine.catalogKey ?? wine.productCode)
      .filter((catalogKey) => !canonicalKeys.has(catalogKey))
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
    const normalized = normalizeWineGiftState(state)
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
    const previousState = readWineGiftState(wine)
    const result = await transitionWineGiftState(ctx, {
      wineId: wine._id,
      expectedStatus: wine.status,
      expectedUpdatedAt: wine.updatedAt,
      target: normalized,
    })
    if (result.kind !== 'updated') {
      throw new Error('A transição de smoke perdeu a revisão esperada.')
    }

    return {
      productCode,
      previousState,
      currentState: readWineGiftState(result.wine),
    }
  },
})
