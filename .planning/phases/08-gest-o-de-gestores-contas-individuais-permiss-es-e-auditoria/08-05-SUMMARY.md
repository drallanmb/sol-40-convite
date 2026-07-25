---
phase: 08-gest-o-de-gestores-contas-individuais-permiss-es-e-auditoria
plan: "05"
subsystem: gifts
tags: [convex, rbac, audit, react, privacy, optimistic-concurrency]
requires:
  - phase: 08-04
    provides: role-aware shell and seller-only gifts authorization
provides:
  - Seller purchase confirmation with presenter, optional private note and server-derived authorship
  - Separate CAS correction and reopen transitions with atomic redacted audit
  - Confirmed-purchase UI preserving public catalog copy and private data boundaries
affects: [08-06, 08-07, gifts, audit, public-catalog]
tech-stack:
  added: []
  patterns:
    - gift confirmation, correction and reopen are separate transactional commands
    - public wine DTO remains an explicit status-only projection
key-files:
  created: []
  modified:
    - convex/schema.ts
    - convex/wineModel.ts
    - convex/wineOperations.ts
    - convex/adminWines.ts
    - convex/admin.test.ts
    - convex/wines.test.ts
    - src/components/admin/AdminGifts.tsx
    - src/components/admin/adminPendingOperations.test.ts
key-decisions:
  - "Gift correction is a gifted-to-gifted CAS operation that preserves giftedAt; only explicit reopen returns a bottle to the catalog."
  - "Gift notes are optional private text capped at 500 characters and never enter public validators or projections."
patterns-established:
  - "Gift audit actor is always derived from the authenticated principal inside the domain mutation."
  - "Conflict responses preserve the seller draft and create neither domain writes nor success audit events."
requirements-completed:
  - ADMIN-06
coverage:
  - id: D1
    description: "Seller confirms a paid bottle with presenter, optional private note, automatic time and server-derived authorship."
    requirement: ADMIN-06
    verification:
      - kind: integration
        ref: "convex/admin.test.ts#lets a seller confirm a gift with private note, derived actor and public status only"
        status: pass
      - kind: other
        ref: "npm test -- --run convex/admin.test.ts convex/wines.test.ts -t \"gift|seller|public\""
        status: pass
    human_judgment: false
  - id: D2
    description: "Correction preserves confirmed status/time, while explicit reopen clears all private gift fields; both audit atomically under CAS."
    requirement: ADMIN-06
    verification:
      - kind: integration
        ref: "convex/admin.test.ts#edits a confirmed gift without reopening and reopens by clearing all private fields"
        status: pass
      - kind: other
        ref: "npm test -- --run convex/admin.test.ts convex/wines.test.ts -t \"edit gift|make available|private\""
        status: pass
    human_judgment: false
  - id: D3
    description: "Seller UI uses confirmed-purchase language and distinct confirm, edit and undo flows with recoverable conflicts."
    requirement: ADMIN-06
    verification:
      - kind: automated_ui
        ref: "src/components/admin/adminPendingOperations.test.ts#gift confirmation and correction flows"
        status: pass
      - kind: other
        ref: "npm test -- --run src/components/admin/adminPendingOperations.test.ts && npm run build"
        status: pass
    human_judgment: false
  - id: D4
    description: "Public catalog preserves “Já escolhido com carinho” and exposes no presenter, note, actor or private timestamp."
    requirement: ADMIN-06
    verification:
      - kind: integration
        ref: "convex/wines.test.ts#wine public queries"
        status: pass
      - kind: other
        ref: "npm test -- --run convex/admin.test.ts convex/wines.test.ts src/components/admin/adminPendingOperations.test.ts && npm run build"
        status: pass
    human_judgment: false
duration: 5 min
completed: 2026-07-25
status: complete
---

# Phase 08 Plan 05: Operação de Presentes pela Vendedora Summary

**Compras de vinho confirmadas pela Vanessa com observação privada, correção sem reabrir, autoria auditável e catálogo público sem vazamentos**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-25T16:51:55Z
- **Completed:** 2026-07-25T16:56:55Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Vanessa e os demais papéis autorizados podem confirmar uma compra somente após pagamento, informando presenteador e observação opcional; horário e autoria vêm do servidor.
- Correção mantém a garrafa confirmada e preserva `giftedAt`; desfazer é a única operação que limpa presenteador, nota e data e devolve a garrafa ao catálogo.
- O painel usa “Compra confirmada”, oferece Confirmar/Editar/Desfazer com conflito recuperável e mantém a copy pública “Já escolhido com carinho”.
- Catálogo e destaques públicos continuam DTOs explícitos sem nome, nota, ator, data privada ou revisão.

## Task Commits

1. **Task 1: Confirmar uma compra como seller até o catálogo público** — `6df9b95` (RED), `d13fa6e` (GREEN)
2. **Task 2: Corrigir compra sem reabrir e preservar projeção pública** — `33d559a` (RED), `48d82ab` (GREEN)
3. **Task 3: Refinar painel de Presentes para Compra confirmada** — `c9a2cf8` (RED), `ecbac56` (GREEN)

## Files Created/Modified

- `convex/schema.ts` — acrescenta `giftNote` opcional e privado ao vinho.
- `convex/wineModel.ts` — valida nota de até 500 caracteres sem ampliar o DTO público.
- `convex/wineOperations.ts` — normaliza nota, corrige sem reabrir e limpa o trio privado no reopen.
- `convex/adminWines.ts` — confirma, corrige e reabre com principal derivado, CAS e auditoria atômica.
- `convex/admin.test.ts` — tracer seller→documento→auditoria→catálogo e regressões de conflito.
- `convex/wines.test.ts` — JSON negativo para nota, presenteador, ator e timestamps privados.
- `src/components/admin/AdminGifts.tsx` — fluxo operacional “Compra confirmada” com nota, edição e desfazer.
- `src/components/admin/adminPendingOperations.test.ts` — estados pendentes, rascunho em conflito e separação edit/reopen.

## Decisions Made

- Observação vazia é normalizada para ausência; não existe estado intermediário, reserva ou dado de cobrança.
- A edição usa endpoint próprio e preserva `status: gifted` e `giftedAt`; reabertura continua uma transição explícita e destrutiva.
- O audit diff inclui somente `status`, `giftedBy` e `giftNote`; identidade do ator nunca vem do cliente.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

O rótulo “Confirmar compra” aparece na ação da lista e no submit do diálogo; o teste foi escopado ao diálogo aberto para reproduzir a interação real sem selecionar o botão externo homônimo.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Eventos `gift_confirmed`, `gift_updated` e `gift_reopened` estão prontos para filtros, retenção e tela de Auditoria no 08-06.
- O fluxo seller está pronto para o endurecimento E2E e Preview do 08-07.
- As mudanças locais alheias em design, README, overview e conteúdo do evento permaneceram intactas e fora dos commits.

## Self-Check: PASSED

- Oito arquivos de implementação/teste existem e seis commits RED/GREEN do plano estão presentes.
- `npm test -- --run` passou com 571 testes.
- Verificação do plano passou com 102 testes direcionados e `npm run build` verde.
- `src/content/gifts.ts` conserva literalmente “Já escolhido com carinho”.
- JSON público não contém `giftedBy`, `giftNote`, ator, timestamps privados ou revisão.

---
*Phase: 08-gest-o-de-gestores-contas-individuais-permiss-es-e-auditoria*
*Completed: 2026-07-25*
