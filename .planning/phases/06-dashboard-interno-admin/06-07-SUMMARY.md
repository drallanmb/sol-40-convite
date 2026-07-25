---
phase: 06-dashboard-interno-admin
plan: 07
subsystem: admin-operations
tags: [react, vitest, jsdom, concurrency, accessibility]

requires:
  - phase: 06-dashboard-interno-admin
    provides: Protected guest, moderation, and gift operations from Plans 03-04
provides:
  - Synchronous per-record duplicate guard with independent pending membership
  - Command-scoped completion, feedback, and dialog cleanup
  - Deterministic React DOM coverage for out-of-order admin mutations
affects: [admin-guests, admin-moderation, admin-gifts, phase-07-uat]

tech-stack:
  added: [jsdom 29.1.1]
  patterns:
    - Ref-backed command tokens guard same-tick duplicate activation
    - Functional pending-id settlement removes only the completing command
    - Command scopes suppress stale completion effects after newer work or auth clear

key-files:
  created:
    - src/components/admin/adminPendingOperations.test.ts
  modified:
    - package.json
    - package-lock.json
    - src/lib/adminOperations.ts
    - src/lib/adminOperations.test.ts
    - src/components/admin/AdminGuests.tsx
    - src/components/admin/AdminModeration.tsx
    - src/components/admin/AdminGifts.tsx

key-decisions:
  - "Pending membership is rendered from immutable Sets, while a ref-backed token map is the synchronous authority for duplicate prevention."
  - "Each command receives current/latest predicates so cleared or older completions cannot alter newer protected feedback or dialogs."
  - "jsdom 29.1.1 is exact-pinned as a development-only concurrency approximation; device, zoom, keyboard, safe-area, focus, motion, and contrast remain human backstops."

patterns-established:
  - "Per-record command: synchronously register token -> expose exact busy membership -> await mutation -> settle only if the same token still owns the id."
  - "Protected clear: invalidate all command tokens before clearing pending, draft, dialog, error, and feedback state."

requirements-completed: [ADMIN-04, ADMIN-05, ADMIN-06]

coverage:
  - id: D1
    description: "Guests, moderation, and gifts preserve B's disabled and aria-busy state when A resolves first."
    requirement: ADMIN-04
    verification:
      - kind: automated_ui
        ref: "src/components/admin/adminPendingOperations.test.ts#admin screen pending operations"
        status: pass
    human_judgment: false
  - id: D2
    description: "Same-record duplicate activation is refused synchronously before a second Convex mutation."
    requirement: ADMIN-05
    verification:
      - kind: unit
        ref: "src/lib/adminOperations.test.ts#admin pending operations"
        status: pass
      - kind: automated_ui
        ref: "src/components/admin/adminPendingOperations.test.ts#per-record pending DOM harness"
        status: pass
    human_judgment: false
  - id: D3
    description: "Stale completions and authorization clear cannot release or repopulate newer protected command state."
    requirement: ADMIN-06
    verification:
      - kind: automated_ui
        ref: "src/components/admin/adminPendingOperations.test.ts#admin screen pending operations"
        status: pass
    human_judgment: false
  - id: D4
    description: "Real-device layout, zoom, keyboard, safe-area, focus, reduced-motion, contrast, and two-browser reactivity backstops."
    requirement: ADMIN-06
    verification: []
    human_judgment: true
    rationale: "jsdom controls promise ordering and DOM state but does not prove physical-device rendering or independent browser-session reactivity."

duration: 6min
completed: 2026-07-25
status: complete
---

# Phase 6 Plan 7: Per-record Admin Pending Operations Summary

