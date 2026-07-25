---
phase: 07-endurecimento-lan-amento
plan: 02
subsystem: release-quality
tags: [playwright, axe-core, wcag, canonical, vercel, convex, runbook]

requires:
  - phase: 07-endurecimento-lan-amento
    plan: 01
    provides: Importador CSV protegido, pending-only e integrado ao CRUD manual
  - phase: 06-dashboard-interno-admin
    provides: Gate administrativo fail-closed e ausência de queries de domínio pré-auth
provides:
  - Origem canônica e metadados sociais fixos em https://www.sol40.com.br
  - Gate não-watch do build em Chromium/WebKit desktop e 320px emulados
  - Regressões de rotas, refresh, axe, teclado, movimento, reflow e privacidade pré-auth
  - Comandos Convex production secret-safe e quatro artefatos operacionais pending
affects: [07-03, 07-04, 07-05, 07-06, production-launch, incident-response]

tech-stack:
  added: ["@playwright/test 1.62.0", "@axe-core/playwright 4.12.1"]
  patterns:
    - PLAYWRIGHT_BASE_URL troca o preview local do build por um alvo já publicado
    - Projetos de browser e evidências carregam a classe emulated e nunca satisfazem hardware
    - Evidência operacional começa pending e exige alvo, horário, classe, resultado e correção
    - Rollback de frontend, functions/schema, env e dados permanece separado por camada

key-files:
  created:
    - playwright.config.ts
    - tests/release.spec.ts
    - src/lib/productionMetadata.test.ts
    - .planning/phases/07-endurecimento-lan-amento/07-LAUNCH-CHECKLIST.md
    - .planning/phases/07-endurecimento-lan-amento/07-SMOKE.md
    - .planning/phases/07-endurecimento-lan-amento/07-ROLLBACK.md
    - .planning/phases/07-endurecimento-lan-amento/07-DEVICE-MATRIX.md
  modified:
    - index.html
    - package.json
    - package-lock.json
    - DEPLOY.md
    - .env.example
    - src/components/invite/Countdown.tsx
    - src/components/invite/CountdownRail.tsx
    - src/components/invite/GuideSection.tsx
    - src/components/layout/Shell.tsx
    - src/components/memories/PhotoPicker.tsx
    - src/routes/NotFound.tsx

key-decisions:
  - "A origem estática consumida é https://www.sol40.com.br; nenhuma variável PUBLIC_ORIGIN não utilizada foi criada."
  - "Playwright cobre Chromium/WebKit e 320px/escala 2x como emulação; HEIC, WebViews, fuso, teclado virtual e dispositivos reais continuam pending."
  - "Produção Convex usa sempre --prod e segredo por entrada interativa/stdin; verificação versionada mostra somente nomes."
  - "Domínio público e convite divulgado são marcos diferentes; Gate E exige backup mais lista real revisada."

patterns-established:
  - "Release local/live: build Vite -> preview local ou PLAYWRIGHT_BASE_URL -> rotas/axe/reflow/privacidade."
  - "Operação honesta: repository, emulated, live e physical nunca são evidências intercambiáveis."

requirements-completed: []

coverage:
  - id: D1
    description: "Canonical, og:url, og:image e Twitter card usam uma única origem fixa, com asset real e sem .vercel.app ou PUBLIC_ORIGIN."
    requirement: LAUNCH-03
    verification:
      - kind: unit
        ref: "src/lib/productionMetadata.test.ts#production metadata"
        status: pass
      - kind: automated_ui
        ref: "tests/release.spec.ts#canonical tracer: emulated 320px home quality slice"
        status: pass
    human_judgment: false
  - id: D2
    description: "Gate emulado cobre rotas/refresh, axe A/AA sério/crítico, 320px, escala 2x, teclado, reduced motion e privacidade pré-auth em Chromium/WebKit."
    requirement: LAUNCH-02
    verification:
      - kind: automated_ui
        ref: "npm run test:browser#40 tests across four emulated projects"
        status: pass
      - kind: integration
        ref: "npm run test:release#528 Vitest + build + 40 Playwright"
        status: pass
    human_judgment: false
  - id: D3
    description: "Comandos e orientação de produção mantêm deploy keys por escopo e ADMIN_PASSWORD somente no Convex, sem segredo em argumento."
    requirement: LAUNCH-03
    verification:
      - kind: other
        ref: "Task 3 rg gate over DEPLOY.md and .env.example"
        status: pass
    human_judgment: false
  - id: D4
    description: "Checklist, smoke, rollback e matriz física separam repository/preview/.vercel.app/domínio/divulgação e começam sem resultados inventados."
    requirement: LAUNCH-04
    verification:
      - kind: other
        ref: "Task 3 pending/rollback/static documentation gate"
        status: pass
    human_judgment: true
    rationale: "Os templates e limites estão verificados, mas deployments, DNS, TLS, backup e smokes reais pertencem aos Planos 07-03/07-04."
  - id: D5
    description: "Cinco contextos físicos permanecem independentes e não bloqueiam publicação, sem emulação contada como hardware."
    requirement: LAUNCH-01
    verification:
      - kind: manual_procedural
        ref: "07-DEVICE-MATRIX.md#Linhas independentes"
        status: unknown
    human_judgment: true
    rationale: "Exige iPhone/Android/WebViews/HEIC/fuso/admin em aparelho físico; cada linha continua pending por decisão explícita."

