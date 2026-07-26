---
phase: 10
slug: abertura-cinematogr-fica-do-p-r-do-sol
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-26
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 + Playwright 1.62.0 |
| **Config file** | `vite.config.ts`, `playwright.config.ts` |
| **Quick run command** | `npm test -- src/lib/cinematicIntro.test.ts` |
| **Focused browser command** | `npx playwright test tests/cinematic-intro.spec.ts --project=emulated-chromium-desktop` |
| **Full suite command** | `npm run test:release` |
| **Estimated runtime** | ~10 s unit/build; ~1–3 min browser/release |

---

## Sampling Rate

- **After every logic task commit:** Run `npm test -- src/lib/cinematicIntro.test.ts && npm run build`.
- **After every visual/motion task commit:** Run the smallest named Playwright subset proving the changed behavior.
- **After every plan wave:** Run `npx playwright test tests/cinematic-intro.spec.ts`.
- **Before phase verification:** `npm run test:release` must be green.
- **Max quick-feedback latency:** 30 seconds.
- **Visual quality rule:** the art-direction task cannot be declared complete from build/tests alone; desktop and mobile keyframes require explicit human approval before the lifecycle plans execute.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | INTRO-01 | T-10-VISUAL | Rejected sky-only/fade composition is removed | static + browser keyframe | `npm run build && npx playwright test tests/cinematic-intro.spec.ts --project=emulated-chromium-desktop -g "keyframe"` | ✅ existing spec, new cases pending | ⬜ pending |
| 10-01-02 | 01 | 1 | INTRO-01 | T-10-VISUAL | Desktop and 320×760 are separately art-directed | visual checkpoint | deterministic seek/contact sheets at 0/40/70/88/100% | ❌ checkpoint artifacts pending | ⬜ pending |
| 10-02-01 | 02 | 2 | INTRO-01 | T-10-GEOMETRY | Canonical sun ends at measured target and resize preserves progress | unit + browser | `npm test -- src/lib/cinematicIntro.test.ts && npx playwright test tests/cinematic-intro.spec.ts --project=emulated-chromium-desktop -g "arc|geometry|resize"` | ✅ files exist, cases revised in task | ⬜ pending |
| 10-02-02 | 02 | 2 | INTRO-02 | T-10-FAILOPEN | Every WAAPI failure reveals operable final UI | browser fault injection | `npx playwright test tests/cinematic-intro.spec.ts --project=emulated-chromium-desktop -g "fail-open|reduced motion|intent"` | ❌ revised cases pending | ⬜ pending |
| 10-03-01 | 03 | 3 | INTRO-02 | T-10-LIFECYCLE | Hash/remount/bfcache/focus cleanup remain mount-scoped | browser | `npx playwright test tests/cinematic-intro.spec.ts -g "route|fragment|bfcache|skip"` | ✅ existing cases require adaptation | ⬜ pending |
| 10-03-02 | 03 | 3 | INTRO-01, INTRO-02 | T-10-RELEASE | Approved keyframes and invite regressions pass cross-browser | release | `npm run test:release` | ✅ release suite exists | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Rewrite `tests/cinematic-intro.spec.ts` keyframe contracts so they reject “sky-only + vertical fall + group fade” and support deterministic seek at 0/40/70/88/100%.
- [ ] Add desktop and 320×760 contact-sheet/screenshot output for the human art-direction checkpoint.
- [ ] Add throwing WAAPI fixtures for `animate()`, `finish()`, `cancel()` and playback-rate acceleration.
- [ ] Extend `src/lib/cinematicIntro.test.ts` with normalized arc geometry, progress preservation and intent acceleration policy.
- [ ] Keep the existing Chromium/WebKit desktop/mobile projects; no new test framework or dependency is required.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Editorial quality of first frame and atmospheric layers | INTRO-01 | “Cinematic” and “not prototype-like” are perceptual art-direction judgments | Review 0/40/70/88/100% desktop and 320×760 contact sheets before approving Plan 10-01 |
| Camera reads as subtle pull-back, not interface zoom | INTRO-01 | Transform values can be measured but the perceived camera language is subjective | Watch a natural 3 s run on desktop and mobile; reject if UI appears to scale mechanically |
| Halo/reflection continuity has no blink or dry handoff | INTRO-01 | Rasterization, masks and compositing differ by browser/GPU | Watch Chrome and Safari hardware runs at normal speed and slow-motion recording |
| Real bfcache restoration cleans handles/listeners | INTRO-02 | Admission into bfcache is controlled by the browser | Navigate `/` → `/confirmar` → Back in Chrome/Safari and confirm exactly one clean replay |
| Mid/low-range mobile remains fluid | INTRO-02 | CI emulation cannot represent device GPU/compositor cost | Run on a representative phone, observe 3 s sequence and verify responsive interaction |

---

## Objective Visual Contracts

- The same canonical sun node is connected at all sampled keyframes and finishes at `transform: none`.
- At 0%, horizon, sea and depth remain recognizable; the frame is never sky-only.
- At 40–70%, light/haze/reflection progress while landscape layers remain continuous.
- At 88–100%, halo connects to horizon/reflection and primary then secondary copy follow the approved hierarchy.
- Desktop and mobile keyframes are independently composed; mobile is not accepted as a crop of desktop.
- Large animated layers use only `transform` and `opacity`; masks, gradients, blur and texture remain static.
- No visual layer captures pointer input or becomes a focus ancestor.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verification or explicit Wave 0 dependencies.
- [ ] Sampling continuity: no three consecutive tasks without automated verification.
- [ ] The Plan 10-01 human checkpoint blocks full timeline/lifecycle execution until approved.
- [ ] No watch-mode flags.
- [ ] Quick feedback latency stays below 30 seconds.
- [ ] Full Chromium/WebKit and release gates run after visual approval.
- [ ] `nyquist_compliant: true` set after plans bind exact task commands.

**Approval:** pending
