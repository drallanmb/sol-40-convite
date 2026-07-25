---
phase: 08-gest-o-de-gestores-contas-individuais-permiss-es-e-auditoria
plan: "02"
subsystem: auth
tags: [convex, scrypt, capability, bootstrap, react]
requires:
  - phase: 08-01
    provides: account-backed principals, scrypt envelopes and redacted audit events
provides:
  - One-time activation and reset capabilities with strict 72-hour expiry
  - Singleton Allan owner bootstrap with atomic legacy-session cutoff
  - Owner-only master recovery and token-scoped setup/reset screens
affects: [08-03, 08-04, 08-06, 08-07]
tech-stack:
  added: []
  patterns:
    - Node actions perform secret work and call one Web-runtime transactional finalizer
    - URL capabilities are consumed into memory and immediately removed with replaceState
key-files:
  created:
    - convex/adminAccessLinks.ts
    - convex/adminAccessLinkActions.ts
    - convex/adminBootstrap.ts
    - convex/adminAuthActions.ts
    - src/components/admin/AdminSetup.tsx
    - src/components/admin/AdminAccessLink.tsx
  modified:
    - convex/schema.ts
    - convex/adminAuth.ts
    - convex/adminInternal.ts
    - convex/adminRateLimits.ts
    - src/routes/Admin.tsx
    - src/lib/adminSession.ts
key-decisions:
  - "A configuração pendente pode invalidar e regenerar o link inicial com a senha-mestra, sem criar outro owner."
  - "Actions Node referenciam finalizers por makeFunctionReference para manter o codegen sem ciclos de tipo."
patterns-established:
  - "Capability finalizer: snapshot antes do KDF e revalidação de link, purpose, versão, estado e TTL na mutation final."
  - "Secret route isolation: ativação, reset, bootstrap e recuperação retornam antes de montar o shell protegido."
requirements-completed: [ADMIN-01, ADMIN-02]
coverage:
  - id: D1
    description: "Links de ativação/reset são purpose-bound, single-use, revogáveis e expiram estritamente em 72 horas."
    requirement: ADMIN-01
    verification:
      - kind: integration
        ref: "convex/admin.test.ts#admin access link activation and reset"
        status: pass
    human_judgment: false
  - id: D2
    description: "Bootstrap promove somente Allan e corta sessões legadas no commit da ativação; master recovery só redefine o owner."
    requirement: ADMIN-01
    verification:
      - kind: integration
        ref: "convex/admin.test.ts#admin bootstrap, legacy cutoff and master recovery"
        status: pass
    human_judgment: false
  - id: D3
    description: "Telas públicas removem token/query da URL e não persistem a capability no storage."
    requirement: ADMIN-02
    verification:
      - kind: unit
        ref: "src/lib/adminSession.test.ts#admin activation and reset URL privacy"
        status: pass
      - kind: other
        ref: "npm run build"
        status: pass
    human_judgment: false
duration: 9 min
completed: 2026-07-25
status: complete
---

# Phase 08 Plan 02: Bootstrap, Links and Migration Summary

**Capabilities scrypt one-time, bootstrap singleton de Allan, cutoff lógico do legado e recuperação mestra isolada em telas públicas sem persistência de token**

## Performance

- **Duration:** 9 min
- **Started:** 2026-07-25T16:19:28Z
- **Completed:** 2026-07-25T16:27:45Z
- **Tasks:** 3
- **Files modified:** 16

## Accomplishments

- Entregou activation/reset de 72 horas com hash no banco, purpose binding, replay/concurrency protection, regeneração e finalizer transacional.
- Criou exatamente uma conta owner de Allan, manteve legado antes da ativação e aplicou `legacyDisabledAt`/`bootstrapCompletedAt` junto com a ativação.
- Isolou recuperação mestra ao `ownerAccountId`, revogou todas as sessões e retornou somente a nova capability de reset.
- Adicionou `/admin/configurar`, `/admin/ativar`, `/admin/redefinir` e `/admin/recuperar-proprietario` antes do shell, com confirmação acessível de senha e sanitização da URL.

## Task Commits

1. **Task 1: Criar capabilities one-time e finalizers de ativação/reset**
   - `5ec6bd1` — RED: testes de lifecycle dos links
   - `58bc67d` — GREEN: links e finalizers atômicos
