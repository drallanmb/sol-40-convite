---
phase: 06-dashboard-interno-admin
plan: 06
subsystem: admin-rsvp
tags: [convex, capability-revocation, pagination, optimistic-concurrency, testing]

requires:
  - phase: 06-dashboard-interno-admin
    provides: "Generation-aware RSVP capabilities, protected family operations, and bounded session lifecycle cleanup from Plans 03 and 05"
provides:
  - "Availability-safe phone changes and family deletion for unbounded RSVP session history"
  - "Monotonic generation-scoped session purge plus exclusive family-deletion deleteAll mode"
  - "Exhaustive 160-row regressions and a self-cleaning real-Convex cascade smoke"
affects: [ADMIN-04, public-rsvp, admin-family-operations, phase-07-launch]

tech-stack:
  added: []
  patterns:
    - "Logical capability revocation is atomic; physical cleanup proceeds in bounded internal pages."
    - "Immutable tagged cleanup commands remain safe under delayed, retried, and reordered delivery."

key-files:
  created: []
  modified:
    - convex/rsvpInternal.ts
    - convex/adminRsvps.ts
    - convex/admin.test.ts
    - convex/adminTest.ts

key-decisions:
  - "Phone-change cleanup deletes only legacy-aware generations strictly below the immutable committed generation; equality or a later generation always survives."
  - "Only family deletion emits deleteAll, after the family row is atomically removed so every linked capability already fails closed."
  - "The real smoke is an internal action over bounded internal mutations because Convex permits one paginated query per mutation."

patterns-established:
  - "RSVP phone revocation: expected revision and uniqueness -> atomic generation increment plus phone patch -> olderThanGeneration purge."
  - "RSVP family removal: bounded guest preflight -> atomic guest/family deletion -> deleteAll orphan purge."

requirements-completed: [ADMIN-04]

coverage:
  - id: D1
    description: "Phone changes and family deletion remain available with 160 historical sessions, revoke every old capability immediately, and converge obsolete rows to zero."
    requirement: ADMIN-04
    verification:
      - kind: integration
        ref: "convex/admin.test.ts#revokes 160 historical sessions immediately and purges only older generations"
        status: pass
      - kind: integration
        ref: "convex/admin.test.ts#removes a family with 160 linked sessions before deleteAll cleanup"
        status: pass
    human_judgment: false
  - id: D2
    description: "Delayed or reordered generation cleanup preserves equal/newer sessions, rejects malformed modes, and rejected owner commands schedule no purge."
    requirement: ADMIN-04
    verification:
      - kind: integration
        ref: "convex/admin.test.ts#preserves generation 2 when delayed phone purges arrive in either order"
        status: pass
      - kind: integration
        ref: "convex/admin.test.ts#rejects malformed or mixed purge commands before deleting sessions"
        status: pass
      - kind: integration
        ref: "convex/admin.test.ts#does not advance generation or schedule purge for rejected phone changes"
        status: pass
    human_judgment: false
  - id: D3
    description: "The deployed backend proves immediate generation/family denial, idempotent purge, orphan cleanup, and removal of every disposable fixture."
    requirement: ADMIN-04
    verification:
      - kind: e2e
        ref: "npx convex run adminTest:smokeFamilyCascade '{}'"
        status: pass
    human_judgment: false
  - id: D4
    description: "Real-browser reactivity and responsive/accessibility backstops remain outstanding rather than being inferred from backend evidence."
    requirement: ADMIN-04
    verification: []
    human_judgment: true
    rationale: "Two real browser sessions, 320px at 200% zoom, the 1023/1024 switch, long content, virtual keyboards, safe area, focus, reduced motion, and contrast require end-of-phase human UAT."

duration: 8min
completed: 2026-07-25
status: complete
---

# Phase 06 Plan 06: Availability-safe RSVP Revocation Summary

**Owner phone changes and family deletion now revoke access atomically for any historical session count, while bounded tagged cleanup safely removes obsolete rows without touching equal or newer generations.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-25T05:46:00Z
- **Completed:** 2026-07-25T05:53:39Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Removed the permanent 128-session refusal from phone change and family deletion while preserving admin authorization, optimistic revision, phone uniqueness, stable `publicRef`, and narrow DTOs.
- Added atomic generation revocation plus fixed-size family-scoped cleanup with required `olderThanGeneration` and `deleteAll` commands.
- Proved 160-row phone and deletion cases, two successive phone changes with delayed/reordered cleanup, rejected-command isolation, full cleanup, and real deployed behavior.

