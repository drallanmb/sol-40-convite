---
phase: 05-mural-de-mem-rias-modera-o
verified: 2026-07-24T23:14:11-03:00
status: passed
score: "5/5 requirements satisfied by automated and source verification"
requirements:
  satisfied: [WALL-01, WALL-02, WALL-03, WALL-04, WALL-05]
  gaps: []
review_findings:
  closed: [WR-01, WR-02, WR-03, WR-04, WR-05, CR-01]
  blocking_gaps: []
human_verification:
  pending:

    - populated_carousel_focus_swipe_reduced_motion_zoom
    - real_jpeg_png_webp_upload_and_interruption
    - safari_ios_heic_fallback

---

# Phase 5: Mural de Memórias + Moderação — Verification Report

**Phase Goal:** Convidado envia foto/recado; nada aparece em público sem aprovação.  
**Status:** human_needed
**Automated score:** 5/5 requirements satisfied

## Verdict

The Phase 5 implementation and its gap closure satisfy WALL-01 through WALL-05
in code, automated tests, production build, Convex production typecheck, and a
real `convex dev --once` preparation/deployment check.

The previous four blocking gaps are closed. Follow-up review findings WR-05 and
CR-01 are also closed:

- capability collision lookup is index-bounded and terminal rows have a
  cursor-safe, ownership-aware retention lifecycle;

- every failed upload transport is discarded and retry reserves a fresh URL;
- ambiguous photo claims retain one immutable content snapshot, and acceptance
  of older content never clears or misrepresents newer edits;

- JPEG, PNG, and WebP must pass bounded real pixel decoding before a post is
  created;

- PNG decompression is capped natively before output materialization;
- public reads remain approved-only and expose only the minimal card view.

No automated or source-verification gap remains. Final closure still requires
the three explicitly manual browser/device scenarios. They are not marked
passed by this report.

## Requirement Traceability

| Requirement | Status | Independent evidence |
|---|---|---|
| WALL-01 | ✓ SATISFIED | `convex/schema.ts` defines one memory post with photo, recado, or both and the three moderation states. `submitTextMemory` and `acceptPhoto` create `pendente` rows. Duplicate claim/finalization tests converge to one post. |
| WALL-02 | ✓ SATISFIED (manual UAT pending) | The client performs downscale and a three-step reservation/upload/claim flow. The server checks storage metadata, reads the stored blob, and accepts it only after bounded Node decoding. Retry and immutable-snapshot regressions pass. Real browser upload/interruption and Safari iOS HEIC remain human checks. |
| WALL-03 | ✓ SATISFIED | Text-only submission is public, normalized as plain text, supports optional author, enforces 280 Unicode code points, applies device/global rate limits, and persists as `pendente`. |
| WALL-04 | ✓ SATISFIED (manual UAT pending) | `listApproved` queries `posts.by_status(aprovado)` before URL generation and returns only `{id, author, message?, imageUrl?, createdAt}`. The React album consumes only this projection and performs no moderation filter. Populated interaction/zoom remains a human check. |
| WALL-05 | ✓ SATISFIED | Device/global limiters run before URL generation and insertion. Capability collision resolution uses `by_token_hash` with `take(1)`, and historical-set tests prove the path remains bounded. There is no product lifetime cap. |

## Gap-Closure Verification

### WR-01 — closed

`requestUpload` hashes the capability and performs:

`postUploadReservations.by_token_hash -> take(1) -> existing limiters -> generateUploadUrl`

There is no `tokenHash` table filter. The integration suite seeds 1,000
historical reservations and verifies both late collision and fresh-token
denial without producing a URL or inserting a reservation.

Terminal reservations record `terminalAt`, retain for seven days, and retire
through `by_terminal_at` in pages of 50. Each candidate is re-read before
deletion. Accepted rows are removed only after their post/storage ownership is
confirmed, while rejected/expired orphan storage is deleted before retirement.
Cursor tests cover a full page of invalid-ownership candidates and prevent
zero-delay rescanning. A separate bounded migration handles legacy terminal
rows without `terminalAt`.

### WR-02 — closed

`runFreshMemoryUploadAttempt` owns exactly one reservation and upload URL.
Network, abort, HTTP, invalid-response, and thrown failures return an upload
failure; `MemoryForm` dispatches `transport_invalidated`. The selected file,
processed blob, preview, author, and recado remain in the draft, while the next
attempt calls `requestUpload` and receives a different transport.

