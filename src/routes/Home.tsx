import Shell from '../components/layout/Shell'
import Hero from '../components/invite/Hero'
import Countdown from '../components/invite/Countdown'
import LocalSection from '../components/invite/LocalSection'
import GuideSection from '../components/invite/GuideSection'
import ProgramaSection from '../components/invite/ProgramaSection'
import DressCodeSection from '../components/invite/DressCodeSection'
import { NAV_LINKS, SECTION_IDS } from '../content/event'

/**
 * Home — a página real do convite (INVITE-01 a INVITE-04). Composição pura:
 * cada seção lê seu próprio conteúdo de `src/content/event.ts` e não recebe
 * props. Ordem travada por D-05 — hero, countdown, local/Aracaju (mapa +
 * guia + hotéis, como um único bloco), programa, traje. O footer já faz
 * parte do `Shell` e nada aqui precisa repeti-lo.
 */
function Home() {
  return (
    <Shell navLinks={NAV_LINKS} showCountdownRail wordmarkHref={`#${SECTION_IDS.hero}`}>
      <Hero />
      <Countdown />
      <LocalSection />
      <GuideSection />
      <ProgramaSection />
      <DressCodeSection />
    </Shell>
  )
}

export default Home