duration: 9min
completed: 2026-07-25
status: complete
---

# Phase 7 Plan 2: Canonical Release Quality Gate Summary

**Origem canônica fixa, gate Playwright/axe sobre o build e runbooks pending deixam o lançamento verificável sem confundir emulação, produção e hardware**

## Performance

- **Duration:** 9 min
- **Started:** 2026-07-25T11:29:41Z
- **Completed:** 2026-07-25T11:38:44Z
- **Tasks:** 3
- **Files modified:** 19

## Accomplishments

- Fixou canonical, Open Graph e Twitter card em `https://www.sol40.com.br`,
  incluindo o asset absoluto 1200×630 e regressão contra origem Vercel.
- Entregou `test:browser`/`test:release` não-watch sobre o build, com 40 testes
  emulados cobrindo rotas, refresh, axe, 320px/2x, teclado, reduced motion e
  privacidade administrativa pré-auth.
- Corrigiu somente defeitos reproduzidos: contraste em cream, label de upload,
  overflow móvel do countdown, semântica do wordmark e contraste do 404.
- Corrigiu o runbook Convex para `--prod`, `--names-only` e entrada de segredo
  por stdin/interativa, sem inventar API obrigatória em `convex.config.ts`.
- Criou Gates A–E, smoke por alvo, rollback composto e cinco linhas físicas
  independentes, todos com evidência externa ainda marcada `pending`.

## Task Commits

1. **Task 1 RED: contrato de metadados production** — `06c4f81` (test)
2. **Task 1 GREEN: canonical e primeiro tracer do build** — `cb65ab5` (feat)
3. **Task 2 RED: rotas, axe, privacidade e reflow** — `d579dc9` (test)
4. **Task 2 GREEN: gate em quatro perfis emulados** — `90efe3f` (feat)
5. **Task 3: orientação segura e artefatos operacionais** — `83181d0` (docs)

## Files Created/Modified

- `src/lib/productionMetadata.test.ts` — contrato estático da origem, asset e
  ausência de configuração morta.
- `playwright.config.ts` — preview do build, alvo live opcional, quatro
  projetos emulados e artifacts somente em falha.
- `tests/release.spec.ts` — tracer, rotas/refresh, axe, reflow, teclado,
  reduced motion e transporte/DOM pré-auth.
- `index.html` — canonical, `og:url`, `og:image` e Twitter card absolutos.
- `Countdown.tsx` e `CountdownRail.tsx` — reflow em 320px sem cortar unidades.
- `GuideSection.tsx`, `PhotoPicker.tsx`, `Shell.tsx` e `NotFound.tsx` —
  correções focadas de contraste, nome acessível e semântica.
- `DEPLOY.md` e `.env.example` — flags e escopos production/preview seguros.
- `07-LAUNCH-CHECKLIST.md`, `07-SMOKE.md`, `07-ROLLBACK.md` e
  `07-DEVICE-MATRIX.md` — registros externos prontos para execução posterior.

## Decisions Made

- A stack Vite estática consome metadados fixos; adicionar `PUBLIC_ORIGIN`
  criaria configuração sem consumidor e foi rejeitado.
- Axe bloqueia achados A/AA `serious`/`critical`; backstops humanos não
  executados continuam explícitos em vez de gerar falsa alegação de AA total.
- O comportamento nativo de Tab do WebKit no macOS segue a preferência de
  acesso total do sistema; o teste foca o skip link programaticamente nesse
  engine e ainda valida ativação/retorno por teclado.
- `ADMIN_PASSWORD` ausente continua falhando fechado no runtime; presença em
  produção é provada por nomes e login, não por leitura do valor.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrigido contraste e label de upload encontrados pelo primeiro axe**

- **Found during:** Task 1
- **Issue:** Coral/cream falhava 3:1 em headings/hotéis e o input de foto
  visualmente acionado por botão não tinha label associada.
