export const ADMIN_SESSION_STORAGE_KEY = 'sol40:admin-session:v1'
export const ADMIN_CAPABILITY_BYTE_LENGTH = 32

const ADMIN_CAPABILITY_PATTERN = /^[A-Za-z0-9_-]{43}$/u
const CANONICAL_LAST_CHARACTERS = 'AEIMQUYcgkosw048'

export type AdminStoredSession = {
  token: string
  expiresAt?: number
}

export type AdminSessionNotice =
  | 'expired'
  | 'revoked'
  | 'logged_out'
  | 'logout_unconfirmed'

export type AdminSessionError =
  | 'invalid_credentials'
  | 'rate_limited'
  | 'network'
  | 'configuration'

type SequencedState = { sequence: number }

export type AdminPrincipalView = {
  id?: string
  displayName: string
  role: 'owner' | 'manager' | 'seller'
}

export type AdminSessionState =
  | ({ kind: 'checking'; token: string | null } & SequencedState)
  | ({ kind: 'anonymous'; notice?: AdminSessionNotice } & SequencedState)
  | ({ kind: 'authenticating' } & SequencedState)
  | ({
      kind: 'authenticated'
      token: string
      expiresAt: number
      principal: AdminPrincipalView
    } & SequencedState)
  | ({
      kind: 'logging-out'
      token: string
      expiresAt: number
      principal: AdminPrincipalView
    } & SequencedState)
  | ({
      kind: 'error'
      reason: AdminSessionError
      retryAfterSeconds?: number
      retryToken?: string
    } & SequencedState)

export type AdminSessionAction =
  | { type: 'check-started'; sequence: number; token: string | null }
  | {
      type: 'status-valid'
      sequence: number
      token: string
      expiresAt: number
      now: number
      principal: AdminPrincipalView
    }
  | { type: 'status-invalid'; sequence: number }
  | { type: 'login-started'; sequence: number }
  | {
      type: 'login-succeeded'
      sequence: number
      token: string
      expiresAt: number
      now: number
      principal: AdminPrincipalView
    }
  | {
      type: 'login-failed'
      sequence: number
      reason: AdminSessionError
      retryAfterSeconds?: number
    }
  | { type: 'logout-started'; sequence: number }
  | { type: 'logout-succeeded'; sequence: number }
  | { type: 'logout-failed'; sequence: number }
  | { type: 'deadline-reached'; sequence: number }
  | { type: 'session-revoked'; sequence: number }
  | { type: 'storage-removed'; sequence: number }

export type AdminSessionEffect =
  | { type: 'store-session'; session: AdminStoredSession }
  | { type: 'clear-stored-session' }
  | { type: 'clear-sensitive-state' }

export type AdminSessionTransition = {
  state: AdminSessionState
  effects: AdminSessionEffect[]
}

export type AdminRandomFill = (bytes: Uint8Array<ArrayBuffer>) => void

function isAdminCapability(token: string) {
  return (
    ADMIN_CAPABILITY_PATTERN.test(token) &&
    CANONICAL_LAST_CHARACTERS.includes(token.charAt(token.length - 1))
  )
}

function encodeBase64Url(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/u, '')
}

export function generateAdminCapability(
  fillRandom: AdminRandomFill = (bytes) => {
    globalThis.crypto.getRandomValues(bytes)
  },
) {
  const bytes: Uint8Array<ArrayBuffer> = new Uint8Array(
    new ArrayBuffer(ADMIN_CAPABILITY_BYTE_LENGTH),
  )
  fillRandom(bytes)
  return encodeBase64Url(bytes)
}

export function buildAdminAccessUrl(
  origin: string,
  token: string,
  purpose: 'activation' | 'reset',
) {
  if (!isAdminCapability(token)) {
    throw new Error('Invalid admin access capability')
  }
  const path =
    purpose === 'activation' ? '/admin/ativar' : '/admin/redefinir'
  const url = new URL(path, origin)
  url.hash = new URLSearchParams({ token }).toString()
  return url.toString()
}

export function takeAdminAccessTokenFromUrl(
  href: string,
  replaceUrl: (safeUrl: string) => void,
) {
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return null
  }
  const fragment = new URLSearchParams(url.hash.replace(/^#/u, ''))
  const fragmentCandidate = fragment.get('token')
  const queryCandidate = url.searchParams.get('token')
  replaceUrl(url.pathname)
  if (
    fragmentCandidate !== null &&
    isAdminCapability(fragmentCandidate)
  ) {
    return fragmentCandidate
  }
  return queryCandidate !== null && isAdminCapability(queryCandidate)
    ? queryCandidate
    : null
}

function isOptionalFiniteExpiry(value: unknown) {
  return (
    value === undefined ||
    (typeof value === 'number' && Number.isFinite(value) && value > 0)
  )
}

export function readAdminSession(storage: Storage): AdminStoredSession | null {
  let serialized: string | null
  try {
    serialized = storage.getItem(ADMIN_SESSION_STORAGE_KEY)
  } catch {
    return null
  }
  if (serialized === null) return null

  try {
    const value = JSON.parse(serialized) as Record<string, unknown>
    if (
      value.version !== 1 ||
      typeof value.token !== 'string' ||
      !isAdminCapability(value.token) ||
      !isOptionalFiniteExpiry(value.expiresAt)
    ) {
      throw new Error('Malformed admin session')
    }
    return {
      token: value.token,
      ...(value.expiresAt === undefined
        ? {}
        : { expiresAt: value.expiresAt as number }),
    }
  } catch {
    clearAdminSession(storage)
    return null
  }
}

export function storeAdminSession(
  storage: Storage,
  session: AdminStoredSession,
) {
  if (
    !isAdminCapability(session.token) ||
    !isOptionalFiniteExpiry(session.expiresAt)
  ) {
    return false
  }
  try {
    storage.setItem(
      ADMIN_SESSION_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        token: session.token,
        ...(session.expiresAt === undefined
          ? {}
          : { expiresAt: session.expiresAt }),
      }),
    )
    return true
  } catch {
    return false
  }
}

