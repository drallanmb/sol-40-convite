import { SECTION_IDS, VENUE } from '../../content/event'

/**
 * LocalSection — mapa permanente com o card editorial do local no canto
 * inferior esquerdo, acima dos controles nativos. O pin e a atribuição do
 * Google Maps permanecem visíveis e interativos, enquanto um filtro sutil
 * aproxima a cartografia da paleta do convite.
 */
export function LocalSection() {
  return (
    <section
      id={SECTION_IDS.local}
      tabIndex={-1}
      className="scroll-mt-32 bg-cream px-[clamp(24px,7vw,110px)] py-[clamp(80px,10vw,160px)] text-ink"
    >
      <div className="mx-auto max-w-[1320px]">
        <div className="relative h-[540px] overflow-hidden md:h-[610px]">
          <iframe
            title="Mapa interativo do Matapuã Eventos em Aracaju"
            src={VENUE.mapEmbedSrc}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="local-map h-full w-full border-0"
          />

          <div className="absolute bottom-16 left-4 z-10 w-[calc(100%-2rem)] max-w-[292px] bg-plum p-4 text-cream sm:left-8 sm:max-w-[320px] sm:p-7 md:left-10">
            <p className="text-micro font-bold uppercase tracking-label text-peach sm:text-caption">
              {VENUE.kicker}
            </p>
            <h2 className="mt-3 font-serif text-subheading leading-subheading">{VENUE.name}</h2>
            <p className="mt-3 text-small leading-relaxed text-cream/80">
              {VENUE.addressLine1}
              <br />
              {VENUE.addressLine2}
            </p>
            <a
              href={VENUE.routeUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex min-h-[44px] items-center text-small font-bold uppercase tracking-label text-peach transition-colors duration-(--duration-fast) ease-out hover:text-cream"
            >
              {VENUE.routeCtaLabel}
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

export default LocalSection
