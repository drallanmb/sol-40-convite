---
phase: 06-dashboard-interno-admin
plan: 03
subsystem: admin-rsvp
tags: [convex, react, optimistic-concurrency, capability-revocation, accessibility]

requires:
  - phase: 06-dashboard-interno-admin
    provides: Sessão administrativa protegida, gate, shell, rotas e overview reativo dos Planos 01/02
  - phase: 03-rsvp
    provides: Convites familiares, pessoas, capabilities públicas e normalização brasileira de telefone
provides:
  - API administrativa protegida para listar, criar, editar e remover famílias e pessoas
  - Revisão RSVP monotônica compartilhada entre writers públicos e administrativos
  - Revogação indexada de capabilities públicas em troca lógica de telefone e cascade familiar
  - Busca/filtro por família inteira e rascunhos com conflito explícito
  - Interface agrupada acessível para operação completa de convidados
affects: [06-04, phase-07-launch, admin-guests, public-rsvp]

tech-stack:
  added: []
  patterns:
    - Uma única linha de revisão max(now,current+1) protege writers públicos e administrativos
    - Filtros selecionam famílias mas nunca recortam as pessoas do grupo
    - Rascunhos locais preservam campos sujos e exigem revisão quando a revisão remota avança
    - Fixtures reais são limitadas, rastreadas por id e limpas em finally

key-files:
  created:
    - convex/adminRsvps.ts
    - src/lib/adminSearch.ts
    - src/lib/adminGuestDraft.ts
    - src/components/admin/AdminConfirmDialog.tsx
    - src/components/admin/AdminGuests.tsx
  modified:
    - convex/schema.ts
    - convex/rsvpInternal.ts
    - convex/rsvpModel.ts
    - convex/rsvps.ts
    - convex/admin.test.ts
    - convex/adminTest.ts
    - src/components/admin/AdminShell.tsx
    - src/content/admin.ts

key-decisions:
  - "Famílias com zero pessoas são registros operacionais completos: podem ser listadas, editadas, receber pessoas e ser removidas."
  - "Troca de telefone compara a identidade lógica normalizada; mera reformatação equivalente, inclusive legado→atual, não revoga sessões."
  - "publicRef nunca é recalculado; novas pessoas recebem referência opaca collision-checked com tentativas limitadas."
  - "O cliente mantém um único DOM semântico por família em todos os breakpoints e limpa seus rascunhos no boundary da sessão."

patterns-established:
  - "Admin RSVP command: requireAdminSession → expected family revision → validation/ownership → one transactional write."
  - "Reactive draft: clean fields follow server; dirty fields survive; a new server revision becomes explicit conflict."
  - "Destructive hierarchy: person removal preserves invitation; family removal requires acknowledgement and revokes every public access."

requirements-completed: [ADMIN-04]

coverage:
  - id: D1
    description: "CRUD familiar protegido com família vazia válida, publicRef estável, revisão monotônica, revogação indexada e cascade atômico."
    requirement: ADMIN-04
    verification:
      - kind: integration
        ref: "convex/admin.test.ts#admin family authorization matrix + admin family and guest operations"
        status: pass
      - kind: integration
        ref: "convex/rsvps.test.ts#public RSVP monotonic revision"
        status: pass
      - kind: e2e
        ref: "npx convex run adminTest:smokeFamilyCascade '{}'"
        status: pass
    human_judgment: false
  - id: D2
    description: "Busca acento/caixa/dígitos, filtro por presença com contexto familiar inteiro e contagem determinística."
    requirement: ADMIN-04
    verification:
      - kind: unit
        ref: "src/lib/adminSearch.test.ts"
        status: pass
      - kind: automated_ui
        ref: "Browser smoke: pending + busca normal exibiu família completa com três pessoas"
        status: pass
    human_judgment: false
  - id: D3
    description: "Rascunhos familiares preservam intenção local, retêm erro/retry e bloqueiam sobrescrita silenciosa concorrente."
    requirement: ADMIN-04
    verification:
      - kind: unit
        ref: "src/lib/adminGuestDraft.test.ts"
        status: pass
      - kind: automated_ui
        ref: "Browser smoke em duas abas preservou nome local e exibiu conflito após save remoto"
        status: pass
    human_judgment: false
  - id: D4
    description: "Interface agrupada com criação manual, edição inline, zero-person, confirmações distintas, foco seguro e shell responsivo."
    requirement: ADMIN-04
    verification:
      - kind: automated_ui
        ref: "Browser smoke: criação/remoção zero-person, aviso de telefone, acknowledgement familiar, 320px e 1023/1024px"
        status: pass
      - kind: other
        ref: "npm run build"
        status: pass
    human_judgment: true
    rationale: "Alcance do CTA sob teclado virtual iOS/Android e zoom real de 200% ainda exigem validação humana em dispositivos."

