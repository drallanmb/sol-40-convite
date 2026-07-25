---
phase: 08-gest-o-de-gestores-contas-individuais-permiss-es-e-auditoria
verified: 2026-07-25T18:10:52Z
status: human_needed
score: 29/31 must-haves verified
behavior_unverified: 2
behavior_unverified_items:
  - truth: "Owner, manager e seller têm jornadas reais, navegação, dados e ações coerentes em desktop/mobile."
    test: "Executar no Preview as jornadas autenticadas de Allan, Soraya/Guga e Vanessa, inclusive gestão de contas, Presentes e Auditoria."
    expected: "Cada papel entra no destino correto, vê somente suas áreas e conclui apenas as operações autorizadas em desktop e 320 px."
    why_human: "Os testes Playwright exercitam superfícies anônimas e políticas/fixtures, mas não autenticam os três papéis contra o deployment real."
  - truth: "Runtime Preview valida scrypt, cutoff legado, scheduler/retention e link copy/paste onde convex-test não é evidência suficiente."
    test: "Executar o smoke confirmado e os cenários de dois navegadores, replay de link e retenção descritos no runbook."
    expected: "Métricas scrypt sanitizadas, cutoff reativo, replay recusado e cleanup de 120 dias aprovados no runtime Convex real."
    why_human: "Somente o check-only sem writes foi executado; o usuário confirmou apenas que o login renderiza após sincronizar as functions."
decision_coverage:
  honored: 38
  total: 38
  not_honored: []
---

# Phase 8: Gestão de gestores — Verification Report

**Phase Goal:** Permitir que o administrador proprietário gerencie gestores com credenciais, permissões e sessões individuais, sem compartilhar a senha-mestra.
**Verified:** 2026-07-25T18:10:52Z
**Status:** human_needed

## Goal Achievement

### Observable Truths

| Plano | Truths | Status | Evidence |
|---|---:|---|---|
| 08-01 | 3/3 | ✓ VERIFIED | `adminAccountModel`, `adminPasswordActions`, `adminSecurity` e schema implementam papéis fixos, scrypt, principal autoritativo, versão de credencial e sessão absoluta; testes cobrem envelope, cutoff, colisão e limite N-1/N. |
| 08-02 | 4/4 | ✓ VERIFIED | Bootstrap, links one-time de 72 h, reset e recuperação mestra estão ligados por actions/finalizers; testes exercitam concorrência, expiração/replay, revogação total e cutoff atômico. |
| 08-03 | 5/5 | ✓ VERIFIED | Login individual, sessões múltiplas, troca/reset, owner email e Minha conta estão ligados ao Convex; testes exercitam login neutro, races, revogação e expiração sem sliding. |
| 08-04 | 5/5 | ✓ VERIFIED | Matriz owner/manager/seller é aplicada no backend e no shell; o teste integrado cria exatamente Soraya, Guga e Vanessa e valida lifecycle/invariantes. |
| 08-05 | 5/5 | ✓ VERIFIED | Seller confirma/edita/reabre presentes com ator derivado e CAS; DTO público negativo e copy “Já escolhido com carinho” são testados. |
| 08-06 | 5/5 | ✓ VERIFIED | Writers de auth/contas/sessões/RSVP/moderação/presentes chamam auditoria na mutation; filtros owner-only, redaction e fronteira lógica/física de 120 dias têm testes. |
| 08-07 | 2/4 | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Fail-closed/rollout e regressão ADMIN-01–06 têm evidência automatizada. Faltam jornadas autenticadas reais e probes runtime do Preview; o login visível é a única confirmação humana recebida. |

**Score:** 29/31 truths verified; 2 presentes e conectadas, mas sem a evidência de runtime exigida.

### Required Artifacts

