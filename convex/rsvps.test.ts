import rateLimiterTest from '@convex-dev/rate-limiter/test'
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { generateRsvpCapability } from '../src/lib/rsvpSession'
import { api, components, internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import {
  expireRsvpSessionRecord,
  insertInvitation,
} from './rsvpInternal'
import { RSVP_SESSION_TTL_MS } from './rsvpModel'
import { RSVP_RATE_LIMITS, rsvpRateLimiter } from './rsvpRateLimits'
import {
  createRsvpSession,
  encodeOpaqueToken,
  hashLimiterKey,
  hashOpaqueToken,
  isSessionActive,
  normalizeRsvpGeneration,
  resolveActiveRsvpSession,
  toRetryAfterSeconds,
  validateOpaqueToken,
} from './rsvpSecurity'
import { makeRsvpTest as makeRsvpTestHarness } from './rsvpTest'

declare const process: {
  env: Record<string, string | undefined>
}

const modules = import.meta.glob(['./**/*.*s', '!./**/*.test.*s'])

function makeRsvpTest() {
  return makeRsvpTestHarness({
    convexTest,
    modules,
    registerRateLimiter: (testInstance) => rateLimiterTest.register(testInstance),
  })
}

const DEMO_FLAG = 'development-only'
const DEMO_SEED = 'convex-rsvp-test-seed-with-at-least-thirty-two-bytes'

const previousDemoFlag = process.env.RSVP_ENABLE_DEMO_FIXTURES
const previousDemoSeed = process.env.RSVP_DEMO_SEED

beforeEach(() => {
  process.env.RSVP_ENABLE_DEMO_FIXTURES = DEMO_FLAG
  process.env.RSVP_DEMO_SEED = DEMO_SEED
})

afterEach(() => {
  vi.useRealTimers()

  if (previousDemoFlag === undefined) {
    delete process.env.RSVP_ENABLE_DEMO_FIXTURES
  } else {
    process.env.RSVP_ENABLE_DEMO_FIXTURES = previousDemoFlag
  }

  if (previousDemoSeed === undefined) {
    delete process.env.RSVP_DEMO_SEED
  } else {
    process.env.RSVP_DEMO_SEED = previousDemoSeed
  }
})

describe('schema RSVP', () => {
  it('accepts valid family, guest and session documents', async () => {
    const t = makeRsvpTest()

    const documents = await t.run(async (ctx) => {
      const rsvpId = await ctx.db.insert('rsvps', {
        phone: '79999999999',
        displayName: 'Convite de Teste',
        contact: 'teste@example.com',
        updatedAt: 1_000,
      })
      const guestId = await ctx.db.insert('rsvpGuests', {
        rsvpId,
        publicRef: 'guest_opaque_test_reference',
        name: 'Pessoa de Teste',
        attendance: 'pending',
        sortOrder: 0,
      })
      const sessionId = await ctx.db.insert('rsvpSessions', {
        tokenHash: 'hash-de-teste',
        rsvpId,
        expiresAt: 10_000,
        createdAt: 1_000,
      })

      return {
        rsvp: await ctx.db.get(rsvpId),
        guest: await ctx.db.get(guestId),
        session: await ctx.db.get(sessionId),
      }
    })

    expect(documents.rsvp?.phone).toBe('79999999999')
    expect(documents.guest?.attendance).toBe('pending')
    expect(documents.session?.tokenHash).toBe('hash-de-teste')
  })

  it('rejects invalid attendance literals and malformed required fields', async () => {
    const t = makeRsvpTest()

    await expect(
      t.run(async (ctx) => {
        const rsvpId = await ctx.db.insert('rsvps', {
          phone: '79999999999',
          displayName: 'Convite de Teste',
          updatedAt: 1_000,
        })
        await ctx.db.insert('rsvpGuests', {
          rsvpId,
          publicRef: 'guest_invalid_attendance',
          name: 'Pessoa de Teste',
          attendance: 'maybe',
          sortOrder: 0,
        } as never)
      }),
    ).rejects.toThrow()

    await expect(
      t.run(async (ctx) => {
        await ctx.db.insert('rsvpSessions', {
          tokenHash: 'hash-sem-rsvp',
          expiresAt: 10_000,
          createdAt: 1_000,
        } as never)
      }),
    ).rejects.toThrow()
  })

  it('registers the official rate-limiter component in every harness instance', async () => {
    const t = makeRsvpTest()
    const config = {
      kind: 'fixed window' as const,
      rate: 1,
      period: 60_000,
    }

    const first = await t.run((ctx) =>
      ctx.runMutation(components.rateLimiter.lib.rateLimit, {
        name: 'wave-zero-harness',
        config,
      }),
    )
    const second = await t.run((ctx) =>
      ctx.runMutation(components.rateLimiter.lib.rateLimit, {
        name: 'wave-zero-harness',
        config,
      }),
    )

    expect(first.ok).toBe(true)
    expect(second.ok).toBe(false)
  })
})

describe('fixture RSVP', () => {
  it('fails closed without the development-only flag or a 32-byte seed', async () => {
    const missingFlag = makeRsvpTest()
    delete process.env.RSVP_ENABLE_DEMO_FIXTURES

    await expect(
      missingFlag.mutation(internal.rsvpInternal.ensureDemoFixtures, {}),
    ).rejects.toThrow(/desabilitadas/i)

    const shortSeed = makeRsvpTest()
    process.env.RSVP_ENABLE_DEMO_FIXTURES = DEMO_FLAG
    process.env.RSVP_DEMO_SEED = 'curta'

    await expect(
      shortSeed.mutation(internal.rsvpInternal.ensureDemoFixtures, {}),
    ).rejects.toThrow(/32 bytes/i)
  })

  it('creates normal, zero, one and many-long shapes idempotently', async () => {
    const t = makeRsvpTest()

    const first = await t.mutation(internal.rsvpInternal.ensureDemoFixtures, {})
    const second = await t.mutation(internal.rsvpInternal.ensureDemoFixtures, {})
    const stored = await t.run(async (ctx) => ({
      rsvps: await ctx.db.query('rsvps').collect(),
      guests: await ctx.db.query('rsvpGuests').collect(),
      sessions: await ctx.db.query('rsvpSessions').collect(),
    }))

    expect(first.fixtures.map((fixture) => fixture.label)).toEqual([
      'normal',
      'zero',
      'one',
      'many-long',
    ])
    expect(first.fixtures.map((fixture) => fixture.guestCount)).toEqual([3, 0, 1, 12])
    expect(first.fixtures.every((fixture) => fixture.created)).toBe(true)
    expect(second.fixtures.every((fixture) => !fixture.created)).toBe(true)
    expect(second.fixtures.map((fixture) => fixture.phone)).toEqual(
      first.fixtures.map((fixture) => fixture.phone),
    )
    expect(second.fixtures.map((fixture) => fixture.rsvpId)).toEqual(
      first.fixtures.map((fixture) => fixture.rsvpId),
    )

    expect(stored.rsvps).toHaveLength(4)
    expect(stored.guests).toHaveLength(16)
    expect(stored.sessions).toHaveLength(0)
    expect(new Set(first.fixtures.map((fixture) => fixture.phone)).size).toBe(4)

    const normalId = first.fixtures.find((fixture) => fixture.label === 'normal')?.rsvpId
    const normalGuests = stored.guests
      .filter((guest) => guest.rsvpId === normalId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
    expect(normalGuests.map((guest) => guest.attendance)).toEqual(['pending', 'yes', 'no'])

    const longRsvp = stored.rsvps.find(
      (rsvp) => rsvp._id === first.fixtures.find((fixture) => fixture.label === 'many-long')?.rsvpId,
    )
    const longGuests = stored.guests.filter((guest) => guest.rsvpId === longRsvp?._id)
    expect(longRsvp?.displayName.length).toBeGreaterThan(80)
    expect(longGuests.some((guest) => guest.name.length > 80)).toBe(true)
  })

  it('uses opaque guest references scoped to one invitation', async () => {
    const t = makeRsvpTest()

    await t.mutation(internal.rsvpInternal.ensureDemoFixtures, {})
    const guests = await t.run((ctx) => ctx.db.query('rsvpGuests').collect())

    expect(guests.every((guest) => guest.publicRef.startsWith('guest_'))).toBe(true)
    expect(guests.every((guest) => guest.publicRef !== String(guest._id))).toBe(true)

    const scopedRefs = new Set(guests.map((guest) => `${guest.rsvpId}:${guest.publicRef}`))
    expect(scopedRefs.size).toBe(guests.length)
  })
})

describe('unique RSVP phone invariant', () => {
  it('rejects equivalent formatted phones inside the insertion transaction', async () => {
    const t = makeRsvpTest()

    await t.mutation((ctx) =>
      insertInvitation(ctx, {
        phone: '(79) 99999-9999',
        displayName: 'Convite Teste A',
        guests: [{ name: 'Pessoa A', attendance: 'pending' }],
      }),
    )

    await expect(
      t.mutation((ctx) =>
        insertInvitation(ctx, {
          phone: '+55 (79) 99999-9999',
          displayName: 'Convite Teste B',
          guests: [{ name: 'Pessoa B', attendance: 'pending' }],
        }),
      ),
    ).rejects.toThrow(/já existe/i)

    const rsvps = await t.run((ctx) => ctx.db.query('rsvps').collect())
    expect(rsvps).toHaveLength(1)
  })

  it('rejects a current mobile when an equivalent legacy record already exists', async () => {
    const t = makeRsvpTest()

    await t.run(async (ctx) => {
      await ctx.db.insert('rsvps', {
        phone: '7999999999',
        displayName: 'Registro Legado',
        updatedAt: 1_000,
      })
    })

    await expect(
      t.mutation((ctx) =>
        insertInvitation(ctx, {
          phone: '(79) 99999-9999',
          displayName: 'Convite Atual',
          guests: [],
        }),
      ),
    ).rejects.toThrow(/já existe/i)

    const rsvps = await t.run((ctx) => ctx.db.query('rsvps').collect())
    expect(rsvps).toHaveLength(1)
  })
})

describe('security helper', () => {
  it('accepts a capability generated by the shared browser contract', () => {
    const capability = generateRsvpCapability((bytes) => {
      bytes.forEach((_, index) => {
        bytes[index] = index
      })
    })

    expect(validateOpaqueToken(capability)).toBe(true)
  })

  const token = encodeOpaqueToken(new Uint8Array(32).fill(7))

  it('accepts only canonical unpadded base64url tokens representing 32 bytes', () => {
    expect(token).toHaveLength(43)
    expect(validateOpaqueToken(token)).toBe(true)

    expect(validateOpaqueToken('')).toBe(false)
    expect(validateOpaqueToken(token.slice(0, -1))).toBe(false)
    expect(validateOpaqueToken(`${token}A`)).toBe(false)
    expect(validateOpaqueToken(`${token}=`)).toBe(false)
    expect(validateOpaqueToken(`${token.slice(0, -1)}+`)).toBe(false)
    expect(validateOpaqueToken(`${'A'.repeat(42)}B`)).toBe(false)
  })

  it('hashes capabilities and limiter identities deterministically without reflection', async () => {
    const tokenHash = await hashOpaqueToken(token)
    const repeatedTokenHash = await hashOpaqueToken(token)
    const phoneKey = await hashLimiterKey('lookup-phone', '79999999999')
    const sessionKey = await hashLimiterKey('save-session', tokenHash)

    expect(tokenHash).toMatch(/^[a-f0-9]{64}$/)
    expect(repeatedTokenHash).toBe(tokenHash)
    expect(tokenHash).not.toContain(token)

    expect(phoneKey).toMatch(/^[a-f0-9]{64}$/)
    expect(phoneKey).not.toContain('79999999999')
    expect(sessionKey).toMatch(/^[a-f0-9]{64}$/)
    expect(sessionKey).not.toContain(token)
    expect(phoneKey).not.toBe(sessionKey)
  })

  it('uses exact expiry semantics at expiry minus one, at expiry, and after expiry', () => {
    const expiresAt = 10_000

    expect(isSessionActive(expiresAt, expiresAt - 1)).toBe(true)
    expect(isSessionActive(expiresAt, expiresAt)).toBe(false)
    expect(isSessionActive(expiresAt, expiresAt + 1)).toBe(false)
  })

  it('rounds retry milliseconds up to a positive whole second', () => {
    expect(toRetryAfterSeconds(0)).toBe(1)
    expect(toRetryAfterSeconds(1)).toBe(1)
    expect(toRetryAfterSeconds(999)).toBe(1)
    expect(toRetryAfterSeconds(1_000)).toBe(1)
    expect(toRetryAfterSeconds(1_001)).toBe(2)
  })
})

describe('rate policy', () => {
  it('centralizes the four fixed-window policies and exact boundaries', () => {
    expect(RSVP_RATE_LIMITS).toEqual({
      lookupByPhone: {
        kind: 'fixed window',
        rate: 5,
        period: 15 * 60 * 1_000,
      },
      lookupGlobal: {
        kind: 'fixed window',
        rate: 120,
        period: 15 * 60 * 1_000,
      },
      saveBySession: {
        kind: 'fixed window',
        rate: 30,
        period: 60 * 60 * 1_000,
      },
      saveGlobal: {
        kind: 'fixed window',
        rate: 300,
        period: 60 * 60 * 1_000,
      },
    })
  })
})

type RsvpHarness = ReturnType<typeof makeRsvpTest>

function opaqueToken(sequence: number) {
  const bytes = new Uint8Array(32)
  new DataView(bytes.buffer).setUint32(28, sequence >>> 0)
  return encodeOpaqueToken(bytes)
}

async function seedInvitation(
  t: RsvpHarness,
  {
    phone,
    displayName,
    contact,
    guests,
  }: {
    phone: string
    displayName: string
    contact?: string
    guests: Array<{
      name: string
      attendance: 'pending' | 'yes' | 'no'
    }>
  },
) {
  return t.mutation((ctx) =>
    insertInvitation(ctx, {
      phone,
      displayName,
      ...(contact === undefined ? {} : { contact }),
      guests,
    }),
  )
}

function collectForbiddenKeys(value: unknown, path = 'root'): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectForbiddenKeys(item, `${path}[${index}]`))
  }
  if (!value || typeof value !== 'object') {
    return []
  }

  const forbidden = new Set([
    '_id',
    '_creationTime',
    'phone',
    'rsvpId',
    'sessionId',
    'token',
    'tokenHash',
    'expiresAt',
    'createdAt',
  ])

  return Object.entries(value).flatMap(([key, child]) => [
    ...(forbidden.has(key) ? [`${path}.${key}`] : []),
    ...collectForbiddenKeys(child, `${path}.${key}`),
  ])
}

