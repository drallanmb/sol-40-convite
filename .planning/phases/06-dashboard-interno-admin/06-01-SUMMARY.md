---
phase: 06-dashboard-interno-admin
plan: 01
subsystem: auth
tags: [convex, capability-session, sha256, rate-limiter, localStorage]

requires:
  - phase: 03-rsvp
    provides: opaque capability, indexed session, rate-limit and convex-test patterns
provides:
  - Hash-only, revocable administrative sessions with absolute seven-day expiry
  - Shared-password login, status, logout and scheduled expiry Convex endpoints
  - Fail-closed browser capability storage and deterministic client session reducer
affects: [06-02-admin-shell, 06-03-admin-guests, 06-04-admin-moderation-gifts]

tech-stack:
  added: []
  patterns:
    - Client-generated canonical capability persisted raw only in versioned localStorage
    - Server stores only SHA-256 capability hashes and revalidates every protected request
    - Scheduled expected-value deletion makes absolute expiry reactive and idempotent

key-files:
  created:
    - convex/adminModel.ts
    - convex/adminSecurity.ts
    - convex/adminRateLimits.ts
    - convex/adminAuth.ts
    - convex/adminInternal.ts
    - convex/adminTest.ts
    - convex/admin.test.ts
    - src/lib/adminSession.ts
    - src/lib/adminSession.test.ts
  modified:
    - convex/schema.ts
    - convex/_generated/api.d.ts

key-decisions:
  - "The shared owner password creates a single opaque browser capability, not an identity, role, or reusable guest credential."
  - "Administrative sessions expire absolutely after seven days; reads never renew the deadline."
  - "Invalid, revoked, malformed, unknown and boundary-expired capabilities share one fail-closed authorization outcome."
  - "The client preserves return intent only in the URL and clears protected state before rendering any anonymous/error state."

patterns-established:
  - "Admin guard: every protected Convex endpoint must call requireAdminSession before domain access."
  - "Admin expiry: scheduled deletion must match both session id and expected expiry."
  - "Admin client races: sequence-tagged async results cannot restore access after logout, revocation or expiry."

requirements-completed: [ADMIN-01]

coverage:
  - id: D1
    description: "Hash-only indexed admin session trust boundary with canonical tokens, constant-work password comparison and uniform authorization denial."
    requirement: ADMIN-01
    verification:
      - kind: unit
        ref: "convex/admin.test.ts#admin session schema, hash and token boundaries"
        status: pass
      - kind: unit
        ref: "convex/admin.test.ts#admin authorization boundary"
        status: pass
      - kind: other
        ref: "npm run build"
        status: pass
    human_judgment: false
  - id: D2
    description: "Shared-password login, status, idempotent logout and expected-value scheduled expiry with absolute seven-day TTL."
    requirement: ADMIN-01
    verification:
      - kind: integration
        ref: "convex/admin.test.ts#admin login, status and logout lifecycle"
        status: pass
      - kind: integration
        ref: "npx convex run adminTest:smokeSessionLifecycle '{}'"
        status: pass
      - kind: other
        ref: "npx convex dev --once"
        status: pass
    human_judgment: false
  - id: D3
    description: "Versioned fail-closed browser session seam for restore, expiry, revocation, logout, cross-tab clearing and stale-request rejection."
    requirement: ADMIN-01
    verification:
      - kind: unit
        ref: "src/lib/adminSession.test.ts#admin capability persistence"
        status: pass
      - kind: unit
        ref: "src/lib/adminSession.test.ts#admin session reducer fail-closed lifecycle"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-07-25
status: complete
---

# Phase 6 Plan 1: Owner Authentication and Session Lifecycle Summary

**Server-authoritative shared-password access with hash-only seven-day Convex sessions, scheduled revocation and a fail-closed cross-tab browser state seam**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-25T03:55:30Z
- **Completed:** 2026-07-25T04:00:42Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments

