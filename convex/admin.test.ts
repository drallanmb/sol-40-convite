import rateLimiterTest from '@convex-dev/rate-limiter/test'
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, internal } from './_generated/api'
import { ADMIN_SESSION_TTL_MS, isAdminSessionActive } from './adminModel'
import { ADMIN_RATE_LIMITS } from './adminRateLimits'
import {
  compareAdminPassword,
  hashAdminToken,
  requireAdminSession,
  validateAdminToken,
} from './adminSecurity'
import schema from './schema'

const modules = import.meta.glob(['./**/*.*s', '!./**/*.test.*s'])

function makeAdminTest() {
  const testInstance = convexTest(schema, modules)
  rateLimiterTest.register(testInstance)
  return testInstance
}

const TOKEN_A = 'A'.repeat(43)
const TOKEN_B = `${'B'.repeat(42)}E`
const previousPassword = process.env.ADMIN_PASSWORD

declare const process: {
  env: Record<string, string | undefined>
}

beforeEach(() => {
  process.env.ADMIN_PASSWORD = 'senha-de-teste-segura'
})

afterEach(() => {
  vi.useRealTimers()
  if (previousPassword === undefined) {
    delete process.env.ADMIN_PASSWORD
  } else {
    process.env.ADMIN_PASSWORD = previousPassword
  }
})

async function insertActiveAdminSession(
  t: ReturnType<typeof makeAdminTest>,
  token: string,
) {
  await t.run(async (ctx) => {
    await ctx.db.insert('adminSessions', {
      tokenHash: await hashAdminToken(token),
      createdAt: Date.now(),
      expiresAt: Date.now() + ADMIN_SESSION_TTL_MS,
    })
  })
}

async function insertOverviewWine(
  t: ReturnType<typeof makeAdminTest>,
  productCode: string,
  status: 'available' | 'gifted',
) {
  await t.run(async (ctx) => {
    await ctx.db.insert('wines', {
      productCode,
      name: `Vinho ${productCode}`,
      producer: 'Produtor',
      description: 'Descrição',
      tone: 'rubi',
      priceCents: 15_000,
      category: 'ate-200',
      palettePrimary: '#7A5148',
      paletteSecondary: '#B99A82',
      paletteReferenceUrl: 'https://example.com/reference',
      paletteReferencedAt: '2026-07-25',
      status,
      ...(status === 'gifted'
        ? { giftedBy: 'Convidada', giftedAt: Date.now() }
        : {}),
      updatedAt: Date.now(),
    })
  })
}

describe('admin session schema, hash and token boundaries', () => {
  it('stores only a token hash and timestamps', async () => {
    const t = makeAdminTest()
    const tokenHash = await hashAdminToken(TOKEN_A)

    const stored = await t.run(async (ctx) => {
      const sessionId = await ctx.db.insert('adminSessions', {
        tokenHash,
        createdAt: 1_000,
        expiresAt: 1_000 + ADMIN_SESSION_TTL_MS,
      })
      return ctx.db.get(sessionId)
    })

    expect(stored).toMatchObject({
      tokenHash,
      createdAt: 1_000,
      expiresAt: 1_000 + ADMIN_SESSION_TTL_MS,
    })
    expect(JSON.stringify(stored)).not.toContain(TOKEN_A)
    expect(stored).not.toHaveProperty('password')
  })

  it('accepts only canonical unpadded 32-byte base64url tokens', () => {
    expect(validateAdminToken(TOKEN_A)).toBe(true)
    expect(validateAdminToken(TOKEN_B)).toBe(true)
    expect(validateAdminToken('')).toBe(false)
    expect(validateAdminToken(TOKEN_A.slice(1))).toBe(false)
    expect(validateAdminToken(`${TOKEN_A}=`)).toBe(false)
    expect(validateAdminToken(`${TOKEN_A.slice(0, -1)}+`)).toBe(false)
    expect(validateAdminToken(`${'A'.repeat(42)}B`)).toBe(false)
  })

  it('hashes tokens deterministically without reflecting them', async () => {
    const hash = await hashAdminToken(TOKEN_A)

    expect(hash).toMatch(/^[a-f0-9]{64}$/u)
    expect(await hashAdminToken(TOKEN_A)).toBe(hash)
    expect(await hashAdminToken(TOKEN_B)).not.toBe(hash)
    expect(hash).not.toContain(TOKEN_A)
  })
})

describe('admin password comparison', () => {
  it('compares fixed-length digests and rejects wrong or missing configuration', async () => {
    await expect(compareAdminPassword('segredo', 'segredo')).resolves.toBe(true)
    await expect(compareAdminPassword('xegredo', 'segredo')).resolves.toBe(false)
    await expect(compareAdminPassword('segredx', 'segredo')).resolves.toBe(false)
    await expect(compareAdminPassword('qualquer', undefined)).resolves.toBe(false)
  })
})

