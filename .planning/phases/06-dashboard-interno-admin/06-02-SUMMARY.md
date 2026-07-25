---
phase: 06-dashboard-interno-admin
plan: 02
subsystem: admin-ui
tags: [react-router, convex, reactive-query, responsive-navigation, accessibility]

requires:
  - phase: 06-dashboard-interno-admin
    provides: Capability administrativa opaca, sessão absoluta de sete dias e reducer fail-closed do Plan 01
provides:
  - Gate único para rotas protegidas /admin/* com retorno ao mesmo destino
  - Shell responsivo com sidebar de 248px e barra móvel de quatro destinos
  - Overview Convex protegido com familyCount independente e contagens reativas por pessoa
  - Cards semânticos, badges pendentes, estados de loading/erro/reconexão e vazios verdadeiros
affects: [06-03, 06-04, admin-guests, admin-moderation, admin-gifts]

tech-stack:
  added: []
  patterns:
    - Protected hooks mount only below the authoritative session gate
    - Canonical nested route and filter intent remains URL-owned
    - familyCount is independent from attendance totals
    - Convex protected queries return an explicit unauthorized discriminant

key-files:
  created:
    - convex/adminOverview.ts
    - src/content/admin.ts
    - src/content/admin.test.ts
    - src/components/admin/AdminLogin.tsx
    - src/components/admin/AdminShell.tsx
    - src/components/admin/AdminOverview.tsx
  modified:
    - convex/admin.test.ts
    - convex/_generated/api.d.ts
    - src/App.tsx
    - src/routes/Admin.tsx
    - src/components/ui/Button.tsx
    - src/components/ui/Card.tsx
    - src/components/ui/Field.tsx
    - src/components/ui/Toast.tsx
    - src/index.css

key-decisions:
  - "A consulta de status é a única consulta permitida antes da autenticação; AdminShell e adminOverview só montam após status válido."
  - "adminOverview retorna unauthorized como discriminante sem DTO, permitindo desmontagem imediata do shell sem depender de texto de erro."
  - "familyCount vem diretamente de rsvps e nunca é inferido da soma de presenças, preservando a família com zero pessoas."
  - "O foco administrativo mantém coral e ganha anel externo plum para ultrapassar 3:1 sobre superfícies claras."

patterns-established:
  - "Protected shell gate: checking/anonymous never mounts a protected component or hook."
  - "Reactive aggregate: read source tables per query rather than materializing client counters."
  - "Operational navigation: stable route constants drive sidebar, bottom bar and whole-card links."

requirements-completed: [ADMIN-02, ADMIN-03]

coverage:
  - id: D1
    description: "Gate de sessão, login e shell canônico com quatro rotas administrativas"
    requirement: ADMIN-02
    verification:
      - kind: unit
        ref: "src/lib/adminSession.test.ts + src/content/admin.test.ts"
        status: pass
      - kind: other
        ref: "npm run build"
        status: pass
    human_judgment: false
  - id: D2
    description: "Overview protegido com familyCount independente, contagens por pessoa e badges pendentes"
    requirement: ADMIN-03
    verification:
      - kind: integration
        ref: "convex/admin.test.ts#admin overview authorization matrix and aggregates"
        status: pass
      - kind: other
        ref: "npx convex dev --once"
        status: pass
    human_judgment: false
  - id: D3
    description: "Privacidade pré-auth, paridade em duas abas e limpeza cross-tab por revogação"
    requirement: ADMIN-03
    verification:
      - kind: manual_procedural
        ref: "Real Chrome + Convex dev smoke: logged-out reload, two-tab parity, logout and reauth"
        status: pass
    human_judgment: false
  - id: D4
    description: "Adequação visual em 320px/200% e troca exata em 1023/1024px"
    requirement: ADMIN-02
    verification: []
    human_judgment: true
    rationale: "O controle de viewport do navegador conectado não alterou os CSS pixels; estes backstops permanecem para UAT visual humana."

duration: 12 min
completed: 2026-07-25
status: complete
---

# Phase 6 Plan 2: Protected Admin Shell and Overview Summary

**Gate de sessão sem consulta de domínio pré-auth, shell responsivo e overview Convex reativo com contagens operacionais verdadeiras**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-25T04:02:54Z
- **Completed:** 2026-07-25T04:13:58Z
- **Tasks:** 3
- **Files modified:** 15

## Accomplishments

- Entregou `/admin/*` com login, restauração, logout server-first, rotas canônicas, sidebar desktop e quatro destinos móveis.
- Implementou `adminOverview.get` com autorização antes de qualquer leitura, `familyCount` independente, contagens por pessoa, memórias pendentes, vinhos presenteados e badges.
- Validou no Convex real duas abas com o mesmo estado protegido, revogação limpando ambas e recarregamento anônimo sem novas execuções de funções.

## Task Commits

1. **Task 1 RED: contrato de rotas e conteúdo** - `2954fe0` (test)
2. **Task 1 GREEN: gate e shell protegidos** - `f69abd1` (feat)
3. **Task 2 RED: autorização e agregados** - `b1fa980` (test)
4. **Task 2 GREEN: overview protegido e reativo** - `2c96519` (feat)
5. **Task 3: correções encontradas no smoke de acessibilidade** - `df08cf5` (fix)

## Files Created/Modified

- `convex/adminOverview.ts` - Query protegida e reativa do resumo operacional.
- `convex/admin.test.ts` - Matriz de autorização, zero-family/zero-person e contagens multi-sessão.
- `src/content/admin.ts` - Rotas, filtros, cópia e pluralização canônicos.
- `src/components/admin/AdminLogin.tsx` - Login dos donos com erros distintos e foco recuperável.
- `src/components/admin/AdminShell.tsx` - Navegação responsiva, badges, logout e desmontagem por perda de autorização.
- `src/components/admin/AdminOverview.tsx` - Links métricos, skeletons, vazios, erro e reconexão.
- `src/routes/Admin.tsx` - Gate discriminado e ciclo de sessão usando o seam do Plan 01.
- `src/components/ui/{Button,Card,Field,Toast}.tsx` - Tratamentos administrativos opt-in, preservando defaults públicos.
- `src/index.css` - Safe areas, redução de movimento e foco administrativo contrastante.

## Decisions Made

- O estado da URL é o único dado de navegação preservado; buscas e DTOs não entram no armazenamento.
- A perda de autorização no overview substitui o shell por estado neutro no mesmo render e então aciona o reducer fail-closed.
- O overview permanece uma query de fontes, sem tabela de contadores ou snapshot local.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Regenerated and deployed the Convex API binding**
- **Found during:** Task 2
- **Issue:** O TypeScript não reconhecia `api.adminOverview` e o deployment real ainda não expunha a função nova.
- **Fix:** Executado `npx convex codegen` e, no smoke, `npx convex dev --once`; `convex/_generated/api.d.ts` foi incluído no commit.
- **Files modified:** `convex/_generated/api.d.ts`
- **Verification:** Build passou e `adminOverview:get` respondeu no deployment real.
- **Committed in:** `2c96519`

**2. [Rule 1 - Bug] Campo outline perdia alvo mínimo e foco coral não atingia 3:1 no cream**
- **Found during:** Task 3
- **Issue:** A variante outline não herdava `min-h-[44px]`; o contraste coral/cream medido era 2,81:1.
- **Fix:** Separada a base compartilhada do Field e adicionado anel externo plum ao foco admin, mantendo o contorno coral.
- **Files modified:** `src/components/ui/Field.tsx`, `src/components/admin/AdminLogin.tsx`, `src/components/admin/AdminShell.tsx`, `src/index.css`
- **Verification:** Browser mediu input 55,16px e CTA 55,42px; plum/cream mede 14,46:1; suite/build passaram.
- **Committed in:** `df08cf5`

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocker).
**Impact on plan:** Correções necessárias para compilação, deployment real e conformidade de foco/alvo; sem expansão de produto.

## Issues Encountered

- O viewport override da sessão Chrome permaneceu em 1487 CSS px mesmo após solicitar 1023/1024. Os backstops de 320px/200% e 1023/1024 não foram declarados como aprovados e seguem para UAT humana.
- A inspeção de logs mostrou respostas `unauthorized` das assinaturas já montadas no instante do logout; após recarregar já anônimo, não houve nova chamada de status, overview ou domínio.

## Real Browser / Convex Evidence

- Antes do login, o DOM continha apenas `Painel dos donos`, senha e CTA; não havia shell, contagem, imagem ou conteúdo de domínio.
- Duas abas autenticadas exibiram exatamente `1` confirmado, `1` recusa, `14` pendentes, `2` memórias pendentes e `0 de 37` vinhos presenteados.
- Logout em uma aba removeu `Visão geral` das duas abas, mostrou login em ambas e manteve `/admin/visao`.
- Reautenticação voltou para `/admin/visao`.
- Recarregamento anônimo subsequente não produziu nova execução Convex; o ambiente temporário `ADMIN_PASSWORD` foi removido e todas as sessões descartáveis foram encerradas.
- O primeiro foco navegável no shell é `Pular para o conteúdo`, há um `h1`, não houve overflow na largura disponível e todos os alvos visíveis auditados tinham ao menos 44px.

## Verification

- `npx vitest run src/lib/adminSession.test.ts src/content/admin.test.ts` — 29 passed.
- `npx vitest run convex/admin.test.ts -t "authorization matrix|overview|familyCount|zero-person|count|badge" src/content/admin.test.ts` — 11 passed, 19 skipped pelo filtro.
- `npm test` — 21 arquivos, 444 testes passed.
- `npm run build` — passed.
- `npx convex dev --once` — functions ready no deployment de desenvolvimento.
- `git diff --check` — passed.
- ASVS L1: nenhuma exposição pré-auth ou bypass de autorização de severidade alta permaneceu aberto.

## User Setup Required

None - no external service configuration required. A senha temporária usada no smoke foi removida do deployment de desenvolvimento.

## Next Phase Readiness

- Pronto para 06-03 consumir o shell, as rotas canônicas e a query protegida ao implementar operações de convidados.
- UAT visual ainda deve cobrir 320px a 200%, 1023/1024px, reduced motion, safe area e contraste/foco nos dispositivos reais.

## Self-Check: PASSED

---
*Phase: 06-dashboard-interno-admin*
*Completed: 2026-07-25*
