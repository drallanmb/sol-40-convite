import { describe, expect, it } from 'vitest'
import { SECTION_IDS } from '../content/event'
import {
  CINEMATIC_INTRO_DURATION_MS,
  CINEMATIC_INTRO_EASING,
  CINEMATIC_INTRO_REVEAL_MS,
  CINEMATIC_INTRO_SCROLL_THRESHOLD_PX,
  hasIntentionalIntroScroll,
  homeSectionIdFromHash,
  isEligibleHeroHash,
  resolveInitialIntroPhase,
} from './cinematicIntro'

describe('cinematic intro eligibility', () => {
  it.each(['', `#${SECTION_IDS.hero}`])(
    'accepts a new entry through the hero: %j',
    (hash) => {
      expect(isEligibleHeroHash(hash)).toBe(true)
    },
  )

  it.each([
    `#${SECTION_IDS.programa}`,
    `#${SECTION_IDS.local}`,
    '#desconhecido',
    '#Inicio',
    '#INICIO',
  ])('rejects direct section, unknown and case-variant hashes: %j', (hash) => {
    expect(isEligibleHeroHash(hash)).toBe(false)
  })
})

describe('cinematic intro initial phase', () => {
  it('descends only for an eligible hash when motion is allowed', () => {
    expect(resolveInitialIntroPhase('', false)).toBe('descending')
    expect(resolveInitialIntroPhase(`#${SECTION_IDS.hero}`, false)).toBe(
      'descending',
    )
  })

  it('starts complete for reduced motion or an ineligible hash', () => {
    expect(resolveInitialIntroPhase('', true)).toBe('complete')
    expect(
      resolveInitialIntroPhase(`#${SECTION_IDS.programa}`, false),
    ).toBe('complete')
  })
})

describe('cinematic intro scroll intent', () => {
  it.each([
    [0, 0, false],
    [0, 3.99, false],
    [10, 6.01, false],
    [0, 4, true],
    [10, 6, true],
    [10, 14, true],
  ])(
    'compares the absolute scroll delta from %d to %d',
    (startScrollY, currentScrollY, expected) => {
      expect(hasIntentionalIntroScroll(startScrollY, currentScrollY)).toBe(
        expected,
      )
    },
  )
})

describe('cinematic intro fragment policy', () => {
  it('returns only exact section IDs from the canonical event allowlist', () => {
    for (const sectionId of Object.values(SECTION_IDS)) {
      expect(homeSectionIdFromHash(`#${sectionId}`)).toBe(sectionId)
    }
  })

  it.each([
    '',
    '#',
    '#Inicio',
    '#desconhecido',
    '#programacao div',
    '#programacao%20div',
    '#<img>',
    'programacao',
  ])('rejects non-canonical or hostile fragments: %j', (hash) => {
    expect(homeSectionIdFromHash(hash)).toBeNull()
  })
})

describe('cinematic intro timing contract', () => {
  it('keeps duration, reveal, easing and scroll threshold centralized', () => {
    expect(CINEMATIC_INTRO_DURATION_MS).toBe(2000)
    expect(CINEMATIC_INTRO_REVEAL_MS).toBe(260)
    expect(CINEMATIC_INTRO_EASING).toBe(
      'cubic-bezier(.65, 0, .35, 1)',
    )
    expect(CINEMATIC_INTRO_SCROLL_THRESHOLD_PX).toBe(4)
  })
})
