import { describe, expect, it } from 'vitest'
import { SECTION_IDS } from '../content/event'
import {
  CINEMATIC_INTRO_GLOW_ONSET_PROGRESS,
  CINEMATIC_INTRO_DURATION_MS,
  CINEMATIC_INTRO_EASING,
  CINEMATIC_INTRO_INTENT_MAX_MS,
  CINEMATIC_INTRO_RETARGET_MS,
  CINEMATIC_INTRO_SCROLL_THRESHOLD_PX,
  CINEMATIC_INTRO_SUN_SETTLE_PROGRESS,
  INTRO_COPY_TIMING,
  hasIntentionalIntroScroll,
  homeSectionIdFromHash,
  isEligibleHeroHash,
  normalizeIntroProgress,
  resolveIntentPlaybackRate,
  resolveIntroComposition,
  resolveCompletedIntroState,
  resolveInitialIntroState,
  resolveSunArc,
  type IntroComposition,
  type RectLike,
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

describe('cinematic intro initial state', () => {
  it('plays only for an eligible hash when motion is allowed', () => {
    expect(resolveInitialIntroState('', false)).toBe('playing')
    expect(resolveInitialIntroState(`#${SECTION_IDS.hero}`, false)).toBe(
      'playing',
    )
  })

  it('starts complete for reduced motion or an ineligible hash', () => {
    expect(resolveInitialIntroState('', true)).toBe('complete')
    expect(
      resolveInitialIntroState(`#${SECTION_IDS.programa}`, false),
    ).toBe('complete')
  })

  it.each(['finished', 'reduced-motion', 'ineligible', 'error'] as const)(
    'converges %s completion to the fully open state',
    (reason) => {
      expect(resolveCompletedIntroState(reason)).toBe('complete')
    },
  )
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
  it('keeps the single scene clock, easing and scroll threshold centralized', () => {
    expect(CINEMATIC_INTRO_DURATION_MS).toBe(3000)
    expect(CINEMATIC_INTRO_EASING).toBe(
      'cubic-bezier(.22, .7, .16, 1)',
    )
    expect(CINEMATIC_INTRO_SCROLL_THRESHOLD_PX).toBe(4)
  })

  it('keeps the approved landing, delayed glow and retarget timing explicit', () => {
    expect(CINEMATIC_INTRO_SUN_SETTLE_PROGRESS).toBe(0.82)
    expect(CINEMATIC_INTRO_GLOW_ONSET_PROGRESS).toBe(0.83)
    expect(CINEMATIC_INTRO_GLOW_ONSET_PROGRESS).toBeGreaterThan(
      CINEMATIC_INTRO_SUN_SETTLE_PROGRESS,
    )
    expect(CINEMATIC_INTRO_INTENT_MAX_MS).toBe(180)
    expect(CINEMATIC_INTRO_RETARGET_MS).toBe(180)
  })

  it('orders primary before secondary inside one 500–700ms hierarchy window', () => {
    expect(INTRO_COPY_TIMING.primaryStartMs).toBeLessThan(
      INTRO_COPY_TIMING.secondaryStartMs,
    )
    expect(INTRO_COPY_TIMING.secondaryStartMs).toBeLessThan(
      INTRO_COPY_TIMING.endMs,
    )
    expect(
      INTRO_COPY_TIMING.endMs - INTRO_COPY_TIMING.primaryStartMs,
    ).toBeGreaterThanOrEqual(500)
    expect(
      INTRO_COPY_TIMING.endMs - INTRO_COPY_TIMING.primaryStartMs,
    ).toBeLessThanOrEqual(700)
    expect(INTRO_COPY_TIMING.endMs).toBe(CINEMATIC_INTRO_DURATION_MS)
  })
})

describe('cinematic intro responsive composition', () => {
  const desktopStage: RectLike = {
    left: 0,
    top: 0,
    width: 1280,
    height: 800,
  }
  const desktopTarget: RectLike = {
    left: 790,
    top: 310,
    width: 320,
    height: 320,
  }
  const mobileStage: RectLike = {
    left: 0,
    top: 0,
    width: 320,
    height: 760,
  }
  const mobileTarget: RectLike = {
    left: 77,
    top: 410,
    width: 220,
    height: 220,
  }

  it.each([
    [desktopStage, 'desktop'],
    [mobileStage, 'mobile'],
    [{ ...mobileStage, width: Number.NaN }, 'mobile'],
  ] satisfies Array<[RectLike, IntroComposition]>)(
    'selects %s as the %s art-direction profile',
    (stage, composition) => {
      expect(resolveIntroComposition(stage)).toBe(composition)
    },
  )

  it.each([
    ['desktop', desktopStage, desktopTarget, -1],
    ['mobile', mobileStage, mobileTarget, 1],
  ] satisfies Array<[IntroComposition, RectLike, RectLike, number]>)(
    'builds a finite diagonal %s arc from rendered stage and target geometry',
    (composition, stage, target, expectedStartXSign) => {
      const points = resolveSunArc(stage, target, composition)

      expect(points).toHaveLength(4)
      expect(points.at(-1)).toEqual({ x: 0, y: 0 })
      expect(Math.sign(points[0].x)).toBe(expectedStartXSign)
      expect(points[0].y).toBeLessThan(0)
      expect(points[0].x).not.toBe(0)
      expect(points[0].y).not.toBe(0)
      expect(points.flatMap(({ x, y }) => [x, y]).every(Number.isFinite)).toBe(
        true,
      )
    },
  )

  it('derives arc deltas from geometry rather than fixed endpoint pixels', () => {
    const first = resolveSunArc(desktopStage, desktopTarget, 'desktop')
    const shifted = resolveSunArc(
      { ...desktopStage, left: 100, width: 1440 },
      { ...desktopTarget, left: 930 },
      'desktop',
    )

    expect(shifted[0]).not.toEqual(first[0])
    expect(shifted.at(-1)).toEqual({ x: 0, y: 0 })
  })

  it.each([
    [{ ...desktopStage, width: 0 }, desktopTarget],
    [desktopStage, { ...desktopTarget, height: Number.NaN }],
    [{ ...desktopStage, left: Number.POSITIVE_INFINITY }, desktopTarget],
  ] satisfies Array<[RectLike, RectLike]>)(
    'fails invalid geometry to finite identity points',
    (stage, target) => {
      expect(resolveSunArc(stage, target, 'desktop')).toEqual([
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 },
      ])
    },
  )
})

