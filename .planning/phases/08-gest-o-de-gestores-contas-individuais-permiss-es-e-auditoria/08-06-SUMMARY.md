---
phase: 08-gest-o-de-gestores-contas-individuais-permiss-es-e-auditoria
plan: "06"
subsystem: audit
tags: [convex, audit, retention, rbac, react, pagination]
requires:
  - phase: 08-05
    provides: seller gift mutations with server-derived actor and atomic audit
provides:
  - owner-only filtered and paginated audit history
  - logical and physical 120-day audit retention
  - atomic audit coverage for identity and operational writers
  - accessible audit route and expandable before/after details
affects: [08-07, admin, security, operations]
tech-stack:
  added: []
  patterns:
    - audit events schedule bounded-hop expiry and remain logically hidden at the exact TTL boundary
    - every domain writer appends its redacted event inside the same Convex mutation
key-files:
  created:
    - convex/adminAudit.ts
    - src/components/admin/AdminAudit.tsx
  modified:
    - convex/adminAuditModel.ts
    - convex/adminInternal.ts
    - convex/crons.ts
    - convex/adminAuth.ts
    - convex/adminAccounts.ts
    - convex/adminAccessLinks.ts
    - convex/adminBootstrap.ts
    - convex/adminRsvps.ts
    - convex/adminPosts.ts
    - src/components/admin/AdminShell.tsx
    - src/content/admin.ts
key-decisions:
  - "Scheduled audit expiry advances in bounded 20-day hops until the exact 120-day deadline, avoiding timer overflow while preserving idempotent expectedExpiresAt deletion."
  - "Account-wide revocations emit one bounded sessions_revoked summary with a count, never one event per session."
patterns-established:
  - "Audit read path: owner guard, indexed newest-first page, logical TTL filter, then allowlisted DTO."
  - "Operational audit: validate/CAS, domain write, appendAuditEvent, return — all in one transaction."
requirements-completed:
  - ADMIN-01
  - ADMIN-03
  - ADMIN-04
  - ADMIN-05
  - ADMIN-06
coverage:
  - id: D1
    description: "Owner-only audit query combines person, area, action and period filters, orders newest-first and hides events exactly at 120 days."
    requirement: ADMIN-06
    verification:
      - kind: integration
        ref: "convex/admin.test.ts#admin audit filters, retention and redaction"
        status: pass
      - kind: other
        ref: "npm test -- --run convex/admin.test.ts -t \"audit model|audit filters|retention|redaction\""
        status: pass
    human_judgment: false
  - id: D2
    description: "Auth, account, session, RSVP, moderation and gift writers append redacted events atomically while reads and failed conflicts create no success event."
    requirement: ADMIN-06
    verification:
      - kind: integration
        ref: "convex/admin.test.ts#admin auth audit, account audit, session audit and atomic writes"
        status: pass
      - kind: integration
        ref: "convex/admin.test.ts#operational audit"
        status: pass
      - kind: other
        ref: "npm test -- --run"
        status: pass
    human_judgment: false
  - id: D3
    description: "The owner has an Audit route with filters, page navigation and expandable redacted before/after details; manager and seller routing excludes it."
    requirement: ADMIN-03
    verification:
      - kind: unit
        ref: "src/content/admin.test.ts#admin canonical route contract"
        status: pass
      - kind: other
        ref: "npm run build"
        status: pass
    human_judgment: true
    rationale: "Visual hierarchy, focus behavior and filter usability are included in the Phase 08 Preview checkpoint."
duration: 8 min
completed: 2026-07-25
status: complete
---

# Phase 08 Plan 06: Auditoria administrativa e retenção Summary

**Histórico owner-only com filtros e detalhes, cobertura atômica de todos os writers administrativos e retenção segura de 120 dias**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-25T16:58:00Z
- **Completed:** 2026-07-25T17:06:00Z
- **Tasks:** 3
- **Files modified:** 16

## Accomplishments

