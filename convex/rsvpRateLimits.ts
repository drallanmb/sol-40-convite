import { RateLimiter } from '@convex-dev/rate-limiter'
import { components } from './_generated/api'

const FIFTEEN_MINUTES_MS = 15 * 60 * 1_000
const ONE_HOUR_MS = 60 * 60 * 1_000

export const RSVP_RATE_LIMITS = {
  lookupByPhone: {
    kind: 'fixed window',
    rate: 5,
    period: FIFTEEN_MINUTES_MS,
  },
  lookupGlobal: {
    kind: 'fixed window',
    rate: 120,
    period: FIFTEEN_MINUTES_MS,
  },
  saveBySession: {
    kind: 'fixed window',
    rate: 30,
    period: ONE_HOUR_MS,
  },
  saveGlobal: {
    kind: 'fixed window',
    rate: 300,
    period: ONE_HOUR_MS,
  },
} as const

export const rsvpRateLimiter = new RateLimiter(components.rateLimiter, RSVP_RATE_LIMITS)
