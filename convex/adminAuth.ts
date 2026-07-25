import { v } from 'convex/values'
import type { FunctionReference } from 'convex/server'
import { internal } from './_generated/api'
import { mutation, query } from './_generated/server'
import type { Id } from './_generated/dataModel'
import {
  ADMIN_SESSION_TTL_MS,
  adminLogoutResultValidator,
  adminSessionStatusValidator,
} from './adminModel'
import {
  ADMIN_LOGIN_LIMIT_KEY,
  adminRateLimiter,
} from './adminRateLimits'
import {
  compareAdminPassword,
  hashAdminToken,
  requireAdminSession,
  validateAdminToken,
} from './adminSecurity'
import { appendAuditEvent } from './adminAuditModel'

declare const process: {
  env: Record<string, string | undefined>
}

const expireAdminSession = (internal as unknown as {
  adminInternal: {
    expireAdminSession: FunctionReference<
      'mutation',
      'internal',
      {
        sessionId: Id<'adminSessions'>
        expectedExpiresAt: number
      },
      unknown
    >
  }
}).adminInternal.expireAdminSession

function retryAfterSeconds(retryAfterMs: number | undefined) {
  return Math.max(1, Math.ceil((retryAfterMs ?? 0) / 1_000))
}

const legacyLoginResultValidator = v.union(
  v.object({
    kind: v.literal('authenticated'),
    expiresAt: v.number(),
  }),
  v.object({ kind: v.literal('invalid_credentials') }),
  v.object({ kind: v.literal('invalid_token') }),
  v.object({ kind: v.literal('token_conflict') }),
  v.object({
    kind: v.literal('rate_limited'),
    retryAfterSeconds: v.number(),
  }),
)

export const login = mutation({
  args: {
    password: v.string(),
    token: v.string(),
  },
  returns: legacyLoginResultValidator,
  handler: async (ctx, args) => {
    const now = Date.now()
    const rateLimit = await adminRateLimiter.limit(ctx, 'loginGlobal', {
      key: ADMIN_LOGIN_LIMIT_KEY,
    })
    if (!rateLimit.ok) {
      await appendAuditEvent(ctx, {
        actorKind: 'anonymous',
        area: 'auth',
        action: 'login_rate_limited',
        occurredAt: now,
      })
      return {
        kind: 'rate_limited',
        retryAfterSeconds: retryAfterSeconds(rateLimit.retryAfter),
      } as const
    }

    const configs = await ctx.db
      .query('adminAuthConfig')
      .withIndex('by_key', (query) => query.eq('key', 'primary'))
      .take(2)
    if (
      configs.length > 1 ||
      configs[0]?.bootstrapCompletedAt !== undefined
    ) {
      await appendAuditEvent(ctx, {
        actorKind: 'anonymous',
        area: 'auth',
        action: 'login_failed',
        occurredAt: now,
      })
      return { kind: 'invalid_credentials' } as const
    }

    const validPassword = await compareAdminPassword(
      args.password,
      process.env.ADMIN_PASSWORD,
    )
    if (!validPassword) {
      await appendAuditEvent(ctx, {
        actorKind: 'anonymous',
        area: 'auth',
        action: 'login_failed',
        occurredAt: now,
      })
      return { kind: 'invalid_credentials' } as const
    }
    if (!validateAdminToken(args.token)) {
      return { kind: 'invalid_token' } as const
    }

    const tokenHash = await hashAdminToken(args.token)
    const collision = await ctx.db
      .query('adminSessions')
      .withIndex('by_token_hash', (index) => index.eq('tokenHash', tokenHash))
      .first()
    if (collision) {
      return { kind: 'token_conflict' } as const
    }

    const expiresAt = now + ADMIN_SESSION_TTL_MS
    const sessionId = await ctx.db.insert('adminSessions', {
      tokenHash,
      createdAt: now,
      expiresAt,
    })
    await ctx.scheduler.runAt(expiresAt, expireAdminSession, {
      sessionId,
      expectedExpiresAt: expiresAt,
    })
    await appendAuditEvent(ctx, {
      principal: { kind: 'legacy' },
      area: 'auth',
      action: 'login_succeeded',
      targetType: 'adminSession',
      targetId: sessionId,
      targetLabel: 'Acesso legado',
      occurredAt: now,
    })

    return { kind: 'authenticated', expiresAt } as const
  },
})

export const getSessionStatus = query({
  args: {
    token: v.string(),
  },
  returns: adminSessionStatusValidator,
  handler: async (ctx, args) => {
    const authorization = await requireAdminSession(ctx, args.token)
    if (authorization.kind === 'unauthorized') {
      return { kind: 'invalid' } as const
    }

    return {
      kind: 'valid',
      expiresAt: authorization.session.expiresAt,
      ...(authorization.principal.kind === 'account'
        ? {
            principal: {
              id: authorization.principal.account._id,
              displayName: authorization.principal.account.displayName,
              role: authorization.principal.account.role,
            },
          }
        : {
            principal: {
              displayName: 'Acesso legado',
              role: 'owner' as const,
            },
          }),
    } as const
  },
})

export const logout = mutation({
  args: {
    token: v.string(),
  },
  returns: adminLogoutResultValidator,
  handler: async (ctx, args) => {
    const authorization = await requireAdminSession(ctx, args.token)
    if (validateAdminToken(args.token)) {
      const tokenHash = await hashAdminToken(args.token)
      const sessions = await ctx.db
        .query('adminSessions')
        .withIndex('by_token_hash', (index) =>
          index.eq('tokenHash', tokenHash),
        )
        .collect()
      for (const session of sessions) {
        await ctx.db.delete(session._id)
      }
    }
    if (authorization.kind === 'authorized') {
      await appendAuditEvent(ctx, {
        principal: authorization.principal,
        subjectAccountId:
          authorization.principal.kind === 'account'
            ? authorization.principal.account._id
            : undefined,
        area: 'sessions',
        action: 'logout',
        targetType: 'adminSession',
        targetId: authorization.session._id,
        targetLabel:
          authorization.session.deviceLabel ?? 'Aparelho sem nome',
      })
    }

    return { kind: 'logged_out' } as const
  },
})
