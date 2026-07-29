import { convexTest } from 'convex-test'
import type {
  FunctionReference,
  RegisteredMutation,
} from 'convex/server'
import { describe, expect, it, vi } from 'vitest'
import { api, internal } from './_generated/api'
import { WINE_CATALOG, FEATURED_WINE_CODES } from './wineCatalog'
import {
  ensureWineCatalog,
  setWineGiftStateForSmoke,
} from './wineInternal'
import {
  assertHttpsReference,
  assertMutedPalette,
  assertReferenceDate,
  nextWineUpdatedAt,
  wineCatalogKey,
  WINE_CATEGORY_ORDER,
  type PublicWine,
  type WineGiftState,
} from './wineModel'
import { makeWineTest as makeWineTestHarness } from './wineTest'

const modules = import.meta.glob(['./**/*.*s', '!./**/*.test.*s'])

function makeWineTest() {
  return makeWineTestHarness({
    convexTest,
    modules,
  })
}

type EnsureResult = {
  created: number
  updated: number
  unchanged: number
  unexpectedProductCodes: string[]
  total: number
}

type SmokeResult = {
  productCode: string
  previousState: WineGiftState
  currentState: WineGiftState
}

const wineInternal = (
  internal as unknown as {
    wineInternal: {
      ensureWineCatalog: FunctionReference<'mutation', 'internal', Record<string, never>, EnsureResult>
      setWineGiftStateForSmoke: FunctionReference<
        'mutation',
        'internal',
        { productCode: string; state: WineGiftState },
        SmokeResult
      >
    }
  }
).wineInternal

const wineApi = (
  api as unknown as {
    wines: {
      listCatalog: FunctionReference<
        'query',
        'public',
        Record<string, never>,
        PublicWine[]
      >
      listFeatured: FunctionReference<
        'query',
        'public',
        Record<string, never>,
        PublicWine[]
      >
    }
  }
).wines

