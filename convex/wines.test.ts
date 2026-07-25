import { convexTest } from 'convex-test'
import type {
  FunctionReference,
  RegisteredMutation,
} from 'convex/server'
import { describe, expect, it } from 'vitest'
import { api, internal } from './_generated/api'
import { WINE_CATALOG, FEATURED_WINE_CODES } from './wineCatalog'
import {
  ensureWineCatalog,
  setWineGiftStateForSmoke,
} from './wineInternal'
import {
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
  it('keeps the complete canonical catalog byte-for-byte', async () => {
    const digestBytes = new Uint8Array(
      await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(JSON.stringify(WINE_CATALOG)),
      ),
    )
    const digest = Array.from(digestBytes, (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('')

    expect(digest).toBe(
      '29ec75e05ce7c9c68418ed5df1c6b841f291300bc8a36f1b457ca624f5d143d8',
    )
    expect(WINE_CATALOG).toHaveLength(37)
    expect(WINE_CATALOG.find((wine) => wine.productCode === '0699230')?.productCode).toBe(
      '0699230',
    )
  })

  it('has unique codes and images, valid positive integer prices, and 13/10/14 bands', () => {
    expect(new Set(WINE_CATALOG.map((wine) => wine.productCode)).size).toBe(37)
    expect(new Set(WINE_CATALOG.map((wine) => wine.imageUrl)).size).toBe(37)
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
      'ate-200': 13,
      '200-350': 10,
      '350-500': 14,
    })
    expect(FEATURED_WINE_CODES).toEqual(['39778', '39158', '39470'])
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
      created: 37,
      updated: 0,
      unchanged: 0,
      unexpectedProductCodes: [],
      total: 37,
    })
    expect(second).toEqual({
      created: 0,
      updated: 0,
      unchanged: 37,
      unexpectedProductCodes: [],
      total: 37,
    })
    expect(stored).toHaveLength(37)
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
      unchanged: 36,
      unexpectedProductCodes: ['unexpected-operator-row'],
      total: 38,
    })
    expect(repaired).toMatchObject({
      name: 'Catena Malbec 2024',
      status: 'gifted',
      giftedBy: 'Convidada Teste',
      giftedAt: 12_345,
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
  it('returns 37 explicit public DTOs in category, price, and code order', async () => {
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
          left.productCode.localeCompare(right.productCode)
        )
      })
      .map((wine) => wine.productCode)

    expect(result).toHaveLength(37)
    expect(result.map((wine) => wine.productCode)).toEqual(expectedCodes)
    expect(
      Object.keys(result[0]).sort(),
    ).toEqual([
      'category',
      'description',
      'imageUrl',
      'name',
      'priceCents',
      'producer',
      'productCode',
      'status',
      'tone',
    ])
    expect(JSON.stringify(result)).not.toMatch(
      /"_id"|"giftedBy"|"giftedAt"|"updatedAt"/u,
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
    expect(JSON.stringify(result)).not.toContain('Privado')
  })
})
