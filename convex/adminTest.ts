import { internalMutation } from './_generated/server'
import { ADMIN_SESSION_TTL_MS } from './adminModel'
import { expireAdminSessionRecord } from './adminInternal'
import {
  hashAdminToken,
  requireAdminSession,
} from './adminSecurity'

const SMOKE_TOKEN = 'c29sNDAtaW50ZXJuYWwtc21va2UtdG9rZW4tMDAwMDA'

/**
 * Internal-only and self-cleaning: proves the deployed session schema and
 * expiry guard without returning a reusable capability or leaving a session.
 */
export const smokeSessionLifecycle = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const expiresAt = now + ADMIN_SESSION_TTL_MS
    const sessionId = await ctx.db.insert('adminSessions', {
      tokenHash: await hashAdminToken(SMOKE_TOKEN),
      createdAt: now,
      expiresAt,
    })

    const before = await requireAdminSession(ctx, SMOKE_TOKEN, now)
    const expired = await expireAdminSessionRecord(ctx, {
      sessionId,
      expectedExpiresAt: expiresAt,
    })
    const repeated = await expireAdminSessionRecord(ctx, {
      sessionId,
      expectedExpiresAt: expiresAt,
    })
    const after = await requireAdminSession(ctx, SMOKE_TOKEN, now)

    return {
      createdAndAuthorized: before.kind === 'authorized',
      expiryResult: expired.kind,
      repeatedExpiryResult: repeated.kind,
      revokedAfterExpiry: after.kind === 'unauthorized',
    }
  },
})
