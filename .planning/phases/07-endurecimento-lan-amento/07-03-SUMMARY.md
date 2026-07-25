---
phase: 07-endurecimento-lan-amento
plan: 03
subsystem: production-infrastructure
tags: [vercel, convex, preview, production, backup, admin-auth, rollback]

requires:
  - phase: 07-endurecimento-lan-amento
    plan: 02
    provides: Gate Playwright/axe, metadados canônicos e runbooks de lançamento
  - phase: 06-dashboard-interno-admin
    provides: Sessão administrativa opaca, login/logout e queries protegidas fail-closed
provides:
  - Projeto Vercel ligado ao repositório com Preview e Production em deployments Convex distintos
  - Production Convex com ADMIN_PASSWORD server-only e login/logout funcional
  - Backup Production externo, concluído e checksummed antes da primeira mutação material
  - Gate C verde no `.vercel.app` e registro composto de rollback
affects: [07-04, 07-05, production-domain, guest-disclosure, incident-response]

tech-stack:
  added: []
  patterns:
    - CONVEX_DEPLOY_KEY existe somente nos escopos Vercel correspondentes e VITE_CONVEX_URL é injetada pelo build Convex
    - Segredo administrativo é consumido em processo efêmero sem arquivo, argumento, trace, screenshot ou evidência
    - Rollback registra frontend, functions/schema, env e dados como camadas independentes
    - Backup externo precede qualquer importação real ou mutação material de produção

key-files:
  created:
    - .vercel/project.json
  modified:
    - .planning/phases/07-endurecimento-lan-amento/07-LAUNCH-CHECKLIST.md
    - .planning/phases/07-endurecimento-lan-amento/07-SMOKE.md
    - .planning/phases/07-endurecimento-lan-amento/07-ROLLBACK.md

key-decisions:
  - "Deployments vinculados ao projeto Convex incorreto foram rejeitados e nunca registrados como alvos de rollback."
  - "A senha Production permanece somente no Convex e no Chaveiro do dono; a prova versionada limita-se ao nome, ao login/logout e ao resultado sanitizado."
  - "O Gate C não provocou stress de rate limit nem escrita fictícia; contratos recuperáveis foram auditados por testes e uma tentativa válida de login."
  - "Rollback Vercel não implica rollback de functions, schema, env, scheduled work, storage ou dados Convex."

patterns-established:
  - "Tracer externo: commit -> deployment Vercel -> bundle -> deployment Convex -> smoke live."
  - "Evidência secret-safe: identificadores públicos, contagens, timestamps e checksum; nunca valores ou payloads."

requirements-completed: []

coverage:
  - id: D1
    description: "Preview e Production usam deployments Convex distintos por chaves Vercel de escopo correspondente, sem VITE_CONVEX_URL manual."
    requirement: LAUNCH-03
    verification:
      - kind: automated_ui
        ref: "PLAYWRIGHT_BASE_URL=Preview npm run test:browser#40/40"
        status: pass
      - kind: other
        ref: "Production bundle inspection#necessary-coyote-763 present and Preview targets absent"
        status: pass
      - kind: manual_procedural
        ref: "07-LAUNCH-CHECKLIST.md#Tracer Vercel/Convex do Gate B"
        status: pass
    human_judgment: true
    rationale: "Os valores das deploy keys são deliberadamente inacessíveis à evidência; o escopo é provado por console autenticado, logs de build e comportamento dos deployments."
  - id: D2
    description: "Backup Production com storage foi concluído fora do repositório e checksummed antes da primeira mutação material."
    requirement: LAUNCH-03
    verification:
      - kind: manual_procedural
        ref: "07-LAUNCH-CHECKLIST.md#Backup anterior à primeira mutação em produção"
        status: pass
      - kind: other
        ref: "workspace/tracked artifact scans#no backup or secret artifact"
        status: pass
    human_judgment: true
    rationale: "O ZIP permanece intencionalmente fora do workspace e não é aberto; somente metadados e checksum podem ser auditados no repositório."
  - id: D3
    description: "Production `.vercel.app` serve rotas profundas, aponta ao Convex Production e não monta domínio administrativo antes da autenticação."
    requirement: LAUNCH-04
    verification:
      - kind: automated_ui
        ref: "PLAYWRIGHT_BASE_URL=Production npm run test:browser#40/40"
        status: pass
      - kind: integration
        ref: "six-route HTTP probe#all status 200"
        status: pass
      - kind: integration
        ref: "tests/release.spec.ts#anonymous admin mounts no protected DOM or domain query"
        status: pass
    human_judgment: false
  - id: D4
    description: "ADMIN_PASSWORD está presente somente por nome e login/logout real funciona sem captura de credencial ou capability."
    requirement: LAUNCH-03
    verification:
      - kind: manual_procedural
        ref: "ephemeral Keychain-to-Production login/logout#pass"
        status: pass
      - kind: other
        ref: "npx convex env list --names-only --prod#ADMIN_PASSWORD"
        status: pass
      - kind: other
        ref: "sanitized Convex/Vercel/browser logs#no current high-severity error"
        status: pass
    human_judgment: true
    rationale: "A prova funcional não gera trace, screenshot ou arquivo por exigência de segurança; a sessão foi revogada imediatamente após a verificação."
  - id: D5
    description: "Rollback registra separadamente frontend, Convex, env e backup, excluindo deployments incorretos."
    requirement: LAUNCH-04
    verification:
      - kind: other
        ref: "07-ROLLBACK.md#Registro de alvos saudáveis"
        status: pass
      - kind: other
        ref: "rg gate#healthy Vercel/Convex IDs, env inventory, backup checksum and layer warning"
        status: pass
    human_judgment: false

