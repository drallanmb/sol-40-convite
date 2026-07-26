---
phase: 10-abertura-cinematogr-fica-do-p-r-do-sol
plan: "02"
subsystem: ui
tags: [react, waapi, resize-observer, playwright, motion, accessibility]
requires:
  - phase: 10-abertura-cinematogr-fica-do-p-r-do-sol
    provides: storyboard 10-01 aprovado, sol canônico e baselines desktop/mobile
provides:
  - matemática pura para composição, arco responsivo, progresso e aceleração
  - controller WAAPI único de 3000 ms com retarget FLIP e conclusão fail-open
  - intenção de scroll, foco e navegação acelerada sem bloquear a ação original
  - contratos Playwright sem bridge de teste no bundle de produção
affects: [10-03, hero, motion, accessibility, visual-baselines]
tech-stack:
  added: []
  patterns:
    - controller local ao mount com CSS final autoritativo
    - arco derivado de DOMRects reais e retarget em wrapper separado
    - instrumentação WAAPI injetada exclusivamente por page.addInitScript
key-files:
  created: []
  modified:
    - DESIGN.md
    - src/lib/cinematicIntro.ts
    - src/lib/cinematicIntro.test.ts
    - src/components/invite/Hero.tsx
    - src/components/layout/Shell.tsx
    - src/index.css
    - tests/cinematic-intro.spec.ts
key-decisions:
  - "O checkpoint humano 10-01 prevalece sobre referências antigas: nenhuma nuvem, reflexo/brilho na água ou palmeira/coqueiro participa da timeline."
  - "O sol canônico assenta no alvo real em 82%; warm horizon e haze ficam totalmente ausentes durante o percurso e começam somente em 83%."
  - "A composição usa um relógio nominal de 3000 ms; primary inicia em 76%, secondary em 88% e a hierarquia termina em 99%, numa janela de 690 ms."
  - "Resize preserva geração e progresso, recompõe keyframes a partir dos novos DOMRects e dissolve a correção num wrapper FLIP de 180 ms."
  - "Intenção usa updatePlaybackRate para consumir o restante em até 180 ms sem preventDefault, restauração de scroll ou finish instantâneo."
patterns-established:
  - "Final-state-first: commitFinal promove estado, remove inert e só então limpa efeitos e listeners."
  - "Falha isolada: animate, pause, play, setKeyframes, updatePlaybackRate e cancel passam por fronteiras protegidas; finish não é usado."
  - "Teste externo: seek, captura de tracks e fault injection vivem somente no contexto Playwright."
requirements-completed:
  - INTRO-01
  - INTRO-02
coverage:
  - id: D1
    description: "Composição desktop/mobile, arco diagonal, progress clamp, copy timing e rate de intenção são contratos puros, finitos e responsivos."
    requirement: INTRO-01
    verification:
      - kind: unit
        ref: "npm test -- src/lib/cinematicIntro.test.ts — 59 passed"
        status: pass
      - kind: integration
        ref: "npm run build — TypeScript e Vite aprovados"
        status: pass
    human_judgment: false
  - id: D2
    description: "Um único sol percorre a paisagem contínua, assenta no alvo real em desktop/mobile e revela o brilho somente depois da chegada."
    requirement: INTRO-01
    verification:
      - kind: e2e
        ref: "tests/cinematic-intro.spec.ts#continuous scene shares one 3000ms clock and preserves the approved restraint"
        status: pass
      - kind: e2e
        ref: "tests/cinematic-intro.spec.ts#arc geometry keeps one canonical sun and finishes on the real responsive target"
        status: pass
      - kind: automated_ui
        ref: "tests/cinematic-intro-visual.spec.ts — 8 passed; baselines aprovados foram preservados"
        status: pass
      - kind: manual_procedural
        ref: "10-01-SUMMARY.md — aprovação explícita dos cinco critérios e das duas contact sheets"
        status: pass
    human_judgment: false
  - id: D3
    description: "Resize retargeta sem restart; scroll, skip e navegação aceleram para 150–200 ms; reduced motion e falhas WAAPI terminam em UI operável."
    requirement: INTRO-02
    verification:
      - kind: e2e
        ref: "tests/cinematic-intro.spec.ts — resize, três intents, reduced motion e três caminhos fail-open"
        status: pass
      - kind: e2e
        ref: "npx playwright test tests/cinematic-intro.spec.ts --project=emulated-chromium-desktop -g \"continuous|arc|geometry|resize|intent|reduced motion|fail-open\" — 12 passed"
        status: pass
    human_judgment: false
  - id: D4
    description: "O preview normal não expõe controller/probe de teste e entradas por fragmento continuam completas, focáveis e navegáveis."
    requirement: INTRO-02
    verification:
      - kind: e2e
        ref: "tests/cinematic-intro.spec.ts#continuous production preview exposes no injected intro namespace"
        status: pass
      - kind: e2e
        ref: "tests/cinematic-intro.spec.ts#geometry fragment entry bypasses the intro and keeps the target operable"
        status: pass
    human_judgment: false
