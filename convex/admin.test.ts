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
import {
  insertInvitation,
  purgeRsvpSessionsBatchHandler,
  type RsvpSessionPurgeCommand,
} from './rsvpInternal'
import {
  createRsvpSession,
  encodeOpaqueToken,
  hashOpaqueToken,
} from './rsvpSecurity'
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
  return t.run(async (ctx) => {
    return ctx.db.insert('wines', {
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

async function seedAdminFamily(
  t: ReturnType<typeof makeAdminTest>,
  phone = '(79) 99999-8101',
  guests: Array<{ name: string; attendance: 'pending' | 'yes' | 'no' }> = [
    { name: 'Pessoa inicial', attendance: 'pending' },
  ],
) {
  return t.mutation((ctx) =>
    insertInvitation(ctx, {
      phone,
      displayName: 'Família Operacional',
      contact: 'Contato inicial',
      guests,
    }),
  )
}

function deterministicRsvpToken(index: number) {
  const bytes = new Uint8Array(32)
  bytes[0] = Math.floor(index / 256)
  bytes[1] = index % 256
  bytes[31] = 91
  return encodeOpaqueToken(bytes)
}

async function insertHistoricalRsvpSessions(
  t: ReturnType<typeof makeAdminTest>,
  rsvpId: Awaited<ReturnType<typeof seedAdminFamily>>['rsvpId'],
  count: number,
  generation: number,
  tokenOffset = 0,
) {
  const tokens = Array.from({ length: count }, (_, index) =>
    deterministicRsvpToken(tokenOffset + index),
  )
  await t.run(async (ctx) => {
    for (const [index, token] of tokens.entries()) {
      await ctx.db.insert('rsvpSessions', {
        rsvpId,
        tokenHash: await hashOpaqueToken(token),
        generation,
        expiresAt: Date.now() + 60_000 + index,
        createdAt: Date.now() - 60_000,
      })
    }
  })
  return tokens
}

async function drainRsvpSessionPurge(
  t: ReturnType<typeof makeAdminTest>,
  rsvpId: Awaited<ReturnType<typeof seedAdminFamily>>['rsvpId'],
  command: RsvpSessionPurgeCommand,
) {
  let cursor: string | null = null
  let done = false
  let deleted = 0
  while (!done) {
    const result = await t.mutation((ctx) =>
      purgeRsvpSessionsBatchHandler(ctx, { rsvpId, cursor, command }),
    )
    deleted += result.deleted
    done = result.done
    cursor = result.nextCursor ?? null
  }
  return deleted
}

describe('admin family authorization matrix', () => {
  it('denies every family and guest endpoint uniformly without any write', async () => {
    const t = makeAdminTest()
    const seeded = await seedAdminFamily(t)
    const [guestId] = seeded.guestIds
    await t.run(async (ctx) => {
      await ctx.db.insert('adminSessions', {
        tokenHash: await hashAdminToken(TOKEN_A),
        createdAt: 1,
        expiresAt: 2,
      })
    })
    await insertActiveAdminSession(t, TOKEN_B)
    await t.mutation(api.adminAuth.logout, { token: TOKEN_B })

    const before = await t.run(async (ctx) => ({
      families: await ctx.db.query('rsvps').collect(),
      guests: await ctx.db.query('rsvpGuests').collect(),
      sessions: await ctx.db.query('rsvpSessions').collect(),
    }))
    const calls = [
      (token: string) => t.query(api.adminRsvps.listFamilies, { token }),
      (token: string) =>
        t.mutation(api.adminRsvps.createFamily, {
          token,
          displayName: 'Não criar',
          phone: '(79) 99999-8199',
          guests: [],
        }),
      (token: string) =>
        t.mutation(api.adminRsvps.updateFamily, {
          token,
          familyId: seeded.rsvpId,
          expectedUpdatedAt: 0,
          patch: { displayName: 'Não editar' },
        }),
      (token: string) =>
        t.mutation(api.adminRsvps.addGuest, {
          token,
          familyId: seeded.rsvpId,
          expectedUpdatedAt: 0,
          name: 'Não adicionar',
          attendance: 'pending',
        }),
      (token: string) =>
        t.mutation(api.adminRsvps.updateGuest, {
          token,
          familyId: seeded.rsvpId,
          guestId,
          expectedUpdatedAt: 0,
          patch: { name: 'Não editar' },
        }),
      (token: string) =>
        t.mutation(api.adminRsvps.removeGuest, {
          token,
          familyId: seeded.rsvpId,
          guestId,
          expectedUpdatedAt: 0,
        }),
      (token: string) =>
        t.mutation(api.adminRsvps.removeFamily, {
          token,
          familyId: seeded.rsvpId,
          expectedUpdatedAt: 0,
        }),
    ]

    for (const token of ['malformed', TOKEN_A, TOKEN_B]) {
      for (const call of calls) {
        await expect(call(token)).resolves.toEqual({ kind: 'unauthorized' })
      }
    }
    const after = await t.run(async (ctx) => ({
      families: await ctx.db.query('rsvps').collect(),
      guests: await ctx.db.query('rsvpGuests').collect(),
      sessions: await ctx.db.query('rsvpSessions').collect(),
    }))
    expect(after).toEqual(before)
  })
})

describe('admin csv import tracer', () => {
  const tracerGroups = [
    {
      sourceRows: [2, 3],
      displayName: 'Família Horizonte',
      phone: '(79) 99999-4101',
      guests: [
        { sourceRow: 2, name: 'Ana Horizonte' },
        { sourceRow: 3, name: 'Beto Horizonte' },
      ],
    },
  ]

  it('requires authorization before importing any family', async () => {
    const t = makeAdminTest()
    await t.run(async (ctx) => {
      await ctx.db.insert('adminSessions', {
        tokenHash: await hashAdminToken(TOKEN_A),
        createdAt: 1,
        expiresAt: 2,
      })
    })
    await insertActiveAdminSession(t, TOKEN_B)
    await t.mutation(api.adminAuth.logout, { token: TOKEN_B })

    for (const token of ['', 'malformed', TOKEN_A, TOKEN_B]) {
      await expect(
        t.mutation(api.adminRsvps.importFamilies, {
          token,
          groups: tracerGroups,
        }),
      ).resolves.toEqual({ kind: 'unauthorized' })
    }

    expect(
      await t.run((ctx) => ctx.db.query('rsvps').collect()),
    ).toEqual([])
  })

  it('imports a fictitious csv family with pending-only guests', async () => {
    const t = makeAdminTest()
    await insertActiveAdminSession(t, TOKEN_A)

    const result = await t.mutation(api.adminRsvps.importFamilies, {
      token: TOKEN_A,
      groups: tracerGroups,
    })

    expect(result).toMatchObject({
      kind: 'ready',
      created: [
        {
          sourceRows: [2, 3],
          displayName: 'Família Horizonte',
          people: 2,
        },
      ],
      ignored: [],
    })
    expect(JSON.stringify(result)).not.toMatch(
      /token|password|session|hash|79999994101/iu,
    )

    const stored = await t.run(async (ctx) => ({
      families: await ctx.db.query('rsvps').collect(),
      guests: await ctx.db.query('rsvpGuests').collect(),
    }))
    expect(stored.families).toHaveLength(1)
    expect(stored.guests).toHaveLength(2)
    expect(stored.guests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Ana Horizonte',
          attendance: 'pending',
        }),
        expect.objectContaining({
          name: 'Beto Horizonte',
          attendance: 'pending',
        }),
      ]),
    )
    for (const guest of stored.guests) {
      expect(guest).not.toHaveProperty('respondedAt')
    }
  })

  it('rejects csv import batches beyond family or people limits', async () => {
    const t = makeAdminTest()
    await insertActiveAdminSession(t, TOKEN_A)
    const family = (index: number, people = 1) => ({
      sourceRows: [index + 2],
      displayName: `Família Fictícia ${index}`,
      phone: `(79) 99${String(index).padStart(3, '0')}-4101`,
      guests: Array.from({ length: people }, (_, guestIndex) => ({
        sourceRow: index + guestIndex + 2,
        name: `Pessoa Fictícia ${index}-${guestIndex}`,
      })),
    })

    await expect(
      t.mutation(api.adminRsvps.importFamilies, {
        token: TOKEN_A,
        groups: Array.from({ length: 26 }, (_, index) => family(index)),
      }),
    ).rejects.toThrow(/25 famílias/iu)
    await expect(
      t.mutation(api.adminRsvps.importFamilies, {
        token: TOKEN_A,
        groups: [family(0, 51), family(1, 50)],
      }),
    ).rejects.toThrow(/100 pessoas/iu)
  })

  it('keeps valid csv families while reporting invalid and existing phones by source row', async () => {
    const t = makeAdminTest()
    await insertActiveAdminSession(t, TOKEN_A)
    const existing = await t.mutation((ctx) =>
      insertInvitation(ctx, {
        displayName: 'Família Existente',
        phone: '(79) 9999-4301',
        contact: 'Contato preservado',
        guests: [{ name: 'Pessoa Existente', attendance: 'yes' }],
      }),
    )

    const result = await t.mutation(api.adminRsvps.importFamilies, {
      token: TOKEN_A,
      groups: [
        {
          sourceRows: [2],
          displayName: 'Família Nova',
          phone: '(79) 99999-4302',
          guests: [{ sourceRow: 2, name: 'Pessoa Nova' }],
        },
        {
          sourceRows: [3],
          displayName: 'Família Tentativa',
          phone: '(79) 99999-4301',
          guests: [{ sourceRow: 3, name: 'Não Sobrescrever' }],
        },
        {
          sourceRows: [4],
          displayName: '',
          phone: '(79) 99999-4303',
          guests: [{ sourceRow: 4, name: 'Inválida' }],
        },
      ],
    })

    expect(result).toMatchObject({
      kind: 'ready',
      created: [
        expect.objectContaining({
          sourceRows: [2],
          displayName: 'Família Nova',
        }),
      ],
      ignored: expect.arrayContaining([
        expect.objectContaining({
          sourceRows: [3],
          code: 'existing_phone',
        }),
        expect.objectContaining({
          sourceRows: [4],
          code: 'invalid_family',
        }),
      ]),
    })
    const unchanged = await t.run(async (ctx) => ({
      family: await ctx.db.get(existing.rsvpId),
      guests: await ctx.db
        .query('rsvpGuests')
        .withIndex('by_rsvp', (index) => index.eq('rsvpId', existing.rsvpId))
        .collect(),
    }))
    expect(unchanged.family).toMatchObject({
      displayName: 'Família Existente',
      contact: 'Contato preservado',
    })
    expect(unchanged.guests).toEqual([
      expect.objectContaining({
        name: 'Pessoa Existente',
        attendance: 'yes',
      }),
    ])
  })

  it('rejects every incompatible family sharing one logical phone in a tampered batch', async () => {
    const t = makeAdminTest()
    await insertActiveAdminSession(t, TOKEN_A)

    const result = await t.mutation(api.adminRsvps.importFamilies, {
      token: TOKEN_A,
      groups: [
        {
          sourceRows: [2],
          displayName: 'Família Norte',
          phone: '(79) 9999-4304',
          guests: [{ sourceRow: 2, name: 'Pessoa Norte' }],
        },
        {
          sourceRows: [3],
          displayName: 'Família Sul',
          phone: '(79) 99999-4304',
          guests: [{ sourceRow: 3, name: 'Pessoa Sul' }],
        },
      ],
    })

    expect(result).toMatchObject({
      kind: 'ready',
      created: [],
      ignored: [
        expect.objectContaining({
          sourceRows: [2],
          code: 'phone_family_conflict',
        }),
        expect.objectContaining({
          sourceRows: [3],
          code: 'phone_family_conflict',
        }),
      ],
    })
    expect(
      await t.run((ctx) => ctx.db.query('rsvps').collect()),
    ).toEqual([])
  })

  it('treats replay as existing_phone and concurrent imports create one logical invitation', async () => {
    const t = makeAdminTest()
    await Promise.all([
      insertActiveAdminSession(t, TOKEN_A),
      insertActiveAdminSession(t, TOKEN_B),
    ])
    const group = {
      sourceRows: [2],
      displayName: 'Família Concorrente',
      phone: '(79) 9999-4305',
      guests: [{ sourceRow: 2, name: 'Pessoa Concorrente' }],
    }

    const [first, second] = await Promise.all([
      t.mutation(api.adminRsvps.importFamilies, {
        token: TOKEN_A,
        groups: [group],
      }),
      t.mutation(api.adminRsvps.importFamilies, {
        token: TOKEN_B,
        groups: [{ ...group, phone: '(79) 99999-4305' }],
      }),
    ])
    expect(
      [first, second].filter(
        (result) => result.kind === 'ready' && result.created.length === 1,
      ),
    ).toHaveLength(1)
    expect(
      [first, second].filter(
        (result) =>
          result.kind === 'ready' &&
          result.ignored.some((issue) => issue.code === 'existing_phone'),
      ),
    ).toHaveLength(1)

    const replay = await t.mutation(api.adminRsvps.importFamilies, {
      token: TOKEN_A,
      groups: [group],
    })
    expect(replay).toMatchObject({
      kind: 'ready',
      created: [],
      ignored: [expect.objectContaining({ code: 'existing_phone' })],
    })
    expect(
      await t.run((ctx) => ctx.db.query('rsvps').collect()),
    ).toHaveLength(1)
  })

  it('rejects duplicate guests and attendance fields in untrusted mutation args', async () => {
    const t = makeAdminTest()
    await insertActiveAdminSession(t, TOKEN_A)
    await expect(
      t.mutation(api.adminRsvps.importFamilies, {
        token: TOKEN_A,
        groups: [
          {
            sourceRows: [2, 3],
            displayName: 'Família Duplicada',
            phone: '(79) 99999-4306',
            guests: [
              { sourceRow: 2, name: 'Pessoa Igual' },
              { sourceRow: 3, name: ' pessoa   igual ' },
            ],
          },
        ],
      }),
    ).resolves.toMatchObject({
      kind: 'ready',
      created: [],
      ignored: [expect.objectContaining({ code: 'invalid_guest' })],
    })

    await expect(
      t.mutation(api.adminRsvps.importFamilies, {
        token: TOKEN_A,
        groups: [
          {
            sourceRows: [4, 5],
            displayName: 'Família Linhas Incompatíveis',
            phone: '(79) 99999-4308',
            guests: [
              { sourceRow: 4, name: 'Pessoa Linha Um' },
              { sourceRow: 4, name: 'Pessoa Linha Dois' },
            ],
          },
        ],
      }),
    ).resolves.toMatchObject({
      kind: 'ready',
      created: [],
      ignored: [expect.objectContaining({ code: 'invalid_guest' })],
    })

    await expect(
      t.mutation(api.adminRsvps.importFamilies, {
        token: TOKEN_A,
        groups: [
          {
            sourceRows: [4],
            displayName: 'Família Presença',
            phone: '(79) 99999-4307',
            guests: [
              {
                sourceRow: 4,
                name: 'Pessoa Presença',
                attendance: 'yes',
              },
            ],
          },
        ],
      } as any),
    ).rejects.toThrow(/extra field|attendance/iu)
  })
})

