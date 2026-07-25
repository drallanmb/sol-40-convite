import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useQuery } from 'convex/react'
import { Link } from 'react-router'
import { api } from '../../../convex/_generated/api'
import type { PublicWine } from '../../../convex/wineModel'
import { GIFTS_COPY } from '../../content/gifts'
import { wineDomId } from '../../lib/wineDeepLink'
import { formatBRL } from '../../lib/wineWhatsApp'
import WineImage from './WineImage'

const PREVIEW_COPY = {
  kicker: 'SUGESTÕES DE PRESENTE',
  heading: 'Para brindar depois do brinde.',
  support:
    'Três escolhas da Sol entre R$ 200 e R$ 350. Abra um rótulo ou veja a carta completa.',
  cta: 'Ver a carta completa',
} as const

function PreviewSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex min-h-[452px] min-w-0 flex-col border border-cellar-line bg-cellar-soft p-6"
    >
      <div className="h-[264px] bg-cream/[.06]" />
      <div className="mt-6 h-4 w-24 bg-cream/[.12]" />
      <div className="mt-4 h-8 w-4/5 bg-cream/[.12]" />
      <div className="mt-3 h-4 w-2/3 bg-cream/[.06]" />
      <div className="mt-auto h-6 w-1/2 bg-cream/[.12]" />
    </div>
  )
}

function PreviewError() {
  return (
    <div
      role="alert"
      className="col-span-full border border-cellar-line bg-cellar-soft p-6 text-cellar-muted"
    >
      <p className="max-w-[62ch] text-[16px] leading-[1.62]">
        {GIFTS_COPY.error}
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-4 inline-flex min-h-11 items-center justify-center border border-cream px-6 py-2 text-[16px] font-bold leading-[1.25] text-cream transition-[transform,background-color,color] duration-(--duration-fast) ease-out hover:bg-cream hover:text-cellar active:scale-[.98] focus-visible:bg-cream focus-visible:text-cellar"
      >
        {GIFTS_COPY.retry}
      </button>
    </div>
  )
}

type PreviewBoundaryProps = {
  children: ReactNode
}

type PreviewBoundaryState = {
  failed: boolean
}

class PreviewBoundary extends Component<
  PreviewBoundaryProps,
  PreviewBoundaryState
> {
  state: PreviewBoundaryState = { failed: false }

  static getDerivedStateFromError(): PreviewBoundaryState {
    return { failed: true }
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // The inline alert preserves the section and complete-catalog route.
  }

  render() {
    return this.state.failed ? <PreviewError /> : this.props.children
  }
}

function PreviewCard({ wine }: { wine: PublicWine }) {
  const gifted = wine.status === 'gifted'
  const formattedPrice = formatBRL(wine.priceCents)
  const accessibleStatus = gifted ? `, ${GIFTS_COPY.gifted}` : ''

  return (
    <Link
      to={`/presentes#${wineDomId(wine.productCode)}`}
      aria-label={`${wine.name}, ${formattedPrice}${accessibleStatus}`}
      data-wine-status={wine.status}
      className="group flex min-h-[452px] min-w-0 flex-col border border-cellar-line bg-cellar-soft p-6 text-cream outline-none transition-transform duration-(--duration-fast) ease-out focus-visible:outline-[3px] focus-visible:outline-peach focus-visible:outline-offset-[3px]"
    >
      <div
        className={
          gifted
            ? 'opacity-[.68] saturate-[.45]'
            : 'transition-transform duration-(--duration-fast) ease-out motion-safe:group-hover:-translate-y-1'
        }
      >
        <WineImage wine={wine} eager />
      </div>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <span
          className={
            gifted
              ? 'border border-gifted px-2 py-1 text-[13px] font-bold uppercase leading-[1.35] tracking-label text-gifted'
              : 'border border-peach px-2 py-1 text-[13px] font-bold uppercase leading-[1.35] tracking-label text-peach'
          }
        >
          {gifted ? GIFTS_COPY.gifted : GIFTS_COPY.available}
        </span>
        <data
          value={(wine.priceCents / 100).toFixed(2)}
          className="shrink-0 font-serif text-[28px] font-normal leading-none tabular-nums"
        >
          {formattedPrice}
        </data>
      </div>

      <h3 className="mt-4 overflow-anywhere font-serif text-[28px] font-normal leading-[1.08] tracking-display">
        {wine.name}
      </h3>
      <p className="mt-2 overflow-anywhere text-[13px] font-bold uppercase leading-[1.35] tracking-label text-cellar-muted">
        {wine.producer}
      </p>
      <p className="mt-auto pt-6 text-[13px] font-bold uppercase leading-[1.35] tracking-label text-peach">
        Ver este rótulo
      </p>
    </Link>
  )
}

function PreviewGrid() {
  const wines = useQuery(api.wines.listFeatured)

  if (wines === undefined) {
    return (
      <div
        aria-busy="true"
        aria-label="Prévia da carta de vinhos"
        className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6"
      >
        <span className="sr-only" role="status">
          {GIFTS_COPY.loading}
        </span>
        <PreviewSkeleton />
        <PreviewSkeleton />
        <PreviewSkeleton />
      </div>
    )
  }

  if (wines.length !== 3) {
    return (
      <div className="grid grid-cols-1">
        <PreviewError />
      </div>
    )
  }

  return (
    <div
      aria-label="Prévia da carta de vinhos"
      className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6"
    >
      {wines.map((wine) => (
        <PreviewCard key={wine.productCode} wine={wine} />
      ))}
    </div>
  )
}

export function GiftPreview() {
  return (
    <section className="bg-cellar px-6 py-16 text-cream md:px-8 lg:px-16">
      <div className="mx-auto max-w-[1320px]">
        <div className="max-w-[62ch]">
          <p className="text-[13px] font-bold uppercase leading-[1.35] tracking-label text-peach">
            {PREVIEW_COPY.kicker}
          </p>
          <h2 className="mt-4 max-w-[18ch] font-serif text-[48px] font-normal leading-[.95] tracking-display">
            {PREVIEW_COPY.heading}
          </h2>
          <p className="mt-6 max-w-[62ch] text-[16px] leading-[1.62] text-cellar-muted">
            {PREVIEW_COPY.support}
          </p>
        </div>

        <div className="mt-8">
          <PreviewBoundary>
            <PreviewGrid />
          </PreviewBoundary>
        </div>

        <Link
          to="/presentes"
          className="mt-8 inline-flex min-h-12 items-center justify-center border border-cream px-6 py-3 text-[16px] font-bold leading-[1.25] text-cream transition-[transform,background-color,color] duration-(--duration-fast) ease-out hover:bg-cream hover:text-cellar active:scale-[.98] focus-visible:bg-cream focus-visible:text-cellar"
        >
          {PREVIEW_COPY.cta}
        </Link>
      </div>
    </section>
  )
}

export default GiftPreview
