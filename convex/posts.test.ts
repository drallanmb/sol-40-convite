import rateLimiterTest from '@convex-dev/rate-limiter/test'
import { convexTest } from 'convex-test'
import { describe, expect, it, vi } from 'vitest'
import { api, components, internal } from './_generated/api'
import {
  AUTHOR_MAX_LENGTH,
  MAX_FINAL_IMAGE_BYTES,
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
import cronsSource from './crons.ts?raw'
import postInternalSource from './postInternal.ts?raw'
import postsSource from './posts.ts?raw'
import schemaSource from './schema.ts?raw'

const modules = import.meta.glob(['./**/*.*s', '!./**/*.test.*s'])

function makePostTest() {
  return makePostTestHarness({
    convexTest,
    modules,
    registerRateLimiter: (testInstance) => rateLimiterTest.register(testInstance),
  })
}

const postApi = (api as any).posts
const postInternalApi = (internal as any).postInternal

const DEVICE_KEY_A = `${'B'.repeat(42)}g`
const DEVICE_KEY_B = `${'C'.repeat(42)}w`

function deviceKeyFor(index: number) {
  const bytes = new Uint8Array(32)
  new DataView(bytes.buffer).setUint32(28, index)
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/u, '')
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
    expect(validatePostCapability(deviceKeyFor(1))).toBe(true)
    expect(validatePostCapability(deviceKeyFor(255))).toBe(true)
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

describe('public text memories', () => {
  it('creates exactly one pending plain-text post with normalized optional author', async () => {
    const t = makePostTest()

    const result = await t.mutation(postApi.submitTextMemory, {
      deviceKey: DEVICE_KEY_A,
      author: '  Allan  ',
      message: '  <strong>Uma memória</strong>  ',
    })
    const posts = await t.run((ctx) => ctx.db.query('posts').collect())

    expect(result).toEqual({ kind: 'submitted' })
    expect(posts).toHaveLength(1)
    expect(posts[0]).toMatchObject({
      author: 'Allan',
      message: '<strong>Uma memória</strong>',
      status: 'pendente',
      source: 'convidado',
    })
    expect(posts[0].storageId).toBeUndefined()
  })

  it('rejects invalid text without consuming a successful post write', async () => {
    const t = makePostTest()

    await expect(
      t.mutation(postApi.submitTextMemory, {
        deviceKey: DEVICE_KEY_A,
        message: '🌅'.repeat(281),
      }),
    ).resolves.toEqual({ kind: 'invalid_message' })
    await expect(
      t.mutation(postApi.submitTextMemory, {
        deviceKey: DEVICE_KEY_A,
        author: 'a'.repeat(61),
        message: 'Memória',
      }),
    ).resolves.toEqual({ kind: 'invalid_author' })

    const posts = await t.run((ctx) => ctx.db.query('posts').collect())
    expect(posts).toHaveLength(0)
  })

  it('enforces the device text burst boundary with a positive whole retry', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-25T00:00:00.000Z'))
    const t = makePostTest()

    const attempts = await Promise.all(
      Array.from({ length: 6 }, (_, index) =>
        t.mutation(postApi.submitTextMemory, {
          deviceKey: DEVICE_KEY_A,
          message: `Memória ${index + 1}`,
        }),
      ),
    )

    expect(attempts.slice(0, 5)).toEqual(
      Array.from({ length: 5 }, () => ({ kind: 'submitted' })),
    )
    expect(attempts[5]).toMatchObject({ kind: 'rate_limited' })
    expect((attempts[5] as { retryAfterSeconds: number }).retryAfterSeconds).toBeGreaterThan(0)
    expect(Number.isInteger((attempts[5] as { retryAfterSeconds: number }).retryAfterSeconds)).toBe(true)

    const posts = await t.run((ctx) => ctx.db.query('posts').collect())
    expect(posts).toHaveLength(5)
    vi.useRealTimers()
  })

  it('refills the device bucket and has no lifetime submission cap', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-25T00:00:00.000Z'))
    const t = makePostTest()

    for (let index = 0; index < 5; index += 1) {
      await expect(
        t.mutation(postApi.submitTextMemory, {
          deviceKey: DEVICE_KEY_B,
          message: `Primeira janela ${index + 1}`,
        }),
      ).resolves.toEqual({ kind: 'submitted' })
    }

    vi.advanceTimersByTime(60 * 60 * 1_000)

    await expect(
      t.mutation(postApi.submitTextMemory, {
        deviceKey: DEVICE_KEY_B,
        message: 'Depois do refill',
      }),
    ).resolves.toEqual({ kind: 'submitted' })
    vi.useRealTimers()
  })

  it('enforces the global text boundary without partially consuming a denied device bucket', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-25T00:00:00.000Z'))
    const t = makePostTest()

    for (let index = 1; index <= 600; index += 1) {
      await expect(
        t.mutation(postApi.submitTextMemory, {
          deviceKey: deviceKeyFor(index),
          message: `Global ${index}`,
        }),
      ).resolves.toEqual({ kind: 'submitted' })
    }

    const denied = await t.mutation(postApi.submitTextMemory, {
      deviceKey: deviceKeyFor(601),
      message: 'Global 601',
    })
    expect(denied).toMatchObject({ kind: 'rate_limited' })
    expect((denied as { retryAfterSeconds: number }).retryAfterSeconds).toBeGreaterThan(0)
    expect((denied as { retryAfterSeconds: number }).retryAfterSeconds).toBeLessThanOrEqual(3_600)

    vi.advanceTimersByTime(60 * 60 * 1_000)
    await expect(
      t.mutation(postApi.submitTextMemory, {
        deviceKey: deviceKeyFor(601),
        message: 'Global após reset',
      }),
    ).resolves.toEqual({ kind: 'submitted' })
    vi.useRealTimers()
  })
})