**Independent, synchronous mutation locks now keep guest, moderation, and gift feedback truthful under overlapping and out-of-order operations.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-25T05:40:22Z
- **Completed:** 2026-07-25T05:46:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Added an immutable pending-id reducer and ref-backed command registry that rejects a duplicate for the same id before its operation callback can invoke Convex.
- Replaced the three scalar busy values with independent family, post, and wine membership, preserving unrelated controls while each affected record remains disabled and `aria-busy`.
- Scoped feedback, undo, dialog errors, and cleanup to the command that still owns the record and to the newest global feedback command.
- Added deterministic React DOM tests for all three exported screens, including A-first/B-pending order, duplicate B activation, and protected-state clear.
- Verified the exact `jsdom` package repository, registry integrity, engine range, and development-only lockfile placement before use.

## Task Commits

1. **Task 1 RED: Specify per-record pending behavior and DOM harness** — `144ccc8` (test)
2. **Task 1 GREEN: Implement synchronous pending command primitive** — `be25ae3` (feat)
3. **Task 2 RED: Reproduce all three screen races** — `76c3d10` (test)
4. **Task 2 GREEN: Wire command-scoped pending state into all screens** — `176c90c` (fix)

## Files Created/Modified

- `package.json`, `package-lock.json` — exact `jsdom@29.1.1` development dependency and integrity-pinned transitive graph.
- `src/lib/adminOperations.ts` — immutable pending reducer and token-scoped React hook.
- `src/lib/adminOperations.test.ts` — reducer add/remove/idempotency/clear coverage.
- `src/components/admin/adminPendingOperations.test.ts` — deferred-promise jsdom harness and three exported-screen concurrency cases.
- `src/components/admin/AdminGuests.tsx` — independent family/create locks and protected draft/dialog cleanup.
- `src/components/admin/AdminModeration.tsx` — independent post apply/undo locks with latest-command feedback.
- `src/components/admin/AdminGifts.tsx` — independent wine locks and dialog-owner-aware mark/unmark completion.

## Decisions Made

- A Set is sufficient for rendering, but not for lifecycle ownership after auth clear and restart; a token map therefore owns synchronous command identity.
- Global toast/error state accepts only the latest live command, while record-local reconciliation may still complete independently.
- Dialogs close through identity-checked functional setters, preventing an older wine/family completion from closing a newer record's dialog.

## Deviations from Plan

None — the plan was executed as written.

## Issues Encountered

- `npm audit` reports one preexisting high-severity `react-router` advisory limited to RSC action handling. This project is a Vite SPA without RSC, `react-router` was not changed by this plan, and `jsdom` introduced no audit finding. The unrelated major-version remediation was left outside scope.
- `STATE.md` still identifies the gap-closure execution position from the orchestration flow. Per executor restriction, STATE/ROADMAP tracking was left for the canonical phase orchestrator.

## Verification

- Focused pending/reducer/component suite: 2 files, 12 tests passed.
- Full suite: 25 files, 489 tests passed.
- Production TypeScript/Vite build: passed.
- `git diff --check`: passed.
- `jsdom@29.1.1`: official `github.com/jsdom/jsdom` repository, compatible with Node 24.18.0, exact dev-only pin, and registry/lock integrity match verified.
- Scalar `busyFamily`, `busyPost`, and `busyWine` identifiers: none remain.
- Preexisting `src/lib/phone.ts` and `src/lib/phone.test.ts` diffs: byte-identical to executor start.
- Human UI backstops were not claimed as automated.

## User Setup Required

None.

## Next Phase Readiness

- WR-01's concrete per-record pending-state predicate is closed across all three operational surfaces.
- Phase verification can rerun automated evidence and retain the documented physical-device, zoom, keyboard, focus, contrast, and two-browser items for human UAT.

## Self-Check: PASSED

- All key files exist and the four RED/GREEN commits are present.
- Every automated acceptance gate passes.
- Package provenance, exact version, engine compatibility, integrity, and development-only placement are verified.
- No command completion can clear a different id or a replacement token for the same id.
- No human device backstop is represented as automated evidence.

---
*Phase: 06-dashboard-interno-admin*
*Completed: 2026-07-25*
