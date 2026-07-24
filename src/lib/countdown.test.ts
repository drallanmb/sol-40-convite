import { describe, expect, it } from 'vitest'
import { EVENT_DATE, EVENT_DAY_START, EVENT_END } from '../content/event'
import { getEventState, pluralizeUnit, toParts, type CountdownUnit } from './countdown'

describe('countdown — offset', () => {
  it('two Date objects built from the same offset-qualified string are equal instants', () => {
    const a = new Date(EVENT_DATE)
    const b = new Date(EVENT_DATE)
    expect(a.getTime()).toBe(b.getTime())
  })

  it('EVENT_DATE resolves to the UTC instant 2026-10-17T19:00:00Z regardless of host timezone', () => {
    expect(new Date(EVENT_DATE).getTime()).toBe(new Date('2026-10-17T19:00:00Z').getTime())
  })
})

describe('countdown — phase boundaries', () => {
  it('is "antes" one millisecond before EVENT_DAY_START', () => {
    const now = new Date(new Date(EVENT_DAY_START).getTime() - 1)
    expect(getEventState(now).phase).toBe('antes')
  })

  it('is "hoje" at EVENT_DAY_START', () => {
    const now = new Date(EVENT_DAY_START)
    expect(getEventState(now).phase).toBe('hoje')
  })

  it('is "hoje" one millisecond before EVENT_DATE', () => {
    const now = new Date(new Date(EVENT_DATE).getTime() - 1)
    expect(getEventState(now).phase).toBe('hoje')
  })

  it('is "agora" at EVENT_DATE', () => {
    const now = new Date(EVENT_DATE)
    expect(getEventState(now).phase).toBe('agora')
  })

  it('is "agora" at EVENT_END (inclusive)', () => {
    const now = new Date(EVENT_END)
    expect(getEventState(now).phase).toBe('agora')
  })

  it('is "depois" one millisecond after EVENT_END', () => {
    const now = new Date(new Date(EVENT_END).getTime() + 1)
    expect(getEventState(now).phase).toBe('depois')
  })
})

describe('countdown — depois grows without ceiling', () => {
  it('parts.days is a finite number greater than 9000 roughly 27 years past EVENT_END, and no part is ever NaN or negative', () => {
    const twentySevenYearsMs = 27 * 365.25 * 24 * 60 * 60 * 1000
    const now = new Date(new Date(EVENT_END).getTime() + twentySevenYearsMs)
    const { phase, parts } = getEventState(now)
    expect(phase).toBe('depois')
    expect(parts.days).toBeGreaterThan(9000)
    expect(Number.isFinite(parts.days)).toBe(true)
    expect(Number.isInteger(parts.days)).toBe(true)
    for (const value of Object.values(parts)) {
      expect(Number.isNaN(value)).toBe(false)
      expect(value).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('countdown — pluralize', () => {
  const units: CountdownUnit[] = ['days', 'hours', 'minutes', 'seconds']
  const singular: Record<CountdownUnit, string> = {
    days: 'dia',
    hours: 'hora',
    minutes: 'minuto',
    seconds: 'segundo',
  }
  const plural: Record<CountdownUnit, string> = {
    days: 'dias',
    hours: 'horas',
    minutes: 'minutos',
    seconds: 'segundos',
  }

  for (const unit of units) {
    it(`pluralizeUnit(1, "${unit}") is singular`, () => {
      expect(pluralizeUnit(1, unit)).toBe(singular[unit])
    })

    it(`pluralizeUnit(0, "${unit}") is plural`, () => {
      expect(pluralizeUnit(0, unit)).toBe(plural[unit])
    })

    it(`pluralizeUnit(2, "${unit}") is plural`, () => {
      expect(pluralizeUnit(2, unit)).toBe(plural[unit])
    })
  }
})

describe('countdown — toParts', () => {
  it('yields all-zero parts for a zero distance', () => {
    expect(toParts(0)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  })

  it('yields all-zero parts for a negative distance, never negative numbers', () => {
    const parts = toParts(-1000)
    expect(parts).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 })
    for (const value of Object.values(parts)) {
      expect(value).toBeGreaterThanOrEqual(0)
    }
  })
})
