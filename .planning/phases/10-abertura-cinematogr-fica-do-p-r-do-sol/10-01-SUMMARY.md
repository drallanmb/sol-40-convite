---
phase: 10-abertura-cinematogr-fica-do-p-r-do-sol
plan: "01"
subsystem: ui
tags: [react, waapi, playwright, motion, accessibility, visual-testing]
requires:
  - phase: 02-convite-p-blico
    provides: hero responsivo, sol canônico, paisagem CSS/SVG e navegação acessível
provides:
  - lifecycle playing/complete com duração nominal de 3000 ms e fail-open
  - storyboard editorial contínuo com um único sol canônico
  - composição desktop e mobile aprovada em 0/40/70/88/100%
  - instrumentação WAAPI exclusivamente injetada pelo Playwright
  - baseline visual aprovado para os Planos 10-02 e 10-03
affects: [10-02, 10-03, hero, motion, accessibility, visual-baselines]
tech-stack:
  added: []
  patterns:
    - efeitos WAAPI finitos coordenados por owners semânticos data-intro-track
    - instrumentação de seek criada somente por page.addInitScript
    - CSS base autoritativo no frame final para conclusão fail-open
key-files:
  created:
    - tests/cinematic-intro-visual.spec.ts
    - .planning/phases/10-abertura-cinematogr-fica-do-p-r-do-sol/artifacts/intro-keyframes-desktop.png
    - .planning/phases/10-abertura-cinematogr-fica-do-p-r-do-sol/artifacts/intro-keyframes-mobile.png
  modified:
    - src/lib/cinematicIntro.ts
    - src/lib/cinematicIntro.test.ts
    - src/routes/Home.tsx
    - src/components/layout/Shell.tsx
    - src/components/invite/Hero.tsx
    - src/index.css
key-decisions:
  - "A direção aprovada elimina completamente nuvens, reflexo/brilho na água e coqueiros; esses elementos não devem reaparecer nos Planos 10-02 ou 10-03."
  - "O sol assenta no alvo real em 82%; o brilho ambiental permanece ausente durante o percurso e só pode começar em 83%, tornando-se perceptível em 88%."
  - "A cena usa um único sol canônico e o frame final é o próprio hero responsivo, sem clone, troca de fundo ou handoff."
  - "Seek e namespace existem somente quando o Playwright injeta a instrumentação antes da navegação."
patterns-established:
  - "Fail-open visual: qualquer falha promove imediatamente o DOM base final, visível, não-inert e operável."
  - "Onset semântico: cada grupo de copy deixa inert somente quando sua própria opacidade começa a aparecer."
  - "Baseline humano: contato visual aprovado é insumo obrigatório para a timeline, não consequência automática de testes verdes."
requirements-completed:
  - INTRO-01
  - INTRO-02
coverage:
  - id: D1
    description: "Lifecycle playing/complete preserva entradas elegíveis e converge reduced motion, fragmentos diretos e falhas ao hero final operável."
    requirement: INTRO-02
    verification:
      - kind: unit
        ref: "npm test -- src/lib/cinematicIntro.test.ts — 29 passed"
        status: pass
      - kind: e2e
        ref: "tests/cinematic-intro-visual.spec.ts#reduced motion and direct fragments expose the final operable hero immediately"
        status: pass
      - kind: e2e
        ref: "tests/cinematic-intro-visual.spec.ts#a WAAPI setup failure fails open without an uncaught page error"
        status: pass
    human_judgment: false
  - id: D2
    description: "Paisagem contínua desktop/mobile conduz o sol em arco diagonal até o hero real, sem nuvens, reflexo d'água ou coqueiros."
    requirement: INTRO-01
    verification:
      - kind: automated_ui
        ref: "tests/cinematic-intro-visual.spec.ts#generates deterministic desktop and mobile cinematic contact sheets"
        status: pass
      - kind: manual_procedural
        ref: "Aprovação explícita do usuário em 2026-07-26: `Segue` sobre os baselines finais"
        status: pass
    human_judgment: true
    rationale: "Qualidade editorial, continuidade perceptual, direção mobile e leitura de câmera exigem julgamento humano; o usuário aprovou explicitamente as duas contact sheets finais."
  - id: D3
    description: "O brilho ambiental fica ausente em 0/40/70%, começa somente depois do assentamento do sol e está estabelecido no hero final."
    requirement: INTRO-01
    verification:
      - kind: automated_ui
        ref: "tests/cinematic-intro-visual.spec.ts — sol assentado em 82%, glow zero até 83%, visível em 88% e completo em 100%"
        status: pass
      - kind: manual_procedural
        ref: "Aprovação explícita do usuário em 2026-07-26 após solicitar o brilho somente depois da chegada"
        status: pass
    human_judgment: true
    rationale: "A suavidade da ponte luminosa é perceptual; o usuário aprovou a sequência corrigida."
  - id: D4
    description: "Copy invisível permanece inert até seu onset, enquanto skip link e topbar visíveis continuam utilizáveis."
    requirement: INTRO-02
    verification:
      - kind: e2e
        ref: "tests/cinematic-intro-visual.spec.ts#copy groups unlock at their own visible onset without blocking chrome"
        status: pass
      - kind: e2e
        ref: "tests/cinematic-intro-visual.spec.ts#normal playback keeps invisible CTAs inert and unlocks hierarchy in order"
        status: pass
    human_judgment: false
  - id: D5
    description: "A namespace de timeline é ausente no preview normal e registra somente animações finitas semanticamente marcadas quando injetada pelo Playwright."
    requirement: INTRO-02
    verification:
      - kind: e2e
        ref: "tests/cinematic-intro-visual.spec.ts#normal production preview exposes no Playwright timeline namespace"
        status: pass
      - kind: e2e
        ref: "tests/cinematic-intro-visual.spec.ts#injected wrapper delegates non-intro and infinite animations unchanged"
        status: pass
    human_judgment: false
