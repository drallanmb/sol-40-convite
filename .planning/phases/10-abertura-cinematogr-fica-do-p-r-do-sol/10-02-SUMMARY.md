---
phase: 10-abertura-cinematogr-fica-do-p-r-do-sol
plan: "02"
subsystem: ui
tags: [react, playwright, accessibility, inert, bfcache, reduced-motion]

requires:
  - phase: 10-abertura-cinematogr-fica-do-p-r-do-sol
    plan: "01"
    provides: Sol canônico WAAPI, política pura da abertura e reveal de 260ms
provides:
  - Chrome da Home revelável e inert sem envolver o skip link ou o main
  - Cancelamento idempotente da descida por scroll intencional de 4px
  - Replay mount-scoped e por pageshow persistido elegível
  - Fragment routing allowlisted e movimento reduzido reativo
affects: [10-03, home, hero, shell, release-tests]

tech-stack:
  added: []
  patterns:
    - Inert limitado às subárvores interativas invisíveis
    - Home sob a topbar sticky sem reposicionar o alvo do sol
    - Geração explícita para replay por bfcache com cleanup simétrico

key-files:
  created: []
  modified:
    - src/routes/Home.tsx
    - src/components/invite/Hero.tsx
    - src/components/layout/Shell.tsx
    - src/index.css
    - tests/cinematic-intro.spec.ts

key-decisions:
  - "O header usa data-intro-chrome-phase separado para preservar data-intro-phase como contrato observável único do hero."
  - "Somente uma nova montagem elegível ou pageshow.persisted elegível incrementa a geração; #inicio na mesma montagem não reinicia."
  - "Céu e ondas decorativos são pointer-transparent; skip, main e seções posteriores permanecem fora de qualquer ancestral inert."

patterns-established:
  - "Accessible hidden chrome: visibility/opacity e inert compartilham a mesma fase, removendo inert no início de revealing."
  - "Mount-scoped replay: o hash inicial é capturado uma vez e restaurações bfcache usam uma geração independente."

requirements-completed:
  - INTRO-01
  - INTRO-02

coverage:
  - id: D1
    description: Skip link permanece primeiro e funcional enquanto header e controles invisíveis ficam inert até o reveal
    requirement: INTRO-02
    verification:
      - kind: e2e
        ref: "tests/cinematic-intro.spec.ts#skip link stays first and outside inert while hidden controls reveal together"
        status: pass
    human_judgment: false
  - id: D2
    description: Scroll intencional conclui o sol no alvo sem bloquear nem restaurar a posição escolhida
    requirement: INTRO-02
    verification:
      - kind: e2e
        ref: "tests/cinematic-intro.spec.ts#scroll cancellation ignores noise then lands the sun without restoring scroll"
        status: pass
    human_judgment: false
  - id: D3
    description: Remontagem, #inicio na mesma montagem, fragmentos diretos e reduced motion seguem a política de entrada
    requirement: INTRO-02
    verification:
      - kind: e2e
        ref: "tests/cinematic-intro.spec.ts#route entry|reduced motion"
        status: pass
    human_judgment: false
  - id: D4
    description: pageshow persistido elegível reinicia a abertura e desmontagem cancela callbacks e Animation anteriores
    requirement: INTRO-02
    verification:
      - kind: e2e
        ref: "tests/cinematic-intro.spec.ts#bfcache persisted pageshow restarts an eligible generation and cleans up on unmount"
        status: pass
    human_judgment: true
    rationale: "O contrato sintético e o cleanup são automatizados, mas a elegibilidade real do bfcache depende da política de cada navegador e permanece no smoke manual da fase."

duration: 8min
completed: 2026-07-26
status: complete
---

# Phase 10 Plan 02: Navegação, interação e lifecycle Summary

**Abertura integrada à Home com skip soberano, chrome inert revelável, scroll cancelável e replay correto por rota, fragmento, bfcache e movimento reduzido**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-26T06:15:44Z
- **Completed:** 2026-07-26T06:23:22Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Manteve o skip link como primeiro foco e fora de qualquer ancestral inert, enquanto header e CTAs invisíveis deixam a interação até o início do reveal.
- Fez o céu da Home começar em viewport Y=0 com underlap exato de 72px, sem alternar o posicionamento sticky do header.
- Concluiu a descida no alvo em scroll efetivo de 4px, preservando `window.scrollY` e removendo o efeito WAAPI no endpoint.
- Implementou replay por nova montagem e `pageshow.persisted`, sem repetir por scroll de retorno ou `#inicio` na mesma montagem.
- Respeitou fragmentos conhecidos por `getElementById` e tornou `prefers-reduced-motion` inicial ou dinâmico imediatamente completo.

