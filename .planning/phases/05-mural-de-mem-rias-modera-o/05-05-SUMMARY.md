---
phase: 05-mural-de-mem-rias-modera-o
plan: 05
subsystem: upload-security
tags: [convex, storage, rate-limit, jpeg, png, webp, react, retry, idempotency]

requires:
  - phase: 05-mural-de-mem-rias-modera-o
    plan: 04
    provides: "Public memory album and resilient one-memory composer"
provides:
  - "Indexed bounded upload-capability collision lookup and seven-day terminal reservation retention"
  - "Bounded structural JPEG, PNG, and WebP server validation"
  - "Fresh short-lived upload transport after every upload-stage failure"
  - "Immutable claim snapshots that preserve newer guest edits after ambiguous acceptance"
affects: [06-admin-moderation, phase-5-verification, launch-uat]

tech-stack:
  added: []
  patterns:
    - "Anonymous capability lookup is index-backed and terminal capability rows retire in fixed-size internal pages."
    - "Server media acceptance validates bounded container/image structure after metadata checks."
    - "Each upload attempt owns one short-lived URL; retry always reserves afresh while reusing the processed blob."
    - "Claim acceptance compares a frozen length-prefixed fingerprint with the current draft before clearing UI state."

key-files:
  created:
    - src/lib/memoryUploadAttempt.ts
    - src/lib/memoryUploadAttempt.test.ts
  modified:
    - convex/schema.ts
    - convex/posts.ts
    - convex/posts.test.ts
    - convex/postInternal.ts
    - convex/crons.ts
    - convex/uploadValidation.ts
    - convex/uploadValidation.test.ts
    - src/lib/memoryDraft.ts
    - src/lib/memoryDraft.test.ts
    - src/components/memories/MemoryForm.tsx

key-decisions:
  - "Terminal upload reservations remain for seven days and retire in pages of 50; accepted media is retained only after post ownership is re-verified."
  - "Legacy terminal rows derive terminalAt from expiresAt through a bounded compatibility path."
  - "Structural validation remains dependency-free and bounded by the existing 5 MiB gate, with a sane 16384px dimension ceiling."
  - "The immutable photo identity is the uploaded storage identity kept in component memory; the public confirmation renders only accepted author/message content."

patterns-established:
  - "Retention mutations re-read every candidate immediately before destructive work and reschedule bounded pages."
  - "Length-prefixed canonical fields avoid delimiter ambiguity in deterministic submission fingerprints."
  - "An older accepted snapshot becomes a separate inline confirmation when the visible draft has changed."

requirements-completed: [WALL-02, WALL-05]

coverage:
  - id: D1
    description: "Upload capability collisions use by_token_hash and terminal reservation growth is bounded without deleting accepted media."
    requirement: WALL-05
    verification:
      - kind: integration
        ref: "convex/posts.test.ts#large historical indexed collision and terminal retention"
        status: pass
      - kind: integration
        ref: "npx convex dev --once#indexes and functions ready"
        status: pass
    human_judgment: false
  - id: D2
    description: "Only structurally coherent JPEG, PNG, and WebP payloads can create a pending photo post."
    requirement: WALL-02
    verification:
      - kind: unit
        ref: "convex/uploadValidation.test.ts#bounded structural image validation"
        status: pass
      - kind: integration
        ref: "convex/posts.test.ts#structurally truncated storage is deleted before post creation"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every upload-stage error invalidates its short-lived URL and the next attempt requests a new reservation while preserving the processed blob."
    requirement: WALL-02
    verification:
      - kind: unit
        ref: "src/lib/memoryUploadAttempt.test.ts#fresh memory upload transport orchestration"
        status: pass
      - kind: unit
        ref: "src/lib/memoryDraft.test.ts#failed transport preserves processed draft"
        status: pass
    human_judgment: false
  - id: D4
    description: "Ambiguous claim A remains immutable; acceptance reports A and preserves edited draft B for a fresh submission."
    requirement: WALL-02
    verification:
      - kind: unit
        ref: "src/lib/memoryDraft.test.ts#accepted claim A separately preserves edited draft B"
        status: pass
      - kind: integration
        ref: "convex/posts.test.ts#immutable first claim after lost response and text edits"
        status: pass
      - kind: other
        ref: "npm run build#MemoryForm snapshot-aware confirmation integration"
        status: pass
    human_judgment: false
  - id: D5
    description: "Populated carousel interaction, real browser upload interruption, and Safari iOS HEIC behavior remain pending manual UAT."
    requirement: WALL-02
    verification:
      - kind: manual_procedural
        ref: "05-VERIFICATION.md#Human Verification Required"
        status: unknown
    human_judgment: true
    rationale: "These checks require populated interactive browser state, real network interruption, and a physical Safari iOS codec path."

