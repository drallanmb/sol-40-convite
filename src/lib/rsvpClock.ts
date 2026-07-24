import {
  RSVP_COPY,
  RSVP_DEADLINE_BOUNDARY,
} from '../content/event'

export const RSVP_DEV_NOW_STORAGE_KEY = 'sol40:rsvp-dev-now:v1'
export const RSVP_DEV_CLOCK_CONSOLE_SETUP =
  `sessionStorage.setItem('${RSVP_DEV_NOW_STORAGE_KEY}', '2026-10-01T00:00:00-03:00'); location.reload()`

const RSVP_DEADLINE_TIME = Date.parse(RSVP_DEADLINE_BOUNDARY)

export type RsvpClockOptions = {
  storage?: Pick<Storage, 'getItem'>
  systemNow?: () => number
}

function browserSessionStorage() {
  if (typeof window === 'undefined') return undefined

  try {
    return window.sessionStorage
  } catch {
    return undefined
  }
}

export function getRsvpNow({
  storage,
  systemNow = Date.now,
}: RsvpClockOptions = {}) {
  const currentTime = systemNow()
  if (!import.meta.env.DEV) return currentTime

  const clockStorage = storage ?? browserSessionStorage()
  if (!clockStorage) return currentTime

  let override: string | null
  try {
    override = clockStorage.getItem(RSVP_DEV_NOW_STORAGE_KEY)
  } catch {
    return currentTime
  }

  if (!override) return currentTime
  const overrideTime = Date.parse(override)
  return Number.isFinite(overrideTime) ? overrideTime : currentTime
}

export function getRsvpDeadlinePresentation(now = getRsvpNow()) {
  return {
    deadlineText: RSVP_COPY.route.deadline,
    lateHelper:
      now >= RSVP_DEADLINE_TIME ? RSVP_COPY.route.deadlinePassed : null,
  }
}
