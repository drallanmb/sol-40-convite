import { v } from 'convex/values'

export const attendanceValidator = v.union(
  v.literal('pending'),
  v.literal('yes'),
  v.literal('no'),
)

export const demoFixtureLabelValidator = v.union(
  v.literal('normal'),
  v.literal('zero'),
  v.literal('one'),
  v.literal('many-long'),
)

export type Attendance = 'pending' | 'yes' | 'no'
export type DemoFixtureLabel = 'normal' | 'zero' | 'one' | 'many-long'

export const CONTACT_MAX_LENGTH = 120
export const MAX_RSVP_GUESTS = 50
export const RSVP_DISPLAY_NAME_MAX_LENGTH = 160
export const RSVP_GUEST_NAME_MAX_LENGTH = 180

export const RSVP_SESSION_TTL_MS = 8 * 60 * 60 * 1_000
export const RSVP_SESSION_TOKEN_BYTES = 32
export const RSVP_TOKEN_HASH_HEX_LENGTH = 64

export const RSVP_DEMO_FIXTURE_FLAG = 'development-only'
export const RSVP_DEMO_SEED_MIN_BYTES = 32