## Task Commits

1. **Task 1 RED: Add failing unbounded RSVP purge regressions** - `658b663` (test)
2. **Task 1 GREEN: Make RSVP revocation generation-safe** - `a1c31f7` (fix)
3. **Task 2 RED: Require deployed generation cascade smoke** - `a7e1bf6` (test)
4. **Task 2 GREEN: Prove deployed RSVP cascade lifecycle** - `8aa698f` (test)
5. **Task 2 follow-up: Lock rejected phone revocation boundary** - `a85d0f3` (test)

## Files Created/Modified

- `convex/rsvpInternal.ts` - Adds validated tagged commands and bounded family-session purge with immutable continuations.
- `convex/adminRsvps.ts` - Atomically advances generation on logical phone changes and schedules cap-free cleanup after phone/family operations.
- `convex/admin.test.ts` - Covers 160 rows, immediate denial, zero-row convergence, command reordering, mode validation, and rejected updates.
- `convex/adminTest.ts` - Runs a self-cleaning internal action against the deployed Convex backend.

## Decisions Made

- A purge predicate is strictly monotonic: `legacyAwareGeneration < commandGeneration`; `!==` is forbidden because delayed older commands must preserve newer capabilities.
- Physical deletion is never a prerequisite for mutation success. Generation mismatch or missing family denies access immediately, and scheduled pages handle storage cleanup.
- Family deletion alone owns `deleteAll`; phone changes cannot represent or accidentally emit an all-row cleanup.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used the project's TypeScript-compatible own-property check**

- **Found during:** Task 1 schema synchronization
- **Issue:** `Object.hasOwn` was unavailable under the configured TypeScript library target.
- **Fix:** Replaced it with `Object.prototype.hasOwnProperty.call` without weakening exact tagged-command validation.
- **Files modified:** `convex/rsvpInternal.ts`
- **Verification:** `npx convex dev --once`, full tests, and build passed.
- **Committed in:** `a1c31f7`

---

**Total deviations:** 1 auto-fixed blocking issue.
**Impact on plan:** The compatibility adjustment preserved the exact validation contract and added no scope.

## Issues Encountered

- The original small cascade test assumed synchronous physical deletion. It was updated to assert the new contract explicitly: immediate logical denial followed by bounded physical cleanup.

## User Setup Required

None - the existing Convex development deployment accepted the updated internal functions and completed the real smoke.

## TDD Gate Compliance

- RED commits: `658b663`, `a7e1bf6`
- GREEN commits: `a1c31f7`, `8aa698f`
- Focused and full suites passed after implementation.

## Verification Evidence

- Focused ADMIN-04 regression selector: 16 passed.
- `convex/admin.test.ts` + `convex/rsvps.test.ts`: 88 passed before the final negative-path addition.
- `npx convex dev --once`: functions synchronized successfully.
- `npx convex run adminTest:smokeFamilyCascade '{}'`: all seven booleans true, including `fixturesRemoved`.
- `npm test`: 25 files, 494 tests passed.
- `npm run build`: TypeScript and Vite production build passed.
- `git diff --check`: passed.
- User-owned `src/lib/phone.ts` and `src/lib/phone.test.ts` remained byte-identical at SHA-1 `c2836059...` and `6a36baef...`.

## Human Backstops Preserved

- Two real browser sessions for cross-session reactivity.
- 320 CSS px at 200% zoom and the 1023/1024 shell transition.
- Long family/person content, iOS/Android virtual keyboards, safe-area reachability, focus restoration, reduced motion, and semantic contrast.

## Next Phase Readiness

- The ADMIN-04 fixed-session-count shipping blocker is closed with local exhaustive and real-backend evidence.
- Final phase verification can rerun the full suite and route only the explicitly human UI/reactivity backstops to UAT.

## Self-Check: PASSED

- All four implementation/test files and this summary exist.
- Every task and follow-up commit is present.
- Schema sync, real smoke, focused regressions, full suite, build, and diff check passed.
- Pre-existing `.planning/config.json`, `src/lib/phone.ts`, and `src/lib/phone.test.ts` changes remain unstaged and untouched.

---
*Phase: 06-dashboard-interno-admin*
*Completed: 2026-07-25*
