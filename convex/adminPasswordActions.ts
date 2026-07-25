"use node"

import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { v } from 'convex/values'
import { internalAction } from './_generated/server'
import {
  ADMIN_PASSWORD_MAX_CODE_POINTS,
  ADMIN_SCRYPT_PARAMETERS,
  needsPasswordRehash,
  normalizeAdminPassword,
  parsePasswordEnvelope,
  validateAdminPassword,
} from './adminPassword'

const passwordContextValidator = v.optional(
  v.object({
    email: v.optional(v.string()),
    displayName: v.optional(v.string()),
  }),
)

const hashResultValidator = v.union(
  v.object({
    kind: v.literal('hashed'),
    envelope: v.string(),
  }),
  v.object({ kind: v.literal('invalid_password') }),
)

const verifyResultValidator = v.union(
  v.object({
    kind: v.literal('verified'),
    valid: v.boolean(),
    rehash: v.boolean(),
  }),
  v.object({ kind: v.literal('invalid_envelope') }),
  v.object({ kind: v.literal('invalid_password') }),
)

function deriveScrypt(password: string, salt: Uint8Array) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password,
      salt,
      ADMIN_SCRYPT_PARAMETERS.derivedKeyBytes,
      {
        N: ADMIN_SCRYPT_PARAMETERS.N,
        r: ADMIN_SCRYPT_PARAMETERS.r,
        p: ADMIN_SCRYPT_PARAMETERS.p,
        maxmem: ADMIN_SCRYPT_PARAMETERS.maxmem,
      },
      (error, derivedKey) => {
        if (error) reject(error)
        else resolve(derivedKey)
      },
    )
  })
}

function decodeCanonicalBase64Url(value: string) {
  const decoded = Buffer.from(value, 'base64url')
  return decoded.toString('base64url') === value ? decoded : null
}

async function createPasswordEnvelope(password: string) {
  const salt = randomBytes(ADMIN_SCRYPT_PARAMETERS.saltBytes)
  const hash = await deriveScrypt(password, salt)
  return [
    '$scrypt',
    'v=1',
    'ln=17,r=8,p=1',
    salt.toString('base64url'),
    hash.toString('base64url'),
  ].join('$')
}

async function verifyEnvelope(password: string, envelope: string) {
  const parsed = parsePasswordEnvelope(envelope)
  if (parsed === null) return null
  const salt = decodeCanonicalBase64Url(parsed.salt)
  const expected = decodeCanonicalBase64Url(parsed.hash)
  if (
    salt === null ||
    expected === null ||
    salt.length !== ADMIN_SCRYPT_PARAMETERS.saltBytes ||
    expected.length !== ADMIN_SCRYPT_PARAMETERS.derivedKeyBytes
  ) {
    return null
  }
  const actual = await deriveScrypt(password, salt)
  return timingSafeEqual(actual, expected)
}

export const hashAdminPassword = internalAction({
  args: {
    password: v.string(),
    context: passwordContextValidator,
  },
  returns: hashResultValidator,
  handler: async (_ctx, args) => {
    const validation = validateAdminPassword(args.password, args.context)
    if (validation.kind === 'invalid') {
      return { kind: 'invalid_password' } as const
    }
    return {
      kind: 'hashed',
      envelope: await createPasswordEnvelope(validation.password),
    } as const
  },
})

export const verifyAdminPassword = internalAction({
  args: {
    password: v.string(),
    envelope: v.string(),
  },
  returns: verifyResultValidator,
  handler: async (_ctx, args) => {
    const password = normalizeAdminPassword(args.password)
    if (Array.from(password).length > ADMIN_PASSWORD_MAX_CODE_POINTS) {
      return { kind: 'invalid_password' } as const
    }
    const valid = await verifyEnvelope(password, args.envelope)
    if (valid === null) {
      return { kind: 'invalid_envelope' } as const
    }
    return {
      kind: 'verified',
      valid,
      rehash: needsPasswordRehash(args.envelope),
    } as const
  },
})

export const rehashAdminPassword = internalAction({
  args: {
    password: v.string(),
    envelope: v.string(),
    context: passwordContextValidator,
  },
  returns: v.union(
    hashResultValidator,
    v.object({ kind: v.literal('invalid_envelope') }),
    v.object({ kind: v.literal('invalid_credentials') }),
  ),
  handler: async (_ctx, args) => {
    const password = normalizeAdminPassword(args.password)
    if (Array.from(password).length > ADMIN_PASSWORD_MAX_CODE_POINTS) {
      return { kind: 'invalid_credentials' } as const
    }
    const valid = await verifyEnvelope(password, args.envelope)
    if (valid === null) return { kind: 'invalid_envelope' } as const
    if (!valid) return { kind: 'invalid_credentials' } as const
    const validation = validateAdminPassword(password, args.context)
    if (validation.kind === 'invalid') {
      return { kind: 'invalid_password' } as const
    }
    return {
      kind: 'hashed',
      envelope: await createPasswordEnvelope(validation.password),
    } as const
  },
})
