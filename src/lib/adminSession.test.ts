import { describe, expect, it } from 'vitest'
import {
  ADMIN_SESSION_STORAGE_KEY,
  adminDeadlineAction,
  adminStorageEventAction,
  buildAdminAccessUrl,
  generateAdminCapability,
  takeAdminAccessTokenFromUrl,
  readAdminSession,
  reduceAdminSession,
  storeAdminSession,
  type AdminSessionState,
} from './adminSession'

class MemoryStorage implements Storage {
  readonly values = new Map<string, string>()
  shouldThrow = false

  get length() {
    return this.values.size
  }

  clear() {
    if (this.shouldThrow) throw new Error('blocked')
    this.values.clear()
  }

  getItem(key: string) {
    if (this.shouldThrow) throw new Error('blocked')
    return this.values.get(key) ?? null
  }

  key(index: number) {
    if (this.shouldThrow) throw new Error('blocked')
    return [...this.values.keys()][index] ?? null
  }

  removeItem(key: string) {
    if (this.shouldThrow) throw new Error('blocked')
    this.values.delete(key)
  }

  setItem(key: string, value: string) {
    if (this.shouldThrow) throw new Error('blocked')
    this.values.set(key, value)
  }
}

const TOKEN_A = 'A'.repeat(43)
const TOKEN_SPECIAL = `${'A'.repeat(20)}-${'B'.repeat(20)}_A`
const PRINCIPAL = {
  id: 'account-1',
  displayName: 'Allan',
  role: 'owner' as const,
}

function checking(sequence = 1): AdminSessionState {
  return { kind: 'checking', sequence, token: TOKEN_A }
}

describe('admin capability persistence', () => {
  it('generates canonical base64url from exactly 32 injected random bytes', () => {
    const token = generateAdminCapability((bytes) => {
      bytes.forEach((_, index) => {
        bytes[index] = index
      })
    })

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/u)
    expect(token).not.toContain('=')
  })

  it('restores only a versioned capability and non-authoritative expiry hint', () => {
    const storage = new MemoryStorage()
    expect(
      storeAdminSession(storage, {
        token: TOKEN_A,
        expiresAt: 987_654,
      }),
    ).toBe(true)

    const serialized = storage.getItem(ADMIN_SESSION_STORAGE_KEY)
    expect(JSON.parse(serialized ?? '')).toEqual({
      version: 1,
      token: TOKEN_A,
      expiresAt: 987_654,
    })
    expect(serialized).not.toContain('password')
    expect(serialized).not.toContain('draft')
    expect(readAdminSession(storage)).toEqual({
      token: TOKEN_A,
      expiresAt: 987_654,
    })
  })

  it('does not treat the expiry hint as authorization after reopen', () => {
    const storage = new MemoryStorage()
    storeAdminSession(storage, { token: TOKEN_A, expiresAt: 987_654 })

    const restored = readAdminSession(storage)
    expect(restored).toEqual({ token: TOKEN_A, expiresAt: 987_654 })
    expect(checking()).toEqual({
      kind: 'checking',
      sequence: 1,
      token: TOKEN_A,
    })
  })

  it.each([
    ['not json', 'not-json'],
    ['wrong version', JSON.stringify({ version: 2, token: TOKEN_A })],
    ['malformed token', JSON.stringify({ version: 1, token: 'short' })],
    [
      'bad expiry',
      JSON.stringify({ version: 1, token: TOKEN_A, expiresAt: 'tomorrow' }),
    ],
  ])('clears malformed storage: %s', (_, value) => {
    const storage = new MemoryStorage()
    storage.setItem(ADMIN_SESSION_STORAGE_KEY, value)

    expect(readAdminSession(storage)).toBeNull()
    expect(storage.getItem(ADMIN_SESSION_STORAGE_KEY)).toBeNull()
  })

  it('fails safely when browser storage throws', () => {
    const storage = new MemoryStorage()
    storage.shouldThrow = true

    expect(readAdminSession(storage)).toBeNull()
    expect(storeAdminSession(storage, { token: TOKEN_A })).toBe(false)
  })
})

