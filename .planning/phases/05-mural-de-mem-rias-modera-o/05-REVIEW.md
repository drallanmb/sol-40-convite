---
phase: 05-mural-de-mem-rias-modera-o
reviewed: 2026-07-25T01:10:14Z
depth: standard
files_reviewed: 32
files_reviewed_list:
  - convex/postModel.ts
  - convex/postSecurity.ts
  - convex/postRateLimits.ts
  - convex/uploadValidation.ts
  - convex/postTest.ts
  - convex/posts.test.ts
  - convex/uploadValidation.test.ts
  - convex/schema.ts
  - convex/_generated/api.d.ts
  - convex/posts.ts
  - convex/postInternal.ts
  - convex/crons.ts
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
  - src/lib/stableVisitOrder.ts
  - src/lib/stableVisitOrder.test.ts
  - src/hooks/useReducedMotion.ts
  - src/components/memories/MemoryCard.tsx
  - src/components/memories/MemoryCarousel.tsx
  - src/components/memories/MemoriesSection.tsx
  - package.json
  - src/content/event.ts
  - src/content/event.test.ts
  - src/routes/Home.tsx
findings:
  critical: 0
  warning: 4
  info: 0
  total: 4
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-07-25T01:10:14Z  
**Depth:** standard  
**Files Reviewed:** 32  
**Status:** issues_found

## Scope

The source scope was computed from the deduplicated `key-files.created` and
`key-files.modified` entries in `05-01-SUMMARY.md` through
`05-04-SUMMARY.md`. Planning artifacts and `package-lock.json` were excluded
as required. The unrelated, uncommitted Phase 4 work in `src/index.css`,
`src/routes/Presentes.tsx`, and `src/components/gifts/WineCatalog.tsx` was not
reviewed.

## Summary

The core moderation boundary is sound: public submissions create only
`pendente` posts, `listApproved` filters in the backend before generating
storage URLs, status reads are capability-scoped, capabilities are hashed at
rest, and accept/reject/expiry mutations re-read reservation ownership before
changing state. The carousel renders only the minimal public projection as
ordinary React text, uses cryptographic per-visit ordering, stops automatic
movement on interaction, and disables autoplay for reduced motion.

Four actionable warnings remain. One lets anonymous callers force an
ever-growing full-table reservation scan before rate limiting. Two make the
documented retry flow unreliable or able to confirm stale text after ambiguous
network outcomes. The last accepts a signature-prefixed arbitrary payload as a
real image without checking even minimal file structure.

## Warnings

### WR-01: Capability collision checking performs an unbounded full-table scan before rate limiting

**Files:** `convex/posts.ts:217-229`, `convex/schema.ts:61-75`

**Issue:** `requestUpload` hashes the supplied token and then searches
`postUploadReservations` with `.filter(...tokenHash...).take(2)`. The
reservation table has indexes only for `storageId` and `expiresAt`; it has no
`tokenHash` index. Reservation rows are also never deleted. Therefore every
upload reservation request scans an ever-growing table, and this work happens
before either the device or global limiter is checked/consumed. A caller can
rotate canonical tokens and repeatedly trigger the scan without spending a
rate-limit unit. Even legitimate traffic eventually makes this mutation hit
Convex read/scan limits as expired rows accumulate.

**Fix:** Add a `by_token_hash` index to `postUploadReservations`, replace the
filter with `withIndex('by_token_hash', index => index.eq('tokenHash',
tokenHash)).unique()` (or an equivalent bounded lookup), and add a retention
policy for terminal reservation rows if they are not needed indefinitely.
Keep the lookup bounded even when checking before limiter consumption. Add a
test with a large set of historical reservations and assert collision/non-
collision behavior through the indexed path.

### WR-02: Upload retry can reuse an expired short-lived upload URL indefinitely

**Files:** `src/components/memories/MemoryForm.tsx:228-249`,
`src/components/memories/MemoryForm.tsx:281-297`,
`src/lib/memoryDraft.ts:268-313`, `convex/postModel.ts:35`

