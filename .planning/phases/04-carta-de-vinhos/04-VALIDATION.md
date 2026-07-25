---
phase: 04
slug: carta-de-vinhos
status: draft
nyquist_compliant: true
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
| 04-01-01 | 01 | 0 | GIFT-01/02 | T-04-01/03 | Schema/catalog têm 37 códigos únicos, 13/10/14 e tipos fechados | schema/unit | `npx vitest run convex/wines.test.ts -t "schema\|catalog"` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 0 | GIFT-01/02/04 | T-04-02/04/05 | Ensure é idempotente; seam internal retorna snapshot e restaura available/gifted sem API pública | integration/security | `npx vitest run convex/wines.test.ts -t "reconciliation\|smoke seam\|internal only"` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 0 | GIFT-03/04 | T-04-01/04 | Queries são ordenadas/reativas, DTO omite privados e writers ficam em internal | integration/privacy | `npx vitest run convex/wines.test.ts -t "public queries\|featured"` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | GIFT-03 | T-04-06/07 | Número/copy/encoding e fragmentos hostis seguem contratos exatos | unit/security | `npx vitest run src/lib/wineWhatsApp.test.ts src/lib/wineDeepLink.test.ts` | ❌ W1 | ⬜ pending |
| 04-02-02 | 02 | 1 | GIFT-02 | T-04-08/09 | Preflight prova bijeção 37/37 e strict rejeita pending/asset inválido | asset/unit | `npm run audit:wine-assets -- --preflight` | ❌ W1 | ⬜ pending |
| 04-03-01 | 03 | 2 | GIFT-03 | T-04-10/12 | `/presentes`, tokens, copy e atalhos compilam sem perder rotas/CSS live | build/content | `npm run build && npx vitest run src/content/event.test.ts` | ✅ base | ⬜ pending |
| 04-03-02 | 03 | 2 | GIFT-03/04 | T-04-10/11/13/14 | Available tem anchor seguro; gifted não tem anchor; mídia falha sem esconder conteúdo | browser + pure tests | `npx vitest run src/lib/wineWhatsApp.test.ts src/lib/wineDeepLink.test.ts && npm run build` | ❌ W1 | ⬜ pending |
| 04-03-03 | 03 | 2 | GIFT-03/04 | T-04-12/14 | Catálogo/estados/deep-link compilam; matriz manual cobre DOM responsivo | system/browser | `npm test && npm run build && git diff --check` | ✅ base | ⬜ pending |
| 04-04-01 | 04 | 3 | GIFT-03 | T-04-18 | Nav/copy combinadas preservam Fase 5 | content/regression | `npx vitest run src/content/event.test.ts && npm run build` | ✅ base | ⬜ pending |
| 04-04-02 | 04 | 3 | GIFT-03/04 | T-04-16/17/18 | Preview fixa trio/order e usa um Link sem nested action | system/browser | `npm test && npm run build && git diff --check` | ✅ base | ⬜ pending |
| 04-04-03 | 04 | 3 | GIFT-03 | T-04-15 | CTA depende exclusivamente de `result.kind === "saved"` | system/browser | `npm test && npm run build && git diff --check` | ✅ base | ⬜ pending |
| 04-05-01 | 05 | 4 | GIFT-02 | T-04-19/20 | Fonte/permissão dos 37 itens é confirmada antes da normalização | blocking human-action | `npm run audit:wine-assets -- --preflight` | ❌ W1 | ⬜ pending |
| 04-05-02 | 05 | 4 | All | T-04-21/22/23 | Audit estrito, seed duplo, snapshot→gifted→restore e full regression passam | asset/system/live | `npm run audit:wine-assets && npm test && npm run build && npx convex dev --once && git diff --check` | ❌ W1 | ⬜ pending |
| 04-05-03 | 05 | 4 | GIFT-02/03/04 | T-04-19/20/23 | Dono aprova direitos/identidade/crop dos arquivos finais 37/37 | `gate="blocking-human"` | `npm run audit:wine-assets && npm test && npm run build && git diff --check` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Planned Contract Files by Wave

- [ ] **Wave 0 / Plan 01:** `convex/wines.test.ts` — schema, catálogo, reconciliação, seam internal snapshot/restore, ausência em API pública e queries.
- [ ] **Wave 1 / Plan 02:** `src/lib/wineWhatsApp.test.ts` — copy Unicode, número, preço e encoding único.
- [ ] **Wave 1 / Plan 02:** `src/lib/wineDeepLink.test.ts` — DOM ID/hash seguro.
- [ ] **Wave 1 / Plan 02:** `scripts/audit-wine-assets.mjs` + `public/wines/manifest.json` + `audit:wine-assets` — preflight e strict.
- [ ] **Wave 4 / Plan 05:** 37 assets finais e manifest approved; checkpoint final `gate="blocking-human"`.

`wave_0_complete` permanece `false` até `convex/wines.test.ts` existir e passar. `nyquist_compliant` está `true` porque cada uma das 14 tasks atuais possui comando automatizado ou checkpoint explícito, sem três tasks consecutivas sem amostra.

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

- [x] As 14 tasks dos cinco planos têm `<automated>` verify; checkpoints também têm gate/evidência humana explícitos.
- [x] Sampling continuity: não há 3 tasks consecutivas sem comando automatizado.
- [x] IDs/waves correspondem aos planos 04-01…04-05 atuais.
- [x] Nenhum watch-mode flag foi planejado.
- [x] Feedback automatizado focado permanece abaixo de 30s; full suite/live smoke fica no fechamento.
- [x] `nyquist_compliant: true` após auditoria de correspondência; `wave_0_complete: false` até execução.

**Approval:** validation map aligned; execution pending
