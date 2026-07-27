---
phase: 10-abertura-cinematogr-fica-do-p-r-do-sol
plan: "02"
subsystem: ui
tags: [react, waapi, resize-observer, playwright, motion, accessibility]
requires:
  - phase: 10-abertura-cinematogr-fica-do-p-r-do-sol
    provides: storyboard 10-01 aprovado, sol canônico e baselines desktop/mobile
provides:
  - matemática pura para composição, arco responsivo normalizado por comprimento, progresso e aceleração
  - timeline WAAPI de 3700 ms com percurso solar constante de 3000 ms, beat pós-chegada, retarget FLIP e conclusão fail-open
  - planos semânticos permanentes que mantêm CTAs acima de toda a paisagem em desktop e mobile
  - intenção de scroll, foco e navegação acelerada sem bloquear a ação original
  - contratos Playwright sem bridge de teste no bundle de produção
affects: [10-03, hero, motion, accessibility, visual-baselines]
tech-stack:
  added: []
  patterns:
    - controller local ao mount com CSS final autoritativo
    - arco derivado de DOMRects reais e retarget em wrapper separado
    - Catmull-Rom reamostrada por comprimento para velocidade espacial aparente constante
    - stacking isolado em planos irmãos: cena 0, metadata 1 e conteúdo 2
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
    - tests/cinematic-intro-visual.spec.ts
key-decisions:
  - "O checkpoint humano 10-01 prevalece sobre referências antigas: nenhuma nuvem, reflexo/brilho na água ou palmeira/coqueiro participa da timeline."
  - "O sol canônico percorre todo o arco em velocidade espacial aparente constante e chega ao alvo real exatamente em 3000 ms, sem ease, settle, hold ou desaceleração."
  - "Warm horizon e haze permanecem zerados inclusive na chegada e começam somente em 3060 ms; o beat pós-chegada termina em 3700 ms."
  - "Primary inicia em 3100 ms, secondary em 3400 ms e CTAs em 3460 ms; os CTAs preservam as cores finais e são revelados apenas por clip/transform."
  - "A cena mantém um stacking context permanente no plano 0; metadata ocupa 1 e todo o conteúdo/CTA ocupa 2, impedindo que z-index decorativo escape após o cancelamento WAAPI."
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
    description: "Composição desktop/mobile, arco diagonal normalizado por comprimento, progress clamp, copy timing e rate de intenção são contratos puros, finitos e responsivos."
    requirement: INTRO-01
    verification:
      - kind: unit
        ref: "npm test -- src/lib/cinematicIntro.test.ts — 62 passed"
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
        ref: "tests/cinematic-intro.spec.ts#continuous scene gives the sun 3000ms of constant travel before the post-arrival beat"
        status: pass
      - kind: e2e
        ref: "tests/cinematic-intro.spec.ts#arc geometry keeps one canonical sun and finishes on the real responsive target"
        status: pass
      - kind: automated_ui
        ref: "tests/cinematic-intro-visual.spec.ts — 8 passed e 2 baselines full-image intencionalmente stale após promover os CTAs; PNGs não foram alterados"
        status: pending
      - kind: manual_procedural
        ref: "10-01-SUMMARY.md — aprovação explícita dos cinco critérios e das duas contact sheets"
        status: pass
    human_judgment: false
  - id: D3
    description: "Resize retargeta sem restart; scroll, skip e navegação aceleram para 150–200 ms; reduced motion e falhas WAAPI terminam em UI operável."
    requirement: INTRO-02
    verification:
      - kind: e2e
        ref: "tests/cinematic-intro.spec.ts — 18 passed, incluindo resize, três intents, lifecycle, reduced motion e caminhos fail-open"
        status: pass
      - kind: e2e
        ref: "npx playwright test tests/cinematic-intro.spec.ts --project=emulated-chromium-desktop -g \"continuous|arc|geometry|resize|intent|reduced motion|fail-open\" — 14 passed"
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
  - id: D5
    description: "O reveal semântico dos CTAs mantém background, borda, texto e filter finais, sem opacity herdada, e usa somente clip/transform enquanto o grupo está inert."
    requirement: INTRO-02
    verification:
      - kind: e2e
        ref: "tests/cinematic-intro.spec.ts#continuous desktop CTA reveal preserves final colors while clipping into view"
        status: pass
      - kind: automated_ui
        ref: "tests/cinematic-intro-visual.spec.ts#copy groups unlock at their own visible onset without blocking chrome"
        status: pass
    human_judgment: false
  - id: D6
    description: "Em desktop e 320px touch, o plano ancestral do CTA fica acima da cena e da metadata durante o reveal e no estado final; elementFromPoint resolve o link e click/tap ativa o href correto."
    requirement: INTRO-02
    verification:
      - kind: e2e
        ref: "tests/cinematic-intro.spec.ts#CTA stack keeps desktop buttons above every hero visual — 2 passed"
        status: pass
      - kind: e2e
        ref: "tests/cinematic-intro.spec.ts#CTA stack keeps 320px mobile buttons above every hero visual — 2 passed"
        status: pass
    human_judgment: false
