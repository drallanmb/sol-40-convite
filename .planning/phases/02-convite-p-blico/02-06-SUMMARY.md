---
phase: 02-convite-p-blico
plan: 06
subsystem: ui
tags: [react, tailwind, invite, maps-embed, click-to-load]

# Dependency graph
requires:
  - phase: 02-convite-p-blico
    provides: "src/content/event.ts (plan 02-01) — VENUE, GUIDE, HOTELS, SECTION_IDS and all copy this plan renders"
provides:
  - "LocalSection component — venue card + click-to-load Google Maps embed"
  - "GuideSection component — four-card city guide grid + three-hotel list"
affects: [02-07, home-route-composition]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Click-to-load third-party iframe: height reserved on the outer container unconditionally, iframe only exists inside the revealed branch of a useState boolean conditional (no preload/prefetch of the third-party origin)"
    - "Count-indifferent grid border: full border per card (border border-line) instead of :last-child/nth-child tricks, so the guide grid stays deliberate at 3 or 4 items"

key-files:
  created:
    - src/components/invite/LocalSection.tsx
    - src/components/invite/GuideSection.tsx
  modified: []

key-decisions:
  - "[Phase 2-06]: Guide card border strategy uses a full border on every card (border border-line) rather than divide-x/nth-child tricks — simplest strategy that is genuinely indifferent to item count and needed no per-breakpoint math"
  - "[Phase 2-06]: Guide grid uses grid-cols-1 / sm:grid-cols-2 / lg:grid-cols-4 (never grid-cols-3) so 4 cards always fill complete rows at every breakpoint where they're visible"
  - "[Phase 2-06]: Venue card overlay uses solid bg-plum (not a semi-transparent tint) so it stays readable once the map iframe paints behind it"

patterns-established: []

requirements-completed: [INVITE-03]

coverage:
  - id: D1
    description: "LocalSection renders the venue card (corrected Matapuã spelling, always-visible route link) unconditionally, with the Google Maps iframe mounting only after an explicit tap on the reveal button — zero third-party requests before that tap"
    requirement: "INVITE-03"
    verification:
      - kind: unit
        ref: "npm run build (typecheck) — pass"
        status: pass
      - kind: other
        ref: "grep-based acceptance criteria (iframe count=1, referrerPolicy, loading=lazy, VENUE.mapEmbedSrc source, zero literal google.com, h-[540px]/h-[610px] reserved heights, target=_blank/rel=noreferrer paired, zero preload/prefetch/preconnect hints, single button with min-h-[44px], SECTION_IDS.local)"
        status: pass
      - kind: manual_procedural
        ref: "Network-tab zero-third-party-request check before tap, Slow 3G CLS check on reveal, offline/tracking-blocker route-link fallback check — end-of-phase human_verify_mode"
        status: unknown
    human_judgment: true
    rationale: "The no-CLS-on-reveal and zero-third-party-request-before-tap truths are UI-SPEC-flagged backstops (E6) that require a real browser DevTools session (Slow 3G throttle, Network tab, prefers-reduced-motion/offline emulation) — not reproducible by a Node-environment unit test."
  - id: D2
    description: "GuideSection renders four guide cards and the three-hotel list from src/content/event.ts, every external anchor pairs target=_blank with rel=noreferrer, and the grid never uses a 3-column layout so the fourth card never strands alone"
    requirement: "INVITE-03"
    verification:
      - kind: unit
        ref: "npm run build (typecheck) + npx vitest run — pass, 31 tests"
        status: pass
      - kind: other
        ref: "grep-based acceptance criteria (zero literal https:// or tripadvisor strings, target=_blank/rel=noreferrer counts equal and >=2, zero last-child/last: text, zero grid-cols-3, break-words present, zero font-medium/semibold/extrabold/black, min-h-[44px] present)"
        status: pass
      - kind: other
        ref: "curl liveness check on the 3 hotel URLs (aruanahotel.com.br 200, letsatlantica.com.br 308, celihotel.com.br 200)"
        status: pass
      - kind: manual_procedural
        ref: "Browser walk of all 4 Tripadvisor links (curl returns 403 for that host, per RESEARCH Pitfall 8) and the guide grid at 1440/768/360px in 3- and 4-card configurations — end-of-phase human_verify_mode"
        status: unknown
    human_judgment: true
    rationale: "Tripadvisor rejects automated HTTP clients (403) even for live pages, so those 4 links must be walked in a real browser per RESEARCH Pitfall 8. The 3-vs-4-card grid deliberateness and 360px long-name wrapping are also UI-SPEC-flagged backstops (E7) requiring visual judgment."

