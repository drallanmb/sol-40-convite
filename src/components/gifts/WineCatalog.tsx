import type { PublicWine, WineCategory } from '../../../convex/wineModel'
import { GIFT_BANDS, GIFTS_COPY } from '../../content/gifts'
import WineCard from './WineCard'

type WineCatalogProps =
  | {
      state: 'loading'
    }
  | {
      state: 'error'
      onRetry: () => void
    }
  | {
      state: 'ready'
      wines: readonly PublicWine[]
      partial?: boolean
      selectedCode?: string | null
    }

function bandCount(count: number) {
  return count === 1 ? '1 rótulo' : `${count} rótulos`
}

function CatalogSkeleton() {
  return (
    <>
      {GIFT_BANDS.map((band) => (
        <section
          key={band.id}
          id={band.id}
          aria-labelledby={`${band.id}-heading`}
          className="wine-band"
        >
          <div>
            <p className="text-[13px] font-bold uppercase leading-[1.35] tracking-label text-peach">
              {band.eyebrow}
            </p>
            <h2
              id={`${band.id}-heading`}
              className="mt-2 font-serif text-[28px] font-normal leading-[1.08] tracking-display"
            >
              {band.heading}
            </h2>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                aria-hidden="true"
                className={`min-h-[540px] border border-cellar-line bg-cellar-soft p-6 md:min-h-[580px] ${
                  index === 1 ? 'hidden md:block' : ''
                } ${index === 2 ? 'hidden lg:block' : ''} ${
                  index === 3 ? 'hidden xl:block' : ''
                }`}
              >
                <div className="h-[264px] bg-cream/[.06]" />
                <div className="mt-4 h-8 w-2/5 bg-cream/[.12]" />
                <div className="mt-4 h-8 w-4/5 bg-cream/[.12]" />
                <div className="mt-2 h-4 w-3/5 bg-cream/[.06]" />
                <div className="mt-4 h-16 bg-cream/[.06]" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  )
}

function ReadyBand({
  category,
  wines,
  selectedCode,
}: {
  category: WineCategory
  wines: readonly PublicWine[]
  selectedCode?: string | null
}) {
  const band = GIFT_BANDS.find((candidate) => candidate.category === category)
  if (!band) return null

  const bandWines = wines.filter((wine) => wine.category === category)

  return (
    <section
      id={band.id}
      aria-labelledby={`${band.id}-heading`}
      className="wine-band"
    >
      <div className="flex flex-col gap-2 min-[480px]:flex-row min-[480px]:items-end min-[480px]:justify-between min-[480px]:gap-6">
        <div>
          <p className="text-[13px] font-bold uppercase leading-[1.35] tracking-label text-peach">
            {band.eyebrow}
          </p>
          <h2
            id={`${band.id}-heading`}
            className="mt-2 font-serif text-[28px] font-normal leading-[1.08] tracking-display"
          >
            {band.heading}
          </h2>
        </div>
        <p className="text-[13px] font-bold uppercase leading-[1.35] tracking-label text-cellar-muted">
          {bandCount(bandWines.length)}
        </p>
      </div>

      {bandWines.length === 0 ? (
        <p className="mt-6 border border-cellar-line bg-cellar-soft p-6 text-[16px] leading-[1.62] text-cellar-muted">
          {GIFTS_COPY.empty.band}
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
          {bandWines.map((wine) => (
            <WineCard
              key={wine.productCode}
              wine={wine}
              selected={selectedCode === wine.productCode}
            />
          ))}
        </div>
      )}
    </section>
  )
}

export function WineCatalog(props: WineCatalogProps) {
  if (props.state === 'error') {
    return (
      <section aria-label="Carta de vinhos">
        <div role="alert" className="border border-cellar-line bg-cellar-soft p-6">
          <p className="max-w-[62ch] text-[16px] leading-[1.62] text-cream">
            {GIFTS_COPY.error}
          </p>
          <button
            type="button"
            onClick={props.onRetry}
            className="mt-4 min-h-11 border border-cream px-4 py-2 text-[16px] font-bold leading-[1.25] text-cream transition-[background-color,color] duration-(--duration-fast) ease-out hover:bg-cream hover:text-cellar focus-visible:bg-cream focus-visible:text-cellar"
          >
            {GIFTS_COPY.retry}
          </button>
        </div>
      </section>
    )
  }

  if (props.state === 'loading') {
    return (
      <section aria-label="Carta de vinhos" aria-busy="true">
        <span role="status" className="sr-only">
          {GIFTS_COPY.loading}
        </span>
        <div className="space-y-16">
          <CatalogSkeleton />
        </div>
      </section>
    )
  }

  if (props.wines.length === 0) {
    return (
      <section aria-labelledby="empty-catalog-heading">
        <h2
          id="empty-catalog-heading"
          className="max-w-[62ch] font-serif text-[28px] font-normal leading-[1.08] tracking-display"
        >
          {GIFTS_COPY.empty.heading}
        </h2>
        <p className="mt-4 max-w-[62ch] text-[16px] leading-[1.62] text-cellar-muted">
          {GIFTS_COPY.empty.body}
        </p>
      </section>
    )
  }

  return (
    <section aria-label="Carta de vinhos">
      {props.partial ? (
        <div
          role="status"
          className="mb-16 border border-cellar-line bg-cellar-soft p-6 text-[16px] leading-[1.62] text-cellar-muted"
        >
          {GIFTS_COPY.partial}
        </div>
      ) : null}
      <div className="space-y-16">
        {GIFT_BANDS.map((band) => (
          <ReadyBand
            key={band.category}
            category={band.category}
            wines={props.wines}
            selectedCode={props.selectedCode}
          />
        ))}
      </div>
    </section>
  )
}

export default WineCatalog
