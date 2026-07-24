---
phase: 03-rsvp
plan: 01
subsystem: database
tags: [convex, vitest, phone-normalization, rate-limiter, fixtures]

requires:
  - phase: 01-funda-o-design-system-deploy
    provides: Vite/Vitest runner, Convex client, empty schema stub, and exact-pin dependency policy
provides:
  - Pure Brazilian phone normalization with explicit legacy ninth-digit candidates
  - Validated and indexed rsvps, rsvpGuests, and rsvpSessions tables
  - Internal logical-uniqueness insertion seam and guarded idempotent demo fixtures
  - Shared convex-test harness with the official rate-limiter component adapter
affects: [03-02-public-rsvp-backend, 03-03-rsvp-frontend, 06-admin, 07-launch]

tech-stack:
  added:
    - "@convex-dev/rate-limiter@0.3.2"
    - "convex-test@0.0.54"
  patterns:
    - "Normalize and query every equivalent phone candidate inside the same Convex mutation before insert"
    - "Keep fixture creation internal-only and fail closed behind a development flag plus server seed"
    - "Inject test-only packages into a deploy-safe harness module from ignored *.test.ts files"

key-files:
  created:
    - src/lib/phone.ts
    - src/lib/phone.test.ts
    - convex/convex.config.ts
    - convex/rsvpModel.ts
    - convex/rsvpInternal.ts
    - convex/rsvpTest.ts
    - convex/rsvps.test.ts
    - convex/_generated/api.d.ts
  modified:
    - package.json
    - package-lock.json
    - vite.config.ts
    - convex/schema.ts

key-decisions:
  - "convex-test@0.0.54 declares only convex ^1.32.0 as a peer, so @edge-runtime/vm was not added speculatively."
  - "Ambiguous 10-digit mobile-looking numbers return [exact, current] candidates while normalizedKey always uses the current ninth-digit form."
  - "A current 11-digit mobile also checks its inverse legacy candidate before insert, preventing old canonical data from splitting into a second invitation."
  - "Demo phones are HMAC-SHA-256-derived from a server-only seed and the four-shape fixture entry point is an internalMutation guarded by development-only configuration."
  - "The pre-existing convex/_generated directory was preserved, regenerated exclusively by Convex tooling, and committed because its API/component declarations are now required by the phase."

patterns-established:
  - "Explicit attendance: every guest stores pending, yes, or no; absence never implies pending."
  - "Opaque guest reference: publicRef is a scoped SHA-256-derived value distinct from the Convex document ID."
  - "Idempotent fixture seam: the same seed returns the same four invitation IDs and guest counts without duplicate rows."

requirements-completed: [RSVP-01, RSVP-02, RSVP-05]

coverage:
  - id: D1
    description: "Exact-pinned Convex test/rate-limit infrastructure discovers both frontend and backend Vitest suites and registers the official component."
    requirement: RSVP-05
    verification:
      - kind: integration
        ref: "npm test && npm run build"
        status: pass
      - kind: integration
        ref: "convex/rsvps.test.ts#registers the official rate-limiter component in every harness instance"
        status: pass
    human_judgment: false
  - id: D2
    description: "Brazilian phone normalization preserves DDD 55, rejects unsafe input, and models fixed/current/legacy ninth-digit boundaries deterministically."
    requirement: RSVP-01
    verification:
      - kind: unit
        ref: "src/lib/phone.test.ts#49 phone normalization tests"
        status: pass
    human_judgment: false
  - id: D3
    description: "Three validated RSVP tables and one internal insertion seam enforce explicit attendance, scoped public references, and logical phone uniqueness."
    requirement: RSVP-02
    verification:
      - kind: integration
        ref: "convex/rsvps.test.ts#schema RSVP and unique RSVP phone invariant"
        status: pass
      - kind: integration
        ref: "npx convex dev --once"
        status: pass
    human_judgment: false
  - id: D4
    description: "Guarded normal, zero, one, and many-long fixtures are seed-derived and idempotent on the connected development deployment."
    requirement: RSVP-02
    verification:
      - kind: integration
        ref: "convex/rsvps.test.ts#fixture RSVP"
        status: pass
      - kind: manual_procedural
        ref: "npx convex run rsvpInternal:ensureDemoFixtures '{}' repeated with unchanged 4 RSVP / 16 guest totals"
        status: pass
    human_judgment: false

duration: 13min
completed: 2026-07-24
status: complete
---

# Phase 3 Plan 1: RSVP Wave 0 Foundation Summary

**Brazilian phone normalization, three-table Convex RSVP schema, official rate-limiter test wiring, and guarded four-shape development fixtures now run against both `convex-test` and the connected Convex backend.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-07-24T18:43:45Z
- **Completed:** 2026-07-24T18:56:45Z
- **Tasks:** 3/3
- **Files modified:** 16

## Accomplishments

- Installed exact `@convex-dev/rate-limiter@0.3.2` and `convex-test@0.0.54`, extended one-shot Vitest discovery to `convex/**/*.test.ts`, and registered the official component/test adapter.
- Added a pure `normalizePhone` contract proven by 49 cases across country/trunk formatting, DDD 55, fixed/current/legacy boundaries, equivalence keys, invalid DDDs, and raw C0/C1 rejection.
- Replaced the empty schema with explicitly validated/indexed `rsvps`, `rsvpGuests`, and `rsvpSessions`; internal creation rejects equivalent phones and gives guests invitation-scoped opaque references.
- Added guarded, seed-derived normal/zero/one/many-long fixtures; the connected development deployment produced 4 RSVPs and 16 guests, then returned the same IDs and counts on repeat.