duration: 55min
completed: 2026-07-25
status: complete
---

# Phase 7 Plan 3: Isolated Production Release Summary

**Preview e Production isolados no Vercel/Convex, backup externo anterior aos dados e Gate C verde com login real e rollback composto**

## Performance

- **Duration:** 55 min
- **Started:** 2026-07-25T12:00:36Z
- **Completed:** 2026-07-25T12:55:54Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Ligou o checkout ao projeto Vercel correto e provou Preview
  `wooden-hound-372` distinto de Development e Production.
- Configurou Production `necessary-coyote-763`, confirmou somente o nome
  `ADMIN_PASSWORD` e preservou a senha fora de git, `.env`, argumentos e
  evidências.
- Gerou backup Production com storage fora do repositório antes da primeira
  mutação, registrando timestamp e SHA-256 sem abrir o conteúdo.
- Passou 40/40 testes live-safe no Preview e 40/40 no Production, além de seis
  rotas HTTP, vínculo estático do bundle e privacidade administrativa pré-auth.
- Executou login/logout real com leitura única do Chaveiro em processo efêmero
  e registrou logs sanitizados sem erro atual de alta severidade.
- Promoveu Vercel, Convex, env e backup de candidatos a alvos saudáveis
  independentes, mantendo deployments incorretos explicitamente inelegíveis.

## Task Commits

1. **Task 1: Linkar projeto e provar tracer Preview** — `678bf4c` (chore)
2. **Task 2: Publicar Production isolada e criar backup** — `92f57c3` (chore)
3. **Task 3: Passar Gate C e registrar rollback composto** — `c71b3e9` (chore)

## Files Created/Modified

- `.vercel/project.json` — vínculo local não secreto ao time/projeto Vercel
  pretendido.
- `07-LAUNCH-CHECKLIST.md` — Gates A/B/C, deployments, backup e restrições de
  divulgação.
- `07-SMOKE.md` — execuções Preview/Production, casos live-safe, login, logs e
  rate limits.
- `07-ROLLBACK.md` — alvos saudáveis por camada e exclusão dos deployments
  ligados ao projeto Convex incorreto.

## Decisions Made

- A primeira dupla de deployments revelou vínculo com outro projeto Convex;
  ambos foram substituídos e marcados como não saudáveis, sem apagar ou
  remover projetos externos fora do escopo.
- O catálogo Production foi reconciliado somente depois do backup: 37/37
  registros, repetição idempotente 0/37 e queries públicas verdes.
- A senha não transitou pelo chat. O dono a guardou no Chaveiro e autorizou uma
  leitura única, usada diretamente no formulário Production e descartada ao
  encerrar a sessão de automação.
- O rate limit não foi deliberadamente saturado em produção. Uma tentativa
  válida de login e a suíte de contratos cobriram feedback/retryAfter sem
  alterar parâmetros nem gerar indisponibilidade artificial.
- Gate C permite avançar ao domínio, mas não autoriza enviar o convite:
  domínio, lista real revisada e testes físicos permanecem gates separados.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Substituídos deployments ligados ao projeto Convex incorreto**

- **Found during:** Tasks 1–2
- **Issue:** O primeiro Preview e o primeiro Production resolveram
  `convex-crimson-cloud`, não o projeto pretendido.
- **Fix:** As entradas incorretas foram removidas dos escopos, novos
  deployments foram gerados contra `wooden-hound-372` e
  `necessary-coyote-763`, e os antigos ficaram proibidos como rollback.
- **Files modified:** `07-LAUNCH-CHECKLIST.md`, `07-ROLLBACK.md`,
  `07-SMOKE.md`
- **Verification:** logs de build, bundle Production e smokes 40/40 em ambos
  os ambientes.
- **Committed in:** `92f57c3`, `c71b3e9`

**2. [Rule 1 - Bug] Corrigido identificador Preview obsoleto no registro de smoke**

- **Found during:** Task 3
- **Issue:** `07-SMOKE.md` ainda mantinha o primeiro Preview rejeitado depois
  da correção executada na Task 2.
- **Fix:** A identificação e o vínculo Convex foram atualizados para o
  deployment saudável, sem transformar o alvo antigo em evidência.
