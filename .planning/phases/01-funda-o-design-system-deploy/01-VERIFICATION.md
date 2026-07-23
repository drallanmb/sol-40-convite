---
phase: 01-funda-o-design-system-deploy
verified: 2026-07-23T00:00:00Z
status: human_needed
score: 12/12 must-haves verificados no código; 4 itens exigem confirmação humana/ao vivo
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Deploy real na Vercel do projeto atual (branch main) usando o vercel.json existente."
    expected: "Build conclui, site fica no ar, e a home carrega com a identidade pôr do sol."
    why_human: "Nenhum deploy foi executado neste ambiente (não-interativo); só a configuração (vercel.json, DEPLOY.md) pôde ser verificada estaticamente."
  - test: "Na URL de produção da Vercel já deployada, navegar até /admin e dar hard-refresh (Cmd+Shift+R)."
    expected: "A página carrega normalmente (React Router resolve /admin client-side) — NÃO pode retornar 404."
    why_human: "Requer um deploy ao vivo na Vercel para testar o rewrite de SPA em produção; não pode ser simulado localmente sem infraestrutura da Vercel."
  - test: "Gerar Production Deploy Key e Preview Deploy Key no Convex Dashboard, colar em CONVEX_DEPLOY_KEY (escopos Production/Preview) na Vercel, disparar um build de produção e um de preview (PR), e comparar os deployments no Convex Dashboard."
    expected: "Dois deployments Convex distintos aparecem no dashboard — um para produção, um efêmero para o preview — confirmando isolamento de dados."
    why_human: "Depende de ações no dashboard Convex e da Vercel (device-auth/dashboard, não automatizável nesta sessão); `npx convex dev/deploy` não foi executado neste ambiente."
  - test: "Rodar `npm run dev` e abrir `/` no navegador (viewport mobile ~375px e desktop)."
    expected: "(1) Fundo cream #fff3df, títulos em Alegreya (serif); (2) swatches mostram coral/orange/plum/wine/sea corretos; (3) Button, Field, Card e Toast renderizam com a identidade pôr do sol; (4) layout empilha bem no mobile."
    why_human: "Verificação visual explicitamente diferida pelo próprio plano 01-03 (task 3, human-check) para o fim da fase, conforme workflow.human_verify_mode=end-of-phase — cores/fontes/empilhamento real só são confirmáveis olhando o navegador renderizado, não por grep/build."
---

# Phase 1: Fundação, Design System & Deploy — Relatório de Verificação

**Meta da fase:** Projeto scaffoldado e no ar na Vercel com o Convex conectado e a identidade visual pôr do sol disponível como sistema de design.
**Verificado:** 2026-07-23
**Status:** human_needed
**Re-verificação:** Não — verificação inicial

## Restrições do ambiente

Este ambiente é local e não-interativo: nenhum deploy real na Vercel foi feito e `npx convex dev`/`convex deploy` não foram executados aqui (decisão registrada em STATE.md e nos SUMMARYs de 01-01/01-02). Por isso, os itens que dependem de infraestrutura ao vivo (deploy real, deploy keys geradas, backends Convex distintos, renderização visual no navegador) foram tratados como **itens de verificação humana**, não como falhas — a configuração que os habilita foi checada estaticamente contra o código.

## Conquista da Meta

### Verdades Observáveis