- **Fix:** Usado o token orange nos textos grandes reproduzidos e adicionado
  label real ao file input.
- **Files modified:** `GuideSection.tsx`, `PhotoPicker.tsx`
- **Verification:** canonical tracer axe verde em Chromium/WebKit.
- **Committed in:** `cb65ab5`

**2. [Rule 1 - Bug] Corrigido overflow horizontal do countdown em 320px**

- **Found during:** Task 1
- **Issue:** Tiles completos e rail ultrapassavam o viewport por 37px.
- **Fix:** Grid 2×2 no countdown móvel e rail compacto em quatro colunas,
  preservando todas as unidades.
- **Files modified:** `Countdown.tsx`, `CountdownRail.tsx`
- **Verification:** document/body sem overflow nos quatro projetos.
- **Committed in:** `cb65ab5`

**3. [Rule 1 - Bug] Corrigida semântica/contraste da rota 404**

- **Found during:** Task 2
- **Issue:** `aria-label` era proibido em span sem role e o link coral normal
  falhava 4.5:1 sobre cream.
- **Fix:** Wordmark não-link virou `role="img"` e link passou a wine.
- **Files modified:** `Shell.tsx`, `NotFound.tsx`
- **Verification:** axe e refresh 404 verdes em Chromium/WebKit.
- **Committed in:** `90efe3f`

**4. [Rule 3 - Blocking] Ignorados artifacts gerados pelo Playwright**

- **Found during:** Task 1
- **Issue:** traces/screenshots de falha criavam diretórios não versionados.
- **Fix:** `test-results` e `playwright-report` foram adicionados ao
  `.gitignore`; política continua failure-only.
- **Files modified:** `.gitignore`
- **Verification:** working tree contém somente os dois diffs preexistentes
  de telefone.
- **Committed in:** `cb65ab5`

---

**Total deviations:** 4 auto-fixed (3 bugs, 1 blocker).
**Impact on plan:** Todas fecharam falhas reproduzidas pelo novo gate; não
houve redesign, API nova, segredo, dado real ou alteração de rate limit.

## Issues Encountered

- WebKit/macOS não inclui links no primeiro Tab quando o sistema não habilita
  full keyboard access. O gate registra essa limitação e mantém o backstop
  físico/humano.
- O build conserva o aviso preexistente de chunk principal acima de 500 kB;
  não houve regressão funcional nem mudança de arquitetura neste plano.

## Verification

- Metadata unit: 3/3 testes passaram.
- Full Vitest: 28 arquivos, 528/528 testes passaram.
- Browser gate: 40/40 testes passaram em quatro projetos `emulated-*`.
- `npm run test:release`: unitários + build + browser passaram.
- Production build e `git diff --check`: passaram.
- Pins/lockfile: Playwright 1.62.0 e axe 4.12.1 exatos, SHA-512 presentes e
  Node 24 compatível com requisito Playwright `>=20`.
- Nenhum commit 07-02 inclui `src/lib/phone.ts` ou
  `src/lib/phone.test.ts`.

## Known Stubs

- Os valores `pending` nos quatro artefatos operacionais são intencionais e
  não são stubs de aplicação: registram evidência externa ainda não
  executada. Planos 07-03/07-04 preenchem deploy/DNS/smoke; 07-05 preenche
  lista real/divulgação; 07-06 preenche hardware.

## Authentication Gates

None. Este plano não leu nem alterou credenciais ou ambientes externos.

## User Setup Required

None neste plano. A configuração autenticada de Vercel/Convex começa no
Plano 07-03 e deve pausar somente se a sessão exigir login/2FA.

## Next Phase Readiness

- Plano 07-03 pode executar o gate em Preview/Production usando
  `PLAYWRIGHT_BASE_URL` e preencher Gates B/C sem mudar a suíte.
- Domínio ainda não foi apontado; backup, senha de produção, lista real e
  smokes ao vivo continuam pendentes.
- LAUNCH-01/02/03/04 permanecem abertos até seus respectivos planos externos;
  este resumo não transforma automação local em conclusão do requisito.

## Self-Check: PASSED

- Todos os sete arquivos-chave existem e os cinco commits 07-02 estão no
  histórico.
- O classificador aceitou os cinco deliverables sem erro: três com prova
  automatizada e dois mantidos para julgamento/evidência externa.
- Full release gate, build, pins/integridades e `git diff --check` passaram.
- Somente `src/lib/phone.ts` e `src/lib/phone.test.ts` permanecem modificados
  fora do plano; nenhum commit 07-02 os contém.

---
*Phase: 07-endurecimento-lan-amento*
*Completed: 2026-07-25*
