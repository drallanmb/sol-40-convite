---
phase: 04-carta-de-vinhos
plan: 03
subsystem: frontend
tags: [react, convex, catalog, accessibility, whatsapp, responsive]

requires:
  - phase: 04-carta-de-vinhos
    plan: 01
    provides: Canonical 37-wine public DTO and reactive catalog query
  - phase: 04-carta-de-vinhos
    plan: 02
    provides: Exact WhatsApp URL and safe deep-link helpers
provides:
  - Public `/presentes` route with compact cellar introduction and price-band shortcuts
  - Responsive three-band wine catalog with complete loading, error, empty, partial, available, and gifted states
  - Resilient licensed-asset media stage with development and runtime failure fallbacks
  - Safe asynchronous wine deep links with focus, selection label, and reduced-motion behavior
affects: [04-04, 04-05, phase-06-admin, phase-07-launch]

tech-stack:
  added: []
  patterns:
    - Convex query errors isolated behind a route-local React error boundary
    - Gift state changes preserve catalog order and remove unavailable actions from the DOM
    - Static asset manifest is checked once and shared by all bottle media instances

key-files:
  created:
    - src/content/gifts.ts
    - src/components/gifts/WineImage.tsx
    - src/components/gifts/WineCard.tsx
    - src/components/gifts/WineCatalog.tsx
    - src/routes/Presentes.tsx
  modified:
    - src/App.tsx
    - src/index.css

key-decisions:
  - "The catalog query is enclosed by a route-local error boundary so a Convex failure replaces only catalog data while the intro, shortcuts, Shell, and URL fragment survive."
  - "The first three catalog records are eager candidates; every later bottle is lazy, while the manifest keeps pending assets visibly development-only."
  - "Deep-link resolution reruns on initial asynchronous readiness and browser history events, not on every reactive status update, so gift-state changes do not recenter the page."

patterns-established:
  - "Catalog ordering: filter each approved band from server order without any client sort or status regrouping."
  - "Gifted interaction: keep the article and commercial content, remove the external anchor, then return focus to the article with a polite status announcement."

requirements-completed: [GIFT-03, GIFT-04]

coverage:
  - id: D1
    description: "Dedicated cellar-styled gifts route with compact introduction, exact copy, shortcuts, and shared Shell"
    requirement: GIFT-03
    verification:
      - kind: other
        ref: "npm run build"
        status: pass
      - kind: manual_procedural
        ref: "Browser inspection at 320, 375, 768, and 1280 pixels"
        status: pass
    human_judgment: false
  - id: D2
    description: "Available and gifted wine cards with safe Vanessa handoff and resilient bottle media"
    requirement: GIFT-04
    verification:
      - kind: unit
        ref: "src/lib/wineWhatsApp.test.ts and src/lib/wineDeepLink.test.ts"
        status: pass
      - kind: other
        ref: "npm test && npm run build"
        status: pass
    human_judgment: true
    rationale: "Final populated visual comparison still requires the licensed images and reconciled live catalog gated by plan 04-05."
  - id: D3
    description: "Reactive three-band catalog states and safe asynchronous deep-link focus"
    requirement: GIFT-03
    verification:
      - kind: other
        ref: "npm test && npm run build && git diff --check"
        status: pass
      - kind: manual_procedural
        ref: "Local error/retry, hostile hash, responsive overflow, and shortcut inspection"
        status: pass
    human_judgment: true
    rationale: "Populated 37-record, live gifted transition, and direct valid-fragment behavior require the reconciled backend smoke run in plan 04-05."

duration: 6min
completed: 2026-07-25
status: complete
---

# Phase 4 Plan 3: Public Wine Gifts Catalog Summary

