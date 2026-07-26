import { SECTION_IDS } from '../content/event'

export type IntroPhase = 'descending' | 'revealing' | 'complete'

export const CINEMATIC_INTRO_DURATION_MS = 2000
export const CINEMATIC_INTRO_REVEAL_MS = 260
export const CINEMATIC_INTRO_EASING = 'cubic-bezier(.65, 0, .35, 1)'
export const CINEMATIC_INTRO_SCROLL_THRESHOLD_PX = 4

const HOME_SECTION_IDS = new Set<string>(Object.values(SECTION_IDS))

export function isEligibleHeroHash(hash: string): boolean {
  return hash === '' || hash === `#${SECTION_IDS.hero}`
}

export function resolveInitialIntroPhase(
  hash: string,
  reducedMotion: boolean,
): IntroPhase {
  return !reducedMotion && isEligibleHeroHash(hash)
    ? 'descending'
    : 'complete'
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