describe('admin authorization boundary', () => {
  it('returns the same unauthorized result for missing, malformed, unknown and boundary-expired tokens', async () => {
    const t = makeAdminTest()
    const expiresAt = 10_000
    await t.run(async (ctx) => {
      await ctx.db.insert('adminSessions', {
        tokenHash: await hashAdminToken(TOKEN_A),
        createdAt: 1_000,
        expiresAt,
      })
    })

    const results = await t.run(async (ctx) =>
      Promise.all([
        requireAdminSession(ctx, '', expiresAt - 1),
        requireAdminSession(ctx, 'malformed', expiresAt - 1),
        requireAdminSession(ctx, TOKEN_B, expiresAt - 1),
        requireAdminSession(ctx, TOKEN_A, expiresAt),
        requireAdminSession(ctx, TOKEN_A, expiresAt + 1),
      ]),
    )

    expect(results).toEqual(
      Array.from({ length: 5 }, () => ({ kind: 'unauthorized' })),
    )
  })

  it('authorizes exactly before the boundary and never slides expiry', async () => {
    const t = makeAdminTest()
    const expiresAt = 10_000
    await t.run(async (ctx) => {
      await ctx.db.insert('adminSessions', {
        tokenHash: await hashAdminToken(TOKEN_A),
        createdAt: 1_000,
        expiresAt,
      })
    })

    const authorization = await t.run((ctx) =>
      requireAdminSession(ctx, TOKEN_A, expiresAt - 1),
    )

    expect(authorization.kind).toBe('authorized')
    if (authorization.kind === 'authorized') {
      expect(authorization.session.expiresAt).toBe(expiresAt)
    }
    expect(isAdminSessionActive(expiresAt, expiresAt - 1)).toBe(true)
    expect(isAdminSessionActive(expiresAt, expiresAt)).toBe(false)
    expect(isAdminSessionActive(expiresAt, expiresAt + 1)).toBe(false)
  })
})

describe('admin overview authorization matrix', () => {
  it('reveals no aggregate for malformed, unknown, expired or revoked sessions', async () => {
    const t = makeAdminTest()
    await t.run(async (ctx) => {
      await ctx.db.insert('rsvps', {
        phone: '79999990000',
        displayName: 'Família Protegida',
        updatedAt: Date.now(),
      })
      await ctx.db.insert('adminSessions', {
        tokenHash: await hashAdminToken(TOKEN_A),
        createdAt: 1,
        expiresAt: 2,
      })
    })

    for (const token of ['malformed', TOKEN_A, TOKEN_B]) {
      await expect(
        t.query(api.adminOverview.get, { token }),
      ).resolves.toEqual({ kind: 'unauthorized' })
    }

    await insertActiveAdminSession(t, TOKEN_B)
    await t.mutation(api.adminAuth.logout, { token: TOKEN_B })
    await expect(
      t.query(api.adminOverview.get, { token: TOKEN_B }),
    ).resolves.toEqual({ kind: 'unauthorized' })
  })
})

