"use node"

import {
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto'
import type { FunctionReference } from 'convex/server'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import { action } from './_generated/server'
import { BOOTSTRAP_OWNER_EMAIL } from './adminBootstrap'

declare const process: {
  env: Record<string, string | undefined>
}

const bootstrapApi = (internal as unknown as {
  adminBootstrap: {
    consumeMasterAttempt: FunctionReference<'mutation', 'internal', {
      operation: 'bootstrap' | 'recovery'
    }, {
      kind: 'allowed'
    } | {
      kind: 'rate_limited'
      retryAfterSeconds: number
    }>
    finishBootstrap: FunctionReference<'mutation', 'internal', {
      email: string
      tokenHash: string
      now: number
    }, { kind: 'created' | 'pending' | 'unavailable' }>
    finishMasterRecovery: FunctionReference<'mutation', 'internal', {
      tokenHash: string
      now: number
    }, { kind: 'created' | 'unavailable' }>
  }
}).adminBootstrap

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
      bootstrapApi.consumeMasterAttempt,
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
    const result = await ctx.runMutation(bootstrapApi.finishBootstrap, {
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
      bootstrapApi.consumeMasterAttempt,
      { operation: 'recovery' },
    )
    if (rateLimit.kind === 'rate_limited') return rateLimit
    if (!validMasterPassword(args.masterPassword)) {
      return { kind: 'invalid_credentials' } as const
    }
    const capability = createCapability()
    const result = await ctx.runMutation(
      bootstrapApi.finishMasterRecovery,
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
