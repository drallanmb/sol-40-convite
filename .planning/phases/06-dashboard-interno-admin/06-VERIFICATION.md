---
phase: 06-dashboard-interno-admin
verified: 2026-07-25T04:54:49Z
status: gaps_found
score: "3/5 roadmap must-haves verified"
behavior_unverified: 1
overrides_applied: 0
requirements:
  satisfied: [ADMIN-01, ADMIN-05, ADMIN-06]
  needs_human: [ADMIN-02, ADMIN-03]
  blocked: [ADMIN-04]
gaps:
  - truth: "O dono lista, busca, edita e remove convidados e RSVPs, incluindo troca de telefone e remoção de família depois de qualquer quantidade válida de acessos públicos."
    status: failed
    reason: "Sessões públicas RSVP expiradas não têm expiração/limpeza física. Depois de 129 sessões acumuladas, updateFamily e removeFamily recusam permanentemente a operação, contrariando a revogação total e o cascade exigidos por ADMIN-04."
    artifacts:
      - path: "convex/rsvpSecurity.ts"
        issue: "createRsvpSession insere a sessão, mas não agenda exclusão nem oferece limpeza de expiradas."
      - path: "convex/adminRsvps.ts"
        issue: "Troca de telefone e remoção de família usam take(129) e falham quando existem mais de 128 sessões vinculadas."
      - path: "convex/admin.test.ts"
        issue: "O teste de cascade cobre somente uma quantidade pequena e não exercita mais de 128 sessões históricas/expiradas."
    missing:
      - "Agendar exclusão idempotente no expiresAt para cada sessão pública RSVP."
      - "Limpar/migrar de forma limitada as sessões expiradas já existentes."
      - "Fazer revogação/cascade concluir para mais de 128 sessões, com paginação interna se o limite transacional exigir."
      - "Adicionar regressão com mais de 128 sessões expiradas provando troca de telefone e remoção de família com zero sessões remanescentes."
  - truth: "Somente o registro afetado fica desabilitado, mesmo quando operações em registros diferentes estão simultaneamente em andamento."
    status: partial
    reason: "Cada tela guarda apenas um busyFamily/busyPost/busyWine. A operação B substitui o id de A e o finally de A pode limpar o bloqueio de B, permitindo submissão duplicada e feedback fora de ordem."
    artifacts:
      - path: "src/components/admin/AdminGuests.tsx"
        issue: "busyFamily é um único string|null compartilhado por operações concorrentes."
      - path: "src/components/admin/AdminModeration.tsx"
        issue: "busyPost é sobrescrito e limpo incondicionalmente por qualquer conclusão."
      - path: "src/components/admin/AdminGifts.tsx"
        issue: "busyWine não representa mais de uma operação em andamento."
    missing:
      - "Rastrear IDs pendentes em Set/mapa por registro e remover somente o ID concluído."
      - "Impedir nova chamada para um ID já pendente."
      - "Adicionar testes de componente com promises controladas para A/B, resolvendo A primeiro e mantendo B desabilitado."
behavior_unverified_items:
  - truth: "A visão geral e os badges atualizam ao vivo em duas sessões autenticadas após mudanças nas tabelas fonte."
    test: "Abrir duas sessões autenticadas, mudar RSVP/moderação/presente em uma e observar a outra sem recarregar."
    expected: "Contagens, badges e listas mudam uma vez e refletem o mesmo estado confirmado no servidor."
    why_human: "O código usa queries Convex reativas e não copia os resultados, mas nenhum teste automatizado executado pelo verificador exerce a assinatura WebSocket entre dois navegadores."
---

# Phase 6: Dashboard Interno (/admin) Verification Report

**Phase Goal:** Os donos operam tudo de um painel protegido que atualiza ao vivo.
**Verified:** 2026-07-25T04:54:49Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Verdict