**Responsive cellar catalog with safe Vanessa handoff, stable gifted states, resilient bottle media, and accessible asynchronous deep links**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-25T01:03:36Z
- **Completed:** 2026-07-25T01:09:05Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Added `/presentes` inside the shared Shell with the exact compact introduction, operational note, three accessible price-band shortcuts, and named cellar/halo tokens.
- Built square editorial wine cards whose available state exposes exactly one safe WhatsApp anchor and whose gifted state keeps all commercial content while removing the action.
- Completed the reactive catalog with three stable bands, responsive grids, full data states, hostile-safe fragments, focus transfer, selection labeling, and reduced-motion behavior.

## Task Commits

Each task was committed atomically:

1. **Task 1: Centralizar conteúdo/tokens e registrar a rota compacta** - `6c6e7e1`
2. **Task 2: Implementar mídia e card available/gifted** - `8ae503c`
3. **Task 3: Completar catálogo, estados e deep link assíncrono** - `31196e6`

## Files Created/Modified

- `src/App.tsx` - Registers the public `/presentes` route before the wildcard.
- `src/content/gifts.ts` - Centralizes literal copy, band metadata, and gifts-route navigation.
- `src/components/gifts/WineImage.tsx` - Provides intrinsic bottle media, tone halo, pending marker, and failure fallback.
- `src/components/gifts/WineCard.tsx` - Renders available/gifted article states and the exact external handoff.
- `src/components/gifts/WineCatalog.tsx` - Renders three ordered bands and loading/error/empty/partial states.
- `src/routes/Presentes.tsx` - Connects the reactive query, error retry, route scaffold, and deep-link focus.
- `src/index.css` - Adds cellar tokens, scroll geometry, overflow handling, selected state, and reduced-motion rules.

## Decisions Made

- A route-local error boundary owns retry because Convex query errors are thrown during render; this keeps the header, intro, shortcuts, footer, and fragment intact.
- Runtime display validation filters malformed commercial records without inventing fields and exposes the non-blocking partial notice when valid rows remain.
- Deep-link setup depends on the boolean transition to data readiness rather than the query array identity, preventing reactive gift-state updates from causing an unwanted second scroll.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The connected development backend has not yet run canonical wine reconciliation, so local browser inspection correctly reached the inline query-error state instead of the populated 37-card state. The full backend test suite proves the 37-record contract; live seeding, populated smoke, gifted transition, restoration, and final visual review remain in plan 04-05.

## User Setup Required

None - licensed bottle assets and live reconciliation are already explicit gates in plan 04-05.

## Next Phase Readiness

- Plan 04-04 can reuse the centralized gifts copy and the same reactive public DTO for the home preview and RSVP callout.
- Plan 04-05 must reconcile the development catalog, add the licensed 37/37 assets, run the live status smoke, and complete human visual approval.
- Concurrent Phase 5 files and dependencies remained intact; no memory component, event content, or Home route change was staged by this plan.

## Pre-Flight

- Design read: gifts page for invited guests, warm editorial cellar language, existing Tailwind/CSS system.
- Dials applied: `DESIGN_VARIANCE 6`, `MOTION_INTENSITY 3`, `VISUAL_DENSITY 5`.
- One dark cellar theme, one peach accent, square card system with pill shortcuts, AA CTA/focus treatment, and explicit reduced-motion rules.
- UI-SPEC-required band eyebrows and exact em-dash copy were retained where they override the general frontend skill.
- Real image acceptance remains fail-closed: pending manifest entries show only the development marker and no unlicensed placeholder is treated as final.

## Self-Check: PASSED

- All seven planned implementation files exist.
- Three atomic task commits are present.
- Full suite: 337/337 tests passing.
- Production build and `git diff --check`: passing.
- Browser checks: 320/375/768/1280 with no horizontal page overflow; mobile shortcut track scrolls and exposes the next chip edge.
- Error retry preserves the current URL fragment; malformed fragments remain a silent no-op.
- ASVS L1 review: no high-severity finding; no public writer, reservation handler, unsafe selector, buyer identity, or reverse-tabnabbing path was introduced.

---
*Phase: 04-carta-de-vinhos*
*Completed: 2026-07-25*
