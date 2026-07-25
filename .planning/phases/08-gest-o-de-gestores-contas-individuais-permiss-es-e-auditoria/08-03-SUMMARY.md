---
phase: 08-gest-o-de-gestores-contas-individuais-permiss-es-e-auditoria
plan: "03"
subsystem: auth
tags: [convex, scrypt, sessions, react, fail-closed]
requires:
  - phase: 08-02
    provides: account records, activation/reset links and owner bootstrap cutoff
provides:
  - Individual email/password login with neutral failures and seven-day labeled sessions
  - Self/owner session controls plus versioned password and owner-email changes
  - Fail-closed in-memory principal and accessible Minha conta experience
affects: [08-04, 08-06, 08-07]
tech-stack:
  added: []
  patterns:
    - Node credential actions terminate in one version-checked Web-runtime mutation
    - Session DTOs expose allowlisted device metadata and never capabilities or hashes
key-files:
  created:
    - convex/adminAccounts.ts
    - convex/adminSessions.ts
    - src/components/admin/AdminMyAccount.tsx
  modified:
    - convex/adminAuthActions.ts
    - convex/adminAuth.ts
    - src/lib/adminSession.ts
    - src/routes/Admin.tsx
    - src/components/admin/AdminShell.tsx
key-decisions:
  - "O login individual conserva a capability gerada no navegador; a action Node valida scrypt e o finalizer relê state/credentialVersion antes de criar a sessão."
  - "O principal fica somente em memória; localStorage continua contendo apenas token opaco e hint de expiração."
  - "A revogação eleva a sequência do reducer para que uma resposta já em voo nunca ressuscite identidade ou dados protegidos."
patterns-established:
  - "Credential CAS: snapshot interno, KDF Node e finalizer único que relê conta, sessão e credentialVersion."
  - "Self-or-owner sessions: projeção allowlisted, autorização no backend e auditoria no mesmo commit da revogação."
requirements-completed: [ADMIN-01, ADMIN-02]
coverage:
  - id: D1
    description: "Login cotidiano usa e-mail/senha individual, falha neutra, limites global+e-mail e sessões absolutas de sete dias."
    requirement: ADMIN-01
    verification:
      - kind: integration
        ref: "convex/admin.test.ts#individual login, rate limit and seven day session"
        status: pass
    human_judgment: false
  - id: D2
    description: "Usuário e owner listam/revogam apenas sessões autorizadas; troca de senha mantém somente a sessão atual e owner troca e-mail com senha."
    requirement: ADMIN-01
    verification:
      - kind: integration
        ref: "convex/admin.test.ts#own session, revoke session, change password and owner email"
        status: pass
    human_judgment: false
  - id: D3
    description: "Minha conta reúne perfil, senha, e-mail owner, aparelhos e logout; o shell mostra nome/papel e o reducer bloqueia resultados tardios."
    requirement: ADMIN-02
    verification:
      - kind: unit
        ref: "src/lib/adminSession.test.ts#admin session reducer fail-closed lifecycle"
        status: pass
      - kind: other
        ref: "npm run build"
        status: pass
    human_judgment: false
duration: 10 min
completed: 2026-07-25
status: complete
---

# Phase 08 Plan 03: Individual Login, Sessions and Minha Conta Summary

**Login individual com scrypt, sessões multiaparelho revogáveis e Minha conta fail-closed integrada ao shell administrativo**

## Performance

- **Duration:** 10 min
- **Started:** 2026-07-25T16:28:55Z
- **Completed:** 2026-07-25T16:38:51Z
- **Tasks:** 3
- **Files modified:** 16

## Accomplishments

- Substituiu o acesso cotidiano por e-mail/senha individual, com normalização, KDF real/dummy, buckets global+e-mail, revalidação transacional e múltiplas sessões de sete dias.
- Entregou listagem e revogação self-or-owner sem expor tokens/hashes, troca de senha que mantém apenas a sessão atual e alteração protegida do e-mail owner.
- Criou Minha conta com perfil, credenciais, aparelhos e logout; nome/papel aparecem no shell e o principal nunca é persistido como autorização.
- Endureceu o reducer contra revogação cross-tab/servidor e respostas assíncronas tardias.

## Task Commits

1. **Task 1: Substituir login normal por credenciais individuais**
   - `68324cf` — RED: testes de login, enumeração, multi-device e race
   - `8e54c7b` — GREEN: action Node, finalizer versionado e formulário e-mail/senha