duration: 1h 52min
completed: 2026-07-26
feedback-revised: 2026-07-26
status: complete
---

# Phase 10 Plan 02: Timeline cinematográfica responsiva Summary

**Percurso solar constante, reveal pós-chegada e CTAs permanentemente acima da paisagem**

## Performance

- **Duration:** 1h 52min
- **Started:** 2026-07-26T15:57:39Z
- **Completed:** 2026-07-26T17:49:10Z
- **Feedback revision:** 2026-07-26
- **Tasks:** 3 originais + 2 revisões
- **Files modified:** 10 no histórico consolidado

## Accomplishments

- Tornou normativa e executável a direção simplificada aprovada: paisagem contínua, um sol em arco diagonal e nenhuma nuvem, reflexão na água ou palmeira.
- Entregou matemática DOM-free com reamostragem por comprimento e um controller mount-scoped que coordena oito tracks: o sol percorre os `3000ms` completos em velocidade aparente constante e a cena conclui após um beat pós-chegada separado de `700ms`.
- Implementou aceleração de 150–200 ms sem engolir scroll, foco, skip ou navegação, além de reduced motion imediato e fronteira fail-open para os caminhos WAAPI de alto risco.
- Revela H1, convite e CTAs por recorte/deslocamento; no desktop os CTAs mantêm exatamente as cores finais de fundo, borda e texto durante todo o reveal.
- Isolou a paisagem num plano permanente e promoveu todo o conteúdo acima de cena e metadata, mantendo os dois CTAs visualmente frontais e operáveis em desktop e 320px touch.
- Consolidou 62 contratos unitários e 20 casos comportamentais ativos por viewport; oito contratos visuais continuam verdes e os dois baselines full-image aguardam regeneração legítima no 10-03.

## Task Commits

Cada tarefa foi registrada atomicamente:

1. **Task 1: Canonize the approved direction and define pure timeline/geometry contracts** — `68707b7` (RED), `e5939ac` (GREEN)
2. **Task 2: Run the approved scene on one safe 3000ms controller** — `6ccbe8a` (RED), `46eb19a` (GREEN)
3. **Task 3: Complete focused browser contracts around the approved timeline** — `65cacea`
4. **Feedback revision: constant 3000ms traversal, post-arrival light and full-color CTA reveal** — `bc5924e` (RED), `1e6aed9` (GREEN)
5. **Feedback revision: keep CTA surfaces above every hero visual** — `2b38c06` (RED), `df9e257` (GREEN)

## Files Created/Modified

- `DESIGN.md` — regras normativas da paisagem contínua, timing, glow e motion safety.
- `src/lib/cinematicIntro.ts` — tipos, constantes e matemática pura de composição, arco, progresso e intenção.
- `src/lib/cinematicIntro.test.ts` — 62 casos para política, geometria, velocidade espacial, limites e valores inválidos.
- `src/components/invite/Hero.tsx` — tracks, controller, intenção, retarget FLIP e fronteira final fail-open.
- `src/components/layout/Shell.tsx` — skip e chrome marcados semanticamente como intenção sem alterar suas ações.
- `src/index.css` — base identity do wrapper de retarget.
- `tests/cinematic-intro.spec.ts` — registry test-only, seek determinístico, geometria, intent, reduced motion e fault injection.
- `tests/cinematic-intro-visual.spec.ts` — timing absoluto, foco por onset e preservação dos endpoints visuais aprovados.