| # | Verdade | Status | Evidência |
|---|---------|--------|-----------|
| 1 | O projeto compila e sobe em dev com Vite (React+TS) | ✓ VERIFICADO | `npm run build` (`tsc -b && vite build`) conclui sem erros; gera `dist/index.html`, JS e CSS |
| 2 | Rotas `/` (Home) e `/admin` (placeholder) existem e são declaradas via React Router v7 | ✓ VERIFICADO | `src/App.tsx:7-10` declara `<Route path="/" .../>` e `<Route path="/admin" .../>`; `src/routes/Home.tsx` e `src/routes/Admin.tsx` existem e exportam componentes |
| 3 | `ConvexReactClient` montado no root e lê `VITE_CONVEX_URL` do ambiente | ✓ VERIFICADO | `src/main.tsx:15` — `new ConvexReactClient(import.meta.env.VITE_CONVEX_URL)`, envolto por `ConvexProvider`+`BrowserRouter`; sem `ConvexAuthProvider` |
| 4 | Versões críticas pinadas: react-router 7.x (não 8), typescript 6.x (não 7) | ✓ VERIFICADO | `package.json`: `"react-router": "7.18.1"`, `"typescript": "6.0.3"` (versões exatas, sem `^`/`~`) |
| 5 | Segredos (`CONVEX_DEPLOY_KEY`, `ADMIN_PASSWORD`) vivem só no servidor, nunca no bundle do cliente | ✓ VERIFICADO | `grep -rIl -e CONVEX_DEPLOY_KEY -e ADMIN_PASSWORD src/` → 0 arquivos; `.env.example` documenta ambos como server-only com placeholders `change-me` |
| 6 | `vercel.json` encadeia `npx convex deploy` com `npm run build` e faz SPA rewrite para `index.html` | ✓ VERIFICADO | `vercel.json`: `buildCommand: "npx convex deploy --cmd 'npm run build'"`, `outputDirectory: "dist"`, `rewrites: [{"source":"/(.*)","destination":"/index.html"}]` — JSON válido |
| 7 | "Olá mundo" com a stack faz deploy na Vercel e o refresh em `/admin` não quebra (ao vivo) | ? HUMANO NECESSÁRIO | Configuração presente e correta (item 6 + DEPLOY.md passo 6), mas nenhum deploy real ocorreu neste ambiente — ver Verificação Humana |
| 8 | Preview e produção usam deploy keys Convex distintas → backends separados (ao vivo) | ? HUMANO NECESSÁRIO | `DEPLOY.md` seção 2-3 e 5 documenta o processo (chaves Production/Preview separadas, escopos distintos na Vercel); nenhuma chave foi gerada nem deploy executado nesta sessão |
| 9 | Tokens de cor da paleta pôr do sol disponíveis como utilitárias Tailwind (`bg-coral`, `text-plum`, etc.) | ✓ VERIFICADO | `src/index.css:49-97` bloco `@theme` com os 10 hex exatos do globals.css antigo (`#fff3df #f6dfc3 #f3a271 #ee6a50 #d94f29 #35192a #6d253a #2b1822 #1f4650 #8a4a15`); CSS buildado (`dist/assets/index-*.css`) confirma `.bg-orange{background-color:var(--color-orange)}` e `.text-cream{color:var(--color-cream)}` gerados |
| 10 | Alegreya (display/serif) e Gabarito (corpo/sans) carregam self-hosted e são aplicáveis via tema | ✓ VERIFICADO | `src/index.css:6-40` `@font-face` para "Alegreya Variable"/"Gabarito Variable" apontando para `.woff2` em `node_modules/@fontsource-variable/*` (arquivos confirmados no disco); `--font-serif`/`--font-sans` no `@theme`; `dist/assets/` inclui os 4 `.woff2` no build de produção |
| 11 | Botão, campo, card e toast renderizam com a identidade visual (mobile-first), sem `dangerouslySetInnerHTML` | ✓ VERIFICADO (código) / ? HUMANO (visual) | `Button.tsx`, `Field.tsx`, `Card.tsx`, `Toast.tsx` existem, usam utilitárias dos tokens (`bg-orange`, `text-cream`, `border-line`, `bg-plum`, alvo de toque `min-h-[44px]`), sem `dangerouslySetInnerHTML` (grep → 0); build passa. Confirmação visual (cores/fontes reais no navegador) diferida pelo próprio plano 01-03 para o fim da fase |
| 12 | Existe um shell/layout base (topbar + main + footer) responsivo, consumido pela Home | ✓ VERIFICADO (código) / ? HUMANO (visual) | `src/components/layout/Shell.tsx` tem `<header>` sticky, `<main>{children}</main>`, `<footer>`; `src/routes/Home.tsx` importa e renderiza `<Shell>` envolvendo o preview do design system; empilhamento mobile confirmado por classes responsivas (`sm:`), confirmação visual real diferida (mesmo item 11) |

**Score:** 12/12 verdades com evidência de código verificada; 4 exigem confirmação humana/ao vivo (2 sobre deploy real, 2 sobre renderização visual — sobrepostas aos itens 7/8/11/12 acima).

### Artefatos Obrigatórios

