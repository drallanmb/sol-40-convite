---
phase: 02-convite-p-blico
plan: 04
subsystem: ui
tags: [react, tailwind, countdown, useCountdown, pt-br-pluralization]

# Dependency graph
requires:
  - phase: 02-convite-p-blico plan 01
    provides: useCountdown hook, getEventState/pluralizeUnit pure functions, COUNTDOWN_COPY content
provides:
  - Countdown.tsx — the four-state full-tile countdown section (dark plum, bottom-aligned copy+tiles layout)
  - CountdownRail.tsx — the compact single-line topbar rail, a controlled component driven by a `revealed` prop
affects: [02-convite-p-blico plan 07 (Shell.tsx mounts CountdownRail and owns the scroll listener)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Switch-on-literal-phase helper component (CountdownHeading) instead of indexing COUNTDOWN_COPY[phase] once — lets TypeScript resolve each COUNTDOWN_COPY.<phase> access to its exact per-phase shape without a union-narrowing gap"
    - "Tailwind duration-(--duration-fast) sets one uniform transition-duration for a whole transition-[...] property list (matches the existing Button.tsx convention); the one CountdownRail nuance that genuinely needs a per-property value (transition-delay, so visibility flips only after the fade completes) is set inline rather than invented as a fictitious Tailwind utility"

key-files:
  created:
    - src/components/invite/Countdown.tsx
    - src/components/invite/CountdownRail.tsx
  modified: []

key-decisions:
  - "Countdown.tsx branches its heading on a switch(phase) helper component rather than a single COUNTDOWN_COPY[phase] variable, because TypeScript cannot narrow a separately-held `copy` variable's union type just because a sibling `phase` variable was checked in an if — the switch keeps every phase-specific field access (headingLead/headingEm on antes, sub on agora) statically type-safe"
  - "min-w-[4ch] (sized for the no-ceiling post-party day count) is applied only to the day tile, not all four tiles — hours/minutes/seconds are naturally bounded to 2 digits and the plan scoped the fix to the day slot specifically"
  - "CountdownRail's reveal transition ports the old .countdown-rail recipe (opacity+transform at duration-(--duration-fast), visibility delayed by duration-(--duration-medium) when hiding, 0 delay when revealing) using Tailwind's transition-[opacity,transform,visibility] + duration-(--duration-fast) for the uniform pieces and one inline transitionDelay for the property that must differ per-property — Tailwind's duration-* utility has no per-property variant"

patterns-established:
  - "Both countdown renderers read useCountdown() directly (no props threading the state down) so any future component consuming the same phase never needs a second subscription path"

requirements-completed: [INVITE-01]

coverage:
  - id: D1
    description: "Countdown.tsx renders the correct one of four states (antes/hoje/agora/depois) with per-state copy from COUNTDOWN_COPY, tiles only in the two counting states, shared pluralizeUnit for every unit label, tabular-nums + min-w-[4ch] on the day tile, no zero-padding"
    requirement: "INVITE-01"
    verification:
      - kind: unit
        ref: "npx vitest run (existing src/lib/countdown.test.ts + src/content/event.test.ts, 31 tests) — pass"
        status: pass
      - kind: other
        ref: "grep contract in 02-04-PLAN.md Task 1 acceptance_criteria (useCountdown>=2, pluralizeUnit>=2, COUNTDOWN_COPY>=2, no hardcoded unit words, tabular-nums>=1, min-w->=1, no padStart, depois>=1) — all pass"
        status: pass
    human_judgment: true
    rationale: "Three backstop truths (four-digit day overflow at days:9999, singular/plural agreement across a live render, and the locked post-party headline wrapping at 360px) require walking a manipulated system clock and a real viewport — not reachable from a node-environment unit test. Deferred to the phase's end-of-phase human check per the plan's Probe Assumptions note."
  - id: D2
    description: "CountdownRail.tsx renders the same four states in one line, driven by a revealed prop (no scroll listener of its own), shared pluralizeUnit, tabular-nums + min-w-[4ch] day slot, parenthesis token syntax for duration/z-index, aria-hidden"
    requirement: "INVITE-01"
    verification:
      - kind: unit
        ref: "npx vitest run (existing src/lib/countdown.test.ts + src/content/event.test.ts, 31 tests) — pass"
        status: pass
      - kind: other
        ref: "grep contract in 02-04-PLAN.md Task 2 acceptance_criteria (0 addEventListener, 0 scrollY, pluralizeUnit>=2, no hardcoded unit words, duration-(--duration- >=1, z-(--z-sticky)>=1, 0 bare duration-fast/medium utilities, tabular-nums>=1, aria-hidden>=1) — all pass"
        status: pass
    human_judgment: true
    rationale: "CountdownRail is not yet mounted anywhere (Shell.tsx wires it up in plan 02-07) — its 360px topbar-fit and no-wrap behavior with a live rail can only be verified once mounted, per this plan's own human-check note deferring to 'After plan 02-07 mounts the rail'."

duration: 15min
completed: 2026-07-24
status: complete
---

# Phase 02 Plan 04: Countdown — full section + compact rail Summary

**Two renderers (`Countdown.tsx` full section, `CountdownRail.tsx` compact topbar rail) that both read one `useCountdown()` state machine and share `pluralizeUnit` for every pt-BR unit label, so they can never disagree about the current phase or pluralize inconsistently.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-07-24T09:07:00-03:00 (approx, first Read after 02-03 completion)
- **Completed:** 2026-07-24T09:09:39-03:00
- **Tasks:** 2
- **Files modified:** 2 (both new)

## Accomplishments
- `Countdown.tsx` — dark full-bleed plum section, kicker + heading branching on phase (switch-on-literal helper for type-safe per-phase field access), four tiles rendered only when `showTiles` is true, day tile sized for the no-ceiling post-party count
- `CountdownRail.tsx` — controlled compact rail (`revealed` prop, no own scroll listener), same phase branching, reveal transition ported from the old `.countdown-rail` recipe with a delayed-visibility flip so it never snaps mid-fade
- Neither component hardcodes a pt-BR unit word or a copy of the singular/plural rule — both call `pluralizeUnit` from `src/lib/countdown.ts`
- Owner-dictated post-party headline (`JÁ QUE VOCÊ NÃO FOI, PERDEU!`) ships verbatim with no added remark (P-02)

## Task Commits

Each task was committed atomically:

1. **Task 1: Countdown — the four-state full-tile section** - `fb0872f` (feat)
2. **Task 2: CountdownRail — the compact single-line topbar variant** - `4a93c2f` (feat)

_Note: no TDD tasks in this plan — both are `type="auto"` with grep-contract verification._

## Files Created/Modified
- `src/components/invite/Countdown.tsx` - Four-state full-tile countdown section, consumes `useCountdown`, `pluralizeUnit`, `COUNTDOWN_COPY`
- `src/components/invite/CountdownRail.tsx` - Compact single-line rail, controlled by a `revealed` prop, same shared state/pluralization

## Decisions Made
- Used a `switch (phase)` helper component (`CountdownHeading`) instead of indexing `COUNTDOWN_COPY[phase]` once, because TypeScript cannot correlate a narrowed `phase` check with a separately-declared `copy` variable's union type — each `case` branch accesses `COUNTDOWN_COPY.<literal-phase>` directly, which TypeScript resolves to its exact per-phase shape (only `antes` has `headingLead`/`headingEm`, only `agora` has `sub`)
- Applied `min-w-[4ch]` to the day tile only (not all four tiles) — hours/minutes/seconds are bounded to 2 digits by construction; only the day count grows without ceiling post-party
- `CountdownRail`'s reveal transition uses Tailwind's `transition-[opacity,transform,visibility] duration-(--duration-fast)` for the uniform property list + duration (matching the existing `Button.tsx` convention of one duration for a multi-property list), and one inline `transitionDelay` (the only piece that genuinely differs per-property — visibility must flip to hidden only after the fade completes) rather than inventing a non-existent per-property Tailwind duration utility

## Deviations from Plan

None - plan executed exactly as written. Both tasks' automated `<verify>` commands (build, vitest, and every grep in the acceptance criteria) pass. One self-caught issue during Task 2 authoring: a doc comment used the literal word `scrollY` (in prose, not code) which tripped the task's own `grep -c 'scrollY'` acceptance check; fixed by rewording the comment before committing — not a deviation from the plan's intent, just an artifact of the grep contract matching comments as well as code.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `Countdown.tsx` is ready to compose into `Home.tsx`'s section order (plan 02-07 or the route-assembly plan).
- `CountdownRail.tsx` exports a controlled component (`revealed: boolean`) — plan 02-07's `Shell.tsx` extension must own the single scroll listener, compute the `headerCondensed`-equivalent boolean, and pass it down; no further contract negotiation needed on this component's side.
- Backstop truths (four-digit day overflow, singular/plural live-render agreement, 360px headline wrap, and CountdownRail's in-topbar fit once mounted) remain open for the phase's end-of-phase human verification pass, as flagged in the plan's own Probe Assumptions and human-check notes.

---
*Phase: 02-convite-p-blico*
*Completed: 2026-07-24*

## Self-Check: PASSED

- FOUND: src/components/invite/Countdown.tsx
- FOUND: src/components/invite/CountdownRail.tsx
- FOUND commit: fb0872f
- FOUND commit: 4a93c2f