describe('unlock capability and privacy', () => {
  it('unlocks equivalent phone forms without duplicating the invitation or leaking family data', async () => {
    const t = makeRsvpTest()
    const seeded = await seedInvitation(t, {
      phone: '(55) 99999-1234',
      displayName: 'Convite DDD 55',
      contact: 'contato@example.com',
      guests: [{ name: 'Pessoa Única', attendance: 'pending' }],
    })
    const before = await t.run(async (ctx) => ({
      rsvps: await ctx.db.query('rsvps').collect(),
      guests: await ctx.db.query('rsvpGuests').collect(),
    }))

    const firstToken = opaqueToken(101)
    const secondToken = opaqueToken(102)
    const first = await t.mutation(api.rsvps.unlockByPhone, {
      phone: '+55 55 99999-1234',
      token: firstToken,
    })
    const second = await t.mutation(api.rsvps.unlockByPhone, {
      phone: '55 99999-1234',
      token: secondToken,
    })
    const after = await t.run(async (ctx) => ({
      rsvps: await ctx.db.query('rsvps').collect(),
      guests: await ctx.db.query('rsvpGuests').collect(),
      sessions: await ctx.db.query('rsvpSessions').collect(),
    }))

    expect(first).toEqual({ kind: 'unlocked' })
    expect(second).toEqual({ kind: 'unlocked' })
    expect(collectForbiddenKeys(first)).toEqual([])
    expect(collectForbiddenKeys(second)).toEqual([])
    expect(after.rsvps).toEqual(before.rsvps)
    expect(after.guests).toEqual(before.guests)
    expect(after.sessions).toHaveLength(2)
    expect(after.sessions.every((session) => session.rsvpId === seeded.rsvpId)).toBe(true)
    expect(after.sessions.map((session) => session.tokenHash)).not.toContain(firstToken)
    expect(after.sessions.map((session) => session.tokenHash)).not.toContain(secondToken)
  })

  it('fails closed for malformed, unknown, and ambiguous phones without creating domain or session rows', async () => {
    const t = makeRsvpTest()
    await seedInvitation(t, {
      phone: '(79) 98888-7777',
      displayName: 'Convite Atual',
      guests: [{ name: 'Pessoa Atual', attendance: 'pending' }],
    })
    await t.run(async (ctx) => {
      const legacyRsvpId = await ctx.db.insert('rsvps', {
        phone: '7988887777',
        displayName: 'Convite Legado Ambíguo',
        updatedAt: 1,
      })
      await ctx.db.insert('rsvpGuests', {
        rsvpId: legacyRsvpId,
        publicRef: 'guest_legacy_ambiguous',
        name: 'Pessoa Legada',
        attendance: 'pending',
        sortOrder: 0,
      })
    })
    const before = await t.run(async (ctx) => ({
      rsvps: await ctx.db.query('rsvps').collect(),
      guests: await ctx.db.query('rsvpGuests').collect(),
      sessions: await ctx.db.query('rsvpSessions').collect(),
    }))

    const malformed = await t.mutation(api.rsvps.unlockByPhone, {
      phone: 'telefone inválido',
      token: opaqueToken(110),
    })
    const unknown = await t.mutation(api.rsvps.unlockByPhone, {
      phone: '(79) 97777-1111',
      token: opaqueToken(111),
    })
    const ambiguous = await t.mutation(api.rsvps.unlockByPhone, {
      phone: '(79) 98888-7777',
      token: opaqueToken(112),
    })
    const ambiguousFollowups = []
    for (let attempt = 2; attempt <= 6; attempt += 1) {
      ambiguousFollowups.push(
        await t.mutation(api.rsvps.unlockByPhone, {
          phone: '(79) 98888-7777',
          token: opaqueToken(112 + attempt),
        }),
      )
    }
    const after = await t.run(async (ctx) => ({
      rsvps: await ctx.db.query('rsvps').collect(),
      guests: await ctx.db.query('rsvpGuests').collect(),
      sessions: await ctx.db.query('rsvpSessions').collect(),
    }))

    expect(malformed).toEqual({ kind: 'not_found' })
    expect(unknown).toEqual({ kind: 'not_found' })
    expect(ambiguous).toEqual({ kind: 'not_found' })
    expect(ambiguousFollowups[3]).toEqual({ kind: 'not_found' })
    expect(ambiguousFollowups[4]).toEqual({
      kind: 'rate_limited',
      retryAfterSeconds: expect.any(Number),
    })
    expect(after).toEqual(before)
  })

  it('keeps one immutable session owner when a token hash is reused for the same or another invitation', async () => {
    const t = makeRsvpTest()
    const invitationA = await seedInvitation(t, {
      phone: '(79) 99999-1001',
      displayName: 'Convite A',
      guests: [{ name: 'Pessoa A', attendance: 'pending' }],
    })
    await seedInvitation(t, {
      phone: '(79) 99999-1002',
      displayName: 'Convite B',
      guests: [{ name: 'Pessoa B', attendance: 'pending' }],
    })
    const token = opaqueToken(120)

    const first = await t.mutation(api.rsvps.unlockByPhone, {
      phone: '(79) 99999-1001',
      token,
    })
    const sameFamily = await t.mutation(api.rsvps.unlockByPhone, {
      phone: '+55 79 99999-1001',
      token,
    })
    const otherFamily = await t.mutation(api.rsvps.unlockByPhone, {
      phone: '(79) 99999-1002',
      token,
    })
    const tokenHash = await hashOpaqueToken(token)
    const matchingSessions = await t.run((ctx) =>
      ctx.db
        .query('rsvpSessions')
        .withIndex('by_token_hash', (query) => query.eq('tokenHash', tokenHash))
        .collect(),
    )

    expect(first).toEqual({ kind: 'unlocked' })
    expect(sameFamily).toEqual({ kind: 'token_conflict' })
    expect(otherFamily).toEqual({ kind: 'token_conflict' })
    expect(matchingSessions).toHaveLength(1)
    expect(matchingSessions[0].rsvpId).toBe(invitationA.rsvpId)
  })

  it('returns one scoped, ordered family view and never crosses or exposes internal identity', async () => {
    const t = makeRsvpTest()
    await seedInvitation(t, {
      phone: '(79) 99999-2001',
      displayName: 'Convite A',
      contact: 'a@example.com',
      guests: [
        { name: 'Pessoa A1', attendance: 'no' },
        { name: 'Pessoa A2', attendance: 'pending' },
        { name: 'Pessoa A3', attendance: 'yes' },
      ],
    })
    await seedInvitation(t, {
      phone: '(79) 99999-2002',
      displayName: 'Convite B',
      contact: 'b@example.com',
      guests: [{ name: 'Pessoa B1', attendance: 'yes' }],
    })
    const tokenA = opaqueToken(130)
    const tokenB = opaqueToken(131)

    const unlockA = await t.mutation(api.rsvps.unlockByPhone, {
      phone: '(79) 99999-2001',
      token: tokenA,
    })
    await t.mutation(api.rsvps.unlockByPhone, {
      phone: '(79) 99999-2002',
      token: tokenB,
    })
    const viewA = await t.query(api.rsvps.getCurrent, { token: tokenA })
    const viewB = await t.query(api.rsvps.getCurrent, { token: tokenB })

    expect(unlockA).toEqual({ kind: 'unlocked' })
    expect('contact' in unlockA).toBe(false)
    expect(viewA).toEqual({
      displayName: 'Convite A',
      contact: 'a@example.com',
      guests: [
        expect.objectContaining({
          guestRef: expect.stringMatching(/^guest_/),
          name: 'Pessoa A1',
          attendance: 'no',
        }),
        expect.objectContaining({
          guestRef: expect.stringMatching(/^guest_/),
          name: 'Pessoa A2',
          attendance: 'pending',
        }),
        expect.objectContaining({
          guestRef: expect.stringMatching(/^guest_/),
          name: 'Pessoa A3',
          attendance: 'yes',
        }),
      ],
      updatedAt: expect.any(Number),
    })
    expect(viewB?.displayName).toBe('Convite B')
    expect(viewB?.contact).toBe('b@example.com')
    expect(JSON.stringify(viewA)).not.toContain('Pessoa B1')
    expect(JSON.stringify(viewA)).not.toContain('b@example.com')
    expect(collectForbiddenKeys(viewA)).toEqual([])
    expect(collectForbiddenKeys(viewB)).toEqual([])
  })

  it('supports zero, one, and many guests while preserving server order', async () => {
    const t = makeRsvpTest()
    const shapes = [
      {
        phone: '(79) 99999-3000',
        displayName: 'Zero',
        guests: [],
      },
      {
        phone: '(79) 99999-3001',
        displayName: 'One',
        guests: [{ name: 'Única', attendance: 'pending' as const }],
      },
      {
        phone: '(79) 99999-3002',
        displayName: 'Many',
        guests: [
          { name: 'Primeira', attendance: 'pending' as const },
          { name: 'Segunda', attendance: 'yes' as const },
          { name: 'Terceira', attendance: 'no' as const },
        ],
      },
    ]

    for (const [index, shape] of shapes.entries()) {
      await seedInvitation(t, shape)
      const token = opaqueToken(140 + index)
      await t.mutation(api.rsvps.unlockByPhone, {
        phone: shape.phone,
        token,
      })
      const view = await t.query(api.rsvps.getCurrent, { token })

      expect(view?.guests.map((guest) => guest.name)).toEqual(
        shape.guests.map((guest) => guest.name),
      )
    }
  })

  it('treats malformed, unknown, and expired capabilities as the same locked read', async () => {
    const t = makeRsvpTest()
    await seedInvitation(t, {
      phone: '(79) 99999-4001',
      displayName: 'Expiração',
      guests: [{ name: 'Pessoa', attendance: 'pending' }],
    })
    const expiredToken = opaqueToken(150)
    await t.mutation(api.rsvps.unlockByPhone, {
      phone: '(79) 99999-4001',
      token: expiredToken,
    })
    const expiredHash = await hashOpaqueToken(expiredToken)
    await t.run(async (ctx) => {
      const session = await ctx.db
        .query('rsvpSessions')
        .withIndex('by_token_hash', (query) => query.eq('tokenHash', expiredHash))
        .unique()
      if (!session) {
        throw new Error('missing test session')
      }
      await ctx.db.patch(session._id, { expiresAt: Date.now() - 1 })
    })

    await expect(
      t.query(api.rsvps.getCurrent, { token: 'not-a-capability' }),
    ).resolves.toBeNull()
    await expect(
      t.query(api.rsvps.getCurrent, { token: opaqueToken(151) }),
    ).resolves.toBeNull()
    await expect(
      t.query(api.rsvps.getCurrent, { token: expiredToken }),
    ).resolves.toBeNull()
  })

  it('enforces session expiry at minus one, exact boundary, and plus one millisecond', async () => {
    vi.useFakeTimers()
    const now = Date.UTC(2026, 8, 30, 12, 0, 0)
    vi.setSystemTime(now)
    const t = makeRsvpTest()
    await seedInvitation(t, {
      phone: '(79) 99999-5001',
      displayName: 'Limite da Sessão',
      guests: [{ name: 'Pessoa', attendance: 'pending' }],
    })
    const tokens = [opaqueToken(160), opaqueToken(161), opaqueToken(162)]

    for (const token of tokens) {
      await t.mutation(api.rsvps.unlockByPhone, {
        phone: '(79) 99999-5001',
        token,
      })
    }

    const hashes = await Promise.all(tokens.map(hashOpaqueToken))
    await t.run(async (ctx) => {
      for (const [index, tokenHash] of hashes.entries()) {
        const session = await ctx.db
          .query('rsvpSessions')
          .withIndex('by_token_hash', (query) => query.eq('tokenHash', tokenHash))
          .unique()
        if (!session) {
          throw new Error('missing test session')
        }
        await ctx.db.patch(session._id, {
          expiresAt: now + [1, 0, -1][index],
        })
      }
    })

    await expect(t.query(api.rsvps.getCurrent, { token: tokens[0] })).resolves.not.toBeNull()
    await expect(t.query(api.rsvps.getCurrent, { token: tokens[1] })).resolves.toBeNull()
    await expect(t.query(api.rsvps.getCurrent, { token: tokens[2] })).resolves.toBeNull()

    const activeSession = await t.run(async (ctx) => {
      const session = await ctx.db
        .query('rsvpSessions')
        .withIndex('by_token_hash', (query) => query.eq('tokenHash', hashes[0]))
        .unique()
      return session
    })
    expect(activeSession?.createdAt).toBe(now)
  })

  it('issues an absolute eight-hour session without sliding on read', async () => {
    vi.useFakeTimers()
    const now = Date.UTC(2026, 7, 1, 10, 0, 0)
    vi.setSystemTime(now)
    const t = makeRsvpTest()
    await seedInvitation(t, {
      phone: '(79) 99999-5002',
      displayName: 'TTL',
      guests: [{ name: 'Pessoa', attendance: 'pending' }],
    })
    const token = opaqueToken(170)
    await t.mutation(api.rsvps.unlockByPhone, {
      phone: '(79) 99999-5002',
      token,
    })
    const tokenHash = await hashOpaqueToken(token)
    const beforeRead = await t.run(async (ctx) =>
      ctx.db
        .query('rsvpSessions')
        .withIndex('by_token_hash', (query) => query.eq('tokenHash', tokenHash))
        .unique(),
    )

    vi.setSystemTime(now + 60_000)
    await t.query(api.rsvps.getCurrent, { token })
    const afterRead = await t.run(async (ctx) =>
      ctx.db
        .query('rsvpSessions')
        .withIndex('by_token_hash', (query) => query.eq('tokenHash', tokenHash))
        .unique(),
    )

    expect(beforeRead?.expiresAt).toBe(now + RSVP_SESSION_TTL_MS)
    expect(afterRead?.expiresAt).toBe(beforeRead?.expiresAt)
  })

  it('stores invitation generation, schedules one absolute expiry, and physically expires once', async () => {
    vi.useFakeTimers()
    const now = Date.UTC(2026, 7, 2, 10, 0, 0)
    vi.setSystemTime(now)
    const t = makeRsvpTest()
    const invitation = await seedInvitation(t, {
      phone: '(79) 99999-5003',
      displayName: 'Sessão Agendada',
      guests: [{ name: 'Pessoa', attendance: 'pending' }],
    })
    await t.run((ctx) => ctx.db.patch(invitation.rsvpId, { generation: 3 }))
    const token = opaqueToken(171)
    const tokenHash = await hashOpaqueToken(token)

    await expect(
      t.mutation((ctx) => createRsvpSession(ctx, {
        rsvpId: invitation.rsvpId,
        token,
        now,
      })),
    ).resolves.toEqual({ kind: 'created', tokenHash })

    const snapshot = await t.run(async (ctx) => ({
      session: await ctx.db
        .query('rsvpSessions')
        .withIndex('by_token_hash', (query) => query.eq('tokenHash', tokenHash))
        .unique(),
      scheduled: await ctx.db.system.query('_scheduled_functions').collect(),
    }))
    expect(snapshot.session).toEqual(expect.objectContaining({
      generation: 3,
      expiresAt: now + RSVP_SESSION_TTL_MS,
    }))
    expect(snapshot.scheduled).toHaveLength(1)

    await t.finishAllScheduledFunctions(vi.runAllTimers)
    await expect(t.query(api.rsvps.getCurrent, { token })).resolves.toBeNull()
    expect(await t.run((ctx) => ctx.db.get(snapshot.session!._id))).toBeNull()
  })

  it('keeps expiry idempotent and ignores a mismatched expected boundary', async () => {
    const t = makeRsvpTest()
    const invitation = await seedInvitation(t, {
      phone: '(79) 99999-5004',
      displayName: 'Expiração Idempotente',
      guests: [],
    })
    const token = opaqueToken(172)
    const expiresAt = Date.now() + 60_000
    await createTestSession(t, invitation.rsvpId, token, expiresAt)
    const tokenHash = await hashOpaqueToken(token)
    const session = await t.run((ctx) =>
      ctx.db
        .query('rsvpSessions')
        .withIndex('by_token_hash', (query) => query.eq('tokenHash', tokenHash))
        .unique(),
    )
    expect(session).not.toBeNull()
    const sessionId = session!._id

    await expect(
      t.mutation((ctx) =>
        expireRsvpSessionRecord(ctx, {
          sessionId,
          expectedExpiresAt: expiresAt + 1,
        }),
      ),
    ).resolves.toEqual({ kind: 'ignored' })
    await expect(
      t.mutation((ctx) =>
        expireRsvpSessionRecord(ctx, { sessionId, expectedExpiresAt: expiresAt }),
      ),
    ).resolves.toEqual({ kind: 'expired' })
    await expect(
      t.mutation((ctx) =>
        expireRsvpSessionRecord(ctx, { sessionId, expectedExpiresAt: expiresAt }),
      ),
    ).resolves.toEqual({ kind: 'ignored' })
  })

  it('treats legacy generation omissions as zero and rejects stale generations', async () => {
    const t = makeRsvpTest()
    const invitation = await seedInvitation(t, {
      phone: '(79) 99999-5005',
      displayName: 'Geração',
      guests: [],
    })
    const legacyToken = opaqueToken(173)
    await createTestSession(t, invitation.rsvpId, legacyToken)
    await expect(
      t.query((ctx) => resolveActiveRsvpSession(ctx, legacyToken)),
    ).resolves.not.toBeNull()

    await t.run((ctx) => ctx.db.patch(invitation.rsvpId, { generation: 1 }))
    await expect(
      t.query((ctx) => resolveActiveRsvpSession(ctx, legacyToken)),
    ).resolves.toBeNull()

    expect(normalizeRsvpGeneration(undefined)).toBe(0)
    expect(normalizeRsvpGeneration(2)).toBe(2)
    expect(() => normalizeRsvpGeneration(-1)).toThrow(/generation/i)
    expect(() => normalizeRsvpGeneration(1.5)).toThrow(/generation/i)
  })
})