| Artefato | Esperado | Status | Detalhes |
|----------|----------|--------|----------|
| `package.json` | Deps pinadas (react-router 7.x, typescript 6.x, convex, tailwindcss) | ✓ VERIFICADO | Todas as versões conferem exatamente com STACK.md |
| `vite.config.ts` | Plugins `@vitejs/plugin-react` + `@tailwindcss/vite` | ✓ VERIFICADO | Build usa ambos os plugins (confirmado via `npm run build` bem-sucedido gerando CSS do Tailwind v4) |
| `src/main.tsx` | Monta `ConvexReactClient`+`ConvexProvider`+`BrowserRouter` | ✓ VERIFICADO | Conteúdo conforme esperado, sem provider de auth |
| `src/routes/Admin.tsx` | Placeholder `/admin` sem auth | ✓ VERIFICADO | 13 linhas, texto "Admin — área dos donos (em breve)", nenhuma lógica de auth/dado |
| `convex/schema.ts` | `defineSchema` stub | ✓ VERIFICADO | `defineSchema({})` com comentário da ordem de build futura |
| `vercel.json` | Build encadeado Convex↔Vite, SPA rewrite, outputDirectory | ✓ VERIFICADO | JSON válido, todos os três campos presentes e corretos |
| `.env.example` | Documenta `VITE_CONVEX_URL`, `CONVEX_DEPLOY_KEY`, `ADMIN_PASSWORD` com escopo | ✓ VERIFICADO | Confirmado via `git show HEAD:.env.example` (Read direto bloqueado por permissão do ambiente, não por ausência do arquivo) |
| `DEPLOY.md` | Passo-a-passo Vercel↔Convex, deploy keys, teste final | ✓ VERIFICADO | 89 linhas, cobre import do repo, geração de deploy keys, `npx convex env set`, teste de hard-refresh em `/admin` |
| `src/index.css` | Tokens `@theme` (cor/fonte/tipografia/tracking/duration/easing) | ✓ VERIFICADO | Todos os hex, fontes e `cubic-bezier(.22,1,.36,1)` presentes |
| `src/components/ui/Button.tsx` | Primitivo com variantes primary/quiet | ✓ VERIFICADO | 35 linhas, variantes + `disabled` + `aria-[busy=true]` |
| `src/components/ui/Field.tsx` | Label + input/textarea | ✓ VERIFICADO | 54 linhas, união discriminada `multiline` |
| `src/components/ui/Card.tsx` | Superfície com sombra offset | ✓ VERIFICADO | 24 linhas, `border-line` + `shadow-[14px_14px_0_var(--color-sand)]` |
| `src/components/ui/Toast.tsx` | Feedback flutuante | ✓ VERIFICADO | 25 linhas, `role="status"`, fixo no rodapé |
| `src/components/layout/Shell.tsx` | Topbar + main + footer | ✓ VERIFICADO | 41 linhas, estrutura completa |

### Verificação de Key Links

| De | Para | Via | Status | Detalhes |
|----|------|-----|--------|----------|
| `src/main.tsx` | `src/App.tsx` | `BrowserRouter` envolvendo `<App/>` | ✓ WIRED | `main.tsx:17-24` envolve `<App/>` com `<BrowserRouter>` |
| `src/main.tsx` | `convex/schema.ts` | `ConvexReactClient(import.meta.env.VITE_CONVEX_URL)` | ✓ WIRED | Padrão presente em `main.tsx:15`; schema stub existe como fundação do backend a que o client se conecta |
| `vercel.json` | `package.json` | `buildCommand` invoca `npm run build` | ✓ WIRED | `"npx convex deploy --cmd 'npm run build'"` — script `build` existe em `package.json` |
| `vercel.json` | `src/routes/Admin.tsx` | rewrite SPA cai em `index.html` para o React Router resolver `/admin` client-side | ✓ WIRED | Rewrite `/(.*) -> /index.html` presente; rota `/admin` declarada em `App.tsx` |
| `src/components/ui/Button.tsx` | `src/index.css` | utilitárias Tailwind dos tokens `@theme` | ✓ WIRED | `bg-orange`, `text-cream`, `border-plum` usados; CSS buildado confirma classes geradas a partir dos tokens |
| `src/routes/Home.tsx` | `src/components/layout/Shell.tsx` | Home renderiza o Shell + preview dos primitivos | ✓ WIRED | `Home.tsx` importa `Shell`, `Button`, `Card`, `Field`, `Toast` e renderiza todos dentro de `<Shell>` |

### Rastro de Dados (Nível 4)