**Issue:** Once `reservation_created` runs, the reducer retains the
`reserved` transport after every upload/network/HTTP/invalid-response failure.
On retry, `ensureReservation()` returns immediately for any non-`none`
transport, and `submitPhoto()` posts to the same `uploadUrl` again. Convex
upload URLs are short-lived (the Phase 5 research records a one-hour URL),
while the reservation lasts 24 hours. If a guest retries after the upload URL
expires—or receives an HTTP error because it is already invalid—the visible
“Tentar novamente” action repeats the same doomed URL until the reservation
itself expires. The draft is preserved, but the promised retry does not
recover.

**Fix:** Treat upload-stage HTTP/invalid-response/expired-URL failures as an
invalidated upload transport and request a fresh reservation/upload URL on the
next attempt, while preserving the processed blob, original photo, author,
message, and preview. Because network failures are ambiguous and may leave a
stored blob, continue relying on the old-reservation expiry/orphan sweep for
cleanup. Add an orchestration test proving that a failed/expired URL causes the
next attempt to call `requestUpload` rather than reusing the old URL.

### WR-03: Editing text after an ambiguous claim can display success for older stored content

**Files:** `src/lib/memoryDraft.ts:188-205`,
`src/components/memories/MemoryForm.tsx:306-326`,
`src/components/memories/MemoryForm.tsx:433-469`,
`convex/posts.ts:301-343`

**Issue:** Author/message edits clear the failure state but leave an
`uploaded` transport intact. Failed forms are not busy, so both text fields are
enabled. This becomes incorrect after an ambiguous claim outcome: the first
`submitPhotoMemory` may have committed `processing` (or even `accepted`) with
the old author/message while the client only observed a network failure. The
guest can then edit the visible text and retry. The client submits those new
values, but the backend returns immediately for `accepted` or `processing` and
never updates the reservation text. The UI can consequently show success and
clear a revised message that was never stored.

**Fix:** Make the claimed submission snapshot explicit. Once a claim may have
reached the backend, either (a) freeze/disable author and message until status
resolves and clearly retry the immutable snapshot, or (b) invalidate that
transport and start a fresh reservation whenever the user edits the draft.
Do not silently combine mutable controlled fields with an immutable processing
reservation. Add a test for “claim commits, response is lost, user edits,
retry/status accepts” and assert that the content confirmed by the UI is the
content persisted in the post.

### WR-04: Four-byte/header-only payloads pass as validated images

**Files:** `convex/uploadValidation.ts:15-45`,
`convex/uploadValidation.ts:76-105`,
`convex/uploadValidation.test.ts:17-27`,
`convex/uploadValidation.test.ts:46-61`

**Issue:** Validation classifies JPEG from its first three bytes, PNG from its
eight-byte signature, and WebP from `RIFF` plus `WEBP`; it checks no dimensions,
required chunks/segments, declared container length, or terminating structure.
The tests reinforce this by accepting 32-byte zero-filled fixtures containing
only those prefixes and by accepting a 5 MiB zero-filled payload with only a
copied header. An anonymous caller can therefore create a pending “photo” from
arbitrary non-decodable bytes by prepending a recognized signature. This
contradicts the planned malformed-file/“estrutura mínima” gate, wastes storage,
and can produce broken approved cards.

**Fix:** Validate enough structure to establish a decodable image, preferably
with a vetted server-side decoder/parser. At minimum, parse bounded JPEG
segments through an SOF marker and terminal EOI, require PNG `IHDR` with valid
dimensions plus a coherent chunk walk ending in `IEND`, and verify WebP RIFF
length and a recognized `VP8 `, `VP8L`, or `VP8X` chunk. Add adversarial tests
for header-plus-zero/random data, truncated structures, impossible dimensions,
and inconsistent RIFF/chunk lengths; only structurally valid fixtures should
reach `accepted`.

## Verification

- `npm test -- convex/posts.test.ts convex/uploadValidation.test.ts src/lib/imageProcessing.test.ts src/lib/memoryDraft.test.ts src/lib/memorySession.test.ts src/lib/stableVisitOrder.test.ts` — 6 files, 113 tests passed.
- `npm run build` — TypeScript and Vite production build passed.
- No source files were modified by this review.

---

_Reviewer: Codex (gsd-code-reviewer)_  
_Depth: standard_