## Task Commits

Cada ciclo TDD e correção de segurança de interação foi commitado atomicamente:

1. **Task 1 RED: contratos de foco e scroll** - `80de4ac` (test)
2. **Task 1 GREEN: reveal, inert, underlap e scroll seguro** - `50784fb` (feat)
3. **Task 2 RED: contratos de rota, bfcache e reduced motion** - `458a384` (test)
4. **Task 2 GREEN: coordenação de lifecycle da Home** - `1a331f6` (feat)
5. **Verificação: camadas decorativas pointer-transparent** - `f58e9ad` (fix)

**Plan metadata:** commitado junto com este summary.

## Files Created/Modified

- `src/routes/Home.tsx` - Passa a fase ao Shell, mantém replay mount-scoped, resolve fragmentos e coordena `pageshow.persisted`.
- `src/components/invite/Hero.tsx` - Expõe o wrapper interativo inert, fecha a corrida pré-RAF e mantém céu/ondas fora do hit testing.
- `src/components/layout/Shell.tsx` - Adiciona defaults seguros, reveal/inert do header e underlap Home-only.
- `src/index.css` - Define visibilidade do chrome e desliga o reveal com especificidade correta em reduced motion.
- `tests/cinematic-intro.spec.ts` - Cobre skip, scroll, rota, fragmentos, bfcache, cleanup e reduced motion sem sleeps de 2s.

## Decisions Made

- O header recebe um atributo de fase próprio em vez de reutilizar `data-intro-phase`, mantendo o seletor do hero único para testes e consumidores.
- A borda de 1px do header é compensada no fluxo somente na Home, preservando a margem negativa travada de 72px e o céu em Y=0.
- A listener de `pageshow` consulta hash e preferência atuais, mas mudanças comuns de hash/location não são gatilhos de replay.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrigida a especificidade do fallback de movimento reduzido**
- **Found during:** Task 2
- **Issue:** O seletor normal de `complete` tinha maior especificidade e mantinha a transição de 260ms mesmo sob `prefers-reduced-motion: reduce`.
- **Fix:** O fallback passou a usar `[data-intro-phase] [data-intro-reveal]`, anulando a transição com especificidade suficiente.
- **Files modified:** `src/index.css`
- **Verification:** cenário Playwright `reduced motion` observa fase `complete`, zero WAAPI e `transition-duration: 0s`.
- **Committed in:** `1a331f6`

**2. [Rule 2 - Missing Critical] Camadas decorativas removidas do hit testing**
- **Found during:** verificação geral
- **Issue:** Céu e wrapper das ondas eram decorativos, mas ainda podiam ser alvos de pointer events.
- **Fix:** Aplicado `pointer-events-none` às duas camadas sem afetar conteúdo ou links.
- **Files modified:** `src/components/invite/Hero.tsx`
- **Verification:** build e todos os oito cenários Playwright passaram após a mudança.
- **Committed in:** `f58e9ad`

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical).
**Impact on plan:** Ambas garantem os contratos já travados de movimento reduzido e abertura não bloqueante; não houve expansão de escopo.

## Issues Encountered

- A borda inferior do header fazia o hero começar em Y=1 apesar do underlap de 72px; uma compensação Home-only de `-mb-px` manteve o fluxo total em 72px sem reposicionar o header.
- O caso de fragmento direto precisava sair antes da Home para representar uma entrada real, em vez de uma simples troca same-document após `#inicio`.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Threat Flags

None - nenhum endpoint, auth path, acesso a arquivo ou mudança de schema foi introduzido.

## Verification

- `npm run build` — passed.
- `npx vitest run src/lib/cinematicIntro.test.ts` — 25 passed.
- `npx playwright test tests/cinematic-intro.spec.ts --project=emulated-chromium-desktop` — 8 passed.
- Gates estáticos — sem `preventDefault`, `wheel`, `touchmove`, overflow lock ou sleep de 2s nos arquivos da abertura.

## Self-Check: PASSED

- Os cinco arquivos modificados existem e passam `git diff --check`.
- Os cinco commits declarados estão presentes no histórico.
- Todos os critérios automatizados das duas tarefas e a verificação geral do plano passaram.
- Nenhum stub bloqueante ou nova superfície de segurança foi encontrado.

## Next Phase Readiness

- Pronto para o Plano 10-03 ajustar regressões da suíte de release, executar a matriz browser/mobile e consolidar a UAT visual/bfcache.
- O smoke perceptual do handoff do sol e o bfcache real continuam corretamente reservados à verificação humana final.

---
*Phase: 10-abertura-cinematogr-fica-do-p-r-do-sol*
*Completed: 2026-07-26*
