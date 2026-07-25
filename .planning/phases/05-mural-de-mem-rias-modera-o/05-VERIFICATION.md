---
phase: 05-mural-de-mem-rias-modera-o
verified: 2026-07-24T22:14:29-03:00
status: gaps_found
score: "3/5 requirements satisfied"
requirements:
  satisfied: [WALL-01, WALL-03, WALL-04]
  gaps: [WALL-02, WALL-05]
review_warnings:
  blocking_gaps: [WR-01, WR-02, WR-03, WR-04]
  verification_debt: []
  acceptable_warnings: []
human_verification:
  pending:
    - populated_carousel_focus_swipe_reduced_motion_zoom
    - real_jpeg_png_webp_upload_and_interruption
    - safari_ios_heic_fallback
---

# Phase 5: Mural de Memórias + Moderação — Verification Report

**Phase Goal:** Convidado envia foto/recado; nada aparece em público sem aprovação.  
**Status:** gaps_found  
**Score:** 3/5 requirements satisfied

## Verdict

The moderation boundary itself is achieved: public-created posts begin as
`pendente`, the public album reads through a backend `aprovado` index, and its
payload contains only the minimal public projection. A pending or hidden post,
its storage URL, reservation, capability, device key, moderation state, and
storage metadata are not returned by `listApproved`.

The phase is not ready to close because four review warnings are real blocking
gaps against the Phase 5 must-haves:

1. upload requests can force an unbounded reservation-table scan before the
   limiter is consulted;
2. upload retry can indefinitely reuse an expired short-lived upload URL;
3. an ambiguous claim followed by text editing can confirm success for older
   persisted content while clearing the newer visible draft;
4. server validation accepts header-prefixed arbitrary bytes as a JPEG, PNG, or
   WebP without establishing a structurally valid image.

The automated suite and production/runtime checks are green, but the tests
encode the fourth defect and do not cover the first three failure scenarios.

## Requirement Traceability

| Requirement | Status | Evidence and assessment |
|---|---|---|
| WALL-01 | ✓ SATISFIED | `convex/schema.ts:44-75` defines one `posts` memory plus `pendente`/`aprovado`/`oculto` state support and upload reservations. `submitTextMemory` and `acceptPhoto` create one `pendente` post. Duplicate claim/finalization tests converge on one post. |
| WALL-02 | ✗ GAP | The three-step flow, client downscale, `_storage` metadata checks, byte action, capability ownership, idempotent finalization, expiry, and blob cleanup exist. However WR-02 and WR-03 make retry/content convergence unreliable, and WR-04 allows non-images through server-side validation. |
| WALL-03 | ✓ SATISFIED | Text-only submission is public, normalized, plain text, optional-author, bounded to 280 Unicode code points, rate-limited, and persisted as `pendente`. Client and backend boundary tests pass. |
| WALL-04 | ✓ SATISFIED | `convex/posts.ts:499-521` queries `posts.by_status(aprovado)` before calling `storage.getUrl` and returns only `{id, author, message?, imageUrl?, createdAt}`. The client calls only `api.posts.listApproved`; no client-side moderation filter exists. The projection test proves pending/hidden exclusion and the exact field allowlist. |
| WALL-05 | ✗ GAP | Device/global limiters do prevent upload URL generation and reservation insertion after denial, and N/N+1 tests pass. WR-01 nevertheless leaves an unbounded full-table collision scan before the limiter, so rejected anonymous traffic can repeatedly impose growing database work without an effective cost gate. |

## Review Warning Classification

### WR-01 — blocking gap (WALL-05, D-17)

`requestUpload` hashes the token, then uses
`.query('postUploadReservations').filter(...tokenHash...).take(2)` at
`convex/posts.ts:217-229`. The table has no `tokenHash` index
(`convex/schema.ts:61-75`) and terminal reservations are not retired.

The limiter still correctly gates `generateUploadUrl` and storage reservation
creation, so the narrow “no storage URL on denial” test passes. That is not
enough for the stated abuse-control goal: every denied request can first scan
an ever-growing table. Because D-17 says the limiter exists to contain bursts
and abuse, and the plans classify the anonymous upload cost boundary as a
high-severity blocking threat, this is a blocking gap rather than acceptable
performance debt.

Required closure: add an indexed bounded token-hash lookup, define retention
for terminal reservations, and test collision/non-collision behavior with a
large historical set while proving the denial path remains bounded.

### WR-02 — blocking gap (WALL-02, D-08)

