import { DRESS, SECTION_IDS } from '../../content/event'

/**
 * DressCodeSection — traje obrigatório: intro, os dois blocos de referência
 * (Homens/Mulheres), o aviso do gramado e a galeria de duas fotos
 * (INVITE-02). Toda a cópia vem de `DRESS`; os dois blocos de audiência são
 * apresentados como referências paralelas, não como atribuição — nenhuma
 * frase é adicionada além do texto travado (P-03). As duas imagens carregam
 * carregamento preguiçoso, decodificação assíncrona e dimensões explícitas,
 * e cada `figure` reserva sua proporção real antes do decode, para que a
 * seção nunca desloque o layout (UI Considerations, loading | E5).
 */
export function DressCodeSection() {
  return (
    <section
      id={SECTION_IDS.traje}
      tabIndex={-1}
      className="scroll-mt-32 bg-plum px-[clamp(24px,7vw,110px)] py-[clamp(80px,10vw,160px)] text-cream"
    >
      <div className="mx-auto grid max-w-[1320px] gap-[clamp(40px,6vw,90px)] md:grid-cols-2 md:items-center">
        <div>
          <p className="font-serif text-lead italic leading-lead text-peach lowercase first-letter:uppercase">
            {DRESS.kicker}
          </p>
          <h2 className="mt-3 max-w-[18ch] text-balance font-serif text-heading leading-heading tracking-display">
            {DRESS.headingLead}
            <em className="not-italic text-coral">{DRESS.headingEm}</em>
          </h2>
          <p className="mt-5 max-w-[62ch] text-pretty text-body text-cream/80">{DRESS.intro}</p>

          <div className="mt-10 divide-y divide-cream/25 border-t border-cream/25">
            {DRESS.rules.map((rule) => (
              <div key={rule.audience} className="grid gap-1 py-6 sm:grid-cols-[minmax(100px,0.36fr)_1fr] sm:gap-6">
                <p className="font-serif text-subheading leading-subheading text-peach">{rule.audience}</p>
                <p className="text-pretty text-body text-cream/80">{rule.text}</p>
              </div>
            ))}
          </div>

          <aside className="mt-9 bg-coral px-7 py-6 text-ink">
            <span className="block text-caption font-bold uppercase tracking-label">{DRESS.callout.kicker}</span>
            <p className="mt-2 font-serif text-subheading leading-subheading">{DRESS.callout.lead}</p>
            <p className="mt-2 text-pretty text-body">{DRESS.callout.text}</p>
          </aside>
        </div>

        {/* aspect-ratio reservado por imagem via style inline — os dois
            arquivos têm proporções reais diferentes (1120x1400 e 895x1400),
            então uma classe Tailwind estática não poderia expressar as duas
            ao mesmo tempo. */}
        <div aria-label="Referências de traje em branco e off-white" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {DRESS.gallery.map((item) => (
            <figure
              key={item.src}
              className="relative m-0 overflow-hidden"
              style={{ aspectRatio: `${item.width} / ${item.height}` }}
            >
              <img
                src={item.src}
                alt={item.alt}
                width={item.width}
                height={item.height}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
              <figcaption className="absolute inset-x-3 bottom-3 bg-cream px-3 py-2 text-small font-medium leading-snug text-plum">
                {item.caption}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}

export default DressCodeSection
