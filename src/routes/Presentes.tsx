import Shell from '../components/layout/Shell'
import { GIFT_BANDS, GIFTS_COPY, GIFTS_NAV_LINKS } from '../content/gifts'

function BandShortcuts() {
  return (
    <nav aria-label={GIFTS_COPY.shortcutsLabel} className="mt-8">
      <p className="text-[13px] font-bold uppercase leading-[1.35] tracking-label text-peach">
        {GIFTS_COPY.shortcutsLabel}
      </p>
      <ul className="gift-shortcuts mt-4 flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible sm:pb-0">
        {GIFT_BANDS.map((band) => (
          <li key={band.id} className="shrink-0 snap-start">
            <a
              href={`#${band.id}`}
              className="flex min-h-11 items-center rounded-full border border-cellar-line px-4 py-2 text-[13px] font-bold uppercase leading-[1.35] tracking-label text-cream transition-[background-color,color] duration-(--duration-fast) ease-out hover:bg-cream hover:text-cellar focus-visible:bg-cream focus-visible:text-cellar"
            >
              {band.heading}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default function Presentes() {
  return (
    <Shell navLinks={GIFTS_NAV_LINKS} wordmarkHref="/">
      <div className="min-w-0 overflow-x-clip bg-cellar text-cream">
        <section className="relative isolate min-h-[360px] overflow-hidden px-6 pb-12 pt-16 sm:px-8 lg:min-h-[420px] lg:px-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-peach opacity-[.18] sm:-right-16 sm:-top-24 sm:h-60 sm:w-60"
          />
          <div className="relative mx-auto max-w-[1320px]">
            <p className="text-[13px] font-bold uppercase leading-[1.35] tracking-label text-peach">
              {GIFTS_COPY.page.kicker}
            </p>
            <h1 className="mt-4 max-w-[62ch] font-serif text-[48px] font-normal leading-[.95] tracking-display text-cream">
              {GIFTS_COPY.page.headingLead}
              <em className="font-normal text-peach">{GIFTS_COPY.page.headingEmphasis}</em>
            </h1>
            <p className="mt-6 max-w-[62ch] text-[16px] leading-[1.62] text-cellar-muted">
              {GIFTS_COPY.page.support}
            </p>
            <aside className="mt-8 max-w-[62ch] border-l border-cellar-line pl-4 text-[16px] leading-[1.62] text-cellar-muted">
              {GIFTS_COPY.page.operationalNote}
            </aside>
            <BandShortcuts />
          </div>
        </section>

        <div
          aria-label="Carta de vinhos"
          className="mx-auto max-w-[1320px] px-6 py-16 sm:px-8 lg:px-16"
        />
      </div>
    </Shell>
  )
}