2. **Task 2: Promover bootstrap legado e isolar recuperação mestra**
   - `32ebc50` — RED: testes de bootstrap/cutoff/recovery
   - `4d7b120` — GREEN: bootstrap singleton e recuperação owner-only
3. **Task 3: Construir telas token-scoped sem persistir segredos**
   - `eaf0da9` — RED: testes de privacidade da URL/storage
   - `5677e13` — GREEN: telas isoladas e sanitização

## Files Created/Modified

- `convex/adminAccessLinks.ts` — status público mínimo, snapshots e finalizer Web-runtime.
- `convex/adminAccessLinkActions.ts` — criação/consumo e KDF em action Node.
- `convex/adminBootstrap.ts` — singleton, regeneração inicial, master recovery e writes atômicos.
- `convex/adminAuthActions.ts` — comparação da senha-mestra e capabilities CSPRNG.
- `convex/adminAuth.ts` — desativa login compartilhado após o cutoff.
- `convex/adminInternal.ts` — purge paginado e idempotente das sessões legadas.
- `src/components/admin/AdminSetup.tsx` — configuração/recuperação com link mostrado uma única vez.
- `src/components/admin/AdminAccessLink.tsx` — ativação/reset com senha confirmada e token somente em memória.
- `src/routes/Admin.tsx` — superfícies secretas roteadas antes do shell.
- `src/lib/adminSession.ts` — extração e remoção imediata da query string.

## Decisions Made

- A chamada concorrente de bootstrap nunca reexibe ou substitui a capability vencedora; regeneração é uma ação explícita posterior autenticada pela senha-mestra.
- A barreira `legacyDisabledAt` é a revogação autoritativa; o purge físico é somente higiene paginada.
- Recuperação mestra não aceita e-mail/accountId alvo e não emite sessão nem consulta dados operacionais.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Recuperação de link inicial perdido**
- **Found during:** Task 3
- **Issue:** um bootstrap já pendente não podia reexibir o segredo (correto), mas também não possuía caminho para invalidar o link perdido antes da primeira ativação.
- **Fix:** adicionada regeneração explícita, rate-limited e autenticada pela senha-mestra, que revoga links pendentes sem criar outro owner.
- **Files modified:** `convex/adminBootstrap.ts`, `convex/adminAuthActions.ts`, `src/components/admin/AdminSetup.tsx`, `src/routes/Admin.tsx`
- **Verification:** codegen/typecheck, suíte integrada e build passaram.
- **Committed in:** `5677e13`

**2. [Rule 3 - Blocking] Ciclo de tipos no codegen das actions Node**
- **Found during:** Task 3
- **Issue:** importar `internal` gerado dentro dos novos módulos que também compõem `api.d.ts` criou referências circulares no typecheck oficial do Convex.
- **Fix:** finalizers passaram a usar `makeFunctionReference`; o parser scrypt foi ajustado à lib ES2021 declarada pelo backend.
- **Files modified:** `convex/adminAccessLinkActions.ts`, `convex/adminAuthActions.ts`, `convex/adminInternal.ts`, `convex/adminPassword.ts`, `convex/_generated/api.d.ts`
- **Verification:** `npx convex codegen --typecheck enable` passou.
- **Committed in:** `5677e13`

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 blocking).
**Impact on plan:** ambos fecham caminhos necessários de recuperação e validação sem ampliar papéis, dados ou superfícies operacionais.

## Issues Encountered

- A primeira execução do codegen expôs o ciclo de tipos e a incompatibilidade de `String.at` com a lib ES2021 do backend; ambos foram corrigidos e o codegen subsequente passou.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Login individual, Minha conta e sessões podem consumir as contas, versões e finalizers entregues aqui.
- Benchmark real do scrypt e testes de cutoff multi-browser permanecem para o Preview do plano 08-07, como planejado.

## Self-Check: PASSED

- Todos os seis arquivos principais criados existem.
- Os seis commits RED/GREEN existem no histórico.
- `npm test -- --run convex/admin.test.ts src/lib/adminSession.test.ts` passou com 79 testes.
- `npm run build` passou.

---
*Phase: 08-gest-o-de-gestores-contas-individuais-permiss-es-e-auditoria*
*Completed: 2026-07-25*
