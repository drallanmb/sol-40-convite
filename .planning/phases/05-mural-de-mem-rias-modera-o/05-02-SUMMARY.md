---
phase: 05-mural-de-mem-rias-modera-o
plan: 02
subsystem: api
tags: [convex, storage, rate-limiter, moderation, security, cron]

requires:
  - phase: 05-mural-de-mem-rias-modera-o
    plan: 01
    provides: "Post/reservation schema, capability hashing, rate policies, byte validation, and Convex test harness"
provides:
  - "Five-function public memory API for text, upload reservation/claim/status, and approved-only reads"
  - "Metadata-plus-real-byte JPEG/PNG/WebP validation with idempotent pending-post finalization"
  - "Exact 24-hour reservation expiry and bounded daily orphan-storage cleanup"
  - "239-test green repository with real Convex function analysis and generated declarations"
affects: [05-03-memory-composer, 05-04-memory-carousel, 06-admin]

tech-stack:
  added: []
  patterns:
    - "Anonymous storage cost is gated by transactional global and hashed-device limits before upload URL generation."
    - "Public photo submission is a capability-scoped reservation state machine finalized only by internal byte validation."
    - "Storage cleanup uses old-only paginated system-table reads and checks every live ownership index before deletion."

key-files:
  created:
    - convex/posts.ts
    - convex/postInternal.ts
    - convex/crons.ts
  modified:
    - convex/posts.test.ts
    - convex/postSecurity.ts
    - convex/_generated/api.d.ts

key-decisions:
  - "Photo success is the durable accepted reservation state; processing remains retryable progress and exposes no post/storage identifiers."
  - "The daily sweep processes 50 storage rows per internal mutation, chains continuations internally, and treats only blobs strictly older than 24 hours as eligible."
  - "Only posts and postUploadReservations own storage in the live schema; both indexed ownership checks protect the sweep."
  - "The public gallery is capped at 100 approved rows and applies the anonymous author fallback only in its purpose-built projection."

patterns-established:
  - "Public memory API: requestUpload, submitPhotoMemory, getSubmissionStatus, submitTextMemory, and listApproved only."
  - "Internal media pipeline: read -> action byte validation -> idempotent accept/reject, with a 15-second stuck-processing requeue cooldown."
  - "Invalid media is deleted when present and represented externally only by a stable safe error code."

requirements-completed: [WALL-01, WALL-02, WALL-03, WALL-04, WALL-05]

coverage:
  - id: D1
    description: "Text-only memories normalize plain text, enforce 280/60 code-point bounds, consume coherent device/global limits, and create one pending post."
    requirement: WALL-03
    verification:
      - kind: integration
        ref: "convex/posts.test.ts#public text memories"
        status: pass
    human_judgment: false
  - id: D2
    description: "Photo uploads are cost-gated before URL creation and require capability ownership, metadata allowlisting, and real-byte JPEG/PNG/WebP validation before one pending post exists."
    requirement: WALL-02
    verification:
      - kind: integration
        ref: "convex/posts.test.ts#photo upload reservation and validation"
        status: pass
      - kind: unit
        ref: "convex/uploadValidation.test.ts#image magic-byte detection and final image validation"
        status: pass
    human_judgment: false
  - id: D3
    description: "Duplicate claims, repeated finalization, parallel retries, and 15-second recovery converge to one reservation, storage owner, and post."
    requirement: WALL-01
    verification:
      - kind: integration
        ref: "convex/posts.test.ts#makes duplicate claim and finalization converge to the same accepted post"
        status: pass
      - kind: integration
        ref: "convex/posts.test.ts#requeues stuck processing only at the cooldown boundary"
        status: pass
    human_judgment: false
  - id: D4
    description: "Public reads expose only approved minimal views; capability status exposes only safe discriminated states and accepted is the sole success state."
    requirement: WALL-04
    verification:
      - kind: integration
        ref: "convex/posts.test.ts#approved public projection"
        status: pass
      - kind: integration
        ref: "convex/posts.test.ts#does not reveal submission state to a different capability"
        status: pass
    human_judgment: false
  - id: D5
    description: "Exact reservation expiry and the daily 50-row paginated sweep delete only old unowned storage while preserving post and reservation owners."
    requirement: WALL-05
    verification:
      - kind: integration
        ref: "convex/posts.test.ts#post storage expiry and orphan cleanup"
        status: pass
      - kind: integration
        ref: "npx convex dev --once"
        status: pass
    human_judgment: false