describe('approved public projection', () => {
  it('returns only approved purpose-built views and applies the anonymous fallback', async () => {
    const t = makePostTest()
    const fixture = await t.run(async (ctx) => {
      const approvedStorageId = await ctx.storage.store(
        new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], {
          type: 'image/jpeg',
        }),
      )
      const hiddenStorageId = await ctx.storage.store(
        new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], {
          type: 'image/jpeg',
        }),
      )
      const approvedId = await ctx.db.insert('posts', {
        message: 'Aprovada',
        storageId: approvedStorageId,
        mediaType: 'image/jpeg',
        mediaSize: 4,
        status: 'aprovado',
        source: 'convidado',
        createdAt: 3,
        approvedAt: 4,
      })
      await ctx.db.insert('posts', {
        author: 'Pendente',
        message: 'Não pode aparecer',
        status: 'pendente',
        source: 'convidado',
        createdAt: 2,
      })
      await ctx.db.insert('posts', {
        author: 'Oculta',
        storageId: hiddenStorageId,
        mediaType: 'image/jpeg',
        mediaSize: 4,
        status: 'oculto',
        source: 'convidado',
        createdAt: 1,
      })
      return { approvedId }
    })

    const result = await t.query(postApi.listApproved, {})

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      id: fixture.approvedId,
      author: 'De alguém que te ama',
      message: 'Aprovada',
      imageUrl: expect.stringMatching(/^https?:\/\//u),
      createdAt: 3,
    })
    expect(Object.keys(result[0]).sort()).toEqual(
      ['author', 'createdAt', 'id', 'imageUrl', 'message'].sort(),
    )
  })
})

