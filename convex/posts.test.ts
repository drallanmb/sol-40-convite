import rateLimiterTest from '@convex-dev/rate-limiter/test'
import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vitest'
import { components } from './_generated/api'
import {
  AUTHOR_MAX_LENGTH,
  MESSAGE_MAX_LENGTH,
  VALIDATION_RETRY_MS,
  countUnicodeCodePoints,
  normalizeMemoryText,
} from './postModel'
import { POST_RATE_LIMITS, toPostRetryAfterSeconds } from './postRateLimits'
import {
  hashPostCapability,
  hashPostDeviceKey,
  validatePostCapability,
} from './postSecurity'
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

describe('memory text domain', () => {
  it('counts Unicode code points and enforces message boundaries after normalization', () => {
    expect(countUnicodeCodePoints('Sol 🌅')).toBe(5)
    expect(MESSAGE_MAX_LENGTH).toBe(280)

    expect(normalizeMemoryText({ message: '' })).toEqual({ kind: 'invalid_content' })
    expect(normalizeMemoryText({ message: 'a' })).toEqual({
      kind: 'valid',
      message: 'a',
    })
    expect(normalizeMemoryText({ message: '🌅'.repeat(280) })).toEqual({
      kind: 'valid',
      message: '🌅'.repeat(280),
    })
    expect(normalizeMemoryText({ message: '🌅'.repeat(281) })).toEqual({
      kind: 'invalid_message',
    })
  })

  it('uses the same normalization for photo and message paths', () => {
    const input = {
      author: '  Sol\r\n  ',
      message: '  Linha 1\r\nLinha 2  ',
    }

    expect(normalizeMemoryText(input)).toEqual({
      kind: 'valid',
      author: 'Sol',
      message: 'Linha 1\nLinha 2',
    })
    expect(normalizeMemoryText({ author: input.author, hasStorageId: true })).toEqual({
      kind: 'valid',
      author: 'Sol',
    })
    expect(normalizeMemoryText({ hasStorageId: true })).toEqual({ kind: 'valid' })
    expect(normalizeMemoryText({ author: 'Apenas assinatura' })).toEqual({
      kind: 'invalid_content',
    })
  })

  it('rejects disallowed controls and enforces optional author boundaries', () => {
    expect(AUTHOR_MAX_LENGTH).toBe(60)
    expect(normalizeMemoryText({ message: 'linha\tcom tab\npermitida' }).kind).toBe('valid')
    expect(normalizeMemoryText({ message: 'controle\u0000' })).toEqual({
      kind: 'invalid_control',
    })
    expect(normalizeMemoryText({ message: 'controle\u0085' })).toEqual({
      kind: 'invalid_control',
    })
    expect(
      normalizeMemoryText({
        author: 'a'.repeat(60),
        message: 'Memória',
      }),
    ).toEqual({
      kind: 'valid',
      author: 'a'.repeat(60),
      message: 'Memória',
    })
    expect(
      normalizeMemoryText({
        author: 'a'.repeat(61),
        message: 'Memória',
      }),
    ).toEqual({ kind: 'invalid_author' })
  })
})

describe('post capabilities', () => {
  const capability = `${'A'.repeat(42)}Q`
  const deviceKey = `${'B'.repeat(42)}g`

  it('accepts only canonical unpadded 32-byte base64url values', () => {
    expect(validatePostCapability(capability)).toBe(true)
    expect(validatePostCapability(deviceKey)).toBe(true)
    expect(validatePostCapability('')).toBe(false)
    expect(validatePostCapability(capability.slice(0, -1))).toBe(false)
    expect(validatePostCapability(`${capability}=`)).toBe(false)
    expect(validatePostCapability(`${capability.slice(0, -1)}+`)).toBe(false)
    expect(validatePostCapability(`${'A'.repeat(42)}B`)).toBe(false)
  })

  it('hashes capabilities and fairness keys with separate purposes and no reflection', async () => {
    const capabilityHash = await hashPostCapability(capability)
    const repeatedHash = await hashPostCapability(capability)
    const deviceHash = await hashPostDeviceKey(capability)

    expect(capabilityHash).toMatch(/^[a-f0-9]{64}$/)
    expect(repeatedHash).toBe(capabilityHash)
    expect(deviceHash).toMatch(/^[a-f0-9]{64}$/)
    expect(deviceHash).not.toBe(capabilityHash)
    expect(capabilityHash).not.toContain(capability)
    expect(deviceHash).not.toContain(capability)
  })
})

describe('post rate policy', () => {
  it('centralizes the exact device and global upload/text policies', () => {
    expect(POST_RATE_LIMITS).toEqual({
      requestUploadByDevice: {
        kind: 'token bucket',
        rate: 10,
        period: 10 * 60 * 1_000,
        capacity: 4,
      },
      requestUploadGlobal: {
        kind: 'fixed window',
        rate: 300,
        period: 60 * 60 * 1_000,
      },
      submitTextByDevice: {
        kind: 'token bucket',
        rate: 20,
        period: 60 * 60 * 1_000,
        capacity: 5,
      },
      submitTextGlobal: {
        kind: 'fixed window',
        rate: 600,
        period: 60 * 60 * 1_000,
      },
    })
    expect(VALIDATION_RETRY_MS).toBe(15_000)
  })

  it('rounds retry milliseconds up to a positive whole second', () => {
    expect(toPostRetryAfterSeconds(Number.NaN)).toBe(1)
    expect(toPostRetryAfterSeconds(0)).toBe(1)
    expect(toPostRetryAfterSeconds(1)).toBe(1)
    expect(toPostRetryAfterSeconds(999)).toBe(1)
    expect(toPostRetryAfterSeconds(1_000)).toBe(1)
    expect(toPostRetryAfterSeconds(1_001)).toBe(2)
  })
})