duration: 51 min
completed: 2026-07-26
status: complete
---

# Phase 10 Plan 01: Storyboard editorial contínuo Summary

**Hero cinematográfico com arco solar, luz pós-assentamento e composições desktop/mobile aprovadas como baseline da timeline**

## Performance

- **Duration:** 51 min
- **Started:** 2026-07-26T15:00:48Z
- **Completed:** 2026-07-26T15:51:12Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments

- Substituiu o lifecycle rejeitado por `playing | complete`, relógio nominal de 3000 ms e conclusão fail-open sem bloquear a navegação.
- Transformou o hero real em uma cena contínua e responsiva com um único sol em arco diagonal, recuo sutil de câmera, horizonte, mar e hierarquia progressiva de copy.
- Criou instrumentação Playwright test-only, provas de acessibilidade/onset/falha e duas contact sheets determinísticas em 0/40/70/88/100%.
- Incorporou o feedback visual bloqueante: removeu nuvens, reflexo na água e coqueiros, e adiou o brilho ambiental até depois do sol assentar.
- Obteve aprovação humana explícita das duas composições finais para servir de baseline ao Plano 10-02.

## Task Commits

1. **Task 1: Retire the rejected phase model and make the approval gate fail-safe** — `449e4fc` (RED), `fc8484c` (GREEN)
2. **Task 2: Build the continuous editorial storyboard and deterministic contact sheets** — `a652728`, com revisões de checkpoint em `023ba17` e `820d848`
3. **Task 3: Approve or reject the art direction before timeline/lifecycle execution** — aprovação humana `Segue` registrada neste fechamento documental

## Files Created/Modified

- `src/lib/cinematicIntro.ts` — lifecycle `playing | complete`, duração nominal e razões de conclusão.
- `src/lib/cinematicIntro.test.ts` — contrato unitário da política de entrada, fragmentos e fail-open.
- `src/routes/Home.tsx` — coordenação mount-scoped e promoção ao estado final.
- `src/components/layout/Shell.tsx` — chrome acessível sem blanket inert.
- `src/components/invite/Hero.tsx` — cena real, arco solar, tracks de luz/câmera/copy e coordenação de inert.
- `src/index.css` — composição editorial final desktop/mobile e frame base autoritativo.
- `tests/cinematic-intro-visual.spec.ts` — instrumentação externa, seek coordenado, acessibilidade, bypass, falha e composição das pranchas.
- `artifacts/intro-keyframes-desktop.png` — baseline aprovado de 1280x800.
- `artifacts/intro-keyframes-mobile.png` — baseline aprovado de 320x760.

## Human Approval Record

- **Data:** 2026-07-26
- **Sinal explícito:** `Segue`
- **Escopo aprovado:** as contact sheets finais versionadas em `820d848`, depois das duas rodadas de feedback bloqueante.
- **Qualidade editorial:** aprovada na composição simplificada, sem as camadas rejeitadas.
- **Continuidade da paisagem:** aprovada entre céu, horizonte, mar e hero real.
- **Ponte luminosa:** aprovada na forma revisada — sem reflexo d'água; o halo ambiental aparece somente depois do sol assentar.
- **Direção mobile:** aprovada como composição vertical própria, sem palmeiras ou faixa de reflexo.
- **Câmera versus zoom:** aprovado o recuo sutil do enquadramento junto ao arco solar.
- **Hierarquia final:** aprovado que data/título precedem convite e CTAs, mantendo 100% reconhecível como o hero do convite.

