---
phase: 05-mural-de-mem-rias-modera-o
plan: 01
subsystem: database
tags: [convex, storage, rate-limiter, security, vitest]

requires:
  - phase: 01-funda-o-design-system-deploy
    provides: "Convex schema/runtime and generated declarations"
  - phase: 03-rsvp
    provides: "Deploy-safe convex-test harness, official rate-limiter component, and capability hashing conventions"
provides:
  - "Additive posts and postUploadReservations schema with moderation and ownership indexes"
  - "Bounded plain-text, canonical capability, purpose-separated hash, and exact post rate-limit contracts"
  - "Real-byte JPEG/PNG/WebP validation with HEIC/HEIF recognition and a strict 5 MiB boundary"
  - "Deploy-safe Phase 5 Convex harness and 25 focused Wave 0 tests"
affects: [05-02-public-memory-pipeline, 05-03-memory-composer, 05-04-memory-carousel, 06-admin]

tech-stack:
  added: []
  patterns:
    - "Test-only module discovery and component registration are injected into deploy-safe Convex harness factories."
    - "Anonymous capabilities and fairness keys are canonical 32-byte base64url values hashed with separate purpose domains."
    - "Storage metadata is never authoritative; accepted media requires MIME and real magic-byte agreement."

key-files:
  created:
    - convex/postModel.ts
    - convex/postSecurity.ts
    - convex/postRateLimits.ts
    - convex/uploadValidation.ts
    - convex/postTest.ts
    - convex/posts.test.ts
    - convex/uploadValidation.test.ts
  modified:
    - convex/schema.ts
    - convex/_generated/api.d.ts

key-decisions:
  - "Author remains undefined when omitted; the public fallback stays outside persistence."
  - "Messages are normalized as plain text and limited by Unicode code points after CRLF normalization and trim."
  - "Raw HEIC/HEIF is recognized but rejected with a conversion-specific result; only JPEG, PNG, and WebP can be final media."
  - "The live schema was extended additively after two parallel-work reconciliations; no Phase 4 wine table existed at either boundary."

patterns-established:
  - "Memory text contract: 280 message code points, 60 author code points, tabs/newlines allowed, other C0/C1 controls rejected."
  - "Upload contract: 5 MiB inclusive maximum, MIME/signature equality, typed raw-HEIC rejection."
  - "Reservation contract: 24-hour TTL, 15-second validation retry cooldown, explicit awaiting/processing/accepted/rejected/expired states."

requirements-completed: [WALL-01, WALL-02, WALL-03, WALL-04, WALL-05]

coverage:
  - id: D1
    description: "Deploy-safe Phase 5 Convex harness executes the live schema and official rate-limiter component."
    requirement: WALL-05
    verification:
      - kind: integration
        ref: "convex/posts.test.ts#Phase 5 Convex harness"
        status: pass
    human_judgment: false
  - id: D2
    description: "Plain-text normalization, capability hashing, retry rounding, and exact device/global policies are executable at their boundaries."
    requirement: WALL-03
    verification:
      - kind: unit
        ref: "convex/posts.test.ts#memory text domain, post capabilities, post rate policy"
        status: pass
    human_judgment: false
  - id: D3
    description: "JPEG, PNG, and WebP require matching real bytes and MIME at or below 5 MiB; spoofed, truncated, mismatched, oversized, and raw HEIC/HEIF inputs are rejected."
    requirement: WALL-02
    verification:
      - kind: unit
        ref: "convex/uploadValidation.test.ts#image magic-byte detection and final image validation"
        status: pass
    human_judgment: false
  - id: D4
    description: "The additive post/reservation schema accepts photo, message, and combined shapes, rejects invalid literals, and exposes status/storage/reservation/expiry indexes."
    requirement: WALL-01
    verification:
      - kind: integration
        ref: "convex/posts.test.ts#post and upload reservation schema"
        status: pass
      - kind: integration
        ref: "npx convex dev --once"
        status: pass
    human_judgment: false
  - id: D5
    description: "Wave 0 provides the approved-only index boundary without exposing a public projection or moderation writer."
    requirement: WALL-04
    verification:
      - kind: other
        ref: "convex/schema.ts source inspection and absence of public posts module"
        status: pass
    human_judgment: true
    rationale: "The executable approved-only payload/privacy proof belongs beside the real listApproved handler in plan 05-02."

duration: 4min
completed: 2026-07-25
status: complete
---

# Phase 5 Plan 1: Memory Domain and Security Foundation Summary

**Convex now has additive moderated-memory tables, bounded anonymous-input primitives, real image-signature validation, and a deploy-safe 25-test Wave 0 harness.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-25T00:24:03Z
- **Completed:** 2026-07-25T00:27:55Z
- **Tasks:** 3/3
- **Files modified:** 9

## Accomplishments

- Added `posts` and `postUploadReservations` without changing RSVP tables or indexes, including `by_status`, storage ownership, reservation ownership, and expiry seams.
- Centralized the exact text, capability, TTL/cooldown, rate-limit, media type, and final byte-size contracts that the public pipeline will consume.
- Added pure adversarial validation for real JPEG/PNG/WebP bytes, spoofing, truncation, MIME mismatch, 5 MiB exact/+1 boundaries, and typed HEIC/HEIF rejection.
- Regenerated declarations through Convex tooling and proved the live development deployment accepts all five new indexes.

