---
phase: 10
slug: abertura-cinematogr-fica-do-p-r-do-sol
status: validated
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-26
validated: 2026-07-26
---

# Phase 10 — Validation Strategy

> Validated per-task feedback contract for the revised three-wave plan.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 + Playwright 1.62.0 |
| **Config file** | `vite.config.ts`, `playwright.config.ts` |
| **Quick run command** | `npm test -- src/lib/cinematicIntro.test.ts` |
| **Focused browser command** | `npx playwright test tests/cinematic-intro.spec.ts --project=emulated-chromium-desktop` |
| **Visual spec** | `tests/cinematic-intro-visual.spec.ts` — created by 10-01-02; runs against the normal production preview and injects its WAAPI registry only with `page.addInitScript()` before navigation |
| **Full suite command** | `npm run test:release` |
| **Estimated runtime** | ~10 s unit/build; focused Chromium subsets target <30 s; cross-browser/release remain wave gates |

---

## Sampling Rate

- **After every logic task commit:** Run `npm test -- src/lib/cinematicIntro.test.ts && npm run build`.
- **After every visual/motion task commit:** Run the smallest named Playwright subset proving the changed behavior.
- **After Wave 1 auto tasks:** Run the deterministic visual spec, generate both contact sheets, then stop at the art-direction checkpoint.
- **After Wave 2:** Run the complete focused Chromium contract after each task and the plan verification before advancing.
- **After Wave 3 auto tasks:** Run `npx playwright test tests/cinematic-intro.spec.ts` across all configured projects and `npm run test:release`, then stop at real-hardware UAT.
- **Before phase verification:** `npm run test:release` must be green.
- **Max quick-feedback latency:** 30 seconds.
- **Human-gate rule:** neither `--auto` nor green automation may approve 10-01-03 or 10-03-03.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure / observable behavior | Test Type | Exact task-level command or checkpoint | Evidence availability | Status |
|---------|------|------|-------------|------------|------------------------------|-----------|----------------------------------------|----------------------|--------|
| 10-01-01 | 01 | 1 | INTRO-01, INTRO-02 | T-10-01-B | Rejected blanket reveal/inert lifecycle is removed; skip/topbar and already-visible controls remain available, while `complete` is the immediate fully visible/non-inert result for reduced motion, ineligible frequency/known fragments and fail-open completion | unit + build | `npm test -- src/lib/cinematicIntro.test.ts && npm run build` | ✅ unit spec/build infrastructure exist; Task 2's focused browser spec owns rendered onset/focus proof | ⬜ pending |
| 10-01-02 | 01 | 1 | INTRO-01, INTRO-02 | T-10-01-A, T-10-01-B, P-10-VISUAL, P-10-ACCESS | Besides deterministic injected seeking, normal playback proves primary, secondary and CTA groups inert only while invisible, ordered unlock, no invisible focusable CTA, visible skip/topbar availability, and immediate fully visible/non-inert reduced-motion, bypass and forced-failure states | build + focused visual/accessibility | `npm run build && npx playwright test tests/cinematic-intro-visual.spec.ts --project=emulated-chromium-desktop` | ❌ visual spec and PNGs are created by this task; `playwright.config.ts` already serves `npm run preview` | ⬜ pending |
| 10-01-03 | 01 | 1 | INTRO-01 | P-10-VISUAL | Editorial quality, continuity, post-arrival light bridge without water reflection, mobile direction and camera reading are explicitly approved | blocking human checkpoint | Review both generated contact sheets; all five criteria must receive explicit approval | ❌ waits on 10-01-02 artifacts | ⬜ pending |
| 10-02-01 | 02 | 2 | INTRO-01, INTRO-02 | T-10-02-B | Pure arc/progress/rate contracts are finite and responsive; arc-length normalization produces constant apparent speed over the full `0–3000ms` sun traversal with exact endpoints | unit + build | `npm test -- src/lib/cinematicIntro.test.ts && npm run build` | ✅ unit spec exists; revised cases written in task | ⬜ pending |
| 10-02-02 | 02 | 2 | INTRO-01, INTRO-02 | T-10-02-A, T-10-02-D | Motion/lifecycle behavior is written red first, then one controller proves exact `3000ms` arrival, glow only after arrival, a separate `700ms` reveal beat, resize, intent, reduce and fail-open contracts | focused Chromium + build | `npx playwright test tests/cinematic-intro.spec.ts --project=emulated-chromium-desktop -g "continuous\|arc\|geometry\|resize\|intent\|reduced motion\|fail-open" && npm run build` | ✅ focused spec exists; task adds revised cases before production | ⬜ pending |
| 10-02-03 | 02 | 2 | INTRO-01, INTRO-02 | T-10-02-A | Semantic geometry, CTA full-color clip reveal and fault contracts complete the approved timeline matrix | focused Chromium | `npx playwright test tests/cinematic-intro.spec.ts --project=emulated-chromium-desktop -g "continuous\|arc\|geometry\|resize\|intent\|reduced motion\|fail-open"` | ✅ same focused spec, extended after 10-02-02 | ⬜ pending |
| 10-03-01 | 03 | 3 | INTRO-02 | T-10-03-A, T-10-03-B | Route/hash/remount/bfcache/focus and all WAAPI failure paths are mount-scoped and fail-open | focused Chromium | `npx playwright test tests/cinematic-intro.spec.ts --project=emulated-chromium-desktop -g "route\|fragment\|same mount\|bfcache\|skip\|focus\|fail-open\|WAAPI"` | ✅ focused spec exists; cases adapted in task | ⬜ pending |
| 10-03-02 | 03 | 3 | INTRO-01, INTRO-02 | T-10-03-C, T-10-03-D | Approved baselines retain injected semantic WAAPI seeking, the normal preview remains free of the test namespace, and Axe fails on every selected WCAG A/AA violation | focused Chromium visual + Axe | `npx playwright test tests/cinematic-intro-visual.spec.ts --project=emulated-chromium-desktop -g "approved baseline\|test namespace" && npx playwright test tests/release.spec.ts --project=emulated-chromium-desktop -g "Axe\|axe\|WCAG\|AA"` | ❌ visual spec arrives in 10-01-02; release spec exists; baselines/UAT are task outputs | ⬜ pending |
| 10-03-03 | 03 | 3 | INTRO-01, INTRO-02 | P-10-VISUAL, P-10-ACCESS | Real hardware approves cinematic continuity, camera, mobile fluidity, rotation, reduce, interaction and bfcache | blocking human checkpoint | Execute every applicable row in `10-UAT.md` with device/OS/browser/version/result/evidence | ❌ `10-UAT.md` is created by 10-03-02 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] Vitest, Playwright, `src/lib/cinematicIntro.test.ts`, `tests/cinematic-intro.spec.ts`, `tests/release.spec.ts` and all four configured browser projects already exist.
- [x] No framework, package or separate Wave 0 plan is required.
- [ ] `tests/cinematic-intro-visual.spec.ts` does not yet exist; 10-01-02 creates it with a pre-navigation `page.addInitScript()` WAAPI registry and a separate no-injection assertion, then runs it against `npm run preview` before the 10-01-03 checkpoint.
- [ ] Revised red contracts for the production controller are written inside 10-02-02 before production changes, then rerun by the same task.
- [ ] Exhaustive lifecycle/failure cases are added in 10-03-01 before the phase-wide cross-browser gate.

