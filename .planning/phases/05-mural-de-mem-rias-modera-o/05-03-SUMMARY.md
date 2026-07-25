---
phase: 05-mural-de-mem-rias-modera-o
plan: 03
subsystem: ui
tags: [react, convex, canvas, xhr, uploads, accessibility, vitest]

requires:
  - phase: 05-mural-de-mem-rias-modera-o
    plan: 02
    provides: "Secure public memory API, validated storage pipeline, and accepted-only submission status"
provides:
  - "Bounded browser image processing for JPEG/PNG/WebP and capability-probed HEIC/HEIF"
  - "Canonical anonymous fairness keys, in-memory reservation capabilities, and progress-aware XHR uploads"
  - "Explicit memory draft/transport state machine with preserved retry and accepted-only reset"
  - "Accessible one-memory composer, preview controls, progress, rate countdown, retry, and inline approval-pending success"
affects: [05-04-memory-section, 06-admin-moderation]

tech-stack:
  added: []
  patterns:
    - "Browser image processing is an injectable UX/cost boundary; Convex remains authoritative for media validation."
    - "Draft, submission, and transport are separate discriminated states; failures never erase guest work."
    - "Reservation capabilities remain component-memory-only while the persisted random device key is fairness-only."
    - "React renders all guest text ordinarily and success replaces the form only after durable backend confirmation."

key-files:
  created:
    - src/lib/imageProcessing.ts
    - src/lib/imageProcessing.test.ts
    - src/lib/memoryDraft.ts
    - src/lib/memoryDraft.test.ts
    - src/lib/memorySession.ts
    - src/lib/memorySession.test.ts
    - src/lib/uploadBlob.ts
    - src/components/memories/MemoryForm.tsx
    - src/components/memories/PhotoPicker.tsx
    - src/components/memories/SubmissionSuccess.tsx
  modified: []

key-decisions:
  - "HEIC/HEIF uses native browser decode capability only; unsupported devices receive actionable JPEG export guidance and raw HEIC is never uploaded."
  - "Encoding attempts are bounded at 2560px/0.85, 2560px/0.75, then 2048/1600/1280/1024px at 0.75 until the result is at most 5 MiB."
  - "A validation status still processing after 16 seconds becomes a retryable delayed state that reuses the uploaded reservation and backend idempotency seam."
  - "Text submission success follows the mutation's durable submitted result; photo success requires accepted from claim or capability-scoped status."
  - "Server-provided retry seconds are used directly, clamped only to a positive minimum, and re-enable submission exactly at zero."

requirements-completed: [WALL-01, WALL-02, WALL-03, WALL-04, WALL-05]

coverage:
  - id: D1
    description: "Images are bounded before decode, orientation-aware where supported, proportionally reduced, re-encoded as JPEG, and resource-cleaned across success and failure."
    requirement: WALL-02
    verification:
      - kind: unit
        ref: "src/lib/imageProcessing.test.ts#processMemoryImage"
        status: pass
    human_judgment: false
  - id: D2
    description: "The client state machine accepts photo, recado, or both; preserves every recoverable draft/transport stage; and clears only photo/message after accepted."
    requirement: WALL-01
    verification:
      - kind: unit
        ref: "src/lib/memoryDraft.test.ts#memory submission preservation"
        status: pass
      - kind: integration
        ref: "convex/posts.test.ts#retry|concurrent|status"
        status: pass
    human_judgment: false
  - id: D3
    description: "Anonymous fairness and upload helpers use canonical random keys, blocked-storage recovery, stable upload errors, and real clamped XHR progress."
    requirement: WALL-05
    verification:
      - kind: unit
        ref: "src/lib/memorySession.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "The accessible composer provides one-photo preview/replace/remove, Unicode counter, explicit progress/retry states, and inline approval-pending success with retained author."
    requirement: WALL-03
    verification:
      - kind: command
        ref: "npm run build"
        status: pass
      - kind: command
        ref: "source prohibition scans"
        status: pass
    human_judgment: true
    rationale: "Keyboard/focus feel, real network progress, browser codec behavior, and the complete visual flow require browser UAT after the section is mounted in 05-04."
  - id: D5
    description: "HEIC/HEIF is attempted only through real browser capability and falls back without losing text or making an upload request."
    requirement: WALL-02
    verification:
      - kind: unit
        ref: "src/lib/imageProcessing.test.ts#maps an unsupported HEIC decoder"
        status: pass
    human_judgment: true
    rationale: "Successful HEIC conversion remains a mandatory Safari iOS real-device smoke; Node adapters deliberately do not claim phone codec equivalence."