describe('admin activation and reset URL privacy', () => {
  it('builds canonical activation and reset URLs with a fragment', () => {
    expect(
      buildAdminAccessUrl(
        'https://www.sol40.com.br',
        TOKEN_SPECIAL,
        'activation',
      ),
    ).toBe(
      `https://www.sol40.com.br/admin/ativar#token=${TOKEN_SPECIAL}`,
    )
    expect(
      buildAdminAccessUrl(
        'https://www.sol40.com.br/',
        TOKEN_A,
        'reset',
      ),
    ).toBe(
      `https://www.sol40.com.br/admin/redefinir#token=${TOKEN_A}`,
    )
  })

  it('takes a fragment capability once and removes it from the address', () => {
    const replaced: string[] = []
    const token = takeAdminAccessTokenFromUrl(
      `https://www.sol40.com.br/admin/ativar#token=${TOKEN_SPECIAL}`,
      (safeUrl) => replaced.push(safeUrl),
    )

    expect(token).toBe(TOKEN_SPECIAL)
    expect(replaced).toEqual(['/admin/ativar'])
  })

  it('keeps temporary compatibility with query links and strips all private URL data', () => {
    const replaced: string[] = []
    const token = takeAdminAccessTokenFromUrl(
      `https://www.sol40.com.br/admin/ativar?token=${TOKEN_A}&utm_source=private#form`,
      (safeUrl) => replaced.push(safeUrl),
    )

    expect(token).toBe(TOKEN_A)
    expect(replaced).toEqual(['/admin/ativar'])
  })

  it('prefers a valid fragment capability over a legacy query capability', () => {
    const replaced: string[] = []
    const token = takeAdminAccessTokenFromUrl(
      `https://www.sol40.com.br/admin/redefinir?token=${TOKEN_A}#token=${TOKEN_SPECIAL}`,
      (safeUrl) => replaced.push(safeUrl),
    )

    expect(token).toBe(TOKEN_SPECIAL)
    expect(replaced).toEqual(['/admin/redefinir'])
  })

  it('rejects malformed capabilities without writing any browser storage', () => {
    const storage = new MemoryStorage()
    storage.setItem('unrelated', 'preserve')
    const replaced: string[] = []

    expect(
      takeAdminAccessTokenFromUrl(
        'https://www.sol40.com.br/admin/redefinir?token=short',
        (safeUrl) => replaced.push(safeUrl),
      ),
    ).toBeNull()
    expect(replaced).toEqual(['/admin/redefinir'])
    expect([...storage.values.entries()]).toEqual([['unrelated', 'preserve']])
    expect(
      [...storage.values.values()].join('|'),
    ).not.toContain(TOKEN_A)
  })
})