describe('admin overview familyCount, person count and badge aggregates', () => {
  it('distinguishes zero families from one zero-person family', async () => {
    const t = makeAdminTest()
    await insertActiveAdminSession(t, TOKEN_A)

    await expect(
      t.query(api.adminOverview.get, { token: TOKEN_A }),
    ).resolves.toMatchObject({
      kind: 'ready',
      familyCount: 0,
      confirmedCount: 0,
      refusedCount: 0,
      pendingCount: 0,
    })

    await t.run(async (ctx) => {
      await ctx.db.insert('rsvps', {
        phone: '79999990001',
        displayName: 'Família sem pessoas',
        updatedAt: Date.now(),
      })
    })

    await expect(
      t.query(api.adminOverview.get, { token: TOKEN_A }),
    ).resolves.toMatchObject({
      kind: 'ready',
      familyCount: 1,
      confirmedCount: 0,
      refusedCount: 0,
      pendingCount: 0,
    })
  })

  it('counts mixed-family attendance, memories, wines and badges from source rows', async () => {
    const t = makeAdminTest()
    await Promise.all([
      insertActiveAdminSession(t, TOKEN_A),
      insertActiveAdminSession(t, TOKEN_B),
    ])
    await t.run(async (ctx) => {
      const familyA = await ctx.db.insert('rsvps', {
        phone: '79999990002',
        displayName: 'Família A',
        updatedAt: Date.now(),
      })
      const familyB = await ctx.db.insert('rsvps', {
        phone: '79999990003',
        displayName: 'Família B',
        updatedAt: Date.now(),
      })
      for (const [rsvpId, attendance, sortOrder] of [
        [familyA, 'yes', 0],
        [familyA, 'pending', 1],
        [familyB, 'no', 0],
        [familyB, 'pending', 1],
        [familyB, 'yes', 2],
      ] as const) {
        await ctx.db.insert('rsvpGuests', {
          rsvpId,
          publicRef: `${rsvpId}-${sortOrder}`,
          name: `Pessoa ${sortOrder}`,
          attendance,
          sortOrder,
        })
      }
      await ctx.db.insert('posts', {
        message: 'Pendente',
        status: 'pendente',
        source: 'convidado',
        createdAt: Date.now(),
      })
      await ctx.db.insert('posts', {
        message: 'Aprovada',
        status: 'aprovado',
        source: 'convidado',
        createdAt: Date.now(),
      })
    })
    await insertOverviewWine(t, 'A', 'gifted')
    await insertOverviewWine(t, 'B', 'available')

    const expected = {
      kind: 'ready',
      familyCount: 2,
      confirmedCount: 2,
      refusedCount: 1,
      pendingCount: 2,
      pendingMemoryCount: 1,
      giftedWineCount: 1,
      totalWineCount: 2,
      badges: { guests: 2, memories: 1 },
    }
    await expect(
      t.query(api.adminOverview.get, { token: TOKEN_A }),
    ).resolves.toEqual(expected)
    await expect(
      t.query(api.adminOverview.get, { token: TOKEN_B }),
    ).resolves.toEqual(expected)

    await t.run(async (ctx) => {
      const pending = await ctx.db
        .query('rsvpGuests')
        .filter((query) => query.eq(query.field('attendance'), 'pending'))
        .first()
      if (!pending) throw new Error('missing pending source row')
      await ctx.db.patch(pending._id, { attendance: 'yes' })
    })

    for (const token of [TOKEN_A, TOKEN_B]) {
      await expect(
        t.query(api.adminOverview.get, { token }),
      ).resolves.toMatchObject({
        confirmedCount: 3,
        pendingCount: 1,
        badges: { guests: 1, memories: 1 },
      })
    }
  })
})

describe('admin login rate limit policy', () => {
  it('defines a conservative global fixed-window bucket', () => {
    expect(ADMIN_RATE_LIMITS.loginGlobal).toEqual({
      kind: 'fixed window',
      rate: 10,
      period: 15 * 60 * 1_000,
    })
  })
})