duration: 8min
completed: 2026-07-25
status: complete
---

# Phase 5 Plan 3: Resilient Guest Memory Composer Summary

**Guests can now prepare and submit one photo, one recado, or both through a bounded, retryable, accessible client protocol that resets only after durable acceptance.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-25T00:44:44Z
- **Completed:** 2026-07-25T00:51:48Z
- **Tasks:** 3/3
- **Files modified:** 10

## Accomplishments

- Added native capability-aware image decode, proportional downscale, canonical JPEG encoding, bounded quality/edge retries, and guaranteed bitmap/object-URL cleanup.
- Added canonical random device/capability helpers plus XHR upload progress and stable non-leaking transport errors.
- Added a pure draft/submission/transport state machine covering Unicode limits, all interruption points, safe retry reuse, one token-conflict regeneration, and author-preserving accepted reset.
- Added an accessible one-memory form with whole-image preview, replace/remove controls, processing/upload/validation states, server-derived rate countdown, preserved retry, and inline “aguarda aprovação” confirmation.

## Task Commits

1. **Task 1: Image processing, session, and upload helpers** — `9d77ef7`
2. **Task 2: Draft/transport reducer and retry invariants** — `326d33f`
3. **Task 3: Accessible composer and success surfaces** — `e0a0c02`
4. **Task 3 boundary expansion and countdown correction** — `3a15ae7`, `faac2d8`
5. **Parallel commit isolation repair** — `eb2a69b`

## Exact Image and Session Contracts

- Original images above `30 MiB` fail before decode.
- The longest edge never upscales and is capped first at `2560px`.
- Encoding attempts are: `2560/0.85`, `2560/0.75`, then `2048`, `1600`, `1280`, and `1024` at `0.75`.
- The first JPEG at or below `5 MiB` is accepted; exhausting the bounded attempts returns a typed size error.
- JPEG, PNG, and WebP follow the common path. HEIC/HEIF is decoded only when the browser actually supports it; failure gives iPhone-oriented JPEG export guidance and never uploads the raw file.
- Device fairness keys and reservation capabilities are canonical unpadded base64url encodings of 32 cryptographic bytes.
- Only the fairness key is persisted under a versioned localStorage key. A reservation capability remains in component memory and is never logged or placed in a URL/query.

## Draft, Retry, and Reset Contract

- Draft, submission, and transport are independent discriminated structures.
- Valid content shapes are photo-only, message-only, and both; empty content is blocked.
- Author and message use the same 60/280 Unicode code-point bounds and control-character policy as the server.
- Processing, upload, claim, validation, rate, and network failures preserve author, message, original file, processed blob, preview, and every still-safe reservation/storage field.
- Expiry, invalid capability, rejected media, and storage conflict clear only unsafe transport so the preserved draft can start a fresh reservation.
- A token collision permits one fresh capability attempt and then fails closed.
- A stuck processing status becomes retryable after 16 seconds; retry reclaims the same uploaded reservation so the backend's 15-second idempotent requeue seam can run.
- Only durable text `submitted` or photo `accepted` clears message/photo/transport. The author remains unchanged.

## Form and Accessibility Behavior

- The picker has no `multiple`, crop, reposition, filename, or EXIF interface.
- Preview uses only a local object URL and `object-contain`; replacement, removal, accepted success, and unmount revoke it.
- Persistent labels and composed hint/counter/status IDs feed `aria-describedby`.
- Errors use `role="alert"`; processing and confirmation use polite `role="status"`.
- Upload exposes real XHR percentage; server validation is a separate non-numeric state.
- `busyRef` closes the same-render duplicate-submit window before React state updates.
- Rate-limit retry remains disabled until the authoritative whole-second countdown reaches zero, with no lifetime count or product ceiling.
- Inline success states that the memory “aguarda aprovação” and offers the literal “Enviar outra memória”.

## Verification

- Task 1 focused gate — 27/27 passed at commit boundary.
- Task 2 reducer gate — 17/17 passed initially; expanded suite is 24/24.
- Final client focused gate — 3 files, 51/51 passed.
- Backend regression — `convex/posts.test.ts`, 44/44 passed.
- Full repository suite — 13 files, 303/303 passed.
- `npm run build` — TypeScript and Vite production build passed.
- Prohibition scans for `dangerouslySetInnerHTML`, `console.log`, `multiple`, pending `imageUrl` access, and `Math.random` — passed.
- `git diff --check` — passed.

## Decisions Made