- Entregou consulta owner-only newest-first, paginada e combinável por pessoa, área, ação e período, sempre omitindo eventos no boundary de 120 dias.
- Completou auditoria atômica e redigida de login legado/individual, contas, sessões, recuperação, RSVP, moderação e presentes, sem auditar consultas ou conflitos.
- Adicionou expiração física idempotente por evento e sweep diário paginado, sem depender da limpeza para preservar o TTL lógico.
- Conectou Auditoria ao shell somente para Proprietário, com filtros acessíveis e detalhes expansíveis de antes/depois.

## Task Commits

1. **Task 1: Consulta owner-only, filtros e retenção** — `2da654b` (RED), `0282ef9` (GREEN)
2. **Task 2: Writers de auth, contas e sessões** — `4473eb5` (RED), `4474197` (GREEN)
3. **Task 3: Writers operacionais e página Auditoria** — `1715bac` (RED), `21af465` (GREEN)

## Files Created/Modified

- `convex/adminAudit.ts` — consulta owner-only paginada, filtrada e com TTL lógico.
- `convex/adminAuditModel.ts` — append redigido com agendamento físico bounded.
- `convex/adminInternal.ts`, `convex/crons.ts` — delete idempotente e sweep diário paginado.
- `convex/adminAuth.ts`, `convex/adminAccounts.ts`, `convex/adminAccessLinks.ts`, `convex/adminBootstrap.ts` — eventos de identidade, segurança e revogação.
- `convex/adminRsvps.ts`, `convex/adminPosts.ts`, `convex/adminWines.ts` — inventário operacional integralmente auditável.
- `src/components/admin/AdminAudit.tsx` — filtros, paginação e detalhes before/after.
- `src/components/admin/AdminShell.tsx`, `src/content/admin.ts` — rota e navegação exclusivas do owner.
- `convex/admin.test.ts`, `src/content/admin.test.ts` — boundaries, atomicidade, ausência de segredos e contrato de rotas.

## Decisions Made

- A deleção agendada usa saltos máximos de 20 dias e conserva o `expectedExpiresAt` final; isso mantém o deadline exato e evita overflow de timers longos em ambientes de teste.
- Revogações account-wide são resumidas por contagem, preservando bounded writes e evitando enumerar aparelhos no histórico.
- Telefone e contato de RSVP não entram nos diffs; nomes e estados estritamente necessários permanecem allowlisted.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Expiração física em saltos bounded**
- **Found during:** Task 2
- **Issue:** timers JavaScript acima de 2³¹-1 ms transbordavam no harness, podendo executar um agendamento de 120 dias imediatamente durante testes.
- **Fix:** o primeiro agendamento e as continuações usam saltos de 20 dias; cada handler relê o evento e só apaga quando `now >= expectedExpiresAt`.
- **Files modified:** `convex/adminAuditModel.ts`, `convex/adminInternal.ts`
- **Verification:** suíte completa 577/577 e boundaries 120d-1ms/120d.
- **Committed in:** `4474197`

---

**Total deviations:** 1 auto-fixed (1 blocking).
**Impact on plan:** reforça portabilidade e idempotência sem alterar o TTL de 120 dias ou ampliar escopo.

## Issues Encountered

O codegen Convex foi executado para registrar o novo módulo público `adminAudit`; o artefato gerado foi atualizado pela ferramenta, nunca manualmente.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- O plano 08-07 pode validar a jornada completa, acessibilidade, papéis e comportamento real em Preview.
- As mudanças paralelas de redesign em `.impeccable/design.json`, `DESIGN.md`, `README.md`, `AdminOverview`, seu teste e `event.ts` permanecem intactas e fora dos commits.

## Self-Check: PASSED

- `npm test -- --run`: 30 arquivos e 577 testes passaram.
- `npm run build`: passou.
- Testes focados de filtros/retenção, identidade/atomicidade e auditoria operacional passaram.
- Busca estrutural confirmou audit append dentro dos writers inventariados.
- Nenhum segredo, token, hash, link, telefone ou dado de cobrança é persistido nos eventos cobertos.

---
*Phase: 08-gest-o-de-gestores-contas-individuais-permiss-es-e-auditoria*
*Completed: 2026-07-25*
