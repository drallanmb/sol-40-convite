---
phase: 10-abertura-cinematogr-fica-do-p-r-do-sol
verified: 2026-07-26T12:23:59Z
status: gaps_found
score: 11/14 must-haves verified
behavior_unverified: 2
overrides_applied: 0
gaps:
  - truth: "Conteúdo, navegação e foco nunca ficam presos pela abertura, inclusive quando a Web Animations API falha."
    status: failed
    reason: "Hero.tsx chama animate(), finish() e cancel() sem uma fronteira try/catch/finally fail-open. Uma exceção síncrona pode impedir onIntroDescentComplete(), manter introPhase em descending e deixar header/CTAs invisíveis e inert indefinidamente."
    artifacts:
      - path: "src/components/invite/Hero.tsx"
        issue: "Criação e conclusão da Animation não garantem a transição para revealing/complete quando WAAPI lança."
      - path: "tests/cinematic-intro.spec.ts"
        issue: "Não há contrato que substitua animate/finish/cancel por uma implementação que lança e prove o reveal fail-open."
    missing:
      - "Encapsular criação e conclusão WAAPI em try/catch/finally idempotente que sempre chama onIntroDescentComplete()."
      - "Adicionar regressão browser para WAAPI throwing e provar header, hero e controles visíveis e operáveis."
behavior_unverified_items:
  - truth: "A continuidade perceptual do único disco e halo não apresenta swap ou blink em hardware real."
    test: "Assistir uma entrada natural em 320px, tablet e desktop em Chrome/Safari reais."
    expected: "O mesmo sol atravessa o céu e pousa sem flash, troca de nó, salto ou alteração perceptível de disco/halo."
    why_human: "Identidade do nó e geometria são automatizadas, mas composição perceptual e rasterização final dependem de navegador e hardware reais."
  - truth: "Uma restauração real por bfcache reinicia somente uma entrada elegível sem foco, listener ou Animation obsoletos."
    test: "Em Chrome/Safari reais, sair de / para /confirmar e voltar pelo botão Back em uma navegação admitida no bfcache."
    expected: "A abertura reinicia uma vez, o skip continua soberano e não restam foco, listener ou handle de animação obsoletos."
    why_human: "O evento pageshow.persisted e o cleanup são testados sinteticamente, mas admissão real no bfcache depende da política do navegador."
---

# Phase 10: Abertura cinematográfica do pôr do sol — Verification Report

**Phase Goal:** Criar uma abertura de primeira entrada em que o sol atravessa o céu, se põe e termina exatamente sobre o sol real do hero, formando uma única cena contínua em qualquer viewport.
**Verified:** 2026-07-26T12:23:59Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| Plano | Truth | Status | Evidence |
|---|---|---|---|
| 10-01 | Primeiro frame elegível mostra somente o céu final, sem flash do hero, mar, copy ou ações | ✓ VERIFIED | Contrato `first frame` em `tests/cinematic-intro.spec.ts`; CSS e estado inicial síncrono ocultam chrome/reveal antes da WAAPI. |
| 10-01 | Único sol parte acima da viewport e converge ao wrapper real com erro máximo de 1 CSS px | ✓ VERIFIED | Matriz DOMRect e identidade do nó passou em 320×760, 768×1024 e 1280×800. |
| 10-01 | Descida usa 2000ms/easing contratado e reveal de 260ms sem opacidade no sol | ✓ VERIFIED | Constantes unitárias, inspeção WAAPI e smoke natural `descending → revealing → complete`. |
| 10-01 | Reduced motion e hash inicial não elegível começam em complete sem WAAPI/fade | ✓ VERIFIED | Casos unitários e Playwright em Chromium/WebKit desktop/mobile. |
| 10-02 | Durante descending a camada visual não captura clique, toque ou teclado; página segue rolável | ✓ VERIFIED | Elementos decorativos são pointer-transparent; testes de skip, scroll e ausência de overflow passaram. |
| 10-02 | Scroll intencional de 4px conclui no alvo sem restaurar a posição escolhida | ✓ VERIFIED | Caso `scroll cancellation` prova limiar, alinhamento e preservação de `window.scrollY`. |
| 10-02 | Skip permanece primeiro foco, acima da cena e fora de qualquer ancestral inert | ✓ VERIFIED | Caso de teclado executa o skip antes de finalizar a intro. |
| 10-02 | Header/rail e grupos do hero sempre saem de inert e ficam operáveis sem aprisionar navegação/foco | ✗ FAILED | No caminho normal, revealing remove inert no início do fade. Porém `Hero.tsx` não trata exceções de `animate()/finish()/cancel()`; o callback de conclusão pode não ocorrer e a UI permanecer em `descending` indefinidamente. |
| 10-02 | Nova montagem/pageshow elegíveis reiniciam; scroll/topo/#inicio na mesma montagem não reiniciam | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Remount e `pageshow.persisted` sintético passam; admissão/restauração real pelo bfcache depende do navegador e requer backstop humano. |
| 10-02 | Fragmento inicial conhecido diferente de #inicio pula a abertura e rola por getElementById | ✓ VERIFIED | Allowlist unitária e casos de rota/fragmento Playwright. |
| 10-03 | Geometria converge nos três viewports e após resize antes de finish | ✓ VERIFIED | Matriz específica passou 40/40 com tolerância absoluta de 1 CSS px. |
| 10-03 | Chromium/WebKit preservam primeiro frame, foco, fragmentos, reduced motion e lifecycle sem overflow | ✓ VERIFIED | Matriz desktop/mobile passou nos quatro projetos configurados. |
| 10-03 | Smoke não instrumentado termina naturalmente em aproximadamente 2s + reveal | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Timing e sequência são automatizados; ausência perceptual de blink/swap na composição final exige observação em hardware real. |
| 10-03 | Release prova skip antes do reveal e navegação desktop/mobile depois, sem branch silencioso | ✓ VERIFIED | `npm run test:release` passou 607 Vitest, build e 120 Playwright; branches são obrigatórios por viewport. |