describe('admin session reducer fail-closed lifecycle', () => {
  it('authenticates only the current authoritative status result', () => {
    const transition = reduceAdminSession(checking(), {
      type: 'status-valid',
      sequence: 1,
      token: TOKEN_A,
      expiresAt: 10_000,
      now: 9_999,
      principal: PRINCIPAL,
    })

    expect(transition.state).toEqual({
      kind: 'authenticated',
      sequence: 1,
      token: TOKEN_A,
      expiresAt: 10_000,
      principal: PRINCIPAL,
    })
    expect(transition.effects).toEqual([
      {
        type: 'store-session',
        session: { token: TOKEN_A, expiresAt: 10_000 },
      },
    ])
  })

  it('expires at the exact local deadline and explicitly clears protected state', () => {
    const authenticated: AdminSessionState = {
      kind: 'authenticated',
      sequence: 3,
      token: TOKEN_A,
      expiresAt: 10_000,
      principal: PRINCIPAL,
    }
    const transition = reduceAdminSession(authenticated, {
      type: 'deadline-reached',
      sequence: 3,
    })

    expect(transition.state).toEqual({
      kind: 'anonymous',
      sequence: 3,
      notice: 'expired',
    })
    expect(transition.effects).toEqual([
      { type: 'clear-sensitive-state' },
      { type: 'clear-stored-session' },
    ])
    expect(adminDeadlineAction(
      { token: TOKEN_A, expiresAt: 10_000 },
      10_000,
      3,
    )).toEqual({ type: 'deadline-reached', sequence: 3 })
  })

  it('treats server revocation and cross-tab removal as immediate clearing', () => {
    const authenticated: AdminSessionState = {
      kind: 'authenticated',
      sequence: 4,
      token: TOKEN_A,
      expiresAt: 10_000,
      principal: PRINCIPAL,
    }
    for (const action of [
      { type: 'session-revoked', sequence: 4 } as const,
      { type: 'storage-removed', sequence: 4 } as const,
    ]) {
      const transition = reduceAdminSession(authenticated, action)
      expect(transition.state.kind).toBe('anonymous')
      expect(transition.effects).toContainEqual({
        type: 'clear-sensitive-state',
      })
    }
    expect(
      adminStorageEventAction(
        { key: ADMIN_SESSION_STORAGE_KEY, newValue: null },
        4,
      ),
    ).toEqual({ type: 'storage-removed', sequence: 4 })
    expect(
      adminStorageEventAction({ key: 'unrelated', newValue: null }, 4),
    ).toBeNull()
  })

  it('cannot reauthenticate from a stale result after a later logout', () => {
    const authenticated: AdminSessionState = {
      kind: 'authenticated',
      sequence: 1,
      token: TOKEN_A,
      expiresAt: 10_000,
      principal: PRINCIPAL,
    }
    const loggingOut = reduceAdminSession(authenticated, {
      type: 'logout-started',
      sequence: 2,
    }).state
    const stale = reduceAdminSession(loggingOut, {
      type: 'status-valid',
      sequence: 1,
      token: TOKEN_A,
      expiresAt: 10_000,
      now: 2_000,
      principal: PRINCIPAL,
    })

    expect(stale.state).toEqual(loggingOut)
    expect(stale.effects).toEqual([])
  })

  it('clears protected state after logout failure while retaining only a bounded revocation token', () => {
    const loggingOut: AdminSessionState = {
      kind: 'logging-out',
      sequence: 2,
      token: TOKEN_A,
      expiresAt: 10_000,
      principal: PRINCIPAL,
    }
    const transition = reduceAdminSession(loggingOut, {
      type: 'logout-failed',
      sequence: 2,
    })

    expect(transition.state).toEqual({
      kind: 'error',
      sequence: 2,
      reason: 'network',
      retryToken: TOKEN_A,
    })
    expect(transition.effects).toEqual([
      { type: 'clear-sensitive-state' },
      { type: 'clear-stored-session' },
    ])
  })

  it.each([
    ['invalid_credentials', undefined],
    ['rate_limited', 30],
    ['network', undefined],
    ['configuration', undefined],
  ] as const)('keeps %s as a distinct retryable outcome', (reason, retryAfterSeconds) => {
    const state: AdminSessionState = {
      kind: 'authenticating',
      sequence: 5,
    }
    const transition = reduceAdminSession(state, {
      type: 'login-failed',
      sequence: 5,
      reason,
      ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
    })

    expect(transition.state).toMatchObject({ kind: 'error', reason })
    if (retryAfterSeconds !== undefined) {
      expect(transition.state).toHaveProperty(
        'retryAfterSeconds',
        retryAfterSeconds,
      )
    }
  })

  it('does not persist route, filters, password, protected DTOs or drafts in any transition', () => {
    const transition = reduceAdminSession(checking(), {
      type: 'status-valid',
      sequence: 1,
      token: TOKEN_A,
      expiresAt: 10_000,
      now: 1_000,
      principal: PRINCIPAL,
    })
    const serialized = JSON.stringify(transition)

    expect(serialized).not.toContain('pathname')
    expect(serialized).not.toContain('search')
    expect(serialized).not.toContain('password')
    expect(serialized).not.toContain('draft')
    expect(serialized).not.toContain('family')
  })

  it('cannot resurrect principal or drafts from a late status after revocation', () => {
    const authenticated: AdminSessionState = {
      kind: 'authenticated',
      sequence: 7,
      token: TOKEN_A,
      expiresAt: 10_000,
      principal: PRINCIPAL,
    }
    const revoked = reduceAdminSession(authenticated, {
      type: 'session-revoked',
      sequence: 7,
    })
    const late = reduceAdminSession(revoked.state, {
      type: 'status-valid',
      sequence: 7,
      token: TOKEN_A,
      expiresAt: 10_000,
      now: 2_000,
      principal: PRINCIPAL,
    })

    expect(revoked.state).toEqual({
      kind: 'anonymous',
      sequence: 8,
      notice: 'revoked',
    })
    expect(late.state).toEqual(revoked.state)
    expect(JSON.stringify(late)).not.toContain('Allan')
  })
})