## Decisions Made

- O feedback do checkpoint prevalece sobre referências anteriores da fase: nuvens, reflexo na água e coqueiros estão fora da direção aprovada.
- O marco de assentamento do sol é 82%; o brilho ambiental continua em zero até 83%, começa depois da chegada, aparece em 88% e termina completo em 100%.
- Os PNGs versionados em `820d848` são os baselines humanos que o Plano 10-02 deve preservar ao implementar a timeline completa.
- A automação pode provar geometria, ordenação, acessibilidade e falha segura, mas não substitui o gate humano de qualidade visual.

## Deviations from Plan

### User-directed checkpoint revisions

**1. Remoção das camadas decorativas originalmente planejadas**

- **Found during:** Task 3, primeira rodada de verificação humana.
- **Issue:** nuvens, reflexo/brilho na água e coqueiros prejudicavam a leitura editorial desejada.
- **Direction:** o usuário pediu explicitamente a remoção dos três elementos.
- **Fix:** markup, tracks WAAPI, CSS e seletores obsoletos foram removidos, e os testes passaram a provar sua ausência estrutural.
- **Files modified:** `src/components/invite/Hero.tsx`, `src/index.css`, `tests/cinematic-intro-visual.spec.ts` e ambas as contact sheets.
- **Verification:** 29 testes unitários, build e 8 testes Playwright; inspeção desktop/mobile.
- **Committed in:** `023ba17`.

**2. Brilho ambiental adiado até a chegada do sol**

- **Found during:** Task 3, segunda rodada de verificação humana.
- **Issue:** o halo fixo no fundo aparecia durante o percurso e antecipava a transformação luminosa.
- **Direction:** o usuário determinou que o brilho do fundo surgisse somente depois da chegada.
- **Fix:** o halo foi retirado do sky base; o sol assenta em 82%, warm horizon/haze permanecem em zero até 83% e começam a revelar em direção a 88%.
- **Files modified:** `src/components/invite/Hero.tsx`, `src/index.css`, `tests/cinematic-intro-visual.spec.ts` e ambas as contact sheets.
- **Verification:** assertions determinísticas em 0/40/70/82/83/88/100%, 29 testes unitários, build e 8 testes Playwright.
- **Committed in:** `820d848`.

---

**Total deviations:** 2 user-directed checkpoint revisions.
**Impact on plan:** as revisões alteram a lista de ornamentos e o timing da ponte luminosa, mas preservam o objetivo, o sol canônico, a paisagem contínua, o mobile dirigido, o fail-open e a acessibilidade.

## Issues Encountered

- A direção inicial do plano foi rejeitada como seca e prototípica; o checkpoint funcionou como gate real e impediu avanço prematuro.
- O Playwright serializa `opacity` de keyframes como string; a asserção foi normalizada antes do commit final.
- A verificação final reexecutou o gerador; os PNGs aprovados e já versionados em `820d848` foram preservados como alvo exato da aprovação humana.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- O Plano 10-02 está liberado pela aprovação humana explícita, mas não foi executado neste plano.
- A timeline completa deve partir dos PNGs versionados em `820d848` e preservar a direção simplificada aprovada.
- Qualquer linguagem anterior que peça nuvens, reflexo d'água ou palmeiras está superada pelo checkpoint; esses elementos não devem retornar.
- O brilho ambiental deve continuar ausente durante a viagem do sol e só começar depois do assentamento de 82%.
- Resize/orientation, intenção de navegação, bfcache e baselines permanentes continuam pertencendo aos Planos 10-02/10-03.

## Self-Check: PASSED

- `npm test -- src/lib/cinematicIntro.test.ts`: 1 arquivo, 29 testes aprovados.
- `npm run build`: TypeScript e Vite aprovados.
- `npx playwright test tests/cinematic-intro-visual.spec.ts --project=emulated-chromium-desktop`: 8/8 aprovados.
- O preview normal não expõe `window.__pwCinematicIntroTimeline`; a namespace aparece apenas com `page.addInitScript`.
- Os dois PNGs aprovados existem, são não vazios e mostram 0/40/70/88/100%.
- `Hero.tsx` contém um único `data-intro-sun`; nuvens, reflexo d'água e palmeiras não existem na estrutura/CSS.
- Reduced motion, fragmentos diretos, falha WAAPI, inert por onset, skip link e topbar estão cobertos.
- Os commits `449e4fc`, `fc8484c`, `a652728`, `023ba17` e `820d848` estão presentes.
- O usuário aprovou explicitamente o baseline final com `Segue`.

---
*Phase: 10-abertura-cinematogr-fica-do-p-r-do-sol*
*Completed: 2026-07-26*