A autenticação administrativa, o gate protegido, a moderação e a operação de
presentes existem, estão conectados aos dados reais e têm testes
comportamentais focados. A fase, porém, não pode ser encerrada: a operação de
convidados fica permanentemente indisponível quando uma família acumula mais
de 128 sessões públicas RSVP, inclusive expiradas. Essas sessões não são
removidas pelo tempo.

O warning de concorrência do code review também foi confirmado no código. Ele
não cria corrupção silenciosa no backend porque as revisões esperadas recusam
o write obsoleto, mas viola o contrato de busy state da interface e permite
submissões duplicadas enquanto outra operação ainda está pendente.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | O dono entra com a senha compartilhada; sem senha, `/admin` não expõe dados. | ✓ VERIFIED | `adminAuth.login` limita tentativas, compara o segredo no servidor, persiste somente hash e agenda expiração; `Admin.tsx` monta apenas status/login antes da autenticação. O teste nomeado de sessão absoluta passou. |
| 2 | A visão geral mostra confirmações atualizando ao vivo. | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `AdminShell` assina `adminOverview.get`; a query autoriza primeiro e lê diretamente `rsvps`, `rsvpGuests`, `posts` e `wines`. O teste de agregados passou, mas o verificador não executou uma assinatura WebSocket em dois navegadores. |
| 3 | O dono lista, busca, edita e remove convidados e RSVPs. | ✗ FAILED | CRUD, busca e revisão existem, porém `updateFamily` e `removeFamily` recusam mais de 128 sessões enquanto sessões expiradas permanecem indefinidamente. |
| 4 | O dono aprova/oculta posts do mural na fila de moderação. | ✓ VERIFIED | `adminPosts` autoriza antes da projeção, ordena pendentes, aplica somente transições legais e usa revisão no undo. O teste nomeado de undo stale/ABA passou. |
| 5 | O dono marca vinhos como presenteados. | ✓ VERIFIED | `adminWines` e `wineOperations` exigem presenter, usam timestamp/revisão do servidor e limpam atribuição atomicamente. O teste nomeado stale/ABA de presente passou. |

**Score:** 3/5 truths verified (1 present, behavior-unverified; 1 failed)

## Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `convex/adminAuth.ts`, `adminSecurity.ts`, `adminInternal.ts` | Sessão protegida absoluta e revogável | ✓ VERIFIED | Substantivos, indexados, testados e conectados ao gate. |
| `src/routes/Admin.tsx`, `AdminShell.tsx` | Gate e shell `/admin/*` | ✓ VERIFIED (code) / HUMAN UI | Nenhum subtree protegido monta no checking/anônimo; quatro rotas estão conectadas. Backstops visuais permanecem abaixo. |
| `convex/adminOverview.ts`, `AdminOverview.tsx` | Resumo operacional de fontes reais | ✓ VERIFIED (data flow) / BEHAVIOR UNVERIFIED | Query protegida e componente conectados; reatividade multi-browser requer UAT. |
| `convex/adminRsvps.ts`, `AdminGuests.tsx` | Operação completa por família | ✗ BLOCKED | CRUD existe, mas a revogação/cascade tem teto permanente de 128 sessões. |
| `convex/adminPosts.ts`, `AdminModeration.tsx` | Fila e transições de moderação | ✓ VERIFIED | Estado/revisão e UI estão conectados; projeção pública continua aprovada-only. |
| `convex/adminWines.ts`, `wineOperations.ts`, `AdminGifts.tsx` | Operação atômica de presentes | ✓ VERIFIED | Projeção admin, writers e UI estão conectados; DTO público permanece estreito. |

## Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `Admin.tsx` | `AdminShell` | `getSessionStatus` válido | ✓ WIRED | Shell não monta antes de autorização. |
| `AdminShell` | overview/guests/moderation/gifts | rotas e queries protegidas | ✓ WIRED | Os quatro destinos reais substituem placeholders. |
| `adminOverview.get` | tabelas fonte | `requireAdminSession` + consultas diretas | ✓ WIRED | Não há contador materializado ou snapshot cliente. |
| `AdminGuests` | `adminRsvps` | mutations com expected revision | ⚠️ PARTIAL | Wiring funcional, mas o cascade falha acima de 128 sessões e o busy state concorrente é inexato. |
| `AdminModeration` | `adminPosts` | status + revision + undo | ✓ WIRED | Teste stale/ABA passou. |
| `AdminGifts` | `adminWines` | `updatedAt` + transição atômica | ✓ WIRED | Teste stale/ABA passou. |

## Data-Flow Trace

| Surface | Source | Produces Real Data | Status |
|---|---|---|---|
| Overview | `adminOverview.get` → RSVP/posts/wines | Yes | ✓ FLOWING |
| Guests | `adminRsvps.listFamilies` → grouped protected DTO | Yes | ⚠️ FLOWING WITH CASCADE GAP |
| Moderation | `adminPosts.listByStatus` → posts + protected storage URL | Yes, after auth | ✓ FLOWING |
| Gifts | `adminWines.listAdmin` → wines with admin-only attribution | Yes, after auth | ✓ FLOWING |
| Public album/catalog | `posts.listApproved` / public wines projection | Yes, narrow DTOs | ✓ FLOWING |

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Sessão absoluta de sete dias sem token/hash no retorno | `npx vitest run convex/admin.test.ts -t "creates an absolute seven-day session and exposes no token or hash"` | 1 passed | ✓ PASS |
| Agregados de overview vindos das tabelas fonte | `npx vitest run convex/admin.test.ts -t "counts mixed-family attendance, memories, wines and badges from source rows"` | 1 passed | ✓ PASS |
| Cascade RSVP no caso pequeno coberto pelo teste atual | `npx vitest run convex/admin.test.ts -t "keeps public refs stable, revokes only on logical phone change and cascades sessions"` | 1 passed | ✓ PASS, insufficient for >128 |
| Undo de moderação não sobrescreve revisão nova/ABA | `npx vitest run convex/admin.test.ts -t "undoes the exact action but rejects stale and ABA revisions without writing"` | 1 passed | ✓ PASS |
| Desmarcar presente não limpa gift novo/ABA | `npx vitest run convex/admin.test.ts -t "clears attribution together and rejects stale/ABA gift commands"` | 1 passed | ✓ PASS |
| Build de produção | `npm run build` | TypeScript + Vite succeeded | ✓ PASS |

A evidência do gate anterior também registra 24 arquivos e 477 testes
passando. Ela confirma ausência de regressão geral, mas não cobre o caso
histórico de mais de 128 sessões.

## Probe Execution

Nenhum `probe-*.sh` foi declarado ou encontrado para a fase.

## Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
|---|---|---|---|
| ADMIN-01 | 06-01 | ✓ SATISFIED | Senha server-only, capability opaca hash-only, TTL absoluto, logout e expiração agendada. |
| ADMIN-02 | 06-02 | ? NEEDS HUMAN | Shell e breakpoints existem no código; zoom real, safe area, foco e troca 1023/1024 ainda exigem UAT final. |
| ADMIN-03 | 06-02 | ? NEEDS HUMAN | Agregados estão corretos e a assinatura é reativa por construção; atualização simultânea entre navegadores não foi exercida pelo verificador. |
| ADMIN-04 | 06-03 | ✗ BLOCKED | Operações falham depois de 128 sessões acumuladas. |
| ADMIN-05 | 06-04 | ✓ SATISFIED | Fila, transições, revisão, undo condicional e privacidade pública testados. |
| ADMIN-06 | 06-04 | ✓ SATISFIED | Mark/unmark atômicos, presenter obrigatório, timestamp server-side e DTO público estreito testados. |

Não há requisito órfão: ADMIN-01–06 aparecem nos quatro planos. O estado
Pending de ADMIN-04–06 em `REQUIREMENTS.md` e os contadores 2/4 do
`ROADMAP.md` são tracking ainda não atualizado, não evidência de ausência de
código.