duration: 12min
completed: 2026-07-25
status: complete
---

# Phase 6 Plan 3: Protected Family RSVP Operations Summary

**Operação familiar protegida com busca contextual, edição concorrente segura, capabilities revogáveis e interface agrupada responsiva**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-25T04:15:30Z
- **Completed:** 2026-07-25T04:27:16Z
- **Tasks:** 3
- **Files modified:** 18

## Accomplishments

- Entregou projeção administrativa separada e sete portas protegidas para listar/criar/editar/remover famílias e pessoas, incluindo o ciclo completo de uma família com zero pessoas.
- Unificou todo writer RSVP público/admin numa revisão estritamente monotônica e adicionou conflito esperado que impede uma edição administrativa obsoleta de sobrescrever uma resposta pública.
- Adicionou índice reverso de sessões, revogação transacional por troca lógica de telefone e cascade familiar limitado, provado no Convex real com limpeza em `finally`.
- Entregou busca acento/caixa/dígitos, filtro que preserva o grupo inteiro, rascunhos com reconciliação explícita e interface acessível com confirmações de consequência distintas.

## Task Commits

1. **Task 1: Add protected family projection, manual creation, edits, and transactional revocation** - `3159f15` (feat)
2. **Task 2: Build context-preserving search/filter and conflict-aware family drafts** - `536944e` (feat)
3. **Task 3: Deliver accessible grouped guest operations and confirmations** - `d48ce23` (feat)
4. **Task 1 follow-up: Preserve sessions for equivalent legacy phones** - `3d1e1eb` (fix)

## Files Created/Modified

- `convex/adminRsvps.ts` - Projeção protegida e operações transacionais de família/pessoa.
- `convex/schema.ts` - Índice `rsvpSessions.by_rsvp`.
- `convex/rsvpModel.ts`, `convex/rsvps.ts` - Helper monotônico compartilhado e writer público migrado.
- `convex/rsvpInternal.ts` - Reuso de unicidade lógica e geração opaca limitada de novos `publicRef`.
- `convex/adminTest.ts` - Smoke real limitado e autocontido do cascade familiar.
- `convex/admin.test.ts`, `convex/rsvps.test.ts` - Autorização, invariantes, clocks, revogação, cascade e concorrência.
- `src/lib/adminSearch.ts` - Folding e seleção de famílias inteiras.
- `src/lib/adminGuestDraft.ts` - Estado de rascunho, retry e conflito por revisão.
- `src/components/admin/AdminConfirmDialog.tsx` - Diálogo nativo com foco inicial seguro e acknowledgement opcional.
- `src/components/admin/AdminGuests.tsx` - Lista semântica agrupada e todos os fluxos operacionais de convidados.
- `src/components/admin/AdminShell.tsx` - Montagem do destino protegido Convidados.

## Decisions Made

- A coleção é pequena e limitada ao evento; a query protegida retorna famílias completas e busca/filtro permanecem locais e puros.
- Uma alteração de telefone revoga capabilities somente quando a identidade lógica muda, não quando muda apenas a formatação.
- Exclusões de pessoa/família têm confirmação e consequência separadas; a família inteira exige acknowledgement com cancelamento em foco inicial.
- A revisão do servidor, e não o tempo do browser, decide conflitos; respostas obsoletas não limpam nem submetem automaticamente o rascunho.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Loop de reconciliação do wrapper reativo**