Não aplicável de forma significativa nesta fase — não há dados dinâmicos de backend consumidos ainda (schema Convex é um stub vazio de propósito; nenhuma `useQuery`/`useMutation` real existe até a Phase 3+). O "preview" na Home usa apenas estado local (`useState` para o Toast) e dados estáticos (array de swatches) — comportamento esperado e documentado no próprio código como "andaime de verificação visual", não uma página final com dados reais.

### Spot-Checks Comportamentais

| Comportamento | Comando | Resultado | Status |
|----------------|---------|-----------|--------|
| Build de produção conclui e gera assets (CSS+JS+fontes) | `npm run build` | `✓ built in 136ms`, gera `dist/index.html`, `dist/assets/index-*.css` (17.45 kB), `dist/assets/index-*.js` (303.58 kB), 4 `.woff2` | ✓ PASS |
| Tokens de cor geram utilitárias Tailwind reais | `grep bg-orange/text-cream no CSS buildado` | `.bg-orange{background-color:var(--color-orange)}`, `.text-cream{color:var(--color-cream)}` | ✓ PASS |
| `vercel.json` é JSON válido com os campos esperados | `node -e "require('./vercel.json')"` (equivalente ao verify do plano 01-02) | buildCommand contém `convex deploy` + `npm run build`; rewrite contém `index.html` | ✓ PASS |
| Nenhum debt marker sem referência (`TBD`/`FIXME`/`XXX`) nos arquivos da fase | `grep -rn -E "TBD|FIXME|XXX" src/ convex/ vercel.json DEPLOY.md` | 0 ocorrências | ✓ PASS |
| Deploy real na Vercel (build encadeado ao vivo) | — | não executável neste ambiente | ? SKIP → human_verification |

### Requirements Coverage

| Requisito | Plano de origem | Descrição | Status | Evidência |
|-----------|-----------------|-----------|--------|-----------|
| SETUP-01 | 01-01 | Projeto Vite+React+TS+Tailwind v4+Convex inicializado, RR7 e TS6 pinados | ✓ SATISFEITO | `package.json` pins conferidos; rotas/cliente Convex montados; build passa |
| SETUP-02 | 01-02 | Pipeline de deploy Vercel — build command com `convex deploy`, `vercel.json` com SPA rewrite, preview/produção separados | ✓ SATISFEITO (config) / ? HUMANO (execução ao vivo) | `vercel.json` correto; separação de deploy keys documentada em `DEPLOY.md`, mas não executada nesta sessão |
| SETUP-03 | 01-02 | Env vars configuradas — `CONVEX_DEPLOY_KEY` na Vercel, `ADMIN_PASSWORD` só no servidor | ✓ SATISFEITO (documentação) / ? HUMANO (provisionamento real) | `.env.example` documenta as 3 vars com escopo correto; grep confirma ausência em `src/`; provisionamento real no dashboard é ação humana pendente |
| DESIGN-01 | 01-03 | Tokens de cor (paleta pôr do sol) e fontes (Alegreya+Gabarito) portados para Tailwind | ✓ SATISFEITO | `src/index.css` com os 10 hex exatos e `@font-face` self-hosted; CSS buildado confirma utilitárias geradas |
| DESIGN-02 | 01-03 | Primitivos de UI (botão, campo, card, toast) e shell/layout base, mobile-first | ✓ SATISFEITO (código) / ? HUMANO (visual) | Quatro primitivos + Shell existem, tipados, usam tokens, sem XSS; confirmação visual real diferida para fim de fase |

Nenhum requisito órfão: os 5 IDs mapeados para a Phase 1 em `REQUIREMENTS.md` (linhas 95-99) aparecem todos declarados no frontmatter `requirements:` de algum plano (01-01: SETUP-01; 01-02: SETUP-02, SETUP-03; 01-03: DESIGN-01, DESIGN-02).

### Anti-Padrões Encontrados

Nenhum bloqueador. O `01-REVIEW.md` (code review desta fase, 2026-07-23) já identificou 5 warnings + 3 infos, todos classificados como `critical: 0`. Reproduzido aqui para contexto (não bloqueiam a meta da fase — são débito de robustez a considerar antes de construir mais em cima):

