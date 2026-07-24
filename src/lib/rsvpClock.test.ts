import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  RSVP_COPY,
  RSVP_DEADLINE_BOUNDARY,
} from '../content/event'
import {
  RSVP_DEV_CLOCK_CONSOLE_SETUP,
  RSVP_DEV_NOW_STORAGE_KEY,
  getRsvpDeadlinePresentation,
  getRsvpNow,
} from './rsvpClock'

class ClockStorage implements Storage {
  readonly values = new Map<string, string>()
  reads = 0

  get length() {
    return this.values.size
  }

  clear() {
    this.values.clear()
  }

  getItem(key: string) {
    this.reads += 1
    return this.values.get(key) ?? null
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null
  }

  removeItem(key: string) {
    this.values.delete(key)
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }
}

describe('RSVP presentation clock', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses the injected system clock without reading storage in production', () => {
    vi.stubEnv('DEV', false)
    const storage = new ClockStorage()
    storage.setItem(RSVP_DEV_NOW_STORAGE_KEY, '2030-01-01T00:00:00-03:00')
    const systemNow = Date.parse('2026-09-20T12:00:00-03:00')

    expect(
      getRsvpNow({
        storage,
        systemNow: () => systemNow,
      }),
    ).toBe(systemNow)
    expect(storage.reads).toBe(0)
  })

  it('uses a valid non-sensitive development override', () => {
    vi.stubEnv('DEV', true)
    const storage = new ClockStorage()
    const override = '2026-10-01T00:00:00-03:00'
    storage.setItem(RSVP_DEV_NOW_STORAGE_KEY, override)

    expect(
      getRsvpNow({
        storage,
        systemNow: () => 0,
      }),
    ).toBe(Date.parse(override))
  })

  it.each(['not-a-date', '', '2026-99-99'])(
    'falls back safely for malformed development override %j',
    (override) => {
      vi.stubEnv('DEV', true)
      const storage = new ClockStorage()
      const systemNow = Date.parse('2026-09-20T12:00:00-03:00')
      storage.setItem(RSVP_DEV_NOW_STORAGE_KEY, override)

      expect(
        getRsvpNow({
          storage,
          systemNow: () => systemNow,
        }),
      ).toBe(systemNow)
    },
  )

  it('documents the exact browser setup reserved for development acceptance', () => {
    expect(RSVP_DEV_CLOCK_CONSOLE_SETUP).toBe(
      `sessionStorage.setItem('${RSVP_DEV_NOW_STORAGE_KEY}', '2026-10-01T00:00:00-03:00'); location.reload()`,
    )
  })
})

describe('informational RSVP deadline presentation', () => {
  const boundary = Date.parse(RSVP_DEADLINE_BOUNDARY)

  it.each([
    {
      label: 'one millisecond below',
      now: boundary - 1,
      lateHelper: null,
    },
    {
      label: 'exact first post-deadline instant',
      now: boundary,
      lateHelper: RSVP_COPY.route.deadlinePassed,
    },
    {
      label: 'one millisecond above',
      now: boundary + 1,
      lateHelper: RSVP_COPY.route.deadlinePassed,
    },
  ])('changes only the helper at $label', ({ now, lateHelper }) => {
    const presentation = getRsvpDeadlinePresentation(now)

    expect(presentation).toEqual({
      deadlineText: 'Confirme até 30 de setembro',
      lateHelper,
    })
    expect(presentation).not.toHaveProperty('canSave')
    expect(presentation).not.toHaveProperty('closed')
  })
})
