---
phase: 03-rsvp
plan: 02
subsystem: api
tags: [convex, capability-security, sha256, rate-limiter, sparse-updates]

requires:
  - phase: 03-rsvp
    plan: 01
    provides: Canonical Brazilian phone lookup, indexed RSVP schema, opaque guest references, and Convex test/component harness
provides:
  - Three-function public RSVP capability API for phone unlock, scoped read, and sparse save
  - SHA-256-only eight-hour session storage with exact expiry and family isolation
  - Atomic idempotent guest/contact updates without domain-row creation or deadline blocking
  - Four centralized fixed-window limits with exact boundaries and an internal browser-throttle preparation seam
affects: [03-03-rsvp-frontend, 03-04-confirmar-flow, 03-05-rsvp-acceptance, 06-admin, 07-launch]

tech-stack:
  added: []
  patterns:
    - "Replace the low-entropy phone lookup with a client-generated, hashed, expiring family capability"
    - "Check every applicable limiter before coherent transaction consumption; invalid sessions consume only the global save bucket"
    - "Authorize opaque guest references through the capability-derived RSVP before any domain write"

key-files:
  created:
    - convex/rsvpRateLimits.ts
    - convex/rsvpSecurity.ts
    - convex/rsvps.ts
  modified:
    - convex/rsvpInternal.ts
    - convex/rsvps.test.ts
    - convex/_generated/api.d.ts

key-decisions:
  - "The browser supplies a canonical 32-byte base64url token; the server stores only SHA-256 and accepts the capability strictly while now < expiresAt for an absolute eight hours."
  - "Every well-formed save checks the global bucket first; unknown, malformed, and expired capabilities consume only global capacity, while valid capabilities check and consume global plus session capacity coherently."
  - "Contact editing uses an explicit unchanged/set/clear command and is disclosed only inside the already-authorized family view."
  - "30 September remains informational: public RSVP authorization contains no event-date dependency or deadline branch."

patterns-established:
  - "Public RSVP results are purpose-built discriminated values; no phone, raw token/hash, Convex ID, session row, or cross-family data is returned."
  - "Sparse writes validate every unique scoped guestRef and contact bound before patching changed values only."
  - "Expected denial outcomes return safely after limiter consumption; unexpected invariants throw without sensitive values."

requirements-completed: [RSVP-02, RSVP-03, RSVP-04, RSVP-05]

coverage:
  - id: D1
    description: "Canonical capability validation, SHA-256 storage, exact eight-hour expiry, retry rounding, and four fixed-window policies are centralized server-side."
    requirement: RSVP-05
    verification:
      - kind: unit
        ref: "convex/rsvps.test.ts#security helper and rate policy"
        status: pass
      - kind: integration
        ref: "npx vitest run convex/rsvps.test.ts -t \"security helper|rate policy|expiry|retry\""
        status: pass
    human_judgment: false
  - id: D2
    description: "Phone unlock issues one hashed family capability and getCurrent returns only its ordered, privacy-safe invitation view."
    requirement: RSVP-04
    verification:
      - kind: integration
        ref: "convex/rsvps.test.ts#unlock capability and privacy"
        status: pass
      - kind: integration
        ref: "npx vitest run convex/rsvps.test.ts -t \"unlock|scope|session|lookup rate|privacy\""
        status: pass
    human_judgment: false
  - id: D3
    description: "Sparse guest responses and optional contact edits are atomic, idempotent, family-scoped, and unaffected by the informational 30 September date."
    requirement: RSVP-03
    verification:
      - kind: integration
        ref: "convex/rsvps.test.ts#partial save, save validation, deadline policy, and save privacy"
        status: pass
      - kind: integration
        ref: "npx vitest run convex/rsvps.test.ts -t \"partial|contact|atomic|idempotent|save rate|global invalid token|prepare throttle|deadline|privacy\""
        status: pass
    human_judgment: false
  - id: D4
    description: "Lookup/save limits hold at N-1, N, and N+1, and a guarded internal action prepares exactly 30 real saves for later browser proof without exposing a public test endpoint."
    requirement: RSVP-05
    verification:
      - kind: integration
        ref: "convex/rsvps.test.ts#lookup rate, save rate, global save rate, and prepare throttle"
        status: pass
      - kind: integration
        ref: "npm test && npm run build && npx convex dev --once"
        status: pass
    human_judgment: false

