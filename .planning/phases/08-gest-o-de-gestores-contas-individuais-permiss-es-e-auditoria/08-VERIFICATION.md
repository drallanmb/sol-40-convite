---
phase: 08-gest-o-de-gestores-contas-individuais-permiss-es-e-auditoria
verified: 2026-07-26T14:36:13Z
status: human_needed
score: 42/43 must-haves verified
behavior_unverified: 1
behavior_unverified_items:
  - truth: "O link canônico abre e conclui no WebView real do WhatsApp."
    test: "Gerar um link novo depois do deploy, enviá-lo por WhatsApp, abrir em aparelho real, concluir e tentar replay."
    expected: "A âncora com fragmento abre a tela válida, conclui sem reload e o replay é recusado."
    why_human: "Chromium/WebKit em viewport mobile não reproduzem integralmente o WebView, compartilhamento e políticas do aplicativo WhatsApp."
decision_coverage:
  honored: 38
  total: 38
  not_honored: []
---

# Phase 8: Gestão de gestores — Verification Report

**Phase Goal:** Permitir que o administrador proprietário gerencie gestores com credenciais, permissões e sessões individuais, sem compartilhar a senha-mestra.
**Verified:** 2026-07-26T14:36:13Z
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
| 08-07 | 4/4 | ✓ VERIFIED | Fail-closed/rollout e regressão ADMIN-01–06 têm evidência automatizada; as sete jornadas Preview foram concluídas em `08-UAT.md`. |
| 08-08 | 6/6 | ✓ VERIFIED | Fragmento/header, reset fail-closed, CAS monotônico, rate limit pré-KDF, status compartilhado e expiração agendada com sweep de recuperação têm regressões. |
| 08-09 | 5/6 | ⚠️ HUMAN_NEEDED | UI reativa, clipboard, loading/offline, conclusão e cobertura mobile automatizada estão verdes; resta o WebView real do WhatsApp. |

**Score:** 42/43 truths verified; a implementação está completa e uma
integração em aparelho real permanece pendente.

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
| Hardening de links | ✓ EXISTS + SUBSTANTIVE + WIRED | Geração/recovery usam CAS e invalidação atômica; tentativa válida passa por limits antes do KDF; cada expiração é agendada e o cron mantém sweep de recuperação. |
| Operação mobile | ✓ EXISTS + SUBSTANTIVE + WIRED | Builder/parser, `AdminManagers`, `AdminSetup` e `AdminAccessLink` usam fragmento canônico, validação reativa e feedback assíncrono coberto. |

**Artifacts:** 32/32 descrições de artefato verificadas manualmente nos arquivos reais.

### Key Link Verification

| Link | Status | Details |
|---|---|---|
| Capability → sessão → conta/principal | ✓ WIRED | `requireAdminSession` consulta hash, exige unicidade, validade absoluta, conta ativa e `credentialVersion`. |
| Action Node → finalizer Web-runtime | ✓ WIRED | KDF fica nos módulos `"use node"`; finalizers realizam writes e auditoria transacional. |
| Principal → capability por endpoint | ✓ WIRED | Overview, RSVP, posts, wines, contas, sessões e auditoria revalidam a sessão no servidor. |
| Status → reducer → shell fail-closed | ✓ WIRED | `Admin.tsx` e `adminSession.ts` limpam estado/storage em revogação, expiração e respostas tardias. |
| Seller → Presentes → DTO público | ✓ WIRED | Ator vem do principal; mutation altera documento privado e query pública retorna somente campos allowlisted. |
| Writer de domínio → auditoria/retention | ✓ WIRED | Eventos são inseridos no mesmo contexto da mutation; `expiresAt` filtra leitura e agenda expiração/sweep. |
| Fixtures browser → runtime real | ✓ WIRED | Playwright cobre superfícies e políticas; `08-UAT.md` registra as jornadas autenticadas reais por papel no Preview. |
| Preview smoke → scrypt/scheduler | ✓ WIRED | O guard `--check-only` e o smoke confirmado foram validados; scrypt, cutoff, replay e retenção passaram no Preview. |
| Fragmento → parser síncrono → status | ✓ WIRED | Link novo não participa da requisição inicial; fragmento/query legada são removidos antes do mount e o formulário só aparece depois de status válido. |
| Snapshot válido → limiter → KDF → finalizer | ✓ WIRED | Token desconhecido falha barato; capabilities válidas consomem buckets global/hash antes de qualquer scrypt. |
| Geração → CAS → expiração reativa | ✓ WIRED | `updatedAt` é monotônico em emissão/consumo; cada link agenda deleção idempotente no TTL e o sweep diário cobre órfãos. |