## Task Commits

Each task was committed atomically:

1. **Task 1: Establish the deploy-safe Phase 5 harness smoke** — `269f2c9` (test)
2. **Task 2: Implement bounded text, capability, limiter, and real-byte validation primitives** — `16d0d46` (feat)
3. **Task 3: Merge the additive post/reservation schema and regenerate safely** — `0de5dd0` (feat)

**Plan metadata:** this summary is committed in the final plan update.

## Files Created/Modified

- `convex/postModel.ts` — validators, types, limits, Unicode counting, and shared memory-text normalization.
- `convex/postSecurity.ts` — canonical 32-byte base64url validation and purpose-separated SHA-256 hashes.
- `convex/postRateLimits.ts` — exact upload/text device and global policies plus safe retry rounding.
- `convex/uploadValidation.ts` — pure JPEG/PNG/WebP/HEIC/HEIF byte detection and final validation verdicts.
- `convex/postTest.ts` — deploy-safe dependency-injected Convex harness.
- `convex/posts.test.ts` — harness, text, security, limiter, schema, and index tests.
- `convex/uploadValidation.test.ts` — adversarial binary fixture matrix.
- `convex/schema.ts` — additive post and upload-reservation tables.
- `convex/_generated/api.d.ts` — tool-generated declarations for the new deploy modules.

## Exact Contracts

- Message: `280` Unicode code points after CRLF-to-LF normalization and trim.
- Optional author: `60` Unicode code points; omission remains `undefined`.
- Controls: tab and newline permitted; remaining C0/C1 controls rejected.
- Final image: JPEG, PNG, or WebP; MIME and magic bytes must agree; `5 * 1024 * 1024` bytes accepted and `+1` rejected.
- Raw HEIC/HEIF: recognized and returned as `heic_requires_conversion`.
- Capability/device key: canonical unpadded 32-byte base64url, hashed with distinct `post-capability` and `post-device-key` domains.
- Reservation: exact `24h` TTL and `15s` validation retry cooldown.
- Upload rate: device token bucket `10/10min`, capacity `4`; global fixed window `300/h`.
- Text rate: device token bucket `20/h`, capacity `5`; global fixed window `600/h`.
- Retry conversion: positive whole seconds using `Math.ceil(milliseconds / 1000)`.

## Schema and Concurrency Contract

- One `posts` row represents one photo, one message, or both; later centralized writers enforce at least one content field and initial `pendente`.
- Reservation states are `awaiting_upload`, `processing`, `accepted`, `rejected`, and `expired`.
- `by_storage_id` and `by_upload_reservation` establish ownership seams for idempotent finalization and defensive cleanup.
- Plan 05-02 owns the executable one-reservation/one-post race, duplicate action/finalization, expiry, orphan sweep, rate consumption, and approved-only projection proofs alongside their real handlers.

## Parallel Phase 4 Reconciliation

- `convex/schema.ts`, generated files, status, and diffs were re-read immediately before the additive patch and again immediately before `npx convex dev --once`.
- The live schema contained only RSVP tables at both boundaries; no wine table was available to merge.
- RSVP definitions remained byte-for-byte unchanged in the schema diff.
- `convex/_generated/api.d.ts` changed only through successful Convex generation. A separate Phase 4 planning commit landed between Phase 5 task commits and did not overlap these files.

## Verification

- `npm test -- convex/posts.test.ts` — 13/13 passed.
- `npm test -- convex/posts.test.ts convex/uploadValidation.test.ts` — 25/25 passed.
- `npm test` — 9 files, 208/208 passed.
- `npm run build` — TypeScript and Vite production build passed.
- `npx convex dev --once` — development deployment prepared successfully; all five indexes were added on the first run and the final smoke exited 0.
- Source scans for skipped/focused tests, deploy-side `import.meta`, `dangerouslySetInnerHTML`, and `Math.random` — passed.
- `git diff --check` — passed.

## Decisions Made

- Kept post security isolated from RSVP security to preserve Phase 3 behavior and scope types.
- Used purpose-separated hashes for both reservation capability and anonymous fairness key; neither raw value is persisted or used as identity.
- Required full PNG signature and minimum structural lengths for other signatures so truncated headers do not classify as images.
- Kept cross-field and pending-first rules out of schema-only assumptions; centralized writers and stateful tests land together in 05-02.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Convex emitted its informational “AI files are not installed” notice, but schema analysis, index deployment, and code generation completed successfully.

## User Setup Required

None - the existing development deployment was already authenticated and configured.

## Next Phase Readiness

- Ready for plan 05-02 to implement text submission, upload reservation/claim/validation/finalization, approved-only projection, and cleanup against these exact contracts.
- No handler, moderation UI, telão, QR, Instagram, or public storage URL was introduced in Wave 0.

## Self-Check: PASSED

- All eight declared key artifacts exist.
- Three task commits matching `05-01` exist.
- Every task acceptance command and the plan-level focused/full/build/Convex/diff gates passed after the production commits.
- All applicable high-severity Wave 0 threat proofs are green; stateful handler proofs remain explicitly assigned to 05-02 rather than being mocked prematurely.

---
*Phase: 05-mural-de-mem-rias-modera-o*
*Completed: 2026-07-25*