# Metrics
duration: 15min
completed: 2026-07-24
status: complete
---

# Phase 2 Plan 06: Local/Aracaju — Venue Map and City Guide Summary

**Click-to-load venue map card with corrected Matapuã spelling, plus a four-card Aracaju guide and three-hotel list rendered from `src/content/event.ts`**

## Performance

- **Duration:** 15 min
- **Started:** 2026-07-24T12:18:18Z
- **Completed:** 2026-07-24T12:31:15Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `LocalSection.tsx` — venue card (kicker, name, corrected two-line address, always-visible "Abrir rota ↗" link) rendered independent of a click-to-load Google Maps iframe; the map container reserves its final height (540px mobile / 610px desktop) unconditionally so revealing the map never shifts the page, and the iframe exists only in the revealed branch — no preload, prefetch or preconnect hint to the Maps origin exists anywhere in the file
- `GuideSection.tsx` — four guide cards (Museu da Gente Sergipana, Passarela do Caranguejo, Orla de Atalaia, Croa do Goré) and the three-hotel list, each a single anchor carrying `target="_blank" rel="noreferrer"`, with a per-card full border replacing the old item-count-fragile last-item border rule and a grid that never renders 3 columns
- Every external URL in both files comes from `src/content/event.ts` — no `https://` or `tripadvisor` literal appears in either component
- Hotel names render at `font-serif` regular weight with accent colour, not a third font weight, keeping the page's 2-weight typography contract

## Task Commits

Each task was committed atomically:

1. **Task 1: LocalSection — venue card, always-visible route link, click-to-load map** - `35238fa` (feat)
2. **Task 2: GuideSection — four city cards and the three-hotel list** - `2b633e4` (feat)

**Plan metadata:** (this commit, docs)

## Files Created/Modified
- `src/components/invite/LocalSection.tsx` - Venue card overlay + reserved-height click-to-load Google Maps iframe container
- `src/components/invite/GuideSection.tsx` - Four-card guide grid + three-hotel list, both sourced from `src/content/event.ts`

## Decisions Made
- Guide grid border strategy: a full `border border-line` on every card (not `divide-x`/`nth-child`) — the simplest strategy genuinely indifferent to item count, avoiding any per-breakpoint column-math edge case.
- Guide grid columns: `grid-cols-1` → `sm:grid-cols-2` → `lg:grid-cols-4`, deliberately skipping 3 columns at every breakpoint so 4 cards always fill complete rows.
- Venue card overlay uses solid `bg-plum` (not a translucent tint) so the card stays legible once the map iframe paints behind it, per the plan's "solid or near-solid background" requirement.

## Deviations from Plan

None — plan executed exactly as written. One in-flight correction during self-verification: the first draft of `GuideSection.tsx`'s file-header comment used the literal string `:last-child` while *describing* why that old CSS rule was avoided, which tripped the plan's own acceptance grep (`grep -c 'last-child\|last:'` must return `0`). Reworded the comment to describe the same fact ("regra antiga baseada no item final do DOM") without using the literal substring, re-ran the grep, and it passed. This is a same-task correction during initial authoring, not a deviation from the plan's intent — no separate deviation rule applies.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None — both sections render live content from `src/content/event.ts`, and the map/route link/guide/hotel data have no empty state possible (fixed-length literals, no fetch, no user input).

## Threat Flags
None — the STRIDE threats already registered in `02-06-PLAN.md`'s `<threat_model>` (reverse tabnabbing, Maps referrer/cookie disclosure, typo-squatted URL) fully cover the surface introduced by this plan; no new trust boundary was opened.

## Next Phase Readiness
- `LocalSection` and `GuideSection` are ready to compose into the invite page route alongside the other `src/components/invite/*` sections (Hero, Countdown, ProgramaSection, DressCodeSection) — that composition (`src/routes/Home.tsx` replacement, per D-05 section order) is a separate plan's responsibility and was not touched here.
- Outstanding before phase gate: the end-of-phase browser walk (all 4 Tripadvisor links + 3 hotel links, 3-vs-4-card grid at 1440/768/360px, Slow 3G no-CLS check on the map reveal, zero-third-party-request-before-tap check, offline/tracking-blocker route-link fallback) — all flagged `🧪 backstop` in `02-UI-SPEC.md` and routed to `human_verify_mode: end-of-phase` per this project's config, not blocking this plan's completion.

---
*Phase: 02-convite-p-blico*
*Completed: 2026-07-24*
