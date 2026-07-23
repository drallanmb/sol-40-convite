---
phase: 01-funda-o-design-system-deploy
plan: 03
subsystem: ui
tags: [tailwindcss-v4, design-tokens, fontsource, react, design-system]

requires:
  - phase: 01-funda-o-design-system-deploy (plano 01)
    provides: Scaffold Vite + React + TS + Tailwind v4 + Convex + React Router v7
provides:
  - Paleta "pôr do sol" (cream/sand/peach/coral/orange/plum/wine/ink/sea) e paleta RSVP sem verde disponíveis como tokens `--color-*` no @theme, gerando utilitárias Tailwind
  - Fontes self-hosted Alegreya (serif/display) e Gabarito (sans/corpo) via @fontsource-variable, sem CDN
  - Escala tipográfica fluida (caption/small/body/lead/subheading/heading/display), tracking, duration e easing como tokens do tema
  - Quatro primitivos de UI reutilizáveis: Button (primary/quiet), Field (input/textarea), Card, Toast
  - Shell base (topbar + main + footer) mobile-first
  - Preview do design system renderizado na Home para verificação visual
affects: [02-convite-publico, 03-rsvp, 04-vinhos, 05-mural, 06-admin-auth]

tech-stack:
  added: []
  patterns:
    - "Tokens de cor/fonte/tipografia/tracking/duration/easing portados 1:1 (mesmos nomes e valores) do :root do globals.css antigo para @theme do Tailwind v4 — mantém consistência com o material de referência do dono"
    - "Tokens sem namespace oficial do Tailwind v4 (--duration-*, --z-*) consumidos via sintaxe de parênteses (duration-(--duration-fast), z-(--z-toast)) em vez de nomes de utilitária direta, que não geram CSS para esses namespaces"
    - "--space-* e --z-* mantidos como variáveis CSS simples (não namespace oficial do Tailwind), espelhando a nomenclatura do arquivo antigo"
    - "Primitivos de UI tipados em src/components/ui/, sem lib de terceiro (React + Tailwind apenas); renderização de texto sempre via JSX (auto-escape), proibido dangerouslySetInnerHTML"
    - "Field.tsx usa union discriminada (multiline?: false | true) para alternar entre InputHTMLAttributes e TextareaHTMLAttributes com segurança de tipos"

key-files:
  created:
    - src/components/ui/Button.tsx
    - src/components/ui/Field.tsx
    - src/components/ui/Card.tsx
    - src/components/ui/Toast.tsx
    - src/components/layout/Shell.tsx
  modified:
    - src/index.css
    - src/routes/Home.tsx

key-decisions:
  - "duration-fast/duration-medium não geram utilitária Tailwind nomeada (sem namespace --duration-* reconhecido oficialmente) — confirmado empiricamente inspecionando o CSS buildado; trocado para sintaxe de parênteses duration-(--duration-fast), que resolve corretamente para transition-duration"
  - "z-toast/z-sticky idem — sem namespace --z-* oficial; usado z-(--z-toast) (sintaxe documentada pelo Tailwind v4 para arbitrary values referenciando uma CSS var diretamente)"
  - "tracking-label/tracking-display e ease-out confirmados como namespaces oficiais (--tracking-*, --ease-*) — funcionam como utilitária nomeada direta, validado no CSS buildado"
  - "Button.tsx variante primary usa bg-orange/text-cream (não cream/plum como o .button-primary específico do hero antigo) — segue literalmente a especificação da task do plano, mais genérica e reutilizável entre seções"
  - "Nenhuma classe .button-quiet existia no globals.css antigo como regra base (só uma sobrescrita de largura em .wine-contact .button-quiet) — variante quiet desenhada do zero seguindo a descrição do plano (borda, transparente), consistente com os demais tokens"

requirements-completed: [DESIGN-01, DESIGN-02]

