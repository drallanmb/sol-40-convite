import { useState } from 'react'
import { SECTION_IDS, VENUE } from '../../content/event'

/**
 * LocalSection — o card do local (nome, endereço corrigido e o link "Abrir
 * rota" sempre visível) sobreposto a um mapa que só monta o iframe do Google
 * Maps depois de um toque explícito no botão "Ver mapa" (INVITE-03, D-04,
 * D-12). O contêiner do mapa reserva a altura final antes de qualquer coisa
 * ser montada dentro dele — 610px do breakpoint md pra cima, 540px abaixo —
 * e essa reserva não depende do estado de revelação, então nada pula na
 * página quando o iframe pinta (RESEARCH Pitfall 5). Quem nunca toca no
 * botão não gera nenhuma requisição a um domínio de terceiros: o iframe só
 * existe dentro do ramo revelado do condicional, nunca pré-carregado.
 */
export function LocalSection() {
  const [showMap, setShowMap] = useState(false)

  return (
    <section
      id={SECTION_IDS.local}
      tabIndex={-1}
      className="scroll-mt-[120px] bg-cream px-[clamp(24px,7vw,110px)] py-[clamp(80px,10vw,160px)] text-ink"
    >
      <div className="mx-auto max-w-[1320px]">
        <div className="relative h-[540px] overflow-hidden md:h-[610px]">
          {showMap ? (
            <iframe
              title="Mapa do Matapuã Eventos em Aracaju"
              src={VENUE.mapEmbedSrc}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-full w-full border-0"
            />
          ) : (
            <div className="grid h-full place-items-center bg-plum/10">
              <button
                type="button"
                onClick={() => setShowMap(true)}
                className="min-h-[44px] rounded-[100px] border border-plum bg-transparent px-6 py-4 font-sans text-small font-bold uppercase tracking-label text-plum transition-[transform,background-color] duration-(--duration-fast) ease-out hover:bg-plum/5 active:scale-[0.98]"
              >
                {VENUE.mapCtaLabel}
              </button>
            </div>
          )}

          {/* card do local — sempre visível, independente de showMap; fundo
              sólido pra continuar legível sobre o mapa carregado atrás */}
          <div className="absolute left-6 top-6 max-w-[320px] bg-plum p-6 text-cream shadow-[14px_14px_0_var(--color-sand)] sm:left-10 sm:top-10 sm:p-8">
            <p className="text-caption font-bold uppercase tracking-label text-peach">{VENUE.kicker}</p>
            <h2 className="mt-3 font-serif text-subheading">{VENUE.name}</h2>
            <p className="mt-3 text-body text-cream/80">{VENUE.addressLine1}</p>
            <p className="text-body text-cream/80">{VENUE.addressLine2}</p>
            <a
              href={VENUE.routeUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex min-h-[44px] items-center text-small font-bold uppercase tracking-label text-coral"
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