After an upload/network/HTTP/invalid-response failure, the reducer retains a
`reserved` transport. `ensureReservation` returns immediately for every
non-`none` transport (`MemoryForm.tsx:228-231`), and retry posts to the same
stored URL (`MemoryForm.tsx:281-296`). The URL can expire well before the
24-hour reservation.

This violates the explicit recoverable “Tentar novamente” must-have. The draft
is preserved, but the retry may be permanently doomed until reservation expiry.
It is therefore a goal gap, not merely missing test coverage.

Required closure: invalidate the upload URL transport after upload-stage
HTTP/invalid-response/expired-URL failure, preserve the processed blob and
draft, acquire a fresh reservation on retry, and leave ambiguous old blobs to
the expiry/orphan cleanup path. Add an orchestration test that proves the next
attempt calls `requestUpload`.

### WR-03 — blocking gap (WALL-02, D-08, D-09)

Author/message edits clear the visible failure but retain an `uploaded`
transport (`memoryDraft.ts:188-205`). If the first claim committed but its
response was lost, the reservation holds the original text. A later retry with
edited fields receives `accepted` or `processing` without updating that
snapshot (`posts.ts:301-343`), and the UI can clear the edited draft as success
(`MemoryForm.tsx:306-326`).

That breaks truthful retry/idempotency: the UI may say the currently visible
memory was received when different text was persisted. This directly violates
the accepted-only, preserved-draft contract.

Required closure: freeze an explicit claimed snapshot until resolution, or
invalidate the transport and start a fresh reservation when text changes after
an ambiguous claim. Add the exact lost-response/edit/retry test and compare the
confirmed UI content with the persisted post.

### WR-04 — blocking gap (WALL-02, D-16)

`detectImageType` accepts JPEG from three signature bytes, PNG from the
eight-byte signature, and WebP from `RIFF`/`WEBP`
(`uploadValidation.ts:15-45`). No JPEG segment/SOF/EOI, PNG IHDR/chunk/IEND, or
WebP RIFF/chunk coherence is checked. Current tests deliberately accept
32-byte and 5 MiB zero-filled buffers bearing only those prefixes.

These payloads are not established to be images, so the implementation does
not meet the planned malformed-file/real-image server validation gate and can
create broken approved cards. This is a blocking validation gap.

Required closure: use a vetted server-side decoder/parser, or minimally parse
bounded JPEG/PNG/WebP structure and dimensions. Replace prefix-only “valid”
fixtures with structurally valid images and add adversarial truncated,
impossible-dimension, and inconsistent-length cases.

## Decision Coverage (D-01–D-17)

| Decision | Status | Evidence |
|---|---|---|
| D-01 photo, recado, or both | ✓ | Backend domain/integration tests cover all three shapes; missing-both is rejected. |
| D-02 optional author/fallback | ✓ | Omission persists as absent; `listApproved` supplies exactly “De alguém que te ama”. |
| D-03 one card per submission | ✓ | Single-file picker and single post per text/accepted reservation; concurrency test proves one post. |
| D-04 retain author after success | ✓ | Reducer and success-flow tests retain author while clearing photo/message/transport. |
| D-05 section after dress code | ✓ | `Home.tsx:26-27` mounts `DressCodeSection` then `MemoriesSection` before the shell footer. |
| D-06 carousel before form | ✓ | `MemoriesSection.tsx:141-147` renders `ApprovedAlbum` before `MemoryForm`. |
| D-07 whole preview, replace/remove | ◐ SOURCE VERIFIED | `PhotoPicker` uses `object-contain` and offers replace/remove. Real chooser/visual behavior remains part of human verification. |
| D-08 progress and recoverable retry | ✗ GAP | Progress/preservation states exist, but WR-02 and WR-03 break reliable retry and snapshot convergence. |
| D-09 accepted-only inline success | ✗ GAP | Success is only dispatched from `accepted` and copy/action are correct, but WR-03 can confirm and clear text different from the accepted snapshot. |
| D-10 approved-only public payload | ✓ | Backend indexed filter and minimal validator/projection; pending/hidden projection test passes. |
| D-11 stable random order per visit | ✓ | Cryptographic rank owner and reactive stability/immutability tests pass. |
| D-12 autoplay, controls, swipe, pause, reduced motion | ◐ HUMAN NEEDED | Source implements Embla controls and motion policy; populated interactive behavior is not manually evidenced. |
| D-13 consistent cards | ◐ HUMAN NEEDED | Source uses one fixed frame and centered text-only branch; populated visual/zoom behavior is not manually evidenced. |
| D-14 280-character hard limit | ✓ | Client counter/block and server Unicode-code-point boundary tests pass. |
| D-15 JPEG/PNG/WebP plus HEIC fallback | ◐ HUMAN NEEDED | Capability-based conversion/fallback logic is tested; real Safari iOS HEIC remains unverified. |
| D-16 client reduction plus real server validation | ✗ GAP | Downscale and metadata/size gates exist, but WR-04 does not establish structurally valid image bytes. |
| D-17 no lifetime cap, abuse-only limiter | ✗ GAP | No visible/product lifetime cap exists and refill tests pass; WR-01 leaves the anonymous pre-limit scan abuse path. |