### WR-03 — closed

The first claim freezes normalized author, message, photo identity, and a
length-prefixed deterministic fingerprint. Repeated claim/status resolution
uses that snapshot, not later visible edits.

The exact lost-response scenario is covered on both sides:

1. claim A is persisted and its response is lost;
2. the guest edits the visible draft to B;
3. retry/status resolves accepted A;
4. the UI reports A separately;
5. B and its preview remain ready for a fresh submission.

The accepted reducer clears the form only when the current fingerprint still
matches the accepted snapshot.

### WR-04 — closed

Container signatures are now preflight only. Final acceptance crosses into the
internal Node decoder, reads the actual stored blob, and requires decoded raw
pixels:

- JPEG: coherent envelope plus sharp/libvips metadata and raw decode, with a
  second strict `jpeg-js` decode bounded to 6.5536 MP and 32 MiB;

- PNG: CRC/chunk/order preflight, exact expected scanline size, Node
  `inflateSync` with `maxOutputLength`, legal filter bytes, and sharp raw
  decode;

- WebP: exact RIFF/chunk framing with a real VP8/VP8L image chunk, then sharp
  metadata and raw decode.

The common limits are 5 MiB input, 2560 pixels per axis, 2560² pixels, one
page, at most four channels, disabled sharp caches, one decoder concurrency,
sequential reads, and a five-second raw-decode timeout.

Real encoder-produced JPEG, PNG, lossless WebP, lossy WebP, and independently
decodable exact-5-MiB fixtures pass. Truncated/prefix-only data, one-byte JPEG
entropy, zeroed VP8L, indexed PNG without `PLTE`, spoofed MIME, and malformed
containers fail.

### WR-05 — closed

The retention index range excludes active/no-terminal rows, pagination carries
its cursor past candidates that cannot be deleted, and legacy terminal rows
migrate in their own bounded state/index sweep. Tests cover 51-row boundaries,
repetition, invalid ownership, legacy compatibility, and liveness.

### CR-01 — closed

PNG expected output is computed from preflight-validated IHDR fields and is
capped before inflate. `inflateSync` receives
`maxOutputLength: expectedLength + 1`; an attacker-declared 1×1 image with an
8 MiB inflated stream is rejected without allowing application code to receive
the expanded output.

## Security and Data-Flow Verification

### Moderation and public projection

- Public-created posts begin as `pendente`.
- `listApproved` filters by the backend `by_status` index before storage URL
  generation.

- Pending and hidden rows are excluded by integration test.
- The return validator exposes only the five public card fields.
- Status, storage ID, reservation ID, token/device hashes, capabilities,
  moderation metadata, and upload URLs are absent from the public album view.

- React consumes `api.posts.listApproved` directly and has no client-side
  approval filter.

### Ownership, cleanup, and idempotency

- Reservation capabilities are canonical high-entropy base64url values and are
  purpose-separated SHA-256 hashes at rest.

- Claim verifies capability ownership, reservation state, storage identity,
  uniqueness, metadata size, and metadata MIME before scheduling decode.

- Decoder verdicts enter ownership-rechecking internal accept/reject mutations.
- Concurrent/repeated claims and finalization create at most one pending post.
- Rejected, expired, and unowned blobs have bounded cleanup paths.
- Accepted post media survives reservation retirement.
- Decoder, retention, migration, cleanup, and finalization functions remain
  internal; `convex/posts.ts` exports exactly the five planned anonymous
  functions.

### Abuse controls and resource bounds

- Upload device/global limits are consumed before URL generation and row
  insertion.

- Text and upload N/N+1, refill, global, concurrency, and whole-second retry
  boundaries pass.

- Capability lookup and terminal retention are index-bounded.
- Image input, dimensions, pixels, channels, pages, decoder cache/concurrency,
  JPEG memory, PNG output, and raw decode time are bounded.

- There is no visible or backend lifetime submission quota.

### Public surface and secrets

Source scans found no raw HTML sink or capability/upload-URL logging in the
memory feature. Human confirmation renders only accepted author/message
content; internal photo identity is not displayed. No new admin or moderation
writer was exposed by Phase 5.

## Decision Coverage

