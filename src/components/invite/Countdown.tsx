import { useCountdown } from '../../hooks/useCountdown'
import { pluralizeUnit, type CountdownUnit, type EventPhase } from '../../lib/countdown'
import { COUNTDOWN_COPY } from '../../content/event'

const TILE_ORDER: CountdownUnit[] = ['days', 'hours', 'minutes', 'seconds']

/**
 * Renders the kicker + heading for the current phase. A `switch` on the
 * phase literal (rather than indexing `COUNTDOWN_COPY[phase]` once and
 * branching on the result) is what lets TypeScript resolve each
 * `COUNTDOWN_COPY.<phase>` access to its own exact shape — `antes` is the
 * only phase with `headingLead`/`headingEm`, `agora` is the only one with
 * `sub`, and a plain union access would not narrow across the two
 * differently-shaped variables.
 */
function CountdownHeading({ phase }: { phase: EventPhase }) {
  switch (phase) {
    case 'antes':
      return (
        <h2 className="mt-5 font-serif text-heading leading-[1.02] tracking-display">
          {COUNTDOWN_COPY.antes.headingLead}
          <em className="not-italic text-coral">{COUNTDOWN_COPY.antes.headingEm}</em>
        </h2>
      )
    case 'hoje':
      return <h2 className="mt-5 font-serif text-heading leading-[1.02] tracking-display">{COUNTDOWN_COPY.hoje.heading}</h2>
    case 'agora':
      return (
        <>
          <h2 className="mt-5 font-serif text-heading leading-[1.02] tracking-display">{COUNTDOWN_COPY.agora.heading}</h2>
          <p className="mt-4 text-body">{COUNTDOWN_COPY.agora.sub}</p>
        </>
      )
    case 'depois':
      // Owner-dictated literal copy — ships exactly as authored, nothing
      // added around it (P-02). Do not append an explanatory sub-line here.
      return <h2 className="mt-5 font-serif text-heading leading-[1.02] tracking-display">{COUNTDOWN_COPY.depois.heading}</h2>
  }
}

/**
 * Countdown — the four-state full-tile section (INVITE-01, D-10). Reads its
 * own state from `useCountdown()` (single source of truth shared with
 * `CountdownRail`), branches on `COUNTDOWN_COPY[phase].showTiles` to decide
 * whether to render the four numeric tiles, and never hardcodes a unit word
 * or a copy of the singular/plural rule — both come from
 * `pluralizeUnit` in `src/lib/countdown.ts`.
 */
export function Countdown() {
  const { phase, parts } = useCountdown()
  const copy = COUNTDOWN_COPY[phase]

  return (
    <section className="bg-plum px-[clamp(24px,7vw,110px)] py-[clamp(80px,10vw,160px)] text-cream">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-start gap-[clamp(50px,8vw,120px)] sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-caption font-bold uppercase tracking-label">{copy.kicker}</p>
          <CountdownHeading phase={phase} />
        </div>

        {copy.showTiles ? (
          <div aria-live="off" className="flex gap-[clamp(18px,4vw,54px)]">
            {TILE_ORDER.map((unit) => (
              <div key={unit} className={unit === 'days' ? 'min-w-[4ch]' : undefined}>
                <span className="block font-serif text-[clamp(3.5rem,6.5vw,5.5rem)] leading-none tracking-display tabular-nums">
                  {parts[unit]}
                </span>
                <span className="mt-2 block text-caption uppercase tracking-label opacity-[.78]">
                  {pluralizeUnit(parts[unit], unit)}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}

export default Countdown
