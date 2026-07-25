import { v } from 'convex/values'
import type { FunctionReference } from 'convex/server'
import { internal } from './_generated/api'
import { mutation, query } from './_generated/server'
import type { Id } from './_generated/dataModel'
import {
  ADMIN_SESSION_TTL_MS,
  adminLoginResultValidator,
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

export const login = mutation({
  args: {
    password: v.string(),
    token: v.string(),
  },
  returns: adminLoginResultValidator,
  handler: async (ctx, args) => {
    const rateLimit = await adminRateLimiter.limit(ctx, 'loginGlobal', {
      key: ADMIN_LOGIN_LIMIT_KEY,
    })
    if (!rateLimit.ok) {
      return {
        kind: 'rate_limited',
        retryAfterSeconds: retryAfterSeconds(rateLimit.retryAfter),
      } as const
    }

    const validPassword = await compareAdminPassword(
      args.password,
      process.env.ADMIN_PASSWORD,
    )
    if (!validPassword) {
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

    const now = Date.now()
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
    } as const
  },
})

export const logout = mutation({
  args: {
    token: v.string(),
  },
  returns: adminLogoutResultValidator,
  handler: async (ctx, args) => {
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

    return { kind: 'logged_out' } as const
  },
})
