import { GUIDE, GUIDE_HEADING_EM, GUIDE_HEADING_LEAD, GUIDE_KICKER, HOTELS, HOTELS_HEADING } from '../../content/event'

/**
 * GuideSection — o guia da cidade (quatro cartões de atração) e a lista dos
 * três hotéis indicados pelos donos (INVITE-03, D-13/D-14). Toda a cópia e
 * todo link vêm de `src/content/event.ts`; nenhuma URL é literal aqui. Cada
 * cartão do guia carrega sua própria borda completa, uma estratégia
 * indiferente à contagem de itens — ao contrário da regra antiga baseada no
 * item final do DOM, que só funcionava com múltiplos exatos da grade de 3
 * colunas e, com 4 cartões, deixava uma borda órfã na terceira posição e um
 * cartão sozinho numa segunda linha (RESEARCH Pitfall 6). O grid usa 2
 * colunas no tablet e 4 no desktop — nunca 3 — pra nunca encalhar um
 * cartão sozinho na largura em que os quatro aparecem. O nome de cada hotel
 * usa peso regular (não um terceiro peso de fonte): tamanho e cor já
 * carregam a ênfase, como o contrato de tipografia exige.
 */
export function GuideSection() {
  return (
    <section className="bg-cream px-[clamp(24px,7vw,110px)] py-[clamp(80px,10vw,160px)] text-ink">
      <div className="mx-auto max-w-[1320px]">
        <p className="text-caption font-bold uppercase tracking-label text-wine">{GUIDE_KICKER}</p>
        <h2 className="mt-3 font-serif text-heading leading-[1.02] tracking-display">
          {GUIDE_HEADING_LEAD}
          <em className="not-italic text-orange">{GUIDE_HEADING_EM}</em>
        </h2>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:mt-16 sm:grid-cols-2 lg:grid-cols-4">
          {GUIDE.map((place) => (
            <a
              key={place.url}
              href={place.url}
              target="_blank"
              rel="noreferrer"
              className="group flex min-h-[44px] flex-col border border-line bg-card p-6 transition-[transform,box-shadow] duration-(--duration-fast) ease-out hover:-translate-y-1 hover:shadow-[8px_8px_0_var(--color-sand)]"
            >
              <span className="text-caption font-bold uppercase tracking-label text-wine">{place.kicker}</span>
              <h3 className="mt-3 break-words font-serif text-subheading">{place.name}</h3>
              <p className="mt-2 break-words text-body text-ink/80">{place.description}</p>
            </a>
          ))}
        </div>

        <div className="mt-16 border-t border-line pt-10 sm:mt-20">
          <p className="text-caption font-bold uppercase tracking-label text-wine">{HOTELS_HEADING}</p>
          <ul className="mt-6 divide-y divide-line">
            {HOTELS.map((hotel) => (
              <li key={hotel.url}>
                <a
                  href={hotel.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-[44px] flex-wrap items-baseline justify-between gap-2 py-5"
                >
                  <span className="break-words font-serif text-subheading text-orange">{hotel.name}</span>
                  <span className="break-words text-body text-ink/80">{hotel.distance}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

export default GuideSection