duration: 11min
completed: 2026-07-25
status: complete
---

# Phase 5 Plan 2: Secure Memory Backend Summary

**Anonymous memories now have a five-function Convex API, validated three-step photo pipeline, approved-only projection, and bounded storage lifecycle.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-07-25T00:29:30Z
- **Completed:** 2026-07-25T00:40:18Z
- **Tasks:** 3/3
- **Files modified:** 6

## Accomplishments

- Added rate-limited text submission and photo reservation/claim/status APIs that create only `pendente` guest posts.
- Added internal real-byte validation and idempotent accept/reject finalization for JPEG, PNG, and WebP, including deletion and stable errors for invalid media.
- Added an approved-only minimal public projection and exact public function inventory with no moderation or cleanup primitive exposed anonymously.
- Added exact 24-hour expiry plus a daily, internally chained, 50-row orphan sweep protecting every live storage owner.
- Regenerated declarations with Convex tooling and passed real development deployment analysis.

## Task Commits

Each task was committed atomically:

1. **Task 1: Rate-limited text creation and approved-only projection** — `6b8a21d`
2. **Task 2: Reservation, metadata claim, byte validation, and finalization** — `24945e2`
3. **Task 3: Expiry, orphan cleanup, cron, and generated API** — `8ebdd06`

**Plan metadata:** this summary is committed in the final plan update.

## Public and Internal Contracts

The public `posts` module exposes exactly:

- `requestUpload`
- `submitPhotoMemory`
- `getSubmissionStatus`
- `submitTextMemory`
- `listApproved`

Validation, accept/reject, expiry, and sweep functions are `internalQuery`, `internalAction`, or `internalMutation` exports in `postInternal.ts`. There is no public moderation, pending/hidden listing, storage listing, or cleanup function.

`getSubmissionStatus` returns only `awaiting_upload`, `processing`, `accepted`, `rejected` with a safe code, `expired`, or `invalid_capability`. It returns no storage ID, post ID/document, bearer URL, moderation status, device hash, or capability hash. Only `accepted` is durable UI success.

## Exact Limiter, Expiry, and Retry Behavior

- Upload device bucket: token bucket `10/10 min`, capacity `4`.
- Upload global breaker: fixed window `300/hour`.
- Text device bucket: token bucket `20/hour`, capacity `5`.
- Text global breaker: fixed window `600/hour`.
- Every applicable scope is checked before either is consumed; denial happens before reservation or URL generation.
- Retry seconds are positive whole seconds via `max(1, ceil(maxRetryMs / 1000))`.
- Reservation expiry is exactly `24 hours`; pre-boundary is active and boundary/+1 are expired.
- A `processing` claim may schedule validation again only at or after `15 seconds`; `-1` does not fan out.
- Rate windows refill normally and no lifetime/person submission counter exists.

## Image Validation Matrix

- Accepted after metadata and real-byte agreement: JPEG, PNG, WebP.
- Final server boundary: exactly `5 MiB` accepted, `+1 byte` rejected and deleted.
- Rejected/deleted: absent storage, missing/unsupported metadata, HTML, PDF/unknown bytes, MIME spoof/mismatch, empty data, oversize, and raw HEIC/HEIF.
- Raw HEIC/HEIF remains an actionable conversion error rather than a post.
- `convex-test` omits upload `contentType` in its `_storage` mock, so tests patch only system-table fixture metadata to reproduce the real backend contract; blob bytes still flow through actual mock storage/actions.

## Retry and Idempotency Proof

- Duplicate/parallel claims for the same reservation and storage return `processing` without rebinding.
- A different storage ID cannot steal a processing reservation.
- Repeated validation/accept returns the original post ID and the database retains exactly one post.
- Reject/expire deletion first re-checks state, post ownership, and storage existence, so repeated delivery is safe.
- Interrupted `processing` work is recoverable through the exact 15-second requeue seam.

## Cleanup Ownership Policy

