---
phase: 04
slug: carta-de-vinhos
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-24
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 + convex-test 0.0.54 |
| **Config file** | `vite.config.ts` |
| **Quick run command** | `npm test -- --run convex/wines.test.ts src/lib/wineWhatsApp.test.ts src/lib/wineDeepLink.test.ts` |
| **Full suite command** | `npm test && npm run build` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run the focused test file(s) named in the task.
- **After every plan wave:** Run `npm test && npm run build`.
- **Before `/gsd-verify-work`:** Full suite, build, Convex smoke and asset audit must be green.
- **Max feedback latency:** 30 seconds for automated local checks.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | GIFT-01 | T-04-01 | Public DTO omits gift identity and admin fields | schema/unit | `npx vitest run convex/wines.test.ts -t "schema"` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | GIFT-02 | T-04-02 | Catalog has 37 unique codes/images and exact 13/10/14 bands | unit | `npx vitest run convex/wines.test.ts -t "catalog"` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 1 | GIFT-01/02/04 | T-04-03 | Reconciliation is idempotent and preserves gifted state | integration | `npx vitest run convex/wines.test.ts -t "reconciliation"` | ❌ W0 | ⬜ pending |
| 04-01-04 | 01 | 1 | GIFT-03/04 | T-04-04 | Queries use stable category/price/code order and omit private fields | integration | `npx vitest run convex/wines.test.ts -t "public queries"` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 2 | GIFT-03 | T-04-05 | WhatsApp number and decoded message match approved contract exactly | unit/security | `npx vitest run src/lib/wineWhatsApp.test.ts` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 2 | GIFT-03 | T-04-06 | Product fragments are safe, stable and resolve after async query load | unit/browser | `npx vitest run src/lib/wineDeepLink.test.ts` | ❌ W0 | ⬜ pending |
| 04-02-03 | 02 | 2 | GIFT-03/04 | T-04-07 | Available cards have one safe anchor; gifted cards have none | browser | Browser DOM inspection at 375/768/1280 | N/A | ⬜ pending |
| 04-03-01 | 03 | 3 | GIFT-03/04 | T-04-08 | Home shows fixed trio and successful RSVP exposes persistent CTA | browser/system | Save outcome and deep-link browser matrix | N/A | ⬜ pending |
| 04-03-02 | 03 | 3 | GIFT-04 | T-04-09 | Home and catalog react to backend status change without reload | real Convex/browser | Two-view live update smoke | N/A | ⬜ pending |
| 04-03-03 | 03 | 3 | GIFT-03 | T-04-10 | All 37 files pass mapping, alpha, dimensions and manifest audit | asset/system | `npm run audit:wine-assets` | ❌ W0 | ⬜ pending |
| 04-03-04 | 03 | 3 | All | T-04-11 | Full regression and live Convex type/function smoke pass | system | `npm test && npm run build && npx convex dev --once && git diff --check` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `convex/wines.test.ts` — schema, canonical catalog, reconciliation and public-query tests.
- [ ] `src/lib/wineWhatsApp.test.ts` — exact Unicode copy, number, price and one-time encoding.
- [ ] `src/lib/wineDeepLink.test.ts` — safe DOM ID and hash parsing.
- [ ] `scripts/audit-wine-assets.mjs` — deterministic existence/mapping/alpha/dimension/manifest audit.
- [ ] `public/wines/manifest.json` — approved source and transformation metadata without private correspondence.
- [ ] Add `audit:wine-assets` to `package.json` when the audit script is introduced.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Asset permission and product identity | GIFT-02 / D-13 | Alpha/existence checks cannot prove publication rights or that label/vintage matches the product | Compare all 37 files to code/title, verify written permission permits local publication and transformations, then sign off the manifest |
| Responsive catalog and home preview | GIFT-03/04 | Existing stack has no DOM/E2E runner | Inspect 375px, 768px and 1280px; verify 1/2/3 columns, no horizontal overflow, visible focus, shortcuts and gifted text |
| Async deep-link behavior | GIFT-03 | Requires router + delayed Convex query + focus/scroll observation | Open a direct fragment before data loads, use home card, refresh, back/forward, gifted and unknown fragments |
| Reactive status | GIFT-04 | Requires a live Convex subscription in two mounted views | Open home and `/presentes`, patch one test wine internally, confirm both views update without reload, then restore |
| RSVP success CTA outcomes | GIFT-03 | Requires the existing live RSVP state machine | Confirm CTA stays hidden before save and after failures; appears after partial, mixed and all-no successful saves |
| External WhatsApp handoff | GIFT-03 | Real app/WebView launch is explicitly deferred | In Phase 4 inspect exact `href`, `target` and `rel`; perform Safari/Chrome/Instagram/Facebook launch matrix in Phase 7 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies.
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify.
- [ ] Wave 0 covers all MISSING references.
- [ ] No watch-mode flags.
- [ ] Feedback latency < 30s.
- [ ] `nyquist_compliant: true` set in frontmatter after `/gsd-validate-phase`.

**Approval:** pending