describe('cinematic intro progress and intent acceleration', () => {
  it.each([
    [-100, 3000, 0],
    [0, 3000, 0],
    [1500, 3000, 0.5],
    [4000, 3000, 1],
    [0, 0, 1],
    [Number.NaN, 3000, 1],
    [100, Number.POSITIVE_INFINITY, 1],
  ])(
    'normalizes currentTime=%s duration=%s to %s',
    (currentTime, duration, expected) => {
      expect(normalizeIntroProgress(currentTime, duration)).toBe(expected)
    },
  )

  it.each([
    [3000, undefined, 1, 3000 / 180],
    [900, 180, 1, 5],
    [900, 200, 1, 4.5],
    [900, 150, 1, 6],
    [100, 180, 1, 1],
    [900, 180, 8, 8],
  ])(
    'resolves remaining=%s max=%s current=%s to rate=%s without slowing',
    (remaining, maxMs, currentRate, expected) => {
      expect(
        resolveIntentPlaybackRate(remaining, maxMs, currentRate),
      ).toBeCloseTo(expected)
    },
  )

  it.each([
    [900, 20, 6],
    [900, 800, 4.5],
  ])(
    'clamps the requested completion window to 150–200ms',
    (remaining, maxMs, expected) => {
      expect(resolveIntentPlaybackRate(remaining, maxMs)).toBeCloseTo(expected)
    },
  )

  it.each([
    [Number.NaN, 180, 1],
    [Number.POSITIVE_INFINITY, 180, 1],
    [900, Number.NaN, 5],
    [900, 180, Number.NaN, 5],
  ])(
    'returns a finite safe rate for invalid remaining/max/current values',
    (remaining, maxMs, currentRate, expected = 1) => {
      const rate = resolveIntentPlaybackRate(remaining, maxMs, currentRate)

      expect(rate).toBeCloseTo(expected)
      expect(Number.isFinite(rate)).toBe(true)
      expect(rate).toBeGreaterThanOrEqual(1)
    },
  )
})
