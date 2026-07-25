import { v } from 'convex/values'

export const ADMIN_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1_000
export const ADMIN_CAPABILITY_BYTE_LENGTH = 32

export const adminSessionStatusValidator = v.union(
  v.object({
    kind: v.literal('valid'),
    expiresAt: v.number(),
  }),
  v.object({ kind: v.literal('invalid') }),
)

export const adminLoginResultValidator = v.union(
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

export const adminLogoutResultValidator = v.object({
  kind: v.literal('logged_out'),
})

export function isAdminSessionActive(expiresAt: number, now: number) {
  return now < expiresAt
}