describe('admin login, status and logout lifecycle', () => {
  it('creates an absolute seven-day session and exposes no token or hash', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000)
    const t = makeAdminTest()

    const result = await t.mutation(api.adminAuth.login, {
      password: 'senha-de-teste-segura',
      token: TOKEN_A,
    })
    const stored = await t.run((ctx) =>
      ctx.db.query('adminSessions').collect(),
    )

    expect(result).toEqual({
      kind: 'authenticated',
      expiresAt: 1_000 + ADMIN_SESSION_TTL_MS,
    })
    expect(JSON.stringify(result)).not.toContain(TOKEN_A)
    expect(JSON.stringify(result)).not.toContain(stored[0].tokenHash)
    expect(stored).toHaveLength(1)
    expect(stored[0].createdAt).toBe(1_000)
    expect(stored[0].expiresAt).toBe(1_000 + ADMIN_SESSION_TTL_MS)
  })

  it('returns one credential error for wrong and unset server passwords', async () => {
    const wrong = makeAdminTest()
    await expect(
      wrong.mutation(api.adminAuth.login, {
        password: 'incorreta',
        token: TOKEN_A,
      }),
    ).resolves.toEqual({ kind: 'invalid_credentials' })

    delete process.env.ADMIN_PASSWORD
    const unset = makeAdminTest()
    await expect(
      unset.mutation(api.adminAuth.login, {
        password: 'senha-de-teste-segura',
        token: TOKEN_A,
      }),
    ).resolves.toEqual({ kind: 'invalid_credentials' })

    const counts = await Promise.all([
      wrong.run((ctx) => ctx.db.query('adminSessions').collect()),
      unset.run((ctx) => ctx.db.query('adminSessions').collect()),
    ])
    expect(counts).toEqual([[], []])
  })

  it('rejects token hash collisions without replacing the session', async () => {
    const t = makeAdminTest()
    const first = await t.mutation(api.adminAuth.login, {
      password: 'senha-de-teste-segura',
      token: TOKEN_A,
    })
    const second = await t.mutation(api.adminAuth.login, {
      password: 'senha-de-teste-segura',
      token: TOKEN_A,
    })

    expect(first.kind).toBe('authenticated')
    expect(second).toEqual({ kind: 'token_conflict' })
    expect(
      await t.run((ctx) => ctx.db.query('adminSessions').collect()),
    ).toHaveLength(1)
  })

  it('reports valid at N-1 and invalid at N/N+1 without sliding expiry', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(10_000)
    const t = makeAdminTest()
    const login = await t.mutation(api.adminAuth.login, {
      password: 'senha-de-teste-segura',
      token: TOKEN_A,
    })
    expect(login.kind).toBe('authenticated')
    if (login.kind !== 'authenticated') return

    vi.setSystemTime(login.expiresAt - 1)
    await expect(
      t.query(api.adminAuth.getSessionStatus, { token: TOKEN_A }),
    ).resolves.toEqual({ kind: 'valid', expiresAt: login.expiresAt })

    vi.setSystemTime(login.expiresAt)
    await expect(
      t.query(api.adminAuth.getSessionStatus, { token: TOKEN_A }),
    ).resolves.toEqual({ kind: 'invalid' })

    vi.setSystemTime(login.expiresAt + 1)
    await expect(
      t.query(api.adminAuth.getSessionStatus, { token: TOKEN_A }),
    ).resolves.toEqual({ kind: 'invalid' })
  })

  it('logs out idempotently and scheduled expiry remains idempotent afterward', async () => {
    const t = makeAdminTest()
    const login = await t.mutation(api.adminAuth.login, {
      password: 'senha-de-teste-segura',
      token: TOKEN_A,
    })
    expect(login.kind).toBe('authenticated')
    if (login.kind !== 'authenticated') return
    const [session] = await t.run((ctx) =>
      ctx.db.query('adminSessions').collect(),
    )

    await expect(
      t.mutation(api.adminAuth.logout, { token: TOKEN_A }),
    ).resolves.toEqual({ kind: 'logged_out' })
    await expect(
      t.mutation(api.adminAuth.logout, { token: TOKEN_A }),
    ).resolves.toEqual({ kind: 'logged_out' })
    await expect(
      t.mutation(internal.adminInternal.expireAdminSession, {
        sessionId: session._id,
        expectedExpiresAt: login.expiresAt,
      }),
    ).resolves.toEqual({ kind: 'ignored' })
    expect(
      await t.run((ctx) => ctx.db.query('adminSessions').collect()),
    ).toEqual([])
  })

  it('expires only the matching id and expected expiry', async () => {
    const t = makeAdminTest()
    const sessionId = await t.run(async (ctx) =>
      ctx.db.insert('adminSessions', {
        tokenHash: await hashAdminToken(TOKEN_A),
        createdAt: 1_000,
        expiresAt: 10_000,
      }),
    )

    await expect(
      t.mutation(internal.adminInternal.expireAdminSession, {
        sessionId,
        expectedExpiresAt: 9_999,
      }),
    ).resolves.toEqual({ kind: 'ignored' })
    await expect(
      t.mutation(internal.adminInternal.expireAdminSession, {
        sessionId,
        expectedExpiresAt: 10_000,
      }),
    ).resolves.toEqual({ kind: 'expired' })
    await expect(
      t.mutation(internal.adminInternal.expireAdminSession, {
        sessionId,
        expectedExpiresAt: 10_000,
      }),
    ).resolves.toEqual({ kind: 'ignored' })
  })

  it('rate limits before insertion and denied attempts create no sessions', async () => {
    const t = makeAdminTest()
    const attempts = []
    for (let index = 0; index < ADMIN_RATE_LIMITS.loginGlobal.rate + 1; index += 1) {
      attempts.push(
        await t.mutation(api.adminAuth.login, {
          password: 'incorreta',
          token: TOKEN_A,
        }),
      )
    }

    expect(attempts.slice(0, 10).every((result) =>
      result.kind === 'invalid_credentials')).toBe(true)
    expect(attempts[10]?.kind).toBe('rate_limited')
    expect(
      await t.run((ctx) => ctx.db.query('adminSessions').collect()),
    ).toEqual([])
  })

  it('runs the internal disposable smoke without leaving a capability', async () => {
    const t = makeAdminTest()
    const result = await t.mutation(
      internal.adminTest.smokeSessionLifecycle,
      {},
    )

    expect(result).toEqual({
      createdAndAuthorized: true,
      expiryResult: 'expired',
      repeatedExpiryResult: 'ignored',
      revokedAfterExpiry: true,
    })
    expect(JSON.stringify(result)).not.toContain('token')
    expect(
      await t.run((ctx) => ctx.db.query('adminSessions').collect()),
    ).toEqual([])
  })
})