describe('photo upload reservation and validation', () => {
  async function reserve(
    t: ReturnType<typeof makePostTest>,
    {
      deviceKey = DEVICE_KEY_A,
      token = deviceKeyFor(10_001),
    }: { deviceKey?: string; token?: string } = {},
  ) {
    const result = await t.mutation(postApi.requestUpload, {
      deviceKey,
      token,
    })
    expect(result).toMatchObject({ kind: 'reserved' })
    return result as {
      kind: 'reserved'
      reservationId: string
      uploadUrl: string
    }
  }

  async function runImmediateScheduled(t: ReturnType<typeof makePostTest>) {
    vi.advanceTimersByTime(0)
    await t.finishInProgressScheduledFunctions()
  }

  async function storeUpload(
    t: ReturnType<typeof makePostTest>,
    bytes: Uint8Array,
    mime: string,
  ) {
    return t.run(async (ctx) => {
      const storageId = await ctx.storage.store(
        new Blob([Uint8Array.from(bytes).buffer], { type: mime }),
      )
      // convex-test omits the upload Content-Type from its `_storage` mock.
      // Patch the system fixture so metadata behavior matches the real backend.
      await ctx.db.patch(
        storageId as never,
        { contentType: mime } as never,
      )
      return storageId
    })
  }

  it('rate-limits before creating a fifth reservation or upload URL', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-25T01:00:00.000Z'))
    const t = makePostTest()

    const results: Array<{ kind: string; retryAfterSeconds?: number }> = []
    for (let index = 0; index < 5; index += 1) {
      results.push(
        await t.mutation(postApi.requestUpload, {
          deviceKey: DEVICE_KEY_A,
          token: deviceKeyFor(20_000 + index),
        }),
      )
    }

    expect(results.slice(0, 4).every((result) => result.kind === 'reserved')).toBe(true)
    expect(results[4]).toMatchObject({ kind: 'rate_limited' })
    expect(results[4]).not.toHaveProperty('uploadUrl')
    const reservations = await t.run((ctx) =>
      ctx.db.query('postUploadReservations').collect(),
    )
    expect(reservations).toHaveLength(4)
    vi.useRealTimers()
  })

  it('enforces the global upload boundary before reservation and URL generation', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-25T01:00:00.000Z'))
    const t = makePostTest()

    for (let index = 1; index <= 300; index += 1) {
      await expect(
        t.mutation(postApi.requestUpload, {
          deviceKey: deviceKeyFor(90_000 + index),
          token: deviceKeyFor(100_000 + index),
        }),
      ).resolves.toMatchObject({ kind: 'reserved' })
    }
    const denied = await t.mutation(postApi.requestUpload, {
      deviceKey: deviceKeyFor(90_301),
      token: deviceKeyFor(100_301),
    })
    const reservations = await t.run((ctx) =>
      ctx.db.query('postUploadReservations').collect(),
    )

    expect(denied).toMatchObject({ kind: 'rate_limited' })
    expect(denied).not.toHaveProperty('uploadUrl')
    expect(reservations).toHaveLength(300)
    vi.useRealTimers()
  })

  it('hashes reservation secrets and rejects capability collisions without rebinding', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-25T01:00:00.000Z'))
    const t = makePostTest()
    const token = deviceKeyFor(30_000)

    const first = await reserve(t, { token })
    const second = await t.mutation(postApi.requestUpload, {
      deviceKey: DEVICE_KEY_B,
      token,
    })
    const reservations = await t.run((ctx) =>
      ctx.db.query('postUploadReservations').collect(),
    )

    expect(second).toEqual({ kind: 'token_conflict' })
    expect(reservations).toHaveLength(1)
    expect(reservations[0]).toMatchObject({
      _id: first.reservationId,
      state: 'awaiting_upload',
    })
    expect(reservations[0].tokenHash).not.toContain(token)
    expect(reservations[0].deviceKeyHash).not.toContain(DEVICE_KEY_A)
    vi.useRealTimers()
  })

  it('uses an indexed bounded collision lookup with a large historical reservation set', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-25T01:00:00.000Z'))
    const t = makePostTest()
    const collidingToken = deviceKeyFor(130_000)
    const collidingHash = await hashPostCapability(collidingToken)

    await t.run(async (ctx) => {
      for (let index = 0; index < 1_000; index += 1) {
        await ctx.db.insert('postUploadReservations', {
          tokenHash: index === 999 ? collidingHash : `historical-${index}`,
          deviceKeyHash: `historical-device-${index}`,
          state: index % 2 === 0 ? 'accepted' : 'expired',
          expiresAt: 1,
          createdAt: index + 1,
        })
      }
    })

    for (let index = 0; index < 4; index += 1) {
      await expect(
        t.mutation(postApi.requestUpload, {
          deviceKey: DEVICE_KEY_A,
          token: deviceKeyFor(131_000 + index),
        }),
      ).resolves.toMatchObject({ kind: 'reserved' })
    }

    await expect(
      t.mutation(postApi.requestUpload, {
        deviceKey: DEVICE_KEY_A,
        token: collidingToken,
      }),
    ).resolves.toEqual({ kind: 'token_conflict' })

    const denied = await t.mutation(postApi.requestUpload, {
      deviceKey: DEVICE_KEY_A,
      token: deviceKeyFor(132_000),
    })
    const rows = await t.run((ctx) =>
      ctx.db.query('postUploadReservations').collect(),
    )

    expect(denied).toMatchObject({ kind: 'rate_limited' })
    expect(denied).not.toHaveProperty('uploadUrl')
    expect(rows).toHaveLength(1_004)
    expect(schemaSource).toContain(".index('by_token_hash', ['tokenHash'])")
    expect(postsSource).toMatch(
      /query\('postUploadReservations'\)\s*\.withIndex\('by_token_hash'/u,
    )
    expect(postsSource).not.toMatch(
      /query\('postUploadReservations'\)[\s\S]{0,240}\.filter\([\s\S]{0,160}tokenHash/u,
    )
    vi.useRealTimers()
  })

  it.each([
    ['jpeg', 'image/jpeg', new Uint8Array([0xff, 0xd8, 0xff, 0xe0])],
    [
      'png',
      'image/png',
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ],
    [
      'webp',
      'image/webp',
      new Uint8Array([
        0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
      ]),
    ],
  ])('accepts real %s bytes into exactly one pending post', async (_label, mime, bytes) => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-25T01:00:00.000Z'))
    const t = makePostTest()
    const token = deviceKeyFor(bytes[0] + 40_000)
    const reservation = await reserve(t, { token })
    const storageId = await storeUpload(t, bytes, mime)

    const claim = await t.mutation(postApi.submitPhotoMemory, {
      reservationId: reservation.reservationId,
      token,
      storageId,
      author: '  Sol  ',
      message: '  Foto e recado  ',
    })
    expect(claim).toEqual({ kind: 'processing' })

    await runImmediateScheduled(t)

    const status = await t.query(postApi.getSubmissionStatus, {
      reservationId: reservation.reservationId,
      token,
    })
    const snapshot = await t.run(async (ctx) => ({
      posts: await ctx.db.query('posts').collect(),
      reservation: await ctx.db.get(reservation.reservationId as never),
    }))
    expect(status).toEqual({ kind: 'accepted' })
    expect(snapshot.posts).toHaveLength(1)
    expect(snapshot.posts[0]).toMatchObject({
      author: 'Sol',
      message: 'Foto e recado',
      storageId,
      mediaType: mime,
      mediaSize: bytes.byteLength,
      status: 'pendente',
      source: 'convidado',
    })
    expect(snapshot.reservation).toMatchObject({ state: 'accepted' })
    vi.useRealTimers()
  })

  it.each([
    ['html', 'text/html', new TextEncoder().encode('<script>alert(1)</script>'), 'unsupported_metadata'],
    ['spoofed jpeg', 'image/jpeg', new TextEncoder().encode('<script>'), 'unsupported_type'],
    [
      'raw heic',
      'image/heic',
      new Uint8Array([0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63]),
      'unsupported_metadata',
    ],
  ])('rejects and deletes invalid %s storage with a stable safe code', async (_label, mime, bytes, code) => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-25T01:00:00.000Z'))
    const t = makePostTest()
    const token = deviceKeyFor(bytes[0] + bytes.byteLength + 50_000)
    const reservation = await reserve(t, { token })
    const storageId = await storeUpload(t, bytes, mime)

    const claim = await t.mutation(postApi.submitPhotoMemory, {
      reservationId: reservation.reservationId,
      token,
      storageId,
    })
    if (claim.kind === 'processing') {
      await runImmediateScheduled(t)
    }

    const status = await t.query(postApi.getSubmissionStatus, {
      reservationId: reservation.reservationId,
      token,
    })
    const snapshot = await t.run(async (ctx) => ({
      blob: await ctx.storage.get(storageId),
      posts: await ctx.db.query('posts').collect(),
    }))
    expect(status).toEqual({ kind: 'rejected', code })
    expect(snapshot.blob).toBeNull()
    expect(snapshot.posts).toHaveLength(0)
    expect(status).not.toHaveProperty('storageId')
    expect(status).not.toHaveProperty('tokenHash')
    expect(status).not.toHaveProperty('postId')
    vi.useRealTimers()
  })

  it('rejects missing and oversized metadata before scheduling byte validation', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-25T01:00:00.000Z'))
    const t = makePostTest()
    const missingToken = deviceKeyFor(60_000)
    const oversizedToken = deviceKeyFor(60_001)
    const missingReservation = await reserve(t, { token: missingToken })
    const oversizedReservation = await reserve(t, { token: oversizedToken })
    const missingStorageId = await t.run(async (ctx) => {
      const id = await ctx.storage.store(
        new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' }),
      )
      await ctx.storage.delete(id)
      return id
    })
    const oversizedStorageId = await storeUpload(
      t,
      new Uint8Array(MAX_FINAL_IMAGE_BYTES + 1),
      'image/jpeg',
    )

    await expect(
      t.mutation(postApi.submitPhotoMemory, {
        reservationId: missingReservation.reservationId,
        token: missingToken,
        storageId: missingStorageId,
      }),
    ).resolves.toEqual({ kind: 'rejected', code: 'missing_storage' })
    await expect(
      t.mutation(postApi.submitPhotoMemory, {
        reservationId: oversizedReservation.reservationId,
        token: oversizedToken,
        storageId: oversizedStorageId,
      }),
    ).resolves.toEqual({ kind: 'rejected', code: 'too_large' })
    await expect(
      t.run((ctx) => ctx.storage.get(oversizedStorageId)),
    ).resolves.toBeNull()
    vi.useRealTimers()
  })

  it('accepts metadata and real JPEG bytes exactly at the 5 MiB boundary', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-25T01:00:00.000Z'))
    const t = makePostTest()
    const token = deviceKeyFor(65_000)
    const reservation = await reserve(t, { token })
    const exactBytes = new Uint8Array(MAX_FINAL_IMAGE_BYTES)
    exactBytes.set([0xff, 0xd8, 0xff, 0xe0])
    const storageId = await storeUpload(t, exactBytes, 'image/jpeg')

    await expect(
      t.mutation(postApi.submitPhotoMemory, {
        reservationId: reservation.reservationId,
        token,
        storageId,
      }),
    ).resolves.toEqual({ kind: 'processing' })
    await runImmediateScheduled(t)
    await expect(
      t.query(postApi.getSubmissionStatus, {
        reservationId: reservation.reservationId,
        token,
      }),
    ).resolves.toEqual({ kind: 'accepted' })
    vi.useRealTimers()
  })

  it('prevents a different storage ID from stealing a processing reservation', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-25T01:00:00.000Z'))
    const t = makePostTest()
    const token = deviceKeyFor(66_000)
    const reservation = await reserve(t, { token })
    const firstStorageId = await storeUpload(
      t,
      new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
      'image/jpeg',
    )
    const otherStorageId = await storeUpload(
      t,
      new Uint8Array([0xff, 0xd8, 0xff, 0xe1]),
      'image/jpeg',
    )

    await expect(
      t.mutation(postApi.submitPhotoMemory, {
        reservationId: reservation.reservationId,
        token,
        storageId: firstStorageId,
      }),
    ).resolves.toEqual({ kind: 'processing' })
    await expect(
      t.mutation(postApi.submitPhotoMemory, {
        reservationId: reservation.reservationId,
        token,
        storageId: otherStorageId,
      }),
    ).resolves.toEqual({ kind: 'storage_conflict' })
    await expect(
      t.run(async (ctx) => (await ctx.storage.get(otherStorageId)) !== null),
    ).resolves.toBe(true)
    vi.useRealTimers()
  })

  it.each([
    [VALIDATION_RETRY_MS - 1, false],
    [VALIDATION_RETRY_MS, true],
    [VALIDATION_RETRY_MS + 1, true],
  ])('requeues stuck processing only at the cooldown boundary (%i ms)', async (elapsed, shouldRequeue) => {
    vi.useFakeTimers()
    const base = new Date('2026-07-25T01:00:00.000Z').getTime()
    vi.setSystemTime(base + elapsed)
    const t = makePostTest()
    const token = deviceKeyFor(67_000 + elapsed)
    const tokenHash = await hashPostCapability(token)
    const storageId = await storeUpload(
      t,
      new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
      'image/jpeg',
    )
    const reservationId = await t.run((ctx) =>
      ctx.db.insert('postUploadReservations', {
        tokenHash,
        deviceKeyHash: 'fairness-hash',
        state: 'processing',
        storageId,
        expiresAt: base + 24 * 60 * 60 * 1_000,
        validationRequestedAt: base,
        createdAt: base - 1_000,
      }),
    )

    await expect(
      t.mutation(postApi.submitPhotoMemory, {
        reservationId,
        token,
        storageId,
      }),
    ).resolves.toEqual({ kind: 'processing' })
    const updated = await t.run((ctx) => ctx.db.get(reservationId))
    expect(updated?.validationRequestedAt).toBe(
      shouldRequeue ? base + elapsed : base,
    )
    vi.useRealTimers()
  })

  it('makes duplicate claim and finalization converge to the same accepted post', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-25T01:00:00.000Z'))
    const t = makePostTest()
    const token = deviceKeyFor(70_000)
    const reservation = await reserve(t, { token })
    const storageId = await storeUpload(
      t,
      new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
      'image/jpeg',
    )
    const command = {
      reservationId: reservation.reservationId,
      token,
      storageId,
      message: 'Uma só memória',
    }

    const [first, second] = await Promise.all([
      t.mutation(postApi.submitPhotoMemory, command),
      t.mutation(postApi.submitPhotoMemory, command),
    ])
    expect(first).toEqual({ kind: 'processing' })
    expect(second).toEqual({ kind: 'processing' })

    await runImmediateScheduled(t)
    const accepted = await t.mutation(postInternalApi.acceptPhoto, {
      reservationId: reservation.reservationId,
      storageId,
      mediaType: 'image/jpeg',
      mediaSize: 4,
    })
    const repeated = await t.mutation(postInternalApi.acceptPhoto, {
      reservationId: reservation.reservationId,
      storageId,
      mediaType: 'image/jpeg',
      mediaSize: 4,
    })
    const posts = await t.run((ctx) => ctx.db.query('posts').collect())

    expect(accepted).toEqual(repeated)
    expect(accepted).toMatchObject({ kind: 'accepted' })
    expect(posts).toHaveLength(1)
    vi.useRealTimers()
  })

  it('does not reveal submission state to a different capability', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-25T01:00:00.000Z'))
    const t = makePostTest()
    const token = deviceKeyFor(80_000)
    const reservation = await reserve(t, { token })

    await expect(
      t.query(postApi.getSubmissionStatus, {
        reservationId: reservation.reservationId,
        token: deviceKeyFor(80_001),
      }),
    ).resolves.toEqual({ kind: 'invalid_capability' })
    await expect(
      t.query(postApi.getSubmissionStatus, {
        reservationId: reservation.reservationId,
        token,
      }),
    ).resolves.toEqual({ kind: 'awaiting_upload' })
    vi.useRealTimers()
  })
})

