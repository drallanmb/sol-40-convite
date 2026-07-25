import { RateLimiter } from '@convex-dev/rate-limiter'
import { components } from './_generated/api'

const FIFTEEN_MINUTES_MS = 15 * 60 * 1_000

export const ADMIN_LOGIN_LIMIT_KEY = 'shared-owner-login'

export const ADMIN_RATE_LIMITS = {
  loginGlobal: {
    kind: 'fixed window',
    rate: 10,
    period: FIFTEEN_MINUTES_MS,
  },
  loginEmail: {
    kind: 'fixed window',
    rate: 5,
    period: FIFTEEN_MINUTES_MS,
  },
  bootstrapGlobal: {
    kind: 'fixed window',
    rate: 10,
    period: FIFTEEN_MINUTES_MS,
  },
  masterRecoveryGlobal: {
    kind: 'fixed window',
    rate: 5,
    period: FIFTEEN_MINUTES_MS,
  },
} as const

export const adminRateLimiter = new RateLimiter(
  components.rateLimiter,
  ADMIN_RATE_LIMITS,
)
