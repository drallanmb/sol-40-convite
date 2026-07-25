---
phase: 06-dashboard-interno-admin
plan: 04
subsystem: admin-operations
tags: [convex, react, optimistic-concurrency, moderation, wine-gifts, accessibility]

requires:
  - phase: 06-dashboard-interno-admin
    provides: Protected owner session, responsive admin shell, overview and grouped RSVP administration from Plans 01-03
  - phase: 05-mural-de-memorias
    provides: Pending/approved/hidden memories, protected storage and approved-only public projection
  - phase: 04-carta-de-vinhos
    provides: Canonical 37-wine catalog, reactive public status and existing updatedAt revision
provides:
  - Protected chronological moderation tabs with a closed revisioned transition graph
  - Eight-second conditional moderation undo that cannot overwrite newer owner changes
  - Atomic gift attribution and confirmed unmark through one shared monotonic wine writer
  - Responsive moderation and gift screens with URL tabs, search, bands, dialogs and conflict recovery
affects: [phase-07-launch, admin-operations, public-album, public-wine-catalog]

tech-stack:
  added: []
  patterns:
    - Expected status plus monotonic per-record revision guards every owner transition
    - Public and protected projections derive reactively from the same committed row while remaining intentionally disjoint
    - Disposable real-backend smoke restores or deletes every touched fixture in finally

key-files:
  created:
    - convex/adminPosts.ts
    - convex/adminWines.ts
    - convex/wineOperations.ts
    - src/lib/adminOperations.ts
    - src/lib/adminOperations.test.ts
    - src/components/admin/AdminModeration.tsx
    - src/components/admin/AdminGifts.tsx
  modified:
    - convex/schema.ts
    - convex/wineModel.ts
    - convex/wineInternal.ts
    - convex/adminTest.ts
    - convex/admin.test.ts
    - convex/wines.test.ts
    - convex/_generated/api.d.ts
    - src/components/admin/AdminShell.tsx
    - src/content/admin.ts
    - src/content/admin.test.ts
    - src/lib/adminSearch.ts
    - src/lib/adminSearch.test.ts

key-decisions:
  - "Legacy posts read as moderation revision zero; every owner action, including undo, advances the stored revision."
  - "Undo is the exact inverse of one legal action and must match both the status and revision produced by that action."
  - "wines.updatedAt remains the only gift revision; admin, catalog reconciliation and smoke writers all use max(now,current+1)."
  - "The public album and wine catalog remain narrow projections and never receive pending/hidden memory data or giver attribution."

patterns-established:
  - "Moderation transition: authorize -> compare status/revision -> validate closed graph -> atomically patch status/timestamps/revision."
  - "Wine transition: validate complete current state -> compare status/updatedAt -> atomically write the complete target state."
  - "Reactive conflict UX: retain the user's dialog draft, disable submission and require review of the newer server state."

requirements-completed: [ADMIN-05, ADMIN-06]

coverage:
  - id: D1
    description: "Protected chronological moderation with legal transitions, approved-only public reactivity and revision-safe undo."
    requirement: ADMIN-05
    verification:
      - kind: integration
        ref: "convex/admin.test.ts#admin post moderation, revision conflict and public album"
        status: pass
      - kind: unit
        ref: "src/lib/adminOperations.test.ts#admin moderation operations"
        status: pass
      - kind: manual_procedural
        ref: "Browser smoke: pending approve moved badges/tabs/public source and eight-second undo restored the pending row"
        status: pass
    human_judgment: false
  - id: D2
    description: "Atomic gift marking/unmarking with required presenter, server time, shared monotonic revision and narrow public catalog."
    requirement: ADMIN-06
    verification:
      - kind: integration
        ref: "convex/admin.test.ts#admin wine gift authorization, atomic revisions and public catalog"
        status: pass
      - kind: integration
        ref: "npx convex run adminTest:smokeModerationAndGift '{}'"
        status: pass
      - kind: integration
        ref: "convex/wines.test.ts#wine reconciliation and smoke seam"
        status: pass
    human_judgment: false
  - id: D3
    description: "Operational moderation and gift screens with URL tabs, search, bands, dialogs, media retry, empty/error states and two-owner conflict review."
    requirement: ADMIN-06
    verification:
      - kind: manual_procedural
        ref: "Two authenticated browser tabs: open gift draft entered review after a second tab changed the same wine; fixture restored afterward"
        status: pass
      - kind: other
        ref: "npm test && npm run build"
        status: pass
    human_judgment: false
  - id: D4
    description: "Visual resilience for 320px/200%, very long names, mobile virtual keyboards, semantic contrast and safe areas."
    requirement: ADMIN-06
    verification: []
    human_judgment: true
    rationale: "Device viewport, browser zoom, virtual keyboard and final visual contrast remain explicit end-of-phase human UAT backstops."