- Per-reservation expiration deletes known non-post-owned storage at/after 24 hours and is idempotent for rejected/expired/missing blobs.
- Accepted reservations and any post-owned blob survive expiration.
- The daily cron starts `sweepOrphanStorage` at `03:15 UTC`.
- Each internal sweep mutation paginates at 50 `_storage` rows and schedules an internal continuation when needed.
- Only blobs strictly older than 24 hours and referenced by neither `posts.by_storage_id` nor `postUploadReservations.by_storage_id` are deleted.
- Live schema/source audit found no other storage-owning table; Phase 4 had introduced no storage owner at generation time.

## Public Projection

`listApproved` reads `posts.by_status` with `status === "aprovado"` and `take(100)` before any call to `storage.getUrl`. It returns only `{ id, author, message?, imageUrl?, createdAt }`. Pending and hidden documents never enter the mapping step, and omitted authors become the exact public literal `De alguém que te ama` without changing persistence.

## Generated Provenance and Parallel Safety

- `convex/schema.ts`, `convex/crons.ts`, package files, storage-owner source, and `_generated` diffs were re-read immediately before generation and again before the task commit.
- The live schema contained only RSVP and Phase 5 tables; Phase 4 had no schema or storage-owner addition to merge.
- `convex/_generated/api.d.ts` was changed only by successful `npx convex dev --once`; generated files were not hand-edited.
- Concurrent Phase 4 planning files and `04-VALIDATION.md` changes were left unstaged and untouched.

## Verification

- Task 1 focused gate — 14 passed.
- Task 2 focused gate — 31 passed.
- Task 3 focused gate — 10 passed.
- Full suite — 9 files, 239/239 passed.
- `npx tsc -p convex/tsconfig.json --noEmit` — passed.
- `npm run build` — passed.
- `npx convex dev --once` — development deployment prepared successfully; 21 Convex functions ready.
- Public export/source inventory — exactly five planned public functions.
- `git diff --check` — passed.

## Decisions Made

- Kept cleanup internal and ownership-aware rather than exposing operational controls or assuming all unreferenced storage is immediately disposable.
- Used a bounded continuation chain so each cleanup transaction remains small while the daily run can cover more than one page.
- Kept stable error codes deliberately metadata-free; raw validation details remain server-side.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected canonical 32-byte base64url validation**

- **Found during:** Task 1 global limiter boundary fixtures
- **Issue:** The Phase 5 foundation regex accepted only four possible final base64url characters, rejecting valid 32-byte capabilities produced by ordinary random bytes.
- **Fix:** Expanded the final-character allowlist to all 16 canonical values and added generated-key regression cases.
- **Files modified:** `convex/postSecurity.ts`, `convex/posts.test.ts`
- **Verification:** Capability tests plus both global limiter boundary suites pass.
- **Committed in:** `6b8a21d`

---

**Total deviations:** 1 auto-fixed (1 bug).
**Impact on plan:** The fix restores the intended canonical capability contract and prevents random valid client keys from failing. No scope expansion.

## Issues Encountered

- `convex-test` stores size/hash/blob but omits `_storage.contentType`; test fixtures patch that single metadata field so integration tests exercise the same metadata gate as real uploads.
- Repeated expiry initially surfaced a delete-on-missing-storage error in the mock. Finalizers now verify current storage existence before deletion, strengthening the planned idempotency contract.

## User Setup Required

None. The configured Convex development deployment was authenticated and passed the real runtime smoke.

## Next Phase Readiness

- Plan 05-03 can connect browser processing/upload/status polling to the stable public API.
- Plan 05-04 can consume the approved-only minimal gallery payload directly.
- Phase 6 can add authenticated moderation without changing the anonymous public surface.

## Self-Check: PASSED

- All four declared production artifacts exist.
- Three task commits matching `05-02` exist.
- Every task acceptance gate, full suite, Convex TypeScript check, application build, real Convex smoke, public inventory, and diff check passed after production commits.
- All high-severity upload-cost, content-validation, replay, privacy, limiter, cleanup, and internal-surface threats have green automated proof.

---
*Phase: 05-mural-de-mem-rias-modera-o*
*Completed: 2026-07-25*
