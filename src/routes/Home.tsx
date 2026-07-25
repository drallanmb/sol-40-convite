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

/**
 * Home — a página real do convite (INVITE-01 a INVITE-04). Composição pura:
 * cada seção lê seu próprio conteúdo de `src/content/event.ts` e não recebe
 * props. A Carta abre sua adega logo após a contagem; a ordem relativa
 * local, guia, programa, traje e memórias permanece travada. O footer já
 * faz parte do `Shell` e nada aqui precisa repeti-lo.
 */
function Home() {
  return (
    <Shell navLinks={NAV_LINKS} showCountdownRail wordmarkHref={`#${SECTION_IDS.hero}`}>
      <Hero />
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