- **Found during:** Task 3 browser smoke
- **Issue:** O wrapper experimental da query podia mudar de identidade e disparar reconstrução infinita do mapa de rascunhos.
- **Fix:** A reconciliação passou a depender de uma chave estável `familyId:updatedAt`, reagindo somente a mudanças reais de coleção/revisão.
- **Files modified:** `src/components/admin/AdminGuests.tsx`
- **Verification:** Nova aba ficou estável sem logs de erro; busca, criação, conflito e remoção continuaram funcionais.
- **Committed in:** `d48ce23`

**2. [Rule 1 - Bug] Reformatação de telefone legado era tratada como troca lógica**

- **Found during:** Revisão de invariantes após Task 3
- **Issue:** Comparar strings canônicas poderia revogar uma sessão ao migrar a grafia legada para a forma móvel atual equivalente.
- **Fix:** A decisão de revogar passou a comparar `normalizedKey`; teste dedicado prova que a capability permanece válida.
- **Files modified:** `convex/adminRsvps.ts`, `convex/admin.test.ts`
- **Verification:** Teste `legacy-phone` e suite/build completos passaram.
- **Committed in:** `3d1e1eb`

---

**Total deviations:** 2 auto-fixed (2 bugs).
**Impact on plan:** Ambas as correções preservam invariantes já exigidas; nenhuma expande o escopo do produto.

## Issues Encountered

- O primeiro smoke de navegador detectou o loop reativo descrito acima. Após a correção, uma sessão nova apresentou zero erros no console.
- O zoom real de 200% e teclado virtual móvel não são controláveis de modo fiel no navegador conectado; 320px, alvos, overflow e breakpoints foram automatizados, mantendo esses dois itens como backstop humano.

## Browser and Real-Backend Evidence

- Em `presenca=pending`, buscar `normal` retornou uma família com todas as três pessoas (`pending`, `yes`, `no`).
- Uma família com zero pessoas foi criada, permaneceu expandida/editável e foi removida somente após acknowledgement; nenhuma fixture restou.
- Trocar o telefone exibiu a consequência de revogação antes do save.
- Duas abas autenticadas: a segunda salvou contato; a primeira manteve o nome local sujo e mostrou conflito explícito.
- Em 320px não houve overflow horizontal; alvos visíveis medidos ficaram acima de 44px.
- Em 1023px havia apenas barra inferior; em 1024px apenas sidebar.
- O smoke `adminTest:smokeFamilyCascade` criou uma família, uma pessoa e uma sessão, comprovou consultas indexadas/cascade e limpou tudo.
- A senha temporária de smoke foi removida do deployment de desenvolvimento.

## Verification

- Focused public revision tests: 2 passed.
- Focused admin/search/draft tests: 16 passed.
- Full suite: 23 files, 459 tests passed.
- Production build: passed.
- `npx convex dev --once`: passed.
- Real `adminTest:smokeFamilyCascade`: passed and left no fixture.
- `git diff --check`: passed.
- ASVS L1 high-severity review: no unauthorized DTO/write, cross-family write, stale overwrite or surviving revoked capability remains open.

## User Setup Required

None - no external service configuration required. The temporary development password used for browser smoke was removed.

## Next Phase Readiness

- Plan 06-04 can reuse the guarded session boundary, conflict vocabulary, dialog and local search patterns for moderation and gifts.
- Phase 7 can load the real guest list without changing the manual single-family operations delivered here.
- Human UAT should still cover 200% zoom and mobile virtual-keyboard reachability on iOS/Android.

## Self-Check: PASSED

- All five created key files exist.
- All task/follow-up commits are present.
- Every task acceptance gate and plan verification command passed.
- Browser fixtures, Convex smoke rows and temporary `ADMIN_PASSWORD` were removed.
- Pre-existing `.planning/config.json`, `src/lib/phone.ts` and `src/lib/phone.test.ts` changes remain unstaged and untouched.

---
*Phase: 06-dashboard-interno-admin*
*Completed: 2026-07-25*
