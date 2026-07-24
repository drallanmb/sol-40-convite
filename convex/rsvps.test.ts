import rateLimiterTest from '@convex-dev/rate-limiter/test'
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, components, internal } from './_generated/api'
import { insertInvitation } from './rsvpInternal'
import { RSVP_SESSION_TTL_MS } from './rsvpModel'
import { RSVP_RATE_LIMITS } from './rsvpRateLimits'
import {
  hashLimiterKey,
  hashOpaqueToken,
  isSessionActive,
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
  const token = Buffer.alloc(32, 7).toString('base64url')

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
  const bytes = Buffer.alloc(32)
  bytes.writeUInt32BE(sequence >>> 0, 28)
  return bytes.toString('base64url')
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
        phone: '7998888777',
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
    const after = await t.run(async (ctx) => ({
      rsvps: await ctx.db.query('rsvps').collect(),
      guests: await ctx.db.query('rsvpGuests').collect(),
      sessions: await ctx.db.query('rsvpSessions').collect(),
    }))

    expect(malformed).toEqual({ kind: 'not_found' })
    expect(unknown).toEqual({ kind: 'not_found' })
    expect(ambiguous).toEqual({ kind: 'not_found' })
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
    const results = []
    const ddds = ['11', '21', '31', '41', '51', '61', '71', '81', '91', '99']

    for (let index = 1; index <= 121; index += 1) {
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
