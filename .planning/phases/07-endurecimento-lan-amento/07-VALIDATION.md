---
phase: 7
slug: endurecimento-lan-amento
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-25
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Unit/integration framework** | Vitest 4.1.10 + convex-test 0.0.54 |
| **Current config** | `vite.config.ts` |
| **Browser/a11y framework** | Playwright + axe (Wave 0 installs exact pinned versions) |
| **Quick run command** | `npm test -- --run` or the focused `npx vitest run <files>` command owned by the task |
| **Full suite command** | `npm test && npm run build && npm run test:browser` |
| **Current baseline** | 25 files / 494 tests green; build green |
| **Estimated focused runtime** | under 30 seconds |

---

## Sampling Rate

- **After every implementation task:** Run its focused Vitest/Playwright command plus `npm run build`.
- **After every plan:** Run `npm test && npm run build && git diff --check`.
- **Before DNS changes:** Run the complete release gate against preview and the production `.vercel.app` URL.
- **After DNS:** Run an immediate live smoke and repeat after propagation.
- **After every hotfix:** Run the focused regression, full build and the affected live journey.
- **Before `/gsd-verify-work`:** Automated suite and required live checks must be green; physical-device items may remain explicitly pending because they do not block publication.
- **Max automated feedback latency:** 30 seconds for focused commands.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | LAUNCH-03 | T-07-CSV-01 | CSV normalization/grouping is deterministic and reports malformed/conflicting rows | unit | `npx vitest run src/lib/guestCsv.test.ts` | ❌ W0 | ⬜ pending |
| 07-01-02 | 01 | 1 | LAUNCH-03 | T-07-CSV-02 | Import requires admin auth, creates pending guests only and never overwrites an existing family | integration | `npx vitest run convex/admin.test.ts -t "csv\\|import\\|existing\\|pending"` | ✅ extend | ⬜ pending |
| 07-01-03 | 01 | 1 | LAUNCH-03 | T-07-CSV-03 | Preview, partial result, auth loss and double-submit remain accessible and fail closed | UI/build | `npx vitest run src/components/admin/AdminGuests.test.tsx && npm run build` | ❌ W0 | ⬜ pending |
| 07-02-01 | 02 | 2 | LAUNCH-02, LAUNCH-03 | T-07-META-01 | Canonical/OG metadata use the approved HTTPS origin and expose no secret | unit/build | `npx vitest run src/content/productionMetadata.test.ts && npm run build` | ❌ W0 | ⬜ pending |
| 07-02-02 | 02 | 2 | LAUNCH-02 | T-07-A11Y-01 | Public/admin routes pass axe, keyboard and mobile reflow checks without protected pre-auth payloads | browser | `npm run test:browser` | ❌ W0 | ⬜ pending |
| 07-02-03 | 02 | 2 | LAUNCH-01, LAUNCH-04 | T-07-EVIDENCE-01 | Runbooks distinguish automated/emulated evidence from physical-device evidence | docs/build | `npm test && npm run build && git diff --check` | ❌ W0 | ⬜ pending |
| 07-03-01 | 03 | 3 | LAUNCH-03, LAUNCH-04 | T-07-ENV-01 | Preview/prod deploy keys and admin secret remain environment-scoped; every production env command uses `--prod` | CLI/live | `npm test && npm run build && npx convex deploy --dry-run` | partial | ⬜ pending |
| 07-03-02 | 03 | 3 | LAUNCH-03, LAUNCH-04 | T-07-DATA-01 | A verified backup/export exists before any production data mutation | live evidence | `git diff --check` plus recorded checksum/timestamp | ❌ W0 | ⬜ pending |
| 07-03-03 | 03 | 3 | LAUNCH-04 | T-07-SMOKE-01 | `.vercel.app` serves SPA routes, reaches production Convex and keeps `/admin` private before auth | browser/live | `npm run test:release` | ❌ W0 | ⬜ pending |
| 07-04-01 | 04 | 4 | LAUNCH-04 | T-07-DNS-01 | `www` is canonical, apex redirects preserving path/query, TLS is valid and DNS targets match Vercel | HTTP/DNS | `npm run test:release` plus `dig`/`curl` evidence | ❌ W0 | ⬜ pending |
| 07-04-02 | 04 | 4 | LAUNCH-04 | T-07-ROLLBACK-01 | Frontend rollback is not represented as Convex/data rollback and returns to the last healthy release | drill/live | Recorded rollback drill plus focused smoke | ❌ W0 | ⬜ pending |
| 07-04-03 | 04 | 4 | LAUNCH-01, LAUNCH-02 | T-07-DEVICE-01 | Physical-device matrix remains honest: untested hardware is pending, never auto-passed | manual + docs | `git diff --check` and matrix schema assertion | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/guestCsv.test.ts` — BOM, comma/semicolon, quotes, CRLF, header normalization, grouping, Brazilian phone variants, duplicates and partial-report reasons.
- [ ] `src/components/admin/AdminGuests.test.tsx` — select/preview/confirm/result, double submit, batch failure, lost authorization, focus and `aria-live`.
- [ ] `src/content/productionMetadata.test.ts` — canonical origin, absolute OG URL, asset and secret absence.
- [ ] Playwright + axe with exact pinned versions and non-watch scripts `test:browser` and `test:release`.
- [ ] Release browser specs for route refresh, pre-auth transport privacy, axe, 320px/200% reflow and critical production smoke.
- [ ] `07-LAUNCH-CHECKLIST.md`, `07-SMOKE.md`, `07-DEVICE-MATRIX.md` and `07-ROLLBACK.md` evidence templates.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real `wa.me` handoff in iOS/Android browsers and embedded WebViews | LAUNCH-01 | App handoff and WebView policy require actual mobile environments | Record device, OS, browser/WebView, source URL, result and timestamp; do not count desktop emulation |
| HEIC/HEIF selection and conversion in Safari on iPhone | LAUNCH-01 | Native codec behavior depends on physical Apple hardware/software | Select a real iPhone HEIC photo, confirm preview/downscale/upload/moderation, and preserve no personal fixture |
| Countdown in a changed device timezone | LAUNCH-01 | Requirement explicitly calls for real-device timezone behavior | Change device timezone away from `-03:00`, load/reload countdown and compare with the Aracaju-qualified boundary |
| Keyboard, 200% zoom, 320px reflow, contrast and long-content review | LAUNCH-02 | Automated axe cannot prove all WCAG/mobile behavior | Execute the documented route/state matrix and record issue severity |
| Vercel/Convex environment isolation and backup download/checksum | LAUNCH-03, LAUNCH-04 | Requires authenticated production consoles and external artifacts | Verify names only, never display secrets; save backup outside git and record timestamp/checksum |
| DNS/TLS/redirect propagation and rollback drill | LAUNCH-04 | Depends on live external state and authenticated consoles | Record Vercel domain health, DNS-only Cloudflare records, TLS, preserved path/query, healthy target and recovery outcome |

---

## Validation Sign-Off

- [ ] All tasks have an automated verify command or a Wave 0 dependency.
- [ ] Sampling continuity has no three consecutive tasks without automated feedback.
- [ ] Wave 0 covers every missing test/evidence artifact.
- [ ] No watch-mode flags are used.
- [ ] Focused feedback latency stays below 30 seconds.
- [ ] No secret, real guest data or private image appears in fixtures, logs or committed evidence.
- [ ] No physical-device item is marked passed from emulation.
- [ ] Every production Convex environment command that requires production includes `--prod`.
- [ ] `nyquist_compliant: true` is set only after plan/task mapping is finalized.

**Approval:** pending