export function clearAdminSession(storage: Storage) {
  try {
    storage.removeItem(ADMIN_SESSION_STORAGE_KEY)
  } catch {
    // Blocked storage already behaves like an anonymous browser.
  }
}

export function nextAdminSessionSequence(state: AdminSessionState) {
  return state.sequence + 1
}

function failClosed(
  sequence: number,
  notice: AdminSessionNotice,
): AdminSessionTransition {
  return {
    state: { kind: 'anonymous', sequence, notice },
    effects: [
      { type: 'clear-sensitive-state' },
      { type: 'clear-stored-session' },
    ],
  }
}

function isCurrent(state: AdminSessionState, sequence: number) {
  return state.sequence === sequence
}

export function reduceAdminSession(
  state: AdminSessionState,
  action: AdminSessionAction,
): AdminSessionTransition {
  switch (action.type) {
    case 'check-started':
      if (action.sequence <= state.sequence) return { state, effects: [] }
      return {
        state: {
          kind: 'checking',
          sequence: action.sequence,
          token: action.token,
        },
        effects: [{ type: 'clear-sensitive-state' }],
      }
    case 'login-started':
      if (action.sequence <= state.sequence) return { state, effects: [] }
      return {
        state: { kind: 'authenticating', sequence: action.sequence },
        effects: [{ type: 'clear-sensitive-state' }],
      }
    case 'status-valid':
    case 'login-succeeded':
      if (!isCurrent(state, action.sequence)) return { state, effects: [] }
      if (
        !isAdminCapability(action.token) ||
        action.now >= action.expiresAt
      ) {
        return failClosed(action.sequence, 'expired')
      }
      return {
        state: {
          kind: 'authenticated',
          sequence: action.sequence,
          token: action.token,
          expiresAt: action.expiresAt,
          principal: action.principal,
        },
        effects: [
          {
            type: 'store-session',
            session: {
              token: action.token,
              expiresAt: action.expiresAt,
            },
          },
        ],
      }
    case 'status-invalid':
      if (!isCurrent(state, action.sequence)) return { state, effects: [] }
      return failClosed(action.sequence, 'revoked')
    case 'login-failed':
      if (!isCurrent(state, action.sequence)) return { state, effects: [] }
      return {
        state: {
          kind: 'error',
          sequence: action.sequence,
          reason: action.reason,
          ...(action.retryAfterSeconds === undefined
            ? {}
            : { retryAfterSeconds: action.retryAfterSeconds }),
        },
        effects: [{ type: 'clear-sensitive-state' }],
      }
    case 'logout-started':
      if (
        action.sequence <= state.sequence ||
        state.kind !== 'authenticated'
      ) {
        return { state, effects: [] }
      }
      return {
        state: {
          kind: 'logging-out',
          sequence: action.sequence,
          token: state.token,
          expiresAt: state.expiresAt,
          principal: state.principal,
        },
        effects: [{ type: 'clear-sensitive-state' }],
      }
    case 'logout-succeeded':
      if (!isCurrent(state, action.sequence)) return { state, effects: [] }
      return failClosed(action.sequence, 'logged_out')
    case 'logout-failed':
      if (!isCurrent(state, action.sequence)) return { state, effects: [] }
      return {
        state: {
          kind: 'error',
          sequence: action.sequence,
          reason: 'network',
          ...(state.kind === 'logging-out'
            ? { retryToken: state.token }
            : {}),
        },
        effects: [
          { type: 'clear-sensitive-state' },
          { type: 'clear-stored-session' },
        ],
      }
    case 'deadline-reached':
      if (!isCurrent(state, action.sequence)) return { state, effects: [] }
      return failClosed(action.sequence, 'expired')
    case 'session-revoked':
    case 'storage-removed':
      if (action.sequence < state.sequence) return { state, effects: [] }
      return failClosed(action.sequence + 1, 'revoked')
  }
}

export function adminSessionReducer(
  state: AdminSessionState,
  action: AdminSessionAction,
) {
  return reduceAdminSession(state, action).state
}

export function adminDeadlineAction(
  session: AdminStoredSession,
  now: number,
  sequence: number,
): AdminSessionAction | null {
  return session.expiresAt !== undefined && now >= session.expiresAt
    ? { type: 'deadline-reached', sequence }
    : null
}

export function adminStorageEventAction(
  event: Pick<StorageEvent, 'key' | 'newValue'>,
  sequence: number,
): AdminSessionAction | null {
  return event.key === ADMIN_SESSION_STORAGE_KEY && event.newValue === null
    ? { type: 'storage-removed', sequence }
    : null
}
