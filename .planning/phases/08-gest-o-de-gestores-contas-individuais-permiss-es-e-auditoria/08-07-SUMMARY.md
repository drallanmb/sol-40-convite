---
phase: 08-gest-o-de-gestores-contas-individuais-permiss-es-e-auditoria
plan: "07"
subsystem: testing
tags: [playwright, axe, convex, preview, security, rbac, rollout]
requires:
  - phase: 08-06
    provides: owner-only audit, atomic administrative events and 120-day retention
provides:
  - decision-traced browser contracts for accounts, RBAC, gifts and audit
  - production-refusing Preview smoke with sanitized aggregate output
  - additive rollout and manual Preview verification runbook
  - fail-closed admin route for frontend/backend Convex version mismatch
affects: [admin, release, preview, operations, security]
tech-stack:
  added: []
  patterns:
    - Preview probes classify and reject Production before spawning any subprocess
    - admin route errors render a generic fail-closed boundary without protected UI or technical details
key-files:
  created:
    - src/test/adminRoleFixtures.ts
    - tests/admin-accounts.spec.ts
    - tests/admin-rbac.spec.ts
    - tests/admin-audit.spec.ts
    - scripts/phase8-preview-smoke.mjs
    - docs/phase-08-preview-runbook.md
    - src/components/admin/AdminRouteBoundary.tsx
    - src/components/admin/AdminRouteBoundary.test.tsx
  modified:
    - convex/adminTest.ts
    - convex/admin.test.ts
    - tests/release.spec.ts
    - src/App.tsx
key-decisions:
  - "Check-only is entirely local and reports writesAttempted: 0; runtime probes require an explicit --run --confirm-preview opt-in after deployment classification."
  - "A Convex function mismatch never leaves /admin blank: the route fails closed with generic recovery guidance and no protected UI."
patterns-established:
  - "Preview evidence returns only status, bounded counts and latency summaries; credentials, capabilities, links, hashes and raw Convex errors are excluded."
  - "Frontend deployment must follow Convex function synchronization; the runbook requires codegen/deploy before opening /admin."
requirements-completed:
  - ADMIN-01
  - ADMIN-02
  - ADMIN-03
  - ADMIN-04
  - ADMIN-05
  - ADMIN-06
coverage:
  - id: D1
    description: "Browser suites trace D-01–D-38 across individual accounts, fixed roles, session/migration boundaries, seller gifts, audit privacy and role-aware UX."
    requirement: ADMIN-03
    verification:
      - kind: e2e
        ref: "tests/admin-accounts.spec.ts, tests/admin-rbac.spec.ts, tests/admin-audit.spec.ts"
        status: pass
      - kind: other
        ref: "npm run test:browser — 80 passed"
        status: pass
    human_judgment: false
  - id: D2
    description: "Preview smoke rejects Production before probes and exposes only sanitized readiness, scrypt latency and retention aggregates."
    requirement: ADMIN-01
    verification:
      - kind: integration
        ref: "convex/admin.test.ts#phase 8 Preview smoke contracts"
        status: pass
      - kind: e2e
        ref: "tests/release.spec.ts#phase 8 smoke"
        status: pass
      - kind: other
        ref: "node scripts/phase8-preview-smoke.mjs --check-only"
        status: pass
    human_judgment: true
    rationale: "Real Node runtime latency, scheduler execution and live cutoff still require the documented isolated Preview procedure."
  - id: D3
    description: "The admin route remains nonblank and fail-closed when frontend and Convex functions are out of sync, while the synchronized Preview shows login normally."
    requirement: ADMIN-01
    verification:
      - kind: unit
        ref: "src/components/admin/AdminRouteBoundary.test.tsx#bootstrap query throws"
        status: pass
      - kind: automated_ui
        ref: "tests/admin-accounts.spec.ts#D-37–D-38"
        status: pass
      - kind: manual_procedural
        ref: "User confirmation 2026-07-25: login appears in Preview after synchronization"
        status: pass
    human_judgment: true
    rationale: "Human confirmation covers the reported blank-screen blocker and login visibility only, not every manual Preview scenario."
  - id: D4
    description: "The runbook defines additive bootstrap, initial accounts, one-time links, cutoff, seller gift flow, retention, accessibility, cleanup and rollback."
    requirement: ADMIN-06
    verification:
      - kind: other
        ref: "docs/phase-08-preview-runbook.md"
        status: pass
    human_judgment: true
    rationale: "The user did not explicitly report scrypt p50/p95, live legacy cutoff, one-time link replay, scheduler retention, seller gift editing or the complete accessibility walkthrough."
duration: 56 min
completed: 2026-07-25
status: complete
---

# Phase 08 Plan 07: End-to-end, smoke Preview e rollout seguro Summary

**Contratos browser por papel, probes Preview sanitizados com trava de Production e uma rota administrativa fail-closed diante de mismatch Convex**

## Performance

- **Duration:** 56 min
- **Started:** 2026-07-25T17:09:46Z
- **Completed:** 2026-07-25T18:06:00Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments

- Criou evidência browser rastreável para D-01–D-38, cobrindo contas iniciais, destinos por papel, ausência de queries pré-auth/proibidas, privacidade de auditoria, copy pública de Presentes, axe, foco e reflow em 320 px.
- Entregou smoke `--check-only` sem rede/writes e runtime opt-in com scrypt e retenção bounded, sempre recusando Production antes de subprocessos e retornando apenas resultados sanitizados.
- Documentou rollout aditivo, sincronização obrigatória das functions, bootstrap, contas iniciais, cutoff, operação da Vanessa, cleanup e rollback sem segredos.
- Corrigiu o gap observado no checkpoint: erro de function Convex ausente agora mostra fallback administrativo genérico e fail-closed em vez de desmontar a rota para branco.

