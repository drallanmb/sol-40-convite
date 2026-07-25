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
      className={`absolute inset-x-0 top-[72px] z-(--z-sticky) flex h-12 items-center justify-center gap-2 border-t border-cream/[.14] bg-plum px-3 text-cream transition-[opacity,transform,visibility] duration-(--duration-fast) ease-out sm:gap-6 sm:px-6 ${
        revealed
          ? 'visible translate-y-0 opacity-100 pointer-events-auto'
          : 'invisible pointer-events-none -translate-y-1.5 opacity-0'
      }`}
      style={{ transitionDelay: revealed ? '0s' : '0s, 0s, var(--duration-medium)' }}
    >
      <span className="shrink-0 text-[.6875rem] font-bold uppercase tracking-[.06em] text-peach sm:text-caption sm:tracking-label">
        {copy.railLabel}
      </span>

      {copy.showTiles ? (
        <div className="grid min-w-0 flex-1 grid-cols-4 gap-1 sm:flex sm:flex-none sm:items-baseline sm:gap-6">
          {TILE_ORDER.map((unit) => (
            <div
              key={unit}
              className={`grid min-w-0 justify-items-center leading-none sm:flex sm:items-baseline sm:gap-1 ${
                unit === 'days' ? 'sm:min-w-[4ch]' : ''
              }`}
            >
              <span className="font-serif text-[1.0625rem] tabular-nums text-cream">{parts[unit]}</span>
              <span className="max-w-full text-[.5rem] uppercase tracking-normal text-peach opacity-[.86] sm:text-[.6875rem] sm:tracking-[.06em]">
                {pluralizeUnit(parts[unit], unit)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default CountdownRail
