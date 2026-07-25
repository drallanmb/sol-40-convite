import rateLimiterTest from '@convex-dev/rate-limiter/test'
import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vitest'
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

describe('admin login rate limit policy', () => {
  it('defines a conservative global fixed-window bucket', () => {
    expect(ADMIN_RATE_LIMITS.loginGlobal).toEqual({
      kind: 'fixed window',
      rate: 10,
      period: 15 * 60 * 1_000,
    })
  })
})