2. **Task 2: Implementar sessões próprias/globais e troca segura de senha**
   - `b5f3613` — RED: matriz self/owner, revogação, senha e e-mail
   - `aa04137` — GREEN: APIs de sessão/perfil e finalizers de credencial
3. **Task 3: Evoluir gate e criar Minha conta fail-closed**
   - `02ffc6f` — RED: principal em memória e barreira contra resultado tardio
   - `81b63cd` — GREEN: reducer, shell e Minha conta acessível
4. **Correção de regressão:** `0baa005` — copy individual sincronizada com o contrato de conteúdo

## Files Created/Modified

- `convex/adminAccounts.ts` — snapshots/finalizers de login, perfil, senha e e-mail owner.
- `convex/adminSessions.ts` — listagens allowlisted e revogação self-or-owner.
- `convex/adminAuthActions.ts` — actions Node públicas de login e alterações de credencial.
- `convex/adminAuth.ts` — status com principal mínimo e logout auditado.
- `convex/admin.test.ts` — integração de login, races, sessões e invariantes de credencial.
- `src/lib/adminSession.ts` — principal somente em memória e sequência fail-closed.
- `src/components/admin/AdminLogin.tsx` — formulário individual com autocomplete correto.
- `src/components/admin/AdminMyAccount.tsx` — perfil, senha, e-mail owner, sessões e logout.
- `src/components/admin/AdminShell.tsx` — identidade nome/papel e rota Minha conta.
- `src/routes/Admin.tsx` — action de login individual e propagação do principal.

## Decisions Made

- O `deviceLabel` é texto curto de apresentação (“navegador no celular/computador”), nunca fingerprint ou identidade de segurança.
- Sessões antigas ainda recebem um principal visual sintético enquanto o cutoff não ocorreu; continuam sujeitas à guarda backend e desaparecem imediatamente após `legacyDisabledAt`.
- Alterar a própria senha incrementa `credentialVersion`, atualiza apenas a sessão corrente e remove fisicamente as demais na mesma mutation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Integração mínima de Minha conta no shell**
- **Found during:** Task 3
- **Issue:** o plano listava `AdminMyAccount.tsx`, mas sem alterar `AdminShell.tsx` a tela não teria rota, identidade nome/papel nem entrada acessível.
- **Fix:** adicionada rota utilitária, link condicional e identidade no shell; a filtragem completa por papel permanece no plano 08-04.
- **Files modified:** `src/components/admin/AdminShell.tsx`, `src/content/admin.ts`
- **Verification:** reducer, build e suíte completa passaram.
- **Committed in:** `81b63cd`

**2. [Rule 1 - Bug] Copy legada de senha compartilhada**
- **Found during:** verificação completa pós-Task 3
- **Issue:** o teste de conteúdo ainda fixava “senha compartilhada”, contradizendo o login individual e falhando na suíte completa.
- **Fix:** copy e teste passaram a usar “Painel da festa” e e-mail/senha individual.
- **Files modified:** `src/content/admin.ts`, `src/content/admin.test.ts`
- **Verification:** 552 testes e build passaram.
- **Committed in:** `0baa005`

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug).
**Impact on plan:** mudanças estritamente necessárias para tornar a entrega navegável e manter a suíte coerente; RBAC completo continua reservado ao 08-04.

## Issues Encountered

- A suíte filtrada por tarefa não cobria a copy fixada em `src/content/admin.test.ts`; a execução completa identificou e fechou a regressão antes do resumo.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- O plano 08-04 pode aplicar a matriz RBAC às APIs operacionais e filtrar rotas/navegação usando o principal já entregue.
- O benchmark real de scrypt e os fluxos multi-browser continuam destinados ao Preview do plano 08-07.
- Alterações alheias em `src/components/admin/AdminOverview.tsx` e `src/content/event.ts` foram preservadas fora dos commits deste plano.

## Self-Check: PASSED

- Os três arquivos novos existem e todos os sete commits de código/teste estão no histórico.
- `npm test -- --run convex/admin.test.ts src/lib/adminSession.test.ts` passou com 87 testes.
- `npm test -- --run` passou com 552 testes.
- `npm run build` passou.

---
*Phase: 08-gest-o-de-gestores-contas-individuais-permiss-es-e-auditoria*
*Completed: 2026-07-25*
