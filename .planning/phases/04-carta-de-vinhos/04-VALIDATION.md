---
phase: 04
slug: carta-de-vinhos
status: validated
nyquist_compliant: true
wave_0_complete: true
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
- **Before `/gsd-verify-work`:** Full suite, build, Convex palette/reconciliation tests, reversible live smoke and browser matrix must be green.
- **Max feedback latency:** 30 seconds for automated local checks.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 0 | GIFT-01/02 | T-04-01/03 | Schema/catalog têm 37 códigos únicos, 13/10/14 e tipos fechados | schema/unit | `npx vitest run convex/wines.test.ts -t "schema\|catalog"` | ✅ | ✅ complete |
| 04-01-02 | 01 | 0 | GIFT-01/02/04 | T-04-02/04/05 | Ensure é idempotente; seam internal retorna snapshot e restaura available/gifted sem API pública | integration/security | `npx vitest run convex/wines.test.ts -t "reconciliation\|smoke seam\|internal only"` | ✅ | ✅ complete |
| 04-01-03 | 01 | 0 | GIFT-03/04 | T-04-01/04 | Queries são ordenadas/reativas, DTO omite privados e writers ficam em internal | integration/privacy | `npx vitest run convex/wines.test.ts -t "public queries\|featured"` | ✅ | ✅ complete |
| 04-02-01 | 02 | 1 | GIFT-03 | T-04-06/07 | Número/copy/encoding e fragmentos hostis seguem contratos exatos | unit/security | `npx vitest run src/lib/wineWhatsApp.test.ts src/lib/wineDeepLink.test.ts` | ✅ | ✅ complete |
| 04-02-02 | 02 | 1 | GIFT-02 | T-04-08/09 | Legacy photo preflight was implemented under the superseded D-13 contract | historical asset/unit | `npm run audit:wine-assets -- --preflight` | ✅ superseded | ✅ complete |
| 04-03-01 | 03 | 2 | GIFT-03 | T-04-10/12 | `/presentes`, tokens, copy e atalhos compilam sem perder rotas/CSS live | build/content | `npm run build && npx vitest run src/content/event.test.ts` | ✅ | ✅ complete |
| 04-03-02 | 03 | 2 | GIFT-03/04 | T-04-10/11/13/14 | Available tem anchor seguro e gifted não; visual antigo será substituído no 04-05 | browser + pure tests | `npx vitest run src/lib/wineWhatsApp.test.ts src/lib/wineDeepLink.test.ts && npm run build` | ✅ superseded visual | ✅ complete |
| 04-03-03 | 03 | 2 | GIFT-03/04 | T-04-12/14 | Catálogo/estados/deep-link compilam; matriz manual cobre DOM responsivo | system/browser | `npm test && npm run build && git diff --check` | ✅ | ✅ complete |
| 04-04-01 | 04 | 3 | GIFT-03 | T-04-18 | Nav/copy combinadas preservam Fase 5 | content/regression | `npx vitest run src/content/event.test.ts && npm run build` | ✅ | ✅ complete |
| 04-04-02 | 04 | 3 | GIFT-03/04 | T-04-16/17/18 | Preview fixa trio/order e usa um Link sem nested action | system/browser | `npm test && npm run build && git diff --check` | ✅ | ✅ complete |
| 04-04-03 | 04 | 3 | GIFT-03 | T-04-15 | CTA depende exclusivamente de `result.kind === "saved"` | system/browser | `npm test && npm run build && git diff --check` | ✅ | ✅ complete |
| 04-05-01 | 05 | 4 | GIFT-01/02/04 | T-04-24/25/27 | Migração em dois pushes aceita legado, completa 37 paletas, endurece schema; DTO e `Presentes.tsx` omitem imageUrl/provenance; ensure preserva gifted | unit/integration/privacy | `npx vitest run convex/wines.test.ts -t "catalog\|palette\|schema\|migration\|reconciliation\|public queries\|featured" && npm run build` | ✅ | ✅ complete |
| 04-05-02 | 05 | 4 | GIFT-03/04 | T-04-25/26/28 | Silhueta local substitui imagens; grid 1/2/3/4; infraestrutura obsoleta some sem tocar `MemoryCard`/Fase 5 | system/source audit | `npm test && npm run build && git diff --check && test ! -e src/components/gifts/WineImage.tsx && test ! -e scripts/audit-wine-assets.mjs && test ! -e public/wines/manifest.json && ! rg -n "imageUrl\|WineImage\|audit:wine-assets\|/wines/" convex/wines.ts src/routes/Presentes.tsx src/components/gifts src/content/gifts.ts package.json` | ✅ | ✅ complete |
| 04-05-03 | 05 | 4 | All | T-04-24/25/26/27/28/29 | Seed idempotente, two-view snapshot/restore, browser 1/2/3/4 e zero remote image requests | system/live/browser | `npx vitest run convex/wines.test.ts src/lib/wineWhatsApp.test.ts src/lib/wineDeepLink.test.ts && npm test && npm run build && npx convex dev --once && git diff --check` | ✅ | ✅ complete |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Planned Contract Files by Wave

