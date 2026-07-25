import { createHash } from 'node:crypto'
import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vitest'
import { WINE_CATALOG, FEATURED_WINE_CODES } from './wineCatalog'
import { makeWineTest as makeWineTestHarness } from './wineTest'

const modules = import.meta.glob(['./**/*.*s', '!./**/*.test.*s'])

function makeWineTest() {
  return makeWineTestHarness({
    convexTest,
    modules,
  })
}

describe('catalog wines', () => {
  it('keeps the complete canonical catalog byte-for-byte', () => {
    const digest = createHash('sha256')
      .update(JSON.stringify(WINE_CATALOG))
      .digest('hex')

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