describe('lookup rate limits', () => {
  it('counts not-found attempts at 4/5/6, shares equivalent phone keys, and isolates another phone', async () => {
    const t = makeRsvpTest()
    const attempts = []

    for (let attempt = 1; attempt <= 6; attempt += 1) {
      attempts.push(
        await t.mutation(api.rsvps.unlockByPhone, {
          phone:
            attempt % 2 === 0
              ? '+55 (79) 97777-6001'
              : '(79) 97777-6001',
          token: opaqueToken(200 + attempt),
        }),
      )
    }
    const unrelated = await t.mutation(api.rsvps.unlockByPhone, {
      phone: '(79) 97777-6002',
      token: opaqueToken(220),
    })

    expect(attempts[3]).toEqual({ kind: 'not_found' })
    expect(attempts[4]).toEqual({ kind: 'not_found' })
    expect(attempts[5]).toEqual({
      kind: 'rate_limited',
      retryAfterSeconds: expect.any(Number),
    })
    expect(
      attempts[5].kind === 'rate_limited' && attempts[5].retryAfterSeconds,
    ).toSatisfy((seconds: number) => Number.isInteger(seconds) && seconds > 0)
    expect(unrelated).toEqual({ kind: 'not_found' })
  })

  it('caps aggregate lookup attempts exactly at 119/120/121 across distinct normalized keys', async () => {
    const t = makeRsvpTest()
    const results = [
      await t.mutation(api.rsvps.unlockByPhone, {
        phone: 'entrada malformada',
        token: opaqueToken(299),
      }),
    ]
    const ddds = ['11', '21', '31', '41', '51', '61', '71', '81', '91', '99']

    for (let index = 1; index <= 120; index += 1) {
      const ddd = ddds[index % ddds.length]
      const subscriber = String(index).padStart(8, '0')
      results.push(
        await t.mutation(api.rsvps.unlockByPhone, {
          phone: `${ddd}9${subscriber}`,
          token: opaqueToken(300 + index),
        }),
      )
    }

    expect(results[118]).toEqual({ kind: 'not_found' })
    expect(results[119]).toEqual({ kind: 'not_found' })
    expect(results[120]).toEqual({
      kind: 'rate_limited',
      retryAfterSeconds: expect.any(Number),
    })
  })
})

