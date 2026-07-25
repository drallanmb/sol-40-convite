import type { Doc } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'
import type { AdminPrincipal } from './adminAccountModel'
import {
  ADMIN_CAPABILITY_BYTE_LENGTH,
  isAdminSessionActive,
} from './adminModel'

const ADMIN_CAPABILITY_PATTERN = /^[A-Za-z0-9_-]{43}$/u
const CANONICAL_LAST_CHARACTERS =
  'AEIMQUYcgkosw048'
const PASSWORD_COMPARISON_FALLBACK =
  'sol40-admin-password-not-configured-constant-work-fallback'

type AdminReadContext = Pick<QueryCtx, 'db'>
type AdminWriteContext = Pick<MutationCtx, 'db'>

function toHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

async function sha256(value: string) {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
}

export function validateAdminToken(token: string) {
  return (
    token.length === Math.ceil((ADMIN_CAPABILITY_BYTE_LENGTH * 8) / 6) &&
    ADMIN_CAPABILITY_PATTERN.test(token) &&
    CANONICAL_LAST_CHARACTERS.includes(token.charAt(token.length - 1))
  )
}

export async function hashAdminToken(token: string) {
  if (!validateAdminToken(token)) {
    throw new Error('Invalid admin capability')
  }

  return toHex(await sha256(token))
}

/**
 * Both inputs are digested and all digest bytes are compared. This keeps the
 * amount of comparison work independent from a matching character prefix.
 */
export async function compareAdminPassword(
  candidate: string,
  configuredPassword: string | undefined,
) {
  const configured =
    configuredPassword && configuredPassword.length > 0
      ? configuredPassword
      : PASSWORD_COMPARISON_FALLBACK
  const [candidateDigest, configuredDigest] = await Promise.all([
    sha256(candidate),
    sha256(configured),
  ])
  const candidateBytes = new Uint8Array(candidateDigest)
  const configuredBytes = new Uint8Array(configuredDigest)
  let difference = configuredPassword && configuredPassword.length > 0 ? 0 : 1

  for (let index = 0; index < configuredBytes.length; index += 1) {
    difference |= candidateBytes[index] ^ configuredBytes[index]
  }

  return difference === 0
}

export type AdminAuthorization =
  | {
      kind: 'authorized'
      session: Doc<'adminSessions'>
      principal: AdminPrincipal
    }
  | { kind: 'unauthorized' }

export async function requireAdminSession(
  ctx: AdminReadContext | AdminWriteContext,
  token: string,
  now = Date.now(),
): Promise<AdminAuthorization> {
  if (!validateAdminToken(token)) {
    return { kind: 'unauthorized' }
  }

  const tokenHash = await hashAdminToken(token)
  const sessions = await ctx.db
    .query('adminSessions')
    .withIndex('by_token_hash', (query) => query.eq('tokenHash', tokenHash))
    .take(2)

  if (
    sessions.length !== 1 ||
    !isAdminSessionActive(sessions[0].expiresAt, now)
  ) {
    return { kind: 'unauthorized' }
  }

  const session = sessions[0]
  if (session.accountId === undefined) {
    const configs = await ctx.db
      .query('adminAuthConfig')
      .withIndex('by_key', (query) => query.eq('key', 'primary'))
      .take(2)
    if (configs.length > 1 || configs[0]?.legacyDisabledAt !== undefined) {
      return { kind: 'unauthorized' }
    }
    return {
      kind: 'authorized',
      session,
      principal: { kind: 'legacy' },
    }
  }

  const account = await ctx.db.get(session.accountId)
  if (
    account === null ||
    account.state !== 'active' ||
    session.credentialVersion === undefined ||
    session.credentialVersion !== account.credentialVersion
  ) {
    return { kind: 'unauthorized' }
  }

  return {
    kind: 'authorized',
    session,
    principal: {
      kind: 'account',
      account: {
        _id: account._id,
        displayName: account.displayName,
        email: account.email,
        role: account.role,
      },
    },
  }
}