`wave_0_complete` remains `false` because the visual spec is absent on disk at
planning time. This is not a Nyquist gap: its producing task owns the file and
must execute it before any dependent checkpoint or plan.

---

## Blocking Human Checkpoints

| Checkpoint | Blocks | Required evidence |
|------------|--------|-------------------|
| 10-01-03 — art direction | All of 10-02 and 10-03 | Explicit verdict for editorial first frame, landscape continuity, post-arrival halo bridge without water reflection, separate mobile direction and camera-versus-zoom, using both 0/40/70/88/100 contact sheets |
| 10-03-03 — real-hardware UAT | Phase completion | Completed `10-UAT.md` rows for Chrome/Safari hardware, 320px-class phone, slow-motion continuity, camera reading, real bfcache, rotation, reduced motion, focus/skip and mobile fluidity |

---

## Objective Visual Contracts

- The same canonical sun node is connected at all sampled keyframes and finishes at `transform: none`.
- At 0%, horizon, sea and depth remain recognizable; the frame is never sky-only.
- From `0ms` through the exact `3000ms` arrival frame, warm horizon and haze remain at zero opacity; no water reflection, glitter, cloud or palm layer exists.
- After arrival, glow begins at `3060ms`; primary copy begins at `3100ms`, secondary at `3400ms`, CTAs at `3460ms`, and the final hero is committed at `3700ms`.
- Desktop and mobile keyframes are independently composed; mobile is not accepted as a crop of desktop.
- Large landscape layers use only `transform` and `opacity`; copy reveal uses only `clip-path` and `transform`, while CTA background, border, text color, filter and ancestor opacity remain at their final values throughout.
- No visual layer captures pointer input or becomes a focus ancestor.
- During successful playback, each of the three copy groups is inert only until its own first visible frame; primary unlocks before secondary and CTAs, and no invisible CTA is focusable.
- Reduced motion, ineligible frequency/known-fragment entry and any provisional controller failure synchronously expose all three copy groups fully visible, non-inert and operable.
- The normal production preview exposes no test seek namespace; deterministic seeking exists only in the Playwright page world after `page.addInitScript()`.

---

## Validation Sign-Off

- [x] Every auto task has an exact `<automated>` command mirrored above.
- [x] 10-02-02 writes its focused Playwright cases before production implementation and verifies them in the same task.
- [x] 10-03-01 and 10-03-02 use Chromium-focused first signals; cross-browser and release commands remain final wave gates.
- [x] Both human checkpoints are represented and remain blocking.
- [x] The visual command exercises the normal production preview, while all seek instrumentation is test-injected and separately proven absent without injection.
- [x] No three auto tasks execute without a focused automated signal.
- [x] No watch-mode flag or new dependency is present.
- [x] `status: validated` and `nyquist_compliant: true` reflect the revised task order and commands.
- [x] `wave_0_complete: false` reflects the actual missing visual spec/artifacts rather than invented evidence.

**Approval:** validation architecture accepted; execution and both human gates remain pending.
