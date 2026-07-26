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
| **Framework** | Playwright Test 1.62.0 for browser behavior; Vitest 4.1.10 for pure policy helpers |
| **Config file** | `playwright.config.ts`; `vite.config.ts` |
| **Quick run command** | `npm run build && npx playwright test tests/cinematic-intro.spec.ts --project=emulated-chromium-desktop` |
| **Full suite command** | `npm run test:release` |
| **Estimated runtime** | ~30 seconds focused; ~120 seconds full suite |

---

## Sampling Rate

- **After every task commit:** Run the focused Vitest file when a pure helper
  changes and the focused Playwright grep for the browser behavior changed.
- **After every plan wave:** Run
  `npm run build && npx playwright test tests/cinematic-intro.spec.ts`.
- **Before `/gsd-verify-work`:** `npm run test:release` must be green.
- **Max feedback latency:** 30 seconds for focused checks.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | INTRO-01, INTRO-02 | T-10-01 | Exact allowlist comparison for URL fragments; no selector interpolation | unit | `npx vitest run src/lib/cinematicIntro.test.ts` | ❌ W0 | ⬜ pending |
| 10-01-02 | 01 | 1 | INTRO-01 | — | Same canonical sun reaches measured target within 1 CSS px | browser | `npm run build && npx playwright test tests/cinematic-intro.spec.ts --project=emulated-chromium-desktop -g "geometry"` | ❌ W0 | ⬜ pending |
| 10-02-01 | 02 | 2 | INTRO-02 | T-10-02 | Hidden controls are inert while skip link remains reachable | browser | `npm run build && npx playwright test tests/cinematic-intro.spec.ts --project=emulated-chromium-desktop -g "skip link"` | ❌ W0 | ⬜ pending |
| 10-02-02 | 02 | 2 | INTRO-02 | T-10-03 | Animation, RAF and listeners are cleaned up on route exit | browser | `npm run build && npx playwright test tests/cinematic-intro.spec.ts --project=emulated-chromium-desktop -g "route entry|bfcache"` | ❌ W0 | ⬜ pending |
| 10-03-01 | 03 | 3 | INTRO-01, INTRO-02 | — | Responsive geometry, reduced motion and scroll cancellation remain correct | browser | `npm run build && npx playwright test tests/cinematic-intro.spec.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/cinematicIntro.test.ts` — eligibility and scroll-threshold
  policy if a pure helper is extracted.
- [ ] `tests/cinematic-intro.spec.ts` — deterministic first frame, geometry,
  resize, reduced motion, focus, scroll, fragment, re-entry and bfcache
  coverage.
- [ ] Stable observable selectors: `data-intro-phase`,
  `data-testid="hero-sun-target"` and
  `data-testid="hero-sun-visual"`.
- [ ] Update `tests/release.spec.ts` so existing topbar and mobile-menu
  assertions finish the intro before testing controls that are initially
  inert.

Existing Playwright/Vitest infrastructure is sufficient; no package or config
installation is required.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Perceived absence of a swap or blink at the sun handoff | INTRO-01 | Subpixel equality is automated, but perceptual continuity on real compositing hardware benefits from a visual smoke | On a 320px phone, tablet and desktop, reload `/`, watch one natural 2-second run and confirm the disc/halo remain continuous through reveal |
| Real bfcache restoration | INTRO-02 | Eligibility for bfcache depends on browser policy and cannot be guaranteed by a synthetic event alone | In Safari/WebKit and Chrome, enter `/`, navigate to `/confirmar`, use browser Back and confirm the eligible intro restarts without stale focus or listeners |

---

## Determinism Contract

- Install `page.addInitScript()` before navigation to wrap only the WAAPI
  animation on `[data-testid="hero-sun-visual"]`, pause it and expose the
  `Animation` handle.
- Use `Animation.finish()` instead of two-second sleeps for ordinary tests;
  keep one unpatched natural-duration smoke.
- Compare visual and target rect center, width and height with absolute error
  no greater than 1 CSS pixel.
- Exercise 320×760, 768×1024 and 1280×800 viewports, including resize before
  finish.
- Use `page.emulateMedia({ reducedMotion: 'reduce' })` for the reduced-motion
  contract.
- Do not use screenshots as the primary timing/geometry oracle.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s for focused checks
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