duration: 16min
completed: 2026-07-24
status: complete
---

# Phase 3 Plan 2: Secure Public RSVP Backend Summary

**Phone entry now unlocks an eight-hour hashed family capability that can read and atomically edit only its own sparse RSVP state through three rate-limited public functions.**

## Performance

- **Duration:** 16 min
- **Started:** 2026-07-24T19:01:30Z
- **Completed:** 2026-07-24T19:18:17Z
- **Tasks:** 3/3
- **Files modified:** 6

## Accomplishments

- Centralized canonical 32-byte token validation, SHA-256 hashing, exact `now < expiresAt` semantics, retry-second ceiling, and all four fixed-window rate policies.
- Added `unlockByPhone` and `getCurrent`: phone is only the rate-limited entry key, while all later access is an expiring one-family capability with privacy-safe output.
- Added `saveResponses` with bounded unique opaque guest references, explicit contact `unchanged | set | clear`, full prevalidation, sparse changed-field patches, and idempotent timestamps/counts.
- Proved exact lookup/save boundaries, invalid-token global aggregation, family isolation, internal 30-save browser preparation, and date-independent saves in 123 passing tests plus a connected Convex smoke.

## Task Commits

Each task was committed atomically; all three TDD tasks have separate RED and GREEN commits:

1. **Task 1 RED: security and limiter policy contract** — `2d2b97c` (test)
2. **Task 1 GREEN: centralized capability security** — `ab9db78` (feat)
3. **Task 2 RED: scoped unlock/read contract** — `cc1d959` (test)
4. **Task 2 GREEN: phone unlock and family capability** — `899ddc4` (feat)
5. **Task 3 RED: sparse save contract** — `f2e2245` (test)
6. **Task 3 GREEN: sparse/idempotent save and throttle helper** — `0974ddb` (feat)

**Plan metadata:** committed with this summary.

## Public Contracts

| Function | Input | Safe result |
|----------|-------|-------------|
| `unlockByPhone` mutation | `phone` plus fresh canonical 32-byte base64url `token` | `unlocked`, generic `not_found`, `token_conflict`, or `rate_limited { retryAfterSeconds }` |
| `getCurrent` query | opaque `token` | own `{ displayName, contact?, guests[], updatedAt }` or `null` |
| `saveResponses` mutation | `token`, sparse `{ guestRef, attendance }[]`, explicit contact command | `saved { view }`, `session_expired`, `invalid_update`, or generic `rate_limited` |

The Convex function specification exposes exactly these three RSVP functions publicly. Demo fixture/session/throttle functions remain internal and development-guarded.

## Security and Limiter Policy

| Control | Contract |
|---------|----------|
| Phone lookup | 5 per normalized phone / 15 minutes |
| Global lookup | 120 / 15 minutes |
| Session save | 30 per valid capability hash / hour |
| Global save | 300 / hour |
| Capability | 32 random bytes, canonical unpadded base64url, SHA-256 only at rest |
| Lifetime | absolute 8 hours; valid only while `now < expiresAt` |
| Retry | positive integer seconds using `max(1, ceil(milliseconds / 1000))` |

Every well-formed save checks global capacity before session acceptance. Invalid, unknown, and expired tokens consume only global capacity; a valid capability checks both applicable buckets before either is consumed, and the mutation transaction rolls back both on an invariant failure.

## Files Created/Modified

- `convex/rsvpRateLimits.ts` — single source for the four fixed-window limiter policies.
- `convex/rsvpSecurity.ts` — canonical token encoder/validator, SHA-256 helpers, exact expiry, retry conversion, and shared session create/resolve logic.
- `convex/rsvps.ts` — the only three public RSVP functions and their strict args/returns validators.
- `convex/rsvpInternal.ts` — guarded valid/expired session issue, demo-only revoke, and exact 30-save throttle preparation.
- `convex/rsvps.test.ts` — 43 backend tests covering policy, privacy, scope, atomicity, idempotence, limits, and deadline independence.
- `convex/_generated/api.d.ts` — Convex-generated internal/public API declarations; never hand-authored.

