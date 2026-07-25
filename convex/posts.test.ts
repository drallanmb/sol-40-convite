import rateLimiterTest from '@convex-dev/rate-limiter/test'
import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vitest'
import { components } from './_generated/api'
import { makePostTest as makePostTestHarness } from './postTest'

const modules = import.meta.glob(['./**/*.*s', '!./**/*.test.*s'])

function makePostTest() {
  return makePostTestHarness({
    convexTest,
    modules,
    registerRateLimiter: (testInstance) => rateLimiterTest.register(testInstance),
  })
}

describe('Phase 5 Convex harness', () => {
  it('executes against the live schema with the official rate-limiter component', async () => {
    const t = makePostTest()

    const schemaResult = await t.run(async (ctx) => {
      const rows = await ctx.db.query('rsvps').collect()
      return { rowCount: rows.length }
    })
    const config = {
      kind: 'fixed window' as const,
      rate: 1,
      period: 60_000,
    }
    const first = await t.run((ctx) =>
      ctx.runMutation(components.rateLimiter.lib.rateLimit, {
        name: 'post-wave-zero-harness',
        config,
      }),
    )
    const second = await t.run((ctx) =>
      ctx.runMutation(components.rateLimiter.lib.rateLimit, {
        name: 'post-wave-zero-harness',
        config,
      }),
    )

    expect(schemaResult).toEqual({ rowCount: 0 })
    expect(first.ok).toBe(true)
    expect(second.ok).toBe(false)
  })
})