- Kept browser processing explicitly subordinate to backend metadata and real-byte validation.
- Used the existing Convex reactive query for capability-scoped status instead of inventing client polling endpoints.
- Represented retryable validation delay separately from rejection so a slow scheduled action can be safely re-requested.
- Kept all user-facing draft text as ordinary React children with no sanitizer dependency.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Cleared rejected upload transport before retry**

- **Found during:** Task 3 protocol review.
- **Issue:** Retaining an uploaded transport after terminal backend rejection would make “Tentar novamente” reclaim the same rejected reservation forever.
- **Fix:** Rejection and storage conflict now clear only unsafe transport while retaining the original file, processed JPEG, preview, author, and message.
- **Files modified:** `src/components/memories/MemoryForm.tsx`.
- **Verification:** focused client/backend gates and build pass.
- **Committed in:** `e0a0c02`.

**2. [Rule 1 - Bug] Added recovery for stuck processing status**

- **Found during:** Task 3 retry review.
- **Issue:** A validation action stuck in `processing` had no UI route back to the backend's planned 15-second requeue seam.
- **Fix:** After 16 seconds, validation becomes a preserved retryable state; retry resubmits the same reservation/storage claim.
- **Files modified:** `src/components/memories/MemoryForm.tsx`, `src/lib/memoryDraft.ts`.
- **Verification:** focused reducer/backend retry gates and build pass.
- **Committed in:** `e0a0c02`.

**3. [Rule 1 - Bug] Made default localStorage access catchable**

- **Found during:** Task 3 blocked-storage audit.
- **Issue:** Reading `globalThis.localStorage` in a default parameter could throw before the helper's `try/catch`.
- **Fix:** Resolve the global storage object inside the guarded function body and retain a page-memory fallback.
- **Files modified:** `src/lib/memorySession.ts`.
- **Verification:** malformed/blocked storage tests and build pass.
- **Committed in:** `e0a0c02`.

**4. [Rule 3 - Blocking] Recovered from a shared-checkout commit race additively**

- **Found during:** Task 3 test-boundary expansion.
- **Issue:** Phase 4 advanced `HEAD` between staging and an amend, causing the staged Phase 5 test delta to be included in the new Phase 4 commit.
- **Fix:** Without reset, stash, checkout, or rewriting Phase 4, commit `eb2a69b` removed that delta and `3a15ae7` reintroduced it under an explicit Phase 5 commit. Only `src/lib/memoryDraft.test.ts` was touched by the repair.
- **Verification:** the repair boundary has zero net diff from `e0a0c02`; the following Phase 5 test commit contains the intended boundary cases; full suite/build pass.
- **Committed in:** `eb2a69b`, `3a15ae7`.

**5. [Rule 1 - Bug] Preserved authoritative server retry seconds**

- **Found during:** Final precision review.
- **Issue:** Defensive client `Math.ceil` could alter a value even though the backend already guarantees positive whole seconds.
- **Fix:** Use the server value directly, clamping only the impossible non-positive case to one.
- **Files modified:** `src/lib/memoryDraft.ts`, `src/lib/memoryDraft.test.ts`, `src/components/memories/MemoryForm.tsx`.
- **Verification:** exact 1-to-0 countdown test, focused reducer suite, and build pass.
- **Committed in:** `faac2d8`.

---

**Total deviations:** 5 auto-fixed (4 bugs, 1 blocking parallel-write race).  
**Impact:** All fixes strengthened the planned security/retry contract. No Phase 4 source or planning artifact was edited, staged, deleted, or reset by this executor.

## Issues Encountered

- The full suite was briefly red while parallel Phase 4 tests referenced an in-progress `wineInternal.ts`; after that parallel file landed, the same full command passed 303/303. No Phase 4 failure was modified by this plan.
- Real HEIC/HEIF success remains intentionally unverified in Node.

## User Setup Required

None.

## Next Phase Readiness

- Plan 05-04 can mount `MemoryForm` below the approved-memory carousel and run the complete browser UAT.
- Mandatory manual gates remain: Safari iOS HEIC/HEIF conversion/fallback, throttled real XHR progress/retry preservation, whole-image preview controls, keyboard/focus, and accepted-only inline success.
- The composer has no dependency on Phase 4 integration files and the checkout is clean at summary creation.

## Self-Check: PASSED

- All ten declared artifacts exist.
- Six commits matching `05-03` exist, including the additive shared-checkout repair.
- Every task acceptance command, focused client/backend gate, full suite, build, source prohibition scan, and diff check passed.
- Manual-only Safari iOS and integrated browser-flow checks remain explicitly routed to 05-04 UAT rather than falsely claimed as automated.

---
*Phase: 05-mural-de-mem-rias-modera-o*
*Completed: 2026-07-25*
