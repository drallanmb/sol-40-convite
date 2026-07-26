---
phase: 10-abertura-cinematogr-fica-do-p-r-do-sol
plan: "03"
subsystem: testing
tags: [playwright, chromium, webkit, responsive-animation, accessibility, release-gate]

requires:
  - phase: 10-abertura-cinematogr-fica-do-p-r-do-sol
    plan: "01"
    provides: Sol canônico, instrumentação WAAPI e contratos de geometria/timing
  - phase: 10-abertura-cinematogr-fica-do-p-r-do-sol
    plan: "02"
    provides: Skip soberano, chrome inert, lifecycle de rota/bfcache e reduced motion
provides:
  - Matriz Playwright de 40 cenários para Chromium/WebKit desktop/mobile
  - Prova responsiva em 320×760, 768×1024 e 1280×800, inclusive após resize
  - Smoke natural único que observa descending, revealing e complete
  - Release gate determinístico sem branches silenciosos para topbar/menu
affects: [release-tests, phase-10-verification, uat]

tech-stack:
  added: []
  patterns:
    - Instrumentação Playwright intercepta somente a WAAPI do sol canônico
    - Branches release obrigatórios são derivados do viewport, não de isVisible durante inert
    - Fases transitórias curtas são registradas por MutationObserver

key-files:
  created: []
  modified:
    - tests/cinematic-intro.spec.ts
    - tests/release.spec.ts

key-decisions:
  - "Existe um único caso natural na spec; os demais encerram a WAAPI por Animation.finish()."
  - "O teste de release prova o skip enquanto descending, finaliza a intro e só então exige o branch de navegação correspondente ao viewport."
  - "WebKit recebe foco explícito no skip link por respeitar a preferência de acesso completo ao teclado do macOS."

patterns-established:
  - "Mandatory release branches: desktop sempre prova nav/Login; mobile sempre prova menu, foco, Escape e rail."
  - "Responsive endpoint proof: centro, largura e altura do visual/target usam tolerância absoluta de 1 CSS px."

requirements-completed:
  - INTRO-01
  - INTRO-02

coverage:
  - id: D1
    description: Sol canônico converge ao target real em 320×760, 768×1024 e 1280×800, inclusive após resize
    requirement: INTRO-01
    verification:
      - kind: automated_ui
        ref: "tests/cinematic-intro.spec.ts#geometry|resize (40/40 full matrix)"
        status: pass
    human_judgment: false
  - id: D2
    description: Primeiro frame, timing, overflow, foco, scroll, rota, bfcache sintético e reduced motion passam em Chromium/WebKit desktop/mobile
    requirement: INTRO-02
    verification:
      - kind: e2e
        ref: "npx playwright test tests/cinematic-intro.spec.ts (40 passed)"
        status: pass
    human_judgment: false
  - id: D3
    description: Um smoke sem instrumentação observa descending, revealing e complete em aproximadamente 2s mais reveal
    requirement: INTRO-01
    verification:
      - kind: automated_ui
        ref: "tests/cinematic-intro.spec.ts#natural duration"
        status: pass
    human_judgment: false
  - id: D4
    description: Gate release prova skip antes do finish e navegação obrigatória depois do reveal, sem enfraquecer rotas, Axe ou privacidade
    requirement: INTRO-02
    verification:
      - kind: e2e
        ref: "npm run test:release (607 unit + 120 browser passed)"
        status: pass
    human_judgment: false
  - id: D5
    description: Continuidade perceptual do disco e halo sem blink em hardware real
    requirement: INTRO-01
    verification: []
    human_judgment: true
    rationale: "Identidade do nó, estilo e geometria estão automatizados, mas a composição perceptual final depende de hardware/browser real."
  - id: D6
    description: Restauração bfcache real reinicia a abertura sem foco ou listener obsoleto
    requirement: INTRO-02
    verification:
      - kind: e2e
        ref: "tests/cinematic-intro.spec.ts#bfcache synthetic pageshow"
        status: pass
    human_judgment: true
    rationale: "O evento sintético e o cleanup são provados; a admissão real no bfcache depende da política do navegador."

duration: 6min
completed: 2026-07-26
status: complete
---

# Phase 10 Plan 03: Matriz cross-browser e release gate Summary