## Security and Data-Flow Verification

### Public read privacy

- `listApproved` filters through `by_status` with literal `aprovado` before URL
  generation.
- Its return validator contains only `id`, `author`, optional `message`,
  optional `imageUrl`, and `createdAt`.
- The approved-projection integration test inserts approved, pending, and
  hidden rows and returns only the approved row with the exact field allowlist.
- `MemoryCard` derives its type from `FunctionReturnType<typeof
  api.posts.listApproved>` and renders ordinary JSX text. It has no access to
  status, storage IDs, reservation IDs, hashes, capabilities, or device keys.

Conclusion: the core goal “nada aparece em público sem aprovação” is enforced
backend-side, not by React convention.

### Upload ownership, idempotency, and cleanup

- Capabilities are canonical 256-bit base64url values, purpose-separated and
  SHA-256 hashed at rest.
- Claim verifies capability/reservation ownership, storage ownership,
  `_storage` metadata size/type, and schedules internal byte validation.
- `acceptPhoto` is reservation-scoped and creates at most one `pendente` post;
  duplicate claim/finalization tests pass.
- Invalid known blobs, expired reservation blobs, and old unowned blobs have
  deletion paths; the sweep is paginated and ownership-aware.
- The retry implementation is not sound until WR-02 and WR-03 are closed.

### Rate limiting

- Device and global limiters are checked and consumed before
  `generateUploadUrl`; denial returns no URL and inserts no reservation.
- Boundary/refill/whole-second tests pass.
- The collision lookup before the limiter is unindexed and unbounded, so the
  complete abuse-cost gate is not achieved.

## Automated Verification

| Check | Result |
|---|---|
| `npm test` | PASS — 16 files, 338 tests |
| `npm run build` | PASS — TypeScript and Vite production build |
| `npx convex dev --once` | PASS — development functions ready |
| Approved-only backend projection | PASS |
| Text/rate/idempotency/cleanup suites | PASS within their current coverage |
| Structural image validity | FAIL by source/adversarial review; current tests encode prefix-only acceptance |
| Expired upload URL retry | NOT COVERED; source proves stale URL reuse |
| Ambiguous claim/edit/retry snapshot | NOT COVERED; source proves mutable draft over immutable claim |
| Large historical reservation collision lookup | NOT COVERED; source proves full-table filter |

The shared working tree changed concurrently during verification: unrelated
Phase 4 edits were present first in `src/content/event.ts` and, at the final
status check, in `src/routes/Home.tsx` plus
`src/components/gifts/GiftPreview.tsx`. Verification did not modify or stage
those files.

## Human Verification Required

These items remain **pending** and are not marked passed:

1. **Populated carousel focus/swipe/reduced motion/zoom** — with one, few, and
   many approved memories, verify keyboard focus, previous/next, touch swipe,
   pause/resume, focus/hover pause, `prefers-reduced-motion`, photo-only,
   message-only and combined cards, and 200% zoom.
2. **Real JPEG/PNG/WebP upload and interruption** — attach each real format in
   a browser, observe actual progress, interrupt the network, retry, verify the
   whole draft remains, verify one pending post is created, and inspect the
   public network payload to confirm pending/private data never appears.
3. **Safari iOS HEIC fallback** — on a real iPhone/Safari, choose a HEIC/HEIF
   photo and verify either successful browser conversion/upload or actionable
   fallback while preserving author and recado.

These manual items do not supersede the four code gaps above; both the blocking
fixes and the manual evidence are required before a final pass.

## Gaps Summary

1. Add a bounded indexed token-hash collision lookup and terminal reservation
   retention/cleanup; prove abusive denied traffic cannot force growing scans.
2. Refresh reservation/upload URL after upload-stage URL failures while
   preserving the processed image and draft.
3. Make claim content immutable or start a fresh reservation when the user
   edits after an ambiguous claim; test persisted content against UI success.
4. Replace signature-only image acceptance with structural/decoder-backed
   JPEG, PNG, and WebP validation and adversarial fixtures.
5. Complete the three explicit human-verification scenarios.

---

_Verified: 2026-07-25_  
_Verifier: Codex (gsd-verifier)_
