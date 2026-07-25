---
phase: 04-carta-de-vinhos
plan: 04
subsystem: frontend
tags: [react, convex, rsvp, navigation, accessibility, responsive]

requires:
  - phase: 04-carta-de-vinhos
    plan: 01
    provides: Fixed reactive featured-wine query and public DTO
  - phase: 04-carta-de-vinhos
    plan: 02
    provides: Safe wine fragment and BRL formatting helpers
  - phase: 04-carta-de-vinhos
    plan: 03
    provides: Dedicated gifts route, bottle media, and cellar visual contract
  - phase: 05-mural-de-memorias
    plan: 04
    provides: Memories navigation and home album composition
provides:
  - Combined home and RSVP navigation with canonical Presentes destinations
  - Reactive three-wine cellar preview with loading, error, gifted, and deep-link states
  - Persistent gifts callout gated exclusively by backend-confirmed RSVP save
affects: [04-05, phase-06-admin, phase-07-launch]

tech-stack:
  added: []
  patterns:
    - Route-local error boundary replaces only preview data while preserving section copy and complete-catalog CTA
    - Mounted-session success flag is written only by the saved mutation result
    - Shared cross-phase content files receive additive, regression-tested edits

key-files:
  created:
    - src/components/gifts/GiftPreview.tsx
  modified:
    - src/content/event.ts
    - src/content/event.test.ts
    - src/routes/Home.tsx
    - src/components/rsvp/FamilyForm.tsx

key-decisions:
  - "The preview consumes listFeatured directly and treats any non-three result as an inline data error instead of inventing or substituting wines."
  - "The RSVP gifts invitation uses mounted component state set only inside case saved, so edits and later failures cannot erase a confirmed success."
  - "Phase 5 Memórias navigation, carousel composition, and Home placement remain unchanged around the additive Phase 4 integration."

patterns-established:
  - "Preview semantics: each wine is one Link to its validated product-code fragment with no nested action."
  - "Success persistence: transient RSVP feedback and persistent post-save discovery state remain independent."

requirements-completed: [GIFT-03, GIFT-04]

coverage:
  - id: D1
    description: "Combined navigation and approved gifts copy preserve every live Phase 5 entry"
    requirement: GIFT-03
    verification:
      - kind: unit
        ref: "src/content/event.test.ts#event content - NAV_LINKS"
        status: pass
      - kind: other
        ref: "npx vitest run src/content/event.test.ts && npm run build"
        status: pass
    human_judgment: false
  - id: D2
    description: "Reactive home cellar preview keeps three fixed slots, safe product links, and resilient data states"
    requirement: GIFT-04
    verification:
      - kind: integration
        ref: "convex/wines.test.ts#fixed listFeatured order and reactive gift state"
        status: pass
      - kind: manual_procedural
        ref: "Browser loading/error inspection at 375, 768, and 1280 pixels"
        status: pass
      - kind: other
        ref: "npm test && npm run build && git diff --check"
        status: pass
    human_judgment: true
    rationale: "The connected development backend is not reconciled, so populated bottle identity and live gifted transitions remain part of Plan 04-05 smoke and final visual acceptance."
  - id: D3
    description: "RSVP gifts callout appears only after a confirmed save and persists for the mounted family session"
    requirement: GIFT-03
    verification:
      - kind: other
        ref: "Source audit: exactly one setHasSavedSuccessfully(true), located inside case saved"
        status: pass
      - kind: unit
        ref: "src/lib/rsvpDraft.test.ts and convex/rsvps.test.ts#saved outcome matrix"
        status: pass
      - kind: other
        ref: "npm test && npm run build"
        status: pass
    human_judgment: true
    rationale: "The browser matrix for partial, mixed, all-no, later failure, and remount requires a live reconciled RSVP fixture and remains in the final Phase 4 smoke."

duration: 5 min
completed: 2026-07-25
status: complete
---

# Phase 4 Plan 4: Public Gifts Discovery Summary

