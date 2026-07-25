---
phase: 05-mural-de-mem-rias-modera-o
plan: 05
subsystem: upload-security
tags: [convex, node, sharp, libvips, jpeg, png, webp, storage, rate-limit, react, retry, idempotency]

requires:
  - phase: 05-mural-de-mem-rias-modera-o
    plan: 04
    provides: "Public memory album and resilient one-memory composer"
provides:
  - "Indexed bounded upload-capability collision lookup and cursor-safe seven-day terminal reservation retention"
  - "Bounded real pixel decoding for JPEG, PNG, and WebP before post acceptance"
  - "Fresh short-lived upload transport after every upload-stage failure"
  - "Immutable claim snapshots that preserve newer guest edits after ambiguous acceptance"
affects: [06-admin-moderation, phase-5-verification, launch-uat]

tech-stack:
  added:
    - "sharp 0.35.3/libvips in a Convex Node internal action for bounded pixel decoding"
    - "jpeg-js 0.4.4 as a second bounded production JPEG decoder"
    - "Node zlib maxOutputLength for exact bounded PNG inflation"
    - "fflate and @jsquash PNG/WebP decoders for test-only adversarial fixtures and independent verification"
  patterns:
    - "Anonymous capability lookup is index-backed and terminal capability rows retire in fixed-size internal pages."
    - "Server media acceptance crosses once into a Node internal action, verifies format/MIME, and materializes bounded raw pixels before committing."
    - "Each upload attempt owns one short-lived URL; retry always reserves afresh while reusing the processed blob."
    - "Claim acceptance compares a frozen length-prefixed fingerprint with the current draft before clearing UI state."

key-files:
  created:
    - convex.json
    - convex/postImageDecoder.ts
    - convex/postImageDecoderLib.ts
    - convex/postImageDecoder.test.ts
    - src/test/adversarialImageFixtures.ts
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
    - convex/tsconfig.json
    - package.json
    - package-lock.json
    - src/test/imageFixtures.ts
    - src/lib/memoryDraft.ts
    - src/lib/memoryDraft.test.ts
    - src/components/memories/MemoryForm.tsx

key-decisions:
  - "Terminal upload reservations remain for seven days and retire through an index range plus cursor pages of 50; accepted media is retained only after post ownership is re-verified."
  - "Legacy terminal rows migrate through an independent bounded cursor sweep, so active or invalid-ownership rows cannot create zero-delay loops."
  - "The pure parser is only a 5 MiB/container prefilter; final acceptance requires raw pixel decoding with 2560² input pixels, 2560px per axis, one page, four channels, disabled cache, single concurrency, and a five-second libvips timeout."
  - "PNG inflation uses Node zlib with maxOutputLength set before decode; JPEG also passes jpeg-js with explicit resolution and 32 MiB memory limits."
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
    description: "Only JPEG, PNG, and WebP payloads that materialize bounded real pixels can create a pending photo post."
    requirement: WALL-02
    verification:
      - kind: unit
        ref: "convex/postImageDecoder.test.ts#production image decoder"
        status: pass
      - kind: integration
        ref: "convex/posts.test.ts#review bypass storage is deleted before post creation"
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

**Anonymous upload cost is index-bounded, image acceptance requires bounded real pixel decoding in Convex Node, and photo retries converge through fresh transport plus immutable accepted-content snapshots.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-25T01:27:48Z
- **Completed:** 2026-07-25T01:35:33Z
- **Tasks:** 3 original + 3 reopened closure waves
- **Files modified:** see the complete artifact list below

## Accomplishments