duration: 1h 52min
completed: 2026-07-26
status: complete
---

# Phase 10 Plan 02: Timeline cinematográfica responsiva Summary

**Timeline única de 3000 ms com arco solar responsivo, glow pós-assentamento, retarget FLIP, intenção acelerada e conclusão fail-open**

## Performance

- **Duration:** 1h 52min
- **Started:** 2026-07-26T15:57:39Z
- **Completed:** 2026-07-26T17:49:10Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Tornou normativa e executável a direção simplificada aprovada: paisagem contínua, um sol em arco diagonal e nenhuma nuvem, reflexão na água ou palmeira.
- Entregou matemática DOM-free e um controller mount-scoped que coordena sete tracks finitos no mesmo relógio de 3000 ms, mede o alvo real e preserva progresso/generation em resize.
- Implementou aceleração de 150–200 ms sem engolir scroll, foco, skip ou navegação, além de reduced motion imediato e fronteira fail-open para os caminhos WAAPI de alto risco.
- Consolidou 59 contratos unitários, 12 casos Playwright focados e 8 casos de regressão visual, mantendo toda instrumentação fora do bundle de produção.

## Task Commits

Cada tarefa foi registrada atomicamente:

1. **Task 1: Canonize the approved direction and define pure timeline/geometry contracts** — `68707b7` (RED), `e5939ac` (GREEN)
2. **Task 2: Run the approved scene on one safe 3000ms controller** — `6ccbe8a` (RED), `46eb19a` (GREEN)
3. **Task 3: Complete focused browser contracts around the approved timeline** — `65cacea`

## Files Created/Modified

- `DESIGN.md` — regras normativas da paisagem contínua, timing, glow e motion safety.
- `src/lib/cinematicIntro.ts` — tipos, constantes e matemática pura de composição, arco, progresso e intenção.
- `src/lib/cinematicIntro.test.ts` — 59 casos para política, geometria, limites e valores inválidos.
- `src/components/invite/Hero.tsx` — tracks, controller, intenção, retarget FLIP e fronteira final fail-open.
- `src/components/layout/Shell.tsx` — skip e chrome marcados semanticamente como intenção sem alterar suas ações.
- `src/index.css` — base identity do wrapper de retarget.
- `tests/cinematic-intro.spec.ts` — registry test-only, seek determinístico, geometria, intent, reduced motion e fault injection.

## Decisions Made

- O baseline humano de 10-01 é obrigatório e supera o texto antigo do plano que ainda citava nuvens, reflexo ou palmeiras.
- Os perfis desktop/mobile usam proporções do stage para compor o percurso, mas o último keyframe é sempre `transform: none` no alvo real.
- O glow permanece em opacidade zero até 83%, depois do assentamento do sol em 82%; não existe brilho antecipado no sky base.
- O copy principal inicia em 2280 ms, o secundário em 2640 ms e ambos terminam até 2970 ms, preservando precedência e a janela total de 690 ms.
- A correção de resize vive no wrapper `[data-intro-sun-retarget]`, separada do percurso artístico do sol canônico.
- O teste captura o rate no instante de `updatePlaybackRate`; latência do runner não é usada como relógio da regra de 150–200 ms.

