---
phase: 06-dashboard-interno-admin
plan: 05
subsystem: api
tags: [convex, rsvp, sessions, scheduler, pagination, security]

requires:
  - phase: 03-rsvp
    provides: Public RSVP capabilities with absolute eight-hour authorization
  - phase: 06-dashboard-interno-admin
    provides: Admin family operations and the ADMIN-04 lifecycle gap evidence
provides:
  - Generation-bound RSVP sessions with scheduled idempotent physical expiry
  - Bounded indexed migration for historical expired sessions
  - Daily recovery cron and self-cleaning real-backend lifecycle smoke
affects: [ADMIN-04, public-rsvp, admin-family-operations]

tech-stack:
  added: []
  patterns:
    - Internal scheduler mutations guarded by row identity and expected expiry
    - Server-owned migration cutoff propagated with an opaque pagination cursor

key-files:
  created: []
  modified:
    - convex/schema.ts
    - convex/rsvpSecurity.ts
    - convex/rsvpInternal.ts
    - convex/crons.ts
    - convex/adminTest.ts
    - convex/rsvps.test.ts

key-decisions:
  - "Invitation and session generation omissions map to zero for additive legacy compatibility; invalid internal generations fail closed."
  - "Only the no-argument start mutation may establish a sweep cutoff; continuations require the paired opaque cursor and unchanged validated cutoff."
  - "Per-session scheduled expiry is primary cleanup, while the daily bounded sweep is recovery for historical or stranded rows."

patterns-established:
  - "RSVP physical expiry: scheduler commands carry only sessionId and expectedExpiresAt and are safe to retry."
  - "RSVP migration: fixed-size by_expires_at pages advance through Convex cursors under one server-owned cutoff."

requirements-completed: [ADMIN-04]

coverage:
  - id: D1
    description: "New public RSVP sessions snapshot invitation generation and schedule guarded deletion at their absolute expiry."
    requirement: ADMIN-04
    verification:
      - kind: integration
        ref: "convex/rsvps.test.ts#stores invitation generation, schedules one absolute expiry, and physically expires once"
        status: pass
      - kind: integration
        ref: "convex/rsvps.test.ts#keeps expiry idempotent and ignores a mismatched expected boundary"
        status: pass
    human_judgment: false
  - id: D2
    description: "Legacy expired sessions are drained through bounded indexed pages with a server-owned stable cutoff and fail-closed continuation validation."
    requirement: ADMIN-04
    verification:
      - kind: integration
        ref: "convex/rsvps.test.ts#expired RSVP session sweep"
        status: pass
    human_judgment: false
  - id: D3
    description: "The deployed backend exposes a daily recovery cron and a self-cleaning lifecycle smoke that preserves an active control."
    requirement: ADMIN-04
    verification:
      - kind: integration
        ref: "npx convex run adminTest:smokeRsvpSessionLifecycle '{}'"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-07-25
status: complete
---

# Phase 06 Plan 05: RSVP Session Lifecycle Summary

**Generation-aware public RSVP sessions now expire physically, while a bounded daily migration drains historical rows without widening public DTOs or accepting caller-owned migration state.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-25T05:31:00Z
- **Completed:** 2026-07-25T05:37:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added optional generation fields with legacy-zero compatibility and stale-generation denial.
- Scheduled every newly created RSVP session for guarded, idempotent deletion at its absolute `expiresAt`.
- Added a fixed-page indexed historical sweep, strict continuation validation, a daily recovery cron, and real-backend smoke evidence.

## Task Commits

Each TDD task was committed atomically:

1. **Task 1 RED: RSVP session lifecycle regressions** - `0c8eb16` (test)
2. **Task 1 GREEN: generation-aware scheduled expiry** - `f1fd210` (feat)
3. **Task 2 RED: bounded sweep regressions** - `eed341d` (test)
4. **Task 2 GREEN: indexed migration, cron, and smoke** - `a0d7c86` (feat)

## Files Created/Modified

- `convex/schema.ts` - Adds optional invitation and session generation fields.
- `convex/rsvpSecurity.ts` - Snapshots generation, schedules expiry, and rejects stale-generation capabilities.
- `convex/rsvpInternal.ts` - Implements guarded expiry plus bounded start/continuation sweep mutations.
- `convex/crons.ts` - Registers the no-argument daily RSVP-session recovery sweep.
- `convex/adminTest.ts` - Adds a self-cleaning deployed lifecycle smoke.
- `convex/rsvps.test.ts` - Covers scheduling, expiry boundaries, generation compatibility, pagination, validation, and idempotency.

## Decisions Made

- Missing generation is generation zero so deployed legacy invitations and sessions remain compatible without an eager rewrite.
- The migration boundary is captured only by the internal no-argument start mutation; each continuation carries the exact returned opaque cursor and unchanged cutoff.
- The sweep uses `by_expires_at`, a 50-row page, current-row rechecks, and zero-delay continuation scheduling.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected the disposable smoke phone shape**
- **Found during:** Task 2 real-backend smoke
- **Issue:** The first unique phone prefix did not satisfy the Brazilian mobile normalizer.
- **Fix:** Used the established `79` + mobile-nine prefix while retaining the unique timestamp suffix.
- **Files modified:** `convex/adminTest.ts`
- **Verification:** `npx convex run adminTest:smokeRsvpSessionLifecycle '{}'`
- **Committed in:** `a0d7c86`

**2. [Rule 1 - Bug] Avoided a second paginated query in an idempotent empty sweep**
- **Found during:** Task 2 real-backend smoke
- **Issue:** Convex permits only one paginated query per mutation; invoking the exact empty sweep handler twice in the smoke hit that runtime limit.
- **Fix:** Added an indexed first-candidate check so an empty retry returns `done` without opening a pagination stream.
- **Files modified:** `convex/rsvpInternal.ts`
- **Verification:** Real-backend smoke passed twice-safe expiry/sweep assertions; the full suite passed.
- **Committed in:** `a0d7c86`

---

**Total deviations:** 2 auto-fixed bugs
**Impact on plan:** Both fixes were required for the planned production smoke and idempotent retry contract; no scope was added.

## Issues Encountered

- Initial real-backend smoke attempts exposed the phone-shape and per-mutation pagination constraints; both were corrected and the blocking smoke then passed.

## User Setup Required

None - the existing Convex development deployment accepted the additive schema and functions.

## TDD Gate Compliance

- RED commits: `0c8eb16`, `eed341d`
- GREEN commits: `f1fd210`, `a0d7c86`
- Focused lifecycle and sweep suites passed after implementation.

## Verification Evidence

- `npx vitest run convex/rsvps.test.ts -t "session|expiry|generation|legacy"` — 16 passed.
- Focused sweep/start/continuation/cutoff suite — 12 passed.
- `npx convex dev --once` — schema and functions deployed successfully.
- `npx convex run adminTest:smokeRsvpSessionLifecycle '{}'` — all four lifecycle booleans true.
- `npm test` — 24 files, 482 tests passed.
- `npm run build` — TypeScript and Vite production build passed.
- `git diff --check` — passed.
- Pre-existing `src/lib/phone.ts` and `src/lib/phone.test.ts` diff remained byte-identical.

## Next Phase Readiness

- The unbounded expired-session accumulation predicate from ADMIN-04 is closed.
- Plans 06-06 and 06-07 can proceed independently; final phase verification still owns their remaining gap predicates and human UI checks.

## Self-Check: PASSED

- All six modified implementation/test files and this summary exist.
- All four RED/GREEN task commits are present in repository history.

---
*Phase: 06-dashboard-interno-admin*
*Completed: 2026-07-25*
