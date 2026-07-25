---
phase: 08
slug: gest-o-de-gestores-contas-individuais-permiss-es-e-auditoria
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-25
approved: 2026-07-25
---

# Phase 08 — Validation Strategy

> Contrato Nyquist sincronizado com os sete planos executáveis. “Existente”
> significa arquivo/suíte já presente antes da fase; “novo no plano” significa
> evidência criada e executada na mesma task que implementa o comportamento.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + convex-test + Playwright 1.62 + axe-core |
| **Config file** | `vite.config.ts`, `playwright.config.ts` |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test -- --run && npm run build && npm run test:browser` |
| **Estimated runtime** | ~180 seconds |

## Sampling Rate

- Depois de cada task: executar exatamente o `<automated>` da task.
- Depois de cada wave: `npm test -- --run && npm run build`.
- Antes de `/gsd-verify-work`: suíte completa verde e checkpoint Preview do
  plano 08-07 aprovado.
- Latência máxima de feedback: 180 segundos.

## Per-Task Verification Map

| Task | Wave | Decisions / threat | Existing evidence reused | New evidence created in same plan | Automated command |
|------|------|--------------------|--------------------------|-----------------------------------|-------------------|
| 08-01-01 | 1 | D-01, D-07, D-11, D-13, D-29–D-31 / T08-01-S,E,I | `convex/admin.test.ts` | account/principal tracer; audit schema/redaction/helper cases in `convex/admin.test.ts` | `npm test -- --run convex/admin.test.ts` |
| 08-01-02 | 1 | D-01 / T08-01-I,D | `convex/admin.test.ts` | policy/parser and Node-action scrypt vectors | `npm test -- --run convex/admin.test.ts -t "password|scrypt|email"` |
| 08-02-01 | 2 | D-02–D-05, D-29–D-31 / T08-02-S,T,I | `convex/admin.test.ts` | access-link concurrency, expiry, redaction and atomic event cases | `npm test -- --run convex/admin.test.ts -t "access link|activation|reset"` |
| 08-02-02 | 2 | D-06, D-19–D-22, D-29–D-31 / T08-02-E | `convex/admin.test.ts` | bootstrap/cutoff/master-recovery atomic event cases | `npm test -- --run convex/admin.test.ts -t "bootstrap|legacy|master recovery"` |
| 08-02-03 | 2 | D-02–D-04, D-19–D-22 / T08-02-I | `src/lib/adminSession.test.ts` | URL/storage sanitization cases | `npm test -- --run src/lib/adminSession.test.ts && npm run build` |
| 08-03-01 | 3 | D-01, D-13–D-14, D-29–D-31 / T08-03-S,R | `convex/admin.test.ts` | individual login/rate-limit/race/atomic audit cases | `npm test -- --run convex/admin.test.ts -t "individual login|rate limit|seven day"` |
| 08-03-02 | 3 | D-12, D-14–D-18, D-29–D-31 / T08-03-E,R,I | `convex/admin.test.ts` | self/owner session, password/email and atomic event cases | `npm test -- --run convex/admin.test.ts -t "own session|revoke session|change password|owner email"` |
| 08-03-03 | 3 | D-16, D-37–D-38 / T08-03-I | `src/lib/adminSession.test.ts` | principal/revoke/late-result reducer cases | `npm test -- --run src/lib/adminSession.test.ts && npm run build` |
| 08-04-01 | 4 | D-07–D-11 / T08-04-E,I | `convex/admin.test.ts` | table-driven endpoint authorization matrix | `npm test -- --run convex/admin.test.ts -t "authorization matrix"` |
| 08-04-02 | 4 | D-02, D-06–D-08, D-12, D-18, D-29–D-31 / T08-04-T,R | `convex/admin.test.ts` | account lifecycle + atomic/redacted audit cases | `npm test -- --run convex/admin.test.ts -t "account management" && npm run build` |
| 08-04-03 | 4 | D-34–D-38 / T08-04-I | `src/content/admin.test.ts` | role/path navigation and no-forbidden-query cases; no audit route yet | `npm test -- --run src/content/admin.test.ts && npm run build` |
| 08-05-01 | 5 | D-10, D-23–D-25, D-29–D-31 / T08-05-E,T,I,R | `convex/admin.test.ts`, `convex/wines.test.ts` | seller→public tracer and atomic mark audit | `npm test -- --run convex/admin.test.ts convex/wines.test.ts -t "gift|seller|public"` |
| 08-05-02 | 5 | D-26–D-31 / T08-05-T,I,R | `convex/admin.test.ts`, `convex/wines.test.ts` | edit/reopen atomic audit and public negative projection cases | `npm test -- --run convex/admin.test.ts convex/wines.test.ts -t "edit gift|make available|private"` |
| 08-05-03 | 5 | D-24–D-28 | `src/components/admin/adminPendingOperations.test.ts` | confirm/edit/reopen UI state cases | `npm test -- --run src/components/admin/adminPendingOperations.test.ts && npm run build` |
| 08-06-01 | 6 | D-29–D-33 / T08-06-I,E,D | `convex/admin.test.ts` | owner filters/pagination/120-day retention cases | `npm test -- --run convex/admin.test.ts -t "audit model|audit filters|retention|redaction"` |
| 08-06-02 | 6 | D-29–D-31 / T08-06-R,I | audit cases from 08-02–04 | inventory tests for any missing legacy auth/account/session writer | `npm test -- --run convex/admin.test.ts -t "auth audit|account audit|session audit|atomic"` |
| 08-06-03 | 6 | D-29–D-36 / T08-06-R,E | audit cases from 08-05; `src/content/admin.test.ts` | RSVP/moderation inventory, audit page and route/link cases | `npm test -- --run convex/admin.test.ts -t "operational audit" && npm run build` |
| 08-07-01 | 7 | D-01–D-38 / T08-07-I,E | `tests/release.spec.ts` harness | `tests/admin-accounts.spec.ts`, `tests/admin-rbac.spec.ts`, `tests/admin-audit.spec.ts`, role fixtures | `npm run test:browser -- tests/admin-accounts.spec.ts tests/admin-rbac.spec.ts tests/admin-audit.spec.ts` |
| 08-07-02 | 7 | ADMIN-01–06 / T08-07-I,T,D | full Vitest/build/browser suites | Preview smoke guard and release regressions | `npm test -- --run && npm run build && npm run test:browser` |
| 08-07-03 | 7 | D-01–D-38 / T08-07-I,T,D | none; runtime-only boundary | `scripts/phase8-preview-smoke.mjs --check-only` plus sanitized human evidence | `node scripts/phase8-preview-smoke.mjs --check-only` |

## Wave 0 Resolution

- [x] Existing harnesses were identified: `convex/admin.test.ts`,
  `convex/wines.test.ts`, `src/lib/adminSession.test.ts`,
  `src/content/admin.test.ts`,
  `src/components/admin/adminPendingOperations.test.ts` and
  `tests/release.spec.ts`.
- [x] Every missing test/fixture has a producing task and is executed by that
  task’s `<automated>` command; no implementation is allowed to defer its
  first evidence to 08-07.
- [x] The Wave 1 tracer creates the audit model/redaction/helper tests before
  plans 02–05 add writers.
- [x] Node-runtime KDF tests are assigned to the exclusive action modules;
  Web-runtime finalizers are tested through convex-test.
- [x] Scheduler and real scrypt limits remain Preview-only, with automated
  preflight in 08-07-03.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Custo real de scrypt | D-01–D-05 | convex-test não reproduz runtime/memória Node do deployment | Medir p50/p95 de senha correta/incorreta no Preview e confirmar login utilizável |
| Cutoff de sessão legada ao vivo | D-19–D-22 | Exige duas sessões/browser e deployment real | Manter sessão legada e conta nova em browsers distintos; ativar Allan e confirmar queda reativa da legada |
| Scheduler e retenção | D-29–D-33 | convex-test não executa cron/scheduler real | No Preview, criar eventos com datas controladas, executar cleanup e verificar limite de 120 dias |
| Link compartilhado | D-02–D-04 | Copy/paste, histórico e janela privada são integrações do navegador | Abrir link em janela privada, definir senha e confirmar que replay e URL antigo falham sem expor token |

## Validation Sign-Off

- [x] Todas as tasks têm `<automated>` e a tabela usa os comandos exatos.
- [x] Testes existentes e novos estão distinguidos.
- [x] Não há três tasks consecutivas sem evidência automatizada.
- [x] Não há flags de watch.
- [x] Feedback máximo estimado abaixo de 180s.
- [x] `wave_0_complete: true` e `nyquist_compliant: true`.

**Approval:** approved — 2026-07-25

## Validation Audit 2026-07-25

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

Todos os requisitos e decisões permanecem cobertos por 581 testes Vitest,
80 jornadas Playwright, build de produção, smoke protegido e UAT 7/7.

## Orchestrator Handoff

Após aprovação dos planos, o orchestrator deve executar o handler seguro
`roadmap.annotate-dependencies` usando `phase`, `plan`, `wave` e `depends_on`
dos frontmatters. Nenhum plano autoriza edição textual direta de
`.planning/ROADMAP.md`.
