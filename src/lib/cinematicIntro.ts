import { SECTION_IDS } from '../content/event'

export type IntroState = 'playing' | 'complete'
export type IntroCompletionReason =
  | 'finished'
  | 'reduced-motion'
  | 'ineligible'
  | 'error'

export const CINEMATIC_INTRO_DURATION_MS = 3000
export const CINEMATIC_INTRO_EASING = 'cubic-bezier(.22, .7, .16, 1)'
export const CINEMATIC_INTRO_SCROLL_THRESHOLD_PX = 4

const HOME_SECTION_IDS = new Set<string>(Object.values(SECTION_IDS))

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