- Added the indexed `adminSessions` trust boundary with canonical 32-byte capabilities, SHA-256-only persistence, full-digest password comparison and exact `now < expiresAt` authorization.
- Added rate-limited login, public status/logout, idempotent scheduled expiry and an internal self-cleaning smoke proven against the real Convex development deployment.
- Added versioned localStorage handling and a sequence-safe client reducer that clears protected state on expiry, revocation, logout failure and cross-tab removal without persisting routes, passwords, DTOs or drafts.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define hash-only admin sessions and the shared authorization guard** - `768aaa6` (feat)
2. **Task 2: Implement login, status, logout, and exact scheduled expiry** - `ee61c88` (feat)
3. **Task 3: Build the fail-closed client session state seam** - `472d29a` (feat)

## Files Created/Modified

- `convex/schema.ts` - Adds hash-only admin session storage and authorization/expiry indexes.
- `convex/adminModel.ts` - Defines TTL, result validators and exact active-session semantics.
- `convex/adminSecurity.ts` - Validates and hashes capabilities, compares password digests and guards protected access.
- `convex/adminRateLimits.ts` - Defines the conservative shared login bucket.
- `convex/adminAuth.ts` - Implements login, status and logout public endpoints.
- `convex/adminInternal.ts` - Implements expected-value idempotent scheduled expiry.
- `convex/adminTest.ts` - Provides an internal, disposable real-backend lifecycle smoke.
- `convex/admin.test.ts` - Covers schema, security boundaries, limiter and lifecycle behavior.
- `convex/_generated/api.d.ts` - Registers the new Convex modules.
- `src/lib/adminSession.ts` - Implements capability persistence, deadline/storage-event interpretation and session transitions.
- `src/lib/adminSession.test.ts` - Covers persistence exceptions, races and fail-closed transitions.

## Decisions Made

- Used one shared capability session rather than accounts or roles, matching the owner-only product boundary.
- Kept the seven-day deadline absolute and server-authored; the browser expiry value is only a fail-closed UX hint.
- Returned the same credential failure for wrong and missing server password configuration to avoid configuration disclosure.
- Retained a raw capability after logout network failure only in the in-memory retry state; protected state and persistent storage are cleared immediately.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Convex TypeScript target does not support `String.prototype.at`**

- **Found during:** Task 2 real deployment verification
- **Issue:** `npx convex dev --once` rejected the token validator because the Convex TypeScript target lacks `String.prototype.at`.
- **Fix:** Replaced the last-character lookup with the equivalent `charAt(token.length - 1)`.
- **Files modified:** `convex/adminSecurity.ts`
- **Verification:** Focused tests, full 429-test suite, production build, `npx convex dev --once` and real lifecycle smoke all passed.
- **Committed in:** `ee61c88`

---

**Total deviations:** 1 auto-fixed (1 blocking compatibility issue).
**Impact on plan:** No behavior or scope change; the fix was required for deployment compatibility.

## Issues Encountered

None remaining. The first real Convex typecheck surfaced the compatibility issue above and the immediate retry deployed successfully.

## User Setup Required

Set the server-only `ADMIN_PASSWORD` in each Convex deployment before owner login UAT. It must not use a `VITE_` prefix. No additional service or account setup is required.

## Next Phase Readiness

- Plan 06-02 can mount the admin gate and shell on top of `getSessionStatus` and the client reducer.
- Every new protected query/mutation must use `requireAdminSession` before reading or writing domain data.
- Browser transport/privacy and same-route reauthentication remain intentional Plan 06-02 UAT checks.
- No high-severity threat remains open in the Plan 06-01 STRIDE scope.

## Self-Check: PASSED

- All created key files exist.
- All three task commits are present.
- Focused tests: 33 passed.
- Full suite: 429 passed.
- Production build: passed.
- Real Convex schema/function deployment: passed.
- Disposable real-backend lifecycle smoke: passed and left no session.

---
*Phase: 06-dashboard-interno-admin*
*Completed: 2026-07-25*
