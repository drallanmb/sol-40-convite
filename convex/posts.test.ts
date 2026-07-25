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

describe('post and upload reservation schema', () => {
  it('accepts message, photo, and combined memories with every ownership index available', async () => {
    const t = makePostTest()

    const result = await t.run(async (ctx) => {
      const storageId = await ctx.storage.store(
        new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], {
          type: 'image/jpeg',
        }),
      )
      const reservationId = await ctx.db.insert('postUploadReservations', {
        tokenHash: 'capability-hash',
        deviceKeyHash: 'device-key-hash',
        state: 'processing',
        storageId,
        author: 'Pessoa com foto',
        message: 'Uma lembrança',
        expiresAt: 86_400_000,
        validationRequestedAt: 1_500,
        createdAt: 1_000,
      })
      const messageId = await ctx.db.insert('posts', {
        message: 'Recado sem foto',
        status: 'pendente',
        source: 'convidado',
        createdAt: 2_000,
      })
      const photoId = await ctx.db.insert('posts', {
        author: 'Pessoa com foto',
        storageId,
        mediaType: 'image/jpeg',
        mediaSize: 4,
        status: 'pendente',
        source: 'convidado',
        uploadReservationId: reservationId,
        createdAt: 3_000,
      })
      const bothId = await ctx.db.insert('posts', {
        author: 'Pessoa completa',
        message: 'Foto e recado',
        storageId,
        mediaType: 'image/jpeg',
        mediaSize: 4,
        status: 'aprovado',
        source: 'convidado',
        uploadReservationId: reservationId,
        createdAt: 4_000,
        moderatedAt: 4_500,
        approvedAt: 4_500,
      })
      await ctx.db.patch(reservationId, {
        state: 'accepted',
        postId: photoId,
      })

      const pending = await ctx.db
        .query('posts')
        .withIndex('by_status', (query) => query.eq('status', 'pendente'))
        .collect()
      const byStorage = await ctx.db
        .query('posts')
        .withIndex('by_storage_id', (query) => query.eq('storageId', storageId))
        .collect()
      const byReservation = await ctx.db
        .query('posts')
        .withIndex('by_upload_reservation', (query) =>
          query.eq('uploadReservationId', reservationId),
        )
        .collect()
      const reservationByStorage = await ctx.db
        .query('postUploadReservations')
        .withIndex('by_storage_id', (query) => query.eq('storageId', storageId))
        .collect()
      const reservationByExpiry = await ctx.db
        .query('postUploadReservations')
        .withIndex('by_expires_at', (query) => query.eq('expiresAt', 86_400_000))
        .collect()

      return {
        ids: [messageId, photoId, bothId],
        pending: pending.map((post) => post._id),
        byStorage: byStorage.map((post) => post._id),
        byReservation: byReservation.map((post) => post._id),
        reservationByStorage: reservationByStorage.map((reservation) => reservation._id),
        reservationByExpiry: reservationByExpiry.map((reservation) => reservation._id),
      }
    })

    expect(result.ids).toHaveLength(3)
    expect(result.pending).toEqual(expect.arrayContaining(result.ids.slice(0, 2)))
    expect(result.byStorage).toEqual(expect.arrayContaining(result.ids.slice(1)))
    expect(result.byReservation).toEqual(expect.arrayContaining(result.ids.slice(1)))
    expect(result.reservationByStorage).toHaveLength(1)
    expect(result.reservationByExpiry).toHaveLength(1)
  })

  it.each([
    ['status', { message: 'Memória', status: 'publicado', source: 'convidado', createdAt: 1 }],
    ['source', { message: 'Memória', status: 'pendente', source: 'instagram', createdAt: 1 }],
    [
      'media type',
      {
        message: 'Memória',
        mediaType: 'image/gif',
        status: 'pendente',
        source: 'convidado',
        createdAt: 1,
      },
    ],
  ])('rejects an invalid %s literal', async (_label, document) => {
    const t = makePostTest()

    await expect(
      t.run(async (ctx) => {
        await ctx.db.insert('posts', document as never)
      }),
    ).rejects.toThrow()
  })

  it('rejects invalid reservation state and malformed required ownership fields', async () => {
    const t = makePostTest()

    await expect(
      t.run(async (ctx) => {
        await ctx.db.insert('postUploadReservations', {
          tokenHash: 'capability-hash',
          deviceKeyHash: 'device-key-hash',
          state: 'uploaded',
          expiresAt: 1,
          createdAt: 1,
        } as never)
      }),
    ).rejects.toThrow()

    await expect(
      t.run(async (ctx) => {
        await ctx.db.insert('postUploadReservations', {
          state: 'awaiting_upload',
          expiresAt: 1,
          createdAt: 1,
        } as never)
      }),
    ).rejects.toThrow()
  })
})