describe('demo session internal helpers', () => {
  it('issues valid and expired fixture capabilities and revokes only their matching rows', async () => {
    const t = makeRsvpTest()
    await t.mutation(internal.rsvpInternal.ensureDemoFixtures, {})

    const valid = await t.mutation(internal.rsvpInternal.issueDemoSession, {
      fixture: 'normal',
      state: 'valid',
    })
    const expired = await t.mutation(internal.rsvpInternal.issueDemoSession, {
      fixture: 'one',
      state: 'expired',
    })

    expect(validateOpaqueToken(valid.token)).toBe(true)
    expect(validateOpaqueToken(expired.token)).toBe(true)
    await expect(
      t.query(api.rsvps.getCurrent, { token: valid.token }),
    ).resolves.toEqual(expect.objectContaining({ displayName: 'Convite Demo Normal' }))
    await expect(
      t.query(api.rsvps.getCurrent, { token: expired.token }),
    ).resolves.toBeNull()

    await expect(
      t.mutation(internal.rsvpInternal.revokeDemoSession, { token: valid.token }),
    ).resolves.toEqual({ kind: 'deleted' })
    await expect(
      t.mutation(internal.rsvpInternal.revokeDemoSession, { token: valid.token }),
    ).resolves.toEqual({ kind: 'not_found' })
    await expect(
      t.query(api.rsvps.getCurrent, { token: valid.token }),
    ).resolves.toBeNull()
  })

  it('fails closed without the development guard', async () => {
    const t = makeRsvpTest()
    await t.mutation(internal.rsvpInternal.ensureDemoFixtures, {})
    delete process.env.RSVP_ENABLE_DEMO_FIXTURES

    await expect(
      t.mutation(internal.rsvpInternal.issueDemoSession, {
        fixture: 'normal',
        state: 'valid',
      }),
    ).rejects.toThrow(/desabilitadas/i)
    await expect(
      t.mutation(internal.rsvpInternal.revokeDemoSession, {
        token: opaqueToken(500),
      }),
    ).rejects.toThrow(/desabilitadas/i)
  })

  it('does not let the demo teardown revoke a capability for a non-demo invitation', async () => {
    const t = makeRsvpTest()
    await t.mutation(internal.rsvpInternal.ensureDemoFixtures, {})
    await seedInvitation(t, {
      phone: '(79) 99999-7001',
      displayName: 'Convite Não Demo',
      guests: [{ name: 'Pessoa', attendance: 'pending' }],
    })
    const token = opaqueToken(510)
    await t.mutation(api.rsvps.unlockByPhone, {
      phone: '(79) 99999-7001',
      token,
    })

    await expect(
      t.mutation(internal.rsvpInternal.revokeDemoSession, { token }),
    ).resolves.toEqual({ kind: 'not_found' })
    await expect(t.query(api.rsvps.getCurrent, { token })).resolves.not.toBeNull()
  })
})

