/**
 * Timezone-safe countdown state machine (INVITE-01, D-10).
 *
 * Every function here reads the current instant from an injected `now`
 * parameter rather than from the global clock — that injection is what
 * makes the whole module testable at fixed dates without mocking global
 * time (`Date.now`/`vi.useFakeTimers`).
 */

import { EVENT_DATE, EVENT_DAY_START, EVENT_END } from '../content/event'

export type EventPhase = 'antes' | 'hoje' | 'agora' | 'depois'

export type Parts = {
  days: number
  hours: number
  minutes: number
  seconds: number
}

export type CountdownUnit = keyof Parts

const MS_PER_SECOND = 1000
const MS_PER_MINUTE = MS_PER_SECOND * 60
const MS_PER_HOUR = MS_PER_MINUTE * 60
const MS_PER_DAY = MS_PER_HOUR * 24

const ZERO_PARTS: Parts = { days: 0, hours: 0, minutes: 0, seconds: 0 }

/**
 * Converts a millisecond distance into display parts, flooring at zero
 * first so a negative distance yields all zeros rather than negative
 * digits — never NaN, never negative.
 */
export function toParts(distanceMs: number): Parts {
  const clamped = Math.max(0, distanceMs)
  const days = Math.floor(clamped / MS_PER_DAY)
  const hours = Math.floor((clamped % MS_PER_DAY) / MS_PER_HOUR)
  const minutes = Math.floor((clamped % MS_PER_HOUR) / MS_PER_MINUTE)
  const seconds = Math.floor((clamped % MS_PER_MINUTE) / MS_PER_SECOND)
  return { days, hours, minutes, seconds }
}

/**
 * Resolves the current phase and its display parts from an injected clock.
 *
 * - `antes` — strictly before EVENT_DAY_START (00:00 of event day); parts
 *   count down to EVENT_DAY_START.
 * - `hoje` — from EVENT_DAY_START up to (not including) EVENT_DATE; zeroed
 *   parts, no digits are shown for this state.
 * - `agora` — from EVENT_DATE through EVENT_END inclusive; zeroed parts.
 * - `depois` — strictly after EVENT_END; parts count UP from EVENT_END with
 *   no ceiling, cap or modulo (D-10) — the day count grows forever.
 */
export function getEventState(now: Date): { phase: EventPhase; parts: Parts } {
  const nowMs = now.getTime()
  const dayStartMs = new Date(EVENT_DAY_START).getTime()
  const dateMs = new Date(EVENT_DATE).getTime()
  const endMs = new Date(EVENT_END).getTime()

  if (nowMs < dayStartMs) {
    return { phase: 'antes', parts: toParts(dayStartMs - nowMs) }
  }
  if (nowMs < dateMs) {
    return { phase: 'hoje', parts: ZERO_PARTS }
  }
  if (nowMs <= endMs) {
    return { phase: 'agora', parts: ZERO_PARTS }
  }
  return { phase: 'depois', parts: toParts(nowMs - endMs) }
}

const UNIT_LABELS: Record<CountdownUnit, { singular: string; plural: string }> = {
  days: { singular: 'dia', plural: 'dias' },
  hours: { singular: 'hora', plural: 'horas' },
  minutes: { singular: 'minuto', plural: 'minutos' },
  seconds: { singular: 'segundo', plural: 'segundos' },
}

/**
 * pt-BR pluralization: singular only at exactly 1, plural at 0 and at 2+.
 * Both countdown renderers (full tiles + compact rail) must call this
 * instead of hardcoding a label — every countdown passes through 1 for
 * every unit on its way down and two independent copies of the rule drift.
 */
export function pluralizeUnit(count: number, unit: CountdownUnit): string {
  const { singular, plural } = UNIT_LABELS[unit]
  return count === 1 ? singular : plural
}
