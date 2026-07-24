import { PROGRAMA, PROGRAMA_HEADING, PROGRAMA_KICKER, SECTION_IDS } from '../../content/event'

/**
 * ProgramaSection — os sete blocos confirmados da programação (INVITE-02,
 * D-02). Toda a cópia vem de `src/content/event.ts`; nenhum horário, título
 * ou descrição é duplicado como literal aqui, e a seção não carrega
 * nenhuma nota de "sujeito a alteração" porque a programação está travada.
 * O `scroll-mt` compensa a topbar fixa (72px) mais o rail do countdown
 * (48px), para que tanto o CTA do hero quanto o link "Programação" da
 * topbar pousem o heading abaixo do chrome fixo, não embaixo dele.
 */
export function ProgramaSection() {
  const [sunDay, sunMonth] = PROGRAMA_KICKER.split(' ')

  return (
    <section
      id={SECTION_IDS.programa}
      className="scroll-mt-[120px] bg-cream px-[clamp(24px,7vw,110px)] py-[clamp(80px,10vw,160px)] text-ink"
    >
      <div className="mx-auto max-w-[840px]">
        <div className="flex flex-wrap items-start justify-between gap-8">
          <div>
            <p className="text-caption font-bold uppercase tracking-label text-wine">{PROGRAMA_KICKER}</p>
            <h2 className="mt-3 font-serif text-heading leading-[1.02] tracking-display">{PROGRAMA_HEADING}</h2>
          </div>

          {/* toque decorativo herdado do site antigo — repete a data já dita
              pelo kicker acima, então some da árvore de acessibilidade */}
          <div
            aria-hidden="true"
            className="grid aspect-square w-[120px] shrink-0 place-items-center rounded-full sm:w-[140px]"
            style={{ background: '#ffd07d', boxShadow: '0 0 60px rgba(255,208,125,.5)' }}
          >
            <span className="text-center font-serif text-lead leading-[0.9] tracking-display text-plum">
              {sunDay}
              <br />
              {sunMonth}
            </span>
          </div>
        </div>

        <ol className="mt-10 divide-y divide-line sm:mt-16">
          {PROGRAMA.map((item) => (
            <li key={item.time} className="grid gap-1 py-6 sm:grid-cols-[96px_1fr] sm:items-baseline sm:gap-6">
              <time dateTime={item.time} className="font-serif italic text-lead text-wine">
                {item.time}
              </time>
              <div>
                <p className="font-serif text-subheading">{item.title}</p>
                <p className="mt-1 max-w-[48ch] text-body text-ink/80">{item.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export default ProgramaSection