**Abertura cinematográfica fechada com geometria responsiva de 1 CSS px, smoke natural e gate release obrigatório em Chromium/WebKit desktop/mobile**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-26T06:26:41Z
- **Completed:** 2026-07-26T06:32:55Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Expandiu a spec da abertura para 40 cenários, cobrindo três geometrias explícitas, resize antes do finish, ausência de overflow e preservação do único nó solar.
- Adicionou um único caso natural que observa a sequência `descending → revealing → complete` dentro da janela de 2000ms + 260ms.
- Tornou a navegação de release obrigatória por viewport, eliminando o falso verde causado por locators invisíveis sob `inert`.
- Provou que reduced motion começa em `complete`, não cria handle/WAAPI finita da intro e mantém as ondas visíveis e estáticas.

## Task Commits

Cada ciclo de evidência foi commitado atomicamente:

1. **Task 1 RED: matriz responsiva e smoke natural** - `6d83e61` (test)
2. **Task 1 GREEN: observação de fase e política WebKit estáveis** - `26deee8` (test)
3. **Task 2 RED: branches release obrigatórios** - `71bdb2f` (test)
4. **Task 2 GREEN: finish determinístico e reduced motion** - `cfc8901` (test)

**Plan metadata:** commitado junto com este summary.

## Files Created/Modified

- `tests/cinematic-intro.spec.ts` - Matriz responsiva/cross-browser, resize, estilos estáticos, overflow e smoke natural.
- `tests/release.spec.ts` - Controle WAAPI isolado, skip-first, branches obrigatórios desktop/mobile e fallback reduced motion.

## Decisions Made

- O smoke natural é um único caso nomeado, executado pela matriz configurada; nenhuma espera arbitrária de 2s foi adicionada aos casos instrumentados.
- `MutationObserver` registra a fase `revealing` de 260ms sem depender de um poll que possa perder o estado transitório.
- O wrapper de `Element.prototype.animate` delega todas as animações ao original e pausa somente o elemento `data-testid="hero-sun-visual"`.
- A escolha desktop/mobile usa largura do viewport configurado, tornando cada branch obrigatório e independente da árvore ativa durante `inert`.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- O primeiro oráculo natural tentou aguardar diretamente a fase `revealing`; o poll podia observar `complete` depois dos 260ms. A sequência passou a ser registrada por `MutationObserver`.
- WebKit não move foco para links via Tab quando o macOS desativa acesso completo ao teclado. O teste usa foco explícito nesse navegador e mantém a mesma ativação por Enter.
- O primeiro `npm run test:release` teve uma leitura Axe transitória de contraste em `/presentes` mobile (119/120 browser). O caso isolado passou e o gate completo repetido fechou em 120/120 sem alterar o código fora do plano.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Threat Flags

None - os arquivos alterados são exclusivamente testes e não introduzem endpoint, auth path, acesso a arquivo ou mudança de schema.

## Verification

- `npm run build` — passed.
- `npx playwright test tests/cinematic-intro.spec.ts --project=emulated-chromium-desktop -g "geometry|resize|natural duration"` — 3 passed.
- `npx playwright test tests/cinematic-intro.spec.ts` — 40 passed.
- `npx playwright test tests/release.spec.ts --project=emulated-chromium-desktop --project=emulated-chromium-mobile-320px-2x -g "keyboard skip link|reduced motion"` — 4 passed.
- `npm run test:release` — 32 Vitest files / 607 tests passed; build passed; 120 Playwright tests passed.

## Manual Verification Pending

- Assistir uma execução natural em 320px, tablet e desktop e confirmar ausência perceptível de swap/blink no disco/halo.
- Em Safari e Chrome reais, navegar de `/` para `/confirmar`, usar Back e confirmar replay sem listener ou foco obsoleto.

## Self-Check: PASSED

- Os dois arquivos modificados existem e passam `git diff --check`.
- Os quatro commits `10-03` estão presentes no histórico.
- Todos os nomes de caso exigidos (`geometry`, `resize`, `first frame`, `timing`, `natural duration`, `reduced motion`, `skip link`, `scroll cancellation`, `route entry` e `bfcache`) existem.
- Build, spec completa e release gate final passaram.
- Nenhum stub bloqueante ou nova superfície de segurança foi encontrado.

## Next Phase Readiness

- Os contratos automatizados de INTRO-01/02 estão verdes e prontos para o verificador de fase.
- Os dois backstops perceptuais/browser-real permanecem corretamente pendentes para UAT humana de fim de fase.

---
*Phase: 10-abertura-cinematogr-fica-do-p-r-do-sol*
*Completed: 2026-07-26*
