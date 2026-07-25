---
phase: 08-gest-o-de-gestores-contas-individuais-permiss-es-e-auditoria
plan: "01"
subsystem: auth
tags: [convex, rbac, scrypt, sessions, audit]

requires:
  - phase: 06-dashboard-interno-admin
    provides: capability administrativa opaca, sessão absoluta de sete dias e guarda central
provides:
  - contas administrativas canônicas com três papéis fixos
  - sessões ligadas a conta e versão de credencial com cutoff legado
  - política de senha e envelope scrypt versionado em runtime Node isolado
  - primitiva transacional de auditoria com vocabulário fechado e redaction
affects: [08-02, 08-03, 08-04, 08-05, 08-06]

tech-stack:
  added: []
  patterns:
    - action Node exclusiva para KDF e helpers puros no runtime Web
    - principal administrativo derivado da conta autoritativa em toda chamada
    - auditoria redigida dentro da mesma mutation do domínio

key-files:
  created:
    - convex/adminAccountModel.ts
    - convex/adminPassword.ts
    - convex/adminPasswordActions.ts
    - convex/adminAuditModel.ts
  modified:
    - convex/schema.ts
    - convex/adminSecurity.ts
    - convex/admin.test.ts

key-decisions:
  - "Sessões legadas recebem principal sintético somente enquanto legacyDisabledAt estiver ausente; a conta individual é a única identidade persistente nova."
  - "A KDF usa scrypt N=2^17, r=8, p=1, salt de 16 bytes, chave de 32 bytes e maxmem explícito de 256 MiB."
  - "O append de auditoria reaplica redaction estrutural mesmo quando recebe changes já montados pelo chamador."

patterns-established:
  - "Guard account-backed: token -> sessão -> conta ativa -> credentialVersion -> AdminPrincipal."
  - "Node boundary: adminPasswordActions exporta somente internalAction; parser e política continuam puros."
  - "Audit deny-by-default: somente escalares allowlisted e campos não secretos são persistidos."

requirements-completed:
  - ADMIN-01
  - ADMIN-03
  - ADMIN-04
  - ADMIN-05
  - ADMIN-06

coverage:
  - id: D1
    description: "Conta ativa e sessão versionada resolvem um AdminPrincipal numa query administrativa real; estados, versões, duplicatas, expiry e cutoff inválidos falham fechados."
    requirement: ADMIN-01
    verification:
      - kind: integration
        ref: "convex/admin.test.ts#admin authorization boundary"
        status: pass
      - kind: other
        ref: "npm test -- --run convex/admin.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "Auditoria mínima persiste ator derivado e diff limitado sem senha, token, hash ou link."
    requirement: ADMIN-06
    verification:
      - kind: integration
        ref: "convex/admin.test.ts#admin audit model"
        status: pass
    human_judgment: false
  - id: D3
    description: "Senhas humanas usam política NFC de 15–128 code points e envelope scrypt versionado com salt aleatório e parser allowlisted."
    requirement: ADMIN-01
    verification:
      - kind: integration
        ref: "convex/admin.test.ts#admin password policy and scrypt envelope"
        status: pass
      - kind: other
        ref: "npm test -- --run convex/admin.test.ts -t \"password|scrypt|email\""
        status: pass
    human_judgment: false
  - id: D4
    description: "Schema aditivo preserva sessões legadas sem editar artefatos gerados manualmente."
    requirement: ADMIN-05
    verification:
      - kind: other
        ref: "npm run build"
        status: pass
      - kind: other
        ref: "! git diff --name-only f00860e..HEAD | rg '^convex/_generated/'"
        status: pass
    human_judgment: false

duration: 4 min
completed: 2026-07-25
status: complete
---

# Phase 08 Plan 01: Núcleo de contas, KDF e autorização Summary

**Contas administrativas versionadas, guarda fail-closed, KDF scrypt Node e auditoria redigida formam o núcleo seguro para os fluxos individuais da fase.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-25T16:12:31Z
- **Completed:** 2026-07-25T16:16:09Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Adicionou o modelo canônico `owner | manager | seller`, matriz fixa de capacidades e schema aditivo para contas, configuração de auth, auditoria e vínculo opcional das sessões.
- Evoluiu a guarda única para reler conta, estado, papel e versão de credencial, preservando o legado apenas antes do cutoff explícito e sem renovar o TTL.
- Isolou `scrypt` no runtime Node com envelope estrito, salt aleatório, comparação timing-safe e política Unicode testável.
- Criou o vocabulário e o append mínimo de auditoria com ator derivado no backend, diff limitado e redaction reaplicada antes do insert.

## Task Commits

Cada task foi executada em ciclo TDD e seus commits são atômicos:

1. **Task 1 RED: tracer de conta, sessão, principal e auditoria** — `708efaf` (test)
2. **Task 1 GREEN: principal account-backed e auditoria mínima** — `ab87ce1` (feat)
3. **Task 2 RED: vetores de política e scrypt** — `8f81bdb` (test)
4. **Task 2 GREEN: KDF scrypt versionada em Node** — `ad8fc01` (feat)

## Files Created/Modified

- `convex/adminAccountModel.ts` — papéis, estados, normalização, principal e matriz de capacidades.
- `convex/adminPassword.ts` — política NFC, parser estrito e decisão de rehash puros.
- `convex/adminPasswordActions.ts` — hash, verificação e rehash scrypt em internal actions Node.
- `convex/adminAuditModel.ts` — vocabulário, diff/redaction e append atômico de eventos.
- `convex/schema.ts` — tabelas aditivas e vínculo opcional das sessões a contas.
- `convex/adminSecurity.ts` — resolução autoritativa de conta/principal e cutoff legado.
- `convex/admin.test.ts` — tracer integrado, matriz base, redaction e vetores de KDF.

## Decisions Made

- O legado permanece uma variante transitória de sessão, representada por um principal sintético e negada globalmente assim que `legacyDisabledAt` existir.
- O parser aceita somente o envelope exato da política atual antes de qualquer `scrypt`, impedindo custo controlado por dados persistidos maliciosos.
- A auditoria não confia que o chamador já redigiu o diff; o append aplica novamente a denylist estrutural.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Um nome sombreado no primeiro teste de auditoria causou uma falha local durante GREEN; foi corrigido antes do commit da task e toda a suíte foi reexecutada.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

O plano 08-02 pode construir links, bootstrap, ativação e recuperação sobre o schema, o principal, a KDF e o append de auditoria agora disponíveis. O benchmark real de scrypt continua corretamente reservado ao checkpoint Preview do plano 08-07.

## Self-Check: PASSED

- Quatro arquivos-chave criados e presentes.
- Quatro commits TDD do plano encontrados no histórico.
- `npm test -- --run convex/admin.test.ts`: 54/54 testes passaram.
- Verificação focada de password/scrypt/email: 6 testes passaram.
- `npm run build`: passou.
- Nenhum arquivo em `convex/_generated/` foi editado manualmente.

---
*Phase: 08-gest-o-de-gestores-contas-individuais-permiss-es-e-auditoria*
*Completed: 2026-07-25*