## Decisions Made

- O baseline humano de 10-01 é obrigatório e supera o texto antigo do plano que ainda citava nuvens, reflexo ou palmeiras.
- Os perfis desktop/mobile usam proporções do stage para compor o percurso, mas o último keyframe é sempre `transform: none` no alvo real.
- O sol usa keyframes equidistantes numa curva Catmull-Rom, easing linear e duração própria de `3000ms`; não existe endpoint antecipado nem trecho de settle.
- O glow permanece em opacidade zero até o frame de chegada em `3000ms` e só começa após `3060ms`; não existe brilho ambiental antecipado.
- O copy principal inicia em `3100ms`, o secundário em `3400ms`, os CTAs em `3460ms` e o frame completo fecha em `3700ms`.
- O reveal de CTAs não anima `opacity`, `filter`, background, borda ou cor de texto; a superfície final fica presente e o conteúdo aparece por `clip-path` e `transform`.
- O root isolado do hero define cena `0`, metadata `1` e conteúdo `2`; o plano da cena é permanente, portanto textura `10`, mar `6` e horizonte `5` nunca escapam para cima do CTA quando a câmera deixa de ser transformada.
- O CTA usa apenas um subplano local dentro do conteúdo já promovido; topbar `80` e skip `110` continuam sendo o chrome global intencionalmente superior.
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

**2. A chegada e o reveal foram refeitos como beats separados**

- **Found during:** revisão de feedback do Plano 10-02.
- **Issue:** o assentamento em 82%, o glow em 83% e o reveal com fade produziam desaceleração, encaixe abrupto e aparência de protótipo; nos CTAs, opacity lavava as cores finais.
- **Direction:** percurso inteiro em exatamente `3000ms` e velocidade constante; glow somente depois da chegada; reveal separado e progressivo, com CTAs sempre nas cores finais.
- **Fix:** o arco foi reamostrado por comprimento, o `sun-arc` ganhou duração própria de `3000ms`, a timeline total passou a `3700ms` e o copy foi dividido em três tracks por `clip-path`/`transform`.
- **Files modified:** `DESIGN.md`, `10-VALIDATION.md`, matemática/controller/CSS e os dois specs cinematográficos.
- **Verification:** 62/62 unitários, 18/18 comportamentais, 10/10 visuais e repetição focada sem instabilidade.
- **Committed in:** `bc5924e` e `1e6aed9`.

**3. Os CTAs foram promovidos para a frente de toda a paisagem**

- **Found during:** novo checkpoint visual do usuário.
- **Issue:** a câmera era stacking context somente durante `playing`; depois do cancelamento WAAPI, textura `z10`, mar `z6` e horizonte `z5` escapavam da cena e pintavam sobre o copy `z3`, especialmente no CTA inferior mobile. `pointer-events: none` deixava o clique passar e mascarava o defeito funcionalmente.
- **Direction:** todo o grupo CTA deve permanecer visualmente acima de sol, glow, haze, céu, horizonte, relevo, mar e ondas durante o reveal e no estado final, em desktop e mobile.
- **Fix:** o hero passou a ter planos irmãos semânticos e permanentes — cena `0`, metadata `1`, conteúdo `2` — e o CTA ganhou somente um subplano local dentro do conteúdo já promovido.
- **Files modified:** `DESIGN.md`, `src/components/invite/Hero.tsx`, `src/index.css` e `tests/cinematic-intro.spec.ts`.
- **Verification:** desktop 2/2 e 320px touch 2/2 para paint order, `elementFromPoint`, click/tap e href correto; suítes completas em ambos os viewports passaram com 20 casos ativos e 2 skips do viewport oposto.
- **Committed in:** `2b38c06` e `df9e257`.

