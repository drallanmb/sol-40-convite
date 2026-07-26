import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import Shell from '../components/layout/Shell'
import Hero from '../components/invite/Hero'
import Countdown from '../components/invite/Countdown'
import LocalSection from '../components/invite/LocalSection'
import GuideSection from '../components/invite/GuideSection'
import ProgramaSection from '../components/invite/ProgramaSection'
import DressCodeSection from '../components/invite/DressCodeSection'
import GiftPreview from '../components/gifts/GiftPreview'
import MemoriesSection from '../components/memories/MemoriesSection'
import { NAV_LINKS, SECTION_IDS } from '../content/event'
import { useReducedMotion } from '../hooks/useReducedMotion'
import {
  homeSectionIdFromHash,
  isEligibleHeroHash,
  resolveCompletedIntroState,
  resolveInitialIntroState,
  type IntroCompletionReason,
} from '../lib/cinematicIntro'

/**
 * Home — a página real do convite (INVITE-01 a INVITE-04). Composição pura:
 * cada seção lê seu próprio conteúdo de `src/content/event.ts` e não recebe
 * props. A Carta abre sua adega logo após a contagem; a ordem relativa
 * local, guia, programa, traje e memórias permanece travada. O footer já
 * faz parte do `Shell` e nada aqui precisa repeti-lo.
 */
function Home() {
  const location = useLocation()
  const reducedMotion = useReducedMotion()
  const initialHashRef = useRef(location.hash)
  const [introState, setIntroState] = useState(() =>
    resolveInitialIntroState(initialHashRef.current, reducedMotion),
  )
  const [introRunGeneration, setIntroRunGeneration] = useState(0)

  const completeIntro = useCallback((reason: IntroCompletionReason) => {
    setIntroState(resolveCompletedIntroState(reason))
  }, [])

  useEffect(() => {
    if (reducedMotion) completeIntro('reduced-motion')
  }, [completeIntro, reducedMotion])

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (
        !event.persisted ||
        reducedMotion ||
        !isEligibleHeroHash(window.location.hash)
      ) {
        return
      }

      setIntroRunGeneration((generation) => generation + 1)
      setIntroState('playing')
    }

    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [reducedMotion])

  useEffect(() => {
    const sectionId = homeSectionIdFromHash(initialHashRef.current)
    if (!sectionId || sectionId === SECTION_IDS.hero) return

    const frame = window.requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({
        block: 'start',
        behavior: 'auto',
      })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [])

  return (
    <Shell
      navLinks={NAV_LINKS}
      showCountdownRail
      wordmarkHref={`#${SECTION_IDS.hero}`}
      introState={introState}
      underlapTopbar
    >
      <Hero
        introState={introState}
        introRunGeneration={introRunGeneration}
        onIntroComplete={completeIntro}
      />
      <Countdown />
      <GiftPreview />
      <LocalSection />
      <GuideSection />
      <ProgramaSection />
      <DressCodeSection />
      <MemoriesSection />
    </Shell>
  )
}

export default Home