coverage:
  - id: D1
    description: "Tokens de cor + fontes + escala tipográfica EXATOS do globals.css antigo disponíveis no @theme do Tailwind v4, gerando utilitárias (bg-coral, text-plum, font-serif, etc.)"
    requirement: "DESIGN-01"
    verification:
      - kind: integration
        ref: "npm run build (tsc -b && vite build)"
        status: pass
      - kind: unit
        ref: "grep dos 10 hex exatos (#fff3df #f6dfc3 #f3a271 #ee6a50 #d94f29 #35192a #6d253a #2b1822 #1f4650 #8a4a15) + 'Alegreya Variable' + 'Gabarito Variable' + cubic-bezier(.22,1,.36,1) em src/index.css"
        status: pass
      - kind: unit
        ref: "inspeção do CSS buildado (dist/assets/index-*.css) confirmando letter-spacing:var(--tracking-label), transition-timing-function:var(--ease-out), z-index:var(--z-toast) e classes .bg-orange/.text-cream/.border-line geradas"
        status: pass
    human_judgment: false
  - id: D2
    description: "Quatro primitivos de UI tipados (Button, Field, Card, Toast) renderizam com a identidade visual, mobile-first, alvos de toque >=44px, sem dangerouslySetInnerHTML"
    requirement: "DESIGN-02"
    verification:
      - kind: integration
        ref: "npm run build (typecheck + build, inclui a union discriminada de Field.tsx)"
        status: pass
      - kind: unit
        ref: "grep -rIl dangerouslySetInnerHTML src/components/ui/ retorna 0 arquivos; grep confirma bg-/text-/font-/border- em cada primitivo; Button.tsx expõe variant + disabled + aria-busy"
        status: pass
    human_judgment: false
  - id: D3
    description: "Shell base (topbar + main + footer) responsivo mobile-first e Home renderizando o Shell + preview de swatches/tipografia/primitivos de ponta a ponta"
    requirement: "DESIGN-02"
    verification:
      - kind: integration
        ref: "npm run build; smoke test com npm run dev + curl http://localhost:5173/ (200) e /src/routes/Home.tsx (200, módulo transformado sem erro de compilação)"
        status: pass
      - kind: unit
        ref: "grep 'Shell' em src/routes/Home.tsx; grep -E '(Button|Card|Field|Toast)' em src/routes/Home.tsx; test -f src/components/layout/Shell.tsx"
        status: pass
      - kind: manual_procedural
        ref: "Verificação visual humana em / (fundo cream, títulos Alegreya, swatches coral/orange/plum/wine/sea, primitivos renderizando, empilhamento em viewport ~375px) — diferida para o fim da fase (workflow.human_verify_mode=end-of-phase, task 3 do plano)"
        status: unknown
    human_judgment: true
    rationale: "O build/typecheck e o smoke test com curl confirmam que a página compila e o servidor serve o módulo sem erro, mas não confirmam a renderização visual real no browser (cores corretas, fontes carregando, empilhamento mobile). Verificação visual humana explicitamente adiada pelo próprio plano (human-check da Task 3) para o fim da fase, conforme workflow.human_verify_mode=end-of-phase."

duration: 25min
completed: 2026-07-23
status: complete
---

# Phase 1 Plan 3: Design System (tokens + primitivos + shell) Summary

**Paleta "pôr do sol" (9 cores) e fontes Alegreya/Gabarito self-hosted portadas EXATAMENTE do globals.css antigo para `@theme` do Tailwind v4, com quatro primitivos de UI tipados (Button/Field/Card/Toast) e um Shell base mobile-first, tudo renderizado num preview verificável na Home.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-07-23T17:29:42Z (aprox.)
- **Completed:** 2026-07-23T17:54:00Z (aprox.)
- **Tasks:** 3/3
- **Files modified:** 7 (2 modificados: src/index.css, src/routes/Home.tsx; 5 criados: 4 primitivos + Shell.tsx)