describe('admin post moderation, revision conflict and public album', () => {
  const adminPosts = (api as any).adminPosts

  async function insertPost(
    t: ReturnType<typeof makeAdminTest>,
    values: {
      status?: 'pendente' | 'aprovado' | 'oculto'
      createdAt: number
      moderatedAt?: number
      moderationRevision?: number
      message: string
    },
  ) {
    return t.run((ctx) =>
      ctx.db.insert('posts', {
        message: values.message,
        status: values.status ?? 'pendente',
        source: 'convidado',
        createdAt: values.createdAt,
        ...(values.moderatedAt === undefined
          ? {}
          : { moderatedAt: values.moderatedAt }),
        ...(values.moderationRevision === undefined
          ? {}
          : { moderationRevision: values.moderationRevision }),
      }),
    )
  }

  it('denies the invalid-session matrix before projecting protected post data', async () => {
    const t = makeAdminTest()
    await insertPost(t, {
      createdAt: 1,
      message: 'conteúdo protegido pendente',
    })
    await t.run(async (ctx) =>
      ctx.db.insert('adminSessions', {
        tokenHash: await hashAdminToken(TOKEN_A),
        createdAt: 0,
        expiresAt: 0,
      }),
    )
    await insertActiveAdminSession(t, TOKEN_B)

    for (const token of ['malformed', TOKEN_A, `${'C'.repeat(42)}Q`]) {
      await expect(
        t.query(adminPosts.listByStatus, { token, status: 'pendente' }),
      ).resolves.toEqual({ kind: 'unauthorized' })
      await expect(
        t.mutation(adminPosts.transitionPost, {
          token,
          postId: await insertPost(t, {
            createdAt: 2,
            message: 'não alterar',
          }),
          expectedStatus: 'pendente',
          expectedRevision: 0,
          targetStatus: 'aprovado',
        }),
      ).resolves.toEqual({ kind: 'unauthorized' })
    }
  })

  it('orders pending oldest first and treats legacy revision absence as zero', async () => {
    const t = makeAdminTest()
    await insertActiveAdminSession(t, TOKEN_A)
    const second = await insertPost(t, { createdAt: 200, message: 'segunda' })
    const first = await insertPost(t, { createdAt: 100, message: 'primeira' })

    const listed = await t.query(adminPosts.listByStatus, {
      token: TOKEN_A,
      status: 'pendente',
    })
    expect(listed.kind).toBe('ready')
    expect(listed.posts.map((post: any) => post.id)).toEqual([first, second])
    expect(listed.posts.map((post: any) => post.moderationRevision)).toEqual([
      0, 0,
    ])
  })

  it('allows only the D-20 transition matrix and keeps the public album approved-only', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(10_000)
    const t = makeAdminTest()
    await insertActiveAdminSession(t, TOKEN_A)
    const postId = await insertPost(t, {
      createdAt: 1,
      message: 'reativa',
    })
    expect(
      (await t.query(api.posts.listApproved, {})).some(
        (post) => post.id === postId,
      ),
    ).toBe(false)

    for (const [from, target, allowed] of [
      ['pendente', 'aprovado', true],
      ['pendente', 'oculto', true],
      ['aprovado', 'oculto', true],
      ['oculto', 'aprovado', true],
      ['aprovado', 'pendente', false],
      ['oculto', 'pendente', false],
      ['aprovado', 'aprovado', false],
    ] as const) {
      const isolatedId = await insertPost(t, {
        status: from,
        createdAt: 2,
        moderationRevision: 4,
        message: `${from}-${target}`,
      })
      const result = await t.mutation(adminPosts.transitionPost, {
        token: TOKEN_A,
        postId: isolatedId,
        expectedStatus: from,
        expectedRevision: 4,
        targetStatus: target,
      })
      expect(result.kind).toBe(allowed ? 'updated' : 'invalid_transition')
    }

    const approved = await t.mutation(adminPosts.transitionPost, {
      token: TOKEN_A,
      postId,
      expectedStatus: 'pendente',
      expectedRevision: 0,
      targetStatus: 'aprovado',
    })
    expect(approved).toMatchObject({
      kind: 'updated',
      post: { status: 'aprovado', moderationRevision: 1 },
    })
    expect(
      (await t.query(api.posts.listApproved, {})).find(
        (post) => post.id === postId,
      ),
    ).toMatchObject({ id: postId, message: 'reativa' })
    const hidden = await t.mutation(adminPosts.transitionPost, {
      token: TOKEN_A,
      postId,
      expectedStatus: 'aprovado',
      expectedRevision: 1,
      targetStatus: 'oculto',
    })
    expect(hidden).toMatchObject({
      kind: 'updated',
      post: { status: 'oculto', moderationRevision: 2 },
    })
    expect(
      (await t.query(api.posts.listApproved, {})).some(
        (post) => post.id === postId,
      ),
    ).toBe(false)
  })

  it('undoes the exact action but rejects stale and ABA revisions without writing', async () => {
    const t = makeAdminTest()
    await Promise.all([
      insertActiveAdminSession(t, TOKEN_A),
      insertActiveAdminSession(t, TOKEN_B),
    ])
    const postId = await insertPost(t, {
      status: 'oculto',
      createdAt: 1,
      moderationRevision: 5,
      message: 'concorrente',
    })

    const action = await t.mutation(adminPosts.transitionPost, {
      token: TOKEN_A,
      postId,
      expectedStatus: 'oculto',
      expectedRevision: 5,
      targetStatus: 'aprovado',
    })
    expect(action).toMatchObject({
      kind: 'updated',
      post: { moderationRevision: 6 },
    })
    const immediateUndo = await t.mutation(adminPosts.undoPost, {
      token: TOKEN_A,
      postId,
      priorStatus: 'oculto',
      expectedStatus: 'aprovado',
      expectedRevision: 6,
    })
    expect(immediateUndo).toMatchObject({
      kind: 'updated',
      post: { status: 'oculto', moderationRevision: 7 },
    })

    await t.mutation(adminPosts.transitionPost, {
      token: TOKEN_B,
      postId,
      expectedStatus: 'oculto',
      expectedRevision: 7,
      targetStatus: 'aprovado',
    })
    await t.mutation(adminPosts.transitionPost, {
      token: TOKEN_B,
      postId,
      expectedStatus: 'aprovado',
      expectedRevision: 8,
      targetStatus: 'oculto',
    })
    await t.mutation(adminPosts.transitionPost, {
      token: TOKEN_B,
      postId,
      expectedStatus: 'oculto',
      expectedRevision: 9,
      targetStatus: 'aprovado',
    })
    const stale = await t.mutation(adminPosts.undoPost, {
      token: TOKEN_A,
      postId,
      priorStatus: 'oculto',
      expectedStatus: 'aprovado',
      expectedRevision: 8,
    })
    expect(stale).toMatchObject({
      kind: 'conflict',
      post: { status: 'aprovado', moderationRevision: 10 },
    })
    const stored = await t.run((ctx) => ctx.db.get(postId))
    expect(stored).toMatchObject({
      status: 'aprovado',
      moderationRevision: 10,
    })
  })
})

