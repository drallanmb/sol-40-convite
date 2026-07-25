---
phase: 05-mural-de-mem-rias-modera-o
reviewed: 2026-07-25T02:12:02Z
depth: deep-final-closure
review_commits:
  - 1f7bdca
  - 08fefe0
  - 118ad36
  - 6039ebb
  - cfd1b25
  - bb2b5c2
  - e6f9f0c
files_reviewed: 13
files_reviewed_list:
  - convex.json
  - convex/_generated/api.d.ts
  - convex/postImageDecoder.ts
  - convex/postImageDecoderLib.ts
  - convex/postImageDecoder.test.ts
  - convex/postInternal.ts
  - convex/posts.test.ts
  - convex/uploadValidation.ts
  - convex/uploadValidation.test.ts
  - convex/tsconfig.json
  - src/test/adversarialImageFixtures.ts
  - package.json
  - package-lock.json
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: passed
gap_status:
  WR-01: closed
  WR-02: closed
  WR-03: closed
  WR-04: closed
  WR-05: closed
---

# Phase 05: Final Gap-Closure Code Review

**Reviewed:** 2026-07-25T02:12:02Z

**Status:** passed

## Outcome

The final Phase 5 gap implementation closes CR-01 and WR-04 without reopening
WR-01, WR-02, WR-03 or WR-05. Final image acceptance no longer depends on
handwritten container parsing as proof of an image: the default Convex action
crosses into an internal Node action, reads the stored blob, and requires
bounded real pixel materialization through sharp/libvips. JPEG receives a
second bounded decode through `jpeg-js`, while PNG inflation is constrained
before allocation with Node zlib `maxOutputLength`.

No critical, blocking warning, public-surface expansion, secret leak, cleanup
regression or current Phase 4 regression was found.

## CR-01 closure: bounded PNG inflation

`postImageDecoderLib.ts` derives the exact non-interlaced scanline output size
from the preflight-validated IHDR and rejects any expected result above
`2560² × 4 + 2560` bytes. It then calls Node `inflateSync` with
`maxOutputLength: expectedLength + 1`; output expansion is therefore capped by
the native decoder before a larger result can be returned or allocated by
application code. The validator also requires exact output length and legal
per-row filter bytes.

The compact bomb fixture declares a 1×1 RGB image while carrying an 8 MiB
inflated stream. Production decoding rejects it as `unsupported_type`. The
same path remains bounded by the 5 MiB compressed upload limit and by the
pre-decode expected-output ceiling.

## WR-04 closure: real bounded decoding

### JPEG

- Container preflight requires JPEG SOI/EOI and matching MIME.
- sharp metadata enforces format, 2560² pixels, 2560px per axis, one page and
  no more than four input channels.
- `jpeg-js` performs a strict second decode with tolerant decoding disabled,
  resolution capped at 6.5536 MP and memory capped at 32 MiB.
- sharp then materializes raw pixels under a five-second libvips timeout and
  verifies exact width, height, channel count and byte length.
- The reproduced one-byte entropy JPEG is rejected.

### PNG

- The prefilter validates signature, coherent CRC-checked chunk framing,
  8-bit supported color modes, non-interlaced IHDR, IDAT ordering and required
  pre-IDAT `PLTE` for indexed color.
- Node zlib verifies exact bounded scanline inflation before sharp decode.
- sharp materializes and verifies the pixels under the same axis, pixel, page,
  channel, timeout and cache constraints.
- Indexed PNG without `PLTE` and the inflate bomb are rejected.

### WebP

- The prefilter requires exact RIFF size, bounded chunk traversal and one VP8
  or VP8L image chunk.
- sharp/libvips must recognize WebP metadata and materialize the full raw
  image inside the common limits.
- The reproduced zeroed VP8L payload is rejected.

### Positive formats

Real encoder-produced JPEG, PNG, lossless WebP and lossy WebP fixtures decode
successfully. Independently decodable exact-5-MiB JPEG, PNG and WebP fixtures
also pass production decoding, proving that valid boundary payloads remain
accepted.

## Runtime and resource boundary

- `sharp.cache({ memory: 0, files: 0, items: 0 })` disables libvips caches.
- `sharp.concurrency(1)` bounds decoder concurrency per Node isolate.
- `limitInputPixels` is `2560²`; both metadata axes must be at most 2560.
- `limitInputChannels` and the final raw result are capped at four channels.
- `pages: 1`, metadata page validation and raw verification reject
  multi-page inputs.