### Auto-fixed Issues

**4. [Rule 1 - Bug] Corrigido fixture de deslocamento geométrico**

- **Found during:** Task 2 (alinhamento ao perfil visual aprovado).
- **Issue:** o deslocamento combinado de stage e target no fixture anterior se anulava matematicamente após alinhar o perfil ao storyboard, deixando a asserção incapaz de provar recomposição.
- **Fix:** o target deslocado passou de `left: 930` para `left: 900`, produzindo uma variação real e mantendo o teste independente de pixels fixos de endpoint.
- **Files modified:** `src/lib/cinematicIntro.test.ts`.
- **Verification:** 59/59 testes unitários.
- **Committed in:** `46eb19a`.

---

**Total deviations:** 4 (3 direções explícitas do usuário, 1 correção de fixture).
**Impact on plan:** o objetivo e os requisitos foram preservados; as três revisões visuais seguem feedback explícito do usuário, sem expansão de escopo.

## Issues Encountered

- O sandbox bloqueou o bind local do preview com `EPERM`; os comandos Playwright foram reexecutados com autorização elevada e passaram.
- A primeira leitura wall-clock da aceleração oscilava sob workers paralelos porque o runner observava as animações depois do evento. O probe passou a registrar sincronamente cada `updatePlaybackRate`; a repetição ficou verde em 5/5.
- O comparador full-image permaneceu estrito e nenhum PNG foi alterado. Após a promoção correta dos CTAs, os dois baselines antigos falham honestamente apenas pelo overpaint que deixaram de registrar: `0,7%` desktop e `2,3%` mobile. O 10-03 deve regenerá-los legitimamente na revalidação sequencial.
- Uma tentativa local de mascarar o retângulo do CTA foi rejeitada antes do fechamento; `bc7d1bd` foi integralmente revertido por `b4f1b2b`, e não resta lógica de exclusão no comparador.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- A matriz funcional do Plano 10-03 continua verde após a revisão; os dois PNGs full-image precisam ser regenerados e revalidados pelo 10-03 antes do gate final.
- O gate de hardware real permanece pendente e deve avaliar os tempos absolutos e a nova precedência visual dos CTAs em ambos os viewports.
- O registro `10-UAT.md` não foi alterado por este feedback para não confundir automação verde com aprovação humana.
- STATE, ROADMAP e REQUIREMENTS não foram alterados por este executor.

## Self-Check: FUNCTIONAL PASSED; PIXEL BASELINE HANDOFF OPEN

- A aprovação explícita dos cinco critérios existe em `10-01-SUMMARY.md`.
- `npm test -- src/lib/cinematicIntro.test.ts`: 1 arquivo, 62 testes aprovados.
- `npm run build`: TypeScript e Vite aprovados.
- Suíte Playwright comportamental desktop: 20 casos ativos aprovados e 2 mobile-only skips.
- Suíte Playwright comportamental 320px touch: 20 casos ativos aprovados e 2 desktop-only skips.
- Gate Playwright 10-02 documentado: 14/14 aprovado.
- Regressão visual Chromium: 8/10 aprovada; 2 baselines full-image stale aguardam regeneração no 10-03 (`0,7%` desktop, `2,3%` mobile).
- Repetição de chegada, cores, stacking e interação: 20/20 desktop e 20/20 mobile.
- Um único `[data-intro-sun]` termina alinhado ao alvo real em desktop e mobile.
- `elementFromPoint` resolve cada CTA no reveal/final, e click/tap ativa o href correto sem interceptação da cena.
- Produção não contém `data-testid`, namespace `__pw*` ou controller de teste.
- O comparador full-image não contém máscara/exclusão de CTA; os snapshots e `10-UAT.md` não foram alterados nesta revisão.
- Os commits `2b38c06`, `df9e257` e a reversão `b4f1b2b` estão presentes além do histórico anterior.

---
*Phase: 10-abertura-cinematogr-fica-do-p-r-do-sol*
*Completed: 2026-07-26*
