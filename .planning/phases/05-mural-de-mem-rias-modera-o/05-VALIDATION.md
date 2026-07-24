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

Stateful integration cases are deliberately added with the real implementation that makes them executable:

- [ ] `convex/posts.test.ts` 05-02-01 — text mutation, rate boundaries/refill, approved-only projection, URL/private-field exclusion.
- [ ] `convex/posts.test.ts` 05-02-02 — reservation/storage/action pipeline, validation, parallel retry/idempotency, safe status.
- [ ] `convex/posts.test.ts` 05-02-03 — expiry/orphan ownership/pagination/races and public-surface inventory.
- [ ] `src/content/event.test.ts` 05-04-03 — memory anchor/copy/navigation and shared-file merge assertions.

No new test framework installation is required.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| HEIC/HEIF conversion and fallback on iPhone | WALL-02 | Node/Vitest does not reproduce device browser codecs | On Safari iOS, choose a HEIC photo; verify conversion and upload when supported, or the actionable fallback without losing author/message when unsupported |
| Real upload progress and retry preservation | WALL-02, WALL-03 | Requires browser network and storage behavior | Throttle the network, submit a photo plus message, observe progress, force one failure, and verify photo/message/name remain with “Tentar novamente” |
| Carousel controls and reduced motion | WALL-04 | Gesture, focus and motion behavior require an interactive viewport | Verify autoplay, arrows and swipe; interact to pause; enable reduced motion and confirm autoplay is disabled |
| Live Convex schema/functions | WALL-01–WALL-05 | Local type tests do not prove successful backend analysis/deployment | Run `npx convex dev --once` with a configured development deployment and confirm exit 0 |

---

## Validation Sign-Off

- [x] All 12 tasks have `<automated>` verification and only reference behavior available by that task boundary
- [x] Sampling continuity: every task has automated verification
- [x] Wave 0 and progressive additions cover all test references without premature failing endpoint suites
- [x] No watch-mode flags
- [x] Feedback latency target remains < 30s for narrow commands
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planned; execution statuses remain pending
