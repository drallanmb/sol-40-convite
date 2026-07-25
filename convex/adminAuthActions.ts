"use node"

import {
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto'
import { makeFunctionReference } from 'convex/server'
import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { action } from './_generated/server'
import { BOOTSTRAP_OWNER_EMAIL } from './adminBootstrap'
import {
  adminLoginResultValidator,
} from './adminModel'
import {
  hashAdminToken,
  validateAdminToken,
} from './adminSecurity'

declare const process: {
  env: Record<string, string | undefined>
}

const consumeMasterAttempt = makeFunctionReference<
  'mutation',
  {
      operation: 'bootstrap' | 'recovery'
  },
  {
      kind: 'allowed'
    } | {
      kind: 'rate_limited'
      retryAfterSeconds: number
  }
>('adminBootstrap:consumeMasterAttempt')
const finishBootstrap = makeFunctionReference<
  'mutation',
  {
      email: string
      tokenHash: string
      now: number
  },
  { kind: 'created' | 'pending' | 'unavailable' }
>('adminBootstrap:finishBootstrap')
const finishMasterRecovery = makeFunctionReference<
  'mutation',
  {
      tokenHash: string
      now: number
  },
  { kind: 'created' | 'unavailable' }
>('adminBootstrap:finishMasterRecovery')
const regenerateBootstrapActivation = makeFunctionReference<
  'mutation',
  { tokenHash: string; now: number },
  { kind: 'created' | 'unavailable' }
>('adminBootstrap:regenerateBootstrapActivation')
const prepareIndividualLogin = makeFunctionReference<
  'mutation',
  { email: string },
  | {
      kind: 'ready'
      accountId?: Id<'adminAccounts'>
      credentialVersion?: number
      passwordHash: string
    }
  | { kind: 'rate_limited'; retryAfterSeconds: number }
>('adminAccounts:prepareIndividualLogin')
const finishIndividualLogin = makeFunctionReference<
  'mutation',
  {
    accountId?: Id<'adminAccounts'>
    expectedCredentialVersion?: number
    passwordValid: boolean
    tokenHash: string
    deviceLabel: string
    now: number
  },
  | {
      kind: 'authenticated'
      sessionId: Id<'adminSessions'>
      expiresAt: number
      principal: {
        id: Id<'adminAccounts'>
        displayName: string
        role: 'owner' | 'manager' | 'seller'
      }
    }
  | { kind: 'invalid_credentials' }
  | { kind: 'token_conflict' }
>('adminAccounts:finishIndividualLogin')
const verifyAdminPassword = makeFunctionReference<
  'action',
  { password: string; envelope: string },
  | { kind: 'verified'; valid: boolean; rehash: boolean }
  | { kind: 'invalid_envelope' }
  | { kind: 'invalid_password' }
>('adminPasswordActions:verifyAdminPassword')
const hashAdminPassword = makeFunctionReference<
  'action',
  {
    password: string
    context?: { email?: string; displayName?: string }
  },
  { kind: 'hashed'; envelope: string } | { kind: 'invalid_password' }
>('adminPasswordActions:hashAdminPassword')
const readOwnCredentialSnapshot = makeFunctionReference<
  'query',
  { token: string },
  | { kind: 'unauthorized' }
  | {
      kind: 'ready'
      accountId: Id<'adminAccounts'>
      sessionId: Id<'adminSessions'>
      credentialVersion: number
      passwordHash: string
      email: string
      displayName: string
      role: 'owner' | 'manager' | 'seller'
    }
>('adminAccounts:readOwnCredentialSnapshot')
const finishOwnPasswordChange = makeFunctionReference<
  'mutation',
  {
    token: string
    expectedAccountId: Id<'adminAccounts'>
    expectedSessionId: Id<'adminSessions'>
    expectedCredentialVersion: number
    passwordHash: string
    now: number
  },
  { kind: 'changed' } | { kind: 'conflict' } | { kind: 'unauthorized' }
>('adminAccounts:finishOwnPasswordChange')
const finishOwnerEmailChange = makeFunctionReference<
  'mutation',
  {
    token: string
    expectedAccountId: Id<'adminAccounts'>
    expectedCredentialVersion: number
    email: string
    now: number
  },
  | { kind: 'changed'; email: string }
  | { kind: 'conflict' }
  | { kind: 'invalid_email' }
  | { kind: 'email_taken' }
  | { kind: 'unauthorized' }
  | { kind: 'forbidden' }
>('adminAccounts:finishOwnerEmailChange')

function digest(value: string) {
  return createHash('sha256').update(value, 'utf8').digest()
}

function validMasterPassword(candidate: string) {
  const configured = process.env.ADMIN_PASSWORD
  const candidateDigest = digest(candidate)
  const configuredDigest = digest(
    configured && configured.length > 0
      ? configured
      : 'sol40-master-password-not-configured',
  )
  return Boolean(
    configured &&
      configured.length > 0 &&
      timingSafeEqual(candidateDigest, configuredDigest),
  )
}

function createCapability() {
  const token = randomBytes(32).toString('base64url')
  return {
    token,
    tokenHash: createHash('sha256').update(token, 'utf8').digest('hex'),
  }
}

const rateLimitedValidator = v.object({
  kind: v.literal('rate_limited'),
  retryAfterSeconds: v.number(),
})

export const login = action({
  args: {
    email: v.string(),
    password: v.string(),
    token: v.string(),
    deviceLabel: v.string(),
  },
  returns: adminLoginResultValidator,
  handler: async (ctx, args) => {
    if (!validateAdminToken(args.token)) {
      return { kind: 'invalid_token' } as const
    }
    const snapshot = await ctx.runMutation(prepareIndividualLogin, {
      email: args.email,
    })
    if (snapshot.kind === 'rate_limited') return snapshot
    const verification = await ctx.runAction(verifyAdminPassword, {
      password: args.password,
      envelope: snapshot.passwordHash,
    })
    const result = await ctx.runMutation(finishIndividualLogin, {
      ...(snapshot.accountId === undefined
        ? {}
        : { accountId: snapshot.accountId }),
      ...(snapshot.credentialVersion === undefined
        ? {}
        : { expectedCredentialVersion: snapshot.credentialVersion }),
      passwordValid:
        verification.kind === 'verified' && verification.valid,
      tokenHash: await hashAdminToken(args.token),
      deviceLabel: args.deviceLabel,
      now: Date.now(),
    })
    if (result.kind !== 'authenticated') return result
    return {
      kind: 'authenticated',
      expiresAt: result.expiresAt,
      principal: result.principal,
    } as const
  },
})

const credentialActionResultValidator = v.union(
  v.object({ kind: v.literal('changed') }),
  v.object({ kind: v.literal('invalid_credentials') }),
  v.object({ kind: v.literal('invalid_password') }),
  v.object({ kind: v.literal('conflict') }),
  v.object({ kind: v.literal('unauthorized') }),
)

export const changeOwnPassword = action({
  args: {
    token: v.string(),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  returns: credentialActionResultValidator,
  handler: async (ctx, args) => {
    const snapshot = await ctx.runQuery(readOwnCredentialSnapshot, {
      token: args.token,
    })
    if (snapshot.kind === 'unauthorized') return snapshot
    const current = await ctx.runAction(verifyAdminPassword, {
      password: args.currentPassword,
      envelope: snapshot.passwordHash,
    })
    if (current.kind !== 'verified' || !current.valid) {
      return { kind: 'invalid_credentials' } as const
    }
    const password = await ctx.runAction(hashAdminPassword, {
      password: args.newPassword,
      context: {
        email: snapshot.email,
        displayName: snapshot.displayName,
      },
    })
    if (password.kind !== 'hashed') return password
    return ctx.runMutation(finishOwnPasswordChange, {
      token: args.token,
      expectedAccountId: snapshot.accountId,
      expectedSessionId: snapshot.sessionId,
      expectedCredentialVersion: snapshot.credentialVersion,
      passwordHash: password.envelope,
      now: Date.now(),
    })
  },
})

export const changeOwnerEmail = action({
  args: {
    token: v.string(),
    currentPassword: v.string(),
    email: v.string(),
  },
  returns: v.union(
    v.object({ kind: v.literal('changed'), email: v.string() }),
    v.object({ kind: v.literal('invalid_credentials') }),
    v.object({ kind: v.literal('invalid_email') }),
    v.object({ kind: v.literal('email_taken') }),
    v.object({ kind: v.literal('conflict') }),
    v.object({ kind: v.literal('unauthorized') }),
    v.object({ kind: v.literal('forbidden') }),
  ),
  handler: async (ctx, args) => {
    const snapshot = await ctx.runQuery(readOwnCredentialSnapshot, {
      token: args.token,
    })
    if (snapshot.kind === 'unauthorized') return snapshot
    if (snapshot.role !== 'owner') return { kind: 'forbidden' } as const
    const current = await ctx.runAction(verifyAdminPassword, {
      password: args.currentPassword,
      envelope: snapshot.passwordHash,
    })
    if (current.kind !== 'verified' || !current.valid) {
      return { kind: 'invalid_credentials' } as const
    }
    return ctx.runMutation(finishOwnerEmailChange, {
      token: args.token,
      expectedAccountId: snapshot.accountId,
      expectedCredentialVersion: snapshot.credentialVersion,
      email: args.email,
      now: Date.now(),
    })
  },
})

export const bootstrapOwner = action({
  args: {
    masterPassword: v.string(),
    email: v.string(),
  },
  returns: v.union(
    v.object({ kind: v.literal('created'), token: v.string() }),
    v.object({ kind: v.literal('pending') }),
    v.object({ kind: v.literal('unavailable') }),
    v.object({ kind: v.literal('invalid_credentials') }),
    rateLimitedValidator,
  ),
  handler: async (ctx, args) => {
    const rateLimit = await ctx.runMutation(
      consumeMasterAttempt,
      { operation: 'bootstrap' },
    )
    if (rateLimit.kind === 'rate_limited') return rateLimit
    if (
      args.email.normalize('NFC').trim().toLowerCase() !==
        BOOTSTRAP_OWNER_EMAIL ||
      !validMasterPassword(args.masterPassword)
    ) {
      return { kind: 'invalid_credentials' } as const
    }
    const capability = createCapability()
    const result = await ctx.runMutation(finishBootstrap, {
      email: BOOTSTRAP_OWNER_EMAIL,
      tokenHash: capability.tokenHash,
      now: Date.now(),
    })
    if (result.kind === 'created') {
      return { kind: 'created', token: capability.token } as const
    }
    if (result.kind === 'pending') return { kind: 'pending' } as const
    return { kind: 'unavailable' } as const
  },
})

export const recoverOwner = action({
  args: {
    masterPassword: v.string(),
  },
  returns: v.union(
    v.object({ kind: v.literal('created'), token: v.string() }),
    v.object({ kind: v.literal('unavailable') }),
    v.object({ kind: v.literal('invalid_credentials') }),
    rateLimitedValidator,
  ),
  handler: async (ctx, args) => {
    const rateLimit = await ctx.runMutation(
      consumeMasterAttempt,
      { operation: 'recovery' },
    )
    if (rateLimit.kind === 'rate_limited') return rateLimit
    if (!validMasterPassword(args.masterPassword)) {
      return { kind: 'invalid_credentials' } as const
    }
    const capability = createCapability()
    const result = await ctx.runMutation(
      finishMasterRecovery,
      {
        tokenHash: capability.tokenHash,
        now: Date.now(),
      },
    )
    return result.kind === 'created'
      ? ({ kind: 'created', token: capability.token } as const)
      : ({ kind: 'unavailable' } as const)
  },
})

export const regenerateOwnerActivation = action({
  args: {
    masterPassword: v.string(),
  },
  returns: v.union(
    v.object({ kind: v.literal('created'), token: v.string() }),
    v.object({ kind: v.literal('unavailable') }),
    v.object({ kind: v.literal('invalid_credentials') }),
    rateLimitedValidator,
  ),
  handler: async (ctx, args) => {
    const rateLimit = await ctx.runMutation(consumeMasterAttempt, {
      operation: 'bootstrap',
    })
    if (rateLimit.kind === 'rate_limited') return rateLimit
    if (!validMasterPassword(args.masterPassword)) {
      return { kind: 'invalid_credentials' } as const
    }
    const capability = createCapability()
    const result = await ctx.runMutation(regenerateBootstrapActivation, {
      tokenHash: capability.tokenHash,
      now: Date.now(),
    })
    return result.kind === 'created'
      ? ({ kind: 'created', token: capability.token } as const)
      : ({ kind: 'unavailable' } as const)
  },
})
