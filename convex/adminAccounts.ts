import { v } from 'convex/values'
import { makeFunctionReference } from 'convex/server'
import type { Id } from './_generated/dataModel'
import { internalMutation } from './_generated/server'
import { normalizeAdminEmail } from './adminAccountModel'
import { appendAuditEvent } from './adminAuditModel'
import { ADMIN_SESSION_TTL_MS } from './adminModel'
import { adminRateLimiter } from './adminRateLimits'

const DUMMY_PASSWORD_ENVELOPE =
  '$scrypt$v=1$ln=17,r=8,p=1$c29sNDAtZHVtbXktc2FsdC12MQ$yqumS5Mk1kDVII_FwzUTp7AD6tcYOeDuXStq-me6o0k'
const expireAdminSession = makeFunctionReference<
  'mutation',
  {
    sessionId: Id<'adminSessions'>
    expectedExpiresAt: number
  },
  unknown
>('adminInternal:expireAdminSession')

function retryAfterSeconds(retryAfterMs: number | undefined) {
  return Math.max(1, Math.ceil((retryAfterMs ?? 0) / 1_000))
}

function normalizeDeviceLabel(value: string) {
  const normalized = value.normalize('NFC').trim().replace(/\s+/gu, ' ')
  return normalized.slice(0, 120) || 'Aparelho sem nome'
}

export const prepareIndividualLogin = internalMutation({
  args: { email: v.string() },
  returns: v.union(
    v.object({
      kind: v.literal('ready'),
      accountId: v.optional(v.id('adminAccounts')),
      credentialVersion: v.optional(v.number()),
      passwordHash: v.string(),
    }),
    v.object({
      kind: v.literal('rate_limited'),
      retryAfterSeconds: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const email = normalizeAdminEmail(args.email)
    const [globalLimit, emailLimit] = await Promise.all([
      adminRateLimiter.limit(ctx, 'loginGlobal', { key: 'individual-login' }),
      adminRateLimiter.limit(ctx, 'loginEmail', { key: email }),
    ])
    if (!globalLimit.ok || !emailLimit.ok) {
      const now = Date.now()
      await appendAuditEvent(ctx, {
        actorKind: 'anonymous',
        area: 'auth',
        action: 'login_rate_limited',
        targetType: 'adminAccount',
        occurredAt: now,
      })
      return {
        kind: 'rate_limited',
        retryAfterSeconds: Math.max(
          retryAfterSeconds(globalLimit.retryAfter),
          retryAfterSeconds(emailLimit.retryAfter),
        ),
      } as const
    }

    const accounts = await ctx.db
      .query('adminAccounts')
      .withIndex('by_email', (query) => query.eq('email', email))
      .take(2)
    const account = accounts.length === 1 ? accounts[0] : null
    if (
      account === null ||
      account.state !== 'active' ||
      account.passwordHash === undefined
    ) {
      return {
        kind: 'ready',
        passwordHash: DUMMY_PASSWORD_ENVELOPE,
      } as const
    }
    return {
      kind: 'ready',
      accountId: account._id,
      credentialVersion: account.credentialVersion,
      passwordHash: account.passwordHash,
    } as const
  },
})

export const finishIndividualLogin = internalMutation({
  args: {
    accountId: v.optional(v.id('adminAccounts')),
    expectedCredentialVersion: v.optional(v.number()),
    passwordValid: v.boolean(),
    tokenHash: v.string(),
    deviceLabel: v.string(),
    now: v.number(),
  },
  returns: v.union(
    v.object({
      kind: v.literal('authenticated'),
      sessionId: v.id('adminSessions'),
      expiresAt: v.number(),
      principal: v.object({
        id: v.id('adminAccounts'),
        displayName: v.string(),
        role: v.union(
          v.literal('owner'),
          v.literal('manager'),
          v.literal('seller'),
        ),
      }),
    }),
    v.object({ kind: v.literal('invalid_credentials') }),
    v.object({ kind: v.literal('token_conflict') }),
  ),
  handler: async (ctx, args) => {
    const account =
      args.accountId === undefined ? null : await ctx.db.get(args.accountId)
    if (
      !args.passwordValid ||
      account === null ||
      account.state !== 'active' ||
      account.passwordHash === undefined ||
      args.expectedCredentialVersion === undefined ||
      account.credentialVersion !== args.expectedCredentialVersion
    ) {
      await appendAuditEvent(ctx, {
        actorKind: 'anonymous',
        area: 'auth',
        action: 'login_failed',
        targetType: 'adminAccount',
        occurredAt: args.now,
      })
      return { kind: 'invalid_credentials' } as const
    }
    const collision = await ctx.db
      .query('adminSessions')
      .withIndex('by_token_hash', (query) =>
        query.eq('tokenHash', args.tokenHash),
      )
      .first()
    if (collision) return { kind: 'token_conflict' } as const

    const expiresAt = args.now + ADMIN_SESSION_TTL_MS
    const sessionId = await ctx.db.insert('adminSessions', {
      tokenHash: args.tokenHash,
      accountId: account._id,
      credentialVersion: account.credentialVersion,
      deviceLabel: normalizeDeviceLabel(args.deviceLabel),
      createdAt: args.now,
      expiresAt,
    })
    await ctx.scheduler.runAt(expiresAt, expireAdminSession, {
      sessionId,
      expectedExpiresAt: expiresAt,
    })
    await appendAuditEvent(ctx, {
      principal: {
        kind: 'account',
        account: {
          _id: account._id,
          displayName: account.displayName,
          email: account.email,
          role: account.role,
        },
      },
      area: 'auth',
      action: 'login_succeeded',
      targetType: 'adminSession',
      targetId: sessionId,
      targetLabel: normalizeDeviceLabel(args.deviceLabel),
      occurredAt: args.now,
    })
    return {
      kind: 'authenticated',
      sessionId,
      expiresAt,
      principal: {
        id: account._id,
        displayName: account.displayName,
        role: account.role,
      },
    } as const
  },
})

export type IndividualLoginFinalizerResult =
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