- Closed WR-01 with `by_token_hash`, fixed-size terminal retention, safe accepted-media ownership checks, legacy migration, and large-history/cutoff/pagination tests.
- Closed WR-04 with bounded JPEG marker/SOF/SOS/EOI parsing, PNG chunk/order/dimension/CRC validation, and coherent WebP RIFF/chunk/dimension validation.
- Reclosed WR-04 after independent decoder review: real encoder fixtures now prove small and exact-5-MiB positives, JPEG requires DQT/DHT/component-coherent entropy, PNG IDAT is actually inflated and scanline-checked, and VP8X can no longer stand in for image data.
- Closed the second WR-04/CR-01 review with a Convex Node `sharp`/libvips decoder that materializes raw pixels under hard limits. Bounded jpeg-js catches libvips-tolerated corrupt JPEGs, and Node zlib `maxOutputLength` rejects PNG bombs before excess allocation.
- Closed reopened WR-05 by excluding non-terminal rows at the index range, carrying the pagination cursor past invalid ownership rows, and migrating legacy terminal rows in a separate bounded sweep.
- Closed WR-02 by making every network, abort, HTTP, invalid-response, or thrown upload failure terminal for that URL; retry requests a new reservation and reuses the processed blob.
- Closed WR-03 with immutable normalized claim snapshots and collision-safe fingerprints; accepted A never clears or masquerades as edited draft B.

## Task Commits

1. **Task 1 RED: indexed collision and terminal retention regressions** — `f9a3d72`
2. **Task 1 GREEN: bounded reservation lifecycle** — `1712e89`
3. **Task 2 RED: structural image adversarial fixtures** — `be41ae8`
4. **Task 2 GREEN: JPEG/PNG/WebP structural parsers** — `724289e`
5. **Task 3 RED: fresh retry and immutable snapshot regressions** — `998eaf4`
6. **Task 3 GREEN: snapshot-safe upload retry flow** — `0c7b7e4`
7. **Retention liveness RED: active, invalid-ownership, and legacy page regressions** — `a71cb43`
8. **Retention liveness GREEN: cursor-safe retirement and migration** — `0b981c3`
9. **Image decodability RED: real encoder fixtures and independent decoders** — `6810fec`
10. **Image decodability GREEN: bounded JPEG/PNG/WebP bitstream hardening** — `2dff1c5`
11. **Convex runtime verification: production-only typecheck boundary** — `71bacde`
12. **Real decoder RED: executable JPEG/WebP/PNG bypass and bomb regressions** — `1f7bdca`
13. **Real decoder GREEN: bounded Convex Node pixel materialization** — `08fefe0`
14. **Build fixture follow-up: ArrayBuffer-safe adversarial PNG typing** — `118ad36`

## Files Created/Modified

- `convex/schema.ts` — adds capability, terminal-time, and legacy terminal-state indexes.
- `convex/posts.ts` — uses indexed collision lookup and timestamps direct terminal transitions.
- `convex/postInternal.ts` — crosses from the default action into the Node decoder action, then accepts or deletes storage through existing mutations.
- `convex/crons.ts` — appends separate daily legacy migration and terminal retirement jobs without replacing the storage sweep.
- `convex/postImageDecoder.ts` — internal-only Node action that reads storage and returns a safe decoder verdict.
- `convex/postImageDecoderLib.ts` — bounded sharp/libvips raw decode, bounded jpeg-js cross-check, and hard-capped Node zlib PNG verification.
- `convex/postImageDecoder.test.ts` — direct production-decoder positives and executable review bypass negatives.
- `convex/uploadValidation.ts` — allocation-safe container prefilter, including required indexed-PNG palette ordering; it is not the final proof of decodability.
- `convex/uploadValidation.test.ts` — independent positive decoder evidence and prefilter framing tests.
- `convex/posts.test.ts` — large-history, retention, malformed-storage deletion, and immutable A/B backend regressions.
- `src/test/imageFixtures.ts` — compact real encoder outputs plus format-valid exact-5-MiB padding helpers.
- `src/test/adversarialImageFixtures.ts` — corrupt one-byte JPEG, zeroed VP8L, palette-less PNG, and compact inflate-bomb builders.
- `convex.json` — selects Node 24 and externalizes sharp for Convex server installation.
- `convex/tsconfig.json` — keeps test-only Node/WASM decoder types outside the Convex production function typecheck.
- `package.json` / `package-lock.json` — pin sharp and jpeg-js in production; keep fflate/@jsquash test-only.
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
| WR-04 reopened | Positive fixtures come from real encoders and decode through independent libraries at small and exact 5 MiB sizes. JPEG additionally requires valid quantization/Huffman tables and coherent scan components/markers; PNG IDAT must inflate to the exact bounded scanline shape; WebP requires one real VP8 or VP8L image chunk and rejects VP8X-only containers. |
| WR-04 / CR-01 final | Pure parsing is only a prefilter. The production Node action requires sharp/libvips to materialize raw pixels, checks detected format against MIME, and enforces 2560² pixels, 2560px axes, one page and four channels. A bounded jpeg-js decode rejects the reproduced one-byte entropy JPEG. PNG inflation uses Node zlib `maxOutputLength = expected + 1`, so the compact bomb aborts before excess allocation; indexed PNG requires PLTE. The zeroed VP8L fails libvips decoding. |
| WR-05 | The retirement query uses a numeric `terminalAt` index range and cursor pagination. Active/no-terminal rows never enter the page, invalid ownership rows advance the cursor, and legacy accepted/rejected/expired rows migrate in bounded pages before normal retirement. |