duration: 8min
completed: 2026-07-25
status: complete
---

# Phase 5 Plan 5: Verified Gap Closure Summary

**Anonymous upload cost is now index-bounded, image bytes receive format-aware structural validation, and photo retries converge through fresh transport plus immutable accepted-content snapshots.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-25T01:27:48Z
- **Completed:** 2026-07-25T01:35:33Z
- **Tasks:** 3/3
- **Files modified:** 12

## Accomplishments

- Closed WR-01 with `by_token_hash`, fixed-size terminal retention, safe accepted-media ownership checks, legacy migration, and large-history/cutoff/pagination tests.
- Closed WR-04 with bounded JPEG marker/SOF/SOS/EOI parsing, PNG chunk/order/dimension/CRC validation, and coherent WebP RIFF/chunk/dimension validation.
- Closed WR-02 by making every network, abort, HTTP, invalid-response, or thrown upload failure terminal for that URL; retry requests a new reservation and reuses the processed blob.
- Closed WR-03 with immutable normalized claim snapshots and collision-safe fingerprints; accepted A never clears or masquerades as edited draft B.

## Task Commits

1. **Task 1 RED: indexed collision and terminal retention regressions** — `f9a3d72`
2. **Task 1 GREEN: bounded reservation lifecycle** — `1712e89`
3. **Task 2 RED: structural image adversarial fixtures** — `be41ae8`
4. **Task 2 GREEN: JPEG/PNG/WebP structural parsers** — `724289e`
5. **Task 3 RED: fresh retry and immutable snapshot regressions** — `998eaf4`
6. **Task 3 GREEN: snapshot-safe upload retry flow** — `0c7b7e4`

## Files Created/Modified

- `convex/schema.ts` — adds capability, terminal-time, and legacy terminal-state indexes.
- `convex/posts.ts` — uses indexed collision lookup and timestamps direct terminal transitions.
- `convex/postInternal.ts` — records terminal time and retires safe candidates after seven days in pages of 50.
- `convex/crons.ts` — appends daily terminal reservation retirement without replacing the storage sweep.
- `convex/uploadValidation.ts` — dependency-free bounded structural parsers for the three supported formats.
- `convex/uploadValidation.test.ts` — real structural fixtures plus malformed lengths, dimensions, ordering, CRC, padding, and terminator cases.
- `convex/posts.test.ts` — large-history, retention, malformed-storage deletion, and immutable A/B backend regressions.
- `src/lib/memoryUploadAttempt.ts` — dependency-injected one-URL-per-attempt upload orchestration.
- `src/lib/memoryUploadAttempt.test.ts` — fresh-reservation traces for all four XHR error kinds.
- `src/lib/memoryDraft.ts` — canonical snapshots, fingerprints, frozen claims, and edited-draft-aware acceptance.
- `src/lib/memoryDraft.test.ts` — processed-blob preservation, exact preview cleanup, and A-accepted/B-retained reducer coverage.
- `src/components/memories/MemoryForm.tsx` — fresh upload attempt integration and accepted-snapshot confirmation without secret identifiers.