**Score:** 11/14 truths verified (2 present, behavior-unverified; 1 failed).

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/lib/cinematicIntro.ts` | Política, constantes e tipos da abertura | ✓ EXISTS + SUBSTANTIVE | Exporta fases, duração/easing, elegibilidade, fragmentos e limiar de scroll; 25 testes focados passaram. |
| `src/routes/Home.tsx` | Coordenação mount-scoped, fragmentos, reduced motion e bfcache | ✓ EXISTS + SUBSTANTIVE + WIRED | Resolve fase inicial, geração, `pageshow.persisted`, fragment scroll e passa o estado ao Shell/Hero. |
| `src/components/invite/Hero.tsx` | Sol canônico medido/animado, scroll e cleanup | ⚠️ SUBSTANTIVE + WIRED, GAP | Geometria e lifecycle normal funcionam; falta fail-open quando chamadas WAAPI lançam. |
| `src/components/layout/Shell.tsx` | Chrome revelável/inert sem cobrir skip/main | ✓ EXISTS + SUBSTANTIVE + WIRED | Skip fica fora do header inert; rotas não-Home usam defaults seguros. |
| `src/index.css` | Primeiro frame, reveal e camadas decorativas | ✓ EXISTS + SUBSTANTIVE + WIRED | Estados `descending/revealing/complete` e pointer transparency estão ligados aos atributos do DOM. |
| `tests/cinematic-intro.spec.ts` | Matriz determinística da abertura | ✓ EXISTS + SUBSTANTIVE | 40/40 cenários específicos passaram; não cobre WAAPI throwing. |
| `tests/release.spec.ts` | Regressão ampla consciente da intro | ✓ EXISTS + SUBSTANTIVE | Gate final passou 120/120 Playwright. |

**Artifacts:** 7/7 existem e estão ligados; 1 possui lacuna comportamental.

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `Home.tsx` | `cinematicIntro.ts` | `resolveInitialIntroPhase`, hash e reduced motion | ✓ WIRED | Primeiro estado é resolvido antes do paint elegível. |
| `Home.tsx` | `Hero.tsx` / `Shell.tsx` | `introPhase`, `runGeneration`, callback e props | ✓ WIRED | Fase única coordena arte e chrome. |
| `Hero.tsx` | DOM target/visual | `getBoundingClientRect()` + WAAPI transform | ✓ WIRED | Endpoint responsivo usa geometria renderizada real. |
| `Hero.tsx` | `Home.tsx` | `onIntroDescentComplete` | ✗ INCOMPLETE | Caminho de sucesso liga as fases; exceções WAAPI podem impedir o callback. |
| `Shell.tsx` | skip / `#conteudo` | ordem DOM e inert limitado ao header | ✓ WIRED | Skip permanece acessível durante descending. |
| Specs | projetos Playwright | Chromium/WebKit desktop/mobile | ✓ WIRED | Matriz e gate de release exercitam todos os projetos. |

**Wiring:** 5/6 conexões plenamente verificadas.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Build de produção | `npm run build` | Vite/TypeScript concluído | ✓ PASS |
| Unidade/regressão | `npm test` | 32 arquivos, 607 testes | ✓ PASS |
| Matriz da abertura | `npx playwright test tests/cinematic-intro.spec.ts` | 40/40 | ✓ PASS |
| Release gate | `npm run test:release` | 607 Vitest + build + 120/120 Playwright | ✓ PASS |
| Exceção síncrona WAAPI | inexistente | Não exercitado; inspeção mostra ausência de fail-open | ✗ FAIL |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|---|---|---|---|---|
| INTRO-01 | 10-01, 10-02, 10-03 | Sol se põe e termina na geometria responsiva real sem salto visual | ? NEEDS HUMAN | Geometria, identidade do nó e timing estão automatizados; ausência perceptual de blink em hardware real permanece pendente. |
| INTRO-02 | 10-01, 10-02, 10-03 | Preservar interação, mobile e acessibilidade, incluindo reduced motion | ✗ BLOCKED | Caminhos normais e reduced motion passam, mas uma exceção WAAPI pode deixar controles invisíveis/inert indefinidamente. |

