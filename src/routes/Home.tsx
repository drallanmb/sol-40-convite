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
  CINEMATIC_INTRO_REVEAL_MS,
  homeSectionIdFromHash,
  resolveInitialIntroPhase,
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
  const [introPhase, setIntroPhase] = useState(() =>
    resolveInitialIntroPhase(initialHashRef.current, reducedMotion),
  )
  const [introRunGeneration] = useState(0)

  const completeIntroDescent = useCallback(() => {
    setIntroPhase((phase) =>
      phase === 'descending' ? 'revealing' : phase,
    )
  }, [])

  useEffect(() => {
    if (introPhase !== 'revealing') return

    const revealTimer = window.setTimeout(() => {
      setIntroPhase('complete')
    }, CINEMATIC_INTRO_REVEAL_MS)

    return () => window.clearTimeout(revealTimer)
  }, [introPhase])

  useEffect(() => {
    if (reducedMotion) setIntroPhase('complete')
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
      introPhase={introPhase}
      underlapTopbar
    >
      <Hero
        introPhase={introPhase}
        introRunGeneration={introRunGeneration}
        onIntroDescentComplete={completeIntroDescent}
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