## Deviations from Plan

### User-directed approved-direction override

**1. A direção aprovada substituiu ornamentos ainda citados no texto de ação**

- **Found during:** Task 1 (precondição de aprovação).
- **Issue:** partes antigas do plano/research ainda pediam nuvens, reflexo na água e palmeiras, contrariando o feedback explícito e o `10-01-SUMMARY.md`.
- **Direction:** preservar as contact sheets aprovadas, sem os três elementos, e manter o brilho ausente até o sol chegar.
- **Fix:** DESIGN, produção e testes canonizam a composição simplificada; as camadas rejeitadas não reaparecem.
- **Files modified:** `DESIGN.md`, `src/components/invite/Hero.tsx`, `tests/cinematic-intro.spec.ts`.
- **Verification:** regressão visual 8/8 e inspeção estrutural sem as camadas rejeitadas.
- **Committed in:** `e5939ac` e `46eb19a`.

### Auto-fixed Issues

**2. [Rule 1 - Bug] Corrigido fixture de deslocamento geométrico**

- **Found during:** Task 2 (alinhamento ao perfil visual aprovado).
- **Issue:** o deslocamento combinado de stage e target no fixture anterior se anulava matematicamente após alinhar o perfil ao storyboard, deixando a asserção incapaz de provar recomposição.
- **Fix:** o target deslocado passou de `left: 930` para `left: 900`, produzindo uma variação real e mantendo o teste independente de pixels fixos de endpoint.
- **Files modified:** `src/lib/cinematicIntro.test.ts`.
- **Verification:** 59/59 testes unitários.
- **Committed in:** `46eb19a`.

---

**Total deviations:** 2 (1 direção explícita do checkpoint, 1 correção de fixture).
**Impact on plan:** o objetivo e os requisitos foram preservados; a única mudança visual remove contradições já resolvidas pelo usuário, sem expansão de escopo.

## Issues Encountered

- O sandbox bloqueou o bind local do preview com `EPERM`; os comandos Playwright foram reexecutados com autorização elevada e passaram.
- A primeira leitura wall-clock da aceleração oscilava sob workers paralelos porque o runner observava as animações depois do evento. O probe passou a registrar sincronamente cada `updatePlaybackRate`; a repetição ficou verde em 5/5.
- A regressão visual regenera as contact sheets como efeito do teste. Após validar 8/8, os dois PNGs foram restaurados ao baseline humano aprovado, sem alteração pendente.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- O Plano 10-03 pode ampliar a matriz de lifecycle/remount/bfcache e falhas de `finish`/`cancel`, sem reabrir a direção visual aprovada.
- O gate de hardware real e cross-browser continua pertencendo a 10-03; não há bloqueio técnico conhecido para iniciá-lo.
- STATE, ROADMAP e REQUIREMENTS não foram alterados por este executor.

## Self-Check: PASSED

- A aprovação explícita dos cinco critérios existe em `10-01-SUMMARY.md`.
- `npm test -- src/lib/cinematicIntro.test.ts`: 1 arquivo, 59 testes aprovados.
- `npm run build`: TypeScript e Vite aprovados.
- Gate Playwright focado: 12/12 aprovados.
- Regressão visual Chromium: 8/8 aprovada.
- Repetição do contrato de intent: 5/5 aprovada.
- Um único `[data-intro-sun]` termina alinhado ao alvo real em desktop e mobile.
- Produção não contém `data-testid`, namespace `__pw*` ou controller de teste.
- Os commits `68707b7`, `e5939ac`, `6ccbe8a`, `46eb19a` e `65cacea` estão presentes.

---
*Phase: 10-abertura-cinematogr-fica-do-p-r-do-sol*
*Completed: 2026-07-26*