async function readFamilyRows(t: RsvpHarness, rsvpId: Id<'rsvps'>) {
  return t.run(async (ctx) => ({
    rsvp: await ctx.db.get(rsvpId),
    guests: await ctx.db
      .query('rsvpGuests')
      .withIndex('by_rsvp_sort', (query) => query.eq('rsvpId', rsvpId))
      .collect(),
    counts: {
      rsvps: (await ctx.db.query('rsvps').collect()).length,
      guests: (await ctx.db.query('rsvpGuests').collect()).length,
    },
  }))
}

async function createTestSession(
  t: RsvpHarness,
  rsvpId: Id<'rsvps'>,
  token: string,
  expiresAt?: number,
) {
  const result = await t.mutation((ctx) =>
    createRsvpSession(ctx, {
      rsvpId,
      token,
      ...(expiresAt === undefined ? {} : { expiresAt }),
    }),
  )
  expect(result.kind).toBe('created')
}

async function readSaveRateValues(t: RsvpHarness, token: string) {
  const tokenHash = await hashOpaqueToken(token)
  const sessionKey = await hashLimiterKey('save-session', tokenHash)

  const global = await t.query((ctx) =>
    rsvpRateLimiter.getValue(ctx, 'saveGlobal'),
  )
  const session = await t.query((ctx) =>
    rsvpRateLimiter.getValue(ctx, 'saveBySession', { key: sessionKey }),
  )

  return {
    global: global.value,
    session: session.value,
  }
}