| Grupo | Status | Details |
|---|---|---|
| Modelo, KDF e autorização | ✓ EXISTS + SUBSTANTIVE + WIRED | `convex/adminAccountModel.ts`, `adminPassword.ts`, `adminPasswordActions.ts`, `adminSecurity.ts` e `schema.ts` são usados pelos fluxos públicos e finalizers. |
| Bootstrap, links e migração | ✓ EXISTS + SUBSTANTIVE + WIRED | `adminBootstrap.ts`, `adminAccessLinks.ts`, `adminAccessLinkActions.ts` e superfícies `AdminSetup`/`AdminAccessLink` estão roteados antes do shell. |
| Login, contas e sessões | ✓ EXISTS + SUBSTANTIVE + WIRED | `adminAuthActions.ts`, `adminAuth.ts`, `adminAccounts.ts`, `adminSessions.ts`, `AdminLogin`, `AdminMyAccount` e `AdminManagers` usam APIs reais. |
| RBAC e shell | ✓ EXISTS + SUBSTANTIVE + WIRED | `src/content/admin.ts` define destinos; `AdminShell.tsx` evita montar queries/áreas proibidas e o backend exige capability. |
| Presentes | ✓ EXISTS + SUBSTANTIVE + WIRED | `wineOperations.ts`, `adminWines.ts` e `AdminGifts.tsx` implementam confirmar, corrigir e reabrir; `wines.ts` projeta DTO público explícito. |
| Auditoria | ✓ EXISTS + SUBSTANTIVE + WIRED | `adminAuditModel.ts`, `adminAudit.ts`, `adminInternal.ts`, `crons.ts` e `AdminAudit.tsx` cobrem append, filtros e retenção. |
| Preview e regressão | ✓ EXISTS + SUBSTANTIVE + WIRED | Fixtures/testes, smoke fail-closed e runbook existem; o modo destrutivo não foi executado nesta verificação. |

**Artifacts:** 24/24 descrições de artefato verificadas manualmente nos arquivos reais.

### Key Link Verification

| Link | Status | Details |
|---|---|---|
| Capability → sessão → conta/principal | ✓ WIRED | `requireAdminSession` consulta hash, exige unicidade, validade absoluta, conta ativa e `credentialVersion`. |
| Action Node → finalizer Web-runtime | ✓ WIRED | KDF fica nos módulos `"use node"`; finalizers realizam writes e auditoria transacional. |
| Principal → capability por endpoint | ✓ WIRED | Overview, RSVP, posts, wines, contas, sessões e auditoria revalidam a sessão no servidor. |
| Status → reducer → shell fail-closed | ✓ WIRED | `Admin.tsx` e `adminSession.ts` limpam estado/storage em revogação, expiração e respostas tardias. |
| Seller → Presentes → DTO público | ✓ WIRED | Ator vem do principal; mutation altera documento privado e query pública retorna somente campos allowlisted. |
| Writer de domínio → auditoria/retention | ✓ WIRED | Eventos são inseridos no mesmo contexto da mutation; `expiresAt` filtra leitura e agenda expiração/sweep. |
| Fixtures browser → runtime real | ⚠️ PARTIAL | Playwright valida UI anônima, policy e copy, mas não autentica owner/manager/seller no Preview. |
| Preview smoke → scrypt/scheduler | ⚠️ PARTIAL | `--check-only` prova trava de ambiente e zero writes; `--run --confirm-preview` ainda não tem evidência coletada. |

**Wiring:** 13/15 conexões plenamente verificadas; 2 dependem do checkpoint humano.

## Requirements Coverage

| Requirement | Status | Evidence |
|---|---|---|
| ADMIN-01 | ✓ SATISFIED | Autenticação individual é verificada no servidor; senha-mestra permanece apenas na recuperação isolada após cutoff. |
| ADMIN-02 | ✓ SATISFIED | Shell desktop/mobile, navegação por papel e fallback fail-closed compilam e passam Playwright. |
| ADMIN-03 | ✓ SATISFIED | Overview reativo continua protegido pela capability `overview`. |
| ADMIN-04 | ✓ SATISFIED | Operações de RSVP permanecem funcionais e agora exigem capability/auditoria. |
| ADMIN-05 | ✓ SATISFIED | Moderação permanece funcional e agora exige capability/auditoria. |
| ADMIN-06 | ✓ SATISFIED | Presentes foi ampliado para confirmação/edição/reabertura por seller ou papéis superiores. |

**Coverage:** 6/6 requisitos preservados.

## Behavioral Verification

| Check | Result | Detail |
|---|---|---|
| Vitest | ✓ | 31 arquivos, 581 testes aprovados. |
| Build | ✓ | `tsc -b && vite build` aprovado. |
| Playwright | ✓ | 80 testes aprovados em Chromium/WebKit desktop e 320 px. |
| Preview smoke `--check-only` | ✓ | `development`, `production:false`, `writesAttempted:0`, `status:"ready"`. |
| Login no Preview | ✓ HUMAN OBSERVED | Usuário confirmou que a tela de login aparece após sincronizar as functions; o fallback branco foi corrigido. |
| Preview smoke destrutivo/runtime | ? NEEDS HUMAN | Não executado; nenhuma evidência de p50/p95, cutoff, replay ou scheduler real foi fornecida. |