**Wiring:** 21/21 conexões verificadas.

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
| Vitest | ✓ | 36 arquivos, 637 testes aprovados. |
| Build | ✓ | `tsc -b && vite build` aprovado. |
| Playwright | ✓ | 120 testes aprovados em Chromium/WebKit desktop e 320 px. |
| Preview smoke `--check-only` | ✓ | `development`, `production:false`, `writesAttempted:0`, `status:"ready"`. |
| Login no Preview | ✓ HUMAN OBSERVED | Usuário confirmou que a tela de login aparece após sincronizar as functions; o fallback branco foi corrigido. |
| Preview smoke confirmado/runtime | ✓ UAT | Scrypt, cutoff/sessões, link one-time e retenção passaram conforme `08-UAT.md`. |
| Jornadas autenticadas | ✓ UAT | Contas iniciais, jornada seller e acessibilidade autenticada passaram em 7/7 cenários. |
| Link mobile/WhatsApp | ? NEEDS HUMAN | Emulação 320 px, request/Referer e componentes passaram; falta abrir e concluir no WebView real. |

## Test Quality Audit

| Test File | Linked Req | Active | Skipped | Circular | Assertion Level | Verdict |
|---|---|---:|---:|---|---|---|
| `convex/admin.test.ts` | ADMIN-01–06, D-01–D-36 | 93 | 0 | No | Behavioral/value, multi-step DB workflows | ✓ Strong |
| `convex/wines.test.ts` | ADMIN-06, D-23–D-28 | 17 | 0 | No | Value/negative serialization | ✓ Strong |
| `src/lib/adminSession.test.ts` | D-13–D-18 | 12 | 0 | No | Behavioral ordering/revocation | ✓ Strong |
| Admin component/content tests | ADMIN-02, D-27–D-38 | Active | 0 | No | Behavioral plus policy/value | ✓ Adequate |
| `AdminManagers.test.tsx`, `AdminSetup.test.tsx`, `AdminAccessLink.test.tsx` | link mobile | 18 | 0 | No | Estados assíncronos, validação reativa e limpeza de segredo | ✓ Strong |
| `tests/admin-*.spec.ts` | D-01–D-38 | 8 | 0 | No | Mostly policy/static and anonymous-browser assertions | ⚠️ Insufficient alone for authenticated role journeys |
| `tests/release.spec.ts` | ADMIN-02, safety | Active | 0 | No | Browser behavior and process exit | ✓ Adequate |

**Disabled requirement tests:** 0.  
**Circular fixture generation:** 0.  
**Insufficient assertions:** the Phase 8 Playwright files name broad decision ranges but do not themselves exercise authenticated real-role workflows; backend integration tests cover the domain rules, while Preview journeys remain human verification.

## Anti-Patterns Found

No `TBD`, `FIXME`, `XXX`, `TODO`, `HACK`, placeholder content, trivial empty returns, skipped tests or fixture-writing circular tests were found in the Phase 8 product/test files changed since planning.

The unrelated dirty redesign files (`.impeccable/design.json`, `DESIGN.md`, `README.md`, `AdminOverview*`, `src/content/event.ts`) were excluded from this verification.

## Prohibition Review

All 27 string-form prohibitions from the plans were checked against implementation and tests. No evidence was found of fast/plaintext password persistence, browser-authoritative roles, sliding sessions, leaked access links/session secrets, parallel master-password login, extra roles/owners, seller access outside Presentes, billing data, private wine fields in public DTOs, non-transactional success audit, audit of reads, destructive Production smoke, KDF before rate limit, stale links compartilháveis, false clipboard success, or secrets in evidence.

## Human Verification

Os sete cenários do runbook foram concluídos e registrados em `08-UAT.md`:
scrypt real, cutoff/sessões, link one-time, retenção, contas iniciais, jornada
da Vanessa e acessibilidade autenticada.

Depois do incidente de 2026-07-26, uma integração adicional permanece:
enviar um link gerado pela versão corrigida, abri-lo e concluí-lo no WebView
real do WhatsApp, então confirmar que replay e link invalidado falham.

## Gaps Summary

Em 2026-07-25 a verificação declarou zero gaps. O incidente mobile de
2026-07-26 revelou 13 gaps de segurança, concorrência, UI e cobertura; os
planos 08-08/08-09 os fecharam e uma revisão adversarial adicional corrigiu
DoS por tokens aleatórios, expiração não reativa e revisão CAS regressiva.

**Não há gap de implementação aberto.** O status correto é `human_needed`
somente pela observação no WebView real.

## Decision Coverage

All trackable CONTEXT.md decisions are honored by shipped artifacts.

**Coverage:** 38/38 decisions honored; nenhuma decisão marcada como não honrada.

## Verification Metadata

**Verification approach:** Goal-backward, com inspeção independente de código, wiring, testes e runtime seguro.  
**Must-haves source:** frontmatter dos nove `08-XX-PLAN.md`.
**Automated checks:** 637 Vitest + 120 Playwright + build + codegen + smoke check-only aprovados.
**Human checks:** 7 cenários anteriores aprovados; 1 reteste WhatsApp pendente.
**Overrides applied:** 0.  
**Deferred items:** somente o reteste em aparelho real descrito em `08-UAT.md`.

---
*Verified: 2026-07-26T14:36:13Z*
*Verifier: Codex (gsd-verifier subagent)*
