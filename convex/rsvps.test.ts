import rateLimiterTest from '@convex-dev/rate-limiter/test'
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { components, internal } from './_generated/api'
import { insertInvitation } from './rsvpInternal'
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