| Decision | Status | Evidence |
|---|---|---|
| D-01 photo, recado, or both | ✓ | Backend schema/domain/integration coverage for all three shapes. |
| D-02 optional author/fallback | ✓ | Author may be absent; public projection supplies exactly “De alguém que te ama”. |
| D-03 one card per submission | ✓ | One file picker and one post per accepted submission; duplicate flow is idempotent. |
| D-04 retain author after success | ✓ | Reducer keeps author while clearing accepted matching photo/recado. |
| D-05 home section after dress code | ✓ | `Home.tsx` mounts `MemoriesSection` immediately after `DressCodeSection` and before the shell footer. |
| D-06 carousel before form | ✓ | `MemoriesSection` renders the approved album before `MemoryForm`. |
| D-07 whole preview, replace/remove | ◐ HUMAN NEEDED | Source uses `object-contain` and replace/remove actions; real chooser/visual behavior remains manual. |
| D-08 progress and recoverable retry | ✓ + HUMAN | Automated fresh-URL and preserved-draft behavior passes; real interrupted network remains manual. |
| D-09 accepted-only inline success | ✓ | Success is accepted-only and older accepted content is reported separately from newer edits. |
| D-10 approved-only payload | ✓ | Indexed backend projection and exact allowlist test pass. |
| D-11 stable random order per visit | ✓ | Cryptographic rank ownership, reactive stability, and input immutability tests pass. |
| D-12 autoplay, controls, swipe, pause, reduced motion | ◐ HUMAN NEEDED | Source implements pinned Embla behavior; populated interaction remains manual. |
| D-13 consistent cards | ◐ HUMAN NEEDED | Source uses one fixed frame and centered text-only composition; populated visual/zoom behavior remains manual. |
| D-14 280-character limit | ✓ | Client counter/block and server Unicode-code-point tests pass. |
| D-15 JPEG/PNG/WebP plus HEIC fallback | ✓ + HUMAN | Real format decoder fixtures pass; Safari iOS HEIC behavior remains manual. |
| D-16 client reduction plus server validation | ✓ + HUMAN | Client bounds and bounded real server decode pass; real browser attachment remains manual. |
| D-17 abuse-only limiter | ✓ | Burst protection, refill, bounded pre-limit work, and no lifetime cap are verified. |

## Automated Verification

| Check | Result |
|---|---|
| Focused upload/decoder/retry suite | PASS — 5 files, 133 tests |
| Full repository suite | PASS — 18 files, 393 tests |
| `npm run build` | PASS |
| `npx tsc -p convex/tsconfig.json` | PASS |
| `npx convex dev --once` | PASS — functions ready with the external sharp package |
| Indexed large-history collision and denial | PASS |
| Terminal retention/migration/ownership/liveness | PASS |
| Real JPEG/PNG/WebP plus exact-5-MiB fixtures | PASS |
| One-byte JPEG, zeroed VP8L, palette-less PNG, PNG bomb | REJECTED as required |
| Invalid-storage cleanup and no-post creation | PASS |
| Fresh upload URL after every upload-stage failure | PASS |
| Lost response A / edit B / accepted A / preserved B | PASS |
| Approved-only projection and exact public allowlist | PASS |
| Public export and secret/raw-HTML source scans | PASS |
| `git diff --check` | PASS |

The only unrelated working-tree item during this verification was the untracked
`.planning/phases/04-carta-de-vinhos/04-VERIFICATION.md`. It was not read,
modified, staged, or included.

## Human Verification Required

These items remain **pending**:

1. **Populated carousel focus/swipe/reduced motion/zoom** — with one, few, and
   many approved memories, verify keyboard focus, previous/next, touch swipe,
   pause/resume, focus/hover pause, `prefers-reduced-motion`, all card variants,
   responsive visibility, and 200% zoom.

2. **Real JPEG/PNG/WebP upload and interruption** — attach each format through
   a real browser chooser, observe real progress, interrupt the network, retry,
   confirm the full draft remains and exactly one pending post is created, and
   inspect the public payload for pending/private data.

3. **Safari iOS HEIC fallback** — on a real iPhone/Safari, choose HEIC/HEIF and
   verify successful conversion/upload or actionable fallback while preserving
   author and recado.

## Final Status

Automated implementation verification is complete with no remaining code gap.
Phase 5 should remain `human_needed` until the three UAT scenarios above have
recorded evidence.

---

_Verified: 2026-07-24T23:14:11-03:00_
_Verifier: Codex (gsd-verifier, independent gap-closure pass)_
