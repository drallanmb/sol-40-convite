---
phase: 05
slug: mural-de-mem-rias-modera-o
status: draft
nyquist_compliant: false
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
| 05-01-01 | 01 | 1 | WALL-01 | T-05-01 | Invalid post shapes and statuses are rejected | Convex integration | `npm test -- convex/posts.test.ts` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | WALL-02 | T-05-02 | Type and size are validated after upload; invalid blobs are deleted | Convex integration + unit | `npm test -- convex/posts.test.ts convex/uploadValidation.test.ts` | ❌ W0 | ⬜ pending |
| 05-01-03 | 01 | 1 | WALL-05 | T-05-03 | Device and global buckets stop abusive upload reservations before storage | Convex integration | `npm test -- convex/posts.test.ts` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 2 | WALL-02 | T-05-04 | Client downscale preserves aspect ratio and codec failure preserves the draft | Unit + browser smoke | `npm test -- src/lib/imageProcessing.test.ts src/lib/memoryDraft.test.ts` | ❌ W0 | ⬜ pending |
| 05-02-02 | 02 | 2 | WALL-03 | T-05-05 | A 1–280-character plain-text message creates a pending post | Convex integration + unit | `npm test -- convex/posts.test.ts src/lib/memoryDraft.test.ts` | ❌ W0 | ⬜ pending |
| 05-02-03 | 02 | 2 | WALL-04 | T-05-06 | Public query returns only approved posts and no private storage identifiers | Convex integration | `npm test -- convex/posts.test.ts` | ❌ W0 | ⬜ pending |
| 05-03-01 | 03 | 3 | WALL-04 | T-05-07 | Visit order stays stable and reduced motion disables autoplay | Unit + manual UI | `npm test -- src/lib/stableVisitOrder.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `convex/postTest.ts` — Phase 5 Convex harness with rate-limiter registration.
- [ ] `convex/posts.test.ts` — schema, public surface, status, dedupe, cleanup and limits.
- [ ] `convex/uploadValidation.test.ts` — magic bytes, real size and MIME mismatch fixtures.
- [ ] `src/lib/imageProcessing.test.ts` — dimension/downscale/codec behavior through adapters.
- [ ] `src/lib/memoryDraft.test.ts` — retry preservation and partial reset after success.
- [ ] `src/lib/stableVisitOrder.test.ts` — stable per-visit shuffle and new-item handling.

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

- [ ] All tasks have `<automated>` verification or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verification
- [ ] Wave 0 covers all missing test references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