## WR-01 Through WR-04 Closure Evidence

| Finding | Closure |
|---|---|
| WR-01 | `requestUpload` performs `withIndex('by_token_hash').take(1)`. A 1,000-row history test proves collision and fresh-token denial without URL/insert. Terminal rows retain for 7 days, sweep in pages of 50, and accepted storage survives reservation deletion. |
| WR-02 | `runFreshMemoryUploadAttempt` owns exactly one reservation/URL. Tests trace two attempts for `network_error`, `aborted`, `http_error`, and `invalid_response`: two reservation calls, distinct URLs, the identical processed Blob. |
| WR-03 | First claim freezes normalized author/message plus storage identity into a length-prefixed fingerprint. Reducer/backend tests prove lost response A, edit B, accepted A confirmation, persisted A, retained B, retained preview, and fresh transport readiness. |
| WR-04 | Prefix-only data now fails. JPEG requires a sane SOF, non-empty scan, and EOI; PNG requires coherent CRC-checked IHDR/IDAT/IEND; WebP requires exact RIFF sizing, bounded padded chunks, and sane VP8/VP8L/VP8X dimensions. |

## Automated and Runtime Verification

- Focused Phase 5 gap suite — **8 files, 164/164 passed**.
- Full repository suite — **17 files, 369/369 passed**.
- Production build — **passed**.
- `npx convex dev --once` — **passed**, including all three new reservation indexes and existing wine functions.
- Secret/raw-HTML/log source prohibition scan — **passed**.
- Indexed-source prohibition scan — **passed**, with no tokenHash table filter.
- Phase 5 commit-range `git diff --check` and all six commit checks — **passed**.

## Phase 4 Preservation

- Phase 4 planning files changed externally during Task 3 and remained unstaged and untouched.
- Schema, cron registration, generated declarations, package files, and status were re-read before shared edits/runtime generation.
- No reset, stash, amend, checkout, broad add, or Phase 4 staging was used.
- The global working-tree `git diff --check` currently reports only an external blank EOF line in `04-05-PLAN.md`; the complete Phase 5 commit range passes cleanly.

## Decisions Made

- Seven days balances bounded capability retention with enough time for delayed status recovery; deletion restores token reuse only after that documented window.
- A 16,384px server dimension ceiling safely exceeds the 2,560px client output while rejecting attacker-declared impossible dimensions.
- PNG CRCs are verified because chunk framing alone would still permit corrupted critical metadata/data to be treated as coherent.
- The client keeps storage identity only as internal snapshot identity and never renders or logs it; accepted confirmation exposes only human author/message content.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Parallel Phase 4 work modified planning files while this plan ran. It did not overlap Phase 5 code and was preserved without staging or rewriting.
- The final global `git diff --check` is red only for the external Phase 4 blank EOF line. A scoped check over every Phase 5 production/test commit and target path is green.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- WR-01 through WR-04 and the WALL-02/WALL-05 code gaps are ready for independent re-verification.
- Manual UAT remains explicitly pending and unchanged:
  1. populated carousel focus/swipe/reduced-motion/200% zoom;
  2. real JPEG/PNG/WebP upload with actual network interruption and one pending post;
  3. Safari iOS HEIC conversion or actionable fallback with retained draft.
- No manual item was marked passed by this plan.

## Self-Check: PASSED

- All twelve declared production/test artifacts exist.
- Six task commits matching `05-05` exist with RED then GREEN ordering for every task.
- Every task acceptance command, focused suite, full suite, build, Convex runtime, source scan, and scoped diff check passed.
- Phase 4 dirty planning files remain unstaged and byte-preserved by this executor.
- Manual browser/device UAT remains classified as pending.

---
*Phase: 05-mural-de-mem-rias-modera-o*
*Completed: 2026-07-25*
