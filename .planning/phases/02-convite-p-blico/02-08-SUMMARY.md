---
phase: 02-convite-p-blico
plan: 08
subsystem: ui
tags: [tailwind, responsive, svg, hero, gap-closure]

# Dependency graph
requires:
  - phase: 02-convite-p-blico
    provides: PalmSvg.tsx hero palm silhouettes (plan 02-03)
provides:
  - Responsive hero palm silhouettes that frame the composition from the edges at every
    viewport width without overlapping the central hero copy on narrow mobile screens
affects: [uat, hero-responsive]

# Tech tracking
tech-stack:
  added: []
  patterns: [Tailwind base/sm:/md: responsive utility scaling on absolutely-positioned decorative SVGs]

key-files:
  created: []
  modified: [src/components/invite/PalmSvg.tsx]

key-decisions:
  - "Scaled the palm footprint down at base (h-380/w-228, offset -64px) and sm: (h-500/w-300, offset -72px), restoring the exact original h-600/w-360/-82px/bottom--130px at md: (>=768px) so desktop framing is byte-identical to before this fix"

patterns-established: []

requirements-completed: [INVITE-04]

coverage:
  - id: D1
    description: "Hero palm silhouettes scale down at mobile widths (base h-380/w-228, sm: h-500/w-300) and restore the original fixed h-600/w-360/-82px framing at md: (>=768px), closing UAT gap G-02-3 where fronds crossed the hero copy/CTA at 360px"
    requirement: INVITE-04
    verification:
      - kind: unit
        ref: "npx vitest run (31 tests, no test targets PalmSvg directly — regression guard only)"
        status: pass
      - kind: other
        ref: "npm run build (tsc -b && vite build) — exit 0"
        status: pass
      - kind: other
        ref: "grep -c pointer-events-none src/components/invite/PalmSvg.tsx == 1"
        status: pass
      - kind: other
        ref: "grep -E md:(w|h)-\\[|md:(left|right)-\\[ src/components/invite/PalmSvg.tsx — matches, confirming md: breakpoint restores original desktop values"
        status: pass
    human_judgment: true
    rationale: "Visual clearance at 360px (fronds not crossing the lockup/tagline/CTA) and pixel-identical desktop framing at 1440px require a rendered browser check across breakpoints, which is outside this executor's automated tooling. Per the plan, the orchestrator re-verifies visually against the running dev server after execution."

# Metrics
duration: 8min
completed: 2026-07-24
status: complete
---

# Phase 02 Plan 08: Responsive hero palm sizing (gap closure) Summary

**Hero palm silhouettes now scale down via Tailwind base/sm:/md: breakpoints (600x360 -> 500x300 -> 380x228) instead of using one fixed 600x360 footprint, closing UAT gap G-02-3 where fronds overlapped the hero copy at 360px while leaving desktop framing byte-identical.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-24T14:10:00Z
- **Completed:** 2026-07-24T14:18:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Replaced the single fixed `h-[600px] w-[360px]` / `left|right-[-82px]` / `bottom-[-130px]` palm footprint with responsive Tailwind classes: base `h-[380px] w-[228px]` at `left|right-[-64px]`/`bottom-[-82px]`, `sm:` `h-[500px] w-[300px]` at `sm:left|right-[-72px]`/`sm:bottom-[-108px]`, and `md:` restoring the exact original `h-[600px] w-[360px]`/`md:left|right-[-82px]`/`md:bottom-[-130px]`
- Verified `pointer-events-none`, `absolute`, `z-[2]`, `scale-x-[-1]` (right side), the drop-shadow, and `viewBox="0 0 360 600"` are all byte-identical to before; no SVG `<path>` geometry, strokeWidth, or the two-sided asymmetry was touched
- Confirmed `npm run build` exits 0 and all 31 `vitest` tests still pass (regression guard — no test targets PalmSvg directly)

## Task Commits

Each task was committed atomically:

1. **Task 1: Make palm footprint responsive without regressing desktop** - `f316013` (fix)

**Plan metadata:** (this commit, following)

_Note: Single-task plan, no TDD split needed._

## Files Created/Modified
- `src/components/invite/PalmSvg.tsx` - Wrapper `<svg>` className and `positionClasses` now scale by breakpoint (base/sm:/md:) instead of a single fixed size/offset; md: values are byte-identical to the pre-fix originals

## Decisions Made
- Used the plan's suggested starting values (`h-[380px] w-[228px]` at `-64px` offset for base, `h-[500px] w-[300px]` at `-72px` for `sm:`) rather than deriving new numbers from scratch, since the plan explicitly frames these as a starting point to be visually tuned by the orchestrator's browser re-verification step, not a hard requirement
- Kept `bottom` scaled proportionally alongside height at each breakpoint (`-82px` / `-108px` / `-130px`) so the trunk continues to meet the horizon at every width, per the plan's guidance to adjust `bottom` "if needed"

## Deviations from Plan

None - plan executed exactly as written. Only `src/components/invite/PalmSvg.tsx` was modified; `Hero.tsx`, the SVG path geometry, `SeaWaves`, and `index.css` were left untouched as instructed.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

The automated regression gates (build, all 31 tests, `pointer-events-none` preservation, `md:` breakpoint restoration) all pass. The plan's human/browser verification step — confirming at 360px that neither palm's fronds cross the "Sol / 40 anos" lockup, tagline, or CTA, and that the CTA remains clickable, plus confirming 1440px framing is visually identical to before — is explicitly deferred to the orchestrator's re-verification against the running dev server, per the plan's `<verification>` section. No blockers for that follow-up check.

---
*Phase: 02-convite-p-blico*
*Completed: 2026-07-24*

## Self-Check: PASSED
- FOUND: src/components/invite/PalmSvg.tsx
- FOUND: f316013 (task commit)
