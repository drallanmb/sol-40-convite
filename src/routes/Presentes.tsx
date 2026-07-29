import { Component, useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from 'convex/react'
import type { PublicWine } from '../../convex/wineModel'
import { api } from '../../convex/_generated/api'
import WineCatalog from '../components/gifts/WineCatalog'
import Shell from '../components/layout/Shell'
import { GIFT_BANDS, GIFTS_COPY, GIFTS_NAV_LINKS } from '../content/gifts'
import useReducedMotion from '../hooks/useReducedMotion'
import { catalogTargetFromWineHash } from '../lib/wineDeepLink'

function BandShortcuts({ visible }: { visible: boolean }) {
  if (!visible) return null

  return (
    <nav aria-label={GIFTS_COPY.shortcutsLabel} className="mt-8">
      <p className="text-caption font-bold uppercase leading-label-relaxed tracking-label text-peach">
        {GIFTS_COPY.shortcutsLabel}
      </p>
      <ul className="gift-shortcuts mt-4 flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible sm:pb-0">
        {GIFT_BANDS.map((band) => (
          <li key={band.id} className="shrink-0 snap-start">
            <a
              href={`#${band.id}`}
              className="flex min-h-11 items-center rounded-full border border-cellar-line px-4 py-2 text-caption font-bold uppercase leading-label-relaxed tracking-label text-cream transition-[background-color,color] duration-(--duration-fast) ease-out hover:bg-cream hover:text-cellar focus-visible:bg-cream focus-visible:text-cellar"
            >
              {band.heading}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function PresentesScaffold({
  children,
  showShortcuts,
}: {
  children: ReactNode
  showShortcuts: boolean
}) {
  return (
    <div className="min-w-0 overflow-x-clip bg-cellar text-cream">
      <section className="gift-route-enter relative isolate min-h-[360px] overflow-hidden px-6 pb-12 pt-16 sm:px-8 lg:min-h-[420px] lg:px-16">
        <div
          aria-hidden="true"
          className="gift-route-halo pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-peach opacity-[.18] sm:-right-16 sm:-top-24 sm:h-60 sm:w-60"
        />
        <div className="relative mx-auto max-w-[1320px]">
          <p className="gift-route-copy gift-route-copy--kicker text-caption font-bold uppercase leading-label-relaxed tracking-label text-peach">
            {GIFTS_COPY.page.kicker}
          </p>
          <h1 className="gift-route-copy gift-route-copy--title mt-4 max-w-[62ch] font-serif text-route-title font-normal leading-route-title tracking-display text-cream">
            {GIFTS_COPY.page.headingLead}
            <em className="font-normal text-peach">
              {GIFTS_COPY.page.headingEmphasis}
            </em>
          </h1>
          <p className="gift-route-copy gift-route-copy--body mt-6 max-w-[62ch] text-body leading-body text-cellar-muted">
            {GIFTS_COPY.page.support}
          </p>
          <aside className="gift-route-copy gift-route-copy--note mt-8 max-w-[62ch] border-l border-cellar-line pl-4 text-body leading-body text-cellar-muted">
            {GIFTS_COPY.page.operationalNote}
          </aside>
          <BandShortcuts visible={showShortcuts} />
        </div>
      </section>

      <div className="mx-auto max-w-[1320px] px-6 py-16 sm:px-8 lg:px-16">
        {children}
      </div>
    </div>
  )
}

const CATEGORIES = new Set(['ate-200', '200-350', '350-500'])
const TONES = new Set(['rubi', 'dourado', 'rose', 'verde'])
const STATUSES = new Set(['available', 'gifted'])
const HEX_COLOR_PATTERN = /^#[0-9A-F]{6}$/u

function isDisplayWine(value: unknown): value is PublicWine {
  if (!value || typeof value !== 'object') return false
  const wine = value as Partial<Record<keyof PublicWine, unknown>>
  return (
    typeof wine.productCode === 'string' &&
    wine.productCode.length > 0 &&
    typeof wine.catalogKey === 'string' &&
    wine.catalogKey.length > 0 &&
    typeof wine.name === 'string' &&
    wine.name.length > 0 &&
    typeof wine.producer === 'string' &&
    wine.producer.length > 0 &&
    typeof wine.description === 'string' &&
    wine.description.length > 0 &&
    typeof wine.palettePrimary === 'string' &&
    HEX_COLOR_PATTERN.test(wine.palettePrimary) &&
    typeof wine.paletteSecondary === 'string' &&
    HEX_COLOR_PATTERN.test(wine.paletteSecondary) &&
    wine.palettePrimary !== wine.paletteSecondary &&
    typeof wine.priceCents === 'number' &&
    Number.isSafeInteger(wine.priceCents) &&
    wine.priceCents > 0 &&
    typeof wine.category === 'string' &&
    CATEGORIES.has(wine.category) &&
    typeof wine.tone === 'string' &&
    TONES.has(wine.tone) &&
    typeof wine.status === 'string' &&
    STATUSES.has(wine.status)
  )
}

function CatalogQuery() {
  const catalog = useQuery(api.wines.listCatalog)
  const catalogReady = catalog !== undefined
  const reducedMotion = useReducedMotion()
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const applyCurrentHash = useCallback(() => {
    const hashTarget = catalogTargetFromWineHash(window.location.hash)
    if (!hashTarget) {
      setSelectedKey(null)
      return
    }

    const target = document.getElementById(hashTarget.id)
    if (!target) {
      setSelectedKey(null)
      return
    }

    setSelectedKey(
      hashTarget.kind === 'wine' ? hashTarget.catalogKey : null,
    )
    target.scrollIntoView({
      block: hashTarget.kind === 'wine' ? 'center' : 'start',
      behavior: reducedMotion ? 'auto' : 'smooth',
    })
    target.focus({ preventScroll: true })
  }, [reducedMotion])

  useEffect(() => {
    if (!catalogReady) return

    applyCurrentHash()
    window.addEventListener('hashchange', applyCurrentHash)
    window.addEventListener('popstate', applyCurrentHash)
    return () => {
      window.removeEventListener('hashchange', applyCurrentHash)
      window.removeEventListener('popstate', applyCurrentHash)
    }
  }, [applyCurrentHash, catalogReady])

  if (catalog === undefined) {
    return (
      <PresentesScaffold showShortcuts>
        <WineCatalog state="loading" />
      </PresentesScaffold>
    )
  }

  const validWines = (catalog as readonly unknown[]).filter(isDisplayWine)
  const partial = validWines.length !== catalog.length

  return (
    <PresentesScaffold showShortcuts={validWines.length > 0}>
      <WineCatalog
        state="ready"
        wines={validWines}
        partial={partial}
        selectedKey={selectedKey}
      />
    </PresentesScaffold>
  )
}

type CatalogBoundaryState = {
  failed: boolean
  attempt: number
}

class CatalogBoundary extends Component<object, CatalogBoundaryState> {
  state: CatalogBoundaryState = { failed: false, attempt: 0 }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  retry = () => {
    this.setState((state) => ({
      failed: false,
      attempt: state.attempt + 1,
    }))
  }

  render() {
    if (this.state.failed) {
      return (
        <PresentesScaffold showShortcuts>
          <WineCatalog state="error" onRetry={this.retry} />
        </PresentesScaffold>
      )
    }

    return <CatalogQuery key={this.state.attempt} />
  }
}

export default function Presentes() {
  return (
    <Shell navLinks={GIFTS_NAV_LINKS} wordmarkHref="/">
      <CatalogBoundary />
    </Shell>
  )
}