describe('partial save and idempotent behavior', () => {
  it('patches only submitted people, accepts explicit pending, and preserves omitted rows', async () => {
    vi.useFakeTimers()
    const firstSaveAt = Date.UTC(2026, 7, 1, 12, 0, 0)
    vi.setSystemTime(firstSaveAt)
    const t = makeRsvpTest()
    const invitation = await seedInvitation(t, {
      phone: '(79) 99999-8001',
      displayName: 'Convite Parcial',
      contact: 'original@example.com',
      guests: [
        { name: 'Pessoa Pendente', attendance: 'pending' },
        { name: 'Pessoa Presente', attendance: 'yes' },
        { name: 'Pessoa Ausente', attendance: 'no' },
      ],
    })
    const token = opaqueToken(600)
    await createTestSession(t, invitation.rsvpId, token)
    const initialView = await t.query(api.rsvps.getCurrent, { token })
    const before = await readFamilyRows(t, invitation.rsvpId)
    if (!initialView) {
      throw new Error('missing family view')
    }

    const first = await t.mutation(api.rsvps.saveResponses, {
      token,
      guestUpdates: [
        {
          guestRef: initialView.guests[0].guestRef,
          attendance: 'yes',
        },
      ],
      contact: { kind: 'unchanged' },
    })
    const afterFirst = await readFamilyRows(t, invitation.rsvpId)

    expect(first).toEqual({
      kind: 'saved',
      view: expect.objectContaining({
        contact: 'original@example.com',
        guests: [
          expect.objectContaining({ name: 'Pessoa Pendente', attendance: 'yes' }),
          expect.objectContaining({ name: 'Pessoa Presente', attendance: 'yes' }),
          expect.objectContaining({ name: 'Pessoa Ausente', attendance: 'no' }),
        ],
      }),
    })
    expect(afterFirst.guests[1]).toEqual(before.guests[1])
    expect(afterFirst.guests[2]).toEqual(before.guests[2])
    expect(afterFirst.guests[0].respondedAt).toBe(firstSaveAt)

    vi.setSystemTime(firstSaveAt + 1_000)
    const explicitPending = await t.mutation(api.rsvps.saveResponses, {
      token,
      guestUpdates: [
        {
          guestRef: initialView.guests[1].guestRef,
          attendance: 'pending',
        },
      ],
      contact: { kind: 'unchanged' },
    })
    const afterPending = await readFamilyRows(t, invitation.rsvpId)

    expect(explicitPending).toEqual({
      kind: 'saved',
      view: expect.objectContaining({
        guests: expect.arrayContaining([
          expect.objectContaining({
            name: 'Pessoa Presente',
            attendance: 'pending',
          }),
        ]),
      }),
    })
    expect(afterPending.guests[0]).toEqual(afterFirst.guests[0])
    expect(afterPending.guests[1].respondedAt).toBe(firstSaveAt + 1_000)
    expect(afterPending.guests[2]).toEqual(afterFirst.guests[2])
    expect(afterPending.counts).toEqual(before.counts)
  })

  it('keeps business timestamps and document counts stable on an identical retry', async () => {
    vi.useFakeTimers()
    const now = Date.UTC(2026, 7, 2, 12, 0, 0)
    vi.setSystemTime(now)
    const t = makeRsvpTest()
    const invitation = await seedInvitation(t, {
      phone: '(79) 99999-8002',
      displayName: 'Convite Idempotente',
      guests: [
        { name: 'Pessoa A', attendance: 'pending' },
        { name: 'Pessoa B', attendance: 'no' },
      ],
    })
    const token = opaqueToken(601)
    await createTestSession(t, invitation.rsvpId, token)
    const view = await t.query(api.rsvps.getCurrent, { token })
    if (!view) {
      throw new Error('missing family view')
    }
    const command = {
      token,
      guestUpdates: [
        {
          guestRef: view.guests[0].guestRef,
          attendance: 'yes' as const,
        },
      ],
      contact: { kind: 'set' as const, value: '  idempotente@example.com  ' },
    }

    await t.mutation(api.rsvps.saveResponses, command)
    const afterFirst = await readFamilyRows(t, invitation.rsvpId)
    vi.setSystemTime(now + 60_000)
    await t.mutation(api.rsvps.saveResponses, command)
    const afterRetry = await readFamilyRows(t, invitation.rsvpId)

    expect(afterRetry).toEqual(afterFirst)
  })

  it('lets two capabilities compose sparse edits to different people', async () => {
    const t = makeRsvpTest()
    const invitation = await seedInvitation(t, {
      phone: '(79) 99999-8003',
      displayName: 'Convite Duas Abas',
      guests: [
        { name: 'Pessoa A', attendance: 'pending' },
        { name: 'Pessoa B', attendance: 'pending' },
        { name: 'Pessoa Omitida', attendance: 'no' },
      ],
    })
    const tokenA = opaqueToken(602)
    const tokenB = opaqueToken(603)
    await createTestSession(t, invitation.rsvpId, tokenA)
    await createTestSession(t, invitation.rsvpId, tokenB)
    const view = await t.query(api.rsvps.getCurrent, { token: tokenA })
    if (!view) {
      throw new Error('missing family view')
    }

    await t.mutation(api.rsvps.saveResponses, {
      token: tokenA,
      guestUpdates: [{ guestRef: view.guests[0].guestRef, attendance: 'yes' }],
      contact: { kind: 'unchanged' },
    })
    const second = await t.mutation(api.rsvps.saveResponses, {
      token: tokenB,
      guestUpdates: [{ guestRef: view.guests[1].guestRef, attendance: 'no' }],
      contact: { kind: 'unchanged' },
    })

    expect(second).toEqual({
      kind: 'saved',
      view: expect.objectContaining({
        guests: [
          expect.objectContaining({ name: 'Pessoa A', attendance: 'yes' }),
          expect.objectContaining({ name: 'Pessoa B', attendance: 'no' }),
          expect.objectContaining({ name: 'Pessoa Omitida', attendance: 'no' }),
        ],
      }),
    })
  })
})

describe('contact command boundaries', () => {
  it('supports set with trim, normalized no-op, clear, and 120/121-character limits', async () => {
    vi.useFakeTimers()
    const now = Date.UTC(2026, 7, 3, 12, 0, 0)
    vi.setSystemTime(now)
    const t = makeRsvpTest()
    const invitation = await seedInvitation(t, {
      phone: '(79) 99999-8101',
      displayName: 'Convite Contato',
      guests: [{ name: 'Pessoa', attendance: 'pending' }],
    })
    const token = opaqueToken(610)
    await createTestSession(t, invitation.rsvpId, token)

    const set = await t.mutation(api.rsvps.saveResponses, {
      token,
      guestUpdates: [],
      contact: { kind: 'set', value: '  contato@example.com  ' },
    })
    expect(set).toEqual({
      kind: 'saved',
      view: expect.objectContaining({ contact: 'contato@example.com' }),
    })
    const afterSet = await readFamilyRows(t, invitation.rsvpId)

    vi.setSystemTime(now + 1_000)
    await t.mutation(api.rsvps.saveResponses, {
      token,
      guestUpdates: [],
      contact: { kind: 'set', value: 'contato@example.com' },
    })
    expect(await readFamilyRows(t, invitation.rsvpId)).toEqual(afterSet)

    const cleared = await t.mutation(api.rsvps.saveResponses, {
      token,
      guestUpdates: [],
      contact: { kind: 'clear' },
    })
    expect(cleared.kind).toBe('saved')
    if (cleared.kind === 'saved') {
      expect('contact' in cleared.view).toBe(false)
    }

    const maximum = 'x'.repeat(120)
    const atMaximum = await t.mutation(api.rsvps.saveResponses, {
      token,
      guestUpdates: [],
      contact: { kind: 'set', value: maximum },
    })
    expect(atMaximum).toEqual({
      kind: 'saved',
      view: expect.objectContaining({ contact: maximum }),
    })
    const beforeInvalid = await readFamilyRows(t, invitation.rsvpId)

    const overMaximum = await t.mutation(api.rsvps.saveResponses, {
      token,
      guestUpdates: [],
      contact: { kind: 'set', value: 'x'.repeat(121) },
    })
    const emptySet = await t.mutation(api.rsvps.saveResponses, {
      token,
      guestUpdates: [],
      contact: { kind: 'set', value: '   ' },
    })

    expect(overMaximum).toEqual({ kind: 'invalid_update' })
    expect(emptySet).toEqual({ kind: 'invalid_update' })
    expect(await readFamilyRows(t, invitation.rsvpId)).toEqual(beforeInvalid)
  })
})