## Accomplishments
- `src/index.css` reescrito com `@theme` contendo os tokens EXATOS do `:root` do `globals.css` antigo: 9 cores da paleta pôr do sol, paleta RSVP sem verde (rsvp-sim=sea, rsvp-pendente=#8a4a15, rsvp-nao=wine), fontes self-hosted (`@font-face` Alegreya Variable + Gabarito Variable, peso 400-900, sem CDN), escala tipográfica fluida via `clamp()`, tracking, duration e easing
- Quatro primitivos React tipados em `src/components/ui/`: `Button` (variantes primary/quiet, disabled, aria-busy, alvo de toque ≥44px), `Field` (input/textarea via union discriminada `multiline`, foco vira coral), `Card` (superfície #fffaf1 com sombra offset em sand), `Toast` (container fixo `role="status"`)
- `Shell.tsx` (topbar sticky com wordmark serif + slot de nav, `<main>` para children, footer plum/cream) — mobile-first, sem lógica de scroll/countdown (fora de escopo, Phase 2)
- `Home.tsx` renderiza o Shell envolvendo um preview enxuto do design system: swatches das 9 cores, títulos em Alegreya, instâncias de Button/Field/Card e um Toast disparável via estado local

## Task Commits

Each task was committed atomically:

1. **Task 1: Tokens de cor + fontes + escala tipográfica no @theme** - `e77533c` (feat)
2. **Task 2: Primitivos de UI — Button, Field, Card, Toast** - `bf38bcd` (feat)
3. **Task 3: Shell/layout base + preview na home** - `d460290` (feat)

**Plan metadata:** (a seguir, commit de documentação separado)

## Files Created/Modified
- `src/index.css` - `@theme` com paleta pôr do sol, paleta RSVP, fontes self-hosted (@font-face), escala tipográfica, tracking/duration/easing, estilos base (body/::selection/:focus-visible)
- `src/components/ui/Button.tsx` - Primitivo Botão (variantes primary/quiet, disabled, aria-busy)
- `src/components/ui/Field.tsx` - Primitivo Campo (label + input/textarea, hint, foco coral)
- `src/components/ui/Card.tsx` - Primitivo Card (superfície cream, borda line, sombra offset)
- `src/components/ui/Toast.tsx` - Primitivo Toast (feedback flutuante fixo, role="status")
- `src/components/layout/Shell.tsx` - Shell base (topbar + main + footer), mobile-first
- `src/routes/Home.tsx` - Preview do design system: swatches, tipografia, primitivos, toast disparável

## Decisions Made
- `duration-fast`/`duration-medium` e `z-toast`/`z-sticky` não têm namespace Tailwind v4 oficial reconhecido para gerar utilitária nomeada — confirmado inspecionando o CSS buildado (a classe `.duration-fast` não emitia `transition-duration`). Trocado para sintaxe de parênteses (`duration-(--duration-fast)`, `z-(--z-toast)`), que resolve corretamente referenciando a CSS var diretamente. `tracking-label`/`tracking-display` e `ease-out` SÃO namespaces oficiais e funcionam como utilitária nomeada direta — também validado no CSS buildado
- Variante `primary` do Button usa `bg-orange`/`text-cream` (não `cream`/`plum` como o `.button-primary` específico do hero no arquivo antigo) — segue literalmente a especificação da Task 2 do plano, resultando numa variante mais genérica e reutilizável fora do contexto do hero
- Não existia uma regra base `.button-quiet` no `globals.css` antigo (só uma sobrescrita de largura em `.wine-contact .button-quiet`) — a variante `quiet` foi desenhada do zero (borda plum, fundo transparente) seguindo a descrição textual do plano, consistente com os demais tokens

## Deviations from Plan

None - plano executado exatamente como escrito. As duas notas acima ("Tokens sem namespace" e "sem regra base .button-quiet") são decisões técnicas de implementação dentro do escopo já definido pelo plano, não desvios de Rule 1-4.

## Issues Encountered
None.

## User Setup Required

None - nenhuma configuração externa necessária para este plano (apenas frontend/design, sem dependência de Convex/deploy).

## Next Phase Readiness
- Tokens de design system (`@theme`) e primitivos (`Button`, `Field`, `Card`, `Toast`) prontos para consumo em todas as fases seguintes (convite público, RSVP, vinhos, mural, admin)
- `Shell.tsx` disponível como base de layout — Phase 2 pode estender com scroll/countdown/nav real sem recriar a estrutura topbar/main/footer
- Fase 1 (fundação) completa: scaffold (01-01), deploy pipeline (01-02) e design system (01-03) entregues
- Pendente (não bloqueante): verificação visual humana de `/` no navegador (cores, fontes, empilhamento mobile ~375px) — diferida para o fim da fase conforme `workflow.human_verify_mode=end-of-phase`; recomenda-se essa checagem antes de iniciar a Phase 2

---
*Phase: 01-funda-o-design-system-deploy*
*Completed: 2026-07-23*

## Self-Check: PASSED

All 5 created files (Button.tsx, Field.tsx, Card.tsx, Toast.tsx, Shell.tsx) confirmed present on disk; both modified files (src/index.css, src/routes/Home.tsx) confirmed with expected content; all three task commits (`e77533c`, `bf38bcd`, `d460290`) confirmed in `git log`; `npm run build` passes with no type errors.