describe('post storage expiry and orphan cleanup', () => {
  async function storageExists(
    t: ReturnType<typeof makePostTest>,
    storageId: string,
  ) {
    return t.run(async (ctx) =>
      (await ctx.storage.get(storageId as never)) !== null,
    )
  }

  it.each([
    [-1, 'active', true],
    [0, 'expired', false],
    [1, 'expired', false],
  ])('expires a processing reservation at the exact 24-hour boundary (%i ms)', async (offset, expectedKind, shouldExist) => {
    vi.useFakeTimers()
    const expiresAt = new Date('2026-07-26T01:00:00.000Z').getTime()
    vi.setSystemTime(expiresAt + offset)
    const t = makePostTest()
    const storageId = await t.run((ctx) =>
      ctx.storage.store(
        new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], {
          type: 'image/jpeg',
        }),
      ),
    )
    const reservationId = await t.run((ctx) =>
      ctx.db.insert('postUploadReservations', {
        tokenHash: 'token-hash',
        deviceKeyHash: 'device-hash',
        state: 'processing',
        storageId,
        expiresAt,
        validationRequestedAt: expiresAt - 1_000,
        createdAt: expiresAt - 24 * 60 * 60 * 1_000,
      }),
    )

    await expect(
      t.mutation(postInternalApi.expireReservation, { reservationId }),
    ).resolves.toMatchObject({ kind: expectedKind })
    await expect(storageExists(t, storageId)).resolves.toBe(shouldExist)
    if (offset >= 0) {
      await expect(
        t.mutation(postInternalApi.expireReservation, { reservationId }),
      ).resolves.toMatchObject({ kind: 'expired' })
    }
    vi.useRealTimers()
  })

  it('preserves accepted post storage during repeated reservation expiry', async () => {
    vi.useFakeTimers()
    const now = new Date('2026-07-27T01:00:00.000Z').getTime()
    vi.setSystemTime(now)
    const t = makePostTest()
    const storageId = await t.run((ctx) =>
      ctx.storage.store(
        new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], {
          type: 'image/jpeg',
        }),
      ),
    )
    const reservationId = await t.run((ctx) =>
      ctx.db.insert('postUploadReservations', {
        tokenHash: 'token-hash',
        deviceKeyHash: 'device-hash',
        state: 'processing',
        storageId,
        expiresAt: now - 1,
        validationRequestedAt: now - 2,
        createdAt: now - 24 * 60 * 60 * 1_000,
      }),
    )
    const postId = await t.run((ctx) =>
      ctx.db.insert('posts', {
        storageId,
        mediaType: 'image/jpeg',
        mediaSize: 4,
        status: 'pendente',
        source: 'convidado',
        uploadReservationId: reservationId,
        createdAt: now - 1,
      }),
    )
    await t.run((ctx) =>
      ctx.db.patch(reservationId, { state: 'accepted', postId }),
    )

    await expect(
      t.mutation(postInternalApi.expireReservation, { reservationId }),
    ).resolves.toEqual({ kind: 'owned' })
    await expect(storageExists(t, storageId)).resolves.toBe(true)
    vi.useRealTimers()
  })

  it('recovers cleanup for rejected or already-expired reservations idempotently', async () => {
    vi.useFakeTimers()
    const now = new Date('2026-07-27T01:00:00.000Z').getTime()
    vi.setSystemTime(now)
    const t = makePostTest()

    for (const [index, state] of ['rejected', 'expired'].entries()) {
      const storageId = await t.run((ctx) =>
        ctx.storage.store(new Blob([`terminal-${state}`])),
      )
      const reservationId = await t.run((ctx) =>
        ctx.db.insert('postUploadReservations', {
          tokenHash: `token-${index}`,
          deviceKeyHash: `device-${index}`,
          state: state as 'rejected' | 'expired',
          storageId,
          ...(state === 'rejected'
            ? { errorCode: 'unsupported_type' }
            : {}),
          expiresAt: now - 1,
          createdAt: now - 24 * 60 * 60 * 1_000,
        }),
      )

      await expect(
        t.mutation(postInternalApi.expireReservation, { reservationId }),
      ).resolves.toEqual({ kind: 'expired' })
      await expect(storageExists(t, storageId)).resolves.toBe(false)
      await expect(
        t.mutation(postInternalApi.expireReservation, { reservationId }),
      ).resolves.toEqual({ kind: 'expired' })
    }
    vi.useRealTimers()
  })

  it('retires old terminal reservations in bounded pages while preserving accepted post media', async () => {
    vi.useFakeTimers()
    const now = new Date('2026-08-10T01:00:00.000Z').getTime()
    const oldTerminalAt = now - 8 * 24 * 60 * 60 * 1_000
    vi.setSystemTime(now)
    const t = makePostTest()
    const acceptedStorageId = await t.run((ctx) =>
      ctx.storage.store(new Blob(['accepted-owned'])),
    )
    const rejectedStorageId = await t.run((ctx) =>
      ctx.storage.store(new Blob(['rejected-orphan'])),
    )
    const fixture = await t.run(async (ctx) => {
      const acceptedReservationId = await ctx.db.insert(
        'postUploadReservations',
        {
          tokenHash: 'retention-accepted',
          deviceKeyHash: 'retention-device-accepted',
          state: 'accepted',
          storageId: acceptedStorageId,
          expiresAt: oldTerminalAt,
          terminalAt: oldTerminalAt,
          createdAt: oldTerminalAt - 1,
        },
      )
      const postId = await ctx.db.insert('posts', {
        storageId: acceptedStorageId,
        mediaType: 'image/jpeg',
        mediaSize: 14,
        status: 'pendente',
        source: 'convidado',
        uploadReservationId: acceptedReservationId,
        createdAt: oldTerminalAt,
      })
      await ctx.db.patch(acceptedReservationId, { postId })

      const rejectedReservationId = await ctx.db.insert(
        'postUploadReservations',
        {
          tokenHash: 'retention-rejected',
          deviceKeyHash: 'retention-device-rejected',
          state: 'rejected',
          storageId: rejectedStorageId,
          errorCode: 'unsupported_type',
          expiresAt: oldTerminalAt,
          terminalAt: oldTerminalAt,
          createdAt: oldTerminalAt - 1,
        },
      )

      const pageIds = []
      for (let index = 0; index < 51; index += 1) {
        pageIds.push(
          await ctx.db.insert('postUploadReservations', {
            tokenHash: `retention-page-${index}`,
            deviceKeyHash: `retention-page-device-${index}`,
            state: 'expired',
            expiresAt: oldTerminalAt,
            terminalAt: oldTerminalAt,
            createdAt: oldTerminalAt - index - 2,
          }),
        )
      }
      return {
        acceptedReservationId,
        rejectedReservationId,
        pageIds,
      }
    })

    const first = await t.mutation(
      postInternalApi.retireTerminalReservations,
      {},
    )
    expect(first).toMatchObject({ scanned: 50, done: false })
    await t.finishInProgressScheduledFunctions()

    const snapshot = await t.run(async (ctx) => ({
      acceptedReservation: await ctx.db.get(fixture.acceptedReservationId),
      rejectedReservation: await ctx.db.get(fixture.rejectedReservationId),
      remainingPageRows: (
        await Promise.all(fixture.pageIds.map((id) => ctx.db.get(id)))
      ).filter(Boolean),
      acceptedBlob: await ctx.storage.get(acceptedStorageId),
      rejectedBlob: await ctx.storage.get(rejectedStorageId),
      posts: await ctx.db.query('posts').collect(),
    }))

    expect(snapshot.acceptedReservation).toBeNull()
    expect(snapshot.rejectedReservation).toBeNull()
    expect(snapshot.remainingPageRows).toHaveLength(0)
    expect(snapshot.acceptedBlob).not.toBeNull()
    expect(snapshot.rejectedBlob).toBeNull()
    expect(snapshot.posts).toHaveLength(1)
    await expect(
      t.mutation(postInternalApi.retireTerminalReservations, {}),
    ).resolves.toMatchObject({ scanned: 0, deleted: 0, done: true })
    expect(postInternalSource).toContain('TERMINAL_RESERVATION_RETENTION_MS')
    expect(postInternalSource).toContain('TERMINAL_RESERVATION_PAGE_SIZE')
    expect(cronsSource).toContain('daily terminal reservation retirement')
    vi.useRealTimers()
  })

  it('handles terminal retention cutoffs and legacy terminal rows without losing them forever', async () => {
    vi.useFakeTimers()
    const now = new Date('2026-08-10T01:00:00.000Z').getTime()
    const retention = 7 * 24 * 60 * 60 * 1_000
    vi.setSystemTime(now)
    const t = makePostTest()
    const ids = await t.run(async (ctx) => ({
      before: await ctx.db.insert('postUploadReservations', {
        tokenHash: 'cutoff-before',
        deviceKeyHash: 'cutoff-device-before',
        state: 'expired',
        expiresAt: now - retention - 1,
        terminalAt: now - retention - 1,
        createdAt: 1,
      }),
      exact: await ctx.db.insert('postUploadReservations', {
        tokenHash: 'cutoff-exact',
        deviceKeyHash: 'cutoff-device-exact',
        state: 'expired',
        expiresAt: now - retention,
        terminalAt: now - retention,
        createdAt: 1,
      }),
      after: await ctx.db.insert('postUploadReservations', {
        tokenHash: 'cutoff-after',
        deviceKeyHash: 'cutoff-device-after',
        state: 'expired',
        expiresAt: now - retention + 1,
        terminalAt: now - retention + 1,
        createdAt: 1,
      }),
      legacy: await ctx.db.insert('postUploadReservations', {
        tokenHash: 'legacy-terminal',
        deviceKeyHash: 'legacy-device',
        state: 'expired',
        expiresAt: now - retention - 2,
        createdAt: 1,
      }),
    }))

    await t.mutation(postInternalApi.retireTerminalReservations, {})
    await t.finishInProgressScheduledFunctions()

    const first = await t.run(async (ctx) => ({
      before: await ctx.db.get(ids.before),
      exact: await ctx.db.get(ids.exact),
      after: await ctx.db.get(ids.after),
      legacy: await ctx.db.get(ids.legacy),
    }))
    expect(first.before).toBeNull()
    expect(first.exact).not.toBeNull()
    expect(first.after).not.toBeNull()
    expect(first.legacy).toMatchObject({
      terminalAt: now - retention - 2,
    })

    await t.mutation(postInternalApi.retireTerminalReservations, {})
    const second = await t.run((ctx) => ctx.db.get(ids.legacy))
    expect(second).toBeNull()
    vi.useRealTimers()
  })

  it('deletes only old unowned storage and preserves young, post-owned, and reservation-owned blobs', async () => {
    vi.useFakeTimers()
    const now = new Date('2026-07-27T01:00:00.000Z').getTime()
    const oldTime = now - 24 * 60 * 60 * 1_000
    vi.setSystemTime(oldTime - 1)
    const t = makePostTest()
    const oldOrphan = await t.run((ctx) =>
      ctx.storage.store(new Blob(['old orphan'])),
    )
    const postOwned = await t.run((ctx) =>
      ctx.storage.store(new Blob(['post owner'])),
    )
    const reservationOwned = await t.run((ctx) =>
      ctx.storage.store(new Blob(['reservation owner'])),
    )
    vi.setSystemTime(oldTime)
    const exactBoundary = await t.run((ctx) =>
      ctx.storage.store(new Blob(['exact boundary'])),
    )
    vi.setSystemTime(now)
    const youngOrphan = await t.run((ctx) =>
      ctx.storage.store(new Blob(['young orphan'])),
    )
    await t.run(async (ctx) => {
      await ctx.db.insert('posts', {
        storageId: postOwned,
        mediaType: 'image/jpeg',
        mediaSize: 10,
        status: 'pendente',
        source: 'convidado',
        createdAt: now,
      })
      await ctx.db.insert('postUploadReservations', {
        tokenHash: 'token-hash',
        deviceKeyHash: 'device-hash',
        state: 'processing',
        storageId: reservationOwned,
        expiresAt: now + 1,
        createdAt: now,
      })
    })

    const result = await t.mutation(postInternalApi.sweepOrphanStorage, {})

    expect(result).toMatchObject({ deleted: 1 })
    await expect(storageExists(t, oldOrphan)).resolves.toBe(false)
    await expect(storageExists(t, exactBoundary)).resolves.toBe(true)
    await expect(storageExists(t, youngOrphan)).resolves.toBe(true)
    await expect(storageExists(t, postOwned)).resolves.toBe(true)
    await expect(storageExists(t, reservationOwned)).resolves.toBe(true)
    vi.useRealTimers()
  })

  it('paginates orphan cleanup and remains idempotent across repeated sweeps', async () => {
    vi.useFakeTimers()
    const now = new Date('2026-07-27T01:00:00.000Z').getTime()
    vi.setSystemTime(now - 24 * 60 * 60 * 1_000 - 1)
    const t = makePostTest()
    const storageIds = []
    for (let index = 0; index < 55; index += 1) {
      storageIds.push(
        await t.run((ctx) =>
          ctx.storage.store(new Blob([`orphan-${index}`])),
        ),
      )
    }
    vi.setSystemTime(now)

    await expect(
      t.mutation(postInternalApi.sweepOrphanStorage, {}),
    ).resolves.toMatchObject({ deleted: 50, done: false })
    vi.advanceTimersByTime(0)
    await t.finishInProgressScheduledFunctions()

    const remaining = await Promise.all(
      storageIds.map((storageId) => storageExists(t, storageId)),
    )
    expect(remaining.filter(Boolean)).toHaveLength(0)
    await expect(
      t.mutation(postInternalApi.sweepOrphanStorage, {}),
    ).resolves.toMatchObject({ deleted: 0, done: true })
    vi.useRealTimers()
  })
})

describe('post public surface', () => {
  it('exports exactly the five planned anonymous functions and no cleanup or moderation primitive', () => {
    const exports = [...postsSource.matchAll(/^export const (\w+)/gmu)]
      .map((match) => match[1])
      .sort()

    expect(exports).toEqual([
      'getSubmissionStatus',
      'listApproved',
      'requestUpload',
      'submitPhotoMemory',
      'submitTextMemory',
    ])
    expect(postsSource).not.toMatch(
      /export const (approve|hide|listPending|listHidden|sweep|cleanup)/u,
    )
  })
})
