export const ADMIN_PASSWORD_MIN_CODE_POINTS = 15
export const ADMIN_PASSWORD_MAX_CODE_POINTS = 128

export const ADMIN_SCRYPT_PARAMETERS = {
  version: 1,
  ln: 17,
  N: 2 ** 17 as 131072,
  r: 8,
  p: 1,
  saltBytes: 16,
  derivedKeyBytes: 32,
  maxmem: 256 * 1024 * 1024,
} as const

const COMMON_PASSWORD_FRAGMENTS = [
  'password',
  'senha123',
  '12345678',
  'qwerty',
  'sol40',
] as const
const ENVELOPE_PATTERN =
  /^\$scrypt\$v=1\$ln=17,r=8,p=1\$([A-Za-z0-9_-]{22})\$([A-Za-z0-9_-]{43})$/u
const SALT_LAST_CHARACTERS = 'AQgw'
const HASH_LAST_CHARACTERS = 'AEIMQUYcgkosw048'

export type AdminPasswordContext = {
  email?: string
  displayName?: string
}

export type ParsedPasswordEnvelope = {
  version: 1
  ln: 17
  N: 131072
  r: 8
  p: 1
  salt: string
  hash: string
}

function contextualFragments(context: AdminPasswordContext) {
  const fragments = new Set<string>()
  const email = context.email?.normalize('NFC').trim().toLowerCase()
  if (email) {
    fragments.add(email)
    const localPart = email.split('@')[0]
    if (localPart.length >= 4) fragments.add(localPart)
  }
  const displayName = context.displayName?.normalize('NFC').trim().toLowerCase()
  if (displayName) {
    for (const fragment of displayName.split(/\s+/u)) {
      if (fragment.length >= 4) fragments.add(fragment)
    }
  }
  return fragments
}

export function normalizeAdminPassword(password: string) {
  return password.normalize('NFC')
}

export function validateAdminPassword(
  password: string,
  context: AdminPasswordContext = {},
):
  | { kind: 'valid'; password: string }
  | {
      kind: 'invalid'
      reason: 'too_short' | 'too_long' | 'common_or_contextual'
    } {
  const normalized = normalizeAdminPassword(password)
  const length = Array.from(normalized).length
  if (length < ADMIN_PASSWORD_MIN_CODE_POINTS) {
    return { kind: 'invalid', reason: 'too_short' }
  }
  if (length > ADMIN_PASSWORD_MAX_CODE_POINTS) {
    return { kind: 'invalid', reason: 'too_long' }
  }

  const comparable = normalized.toLowerCase()
  const blocked = [
    ...COMMON_PASSWORD_FRAGMENTS,
    ...contextualFragments(context),
  ]
  if (blocked.some((fragment) => comparable.includes(fragment))) {
    return { kind: 'invalid', reason: 'common_or_contextual' }
  }

  return { kind: 'valid', password: normalized }
}

export function parsePasswordEnvelope(
  envelope: string,
): ParsedPasswordEnvelope | null {
  if (envelope.length > 160) return null
  const match = ENVELOPE_PATTERN.exec(envelope)
  if (
    match === null ||
    !SALT_LAST_CHARACTERS.includes(match[1].charAt(match[1].length - 1)) ||
    !HASH_LAST_CHARACTERS.includes(match[2].charAt(match[2].length - 1))
  ) {
    return null
  }
  return {
    version: ADMIN_SCRYPT_PARAMETERS.version,
    ln: ADMIN_SCRYPT_PARAMETERS.ln,
    N: ADMIN_SCRYPT_PARAMETERS.N,
    r: ADMIN_SCRYPT_PARAMETERS.r,
    p: ADMIN_SCRYPT_PARAMETERS.p,
    salt: match[1],
    hash: match[2],
  }
}

export function needsPasswordRehash(envelope: string) {
  return parsePasswordEnvelope(envelope) === null
}