- [x] **Wave 0 / Plan 01:** `convex/wines.test.ts` — schema, catálogo, reconciliação, seam internal snapshot/restore, ausência em API pública e queries.
- [x] **Wave 1 / Plan 02:** `src/lib/wineWhatsApp.test.ts` — copy Unicode, número, preço e encoding único.
- [x] **Wave 1 / Plan 02:** `src/lib/wineDeepLink.test.ts` — DOM ID/hash seguro.
- [x] **Wave 1 / Plan 02:** legacy photo preflight exists only as historical output and is superseded by the approved D-13 revision.
- [x] **Wave 4 / Plan 05:** `04-PALETTE-REFERENCES.md`, palette validators/tests, deterministic silhouette and cleanup of legacy photo infrastructure.

`wave_0_complete` is `true`: Plans 01–04 were executed and `convex/wines.test.ts` exists. `nyquist_compliant` remains `true`: all three revised Plan 05 tasks have focused automated feedback, and the final task includes the manual Browser evidence that the current stack cannot cover through DOM/E2E tests.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Palette provenance and non-copying | GIFT-02 / D-14 | Tests validate URLs/hex but cannot judge whether a palette is a muted inspiration rather than copied artwork | Review the 37-row reference table; verify URL identifies the product and implementation stores colors only—no image/logo/layout |
| Neutral silhouette | GIFT-03 / D-10/D-13 | Authorship/brand neutrality and visual composition are perceptual | Compare to approved reference; verify one logo-free geometry, blank abstract label and no fidelity claim |
| Responsive catalog and home preview | GIFT-03/04 | Existing stack has no DOM/E2E runner | Inspect 320, 375, 768, 1024 and 1280 plus 320 at 200%; verify catalog 1/1/2/3/4, preview 1/1/2/3/3, no overflow and visible focus |
| Async deep-link behavior | GIFT-03 | Requires router + delayed Convex query + focus/scroll observation | Open a direct fragment before data loads, use home card, refresh, back/forward, gifted and unknown fragments |
| Reactive status | GIFT-04 | Requires a live Convex subscription in two mounted views | Open home and `/presentes`, patch one test wine internally, confirm both views update without reload, then restore |
| RSVP success CTA outcomes | GIFT-03 | Requires the existing live RSVP state machine | Confirm CTA stays hidden before save and after failures; appears after partial, mixed and all-no successful saves |
| External WhatsApp handoff | GIFT-03 | Real app/WebView launch is explicitly deferred | In Phase 4 inspect exact `href`, `target` and `rel`; perform Safari/Chrome/Instagram/Facebook launch matrix in Phase 7 |
| No remote label media | D-13/D-14 | Requires rendered DOM/network inspection | Confirm gifts surfaces contain no `<img>` and make zero requests to palette provenance URLs or `/wines/*` |

---

## Validation Sign-Off

- [x] As 14 tasks dos cinco planos têm `<automated>` verify; revised Plan 05 is autonomous and needs no blocking checkpoint because the user approved the silhouette direction.
- [x] Sampling continuity: não há 3 tasks consecutivas sem comando automatizado.
- [x] IDs/waves correspondem aos planos 04-01…04-05 atuais.
- [x] Nenhum watch-mode flag foi planejado.
- [x] Feedback automatizado focado permanece abaixo de 30s; full suite/live smoke fica no fechamento.
- [x] `nyquist_compliant: true`; `wave_0_complete: true` because Plans 01–04 are executed.

## Validation Audit 2026-07-25

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All GIFT-01–04 requirements have active automated coverage. Final perceptual and mounted-session checks were completed through `04-UAT.md` with 2/2 passes.

**Approval:** validated 2026-07-25