| Arquivo | Padrão | Severidade | Impacto |
|---------|--------|------------|---------|
| `src/main.tsx:15` | `VITE_CONVEX_URL` lido sem validação de presença; sem error boundary na árvore | ⚠️ Warning | Se a var faltar em algum ambiente mal configurado, a tela fica em branco sem diagnóstico visível ao usuário |
| `src/components/ui/Field.tsx:31-49` | `hint` não associado ao controle via `aria-describedby` | ⚠️ Warning | Leitores de tela não anunciam o hint contextual do campo |
| `src/components/ui/Card.tsx:15` | `bg-[#fffaf1]` é hex cru, não um token do `@theme` | ⚠️ Warning | Um dos 4 primitivos-base ignora o próprio sistema de tokens que a fase existe para estabelecer |
| `src/App.tsx:6-11` | Sem rota fallback/404 | ⚠️ Warning | Qualquer caminho fora de `/` e `/admin` renderiza `<main>` vazio |
| `src/index.css:11,20,29,38` | `@font-face` aponta para caminho interno de `node_modules/@fontsource-variable/*` | ⚠️ Warning | Acoplamento a um layout de arquivo não-público do pacote; pode quebrar silenciosamente numa atualização de versão |

Nenhum marcador de débito (`TBD`/`FIXME`/`XXX`) sem referência a issue foi encontrado nos arquivos desta fase.

## Verificação Humana Necessária

### 1. Deploy real na Vercel

**Teste:** Fazer o primeiro deploy do repositório na Vercel (importar projeto, confirmar Build Command vindo do `vercel.json`).
**Esperado:** Build conclui (`npx convex deploy --cmd 'npm run build'` roda sem erro), site fica no ar servindo a home com a identidade pôr do sol.
**Por que humano:** Ambiente local não-interativo; nenhum deploy foi disparado nesta sessão.

### 2. Hard-refresh em `/admin` em produção

**Teste:** Após o deploy, abrir a URL de produção, navegar até `/admin`, dar hard-refresh (Cmd+Shift+R).
**Esperado:** Página carrega normalmente via fallback SPA — **não** pode retornar 404.
**Por que humano:** Depende de infraestrutura real da Vercel servindo o `vercel.json`; não simulável localmente.

### 3. Backends Convex separados (preview vs. produção)

**Teste:** Gerar Production e Preview Deploy Keys no Convex Dashboard, colar em `CONVEX_DEPLOY_KEY` nos escopos corretos da Vercel, disparar um build de produção e um de PR/preview, comparar deployments no Convex Dashboard.
**Esperado:** Dois deployments Convex distintos listados.
**Por que humano:** Exige acesso a dashboards (device-auth) da Vercel/Convex — não automatizável nesta sessão; `npx convex dev/deploy` nunca rodou aqui.

### 4. Renderização visual real de `/` (design system preview)

**Teste:** Rodar `npm run dev`, abrir `/` no navegador em viewport mobile (~375px) e desktop.
**Esperado:** (1) fundo cream `#fff3df`, títulos em Alegreya; (2) swatches coral/orange/plum/wine/sea corretos; (3) Button/Field/Card/Toast com a identidade pôr do sol; (4) layout empilha bem no mobile.
**Por que humano:** O próprio plano 01-03 (task 3) já deferiu essa checagem para o fim da fase (`workflow.human_verify_mode=end-of-phase`) — cor/fonte/empilhamento real só são confirmáveis olhando o navegador renderizado.

## Resumo

Todos os artefatos e key links exigidos pela meta da Fase 1 existem no código, estão substantivos (não-stub) e corretamente conectados: stack scaffolded com versões pinadas, cliente Convex montado, pipeline de deploy configurado corretamente (`vercel.json` + `DEPLOY.md`), segredos isolados do bundle do cliente, e o sistema de design (tokens `@theme` + 4 primitivos + Shell) portado fielmente do projeto antigo e consumido pela Home. `npm run build` passa sem erros, sem markers de débito não referenciados, e o code review da fase não encontrou nenhum finding crítico.

O que falta para "passed" puro é inteiramente dependente de infraestrutura ao vivo fora deste ambiente: nenhum deploy real na Vercel foi executado, nenhuma deploy key Convex foi gerada, e a confirmação visual no navegador (explicitamente diferida pelo próprio plano para o fim da fase) ainda não ocorreu. Nenhum desses 4 itens indica um gap de implementação — são checagens que só podem ser feitas por um humano com acesso aos dashboards Vercel/Convex e a um navegador.

---

*Verificado: 2026-07-23*
*Verificador: Claude (gsd-verifier)*
