import { useId, useLayoutEffect, useRef, useState } from 'react'
import type { FocusEvent } from 'react'
import type { PublicWine } from '../../../convex/wineModel'
import { GIFTS_COPY } from '../../content/gifts'
import { wineDomId } from '../../lib/wineDeepLink'
import {
  buildWineWhatsAppUrl,
  formatBRL,
} from '../../lib/wineWhatsApp'
import WineBottleVisual from './WineBottleVisual'

type WineCardProps = {
  wine: PublicWine
  selected?: boolean
}

export function WineCard({
  wine,
  selected = false,
}: WineCardProps) {
  const articleRef = useRef<HTMLElement>(null)
  const hadFocusWithinRef = useRef(false)
  const previousStatusRef = useRef(wine.status)
  const [liveMessage, setLiveMessage] = useState('')
  const reactId = useId()
  const titleId = `wine-title-${wine.productCode}-${reactId.replaceAll(':', '')}`
  const gifted = wine.status === 'gifted'

  useLayoutEffect(() => {
    const changedToGifted =
      previousStatusRef.current === 'available' && wine.status === 'gifted'

    if (changedToGifted && hadFocusWithinRef.current) {
      articleRef.current?.focus({ preventScroll: true })
      setLiveMessage(GIFTS_COPY.gifted)
    }

    previousStatusRef.current = wine.status
  }, [wine.status])

  function rememberFocus() {
    hadFocusWithinRef.current = true
  }

  function releaseFocus(event: FocusEvent<HTMLElement>) {
    const nextTarget = event.relatedTarget
    if (nextTarget && !event.currentTarget.contains(nextTarget)) {
      hadFocusWithinRef.current = false
    }
  }

  return (
    <article
      ref={articleRef}
      id={wineDomId(wine.productCode)}
      tabIndex={-1}
      aria-labelledby={titleId}
      data-wine-status={wine.status}
      data-selected={selected ? 'true' : undefined}
      onFocusCapture={rememberFocus}
      onBlurCapture={releaseFocus}
      className="wine-card relative flex min-h-[540px] min-w-0 flex-col border border-cellar-line bg-cellar-soft p-6 text-cream outline-none transition-[transform,outline-color] duration-(--duration-fast) ease-out md:min-h-[580px]"
    >
      {selected ? (
        <span className="absolute left-6 top-4 z-[2] bg-cellar px-2 py-1 text-[13px] font-bold uppercase leading-[1.35] tracking-label text-peach">
          {GIFTS_COPY.selected}
        </span>
      ) : null}

      <div className={gifted ? 'opacity-[.68] saturate-[.45]' : undefined}>
        <WineBottleVisual wine={wine} />
      </div>

      <div className="mt-4 flex items-start justify-between gap-4">
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
          className="shrink-0 font-serif text-[28px] font-normal leading-none tabular-nums text-cream"
        >
          {formatBRL(wine.priceCents)}
        </data>
      </div>

      <h3
        id={titleId}
        className="mt-4 overflow-anywhere font-serif text-[28px] font-normal leading-[1.08] tracking-display"
      >
        {wine.name}
      </h3>
      <p className="mt-2 overflow-anywhere text-[13px] font-bold uppercase leading-[1.35] tracking-label text-cellar-muted">
        {wine.producer}
      </p>
      <p
        className={`mt-4 font-serif text-[16px] font-normal leading-[1.5] ${
          gifted ? 'text-cream/70' : 'text-cellar-muted'
        }`}
      >
        {wine.description}
      </p>
      <p className="mt-4 overflow-anywhere text-[13px] font-bold leading-[1.35] text-cream/72">
        {GIFTS_COPY.productCode(wine.productCode)}
      </p>

      <div className="mt-auto pt-6">
        {gifted ? (
          <div aria-hidden="true" className="min-h-12" />
        ) : (
          <a
            href={buildWineWhatsAppUrl(wine)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-12 w-full items-center justify-center border border-cream px-4 py-2 text-center text-[16px] font-bold leading-[1.25] text-cream transition-[transform,background-color,color] duration-(--duration-fast) ease-out hover:bg-cream hover:text-cellar active:scale-[.98] focus-visible:bg-cream focus-visible:text-cellar"
          >
            {GIFTS_COPY.primaryCta}
            <span className="sr-only"> {GIFTS_COPY.externalLinkSuffix}</span>
          </a>
        )}
      </div>

      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {liveMessage}
      </span>
    </article>
  )
}

export default WineCard