describe('admin wine gift authorization, atomic revisions and public catalog', () => {
  const adminWines = (api as any).adminWines

  it('denies all protected wine operations before attribution access', async () => {
    const t = makeAdminTest()
    const wineId = await insertOverviewWine(t, 'admin-auth-wine', 'available')
    for (const token of ['malformed', TOKEN_A, TOKEN_B]) {
      await expect(t.query(adminWines.listAdmin, { token })).resolves.toEqual({
        kind: 'unauthorized',
      })
      await expect(
        t.mutation(adminWines.markGifted, {
          token,
          wineId,
          expectedUpdatedAt: 0,
          giftedBy: 'Protegida',
        }),
      ).resolves.toEqual({ kind: 'unauthorized' })
      await expect(
        t.mutation(adminWines.makeAvailable, {
          token,
          wineId,
          expectedUpdatedAt: 0,
        }),
      ).resolves.toEqual({ kind: 'unauthorized' })
    }
  })

  it('requires a trimmed presenter and writes server time atomically', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(20_000)
    const t = makeAdminTest()
    await insertActiveAdminSession(t, TOKEN_A)
    const wineId = await insertOverviewWine(t, 'admin-gift-wine', 'available')
    const before = await t.run((ctx) => ctx.db.get(wineId))
    if (!before) throw new Error('missing wine')

    await expect(
      t.mutation(adminWines.markGifted, {
        token: TOKEN_A,
        wineId,
        expectedUpdatedAt: before.updatedAt,
        giftedBy: '   ',
      }),
    ).resolves.toEqual({
      kind: 'invalid',
      message: 'Informe o nome de quem presenteou.',
    })
    const marked = await t.mutation(adminWines.markGifted, {
      token: TOKEN_A,
      wineId,
      expectedUpdatedAt: before.updatedAt,
      giftedBy: '  Ágata  ',
    })
    expect(marked).toMatchObject({
      kind: 'updated',
      wine: {
        status: 'gifted',
        giftedBy: 'Ágata',
        giftedAt: 20_000,
        updatedAt: before.updatedAt + 1,
      },
    })
  })

  it('clears attribution together and rejects stale/ABA gift commands', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(30_000)
    const t = makeAdminTest()
    await Promise.all([
      insertActiveAdminSession(t, TOKEN_A),
      insertActiveAdminSession(t, TOKEN_B),
    ])
    const wineId = await insertOverviewWine(t, 'admin-aba-wine', 'available')
    const original = await t.run((ctx) => ctx.db.get(wineId))
    if (!original) throw new Error('missing wine')
    const marked = await t.mutation(adminWines.markGifted, {
      token: TOKEN_A,
      wineId,
      expectedUpdatedAt: original.updatedAt,
      giftedBy: 'Primeira',
    })
    if (marked.kind !== 'updated') throw new Error('mark failed')
    const available = await t.mutation(adminWines.makeAvailable, {
      token: TOKEN_B,
      wineId,
      expectedUpdatedAt: marked.wine.updatedAt,
    })
    expect(available).toMatchObject({
      kind: 'updated',
      wine: { status: 'available' },
    })
    if (available.kind === 'updated') {
      expect(available.wine).not.toHaveProperty('giftedBy')
      expect(available.wine).not.toHaveProperty('giftedAt')
    }
    if (available.kind !== 'updated') throw new Error('unmark failed')
    const remarked = await t.mutation(adminWines.markGifted, {
      token: TOKEN_B,
      wineId,
      expectedUpdatedAt: available.wine.updatedAt,
      giftedBy: 'Mais recente',
    })
    expect(remarked.kind).toBe('updated')
    const stale = await t.mutation(adminWines.makeAvailable, {
      token: TOKEN_A,
      wineId,
      expectedUpdatedAt: marked.wine.updatedAt,
    })
    expect(stale).toMatchObject({
      kind: 'conflict',
      wine: { status: 'gifted', giftedBy: 'Mais recente' },
    })
  })

  it('keeps public catalog reactive and omits presenter, time and revision', async () => {
    const t = makeAdminTest()
    await insertActiveAdminSession(t, TOKEN_A)
    await t.mutation(internal.wineInternal.ensureWineCatalog, {})
    const listed = await t.query(adminWines.listAdmin, { token: TOKEN_A })
    if (listed.kind !== 'ready') throw new Error('missing admin catalog')
    const wine = listed.wines[0]
    const marked = await t.mutation(adminWines.markGifted, {
      token: TOKEN_A,
      wineId: wine.id,
      expectedUpdatedAt: wine.updatedAt,
      giftedBy: 'Nome privado',
    })
    expect(marked.kind).toBe('updated')
    const publicWine = (await t.query(api.wines.listCatalog, {})).find(
      (item) => item.productCode === wine.productCode,
    )
    expect(publicWine?.status).toBe('gifted')
    expect(publicWine).not.toHaveProperty('giftedBy')
    expect(publicWine).not.toHaveProperty('giftedAt')
    expect(publicWine).not.toHaveProperty('updatedAt')
  })

  it('restores bounded moderation and gift smoke fixtures in finally', async () => {
    const t = makeAdminTest()
    await expect(
      t.mutation(internal.adminTest.smokeModerationAndGift, {}),
    ).resolves.toEqual({
      moderationTransitioned: true,
      giftTransitioned: true,
      fixturesBounded: true,
    })
    const remaining = await t.run(async (ctx) => ({
      posts: (await ctx.db.query('posts').collect()).filter(
        (post) => post.message === 'Smoke admin moderation 06-04',
      ),
      wines: (await ctx.db.query('wines').collect()).filter(
        (wine) => wine.giftedBy === 'Smoke admin gift 06-04',
      ),
    }))
    expect(remaining).toEqual({ posts: [], wines: [] })
  })
})