- **Files modified:** `07-SMOKE.md`
- **Verification:** Preview corrigido passou novamente 40/40 e os três
  ambientes Convex permanecem distintos.
- **Committed in:** `c71b3e9`

---

**Total deviations:** 2 auto-fixed (2 bugs).
**Impact on plan:** As correções impediram promoção/rollback para infraestrutura
incorreta e restauraram a rastreabilidade externa; não houve expansão de
arquitetura, dado real ou segredo versionado.

## Issues Encountered

- O dry-run Convex exige confirmação mesmo sem publicar; foi executado em TTY,
  confirmado e terminou com “Would have deployed”, sem alterar Production.
- A busca literal de assignments sensíveis encontrou o próprio regex
  documentado em `07-02-PLAN.md`/`07-VALIDATION.md`. A auditoria final excluiu
  apenas essas duas definições do scanner e permaneceu verde no restante do
  repositório.
- Três erros antigos de `wines:listFeatured`, anteriores à reconciliação do
  catálogo, apareceram no histórico Convex. Os eventos atuais de
  `listFeatured`, `listCatalog`, login, overview, status e logout terminaram
  sem erro; nenhuma falha atual ficou aberta.
- O aviso preexistente de chunk principal acima de 500 kB permanece
  não bloqueante e não foi introduzido por este plano.

## Verification

- `npm run test:release`: 528/528 Vitest + build + 40/40 Playwright local.
- Preview saudável: 40/40 Playwright em Chromium/WebKit desktop/mobile
  emulados.
- Production saudável: 40/40 Playwright em Chromium/WebKit desktop/mobile
  emulados.
- Seis rotas Production retornaram HTTP 200, incluindo deep refresh e 404 SPA.
- Bundle Production: `necessary-coyote-763.convex.cloud` presente; alvos
  Preview conhecidos ausentes.
- `npx convex deploy --dry-run`: schema/codegen/diff verdes, sem deploy.
- `npx convex env list --names-only --prod`: `ADMIN_PASSWORD` presente.
- Login/logout real: passou; sessão revogada; nenhum trace/screenshot.
- Vercel: zero eventos de erro na janela; Convex atual sem erro de alta
  severidade.
- Workspace/tracked files: nenhum ZIP, backup, key, PEM ou env Production/
  Preview.
- Assignment sensível: nenhum valor versionado fora das definições do próprio
  scanner.
- `git diff --check`: passou.

## Authentication Gates

- As sessões Vercel e Convex já estavam autenticadas e não exigiram novo
  login/2FA.
- A criação/guarda da senha Production foi o único gate humano. Após o dono
  autorizar explicitamente uma leitura única no Chaveiro, o login/logout foi
  concluído sem nova confirmação do macOS e sem revelar o valor.

## Security Verification

- Nenhum `ADMIN_PASSWORD`, deploy key, capability administrativa, payload de
  convidado, conteúdo de backup ou imagem privada foi impresso ou commitado.
- Os arquivos `src/lib/phone.ts` e `src/lib/phone.test.ts` permaneceram
  modificados pelo usuário, fora do staging e de todos os commits 07-03.
- O browser foi finalizado após logout e o kernel efêmero que acessou o
  Chaveiro foi resetado.
- Deployments incorretos estão documentados somente como rejeitados, nunca
  como candidatos saudáveis.

## Known Stubs

- Gate D (DNS/TLS/canonical no domínio) permanece `pending` para o Plano
  07-04.
- Gate E (lista real revisada e autorização para divulgar) permanece
  `pending` para o Plano 07-05.
- Dispositivos físicos permanecem `pending` no Plano 07-06 e, por decisão do
  dono, não bloqueiam a publicação do domínio.

## User Setup Required

None para concluir este plano. O dono já guardou a senha no Chaveiro; não deve
copiá-la para `.env`, Vercel, git ou chat.

## Next Phase Readiness

- O Plano 07-04 pode apontar Cloudflare para o deployment Vercel agora marcado
  saudável e executar Gate D imediato/pós-propagação.
- O convite ainda não pode ser divulgado: lista real/import/revisão do Plano
  07-05 continua independente da publicação.
- `LAUNCH-03` e `LAUNCH-04` permanecem abertos até domínio e lista real; este
  plano fecha apenas o tracer de infraestrutura, backup e Gate C.

## Self-Check: PASSED

- `.vercel/project.json` e os três registros operacionais existem.
- Os três commits 07-03 estão acessíveis no histórico e nenhum contém os
  diffs de telefone do usuário.
- Todos os critérios Task 1–3 e os comandos agregados do plano foram
  reexecutados ou confirmados por evidência externa sanitizada.
- Os cinco deliverables possuem classificação explícita; nenhuma prova
  secret-safe foi convertida em alegação além do que pode demonstrar.

---
*Phase: 07-endurecimento-lan-amento*
*Completed: 2026-07-25*
