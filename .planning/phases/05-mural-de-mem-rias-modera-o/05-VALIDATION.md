---
phase: 05
slug: mural-de-mem-rias-modera-o
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-24
---

# Phase 05 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 + convex-test 0.0.54 |
| **Config file** | `vite.config.ts` |
| **Quick run command** | `npm test -- convex/posts.test.ts` |
| **Full suite command** | `npm test && npm run build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run the narrow test file(s) named by that task.
- **After every plan wave:** Run `npm test && npm run build`.
- **Before `/gsd-verify-work`:** Full suite plus `npx convex dev --once` must be green.
- **Max feedback latency:** 30 seconds for the automated quick loop.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 0 | WALL-01, WALL-05 | T-05-01-H | Deploy-safe Convex harness instantiates the live schema and registers the existing official limiter adapter without importing future handlers | Harness smoke | `npm test -- convex/posts.test.ts` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 0 | WALL-02, WALL-03, WALL-05 | T-05-01-A/B/F/G | Text/capability/limiter policies and real-byte type/size rules are exact at pure boundaries | Unit | `npm test -- convex/posts.test.ts convex/uploadValidation.test.ts` | ❌ W0 | ⬜ pending |
| 05-01-03 | 01 | 0 | WALL-01, WALL-04 | T-05-01-D/E/H | Additive post/reservation schema accepts valid shapes, rejects invalid literals, preserves Phase 4/RSVP, and passes real Convex analysis | Convex schema integration + runtime | `npm test -- convex/posts.test.ts convex/uploadValidation.test.ts && npm test && npm run build && npx convex dev --once` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 1 | WALL-03, WALL-04, WALL-05 | T-05-02-A/E/F/G | Text-only creation is pending/rate-limited and the public projection generates URLs only after approved filtering | Convex integration | `npm test -- convex/posts.test.ts -t "text|rate|approved|projection|author"` | ❌ added with task | ⬜ pending |
| 05-02-02 | 02 | 1 | WALL-01, WALL-02, WALL-05 | T-05-02-A/B/C/E/G | Reservation, metadata claim, real-byte action, safe status, and parallel retry converge to one pending post | Convex storage/action integration + unit | `npm test -- convex/posts.test.ts convex/uploadValidation.test.ts -t "upload|metadata|bytes|claim|retry|concurrent|status|delete"` | ❌ added with task | ⬜ pending |
| 05-02-03 | 02 | 1 | WALL-01, WALL-02, WALL-04 | T-05-02-C/D/H | Expiry and paginated orphan cleanup preserve every live owner; the real backend exposes only intended public functions | Convex scheduler/storage integration + runtime | `npm test -- convex/posts.test.ts -t "expire|orphan|cleanup|ownership|pagination|public surface" && npm test && npm run build && npx convex dev --once` | ❌ added with task | ⬜ pending |
| 05-03-01 | 03 | 2 | WALL-02, WALL-05 | T-05-03-A/B/D | Client downscale/session/XHR helpers enforce resource limits, safe key scope, cleanup, progress, and explicit HEIC fallback | Unit + browser smoke | `npm test -- src/lib/imageProcessing.test.ts src/lib/memorySession.test.ts` | ❌ W0 | ⬜ pending |
| 05-03-02 | 03 | 2 | WALL-01, WALL-02, WALL-03, WALL-05 | T-05-03-C/E/F/G | Reducer preserves draft across every interruption/double-submit and resets only after accepted, with matching 280-code-point policy | Unit + backend regression | `npm test -- src/lib/memoryDraft.test.ts && npm test -- convex/posts.test.ts -t "retry|concurrent|status"` | ❌ W0 | ⬜ pending |
| 05-03-03 | 03 | 2 | WALL-01, WALL-02, WALL-03, WALL-05 | T-05-03-C/D/E/F/H | Accessible form implements one-memory preview/progress/retry/rate/success states without raw HTML, pending URL, or capability leak | Unit + build + manual UI | `npm test -- src/lib/imageProcessing.test.ts src/lib/memoryDraft.test.ts src/lib/memorySession.test.ts && npm test -- convex/posts.test.ts && npm run build` | ❌ added with task | ⬜ pending |
| 05-04-01 | 04 | 3 | WALL-04 | T-05-04-C/E | Exact Embla pins coexist with Phase 4 dependencies; stable visit order is immutable and reduced-motion hook is cleanup-safe | Unit + build | `npm test -- src/lib/stableVisitOrder.test.ts && npm run build` | ❌ W0 | ⬜ pending |
| 05-04-02 | 04 | 3 | WALL-04 | T-05-04-A/B/C | Cards/carousel consume only approved minimal views and provide controllable drag/autoplay/focus/reduced-motion behavior | Unit + Convex regression + manual UI | `npm test -- src/lib/stableVisitOrder.test.ts convex/posts.test.ts -t "approved|projection" && npm run build` | ❌ added with task | ⬜ pending |
| 05-04-03 | 04 | 3 | WALL-01, WALL-02, WALL-03, WALL-04, WALL-05 | T-05-04-A–H | Shared-file merge preserves Phase 4 and the complete upload/album/rate/cleanup/concurrency system passes tests, build, real Convex, and browser gates | Full automated + runtime + manual | `npm test -- convex/posts.test.ts convex/uploadValidation.test.ts src/lib/imageProcessing.test.ts src/lib/memoryDraft.test.ts src/lib/memorySession.test.ts src/lib/stableVisitOrder.test.ts src/content/event.test.ts && npm test && npm run build && npx convex dev --once` | ❌ added with task | ⬜ pending |
| 05-05-01 | 05 | 4 | WALL-05 | T-05-05-A/B/G | Capability collision reads stay index-bounded under a large historical set; terminal reservations retire through bounded, ownership-safe, idempotent pages without weakening limiter semantics | Convex integration + source guard + runtime | `npm test -- convex/posts.test.ts -t "historical\|collision\|terminal\|retention\|rate\|limit\|expiry\|cleanup\|public surface" && rg -n "by_token_hash" convex/schema.ts convex/posts.ts && ! rg -U "query\\('postUploadReservations'\\)[\\s\\S]{0,240}filter\\([\\s\\S]{0,160}tokenHash" convex/posts.ts && npx convex dev --once && git diff --check` | ❌ added with task | ⬜ pending |
| 05-05-02 | 05 | 4 | WALL-02 | T-05-05-C/G | Server accepts only bounded structurally coherent JPEG/PNG/WebP with sane dimensions; truncated, spoofed, impossible, and inconsistent payloads are deleted before post creation | Unit + Convex storage/action integration + build | `npm test -- convex/uploadValidation.test.ts convex/posts.test.ts -t "jpeg\|png\|webp\|structur\|truncat\|dimension\|mime\|heic\|5 MiB\|invalid\|pending post" && npm run build && git diff --check` | ❌ added with task | ⬜ pending |
| 05-05-03 | 05 | 4 | WALL-02, WALL-05 | T-05-05-D/E/F/G | Upload errors force a fresh reservation while preserving the processed draft; immutable claim snapshots make lost-response/edit/acceptance truthful and never clear newer text | Unit orchestration + reducer/backend regression + full runtime | `npm test -- src/lib/memoryDraft.test.ts src/lib/memoryUploadAttempt.test.ts src/lib/memorySession.test.ts convex/posts.test.ts convex/uploadValidation.test.ts src/lib/imageProcessing.test.ts src/lib/stableVisitOrder.test.ts src/content/event.test.ts && npm test && npm run build && npx convex dev --once && ! rg "dangerouslySetInnerHTML\|console\\.(log\|info\|debug).*capability\|uploadUrl.*console" src/components/memories src/lib/memoryDraft.ts src/lib/memoryUploadAttempt.ts && git diff --check` | ❌ added with task | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `convex/postTest.ts` + initial `convex/posts.test.ts` — deploy-safe harness smoke with the official limiter adapter; it intentionally imports no not-yet-implemented endpoint.
- [ ] `convex/posts.test.ts` Wave 0 groups — pure text/capability/limiter precision followed by schema-only valid/invalid/index cases as Tasks 05-01-02/03 implement those seams.
- [ ] `convex/uploadValidation.test.ts` — created with `uploadValidation.ts` in 05-01-02; magic bytes, exact/+1 size, MIME mismatch, HEIC/PDF/HTML/truncation.
- [ ] `src/lib/imageProcessing.test.ts` — created with client image helpers in 05-03-01; dimension/downscale/adapter cleanup/codec fallback.
- [ ] `src/lib/memorySession.test.ts` — created with browser key helpers in 05-03-01; canonical generation, malformed cleanup, denied-storage fallback.
- [ ] `src/lib/memoryDraft.test.ts` — created with the reducer in 05-03-02; interruption/retry/double-submit and accepted-only partial reset.
- [ ] `src/lib/stableVisitOrder.test.ts` — created with ordering in 05-04-01; stable per-visit ranks, reactive additions, immutability.
- [ ] `src/lib/memoryUploadAttempt.test.ts` — added with 05-05-03; dependency-injected two-attempt orchestration proves a fresh reservation/upload URL after every upload error and immutable A/B claim-snapshot convergence.

Stateful integration cases are deliberately added with the real implementation that makes them executable:

- [ ] `convex/posts.test.ts` 05-02-01 — text mutation, rate boundaries/refill, approved-only projection, URL/private-field exclusion.
- [ ] `convex/posts.test.ts` 05-02-02 — reservation/storage/action pipeline, validation, parallel retry/idempotency, safe status.
- [ ] `convex/posts.test.ts` 05-02-03 — expiry/orphan ownership/pagination/races and public-surface inventory.
- [ ] `src/content/event.test.ts` 05-04-03 — memory anchor/copy/navigation and shared-file merge assertions.
- [ ] `convex/posts.test.ts` 05-05-01 — large historical token collision/non-collision, indexed lookup source guard, terminal cutoff/pagination/idempotency, and accepted-media preservation.
- [ ] `convex/uploadValidation.test.ts` + `convex/posts.test.ts` 05-05-02 — structurally valid JPEG/PNG/WebP fixtures plus truncated, impossible-dimension, missing-data/terminator, and inconsistent-length adversarial cases.
- [ ] `src/lib/memoryDraft.test.ts` + `src/lib/memoryUploadAttempt.test.ts` 05-05-03 — upload transport refresh and exact lost-response A / edited B / accepted A / preserved B flow.

No new test framework installation is required.

---

## Gap-Closure Coverage

| Finding | Requirement | Task | Automated proof | Closure condition |
|---------|-------------|------|-----------------|-------------------|
| WR-01 — unindexed pre-limit reservation scan and unbounded terminal growth | WALL-05 | 05-05-01 | Large historical collision/non-collision integration test, `by_token_hash` source guard, limiter denial/no-insert assertion, terminal cutoff/pagination/repeat/ownership suite | Indexed lookup is bounded; old terminal rows retire without deleting accepted media or weakening rate limits |
| WR-02 — retry reuses an expired short-lived upload URL | WALL-02 | 05-05-03 | Dependency-injected two-attempt orchestration for network/abort/HTTP/invalid-response; reducer asserts processed blob/draft/preview preservation and transport reset | Every upload-stage error causes the next attempt to call `requestUpload` and use a fresh URL/reservation |
| WR-03 — ambiguous old claim can clear newer edits | WALL-02 | 05-05-03 | Exact A committed/response lost/B edited/status accepts A regression across snapshot reducer, orchestration, and backend fixture | Confirmation identifies accepted A; visible B and preview remain; the next B submission starts a fresh reservation |
| WR-04 — magic-prefix payload accepted as an image | WALL-02 | 05-05-02 | Format-aware valid fixtures plus truncated/length/order/dimension/data/terminator/MIME adversarial unit and storage-action tests | Only structurally coherent JPEG/PNG/WebP reaches `acceptPhoto`; malformed storage is deleted and creates no post |

## Gap-Closure Threat Sampling

| Threat | Severity | Sampled by | Required evidence |
|--------|----------|------------|-------------------|
| T-05-05-A — anonymous rotating tokens force growing work | high | 05-05-01 | Indexed bounded token lookup under large history and unchanged denied-request cost boundary |
| T-05-05-B — retention deletes accepted media or retains terminal secrets forever | high | 05-05-01 | Terminal timestamp/cutoff ±1, bounded pages, repeated sweep, old-row compatibility, accepted ownership preservation |
| T-05-05-C — spoofed/truncated bytes become a pending image | high | 05-05-02 | Structural JPEG/PNG/WebP positive and adversarial tests before post creation |
| T-05-05-D — stale upload URL creates a permanent retry loop | high | 05-05-03 | Every upload error invalidates transport; attempt two requests and uses a fresh URL |
| T-05-05-E — accepted old claim erases or misrepresents newer text | high | 05-05-03 | Immutable normalized fingerprint and exact accepted-A/preserved-B regression |
| T-05-05-F — claim/capability details leak through confirmation or logs | high | 05-05-03 | Human-content-only confirmation, public-surface regression, and raw HTML/secret-log source scan |
| T-05-05-G — parallel Phase 4 changes are lost during schema/codegen/cron work | high | 05-05-01–03 | Live targeted diff review, full suite/build, Convex runtime, and `git diff --check` |

All T-05-05-* threats are above the Phase 5 high blocking threshold. A failed automated proof blocks 05-05 completion and prevents WALL-02/WALL-05 from being marked satisfied.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions | Status |
|----------|-------------|------------|-------------------|--------|
| Populated carousel focus/swipe/reduced motion/zoom | WALL-04 | Gesture, focus, responsive visibility, motion preference, and 200% zoom require an interactive populated viewport | With one/few/many approved memories, verify keyboard focus, arrows, touch swipe, pause/resume, focus/hover pause, `prefers-reduced-motion`, card variants, and 200% zoom | ⬜ pending |
| Real JPEG/PNG/WebP upload and interruption | WALL-02, WALL-03 | Requires a real browser file chooser, upload endpoint, network interruption, and storage/post inspection | Attach each real format, observe actual progress, interrupt once, retry, confirm the whole draft remains and exactly one pending post is created, then inspect the public payload for private/pending data | ⬜ pending |
| Safari iOS HEIC fallback | WALL-02 | Node/Vitest and desktop browsers do not reproduce the phone codec path | On real iPhone Safari, choose HEIC/HEIF and verify successful conversion/upload or actionable fallback while author and recado remain | ⬜ pending |

`npx convex dev --once` remains a required automated/runtime gate in 05-05-01 and 05-05-03; it is not counted as one of the three pending human UAT scenarios.

---

## Validation Sign-Off

- [x] All 15 tasks have `<automated>` verification and only reference behavior available by that task boundary
- [x] Sampling continuity: every task has automated verification
- [x] Wave 0 and progressive additions cover all test references without premature failing endpoint suites
- [x] WR-01 through WR-04 map directly to 05-05-01 through 05-05-03 and WALL-02/WALL-05
- [x] T-05-05-A through T-05-05-G have high-severity blocking proofs
- [x] The three device/browser UAT scenarios remain explicitly pending
- [x] No watch-mode flags
- [x] Feedback latency target remains < 30s for narrow commands
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planned; execution statuses remain pending
