import { describe, expect, it } from 'vitest'
import {
  DRESS,
  EVENT_DATE,
  EVENT_DAY_START,
  EVENT_END,
  GUIDE,
  HOTELS,
  NAV_LINKS,
  PROGRAMA,
} from './event'

describe('event content — PROGRAMA', () => {
  it('has exactly 7 blocks in the locked order', () => {
    expect(PROGRAMA).toHaveLength(7)
    expect(PROGRAMA.map((item) => item.time)).toEqual([
      '16:00',
      '17:00',
      '17:45',
      '19:00',
      '20:30',
      '00:30',
      '03:00',
    ])
  })
})

describe('event content — GUIDE', () => {
  it('has exactly 4 cards, every url starting with https://', () => {
    expect(GUIDE).toHaveLength(4)
    for (const place of GUIDE) {
      expect(place.url.startsWith('https://')).toBe(true)
    }
  })
})

describe('event content — HOTELS', () => {
  it('has exactly 3 hotels, every url starting with https://', () => {
    expect(HOTELS).toHaveLength(3)
    for (const hotel of HOTELS) {
      expect(hotel.url.startsWith('https://')).toBe(true)
    }
  })
})

describe('event content — NAV_LINKS', () => {
  it('has exactly 3 links in page order', () => {
    expect(NAV_LINKS).toHaveLength(3)
    expect(NAV_LINKS.map((link) => link.href)).toEqual([
      '#aracaju',
      '#programacao',
      '#traje',
    ])
  })
})

describe('event content — DRESS.gallery', () => {
  it('has exactly 2 figures, each with non-empty alt and positive dimensions', () => {
    expect(DRESS.gallery).toHaveLength(2)
    for (const figure of DRESS.gallery) {
      expect(figure.alt.length).toBeGreaterThan(0)
      expect(figure.width).toBeGreaterThan(0)
      expect(figure.height).toBeGreaterThan(0)
    }
  })
})

describe('event content — boundary dates', () => {
  it('every boundary string carries the -03:00 offset suffix', () => {
    expect(EVENT_DAY_START.endsWith('-03:00')).toBe(true)
    expect(EVENT_DATE.endsWith('-03:00')).toBe(true)
    expect(EVENT_END.endsWith('-03:00')).toBe(true)
  })

  it('resolves to strictly increasing instants: DAY_START < DATE < END', () => {
    const dayStart = new Date(EVENT_DAY_START).getTime()
    const date = new Date(EVENT_DATE).getTime()
    const end = new Date(EVENT_END).getTime()
    expect(dayStart).toBeLessThan(date)
    expect(date).toBeLessThan(end)
  })
})

describe('event content — spelling', () => {
  it('never contains the old project misspelled street variant', () => {
    const source = JSON.stringify({ DRESS, GUIDE, HOTELS, NAV_LINKS, PROGRAMA })
    expect(source).not.toContain('Matapoã')
  })
})