## Test Quality Audit

| Test File | Linked Req | Active | Skipped | Circular | Assertion Level | Verdict |
|---|---|---:|---:|---|---|---|
| `convex/admin.test.ts` | ADMIN-01–06, D-01–D-36 | 69+ | 0 | No | Behavioral/value, multi-step DB workflows | ✓ Strong |
| `convex/wines.test.ts` | ADMIN-06, D-23–D-28 | 17 | 0 | No | Value/negative serialization | ✓ Strong |
| `src/lib/adminSession.test.ts` | D-13–D-18 | 12 | 0 | No | Behavioral ordering/revocation | ✓ Strong |
| Admin component/content tests | ADMIN-02, D-27–D-38 | Active | 0 | No | Behavioral plus policy/value | ✓ Adequate |
| `tests/admin-*.spec.ts` | D-01–D-38 | 8 | 0 | No | Mostly policy/static and anonymous-browser assertions | ⚠️ Insufficient alone for authenticated role journeys |
| `tests/release.spec.ts` | ADMIN-02, safety | Active | 0 | No | Browser behavior and process exit | ✓ Adequate |

**Disabled requirement tests:** 0.  
**Circular fixture generation:** 0.  
**Insufficient assertions:** the Phase 8 Playwright files name broad decision ranges but do not themselves exercise authenticated real-role workflows; backend integration tests cover the domain rules, while Preview journeys remain human verification.

## Anti-Patterns Found

No `TBD`, `FIXME`, `XXX`, `TODO`, `HACK`, placeholder content, trivial empty returns, skipped tests or fixture-writing circular tests were found in the Phase 8 product/test files changed since planning.

The unrelated dirty redesign files (`.impeccable/design.json`, `DESIGN.md`, `README.md`, `AdminOverview*`, `src/content/event.ts`) were excluded from this verification.

## Prohibition Review

All 21 string-form prohibitions from the plans were checked against implementation and tests. No evidence was found of fast/plaintext password persistence, browser-authoritative roles, sliding sessions, leaked access links/session secrets, parallel master-password login, extra roles/owners, seller access outside Presentes, billing data, private wine fields in public DTOs, non-transactional success audit, audit of reads, destructive Production smoke, or secrets in evidence.

## Human Verification Required

Follow `docs/phase-08-preview-runbook.md` without recording secrets:

1. **Scrypt real:** execute the confirmed Preview smoke and compare p50/p95 de senha correta/incorreta com a UI.
2. **Cutoff e sessões:** usar dois navegadores para provar queda reativa da sessão legada e revogação de somente um aparelho individual.
3. **Link one-time:** ativar/resetar por copy/paste privado, confirmar remoção do token da URL e rejeição de replay.
4. **Retenção:** executar o handler/scheduler real e confirmar a fronteira e cleanup de 120 dias.
5. **Contas iniciais:** criar/ativar Soraya, Guga e Vanessa com os e-mails e papéis decididos.
6. **Jornada Vanessa:** entrar direto em Presentes, confirmar/editar/reabrir uma garrafa e validar o reflexo público sem dados privados.
7. **Acessibilidade autenticada:** percorrer Login, Ativação, Gestores, Minha conta, Presentes e Auditoria com teclado/axe em desktop e 320 px.

## Gaps Summary

**No implementation gaps found.** O código, testes e build estão verdes, mas a fase não pode receber `passed` enquanto os dois must-haves de runtime/jornada real permanecerem sem evidência. O status correto é `human_needed`.

## Decision Coverage

All trackable CONTEXT.md decisions are honored by shipped artifacts.

**Coverage:** 38/38 decisions honored; nenhuma decisão marcada como não honrada.

## Verification Metadata

**Verification approach:** Goal-backward, com inspeção independente de código, wiring, testes e runtime seguro.  
**Must-haves source:** frontmatter dos sete `08-XX-PLAN.md`.  
**Automated checks:** 581 Vitest + 80 Playwright + build + smoke check-only aprovados.  
**Human checks required:** 7 cenários, agrupados em 2 truths behavior-unverified.  
**Overrides applied:** 0.  
**Deferred items:** nenhum — não existe fase posterior no milestone.  

---
*Verified: 2026-07-25T18:10:52Z*
*Verifier: Codex (gsd-verifier subagent)*