- `sequentialRead: true`, `unlimited: false`, a five-second raw-decode timeout,
  jpeg-js memory/resolution limits and PNG native output limits bound the three
  format paths.
- Input bytes are capped at 5 MiB before decoder work.
- Production decoder dependencies are `sharp` and `jpeg-js`; fflate and the
  independent jsquash decoders remain test-only.

## Convex compatibility and deployment

- `convex.json` selects Node 24 and externalizes exactly `sharp`, allowing
  Convex to install the native libvips package server-side.
- `postImageDecoder.ts` and its library carry the Node runtime directive.
- The decoder is an `internalAction`; no anonymous/public callable decoder,
  cleanup or moderation function was added.
- The default `validatePhoto` action calls the internal Node decoder and sends
  only a safe verdict into the existing ownership-rechecking accept/reject
  mutations.
- `npx tsc -p convex/tsconfig.json` passes.
- `npx convex dev --once` installs/prepares the external package and publishes
  the functions successfully.

## Failure cleanup, ownership and idempotency

For every reproduced corrupt payload, integration tests prove:

- public claim first enters `processing`;
- final status becomes stable `rejected/unsupported_type`;
- the stored blob is deleted;
- no post row is created;
- public status does not contain storage ID, token hash or post ID.

`rejectPhoto` re-reads the reservation state and storage ownership before
deletion. `acceptPhoto` likewise re-reads the processing reservation and
storage identity before creating at most one pending post. Concurrent expiry
or repeated validation therefore remains idempotent and ownership-safe.

## Live deployment smoke

An independent smoke was repeated against the current development deployment:

1. `posts:requestUpload` returned a reservation and upload URL.
2. A malformed JPEG was uploaded through that URL.
3. `posts:submitPhotoMemory` returned `processing`.
4. `posts:getSubmissionStatus` converged to
   `rejected/unsupported_type`.
5. Calling the internal decoder afterward for that storage ID returned
   `rejected/missing_storage`, confirming blob cleanup.

This independently confirms the deployed Node action/external sharp path, safe
public status and rejection cleanup.

## Public surface and secrets

- `posts.ts` still exports exactly the five planned anonymous functions:
  `requestUpload`, `submitPhotoMemory`, `getSubmissionStatus`,
  `submitTextMemory` and `listApproved`.
- Decoder, retirement, migration, validation and cleanup functions remain
  internal.
- No raw capability, token hash, device key hash, upload URL, reservation
  internals or storage ID was added to `listApproved` or rejection status.
- No logging, raw HTML sink or decoder error detail exposes guest data or
  implementation secrets.

## Regression and Phase 4 isolation

- WR-01 indexed lookup and cursor-safe retention remain unchanged and green.
- WR-02 fresh upload transport and WR-03 immutable claim snapshot suites remain
  green.
- The current package manifest is coherent with Phase 4's later removal of its
  retired wine-asset audit script.
- Interleaved Phase 4 commits and the untracked
  `.planning/phases/04-carta-de-vinhos/04-VERIFICATION.md` were ignored and
  untouched.

## Automated verification

| Check | Result |
|---|---|
| Focused decoder/upload/retry suite | PASS — 5 files, 133 tests |
| Full repository suite | PASS — 18 files, 393 tests |
| `npm run build` | PASS |
| `npx tsc -p convex/tsconfig.json` | PASS |
| `npx convex dev --once` | PASS — functions ready |
| One-byte JPEG entropy bypass | REJECTED |
| Zeroed VP8L bypass | REJECTED |
| Indexed PNG without PLTE | REJECTED |
| Compact PNG inflate bomb | REJECTED |
| Real JPEG/PNG/WebP and exact-limit fixtures | ACCEPTED |
| Invalid storage cleanup/no-post integration | PASS |
| Live deployed malformed-JPEG smoke | PASS |
| Public export/secret/source scan | PASS |
| `git diff --check` before report update | PASS |

## Remaining human verification

Code review is passed. The previously declared manual UAT remains pending and
is not marked complete by this report:

1. populated carousel focus, swipe, reduced motion and 200% zoom;
2. real browser JPEG/PNG/WebP upload with network interruption and retry;
3. Safari iOS HEIC conversion or actionable fallback with retained draft.

---

_Reviewer: Codex (gsd-code-reviewer, independent final closure review)_
