---
phase: 10-abertura-cinematogr-fica-do-p-r-do-sol
plan: "01"
subsystem: ui
tags: [react, waapi, playwright, vitest, responsive-animation, reduced-motion]

requires:
  - phase: 02-convite-p-blico
    provides: Hero responsivo canônico, céu, sol, mar e política de movimento reduzido
provides:
  - Política pura e allowlisted para elegibilidade da abertura
  - Único disco solar canônico animado por transform até o alvo responsivo renderizado
  - Reveal único de 260ms para mar, copy, ações e metadados
  - Contratos Vitest e Playwright para primeiro frame, geometria e timing
affects: [10-02, 10-03, hero, shell, release-tests]

tech-stack:
  added: []
  patterns:
    - Estado inicial da abertura resolvido sincronamente no mount da Home
    - Wrapper responsivo mensurável com filho visual animado por WAAPI
    - Cleanup simétrico de RAF, scroll listener e Animation sob StrictMode

key-files:
  created:
    - src/lib/cinematicIntro.ts
    - src/lib/cinematicIntro.test.ts
    - tests/cinematic-intro.spec.ts
  modified:
    - src/routes/Home.tsx
    - src/components/invite/Hero.tsx
    - src/index.css

key-decisions:
  - "A elegibilidade usa comparação exata de hash e IDs derivados somente de SECTION_IDS; não há storage, cookie ou selector dinâmico."
  - "O sol final é um único nó visual dentro do wrapper que conserva a geometria CSS responsiva existente."
  - "A descida usa somente transform por 2000ms; o sol fica fora do reveal de opacidade de 260ms."

patterns-established:
  - "Canonical measured element: CSS define o alvo responsivo e JavaScript mede o DOMRect sem duplicar breakpoints."
  - "Fail-open visual: ausência de WAAPI ou geometria inválida conclui a descida para nunca ocultar o convite."

requirements-completed:
  - INTRO-01
  - INTRO-02

coverage:
  - id: D1
    description: Política determinística de elegibilidade, fragmentos conhecidos, reduced motion e limiar de scroll
    requirement: INTRO-02
    verification:
      - kind: unit
        ref: "npx vitest run src/lib/cinematicIntro.test.ts (25 tests)"
        status: pass
    human_judgment: false
  - id: D2
    description: Sol canônico desce por 2000ms e converge ao alvo responsivo em até 1 CSS px
    requirement: INTRO-01
    verification:
      - kind: e2e
        ref: "tests/cinematic-intro.spec.ts#first frame|geometry|timing"
        status: pass
      - kind: other
        ref: "npm run build"
        status: pass
    human_judgment: false
  - id: D3
    description: Movimento reduzido começa com o hero final e sem animação contínua
    requirement: INTRO-02
    verification:
      - kind: e2e
        ref: "tests/release.spec.ts#reduced motion keeps content visible without continuous animation"
        status: pass
    human_judgment: false
  - id: D4
    description: Continuidade perceptual do disco e halo no pouso, sem blink ou swap visível
    requirement: INTRO-01
    verification:
      - kind: e2e
        ref: "tests/cinematic-intro.spec.ts#geometry lands the same canonical sun on its responsive target"
        status: pass
    human_judgment: true
    rationale: "A identidade do nó e a geometria são automatizadas, mas a ausência perceptual de blink em hardware real ainda exige smoke visual."

duration: 5min
completed: 2026-07-26
status: complete
---

# Phase 10 Plan 01: Núcleo visual e sol canônico Summary

**Abertura com política síncrona, um único sol WAAPI medido no layout real e reveal conjunto de 260ms sem o stagger legado**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-26T06:07:27Z
- **Completed:** 2026-07-26T06:12:52Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Fixou uma política pura para entradas pelo hero, fragmentos conhecidos, movimento reduzido e intenção de scroll, toda coberta por 25 testes unitários.
- Separou o wrapper responsivo do único disco solar visual e animou apenas o `transform` do disco até o endpoint CSS real.
- Substituiu as animações antigas de céu/sol/copy por um reveal único de mar, conteúdo e metadados, preservando ondas já em movimento.
- Criou instrumentação Playwright determinística para pausar/finalizar a WAAPI e validar primeiro frame, timing e geometria em 320px, tablet e desktop.

## Task Commits

Cada ciclo TDD foi commitado atomicamente:

1. **Task 1 RED: testes da política pura** - `4699b02` (test)
2. **Task 1 GREEN: política de elegibilidade e navegação** - `f60a560` (feat)
3. **Task 2 RED: contrato browser da abertura** - `9c5c487` (test)
4. **Task 2 GREEN: sol canônico e reveal do hero** - `5a75b27` (feat)

## Files Created/Modified

- `src/lib/cinematicIntro.ts` - Tipos, timing e políticas allowlisted da abertura.
- `src/lib/cinematicIntro.test.ts` - Casos unitários de elegibilidade, fragmentos, reduced motion e scroll.
- `src/routes/Home.tsx` - Estado inicial síncrono, reveal timer e integração concreta com Hero.
- `src/components/invite/Hero.tsx` - Alvo responsivo, disco canônico, WAAPI, cleanup e grupos de reveal.
- `src/index.css` - Estados de visibilidade/reveal e remoção do stagger antigo.
- `tests/cinematic-intro.spec.ts` - Controle determinístico e contratos de primeiro frame, geometria e timing.

## Decisions Made

- O hash inicial fica capturado no mount; mudanças de fragmento na mesma montagem não reinicializam a abertura.
- O wrapper conserva `left-1/2`, `top-[62%]`, `sm:top-[59%]` e `clamp(260px,28vw,480px)`; somente o filho visual recebe WAAPI.
- Scroll intencional conclui o efeito no endpoint antes de iniciar o reveal, sem alterar a posição escolhida pelo navegador.
- Falhas de API/geometria concluem a descida imediatamente, evitando conteúdo permanentemente oculto.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- O primeiro RED browser usava um locator amplo para `/Sol/i` e encontrava um título posterior da página. O locator foi restringido ao `h1` do hero durante o ciclo GREEN; o contrato de produto permaneceu inalterado.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Verification

- `npx vitest run src/lib/cinematicIntro.test.ts` — 25 passed.
- `npm run build` — passed.
- `npx playwright test tests/cinematic-intro.spec.ts --project=emulated-chromium-desktop -g "first frame|geometry|timing"` — 3 passed.
- `npx playwright test tests/release.spec.ts --project=emulated-chromium-desktop -g "reduced motion"` — 1 passed.

## Self-Check: PASSED

- Todos os seis arquivos declarados existem.
- Os quatro commits TDD estão presentes no histórico.
- Nenhum stub ou nova superfície de segurança foi introduzido.

## Next Phase Readiness

- O estado e os seletores observáveis estão prontos para o Plano 10-02 coordenar topbar, skip link, cancelamento/reentrada e lifecycle sem duplicar o sol.
- A continuidade perceptual deve permanecer na UAT final em hardware real.

---
*Phase: 10-abertura-cinematogr-fica-do-p-r-do-sol*
*Completed: 2026-07-26*