**Reactive cellar preview, combined gifts navigation, and a backend-confirmed post-RSVP invitation integrated without disturbing the Phase 5 memories experience**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-25T01:12:19Z
- **Completed:** 2026-07-25T01:17:05Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Added `Presentes` to the home and RSVP navigation while retaining the exact Memórias destination and all existing event copy.
- Inserted a full dark-cellar preview after Countdown with three fixed reactive slots, accessible product deep links, and resilient loading/error behavior.
- Added a persistent RSVP gifts invitation whose state changes only after `result.kind === "saved"` and survives edits or later transient failures.

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: define combined gifts content contract** - `129b042`
2. **Task 1 GREEN: add gifts navigation and callout content** - `40c1c6d`
3. **Task 2: add reactive gifts preview to home** - `0386da2`
4. **Task 3: show gifts callout after confirmed RSVP save** - `51fc05f`
5. **Pre-flight fix: honor reduced motion in preview controls** - `157dbea`

## Files Created/Modified

- `src/components/gifts/GiftPreview.tsx` - Owns the featured query, responsive cellar cards, skeletons, inline error handling, and complete-catalog CTA.
- `src/content/event.ts` - Centralizes Presentes navigation and the approved post-save callout.
- `src/content/event.test.ts` - Locks the combined Phase 4 and Phase 5 navigation/copy contract.
- `src/routes/Home.tsx` - Places GiftPreview after Countdown while retaining the MemoriesSection position after DressCodeSection.
- `src/components/rsvp/FamilyForm.tsx` - Tracks confirmed mounted-session success and renders the semantic route callout.

## Decisions Made

- Used a preview-local error boundary because Convex query errors throw during render; only the grid is replaced while heading and `Ver a carta completa` remain available.
- Kept featured identity and order in the backend `listFeatured` contract rather than duplicating product codes in the client.
- Kept the success flag independent from RSVP dirty state, attendance counts, toast lifetime, and transient feedback.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added complete reduced-motion handling to preview controls**
- **Found during:** Task 2 pre-flight
- **Issue:** Retry and complete-catalog CTAs still applied active scaling when reduced motion was requested.
- **Fix:** Added motion-reduce transform and transition overrides to preview links and controls.
- **Files modified:** `src/components/gifts/GiftPreview.tsx`
- **Verification:** Full test suite, production build, and diff check passed.
- **Committed in:** `157dbea`

---

**Total deviations:** 1 auto-fixed bug.
**Impact on plan:** The fix completes the approved accessibility contract without changing scope or dependencies.

## Issues Encountered

- The connected development backend has not reconciled the canonical wine rows, so browser inspection moved from the correct three-slot loading grid to the correct inline error panel. Populated identity and live status checks remain in Plan 04-05.
- Browser inspection at 375px exposed a pre-existing horizontal overflow in the Phase 2 Countdown tile row. GiftPreview itself had equal scroll/client widths at 375, 768, and 1280px. The unrelated finding is recorded in `deferred-items.md`.

## User Setup Required

None - no external service configuration or dependency was added.

## Next Phase Readiness

- Plan 04-05 can reconcile live wine data, verify the exact populated trio, exercise gifted transitions, and complete the licensed-image acceptance gate.
- The Phase 5 Memórias nav entry, `MemoriesSection`, approved album, form, and position after dress code remain intact.
- A dedicated regression fix should remove the pre-existing mobile Countdown overflow before final launch acceptance.

## Pre-Flight

- Design read: invitation experience for guests, warm editorial cellar language, existing Tailwind/CSS system.
- Dials applied: `DESIGN_VARIANCE 6`, `MOTION_INTENSITY 3`, `VISUAL_DENSITY 5`.
- The UI-SPEC overrides generic theme-lock guidance by intentionally opening one full dark-cellar block inside the light invitation.
- One peach accent, square cellar cards, AA text/focus treatment, natural text wrapping, semantic route links, real bottle media slots, and explicit reduced-motion fallbacks are preserved.
- Responsive browser evidence: one loading column at 375px, two equal columns with a normal-width third slot at 768px, and three equal columns at 1280px; the preview section itself had no horizontal overflow.
- No public writer, reservation, buyer identity, checkout, nested link, package, or new network surface was introduced.

## Self-Check: PASSED

- All five implementation files exist and the new preview file is tracked.
- Five Plan 04-04 implementation commits are present with no tracked-file deletions.
- Focused content and wine tests pass; full suite passes with 338/338 tests.
- Production build and `git diff --check` pass.
- Source audit confirms exactly one `setHasSavedSuccessfully(true)`, inside `case 'saved'`, with no reset write.
- Diff audit confirms every Phase 5 addition in shared event/Home files remains present.

---
*Phase: 04-carta-de-vinhos*
*Completed: 2026-07-25*