## Task Commits

Each task was committed atomically; TDD tasks have separate RED and GREEN commits:

1. **Task 1: Convex Wave 0 infrastructure** — `648f31d` (chore)
2. **Task 2 RED: Brazilian phone contract** — `522a176` (test)
3. **Task 2 GREEN: Brazilian phone normalizer** — `00f4a58` (feat)
4. **Task 3 RED: schema/fixture invariants** — `2b69098` (test)
5. **Task 3 GREEN: schema, internal seam, fixtures, and harness** — `6deccb2` (feat)

**Plan metadata:** committed with this summary.

## Files Created/Modified

- `package.json`, `package-lock.json` — exact official component/test pins; `@edge-runtime/vm` omitted because the pinned peer contract does not require it.
- `vite.config.ts` — discovers both `src/**/*.test.ts` and `convex/**/*.test.ts`.
- `convex/convex.config.ts` — registers the official rate-limiter component.
- `src/lib/phone.ts`, `src/lib/phone.test.ts` — pure canonical/candidate/key model and 49-case matrix.
- `convex/rsvpModel.ts`, `convex/schema.ts` — shared bounds/validators plus three tables and six indexes.
- `convex/rsvpInternal.ts` — internal insertion helper, equivalent-candidate uniqueness, seed derivation, and guarded idempotent fixtures.
- `convex/rsvpTest.ts`, `convex/rsvps.test.ts` — deploy-safe harness factory and eight integration tests.
- `convex/_generated/*` — five existing untracked artifacts preserved and regenerated only by `npx convex dev --once`; `api.d.ts` now carries the real component/internal API types.

## Development Fixture Evidence

The random seed remains only in the Convex development environment. The
internal CLI confirmed all four shapes without persisting their access
telephones in this artifact:

| Shape | Guests | Repeat |
|-------|--------|--------|
| normal | 3 | same RSVP ID, `created: false` |
| zero | 0 | same RSVP ID, `created: false` |
| one | 1 | same RSVP ID, `created: false` |
| many-long | 12 | same RSVP ID, `created: false` |

Totals remained **4 RSVPs / 16 guests** on the second and final verification runs. No public query, mutation, seed, create, or list function exposes these values.

## Decisions Made

- Kept the phone parser server-authoritative and independent of React, DOM, database, and Convex imports.
- Store new invitations only in the current national form, but check both current and legacy equivalents transactionally before insert.
- Preserve explicit `pending` on every guest and scope `publicRef` through the composite `by_rsvp_public_ref` index.
- Keep the test harness file deploy-safe through dependency injection; only `*.test.ts` imports `convex-test`, `import.meta.glob`, and the official rate-limiter test adapter.
- Use lazy session expiry infrastructure only (`by_expires_at` and shared 8-hour constant); public capability behavior remains for plan 03-02.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test harness imports were initially deploy-incompatible**

- **Found during:** Task 3 real Convex smoke
- **Issue:** A static import of `@convex-dev/rate-limiter/test` pulled `import.meta.glob` into `rsvpTest.js`; the real Convex runtime rejected the module.
- **Fix:** Made `rsvpTest.ts` a deploy-safe factory and injected `convexTest`, module glob, and official adapter only from `rsvps.test.ts`, which Convex ignores during deploy.
- **Files modified:** `convex/rsvpTest.ts`, `convex/rsvps.test.ts`
- **Verification:** integration suite passed and the subsequent `npx convex dev --once` completed.
- **Committed in:** `6deccb2`

**2. [Rule 3 - Blocking] Convex typecheck lacked the ambient `process` declaration**

- **Found during:** Task 3 real Convex smoke
- **Issue:** The project Convex tsconfig intentionally exposes Vite types only, so `process.env` was valid at runtime but failed TypeScript compilation.
- **Fix:** Added a narrow local declaration for only `process.env` instead of widening the whole backend to Node APIs or changing the established tsconfig boundary.
- **Files modified:** `convex/rsvpInternal.ts`, `convex/rsvps.test.ts`
- **Verification:** real smoke and real fixture execution both passed.
- **Committed in:** `6deccb2`

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking integration issue).  
**Impact on plan:** Both fixes preserve the planned file boundaries and strengthen runtime/test separation; no product scope was added.

## Issues Encountered

- `npm audit` still reports the pre-existing React Router RSC-mode advisory for `react-router@7.18.1`. This application uses declarative SPA/library mode with no RSC actions, and changing the Phase 1 exact pin was outside this plan.

## User Setup Required

None. The Convex development deployment was already connected; this execution set the guarded development-only fixture variables, ran the schema/component smoke, and seeded the synthetic acceptance shapes automatically.

## Next Phase Readiness

- Plan 03-02 can build `unlockByPhone`, `getCurrent`, and `saveResponses` on stable phone/schema/session contracts and generated component types.
- The four guarded development shapes are available for backend and later browser acceptance.
- No public RSVP reader/writer exists yet by design; rate-limit boundary precision and session capability behavior remain the next plan.

## Self-Check: PASSED

- All 16 claimed files exist and all five task/TDD commits are present.
- Filtered Wave 0 integration proof: 8 passed; full suite: 4 files / 88 tests passed.
- `npm run build`, `npx convex dev --once`, fixture repeat, exact-pin checks, source-surface checks, and `git diff --check` all passed.

---
*Phase: 03-rsvp*
*Completed: 2026-07-24*
