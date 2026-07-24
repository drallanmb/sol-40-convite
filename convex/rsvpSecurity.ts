import { RSVP_SESSION_TOKEN_BYTES } from './rsvpModel'

const OPAQUE_TOKEN_LENGTH = Math.ceil((RSVP_SESSION_TOKEN_BYTES * 8) / 6)
const OPAQUE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/

type LimiterKeyScope = 'lookup-phone' | 'save-session'

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