describe('catalog wines', () => {
  it('advances wine revisions under equal and backward clocks', () => {
    expect(nextWineUpdatedAt(100, 100)).toBe(101)
    expect(nextWineUpdatedAt(100, 99)).toBe(101)
    expect(nextWineUpdatedAt(100, 150)).toBe(150)
  })
  it('keeps the canonical commercial catalog byte-for-byte', async () => {
    const digestBytes = new Uint8Array(
      await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(
          JSON.stringify(
            WINE_CATALOG.map(
              ({
                palettePrimary: _palettePrimary,
                paletteSecondary: _paletteSecondary,
                paletteReferenceUrl: _paletteReferenceUrl,
                paletteReferencedAt: _paletteReferencedAt,
                ...commercial
              }) => commercial,
            ),
          ),
        ),
      ),
    )
    const digest = Array.from(digestBytes, (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('')

    expect(digest).toBe(
      '83bdc348d0bc8e296e6b7bff6f2d327fb9a8ee199bb7717c1d96a2bff273cb1b',
    )
    expect(WINE_CATALOG).toHaveLength(38)
    expect(WINE_CATALOG.find((wine) => wine.productCode === '0699230')?.productCode).toBe(
      '0699230',
    )
  })

  it('has unique bottle keys, complete palette provenance, valid prices, and 14/10/14 bands', () => {
    expect(new Set(WINE_CATALOG.map(wineCatalogKey)).size).toBe(38)
    expect(WINE_CATALOG.filter((wine) => wine.productCode === '38870')).toHaveLength(2)
    for (const wine of WINE_CATALOG) {
      expect(() =>
        assertMutedPalette(wine.palettePrimary, wine.paletteSecondary),
      ).not.toThrow()
      expect(() => assertHttpsReference(wine.paletteReferenceUrl)).not.toThrow()
      expect(() => assertReferenceDate(wine.paletteReferencedAt)).not.toThrow()
    }
    expect(
      WINE_CATALOG.every(
        (wine) => Number.isSafeInteger(wine.priceCents) && wine.priceCents > 0,
      ),
    ).toBe(true)
    expect(
      Object.fromEntries(
        ['ate-200', '200-350', '350-500'].map((category) => [
          category,
          WINE_CATALOG.filter((wine) => wine.category === category).length,
        ]),
      ),
    ).toEqual({
      'ate-200': 14,
      '200-350': 10,
      '350-500': 14,
    })
    expect(FEATURED_WINE_CODES).toEqual(['39778', '39158', '39470'])
  })

  it('rejects invalid, identical, or excessively saturated palette metadata', () => {
    expect(() => assertMutedPalette('#6A4A45', '#77856F')).not.toThrow()
    expect(() => assertMutedPalette('red', '#77856F')).toThrow(/paleta/i)
    expect(() => assertMutedPalette('#6A4A45', '#6A4A45')).toThrow(/distintas/i)
    expect(() => assertMutedPalette('#FF0000', '#77856F')).toThrow(/muted/i)
    expect(() => assertHttpsReference('http://example.com/wine')).toThrow(/https/i)
    expect(() => assertReferenceDate('25/07/2026')).toThrow(/data/i)
  })
})

describe('schema wines', () => {
  it('accepts a canonical wine document', async () => {
    const t = makeWineTest()
    const canonical = WINE_CATALOG[0]

    const stored = await t.run(async (ctx) => {
      const id = await ctx.db.insert('wines', {
        ...canonical,
        status: 'available',
        updatedAt: 1_000,
      })
      return ctx.db.get(id)
    })

    expect(stored?.productCode).toBe(canonical.productCode)
    expect(stored?.status).toBe('available')
  })

  it.each([
    ['category', { category: 'premium' }],
    ['tone', { tone: 'azul' }],
    ['status', { status: 'reserved' }],
  ])('rejects an unknown %s literal', async (_label, override) => {
    const t = makeWineTest()

    await expect(
      t.run((ctx) =>
        ctx.db.insert('wines', {
          ...WINE_CATALOG[0],
          status: 'available',
          updatedAt: 1_000,
          ...override,
        } as never),
      ),
    ).rejects.toThrow()
  })
})

describe('wine reconciliation', () => {
  it('creates once and is stable on the second run', async () => {
    const t = makeWineTest()

    const first = await t.mutation(wineInternal.ensureWineCatalog, {})
    const second = await t.mutation(wineInternal.ensureWineCatalog, {})
    const stored = await t.run((ctx) => ctx.db.query('wines').collect())

    expect(first).toEqual({
      created: 38,
      updated: 0,
      unchanged: 0,
      unexpectedProductCodes: [],
      total: 38,
    })
    expect(second).toEqual({
      created: 0,
      updated: 0,
      unchanged: 38,
      unexpectedProductCodes: [],
      total: 38,
    })
    expect(stored).toHaveLength(38)
  })

  it('repairs only commercial content while preserving gifted state and reports unexpected rows', async () => {
    const t = makeWineTest()
    await t.mutation(wineInternal.ensureWineCatalog, {})

    await t.run(async (ctx) => {
      const matches = await ctx.db
        .query('wines')
        .withIndex('by_product_code', (query) => query.eq('productCode', '39778'))
        .collect()
      await ctx.db.patch(matches[0]._id, {
        name: 'Nome comercial desatualizado',
        status: 'gifted',
        giftedBy: 'Convidada Teste',
        giftedAt: 12_345,
        updatedAt: 12_345,
      })
      await ctx.db.insert('wines', {
        ...WINE_CATALOG[0],
        productCode: 'unexpected-operator-row',
        status: 'available',
        updatedAt: 9_999,
      })
    })

    const result = await t.mutation(wineInternal.ensureWineCatalog, {})
    const repaired = await t.run((ctx) =>
      ctx.db
        .query('wines')
        .withIndex('by_product_code', (query) => query.eq('productCode', '39778'))
        .unique(),
    )

    expect(result).toMatchObject({
      created: 0,
      updated: 1,
      unchanged: 37,
      unexpectedProductCodes: ['unexpected-operator-row'],
      total: 39,
    })
    expect(repaired).toMatchObject({
      name: 'Catena Malbec 2024',
      status: 'gifted',
      giftedBy: 'Convidada Teste',
      giftedAt: 12_345,
    })
  })

  it('advances ensureWineCatalog commercial revisions under equal and backward clocks', async () => {
    const t = makeWineTest()
    vi.useFakeTimers()
    vi.setSystemTime(10_000)
    await t.mutation(wineInternal.ensureWineCatalog, {})
    const before = await t.run((ctx) =>
      ctx.db
        .query('wines')
        .withIndex('by_product_code', (query) => query.eq('productCode', '39778'))
        .unique(),
    )
    if (!before) throw new Error('missing fixture wine')
    await t.run((ctx) =>
      ctx.db.patch(before._id, { name: 'desatualizado', updatedAt: 10_000 }),
    )

    vi.setSystemTime(9_000)
    await t.mutation(wineInternal.ensureWineCatalog, {})
    const after = await t.run((ctx) => ctx.db.get(before._id))
    expect(after?.updatedAt).toBe(10_001)
    expect(after?.name).toBe('Catena Malbec 2024')
    vi.useRealTimers()
  })

  it('cleans a legacy imageUrl while preserving the complete gifted state', async () => {
    const t = makeWineTest()
    const canonical = WINE_CATALOG.find((wine) => wine.productCode === '39778')!

    await t.run((ctx) =>
      ctx.db.insert('wines', {
        ...canonical,
        imageUrl: '/wines/legacy.png',
        status: 'gifted',
        giftedBy: 'Estado anterior',
        giftedAt: 55_000,
        updatedAt: 55_000,
      }),
    )

    const first = await t.mutation(wineInternal.ensureWineCatalog, {})
    const second = await t.mutation(wineInternal.ensureWineCatalog, {})
    const stored = await t.run((ctx) =>
      ctx.db
        .query('wines')
        .withIndex('by_product_code', (query) => query.eq('productCode', '39778'))
        .unique(),
    )

    expect(first.updated).toBe(1)
    expect(second.unchanged).toBe(38)
    expect(stored).not.toHaveProperty('imageUrl')
    expect(stored).toMatchObject({
      status: 'gifted',
      giftedBy: 'Estado anterior',
      giftedAt: 55_000,
    })
  })

  it('fails closed when a canonical product code is duplicated', async () => {
    const t = makeWineTest()
    await t.mutation(wineInternal.ensureWineCatalog, {})
    await t.run((ctx) =>
      ctx.db.insert('wines', {
        ...WINE_CATALOG[0],
        status: 'available',
        updatedAt: 2_000,
      }),
    )

    await expect(
      t.mutation(wineInternal.ensureWineCatalog, {}),
    ).rejects.toThrow(/duplicado/i)
  })
})

describe('wine smoke seam', () => {
  it('restores an initially available wine without stale gift metadata', async () => {
    const t = makeWineTest()
    await t.mutation(wineInternal.ensureWineCatalog, {})

    const changed = await t.mutation(wineInternal.setWineGiftStateForSmoke, {
      productCode: '39778',
      state: {
        status: 'gifted',
        giftedBy: 'Smoke Test',
        giftedAt: 20_000,
      },
    })
    const restored = await t.mutation(wineInternal.setWineGiftStateForSmoke, {
      productCode: '39778',
      state: changed.previousState,
    })
    const stored = await t.run((ctx) =>
      ctx.db
        .query('wines')
        .withIndex('by_product_code', (query) => query.eq('productCode', '39778'))
        .unique(),
    )

    expect(changed).toMatchObject({
      previousState: { status: 'available' },
      currentState: {
        status: 'gifted',
        giftedBy: 'Smoke Test',
        giftedAt: 20_000,
      },
    })
    expect(restored.currentState).toEqual({ status: 'available' })
    expect(stored).not.toHaveProperty('giftedBy')
    expect(stored).not.toHaveProperty('giftedAt')
  })

  it('restores the exact previous gifted state', async () => {
    const t = makeWineTest()
    await t.mutation(wineInternal.ensureWineCatalog, {})
    await t.mutation(wineInternal.setWineGiftStateForSmoke, {
      productCode: '39158',
      state: {
        status: 'gifted',
        giftedBy: 'Estado Original',
        giftedAt: 30_000,
      },
    })

    const changed = await t.mutation(wineInternal.setWineGiftStateForSmoke, {
      productCode: '39158',
      state: { status: 'available' },
    })
    const restored = await t.mutation(wineInternal.setWineGiftStateForSmoke, {
      productCode: '39158',
      state: changed.previousState,
    })

    expect(changed.previousState).toEqual({
      status: 'gifted',
      giftedBy: 'Estado Original',
      giftedAt: 30_000,
    })
    expect(restored.currentState).toEqual(changed.previousState)
  })

  it('rejects missing, duplicated, or invalid operational targets', async () => {
    const t = makeWineTest()
    await t.mutation(wineInternal.ensureWineCatalog, {})

    await expect(
      t.mutation(wineInternal.setWineGiftStateForSmoke, {
        productCode: 'not-found',
        state: { status: 'available' },
      }),
    ).rejects.toThrow(/não encontrado/i)
    await expect(
      t.mutation(wineInternal.setWineGiftStateForSmoke, {
        productCode: '39778',
        state: { status: 'reserved' },
      } as never),
    ).rejects.toThrow()

    await t.run((ctx) =>
      ctx.db.insert('wines', {
        ...WINE_CATALOG[0],
        status: 'available',
        updatedAt: 2_000,
      }),
    )
    await expect(
      t.mutation(wineInternal.setWineGiftStateForSmoke, {
        productCode: WINE_CATALOG[0].productCode,
        state: { status: 'available' },
      }),
    ).rejects.toThrow(/duplicado/i)
  })
})

describe('wine functions are internal only', () => {
  it('registers both operational writers as internal mutations, not public API functions', () => {
    const internalWriters: Array<
      RegisteredMutation<'internal', Record<string, unknown>, unknown>
    > = [ensureWineCatalog, setWineGiftStateForSmoke]

    if (false) {
      // @ts-expect-error internal writers must never enter the generated public API
      void api.wineInternal.ensureWineCatalog
      // @ts-expect-error internal writers must never enter the generated public API
      void api.wineInternal.setWineGiftStateForSmoke
    }

    expect(internalWriters).toHaveLength(2)
  })
})

describe('wine public queries', () => {
  it('returns 38 explicit public DTOs in category, price, code, and bottle-key order', async () => {
    const t = makeWineTest()
    await t.mutation(wineInternal.ensureWineCatalog, {})

    const result = await t.query(wineApi.listCatalog, {})
    const expectedCodes = [...WINE_CATALOG]
      .sort((left, right) => {
        const categoryDelta =
          WINE_CATEGORY_ORDER.indexOf(left.category) -
          WINE_CATEGORY_ORDER.indexOf(right.category)
        return (
          categoryDelta ||
          left.priceCents - right.priceCents ||
          left.productCode.localeCompare(right.productCode) ||
          wineCatalogKey(left).localeCompare(wineCatalogKey(right))
        )
      })
      .map((wine) => wine.productCode)

    expect(result).toHaveLength(38)
    expect(result.map((wine) => wine.productCode)).toEqual(expectedCodes)
    expect(
      Object.keys(result[0]).sort(),
    ).toEqual([
      'catalogKey',
      'category',
      'description',
      'name',
      'palettePrimary',
      'paletteSecondary',
      'priceCents',
      'producer',
      'productCode',
      'status',
      'tone',
    ])
    expect(JSON.stringify(result)).not.toMatch(
      /"_id"|"giftedBy"|"giftNote"|"giftedAt"|"updatedAt"|"imageUrl"|"paletteReferenceUrl"|"paletteReferencedAt"/u,
    )
  })

  it('returns the fixed featured trio in tuple order and preserves gifted status', async () => {
    const t = makeWineTest()
    await t.mutation(wineInternal.ensureWineCatalog, {})
    await t.mutation(wineInternal.setWineGiftStateForSmoke, {
      productCode: FEATURED_WINE_CODES[1],
      state: {
        status: 'gifted',
        giftedBy: 'Privado',
        giftNote: 'Nota ainda mais privada',
        giftedAt: 40_000,
      },
    })

    const result = await t.query(wineApi.listFeatured, {})

    expect(result.map((wine) => wine.productCode)).toEqual(
      FEATURED_WINE_CODES,
    )
    expect(result.map((wine) => wine.status)).toEqual([
      'available',
      'gifted',
      'available',
    ])
    expect(JSON.stringify(result)).not.toMatch(
      /Privado|Nota ainda mais privada|giftedBy|giftNote|giftedAt|actor/iu,
    )
  })
})