## Automated and Runtime Verification

- Focused Phase 5 gap suite — **8 files, 164/164 passed**.
- Reopened focused retention suite — **52/52 passed**.
- Reopened focused image/retention suite — **2 files, 87/87 passed**.
- Final decoder/prefilter/integration suite — **3 files, 99/99 passed**.
- Full repository suite — **18 files, 393/393 passed**.
- Production build — **passed**.
- Convex production TypeScript check — **passed**.
- `npx convex dev --once` — **passed twice**, including server installation of external sharp and publication of the Node decoder action.
- Secret/raw-HTML/log source prohibition scan — **passed**.
- Indexed-source prohibition scan — **passed**, with no tokenHash table filter.
- Phase 5 commit-range `git diff --check` and all fourteen implementation/test commit checks — **passed**.

## Phase 4 Preservation

- Phase 4 planning files changed externally during Task 3 and remained unstaged and untouched.
- Schema, cron registration, generated declarations, package files, and status were re-read before shared edits/runtime generation.
- No reset, stash, amend, checkout, broad add, or Phase 4 staging was used.
- The global working-tree and complete Phase 5 commit range pass `git diff --check`.

## Decisions Made

- Seven days balances bounded capability retention with enough time for delayed status recovery; deletion restores token reuse only after that documented window.
- Final image acceptance matches the 2,560px client output on each axis and limits total input pixels to 2,560² before raw materialization.
- PNG CRC/palette framing remains in the prefilter, while exact inflation uses Node zlib with a pre-decode output cap; production does not call `fflate`.
- Libvips is the primary decoder for all formats; bounded jpeg-js is a deliberate second JPEG decoder because libvips can recover the reproduced one-byte entropy fixture.
- The client keeps storage identity only as internal snapshot identity and never renders or logs it; accepted confirmation exposes only human author/message content.

## Deviations from Plan

Independent reviews reopened WR-04 twice and identified WR-05 after the original plan completed. Each reproducible finding received new RED/GREEN commits and runtime verification without changing the manual-UAT boundary.

## Issues Encountered

- Parallel Phase 4 work modified planning files while this plan ran. It did not overlap Phase 5 code and was preserved without staging or rewriting.
- The independent review file remained externally dirty and unstaged; all scoped and global whitespace checks are green.

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

- All declared production/test artifacts exist.
- Fourteen implementation/test commits matching this gap closure exist, including RED then GREEN ordering for the final real-decoder bypasses.
- Every task acceptance command, focused suite, full suite, build, Convex runtime, source scan, and scoped diff check passed.
- Phase 4 dirty planning files remain unstaged and byte-preserved by this executor.
- Manual browser/device UAT remains classified as pending.

---
*Phase: 05-mural-de-mem-rias-modera-o*
*Completed: 2026-07-25*