**Coverage:** 0/2 requisitos totalmente encerrados; INTRO-01 aguarda backstop perceptual e INTRO-02 possui 1 gap bloqueante.

### Anti-Patterns and Review Findings

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `src/components/invite/Hero.tsx` | 51–55, 87–101 | WAAPI sem `try/catch/finally` fail-open | 🛑 Blocker | Pode prender a abertura e a navegação em `descending`. |
| `src/index.css` | 178–184 | Regra de produção depende de `data-testid` | ⚠️ Warning | Renomear hook de teste pode quebrar o primeiro frame; dívida consultiva, não invalida o goal atual. |
| `tests/release.spec.ts` | 33–40 | Helper Axe ignora impactos moderate/minor apesar do nome AA | ⚠️ Warning | O nome pode superestimar a cobertura WCAG; não é regressão introduzida no comportamento da intro. |

### Prohibition Review

| Prohibition | Status | Evidence |
|---|---|---|
| Não transformar a abertura em loading/progresso/spinner/hero substituto | ✓ HONORED | A Home monta diretamente e a duração é uma animação de entrada, sem loading ou storage. |
| Não deixar controles invisíveis interativos nem prender foco/pointer | ✗ VIOLATED ON FAILURE PATH | O caminho normal limita inert corretamente, mas exceção WAAPI pode manter header/CTAs invisíveis e inert sem saída. |
| Não executar descida/fade amplo em reduced motion nem ocultar a cena final | ✓ HONORED | Reduced motion começa em complete, sem WAAPI finita, com arte final visível. |

### Human Verification Required

#### 1. Continuidade perceptual sem swap/blink

**Test:** Assistir uma execução natural em 320px, tablet e desktop em Chrome/Safari reais.
**Expected:** O mesmo disco e halo atravessam o céu e pousam sem flash, salto ou troca perceptível.
**Why human:** DOM identity e geometria são verificadas, mas rasterização/composição final dependem do hardware.

#### 2. Restauração bfcache real

**Test:** Em Chrome/Safari reais, navegar de `/` para `/confirmar` e voltar pelo botão Back quando a página for admitida no bfcache.
**Expected:** A abertura reinicia uma vez; skip, foco e listeners permanecem corretos e não há Animation obsoleta.
**Why human:** O evento sintético passa, mas a admissão real no bfcache é controlada pelo navegador.

### Gaps Summary

#### Critical Gap

1. **Conclusão WAAPI não é fail-open**
   - **Missing:** proteção idempotente com `try/catch/finally` em `animate()`, `finish()` e `cancel()`, garantindo `onIntroDescentComplete()` mesmo quando a API lança.
   - **Impact:** a Home pode permanecer com header e CTAs invisíveis/inert, violando o Success Criterion 3, INTRO-02 e a proibição P-10-02.
   - **Fix:** implementar a fronteira fail-open e um teste Playwright que força uma exceção WAAPI e prova o reveal/operabilidade.

#### Non-Critical Debt

1. Trocar o seletor CSS de produção baseado em `data-testid` por atributo semântico.
2. Alinhar o nome/política do helper Axe ao conjunto de violações realmente bloqueado.

## Recommended Fix Plan

### 10-04-PLAN.md: Fail-open da abertura

**Objective:** impedir que qualquer falha síncrona da Web Animations API prenda conteúdo, navegação ou foco.

**Tasks:**
1. Adicionar conclusão idempotente protegida por `try/catch/finally` em `Hero.tsx`.
2. Adicionar contrato browser para `animate`, `finish` e/ou `cancel` lançando e provar reveal/operabilidade.
3. Reexecutar matriz da abertura e release gate.

**Estimated scope:** Small

## Verification Metadata

**Verification approach:** Goal-backward, com inspeção independente de artefatos, wiring, testes e review adversarial.
**Must-haves source:** frontmatter de `10-01-PLAN.md`, `10-02-PLAN.md` e `10-03-PLAN.md`.
**Automated checks:** build, 607 Vitest, 40 Playwright específicos e 120 Playwright de release aprovados.
**Human checks required:** 2 backstops preservados.
**Code review:** 0 críticos, 3 warnings; WR-01 foi promovido a gap por contrariar diretamente SC3/INTRO-02.
**Overrides applied:** 0.

---
_Verified: 2026-07-26T12:23:59Z_
_Verifier: Codex (gsd-verifier analysis, materialized by orchestrator after agent timeout)_