duration: 8min
completed: 2026-07-25
status: complete
---

# Phase 6 Plan 4: Moderation and Gift Operations Summary

**Revision-safe owner moderation and atomic wine gifting with protected reactive screens, bounded undo and narrow public projections**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-25T04:31:49Z
- **Completed:** 2026-07-25T04:40:04Z
- **Tasks:** 3
- **Files modified:** 19

## Accomplishments

- Added protected Pendentes/Aprovadas/Ocultas moderation with oldest-first pending order, exact legal transitions, monotonic revisions and an eight-second conditional undo that rejects stale and ABA changes.
- Routed every wine writer through one atomic transition/revision seam, requiring trimmed giver attribution, recording server time and clearing both attribution fields together only at the expected revision.
- Replaced the final admin placeholders with accessible reactive moderation and gift screens, and verified approve/undo, mark/unmark, public privacy and open-dialog concurrency against the real Convex deployment.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement revisioned protected moderation and conditional undo** - `5f8feec` (feat)
2. **Task 2: Implement atomic protected gift marking and confirmed unmark** - `a3736e4` (feat)
3. **Task 3: Deliver moderation and gifts screens with live public verification** - `94cd066` (feat)

## Files Created/Modified

- `convex/adminPosts.ts` - Protected status lists, closed moderation transitions and conditional undo.
- `convex/adminWines.ts` - Protected catalog projection and atomic mark/unmark commands.
- `convex/wineOperations.ts` - Shared complete-state wine invariant and monotonic transition helper.
- `convex/wineInternal.ts` - Catalog reconciliation and smoke writers routed through shared revision rules.
- `convex/adminTest.ts` - Bounded moderation/gift deployment smoke with `finally` restoration.
- `convex/admin.test.ts` - Authorization, ordering, transition, conflict, public privacy and smoke integration coverage.
- `convex/wines.test.ts` - Equal/backward-clock reconciliation revision coverage.
- `src/lib/adminOperations.ts` - URL status, legal action, undo timer and gift dialog conflict reducers.
- `src/lib/adminSearch.ts` - Folded wine/code/presenter search and canonical non-empty band grouping.
- `src/components/admin/AdminModeration.tsx` - Full protected memory review queue with media retry and undo.
- `src/components/admin/AdminGifts.tsx` - Searchable banded gifts UI with focused mark/unmark dialogs.
- `src/components/admin/AdminShell.tsx` - Mounts both protected operational screens below the session gate.
- `src/content/admin.ts` - Canonical moderation URL values aligned to backend status literals.

## Decisions Made

- Kept a single `updatedAt` revision on wine rows instead of adding a second concurrency field.
- Stored no protected shadow list in the undo toast; it carries only the exact command needed for conditional rollback.
- Canonicalized moderation URL values to the same masculine literals used by Convex (`pendente`, `aprovado`, `oculto`) while keeping feminine Portuguese tab labels.
- Treated legacy memory rows without `moderationRevision` as revision zero for safe first transition.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Browser automation required submitting the native mark-gift form with Enter after filling the presenter; the same form then completed and all reactive checks passed. No application error or remaining defect was observed.

## Verification

- Focused moderation/gift/search/operation tests passed.
- Full suite passed: 24 files, 477 tests.
- Production TypeScript/Vite build passed.
- `npx convex dev --once` deployed the schema and functions successfully.
- `adminTest:smokeModerationAndGift` passed and left no smoke attribution/post rows.
- Real browser approve/undo restored the original pending row and badge counts.
- Real browser mark/unmark restored the original available wine and public `/presentes` contained no giver name.
- Two authenticated tabs proved an open gift dialog enters review after a concurrent update.
- `git diff --check` passed.

## User Setup Required

Set the server-only `ADMIN_PASSWORD` in each real Convex deployment before owner use. The temporary development password used for browser verification was removed.

## Next Phase Readiness

- Phase 6 implementation is complete across authentication, overview, guests, moderation and gifts.
- Phase 7 can import the real guest list and run launch/UAT checks.
- Human UAT still needs the documented device backstops: 320px/200%, 1023/1024px shell swap, very long wine names, mobile keyboard reachability, reduced motion, safe areas and final contrast/focus review.

## Self-Check: PASSED

- All seven created key files exist and all three task commits are present.
- Every task acceptance criterion has automated, real-Convex or browser evidence.
- No high-severity ASVS L1 privacy, stale-overwrite or atomic-state threat remains open.

---
*Phase: 06-dashboard-interno-admin*
*Completed: 2026-07-25*
