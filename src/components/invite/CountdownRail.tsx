import { useCountdown } from '../../hooks/useCountdown'
import { pluralizeUnit, type CountdownUnit } from '../../lib/countdown'
import { COUNTDOWN_COPY } from '../../content/event'

const TILE_ORDER: CountdownUnit[] = ['days', 'hours', 'minutes', 'seconds']

export type CountdownRailProps = {
  /**
   * Whether the rail is currently revealed. The rail owns no scroll
   * listener of its own — `Shell.tsx` (plan 02-07) owns the single scroll
   * listener on the page and passes the derived boolean down, so there is
   * never more than one place reading scroll position.
   */
  revealed: boolean
}

/**
 * CountdownRail — the compact single-line topbar variant (INVITE-01, D-11).
 * Reads the same `useCountdown()` state as `Countdown.tsx` so the two can
 * never disagree about the current phase, and is a controlled component:
 * `revealed` decides visibility, this component decides nothing about scroll.
 *
 * The reveal transition ports the old `.countdown-rail` recipe 1:1: opacity
 * and transform animate over the fast duration, but `visibility` is only
 * allowed to flip to `hidden` after that fade completes (delayed by the
 * medium duration) so the element never snaps out mid-transition. Going the
 * other way (hidden -> revealed) every delay collapses to 0 so the rail is
 * immediately interactive while it fades in. Tailwind's `duration-*`
 * utility only ever sets a single uniform `transition-duration` for every
 * listed property (see `Button.tsx`'s `duration-(--duration-fast)` on a
 * four-property list) — there is no square/parenthesis utility for
 * per-property durations, so the property list, timing function and
 * uniform duration come from Tailwind classes below, and only the one
 * value that genuinely needs to differ per-property (`transition-delay`)
 * is set inline.
 */
export function CountdownRail({ revealed }: CountdownRailProps) {
  const { phase, parts } = useCountdown()
  const copy = COUNTDOWN_COPY[phase]

  return (
    <div
      aria-hidden="true"
      className={`countdown-rail absolute inset-x-0 top-[72px] z-(--z-sticky) h-14 border-t border-cream/[.12] bg-plum/[.97] text-cream shadow-[0_4px_8px_rgba(53,25,42,0.12)] backdrop-blur-md transition-[opacity,transform,visibility] duration-(--duration-fast) ease-out ${
        revealed
          ? 'visible translate-y-0 opacity-100 pointer-events-auto'
          : 'invisible pointer-events-none -translate-y-1.5 opacity-0'
      }`}
      style={{ transitionDelay: revealed ? '0s' : '0s, 0s, var(--duration-medium)' }}
    >
      <div className="mx-auto flex h-full w-full max-w-3xl items-center justify-center px-3 sm:px-6">
        <span className="shrink-0 text-micro font-bold uppercase tracking-[.08em] text-peach sm:text-caption sm:tracking-label">
          {copy.railLabel}
        </span>

        {copy.showTiles ? (
          <div className="ml-3 flex min-w-0 flex-1 items-baseline justify-between border-l border-cream/[.18] pl-3 sm:ml-6 sm:flex-none sm:justify-start sm:gap-6 sm:pl-6">
            {TILE_ORDER.map((unit, index) => (
              <div
                key={unit}
                className={`flex min-w-0 items-baseline gap-1 leading-none ${
                  index > 0 ? 'border-l border-cream/[.14] pl-2.5 sm:pl-6' : ''
                }`}
              >
                <span className="font-serif text-rail-number leading-none tabular-nums text-cream">
                  {parts[unit]}
                </span>
                <span className="text-rail-unit uppercase tracking-[.02em] text-peach sm:tracking-[.06em]">
                  {pluralizeUnit(parts[unit], unit)}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default CountdownRail
