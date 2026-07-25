---
phase: 08-gest-o-de-gestores-contas-individuais-permiss-es-e-auditoria
plan: "04"
subsystem: auth
tags: [convex, rbac, react, account-management, audit]
requires:
  - phase: 08-03
    provides: individual accounts, authoritative principals, sessions and My Account
provides:
  - Endpoint-level RBAC for every existing administrative operational API
  - Owner-only account lifecycle with one-time links and preserved history
  - Role-aware admin navigation, routing, queries and manager interface
affects: [08-05, 08-06, 08-07, admin, gifts, audit]
tech-stack:
  added: []
  patterns:
    - capability checks occur before every protected read or write
    - role-specific routes are canonicalized before protected components mount
key-files:
  created:
    - src/components/admin/AdminManagers.tsx
    - src/components/admin/AdminShell.test.tsx
  modified:
    - convex/adminAccounts.ts
    - convex/adminOverview.ts
    - convex/adminRsvps.ts
    - convex/adminPosts.ts
    - convex/adminWines.ts
    - convex/admin.test.ts
    - src/components/admin/AdminShell.tsx
    - src/content/admin.ts
    - src/content/admin.test.ts
key-decisions:
  - "One-time account links are generated as browser capabilities and returned only by the successful lifecycle mutation; Convex persists only their SHA-256 hashes."
  - "Gestores remains in the owner desktop navigation and mobile utility menu, while the manager four-item mobile navigation stays unchanged."
patterns-established:
  - "Operational authorization: owner/manager for overview, RSVP and moderation; every active role for gifts."
  - "Forbidden deep links redirect before mounting their protected area; seller overview query receives skip."
requirements-completed:
  - ADMIN-02
  - ADMIN-03
  - ADMIN-04
  - ADMIN-05
  - ADMIN-06
coverage:
  - id: D1
    description: "Every existing operational endpoint enforces the owner/manager/seller matrix before reads and writes."
    requirement: ADMIN-02
    verification:
      - kind: integration
        ref: "convex/admin.test.ts#authorization matrix by public endpoint"
        status: pass
      - kind: other
        ref: "npm test -- --run convex/admin.test.ts -t \"authorization matrix\""
        status: pass
    human_judgment: false
  - id: D2
    description: "The owner creates, disables and reactivates manager/seller accounts with one-time links, atomic redacted audit and preserved records."
    requirement: ADMIN-02
    verification:
      - kind: integration
        ref: "convex/admin.test.ts#account management"
        status: pass
      - kind: other
        ref: "npm test -- --run convex/admin.test.ts -t \"account management\" && npm run build"
        status: pass
    human_judgment: false
  - id: D3
    description: "Navigation, defaults and protected component mounting follow the authenticated role, with seller limited to Gifts."
    requirement: ADMIN-02
    verification:
      - kind: unit
        ref: "src/content/admin.test.ts#admin canonical route contract"
        status: pass
      - kind: automated_ui
        ref: "src/components/admin/AdminShell.test.tsx#AdminShell role-aware queries"
        status: pass
    human_judgment: false
duration: 12 min
completed: 2026-07-25
status: complete
---

# Phase 08 Plan 04: RBAC, Gestores e shell por papel Summary

**RBAC fail-closed em todas as APIs operacionais, lifecycle owner-only de contas e painel que monta somente as áreas permitidas para cada papel**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-25T16:37:00Z
- **Completed:** 2026-07-25T16:49:17Z
- **Tasks:** 3
- **Files modified:** 13

## Accomplishments

- Fechou a matriz backend: Proprietário/Gestor operam Visão geral, Convidados e Moderação; os três papéis operam Presentes; sessão inválida continua `unauthorized` e papel insuficiente retorna `forbidden`.
- Entregou Gestores no `/admin`, incluindo criação de Gestora/Vendedora, link efêmero de 72 horas, invalidação/regeneração, redefinição, desativação, reativação e consulta de aparelhos.
- Tornou navegação, fallback e queries conscientes do papel; Vanessa entra em Presentes sem disparar overview, RSVP ou moderação.

## Task Commits

1. **Task 1: Fechar a matriz RBAC em cada API existente** — `58e389a` (RED), `e1ef2f9` (GREEN)
2. **Task 2: Entregar gestão owner-only de contas e links** — `7d05b33` (RED), `283d7ad` (GREEN)
3. **Task 3: Tornar shell, rotas e fallback conscientes do papel** — `e3457a0` (RED), `c1d2422` (GREEN)

## Files Created/Modified

- `convex/adminAccounts.ts` — APIs owner-only, lifecycle atômico, links e auditoria.
- `convex/adminOverview.ts`, `convex/adminRsvps.ts`, `convex/adminPosts.ts`, `convex/adminWines.ts` — capacidades explícitas por domínio.
- `convex/admin.test.ts` — matriz pública por endpoint e lifecycle de contas.
- `src/components/admin/AdminManagers.tsx` — cadastro, estados, links, sessões e confirmações.
- `src/components/admin/AdminShell.tsx` — queries, rotas, identidade e menus por papel.
- `src/components/admin/AdminShell.test.tsx` — prova que seller não monta áreas nem query proibidas.
- `src/content/admin.ts`, `src/content/admin.test.ts` — política canônica pura de navegação e fallback.

## Decisions Made

- O cliente gera a capability one-time, a mutation valida e devolve o segredo somente naquela resposta, e o banco guarda exclusivamente o hash.
- Gestores não ocupa a barra móvel operacional; fica na navegação desktop e no menu utilitário móvel do Proprietário.
- Auditoria não foi adicionada à navegação nesta wave, conforme o plano; a rota nasce junto da página no 08-06.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Tratamento frontend do novo resultado `forbidden`**
- **Found during:** Task 1
- **Issue:** Ao ampliar os validators RSVP, dois consumidores existentes deixaram de estreitar corretamente o union gerado e bloquearam o build.
- **Fix:** Os consumidores agora tratam todo resultado não pronto/salvo como perda de acesso sem tentar ler campos operacionais.
- **Files modified:** `src/components/admin/AdminGuestImport.tsx`, `src/components/admin/AdminGuests.tsx`
- **Verification:** `npm run build`
- **Committed in:** `e1ef2f9`

---

**Total deviations:** 1 auto-fixed (1 blocking).
**Impact:** ajuste mínimo necessário para manter o frontend fail-closed e tipado; nenhum trabalho visual alheio foi incluído.

## Issues Encountered

O teste do shell precisou ser montado sob a rota pai `/admin/*` para reproduzir corretamente o contexto de rotas relativas usado pela aplicação.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- O papel `seller` já tem acesso backend e shell restritos a Presentes para o plano 08-05.
- O vocabulário e os eventos de lifecycle já estão prontos para consulta/retention da auditoria no plano 08-06.
- As mudanças locais de redesign de `AdminOverview` e demais arquivos alheios permaneceram intactas e fora dos commits.

## Self-Check: PASSED

- Arquivos-chave existem.
- Seis commits RED/GREEN do plano existem.
- `npm test -- --run` passou com 567 testes.
- `npm run build` passou.

---
*Phase: 08-gest-o-de-gestores-contas-individuais-permiss-es-e-auditoria*
*Completed: 2026-07-25*
