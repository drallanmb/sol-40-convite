---
phase: 02-convite-p-blico
plan: 05
subsystem: ui
tags: [react, tailwind, content-module, static-content, image-optimization]

# Dependency graph
requires:
  - phase: 02-convite-p-blico
    provides: "src/content/event.ts (PROGRAMA/DRESS/SECTION_IDS content module, plan 02-01) and the compressed public/dress-code-*.jpg assets (plan 02-02)"
provides:
  - "ProgramaSection.tsx — the seven-block schedule, rendered as an ordered list from PROGRAMA"
  - "DressCodeSection.tsx — traje rules, grass callout and two-photo reference gallery, rendered from DRESS"
affects: [02-06, 02-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Mobile-first stacked-to-two-column list rows (grid-cols-1 sm:grid-cols-[fixed_1fr]) for time/detail and audience-label/text pairs"
    - "Per-image aspect-ratio reservation via inline style (not a static Tailwind class) when two images in the same map() have different real proportions"

key-files:
  created:
    - src/components/invite/ProgramaSection.tsx
    - src/components/invite/DressCodeSection.tsx
  modified: []

key-decisions:
  - "ProgramaSection renders both a visible caption-role kicker AND a separate aria-hidden decorative sun disc (day/month derived from PROGRAMA_KICKER.split(' ')) — the plan explicitly asked for both, not just one, even though they carry the same date information"
  - "DressCodeSection reserves each figure's real aspect ratio via inline style={{ aspectRatio: `${item.width} / ${item.height}` }} rather than a single static Tailwind aspect-[] class, because the two ported photos have different real proportions (1120x1400 vs 895x1400) that a static class can't express for both at once"

patterns-established:
  - "Section-level list rows use divide-y/divide-line (or divide-cream/25 on dark sections) instead of per-row Card chrome, matching the old site's quiet-list precedent for programa/traje"

requirements-completed: [INVITE-02]

coverage:
  - id: D1
    description: "ProgramaSection renders all seven confirmed schedule blocks (time, title, description) in document order from PROGRAMA, with the section id derived from SECTION_IDS.programa and no schedule value duplicated as a literal"
    requirement: "INVITE-02"
    verification:
      - kind: automated_ui
        ref: "npm run build && npx vitest run && grep checks (PROGRAMA count>=3, .map()>=1, no [0-9]{2}:[0-9]{2} literal, SECTION_IDS.programa==1, no id=\"programacao\", no 'provis', <time>=1, scroll-mt>=1) — all passed, see task verification output"
        status: pass
    human_judgment: true
    rationale: "Automated grep/build checks confirm structure and absence of duplicated literals, but visual verification (seven blocks at 360px/1440px, time column alignment, emoji title wrapping, hero-CTA scroll landing below the sticky topbar) requires a human per the plan's <human-check>."
  - id: D2
    description: "DressCodeSection renders the intro, both audience rule blocks (Homens/Mulheres), the grass callout and a two-photo gallery from DRESS, with every image carrying loading=\"lazy\", decoding=\"async\", explicit width/height and a per-figure aspect-ratio reservation matching the real files"
    requirement: "INVITE-02"
    verification:
      - kind: automated_ui
        ref: "npm run build && npx vitest run && grep checks (DRESS count>=4, SECTION_IDS.traje==1, single <img> inside map with loading=\"lazy\"/decoding=\"async\"/width={}/height={}/alt={}, aspect-[ or aspect-ratio present, src={} not src=\"/, no font-medium/semibold/extrabold/black) — all passed; sips -g pixelWidth -g pixelHeight confirmed public/dress-code-men.jpg=1120x1400 and public/dress-code-women.jpg=895x1400 match src/content/event.ts literals exactly"
        status: pass
    human_judgment: true
    rationale: "Automated checks confirm dimensions, attributes and structure, but the no-CLS behavior under Slow 3G throttling, 360px stacking, callout legibility against the coral background, and the alt-text fallback with images blocked all require human visual verification per the plan's <human-check>."

duration: 12min
completed: 2026-07-24
status: complete
---

# Phase 2 Plan 05: Programa and Dress Code Sections Summary

**ProgramaSection and DressCodeSection built as pure content-module renders — seven schedule blocks and the traje rules/callout/gallery, with per-image aspect-ratio reservation matching the real ported file dimensions**

## Performance

- **Duration:** ~12 min
- **Completed:** 2026-07-24
- **Tasks:** 2
- **Files modified:** 2 (both new)

## Accomplishments
- `ProgramaSection.tsx` renders all seven confirmed programa blocks from `PROGRAMA`, with a locked kicker/heading pair and a decorative aria-hidden sun disc, mobile-first time/detail two-column list rows, and a `scroll-mt` offset so both the hero CTA and the topbar "Programação" link land the heading below the sticky chrome.
- `DressCodeSection.tsx` renders the intro, both audience rule blocks, the grass callout (coral background) and the two-photo gallery from `DRESS`, with every image carrying lazy loading, async decoding, explicit `width`/`height` and a per-figure `aspect-ratio` reservation computed from the real record dimensions.
- Confirmed via `sips` that the real pixel dimensions of `public/dress-code-men.jpg` (1120x1400) and `public/dress-code-women.jpg` (895x1400) match the `width`/`height` literals already in `src/content/event.ts` exactly — no correction needed.
- Both sections read every string from `src/content/event.ts`; no schedule time, title, description, or dress-code copy string is duplicated as a literal in either component.

## Task Commits

Each task was committed atomically:

1. **Task 1: ProgramaSection — the seven-block schedule** - `1d3d7ec` (feat)
2. **Task 2: DressCodeSection — rules, grass callout and the two-photo gallery** - `0335c51` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified
- `src/components/invite/ProgramaSection.tsx` - Seven-block schedule list, mapped from `PROGRAMA`, id from `SECTION_IDS.programa`
- `src/components/invite/DressCodeSection.tsx` - Traje rules, grass callout and two-photo gallery, mapped from `DRESS`, id from `SECTION_IDS.traje`

## Decisions Made
- Rendered both a visible label-role kicker and a separate `aria-hidden` decorative sun disc in `ProgramaSection` (day/month derived from `PROGRAMA_KICKER.split(' ')`, not a second hardcoded literal) — the plan's action text explicitly asked for both elements even though they repeat the same date.
- Used a per-image inline `style={{ aspectRatio: ... }}` in `DressCodeSection`'s gallery instead of a single static Tailwind `aspect-[]` class, since Tailwind's JIT can't statically extract a class built from a template literal, and the two real photos have different proportions (0.8 vs ~0.64) that one static class couldn't express correctly for both.

## Deviations from Plan

None — plan executed exactly as written. No auto-fixes were required; the acceptance-criteria grep suite initially caught two accidental matches from a docstring comment (the JSDoc header on `DressCodeSection.tsx` originally contained the literal strings `loading="lazy"` and `decoding="async"` while explaining the component, which inflated their grep counts from 1 to 2). This was corrected in place before committing by rephrasing the comment in prose (Portuguese) instead of quoting the exact attribute syntax — not logged as a deviation since it was caught and fixed before any commit, purely a self-check pass during the same task, not unplanned scope.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Both content sections are ready to be composed into `src/routes/Home.tsx` alongside the hero/countdown/local/guide sections in a later plan of this phase.
- No blockers. The remaining plans in Phase 2 (local/map, guide/hotels, topbar+skip-link+home composition) are unaffected by this plan's scope.

---
*Phase: 02-convite-p-blico*
*Completed: 2026-07-24*

## Self-Check: PASSED

- FOUND: src/components/invite/ProgramaSection.tsx
- FOUND: src/components/invite/DressCodeSection.tsx
- FOUND: .planning/phases/02-convite-p-blico/02-05-SUMMARY.md
- FOUND: commit 1d3d7ec
- FOUND: commit 0335c51
- FOUND: commit 77b5790