describe('admin family and guest operations', () => {
  it('creates, lists, edits, adds to and removes a zero-person family', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(10_000)
    const t = makeAdminTest()
    await insertActiveAdminSession(t, TOKEN_A)

    const created = await t.mutation(api.adminRsvps.createFamily, {
      token: TOKEN_A,
      displayName: 'Família sem pessoas',
      phone: '(79) 99999-8201',
      guests: [],
    })
    expect(created.kind).toBe('saved')
    if (created.kind !== 'saved') return
    expect(created.family.guests).toEqual([])
    expect(
      await t.query(api.adminRsvps.listFamilies, { token: TOKEN_A }),
    ).toMatchObject({
      kind: 'ready',
      families: [expect.objectContaining({ id: created.family.id, guests: [] })],
    })

    vi.setSystemTime(9_000)
    const edited = await t.mutation(api.adminRsvps.updateFamily, {
      token: TOKEN_A,
      familyId: created.family.id,
      expectedUpdatedAt: created.family.updatedAt,
      patch: { displayName: 'Família editada' },
    })
    expect(edited.kind).toBe('saved')
    if (edited.kind !== 'saved') return
    expect(edited.family.updatedAt).toBe(created.family.updatedAt + 1)

    const added = await t.mutation(api.adminRsvps.addGuest, {
      token: TOKEN_A,
      familyId: edited.family.id,
      expectedUpdatedAt: edited.family.updatedAt,
      name: 'Pessoa adicionada',
      attendance: 'yes',
    })
    expect(added.kind).toBe('saved')
    if (added.kind !== 'saved') return
    expect(added.family.updatedAt).toBe(edited.family.updatedAt + 1)
    expect(added.family.guests[0]).toMatchObject({
      name: 'Pessoa adicionada',
      attendance: 'yes',
      publicRef: expect.stringMatching(/^guest_[a-f0-9]{32}$/u),
    })

    const updatedPerson = await t.mutation(api.adminRsvps.updateGuest, {
      token: TOKEN_A,
      familyId: added.family.id,
      guestId: added.family.guests[0].id,
      expectedUpdatedAt: added.family.updatedAt,
      patch: { name: 'Pessoa corrigida', attendance: 'no' },
    })
    expect(updatedPerson.kind).toBe('saved')
    if (updatedPerson.kind !== 'saved') return
    expect(updatedPerson.family.updatedAt).toBe(added.family.updatedAt + 1)
    expect(updatedPerson.family.guests[0]).toMatchObject({
      name: 'Pessoa corrigida',
      attendance: 'no',
      publicRef: added.family.guests[0].publicRef,
    })

    const removedPerson = await t.mutation(api.adminRsvps.removeGuest, {
      token: TOKEN_A,
      familyId: updatedPerson.family.id,
      guestId: updatedPerson.family.guests[0].id,
      expectedUpdatedAt: updatedPerson.family.updatedAt,
    })
    expect(removedPerson.kind).toBe('saved')
    if (removedPerson.kind !== 'saved') return
    expect(removedPerson.family.guests).toEqual([])
    expect(removedPerson.family.updatedAt).toBe(
      updatedPerson.family.updatedAt + 1,
    )

    await expect(
      t.mutation(api.adminRsvps.removeFamily, {
        token: TOKEN_A,
        familyId: removedPerson.family.id,
        expectedUpdatedAt: removedPerson.family.updatedAt,
      }),
    ).resolves.toEqual({ kind: 'removed' })
  })

  it('keeps public refs stable, revokes only on logical phone change and cascades sessions', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(20_000)
    const t = makeAdminTest()
    await insertActiveAdminSession(t, TOKEN_A)
    const seeded = await seedAdminFamily(t, '(79) 99999-8301')
    const before = await t.query(api.adminRsvps.listFamilies, { token: TOKEN_A })
    if (before.kind !== 'ready') throw new Error('missing family')
    const family = before.families[0]
    const publicRef = family.guests[0].publicRef
    const publicToken = 'C'.repeat(42) + 'I'
    await t.mutation((ctx) =>
      createRsvpSession(ctx, { rsvpId: seeded.rsvpId, token: publicToken }),
    )

    const samePhone = await t.mutation(api.adminRsvps.updateFamily, {
      token: TOKEN_A,
      familyId: family.id,
      expectedUpdatedAt: family.updatedAt,
      patch: { phone: '+55 79 99999-8301' },
    })
    expect(samePhone.kind).toBe('saved')
    expect(await t.query(api.rsvps.getCurrent, { token: publicToken })).not.toBeNull()
    if (samePhone.kind !== 'saved') return
    expect(samePhone.family.guests[0].publicRef).toBe(publicRef)

    const changed = await t.mutation(api.adminRsvps.updateFamily, {
      token: TOKEN_A,
      familyId: samePhone.family.id,
      expectedUpdatedAt: samePhone.family.updatedAt,
      patch: { phone: '(79) 99999-8302' },
    })
    expect(changed.kind).toBe('saved')
    expect(await t.query(api.rsvps.getCurrent, { token: publicToken })).toBeNull()
    if (changed.kind !== 'saved') return
    expect(changed.family.guests[0].publicRef).toBe(publicRef)
    await expect(
      t.mutation(api.adminRsvps.removeFamily, {
        token: TOKEN_A,
        familyId: changed.family.id,
        expectedUpdatedAt: changed.family.updatedAt,
      }),
    ).resolves.toEqual({ kind: 'removed' })
    await drainRsvpSessionPurge(t, changed.family.id, { kind: 'deleteAll' })
    const remaining = await t.run(async (ctx) => ({
      family: await ctx.db.get(changed.family.id),
      guests: await ctx.db
        .query('rsvpGuests')
        .withIndex('by_rsvp', (index) => index.eq('rsvpId', changed.family.id))
        .collect(),
      sessions: await ctx.db
        .query('rsvpSessions')
        .withIndex('by_rsvp', (index) => index.eq('rsvpId', changed.family.id))
        .collect(),
    }))
    expect(remaining).toEqual({ family: null, guests: [], sessions: [] })
  })

  it('does not revoke a legacy-phone session when only its equivalent formatting changes', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(25_000)
    const t = makeAdminTest()
    await insertActiveAdminSession(t, TOKEN_A)
    const familyId = await t.run((ctx) =>
      ctx.db.insert('rsvps', {
        phone: '7999998303',
        displayName: 'Família com telefone legado',
        updatedAt: 1_000,
      }),
    )
    const publicToken = `${'E'.repeat(42)}U`
    await t.mutation((ctx) => createRsvpSession(ctx, { rsvpId: familyId, token: publicToken }))
    const before = await t.run(async (ctx) => ({
      family: await ctx.db.get(familyId),
      scheduled: await ctx.db.system.query('_scheduled_functions').collect(),
    }))

    const result = await t.mutation(api.adminRsvps.updateFamily, {
      token: TOKEN_A,
      familyId,
      expectedUpdatedAt: 1_000,
      patch: { phone: '(79) 99999-8303' },
    })

    expect(result.kind).toBe('saved')
    expect(await t.query(api.rsvps.getCurrent, { token: publicToken })).not.toBeNull()
    const after = await t.run(async (ctx) => ({
      family: await ctx.db.get(familyId),
      scheduled: await ctx.db.system.query('_scheduled_functions').collect(),
    }))
    expect(after.family?.generation ?? 0).toBe(before.family?.generation ?? 0)
    expect(after.scheduled).toHaveLength(before.scheduled.length)
  })

  it('revokes 160 historical sessions immediately and purges only older generations', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(30_000)
    const t = makeAdminTest()
    await insertActiveAdminSession(t, TOKEN_A)
    const seeded = await seedAdminFamily(t, '(79) 99999-8501')
    const oldTokens = await insertHistoricalRsvpSessions(t, seeded.rsvpId, 160, 0)
    const before = await t.query(api.adminRsvps.listFamilies, { token: TOKEN_A })
    if (before.kind !== 'ready') throw new Error('missing family')

    const changed = await t.mutation(api.adminRsvps.updateFamily, {
      token: TOKEN_A,
      familyId: seeded.rsvpId,
      expectedUpdatedAt: before.families[0].updatedAt,
      patch: { phone: '(79) 99999-8502' },
    })

    expect(changed.kind).toBe('saved')
    expect(
      await t.run((ctx) =>
        ctx.db
          .query('rsvpSessions')
          .withIndex('by_rsvp', (index) => index.eq('rsvpId', seeded.rsvpId))
          .collect(),
      ),
    ).toHaveLength(160)
    for (const token of oldTokens) {
      expect(await t.query(api.rsvps.getCurrent, { token })).toBeNull()
    }
    expect(
      await t.run(async (ctx) => (await ctx.db.get(seeded.rsvpId))?.generation),
    ).toBe(1)
    const purgeJob = await t.run((ctx) =>
      ctx.db.system.query('_scheduled_functions').order('desc').first(),
    )
    expect(purgeJob?.args).toEqual([
      {
        rsvpId: seeded.rsvpId,
        command: {
          kind: 'olderThanGeneration',
          commandGeneration: 1,
        },
      },
    ])

    expect(
      await drainRsvpSessionPurge(t, seeded.rsvpId, {
        kind: 'olderThanGeneration',
        commandGeneration: 1,
      }),
    ).toBe(160)
    expect(
      await t.run((ctx) =>
        ctx.db
          .query('rsvpSessions')
          .withIndex('by_rsvp', (index) => index.eq('rsvpId', seeded.rsvpId))
          .collect(),
      ),
    ).toEqual([])
  })

  it('preserves generation 2 when delayed phone purges arrive in either order', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(40_000)
    const t = makeAdminTest()
    await insertActiveAdminSession(t, TOKEN_A)
    const seeded = await seedAdminFamily(t, '(79) 99999-8601')
    await insertHistoricalRsvpSessions(t, seeded.rsvpId, 80, 0)
    const listed = await t.query(api.adminRsvps.listFamilies, { token: TOKEN_A })
    if (listed.kind !== 'ready') throw new Error('missing family')

    const first = await t.mutation(api.adminRsvps.updateFamily, {
      token: TOKEN_A,
      familyId: seeded.rsvpId,
      expectedUpdatedAt: listed.families[0].updatedAt,
      patch: { phone: '(79) 99999-8602' },
    })
    if (first.kind !== 'saved') throw new Error('first phone change failed')
    await insertHistoricalRsvpSessions(t, seeded.rsvpId, 80, 1, 256)
    const second = await t.mutation(api.adminRsvps.updateFamily, {
      token: TOKEN_A,
      familyId: seeded.rsvpId,
      expectedUpdatedAt: first.family.updatedAt,
      patch: { phone: '(79) 99999-8603' },
    })
    if (second.kind !== 'saved') throw new Error('second phone change failed')
    const currentToken = deterministicRsvpToken(512)
    await t.mutation((ctx) =>
      createRsvpSession(ctx, { rsvpId: seeded.rsvpId, token: currentToken }),
    )

    await drainRsvpSessionPurge(t, seeded.rsvpId, {
      kind: 'olderThanGeneration',
      commandGeneration: 1,
    })
    let generations = await t.run(async (ctx) =>
      (
        await ctx.db
          .query('rsvpSessions')
          .withIndex('by_rsvp', (index) => index.eq('rsvpId', seeded.rsvpId))
          .collect()
      ).map((row) => row.generation ?? 0),
    )
    expect(generations).toEqual([...Array(80).fill(1), 2])
    expect(await t.query(api.rsvps.getCurrent, { token: currentToken })).not.toBeNull()

    const generationTwoCommand = {
      kind: 'olderThanGeneration',
      commandGeneration: 2,
    } as const
    await drainRsvpSessionPurge(t, seeded.rsvpId, generationTwoCommand)
    await drainRsvpSessionPurge(t, seeded.rsvpId, {
      kind: 'olderThanGeneration',
      commandGeneration: 1,
    })
    await drainRsvpSessionPurge(t, seeded.rsvpId, generationTwoCommand)
    generations = await t.run(async (ctx) =>
      (
        await ctx.db
          .query('rsvpSessions')
          .withIndex('by_rsvp', (index) => index.eq('rsvpId', seeded.rsvpId))
          .collect()
      ).map((row) => row.generation ?? 0),
    )
    expect(generations).toEqual([2])
    expect(await t.query(api.rsvps.getCurrent, { token: currentToken })).not.toBeNull()
  })

  it('removes a family with 160 linked sessions before deleteAll cleanup', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(50_000)
    const t = makeAdminTest()
    await insertActiveAdminSession(t, TOKEN_A)
    const seeded = await seedAdminFamily(t, '(79) 99999-8701')
    const oldTokens = await insertHistoricalRsvpSessions(t, seeded.rsvpId, 160, 0)
    const listed = await t.query(api.adminRsvps.listFamilies, { token: TOKEN_A })
    if (listed.kind !== 'ready') throw new Error('missing family')

    await expect(
      t.mutation(api.adminRsvps.removeFamily, {
        token: TOKEN_A,
        familyId: seeded.rsvpId,
        expectedUpdatedAt: listed.families[0].updatedAt,
      }),
    ).resolves.toEqual({ kind: 'removed' })
    expect(await t.run((ctx) => ctx.db.get(seeded.rsvpId))).toBeNull()
    for (const token of oldTokens) {
      expect(await t.query(api.rsvps.getCurrent, { token })).toBeNull()
    }
    expect(
      await drainRsvpSessionPurge(t, seeded.rsvpId, { kind: 'deleteAll' }),
    ).toBe(160)
    expect(
      await t.run((ctx) =>
        ctx.db
          .query('rsvpSessions')
          .withIndex('by_rsvp', (index) => index.eq('rsvpId', seeded.rsvpId))
          .collect(),
      ),
    ).toEqual([])
  })

  it('rejects malformed or mixed purge commands before deleting sessions', async () => {
    const t = makeAdminTest()
    const seeded = await seedAdminFamily(t, '(79) 99999-8801')
    await insertHistoricalRsvpSessions(t, seeded.rsvpId, 1, 0)

    for (const command of [
      {},
      { kind: 'olderThanGeneration' },
      { kind: 'olderThanGeneration', commandGeneration: -1 },
      { kind: 'olderThanGeneration', commandGeneration: 1.5 },
      { kind: 'deleteAll', commandGeneration: 1 },
      { kind: 'unknown' },
    ]) {
      await expect(
        t.mutation((ctx) =>
          purgeRsvpSessionsBatchHandler(ctx, {
            rsvpId: seeded.rsvpId,
            cursor: null,
            command,
          }),
        ),
      ).rejects.toThrow(/purge command/i)
    }
    expect(
      await t.run((ctx) =>
        ctx.db
          .query('rsvpSessions')
          .withIndex('by_rsvp', (index) => index.eq('rsvpId', seeded.rsvpId))
          .collect(),
      ),
    ).toHaveLength(1)
  })

  it('does not advance generation or schedule purge for rejected phone changes', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(60_000)
    const t = makeAdminTest()
    await insertActiveAdminSession(t, TOKEN_A)
    const seeded = await seedAdminFamily(t, '(79) 99999-8901')
    const listed = await t.query(api.adminRsvps.listFamilies, { token: TOKEN_A })
    if (listed.kind !== 'ready') throw new Error('missing family')
    const family = listed.families[0]
    const before = await t.run(async (ctx) => ({
      family: await ctx.db.get(seeded.rsvpId),
      sessions: await ctx.db
        .query('rsvpSessions')
        .withIndex('by_rsvp', (index) => index.eq('rsvpId', seeded.rsvpId))
        .collect(),
      scheduled: await ctx.db.system.query('_scheduled_functions').collect(),
    }))

    await expect(
      t.mutation(api.adminRsvps.updateFamily, {
        token: TOKEN_A,
        familyId: seeded.rsvpId,
        expectedUpdatedAt: family.updatedAt,
        patch: { phone: 'telefone inválido' },
      }),
    ).resolves.toMatchObject({ kind: 'invalid', field: 'phone' })
    await expect(
      t.mutation(api.adminRsvps.updateFamily, {
        token: TOKEN_A,
        familyId: seeded.rsvpId,
        expectedUpdatedAt: family.updatedAt - 1,
        patch: { phone: '(79) 99999-8902' },
      }),
    ).resolves.toMatchObject({ kind: 'conflict' })
    await expect(
      t.mutation(api.adminRsvps.updateFamily, {
        token: TOKEN_B,
        familyId: seeded.rsvpId,
        expectedUpdatedAt: family.updatedAt,
        patch: { phone: '(79) 99999-8902' },
      }),
    ).resolves.toEqual({ kind: 'unauthorized' })

    const after = await t.run(async (ctx) => ({
      family: await ctx.db.get(seeded.rsvpId),
      sessions: await ctx.db
        .query('rsvpSessions')
        .withIndex('by_rsvp', (index) => index.eq('rsvpId', seeded.rsvpId))
        .collect(),
      scheduled: await ctx.db.system.query('_scheduled_functions').collect(),
    }))
    expect(after).toEqual(before)
  })

  it('rejects a stale admin write after a public save and preserves the public response', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(50_000)
    const t = makeAdminTest()
    await insertActiveAdminSession(t, TOKEN_A)
    const seeded = await seedAdminFamily(t, '(79) 99999-8401')
    const listed = await t.query(api.adminRsvps.listFamilies, { token: TOKEN_A })
    if (listed.kind !== 'ready') throw new Error('missing family')
    const snapshot = listed.families[0]
    const publicToken = `${'D'.repeat(42)}Q`
    await t.mutation((ctx) =>
      createRsvpSession(ctx, { rsvpId: seeded.rsvpId, token: publicToken }),
    )
    const saved = await t.mutation(api.rsvps.saveResponses, {
      token: publicToken,
      guestUpdates: [
        { guestRef: snapshot.guests[0].publicRef, attendance: 'yes' },
      ],
      contact: { kind: 'unchanged' },
    })
    expect(saved.kind).toBe('saved')
    const conflict = await t.mutation(api.adminRsvps.updateFamily, {
      token: TOKEN_A,
      familyId: snapshot.id,
      expectedUpdatedAt: snapshot.updatedAt,
      patch: { displayName: 'Sobrescrita indevida' },
    })
    expect(conflict.kind).toBe('conflict')
    if (conflict.kind === 'conflict') {
      expect(conflict.family.displayName).toBe('Família Operacional')
      expect(conflict.family.guests[0].attendance).toBe('yes')
    }
  })

  it('runs the bounded family cascade smoke and leaves no fixture rows', async () => {
    const t = makeAdminTest()
    await expect(
      t.action(internal.adminTest.smokeFamilyCascade, {}),
    ).resolves.toEqual({
      createdFamily: true,
      logicalPhoneRevocationImmediate: true,
      staleGenerationPurged: true,
      purgeRetryIdempotent: true,
      familyAbsenceRevocationImmediate: true,
      orphanSessionsPurged: true,
      fixturesRemoved: true,
    })
    expect(
      (await t.run((ctx) => ctx.db.query('rsvps').collect())).filter((row) =>
        row.displayName.startsWith('Smoke admin RSVP 06-03'),
      ),
    ).toEqual([])
  })
})
