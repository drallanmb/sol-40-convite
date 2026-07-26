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

export type IntroPathSample = IntroPoint & {
  progress: number
}

export const CINEMATIC_INTRO_SUN_ARRIVAL_MS = 3000
export const CINEMATIC_INTRO_POST_ARRIVAL_MS = 700
export const CINEMATIC_INTRO_DURATION_MS =
  CINEMATIC_INTRO_SUN_ARRIVAL_MS + CINEMATIC_INTRO_POST_ARRIVAL_MS
export const CINEMATIC_INTRO_EASING = 'linear'
export const CINEMATIC_INTRO_SCROLL_THRESHOLD_PX = 4
export const CINEMATIC_INTRO_INTENT_MAX_MS = 180
export const CINEMATIC_INTRO_RETARGET_MS = 180
export const CINEMATIC_INTRO_GLOW_ONSET_MS = 3060

export const INTRO_COPY_TIMING = Object.freeze({
  primaryStartMs: 3100,
  secondaryStartMs: 3400,
  ctaStartMs: 3460,
  endMs: CINEMATIC_INTRO_DURATION_MS,
})

const MOBILE_COMPOSITION_MAX_WIDTH = 639
const INTENT_COMPLETION_MIN_MS = 150
const INTENT_COMPLETION_MAX_MS = 200
const PATH_EPSILON = 1e-6
const DEFAULT_PATH_INTERVALS = 60
const MAX_PATH_INTERVALS = 180
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

function isFinitePoint(point: IntroPoint): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y)
}

function interpolatePoint(
  start: IntroPoint,
  end: IntroPoint,
  progress: number,
): IntroPoint {
  return {
    x: start.x + (end.x - start.x) * progress,
    y: start.y + (end.y - start.y) * progress,
  }
}

function catmullRomPoint(
  previous: IntroPoint,
  start: IntroPoint,
  end: IntroPoint,
  next: IntroPoint,
  progress: number,
): IntroPoint {
  const squared = progress * progress
  const cubed = squared * progress
  const resolveAxis = (
    previousValue: number,
    startValue: number,
    endValue: number,
    nextValue: number,
  ) =>
    0.5 * (
      2 * startValue
      + (-previousValue + endValue) * progress
      + (2 * previousValue - 5 * startValue + 4 * endValue - nextValue)
        * squared
      + (-previousValue + 3 * startValue - 3 * endValue + nextValue)
        * cubed
    )

  return {
    x: resolveAxis(previous.x, start.x, end.x, next.x),
    y: resolveAxis(previous.y, start.y, end.y, next.y),
  }
}

function identityPath(): IntroPathSample[] {
  return [
    { x: 0, y: 0, progress: 0 },
    { x: 0, y: 0, progress: 1 },
  ]
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

/**
 * Converte os pontos artísticos do arco em amostras equidistantes de uma
 * curva Catmull–Rom. Como cada amostra ocupa a mesma fração dos 3000ms e a
 * WAAPI usa easing linear, o centro do sol percorre distâncias praticamente
 * iguais em intervalos iguais, sem aceleração ou desaceleração perceptível.
 */
export function resolveConstantSpeedSunPath(
  waypoints: readonly IntroPoint[],
  requestedIntervals = DEFAULT_PATH_INTERVALS,
): IntroPathSample[] {
  if (
    waypoints.length < 2
    || waypoints.some((point) => !isFinitePoint(point))
  ) {
    return identityPath()
  }

  const intervals = clamp(
    Number.isFinite(requestedIntervals)
      ? Math.round(requestedIntervals)
      : DEFAULT_PATH_INTERVALS,
    2,
    MAX_PATH_INTERVALS,
  )
  const subdivisionsPerSegment = Math.max(48, intervals * 3)
  const densePath: IntroPoint[] = [{ ...waypoints[0] }]

  for (let index = 0; index < waypoints.length - 1; index += 1) {
    const previous = waypoints[Math.max(0, index - 1)]
    const start = waypoints[index]
    const end = waypoints[index + 1]
    const next = waypoints[Math.min(waypoints.length - 1, index + 2)]

    for (let step = 1; step <= subdivisionsPerSegment; step += 1) {
      densePath.push(
        catmullRomPoint(
          previous,
          start,
          end,
          next,
          step / subdivisionsPerSegment,
        ),
      )
    }
  }

  const cumulativeLengths = [0]
  for (let index = 1; index < densePath.length; index += 1) {
    cumulativeLengths.push(
      cumulativeLengths[index - 1]
        + Math.hypot(
          densePath[index].x - densePath[index - 1].x,
          densePath[index].y - densePath[index - 1].y,
        ),
    )
  }

  const totalLength = cumulativeLengths.at(-1) ?? 0
  if (!Number.isFinite(totalLength) || totalLength <= PATH_EPSILON) {
    const stationary = waypoints[0]
    return [
      { ...stationary, progress: 0 },
      { ...stationary, progress: 1 },
    ]
  }

  const samples: IntroPathSample[] = []
  let denseIndex = 1
  for (let step = 0; step <= intervals; step += 1) {
    const progress = step / intervals
    const targetLength = totalLength * progress
    while (
      denseIndex < cumulativeLengths.length - 1
      && cumulativeLengths[denseIndex] < targetLength
    ) {
      denseIndex += 1
    }

    const previousIndex = Math.max(0, denseIndex - 1)
    const previousLength = cumulativeLengths[previousIndex]
    const nextLength = cumulativeLengths[denseIndex]
    const segmentLength = nextLength - previousLength
    const segmentProgress =
      segmentLength <= PATH_EPSILON
        ? 0
        : (targetLength - previousLength) / segmentLength
    const point = interpolatePoint(
      densePath[previousIndex],
      densePath[denseIndex],
      clamp(segmentProgress, 0, 1),
    )
    samples.push({ ...point, progress })
  }

  samples[0] = { ...waypoints[0], progress: 0 }
  samples[samples.length - 1] = {
    ...waypoints[waypoints.length - 1],
    progress: 1,
  }
  return samples
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
