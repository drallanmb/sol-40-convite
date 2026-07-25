import { PROGRAMA, PROGRAMA_HEADING, PROGRAMA_KICKER, SECTION_IDS } from '../../content/event'

/**
 * ProgramaSection — os sete blocos confirmados da programação (INVITE-02,
 * D-02). Toda a cópia vem de `src/content/event.ts`; nenhum horário, título
 * ou descrição é duplicado como literal aqui, e a seção não carrega
 * nenhuma nota de "sujeito a alteração" porque a programação está travada.
 * O `scroll-mt` compensa a topbar fixa (72px) mais o rail do countdown
 * (56px), para que tanto o CTA do hero quanto o link "Programação" da
 * topbar pousem o heading abaixo do chrome fixo, não embaixo dele.
 */
export function ProgramaSection() {
  const [sunDay, sunMonth] = PROGRAMA_KICKER.split(' ')

  return (
    <section
      id={SECTION_IDS.programa}
      tabIndex={-1}
      className="scroll-mt-32 bg-cream px-[clamp(24px,7vw,110px)] py-[clamp(80px,10vw,160px)] text-ink"
    >
      <div className="mx-auto max-w-[840px]">
        <div className="flex flex-wrap items-start justify-between gap-8">
          <div>
            <h2
              aria-label={`${PROGRAMA_KICKER}. ${PROGRAMA_HEADING}`}
              className="max-w-[17ch] text-balance font-serif text-heading leading-heading tracking-display"
            >
              {PROGRAMA_HEADING}
            </h2>
          </div>

          {/* A data funciona como contraponto visual ao heading; o nome
              acessível do heading já inclui a mesma informação. */}
          <div
            aria-hidden="true"
            className="grid aspect-square w-[120px] shrink-0 place-items-center rounded-full sm:w-[140px]"
            style={{
              background: 'var(--color-sun-soft)',
              boxShadow: '0 0 60px var(--color-sun-soft-halo)',
            }}
          >
            <span className="text-center font-serif text-lead leading-none tracking-display text-plum">
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
                <p className="font-serif text-subheading leading-subheading">{item.title}</p>
                <p className="mt-1 max-w-[48ch] text-pretty text-body text-ink/80">{item.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export default ProgramaSection
