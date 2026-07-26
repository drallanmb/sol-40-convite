import { SECTION_IDS } from '../content/event'

export type IntroState = 'playing' | 'complete'
export type IntroComposition = 'mobile' | 'desktop'
export type IntroCompletionReason =
  | 'finished'
  | 'reduced-motion'
  | 'ineligible'
  | 'error'

export type RectLike = {
  left: number
  top: number
  width: number
  height: number
}

export type IntroPoint = {
  x: number
  y: number
}

export const CINEMATIC_INTRO_DURATION_MS = 3000
export const CINEMATIC_INTRO_EASING = 'cubic-bezier(.22, .7, .16, 1)'
export const CINEMATIC_INTRO_SCROLL_THRESHOLD_PX = 4
export const CINEMATIC_INTRO_INTENT_MAX_MS = 180
export const CINEMATIC_INTRO_RETARGET_MS = 180
export const CINEMATIC_INTRO_SUN_SETTLE_PROGRESS = 0.82
export const CINEMATIC_INTRO_GLOW_ONSET_PROGRESS = 0.83

export const INTRO_COPY_TIMING = Object.freeze({
  primaryStartMs: 2280,
  secondaryStartMs: 2640,
  endMs: 2970,
})

const MOBILE_COMPOSITION_MAX_WIDTH = 639
const INTENT_COMPLETION_MIN_MS = 150
const INTENT_COMPLETION_MAX_MS = 200
const IDENTITY_ARC: readonly IntroPoint[] = Object.freeze([
  Object.freeze({ x: 0, y: 0 }),
  Object.freeze({ x: 0, y: 0 }),
  Object.freeze({ x: 0, y: 0 }),
  Object.freeze({ x: 0, y: 0 }),
])

const INTRO_ARC_PROFILE: Record<
  IntroComposition,
  readonly [
    Readonly<IntroPoint>,
    Readonly<IntroPoint>,
    Readonly<IntroPoint>,
  ]
> = {
  desktop: [
    { x: 0.25, y: 0.18 },
    { x: 0.36, y: 0.31 },
    { x: 0.495, y: 0.505 },
  ],
  mobile: [
    { x: 0.72, y: 0.25 },
    { x: 0.65, y: 0.37 },
    { x: 0.565, y: 0.545 },
  ],
}

const HOME_SECTION_IDS = new Set<string>(Object.values(SECTION_IDS))

function isFiniteRect(rect: RectLike): boolean {
  return (
    Number.isFinite(rect.left) &&
    Number.isFinite(rect.top) &&
    Number.isFinite(rect.width) &&
    Number.isFinite(rect.height) &&
    rect.width > 0 &&
    rect.height > 0
  )
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

export function isEligibleHeroHash(hash: string): boolean {
  return hash === '' || hash === `#${SECTION_IDS.hero}`
}

export function resolveInitialIntroState(
  hash: string,
  reducedMotion: boolean,
): IntroState {
  return !reducedMotion && isEligibleHeroHash(hash)
    ? 'playing'
    : 'complete'
}

export function resolveCompletedIntroState(
  _reason: IntroCompletionReason,
): IntroState {
  return 'complete'
}

export function hasIntentionalIntroScroll(
  startScrollY: number,
  currentScrollY: number,
): boolean {
  return (
    Math.abs(currentScrollY - startScrollY) >=
    CINEMATIC_INTRO_SCROLL_THRESHOLD_PX
  )
}

export function homeSectionIdFromHash(hash: string): string | null {
  if (!hash.startsWith('#')) return null

  const sectionId = hash.slice(1)
  return HOME_SECTION_IDS.has(sectionId) ? sectionId : null
}

export function resolveIntroComposition(stage: RectLike): IntroComposition {
  if (!Number.isFinite(stage.width)) return 'mobile'
  return stage.width <= MOBILE_COMPOSITION_MAX_WIDTH ? 'mobile' : 'desktop'
}

export function resolveSunArc(
  stage: RectLike,
  target: RectLike,
  composition: IntroComposition,
): IntroPoint[] {
  if (!isFiniteRect(stage) || !isFiniteRect(target)) {
    return IDENTITY_ARC.map((point) => ({ ...point }))
  }

  const targetCenter = {
    x: target.left + target.width / 2,
    y: target.top + target.height / 2,
  }

  const points = INTRO_ARC_PROFILE[composition].map((point) => ({
    x: stage.left + stage.width * point.x - targetCenter.x,
    y: stage.top + stage.height * point.y - targetCenter.y,
  }))

  if (points.some(({ x, y }) => !Number.isFinite(x) || !Number.isFinite(y))) {
    return IDENTITY_ARC.map((point) => ({ ...point }))
  }

  return [...points, { x: 0, y: 0 }]
}

export function normalizeIntroProgress(
  currentTime: number,
  duration: number,
): number {
  if (
    !Number.isFinite(currentTime) ||
    !Number.isFinite(duration) ||
    duration <= 0
  ) {
    return 1
  }

  return clamp(currentTime / duration, 0, 1)
}

export function resolveIntentPlaybackRate(
  remainingMs: number,
  maxRemainingMs = CINEMATIC_INTRO_INTENT_MAX_MS,
  currentPlaybackRate = 1,
): number {
  const safeCurrentRate =
    Number.isFinite(currentPlaybackRate) && currentPlaybackRate >= 1
      ? currentPlaybackRate
      : 1

  if (!Number.isFinite(remainingMs) || remainingMs <= 0) {
    return safeCurrentRate
  }

  const requestedWindow = Number.isFinite(maxRemainingMs)
    ? maxRemainingMs
    : CINEMATIC_INTRO_INTENT_MAX_MS
  const completionWindow = clamp(
    requestedWindow,
    INTENT_COMPLETION_MIN_MS,
    INTENT_COMPLETION_MAX_MS,
  )
  const requiredRate = remainingMs / completionWindow

  if (!Number.isFinite(requiredRate)) return safeCurrentRate
  return Math.max(1, safeCurrentRate, requiredRate)
}