describe('atomic save validation', () => {
  it('rejects duplicate, foreign, and unknown guest refs before any family write', async () => {
    const t = makeRsvpTest()
    const invitationA = await seedInvitation(t, {
      phone: '(79) 99999-8201',
      displayName: 'Convite Atômico A',
      contact: 'a@example.com',
      guests: [
        { name: 'Pessoa A1', attendance: 'pending' },
        { name: 'Pessoa A2', attendance: 'no' },
      ],
    })
    const invitationB = await seedInvitation(t, {
      phone: '(79) 99999-8202',
      displayName: 'Convite Atômico B',
      contact: 'b@example.com',
      guests: [{ name: 'Pessoa B1', attendance: 'yes' }],
    })
    const tokenA = opaqueToken(620)
    const tokenB = opaqueToken(621)
    await createTestSession(t, invitationA.rsvpId, tokenA)
    await createTestSession(t, invitationB.rsvpId, tokenB)
    const viewA = await t.query(api.rsvps.getCurrent, { token: tokenA })
    const viewB = await t.query(api.rsvps.getCurrent, { token: tokenB })
    if (!viewA || !viewB) {
      throw new Error('missing family view')
    }
    const beforeA = await readFamilyRows(t, invitationA.rsvpId)
    const beforeB = await readFamilyRows(t, invitationB.rsvpId)

    const duplicate = await t.mutation(api.rsvps.saveResponses, {
      token: tokenA,
      guestUpdates: [
        { guestRef: viewA.guests[0].guestRef, attendance: 'yes' },
        { guestRef: viewA.guests[0].guestRef, attendance: 'no' },
      ],
      contact: { kind: 'set', value: 'novo@example.com' },
    })
    const foreign = await t.mutation(api.rsvps.saveResponses, {
      token: tokenA,
      guestUpdates: [
        { guestRef: viewA.guests[0].guestRef, attendance: 'yes' },
        { guestRef: viewB.guests[0].guestRef, attendance: 'no' },
      ],
      contact: { kind: 'clear' },
    })
    const unknown = await t.mutation(api.rsvps.saveResponses, {
      token: tokenA,
      guestUpdates: [
        { guestRef: viewA.guests[0].guestRef, attendance: 'yes' },
        { guestRef: 'guest_unknown_opaque_reference', attendance: 'no' },
      ],
      contact: { kind: 'clear' },
    })

    expect(duplicate).toEqual({ kind: 'invalid_update' })
    expect(foreign).toEqual({ kind: 'invalid_update' })
    expect(unknown).toEqual({ kind: 'invalid_update' })
    expect(await readFamilyRows(t, invitationA.rsvpId)).toEqual(beforeA)
    expect(await readFamilyRows(t, invitationB.rsvpId)).toEqual(beforeB)
  })

  it('lets args validation reject a malformed later item without committing the earlier valid item', async () => {
    const t = makeRsvpTest()
    const invitation = await seedInvitation(t, {
      phone: '(79) 99999-8203',
      displayName: 'Convite Validator',
      guests: [
        { name: 'Pessoa A', attendance: 'pending' },
        { name: 'Pessoa B', attendance: 'pending' },
      ],
    })
    const token = opaqueToken(622)
    await createTestSession(t, invitation.rsvpId, token)
    const view = await t.query(api.rsvps.getCurrent, { token })
    if (!view) {
      throw new Error('missing family view')
    }
    const before = await readFamilyRows(t, invitation.rsvpId)

    await expect(
      t.mutation(api.rsvps.saveResponses, {
        token,
        guestUpdates: [
          { guestRef: view.guests[0].guestRef, attendance: 'yes' },
          { guestRef: view.guests[1].guestRef, attendance: 'maybe' },
        ],
        contact: { kind: 'unchanged' },
      } as never),
    ).rejects.toThrow()

    expect(await readFamilyRows(t, invitation.rsvpId)).toEqual(before)
  })
})

describe('save rate limits', () => {
  it('allows save 29 and 30, throttles 31, and leaves global/session consumption coherent', async () => {
    const t = makeRsvpTest()
    const invitation = await seedInvitation(t, {
      phone: '(79) 99999-8301',
      displayName: 'Convite Limite Sessão',
      guests: [{ name: 'Pessoa', attendance: 'pending' }],
    })
    const token = opaqueToken(630)
    await createTestSession(t, invitation.rsvpId, token)
    const results = []

    for (let attempt = 1; attempt <= 31; attempt += 1) {
      results.push(
        await t.mutation(api.rsvps.saveResponses, {
          token,
          guestUpdates: [],
          contact: { kind: 'unchanged' },
        }),
      )
    }

    expect(results[28].kind).toBe('saved')
    expect(results[29].kind).toBe('saved')
    expect(results[30]).toEqual({
      kind: 'rate_limited',
      retryAfterSeconds: expect.any(Number),
    })
    if (results[30].kind === 'rate_limited') {
      expect(Number.isInteger(results[30].retryAfterSeconds)).toBe(true)
      expect(results[30].retryAfterSeconds).toBeGreaterThan(0)
    }
    expect(await readSaveRateValues(t, token)).toEqual({
      global: 270,
      session: 0,
    })
  })

  it('isolates sessions and aggregates 300 valid saves globally before throttling 301', async () => {
    const t = makeRsvpTest()
    const invitation = await seedInvitation(t, {
      phone: '(79) 99999-8302',
      displayName: 'Convite Limite Global Válido',
      guests: [{ name: 'Pessoa', attendance: 'pending' }],
    })
    const tokens = Array.from({ length: 11 }, (_, index) => opaqueToken(640 + index))

    for (const token of tokens) {
      await createTestSession(t, invitation.rsvpId, token)
    }

    for (const token of tokens.slice(0, 10)) {
      for (let attempt = 1; attempt <= 30; attempt += 1) {
        const result = await t.mutation(api.rsvps.saveResponses, {
          token,
          guestUpdates: [],
          contact: { kind: 'unchanged' },
        })
        expect(result.kind).toBe('saved')
      }
    }

    const globalAttempt301 = await t.mutation(api.rsvps.saveResponses, {
      token: tokens[10],
      guestUpdates: [],
      contact: { kind: 'unchanged' },
    })

    expect(globalAttempt301).toEqual({
      kind: 'rate_limited',
      retryAfterSeconds: expect.any(Number),
    })
    expect(await readSaveRateValues(t, tokens[10])).toEqual({
      global: 0,
      session: 30,
    })
  })
})