## Decisions Made

- Treat phone as a low-entropy lookup key only. It never becomes an account, persistent login, admin credential, or post-unlock authorization value.
- Use a browser-supplied high-entropy token so raw capability material is never generated, stored, returned, or logged by a public server function.
- Keep optional contact shared at the invitation level, but return it only after capability validation and mutate it only through explicit tri-state intent.
- Keep 30 September informational in backend policy; save authorization depends only on token validity, scope, payload validity, and rate limits.
- Leave expired session rows for lazy rejection; the existing expiry index is the future cleanup seam, with no Phase 3 cron.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected the ambiguous legacy-phone test fixture**

- **Found during:** Task 2 (scoped phone unlock)
- **Issue:** The initial legacy value in the ambiguity fixture did not represent the inverse ninth-digit candidate for the submitted current number, so it did not exercise the intended fail-closed branch.
- **Fix:** Corrected the synthetic legacy number and retained the count/rate assertions around the ambiguous lookup.
- **Files modified:** `convex/rsvps.test.ts`
- **Verification:** The ambiguity case returns generic `not_found`, creates no session/domain row, and reaches the shared 5/6 limiter boundary.
- **Committed in:** `899ddc4`

**2. [Rule 3 - Blocking] Removed Node-only token construction and corrected Convex document typing**

- **Found during:** Task 2 real build/Convex boundary verification
- **Issue:** Test token construction relied on `Buffer` despite the project intentionally not exposing Node globals, and the first family-view draft used an invalid generated document type form.
- **Fix:** Reused the Web-compatible `encodeOpaqueToken` helper with `Uint8Array`/`DataView` and typed the view input as `Doc<'rsvps'>`.
- **Files modified:** `convex/rsvps.test.ts`, `convex/rsvps.ts`, `convex/rsvpSecurity.ts`
- **Verification:** Full TypeScript/Vite build and the subsequent `npx convex dev --once` both passed.
- **Committed in:** `899ddc4`

---

**Total deviations:** 2 auto-fixed (1 test-fixture bug, 1 blocking runtime/type boundary).
**Impact on plan:** Both corrections strengthen the planned security tests and Web/Convex compatibility; no product or API scope changed.

## Issues Encountered

None remaining. The independent read-only security review reported no findings after rerunning all 43 RSVP backend tests, the build, public-surface inspection, and diff checks.

## Residual Risk

Phone remains intentionally low entropy and possession-based. Generic failures, per-phone/global mutation limits, and immediate replacement with a 256-bit capability reduce enumeration risk but cannot make a phone number equivalent to strong identity proof. The capability is therefore short-lived, family-scoped, and never grants `/admin` authority.

## User Setup Required

None. The existing connected Convex development deployment accepted the functions and regenerated declarations through official tooling.

## Next Phase Readiness

- Plan 03-03 can bind the stable three-function API to the `/confirmar` frontend and keep the raw capability only in browser `sessionStorage`, matching the requested browser-session memory.
- The guarded internal preparation seam is ready for plan 03-05 to prove browser call 31 is throttled after exactly 30 successful saves.
- Admin search/edit by phone remains deliberately reserved for Phase 6 and cannot be authorized by an RSVP capability.

## Self-Check: PASSED

- All six claimed implementation/test files exist and all six TDD commits are present.
- Exact filters passed: Task 1 **8**, Task 2 **19**, and Task 3 **26** tests; full suite **4 files / 123 tests** passed.
- `npm run build`, `npx convex dev --once`, source privacy/deadline scans, function-surface inspection, and `git diff --check` passed.
- The public function specification contains exactly `unlockByPhone`, `getCurrent`, and `saveResponses`; all demo helpers are internal.
- An independent security review found no correctness or security findings.

---
*Phase: 03-rsvp*
*Completed: 2026-07-24*
