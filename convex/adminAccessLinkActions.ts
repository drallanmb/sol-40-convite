"use node"

import { createHash } from 'node:crypto'
import type { FunctionReference } from 'convex/server'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import { action, internalAction } from './_generated/server'
import { adminAccessPurposeValidator } from './adminAccessLinks'
import { validateAdminToken } from './adminSecurity'

const accessLinksApi = (internal as unknown as {
  adminAccessLinks: {
    prepareAccessLink: FunctionReference<'mutation', 'internal', {
      accountId: Id<'adminAccounts'>
      purpose: 'activation' | 'reset'
      tokenHash: string
      now: number
    }, { kind: 'created' | 'invalid' }>
    readAccessLinkSnapshot: FunctionReference<'query', 'internal', {
      tokenHash: string
      purpose: 'activation' | 'reset'
      now: number
    }, {
      kind: 'invalid'
    } | {
      kind: 'ready'
      linkId: Id<'adminAccessLinks'>
      accountId: Id<'adminAccounts'>
      credentialVersion: number
      email: string
      displayName: string
    }>
    finishAccessLink: FunctionReference<'mutation', 'internal', {
      linkId: Id<'adminAccessLinks'>
      tokenHash: string
      purpose: 'activation' | 'reset'
      expectedCredentialVersion: number
      passwordHash: string
      now: number
    }, { kind: 'completed' | 'invalid' }>
  }
  adminPasswordActions: {
    hashAdminPassword: FunctionReference<'action', 'internal', {
      password: string
      context?: { email?: string; displayName?: string }
    }, { kind: 'hashed'; envelope: string } | { kind: 'invalid_password' }>
  }
}).adminAccessLinks

const passwordApi = (internal as unknown as {
  adminPasswordActions: {
    hashAdminPassword: FunctionReference<'action', 'internal', {
      password: string
      context?: { email?: string; displayName?: string }
    }, { kind: 'hashed'; envelope: string } | { kind: 'invalid_password' }>
  }
}).adminPasswordActions

function tokenHash(token: string) {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export const createAccessLink = internalAction({
  args: {
    accountId: v.id('adminAccounts'),
    purpose: adminAccessPurposeValidator,
    token: v.string(),
  },
  returns: v.union(
    v.object({ kind: v.literal('created') }),
    v.object({ kind: v.literal('invalid') }),
  ),
  handler: async (ctx, args) => {
    if (!validateAdminToken(args.token)) return { kind: 'invalid' } as const
    return ctx.runMutation(accessLinksApi.prepareAccessLink, {
      accountId: args.accountId,
      purpose: args.purpose,
      tokenHash: tokenHash(args.token),
      now: Date.now(),
    })
  },
})

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
  ),
  handler: async (ctx, args) => {
    if (!validateAdminToken(args.token)) return { kind: 'invalid' } as const
    const hash = tokenHash(args.token)
    const snapshot = await ctx.runQuery(accessLinksApi.readAccessLinkSnapshot, {
      tokenHash: hash,
      purpose: args.purpose,
      now: Date.now(),
    })
    if (snapshot.kind !== 'ready') return { kind: 'invalid' } as const
    const password = await ctx.runAction(passwordApi.hashAdminPassword, {
      password: args.password,
      context: {
        email: snapshot.email,
        displayName: snapshot.displayName,
      },
    })
    if (password.kind !== 'hashed') {
      return { kind: 'invalid_password' } as const
    }
    return ctx.runMutation(accessLinksApi.finishAccessLink, {
      linkId: snapshot.linkId,
      tokenHash: hash,
      purpose: args.purpose,
      expectedCredentialVersion: snapshot.credentialVersion,
      passwordHash: password.envelope,
      now: Date.now(),
    })
  },
})