describe('global invalid token save limits', () => {
  it('consumes only global for unknown tokens at 299/300 and throttles 301', async () => {
    const t = makeRsvpTest()
    const results = []
    const tokens = []

    for (let attempt = 1; attempt <= 301; attempt += 1) {
      const token = opaqueToken(1_000 + attempt)
      tokens.push(token)
      results.push(
        await t.mutation(api.rsvps.saveResponses, {
          token,
          guestUpdates: [],
          contact: { kind: 'unchanged' },
        }),
      )
    }

    expect(results[298]).toEqual({ kind: 'session_expired' })
    expect(results[299]).toEqual({ kind: 'session_expired' })
    expect(results[300]).toEqual({
      kind: 'rate_limited',
      retryAfterSeconds: expect.any(Number),
    })
    for (const index of [298, 299, 300]) {
      expect((await readSaveRateValues(t, tokens[index])).session).toBe(30)
    }
  })

  it('consumes only global for an expired capability at 299/300 and throttles 301', async () => {
    const t = makeRsvpTest()
    const invitation = await seedInvitation(t, {
      phone: '(79) 99999-8401',
      displayName: 'Convite Expirado Global',
      guests: [{ name: 'Pessoa', attendance: 'pending' }],
    })
    const token = opaqueToken(1_400)
    await createTestSession(t, invitation.rsvpId, token, Date.now() - 1)
    const results = []

    for (let attempt = 1; attempt <= 301; attempt += 1) {
      results.push(
        await t.mutation(api.rsvps.saveResponses, {
          token,
          guestUpdates: [],
          contact: { kind: 'unchanged' },
        }),
      )
    }

    expect(results[298]).toEqual({ kind: 'session_expired' })
    expect(results[299]).toEqual({ kind: 'session_expired' })
    expect(results[300]).toEqual({
      kind: 'rate_limited',
      retryAfterSeconds: expect.any(Number),
    })
    expect(await readSaveRateValues(t, token)).toEqual({
      global: 0,
      session: 30,
    })
  })

  it('treats a malformed well-shaped call token as global-only session expiry', async () => {
    const t = makeRsvpTest()
    const result = await t.mutation(api.rsvps.saveResponses, {
      token: 'malformed-but-string-shaped',
      guestUpdates: [],
      contact: { kind: 'unchanged' },
    })

    expect(result).toEqual({ kind: 'session_expired' })
    const global = await t.query((ctx) =>
      rsvpRateLimiter.getValue(ctx, 'saveGlobal'),
    )
    expect(global.value).toBe(299)
  })
})

describe('prepare throttle internal action', () => {
  it('performs exactly 30 real saves, leaves ordinal 31 throttled, rejects collision, and tears down', async () => {
    const t = makeRsvpTest()
    await t.mutation(internal.rsvpInternal.ensureDemoFixtures, {})
    const token = opaqueToken(1_500)

    const prepared = await t.action(
      internal.rsvpInternal.prepareSaveThrottleDemo,
      {
        fixture: 'normal',
        token,
      },
    )

    expect(prepared).toEqual({
      nMinusOne: 29,
      atLimit: 30,
      successfulCalls: 30,
      nextCallOrdinal: 31,
    })
    expect(await readSaveRateValues(t, token)).toEqual({
      global: 270,
      session: 0,
    })
    await expect(
      t.action(internal.rsvpInternal.prepareSaveThrottleDemo, {
        fixture: 'normal',
        token,
      }),
    ).rejects.toThrow(/preparar/i)

    const ordinal31 = await t.mutation(api.rsvps.saveResponses, {
      token,
      guestUpdates: [],
      contact: { kind: 'unchanged' },
    })
    expect(ordinal31).toEqual({
      kind: 'rate_limited',
      retryAfterSeconds: expect.any(Number),
    })
    if (ordinal31.kind === 'rate_limited') {
      expect(Number.isInteger(ordinal31.retryAfterSeconds)).toBe(true)
      expect(ordinal31.retryAfterSeconds).toBeGreaterThan(0)
    }
    await expect(
      t.mutation(internal.rsvpInternal.revokeDemoSession, { token }),
    ).resolves.toEqual({ kind: 'deleted' })
    await expect(t.query(api.rsvps.getCurrent, { token })).resolves.toBeNull()
  })

  it('is unavailable without the development-only guard', async () => {
    const t = makeRsvpTest()
    delete process.env.RSVP_ENABLE_DEMO_FIXTURES

    await expect(
      t.action(internal.rsvpInternal.prepareSaveThrottleDemo, {
        fixture: 'normal',
        token: opaqueToken(1_501),
      }),
    ).rejects.toThrow(/desabilitadas/i)
  })
})

describe('deadline policy', () => {
  it.each([
    ['before', Date.UTC(2026, 8, 29, 12, 0, 0)],
    ['on', Date.UTC(2026, 8, 30, 12, 0, 0)],
    ['after', Date.UTC(2026, 9, 1, 12, 0, 0)],
  ])('saves with the same contract %s 30 September', async (_label, now) => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
    const t = makeRsvpTest()
    const invitation = await seedInvitation(t, {
      phone: '(79) 99999-8501',
      displayName: 'Convite Prazo Informativo',
      guests: [{ name: 'Pessoa', attendance: 'pending' }],
    })
    const token = opaqueToken((now / 1_000) % 4_000_000_000)
    await createTestSession(t, invitation.rsvpId, token)
    const view = await t.query(api.rsvps.getCurrent, { token })
    if (!view) {
      throw new Error('missing family view')
    }

    const result = await t.mutation(api.rsvps.saveResponses, {
      token,
      guestUpdates: [
        { guestRef: view.guests[0].guestRef, attendance: 'yes' },
      ],
      contact: { kind: 'unchanged' },
    })

    expect(result.kind).toBe('saved')
  })
})

describe('save privacy', () => {
  it('returns the same safe scoped view without IDs, phone, token, or another invitation contact', async () => {
    const t = makeRsvpTest()
    const invitationA = await seedInvitation(t, {
      phone: '(79) 99999-8601',
      displayName: 'Convite Privado A',
      contact: 'a@example.com',
      guests: [{ name: 'Pessoa A', attendance: 'pending' }],
    })
    const invitationB = await seedInvitation(t, {
      phone: '(79) 99999-8602',
      displayName: 'Convite Privado B',
      contact: 'segredo-b@example.com',
      guests: [{ name: 'Pessoa B', attendance: 'yes' }],
    })
    const tokenA = opaqueToken(1_600)
    const tokenB = opaqueToken(1_601)
    await createTestSession(t, invitationA.rsvpId, tokenA)
    await createTestSession(t, invitationB.rsvpId, tokenB)
    const viewA = await t.query(api.rsvps.getCurrent, { token: tokenA })
    const viewB = await t.query(api.rsvps.getCurrent, { token: tokenB })
    if (!viewA || !viewB) {
      throw new Error('missing family view')
    }

    const foreignResult = await t.mutation(api.rsvps.saveResponses, {
      token: tokenA,
      guestUpdates: [
        { guestRef: viewB.guests[0].guestRef, attendance: 'no' },
      ],
      contact: { kind: 'unchanged' },
    })
    const saved = await t.mutation(api.rsvps.saveResponses, {
      token: tokenA,
      guestUpdates: [
        { guestRef: viewA.guests[0].guestRef, attendance: 'yes' },
      ],
      contact: { kind: 'unchanged' },
    })

    expect(foreignResult).toEqual({ kind: 'invalid_update' })
    expect(saved.kind).toBe('saved')
    expect(collectForbiddenKeys(saved)).toEqual([])
    expect(JSON.stringify(saved)).not.toContain('segredo-b@example.com')
    expect(JSON.stringify(saved)).not.toContain('Pessoa B')
    expect(JSON.stringify(saved)).not.toContain(tokenA)
  })
})

describe('public RSVP monotonic revision', () => {
  it.each([
    ['equal clock', 40_000],
    ['backward clock', 30_000],
  ])('advances exactly once under %s', async (_label, saveAt) => {
    vi.useFakeTimers()
    vi.setSystemTime(40_000)
    const t = makeRsvpTest()
    const invitation = await seedInvitation(t, {
      phone: '(79) 99999-8701',
      displayName: 'Convite com revisão monotônica',
      guests: [{ name: 'Pessoa', attendance: 'pending' }],
    })
    const token = opaqueToken(saveAt)
    await createTestSession(t, invitation.rsvpId, token)
    const before = await t.query(api.rsvps.getCurrent, { token })
    if (!before) throw new Error('missing family view')

    vi.setSystemTime(saveAt)
    const saved = await t.mutation(api.rsvps.saveResponses, {
      token,
      guestUpdates: [
        { guestRef: before.guests[0].guestRef, attendance: 'yes' },
      ],
      contact: { kind: 'unchanged' },
    })

    expect(saved.kind).toBe('saved')
    if (saved.kind === 'saved') {
      expect(saved.view.updatedAt).toBe(before.updatedAt + 1)
    }
  })
})
