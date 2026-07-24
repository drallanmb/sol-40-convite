import type { Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'
import {
  RSVP_SESSION_TOKEN_BYTES,
  RSVP_SESSION_TTL_MS,
} from './rsvpModel'

const OPAQUE_TOKEN_LENGTH = Math.ceil((RSVP_SESSION_TOKEN_BYTES * 8) / 6)
const OPAQUE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/
const BASE64URL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

type LimiterKeyScope = 'lookup-phone' | 'save-session'
type RsvpReadContext = Pick<QueryCtx, 'db'>
type RsvpWriteContext = Pick<MutationCtx, 'db'>

function toHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function sha256Hex(value: string) {
  const encoded = new TextEncoder().encode(value)
  return toHex(await crypto.subtle.digest('SHA-256', encoded))
}

/**
 * O navegador gera 32 bytes e os serializa como base64url sem padding.
 * O último caractere restrito também rejeita encodings não canônicos com pad bits.
 */
export function validateOpaqueToken(token: string) {
  return token.length === OPAQUE_TOKEN_LENGTH && OPAQUE_TOKEN_PATTERN.test(token)
}

export function encodeOpaqueToken(bytes: Uint8Array) {
  if (bytes.byteLength !== RSVP_SESSION_TOKEN_BYTES) {
    throw new Error('Invalid opaque capability bytes')
  }

  let encoded = ''
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index]
    const second = bytes[index + 1]
    const third = bytes[index + 2]

    encoded += BASE64URL_ALPHABET[first >> 2]
    encoded += BASE64URL_ALPHABET[((first & 0x03) << 4) | ((second ?? 0) >> 4)]
    if (second !== undefined) {
      encoded += BASE64URL_ALPHABET[((second & 0x0f) << 2) | ((third ?? 0) >> 6)]
    }
    if (third !== undefined) {
      encoded += BASE64URL_ALPHABET[third & 0x3f]
    }
  }

  return encoded
}

export async function hashOpaqueToken(token: string) {
  if (!validateOpaqueToken(token)) {
    throw new Error('Invalid opaque capability')
  }

  return sha256Hex(token)
}

export function hashLimiterKey(scope: LimiterKeyScope, value: string) {
  return sha256Hex(`${scope}\u0000${value}`)
}

export function isSessionActive(expiresAt: number, now: number) {
  return now < expiresAt
}

export function toRetryAfterSeconds(retryAfterMs: number) {
  if (!Number.isFinite(retryAfterMs)) {
    return 1
  }

  return Math.max(1, Math.ceil(retryAfterMs / 1_000))
}

export async function createRsvpSession(
  ctx: RsvpWriteContext,
  {
    rsvpId,
    token,
    now = Date.now(),
    expiresAt = now + RSVP_SESSION_TTL_MS,
  }: {
    rsvpId: Id<'rsvps'>
    token: string
    now?: number
    expiresAt?: number
  },
) {
  if (!validateOpaqueToken(token)) {
    return { kind: 'invalid_token' } as const
  }

  const tokenHash = await hashOpaqueToken(token)
  const existing = await ctx.db
    .query('rsvpSessions')
    .withIndex('by_token_hash', (query) => query.eq('tokenHash', tokenHash))
    .collect()

  if (existing.length > 0) {
    return { kind: 'token_conflict' } as const
  }

  await ctx.db.insert('rsvpSessions', {
    tokenHash,
    rsvpId,
    expiresAt,
    createdAt: now,
  })

  return { kind: 'created', tokenHash } as const
}

export async function resolveActiveRsvpSession(
  ctx: RsvpReadContext,
  token: string,
  now = Date.now(),
) {
  if (!validateOpaqueToken(token)) {
    return null
  }

  const tokenHash = await hashOpaqueToken(token)
  const sessions = await ctx.db
    .query('rsvpSessions')
    .withIndex('by_token_hash', (query) => query.eq('tokenHash', tokenHash))
    .collect()

  if (sessions.length !== 1 || !isSessionActive(sessions[0].expiresAt, now)) {
    return null
  }

  const rsvp = await ctx.db.get(sessions[0].rsvpId)
  if (!rsvp) {
    return null
  }

  return {
    tokenHash,
    session: sessions[0],
    rsvp,
  }
}
