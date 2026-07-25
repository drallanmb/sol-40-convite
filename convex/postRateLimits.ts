import { RateLimiter } from '@convex-dev/rate-limiter'
import { components } from './_generated/api'

const TEN_MINUTES_MS = 10 * 60 * 1_000
const ONE_HOUR_MS = 60 * 60 * 1_000

export const POST_RATE_LIMITS = {
  requestUploadByDevice: {
    kind: 'token bucket',
    rate: 10,
    period: TEN_MINUTES_MS,
    capacity: 4,
  },
  requestUploadGlobal: {
    kind: 'fixed window',
    rate: 300,
    period: ONE_HOUR_MS,
  },
  submitTextByDevice: {
    kind: 'token bucket',
    rate: 20,
    period: ONE_HOUR_MS,
    capacity: 5,
  },
  submitTextGlobal: {
    kind: 'fixed window',
    rate: 600,
    period: ONE_HOUR_MS,
  },
} as const

export const postRateLimiter = new RateLimiter(components.rateLimiter, POST_RATE_LIMITS)

export function toPostRetryAfterSeconds(retryAfterMs: number) {
  if (!Number.isFinite(retryAfterMs)) {
    return 1
  }

  return Math.max(1, Math.ceil(retryAfterMs / 1_000))
}