## Adversarial / Test Quality Findings

1. **Requisito parcialmente atendido:** ADMIN-04 funciona somente enquanto a
   família possui no máximo 128 sessões históricas.
2. **Teste que parece mais amplo do que é:** o caso
   `keeps public refs stable... cascades sessions` passa, mas usa poucas
   sessões e não prova “revogar todas” sob o histórico que causa o defeito.
3. **Caminho sem cobertura:** não há teste para 129 sessões expiradas nem
   teste de componente que mantenha B busy após A concluir.

## Anti-Patterns Found

| File | Lines | Pattern | Severity | Impact |
|---|---:|---|---|---|
| `convex/adminRsvps.ts` | 20, 227–234, 371–380 | Teto fixo sobre dados que acumulam sem lifecycle | 🛑 BLOCKER | Bloqueia troca de telefone e remoção de família. |
| `AdminGuests.tsx` | 193, 264–354 | Um único busy ID para operações concorrentes | ⚠️ Warning | Busy state inexato e possível duplicate submit. |
| `AdminModeration.tsx` | 82, 132–198 | Um único busy ID para operações concorrentes | ⚠️ Warning | Outra ação pode perder o bloqueio antes de concluir. |
| `AdminGifts.tsx` | 154, 202–258 | Um único busy ID para operações concorrentes | ⚠️ Warning | Dialog/linha pode ser reativado prematuramente. |

Nenhum `TBD`, `FIXME`, `XXX`, `TODO`, `HACK`, placeholder ou handler
`console.log` foi encontrado nos 43 arquivos revisados.

## Prohibition Review

Os dez `must_haves.prohibitions` dos planos continuam declarados como
`status: unresolved` e sem mecanismo de enforcement tipado no frontmatter.
Leitura de código e testes fornece evidência favorável — nenhum papel/feature
antiga reapareceu, queries públicas continuam estreitas, tokens/senhas não
entram em DTOs, e revisões impedem overwrite stale — mas esse é um julgamento
LLM não autoritativo. Após fechar os gaps, recomenda-se revisão humana explícita
dos quatro grupos: segredos/escopo da autenticação; privacidade e verdade dos
dados RSVP/overview; privacidade e concorrência da moderação; privacidade e
atomicidade dos presentes.

## Human Verification Required

Depois de corrigir os gaps, executar:

1. Duas sessões autenticadas, alterando RSVP, moderação e presente em uma e
   observando overview, badges, listas e superfícies públicas na outra.
2. 320 CSS px com zoom real de 200%, e 1023/1024px, verificando ausência de
   overflow, navegação duplicada ou foco inacessível.
3. Nomes muito longos de família/pessoa/vinho e mensagem longa de memória,
   preservando controles destrutivos, badges e conteúdo decisório.
4. Teclado virtual real em iOS e Android nos diálogos de família e presente,
   mantendo campo ativo e CTA alcançáveis.
5. Contraste/foco/chips, reduced motion, safe area, Escape, trap e restauração
   de foco em dispositivos/navegadores reais.
6. Revisão humana dos dez prohibitions ainda marcados `unresolved`.

## Gaps Summary

O gap CR-01 é decisivo: sem lifecycle das sessões públicas, uma quantidade
alcançável de acessos expira logicamente, mas permanece fisicamente e torna
ADMIN-04 incapaz de trocar telefone ou remover a família. A fase deve continuar
aberta até a limpeza/expiração e o cascade acima de 128 serem provados por
regressão. WR-01 deve ser corrigido junto para que a interface represente
operações concorrentes com fidelidade.

Nenhum item é deferível para a Phase 7: os critérios de lançamento não incluem
lifecycle RSVP nem o busy state concorrente do dashboard.

---

_Verified: 2026-07-25T04:54:49Z_
_Verifier: Claude (gsd-verifier)_
