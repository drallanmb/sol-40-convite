"use node"

import { createHash } from 'node:crypto'
import { makeFunctionReference } from 'convex/server'
import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { action } from './_generated/server'
import { adminAccessPurposeValidator } from './adminAccessLinks'
import { validateAdminToken } from './adminSecurity'

const prepareAccessLinkConsumption = makeFunctionReference<
  'mutation',
  {
    purpose: 'activation' | 'reset'
    tokenHash: string
    now: number
  },
  {
    kind: 'invalid'
  } | {
    kind: 'rate_limited'
    retryAfterSeconds: number
  } | {
      kind: 'ready'
      linkId: Id<'adminAccessLinks'>
      accountId: Id<'adminAccounts'>
      credentialVersion: number
      email: string
      displayName: string
  }
>('adminAccessLinks:prepareAccessLinkConsumption')
const finishAccessLink = makeFunctionReference<
  'mutation',
  {
      linkId: Id<'adminAccessLinks'>
      tokenHash: string
      purpose: 'activation' | 'reset'
      expectedCredentialVersion: number
      passwordHash: string
      now: number
  },
  { kind: 'completed' | 'invalid' }
>('adminAccessLinks:finishAccessLink')
const hashAdminPassword = makeFunctionReference<
  'action',
  {
      password: string
      context?: { email?: string; displayName?: string }
  },
  { kind: 'hashed'; envelope: string } | { kind: 'invalid_password' }
>('adminPasswordActions:hashAdminPassword')

function tokenHash(token: string) {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export const consumeAccessLink = action({
  args: {
    token: v.string(),
    purpose: adminAccessPurposeValidator,
    password: v.string(),
  },
  returns: v.union(
    v.object({ kind: v.literal('completed') }),
    v.object({ kind: v.literal('invalid') }),
    v.object({ kind: v.literal('invalid_password') }),
    v.object({
      kind: v.literal('rate_limited'),
      retryAfterSeconds: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    if (!validateAdminToken(args.token)) return { kind: 'invalid' } as const
    const hash = tokenHash(args.token)
    const snapshot = await ctx.runMutation(prepareAccessLinkConsumption, {
      tokenHash: hash,
      purpose: args.purpose,
      now: Date.now(),
    })
    if (snapshot.kind !== 'ready') return snapshot
    const password = await ctx.runAction(hashAdminPassword, {
      password: args.password,
      context: {
        email: snapshot.email,
        displayName: snapshot.displayName,
      },
    })
    if (password.kind !== 'hashed') {
      return { kind: 'invalid_password' } as const
    }
    return ctx.runMutation(finishAccessLink, {
      linkId: snapshot.linkId,
      tokenHash: hash,
      purpose: args.purpose,
      expectedCredentialVersion: snapshot.credentialVersion,
      passwordHash: password.envelope,
      now: Date.now(),
    })
  },
})