## Task Commits

1. **Task 1: Fixtures seguras e jornadas E2E por papel** — `8976231` (RED), `48dc831` (GREEN)
2. **Task 2: Regressões ADMIN-01–06 e smoke Preview** — `7ecc6f7` (RED), `c5da2bc` (GREEN)
3. **Task 3: Checkpoint Preview e correção do bloqueio encontrado** — `cf3eeb2` (RED), `0684483` (GREEN)

## Files Created/Modified

- `src/test/adminRoleFixtures.ts` — contas iniciais, matriz por papel, rastreabilidade e sanitização de evidência.
- `tests/admin-accounts.spec.ts` — login/ativação, lifecycle, foco, axe, 320 px e fallback não branco.
- `tests/admin-rbac.spec.ts` — destinos por papel, ausência de queries proibidas e contrato seller/Presentes.
- `tests/admin-audit.spec.ts` — privacidade pré-auth, redaction estrutural e acessibilidade.
- `convex/adminTest.ts` — preflight agregado, benchmark scrypt interno e retention probe bounded.
- `convex/admin.test.ts`, `tests/release.spec.ts` — contratos do smoke, recusa de Production e regressões de release.
- `scripts/phase8-preview-smoke.mjs` — classificação fail-closed e probes sanitizados.
- `docs/phase-08-preview-runbook.md` — rollout, verificação manual, diagnóstico de mismatch, cleanup e rollback.
- `src/components/admin/AdminRouteBoundary.tsx`, `src/App.tsx` — fallback fail-closed restrito à rota administrativa.
- `src/components/admin/AdminRouteBoundary.test.tsx` — reprodução do crash de bootstrap sem revelar detalhes.

## Decisions Made

- O modo padrão verificável é `--check-only`; qualquer probe real exige confirmação explícita de Preview e nunca imprime stderr bruto do Convex.
- O fallback de `/admin` captura qualquer falha de render da superfície administrativa, não tenta inferir autorização e não oferece login enquanto o backend está indisponível.
- A confirmação humana recebida é registrada estritamente como “login aparece no Preview após sincronização”; nenhum outro subcheck manual é inferido.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Mismatch Convex deixava `/admin` em branco**
- **Found during:** Task 3, checkpoint humano.
- **Issue:** `adminBootstrap:getBootstrapStatus` ainda não existia no deployment apontado; o hook lançou durante render e não havia error boundary.
- **Fix:** adicionada fronteira fail-closed exclusiva da rota, regressão com a mensagem real sanitizada e diagnóstico de sincronização no runbook.
- **Files modified:** `src/App.tsx`, `src/components/admin/AdminRouteBoundary.tsx`, `src/components/admin/AdminRouteBoundary.test.tsx`, `tests/admin-accounts.spec.ts`, `docs/phase-08-preview-runbook.md`.
- **Verification:** 581 testes Vitest, build e 80 testes Playwright passaram; usuário confirmou login visível no Preview sincronizado.
- **Committed in:** `0684483`.

---

**Total deviations:** 1 auto-fixed (1 bug).
**Impact on plan:** reforça disponibilidade segura e diagnóstico operacional sem ampliar permissões, expor detalhes ou alterar fluxos normais.

## Issues Encountered

- O primeiro checkpoint encontrou frontend/backend Convex fora de sincronia. O código agora falha fechado; o runbook exige publicar as functions antes de abrir `/admin`.
- A aprovação humana recebida cobre somente a correção do branco e a aparição do login após sincronização.

## User Setup Required

O rollout real continua seguindo `docs/phase-08-preview-runbook.md`; nenhum segredo deve ser gravado no repositório ou em evidências.

## Manual Follow-ups Not Explicitly Confirmed

- Medição real p50/p95 do scrypt correto e incorreto.
- Cutoff reativo de uma sessão legada em dois navegadores.
- Copy/paste privado e replay inválido do link one-time.
- Execução real do scheduler/retention de 120 dias.
- Criação das três contas iniciais de Soraya, Guga e Vanessa.
- Jornada Vanessa de confirmar, editar e reabrir vinho com reflexo público.
- Walkthrough completo de axe, foco, mobile e alvos em todas as seis telas.

## Next Phase Readiness

- O código e a automação da Phase 8 estão integrados e verdes.
- Os follow-ups manuais acima permanecem operacionais e não devem ser tratados como evidência já coletada.
- As mudanças paralelas de redesign em `.impeccable/design.json`, `DESIGN.md`, `README.md`, `AdminOverview`, seu teste e `event.ts` permanecem intactas e fora dos commits.

## Self-Check: PASSED

- `npm test -- --run`: 31 arquivos e 581 testes passaram.
- `npm run build`: passou.
- `npm run test:browser`: 80 testes passaram em Chromium/WebKit desktop/mobile.
- `node scripts/phase8-preview-smoke.mjs --check-only`: `ready`, não Production e zero writes.
- Commits TDD RED/GREEN das Tasks 1–3 estão presentes.
- O usuário confirmou apenas o login visível após sincronização; os demais subchecks estão explicitamente pendentes.

---
*Phase: 08-gest-o-de-gestores-contas-individuais-permiss-es-e-auditoria*
*Completed: 2026-07-25*
