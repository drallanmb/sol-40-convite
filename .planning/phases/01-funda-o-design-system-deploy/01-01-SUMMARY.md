---
phase: 01-funda-o-design-system-deploy
plan: 01
subsystem: infra
tags: [vite, react, typescript, tailwindcss, convex, react-router, scaffold]

requires: []
provides:
  - Repositório scaffolded com Vite + React + TS + Tailwind v4 + Convex + React Router v7
  - Cliente Convex montado no root, lendo VITE_CONVEX_URL
  - Rotas / (Home) e /admin (placeholder) navegáveis via React Router v7 (library mode)
  - convex/schema.ts stub (defineSchema vazio) como fundação do backend
  - .env.example documentando VITE_CONVEX_URL e o passo manual (npx convex dev)
affects: [01-02, 01-03, 03-rsvp, 04-vinhos, 05-mural, 06-admin-auth]

tech-stack:
  added:
    - "vite@8.1.5 (build tool/dev server)"
    - "react@19.2.8 / react-dom@19.2.8"
    - "react-router@7.18.1 (library mode, NÃO framework mode, NÃO v8)"
    - "typescript@6.0.3 (NÃO 7.x/tsgo)"
    - "convex@1.42.3"
    - "tailwindcss@4.3.3 + @tailwindcss/vite@4.3.3"
    - "@fontsource-variable/alegreya@5.3.0"
    - "@fontsource-variable/gabarito@5.3.0"
    - "@vitejs/plugin-react@^6.0.3"
  patterns:
    - "Scaffold gerado em diretório de staging (fora do repo) e copiado seletivamente para o projeto, para não expor .git/.planning ao --overwrite do create-vite"
    - "Versões críticas (react-router, typescript) pinadas com --save-exact, sem ^/~"
    - "convex/ mantém tsconfig.json próprio, não referenciado pelo tsconfig raiz (convenção padrão Convex — type-check de convex/ é feito pelo próprio `npx convex dev`/deploy, não pelo `npm run build` do frontend)"

key-files:
  created:
    - package.json
    - package-lock.json
    - tsconfig.json
    - tsconfig.app.json
    - tsconfig.node.json
    - vite.config.ts
    - index.html
    - src/main.tsx
    - src/App.tsx
    - src/routes/Home.tsx
    - src/routes/Admin.tsx
    - src/index.css
    - convex/schema.ts
    - convex/tsconfig.json
    - .gitignore
    - .env.example
  modified: []

key-decisions:
  - "Checkpoint blocking-human de legitimidade de pacotes considerado SATISFEITO por verificação first-party prévia (STACK.md, 2026-07-23) — todos os 9 pacotes são oficiais e já checados contra o registro npm; instalação prosseguiu com versões EXATAS pinadas, sem interação humana adicional nesta execução"
  - "React Router pinado em 7.18.1 (não 8.x) e TypeScript em 6.0.3 (não 7.x/tsgo) — pins críticos e inegociáveis conforme STACK.md, verificados automaticamente pelo script de verify do plano"
  - "src/main.tsx monta APENAS ConvexProvider — nenhum provider de autenticação (Convex Auth/custom) é introduzido nesta fase; auth do dono é escopo da Phase 6"
  - "convex/schema.ts é um defineSchema({}) vazio de propósito — o modelo de dados completo (rsvps, wines, posts, settings) é construído nas fases 3-6, conforme a Ordem de Build em ARCHITECTURE.md"
  - "npx convex dev NÃO foi executado nesta sessão (ambiente não-interativo, dispara device-auth via browser) — documentado abaixo em User Setup Required"

requirements-completed: [SETUP-01]

coverage:
  - id: D1
    description: "Stack Vite+React+TS+Tailwind v4+Convex+React Router v7 instalada com versões pinadas (react-router 7.x, typescript 6.x)"
    requirement: "SETUP-01"
    verification:
      - kind: unit
        ref: "node -e verify script (package.json pins react-router 7.x / typescript 6.x) — inline no plano, Task 1"
        status: pass
      - kind: integration
        ref: "npm run build (tsc -b && vite build)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Cliente Convex (ConvexReactClient) montado no root, lendo import.meta.env.VITE_CONVEX_URL, envolto por ConvexProvider + BrowserRouter, sem provider de auth"
    requirement: "SETUP-01"
    verification:
      - kind: unit
        ref: "grep -q ConvexReactClient/ConvexProvider/import.meta.env.VITE_CONVEX_URL/BrowserRouter src/main.tsx; grep -q ConvexAuthProvider (ausência) src/main.tsx"
        status: pass
      - kind: integration
        ref: "npm run build"
        status: pass
    human_judgment: false
  - id: D3
    description: "Rotas / (Home) e /admin (placeholder sem auth/dados) navegáveis via React Router v7"
    requirement: "SETUP-01"
    verification:
      - kind: unit
        ref: "grep -Eq \"/admin\" src/App.tsx; arquivos src/routes/Home.tsx e src/routes/Admin.tsx presentes"
        status: pass
      - kind: manual_procedural
        ref: "curl http://localhost:5199/ e /admin durante npm run dev (smoke test manual desta execução) — confirma que o dev server serve o shell SPA para ambas as rotas; renderização client-side real (JS executando no browser) requer verificação visual humana"
        status: unknown
    human_judgment: true
    rationale: "O smoke test com curl confirma apenas que o servidor Vite serve o index.html para ambas as rotas (fallback SPA funcionando); não confirma execução real do JS no browser (React Router resolvendo o path client-side, texto renderizado). Recomenda-se verificação visual rápida (abrir localhost no navegador) antes de avançar para o plano 01-02."
  - id: D4
    description: "convex/schema.ts stub com defineSchema({}) estabelecendo a fundação do backend Convex"
    requirement: "SETUP-01"
    verification:
      - kind: unit
        ref: "grep -q defineSchema convex/schema.ts"
        status: pass
    human_judgment: false

duration: 45min
completed: 2026-07-23
status: complete
---

# Phase 1 Plan 1: Scaffold Vite + React + TS + Tailwind v4 + Convex + React Router v7 Summary

**Stack base instalada com versões pinadas nas linhas maduras (React Router 7.18.1, TypeScript 6.0.3), cliente Convex montado no root lendo `VITE_CONVEX_URL`, e rotas `/` e `/admin` navegáveis via React Router v7 em library mode.**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-07-23T16:00:00Z (aprox.)
- **Completed:** 2026-07-23T16:46:07Z
- **Tasks:** 2/2 (mais 1 checkpoint de legitimidade de pacotes, satisfeito por verificação prévia)
- **Files modified:** 24 (16 novos arquivos de código/config + 8 arquivos de scaffold auxiliares como README.md)

## Accomplishments
- Projeto Vite (template `react-ts`) scaffolded via `create-vite@9.1.1` em modo não-interativo, gerado num diretório de staging fora do repositório e copiado seletivamente para não expor `.git`/`.planning` ao flag `--overwrite`
- Todas as dependências runtime/dev instaladas com versões EXATAS via `npm install --save-exact`: `react-router@7.18.1`, `typescript@6.0.3`, `convex@1.42.3`, `tailwindcss@4.3.3`, `@tailwindcss/vite@4.3.3`, `@fontsource-variable/alegreya@5.3.0`, `@fontsource-variable/gabarito@5.3.0`, `react@19.2.8`/`react-dom@19.2.8`
- `vite.config.ts` configurado com `@vitejs/plugin-react` + `@tailwindcss/vite`
- `src/main.tsx`: `ConvexReactClient(import.meta.env.VITE_CONVEX_URL)` + `ConvexProvider` + `BrowserRouter` no root, sem nenhum provider de auth
- `src/App.tsx` declara `<Routes>` com `/` → `Home` e `/admin` → `Admin` (placeholder puro, sem lógica)
- `convex/schema.ts`: `defineSchema({})` stub, comentado com a ordem de build das tabelas futuras (fases 3-6)
- `package-lock.json` commitado, travando toda a árvore transitiva
- `npm run build` passa sem erros de tipo em ambos os commits

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Vite + instalar dependências pinadas** - `acd826a` (feat)
2. **Task 2: Wire router + cliente Convex + rotas / e /admin** - `a8ee74e` (feat)

**Plan metadata:** (a seguir, commit de documentação separado)

## Files Created/Modified
- `package.json` - Dependências pinadas (react-router 7.18.1, typescript 6.0.3, convex 1.42.3, tailwindcss 4.3.3, etc.), scripts dev/build/preview
- `package-lock.json` - Lockfile travando toda a árvore transitiva
- `tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json` - Config TS do template Vite (project references)
- `vite.config.ts` - Plugins `@vitejs/plugin-react` + `@tailwindcss/vite`
- `index.html` - Título "Sol faz 40", `lang="pt-BR"`, favicon do template removido (não gerado por este plano)
- `.gitignore` - `node_modules`, `dist`, `.env.local`, `.env.*.local`, `.convex` (além do padrão do template)
- `src/main.tsx` - Root: `ConvexReactClient` + `ConvexProvider` + `BrowserRouter`
- `src/App.tsx` - `<Routes>` declarando `/` e `/admin`
- `src/routes/Home.tsx` - "Sol faz 40 — em construção"
- `src/routes/Admin.tsx` - "Admin — área dos donos (em breve)", placeholder sem auth
- `src/index.css` - Apenas `@import "tailwindcss";` (tokens do design system entram no plano 01-03)
- `convex/schema.ts` - `defineSchema({})` stub
- `convex/tsconfig.json` - Config TS padrão Convex (não referenciado pelo tsconfig raiz)
- `.env.example` - Documenta `VITE_CONVEX_URL` e o comando manual (`npx convex dev`)

## Decisions Made
- Checkpoint blocking-human de legitimidade de pacotes tratado como satisfeito por verificação first-party prévia registrada em STACK.md (2026-07-23) — todos os 9 pacotes conferidos contra o npm registry antes desta execução; instalação prosseguiu diretamente com `--save-exact`
- `npx convex dev`/`npx convex deploy` **NÃO foram executados** nesta sessão (ambiente não-interativo — dispararia device-auth via browser e travaria); backend Convex e wiring de cliente escritos como código type-checável, sem deployment ao vivo
- Removido o boilerplate padrão do template `create-vite` (`src/App.css`, `src/assets/*`, `oxlint` + `.oxlintrc.json`, ícones SVG do template) por estar fora do escopo do plano ("instale APENAS o listado — não adicione bibliotecas extras")
- `index.html`: removida a tag `<link rel="icon">` apontando para `favicon.svg` (arquivo removido junto com o boilerplate); pode ser reintroduzido no plano 01-03 (design system) com um favicon próprio do projeto

## Deviations from Plan

None nas tasks em si - plano executado exatamente como escrito. Uma adaptação técnica no processo de scaffold (não uma mudança de código):

**1. [Processo, não Rule 1-4] Scaffold gerado em staging e copiado seletivamente**
- **Encontrado durante:** Task 1
- **Situação:** `npm create vite@latest . -- --template react-ts` diretamente no repositório pediu confirmação interativa (diretório não vazio por conter `.git`/`.planning`) e a sessão não-interativa cancelou a operação
- **Ação:** Rodado `create-vite@9.1.1` num diretório de staging isolado (scratchpad da sessão) com `--no-interactive`, depois copiados seletivamente apenas os arquivos de scaffold (`.gitignore`, `README.md`, `index.html`, `package.json`, `public/`, `src/`, `tsconfig*.json`, `vite.config.ts`) para o projeto real, sem tocar `.git`/`.planning`
- **Arquivos afetados:** Nenhum arquivo do plano foi alterado por isso — apenas o método de geração
- **Verificação:** `git status` confirmou que `.git`/`.planning` permaneceram intactos; `npm run build` passa

## Issues Encountered
None além do processo de scaffold documentado acima.

## User Setup Required

**Serviço externo requer configuração manual — o login do Convex abre o navegador e não pode ser automatizado nesta sessão.**

Comando exato que o dono precisa rodar depois, no terminal do projeto:

```bash
npx convex dev
```

O que isso faz:
1. Abre o navegador para login/criação da conta Convex
2. Cria (ou associa) o **dev deployment** do projeto
3. Grava `VITE_CONVEX_URL` automaticamente em `.env.local` (já no `.gitignore`, não será commitado)
4. Gera `convex/_generated/` (API tipada usada pelo frontend em fases futuras — ex.: `api.public.rsvps.upsertByPhone`)
5. Deve ficar rodando em outro terminal durante o desenvolvimento (aplica o `convex/schema.ts` reativamente a cada mudança)

Sem esse passo, `npm run dev` sobe normalmente e serve o shell da SPA (`/` e `/admin` respondem via fallback), mas o `ConvexReactClient` não terá uma URL válida até `.env.local` existir — isso é esperado e não bloqueia os próximos planos de código (01-02, 01-03), que não dependem de dados reais do Convex.

Deploy (Vercel) fica para o plano de deploy da Fase 1 (`01-02`/`01-03`, conforme ROADMAP) — não faz parte deste plano.

## Next Phase Readiness
- Fundação pronta: stack instalada, build passa, rotas navegáveis, cliente Convex e schema stub no lugar
- Plano 01-02 (provavelmente deploy Vercel + env vars) e 01-03 (design system/tokens Tailwind `@theme`) podem prosseguir sobre esta base
- Bloqueio não-crítico: dono precisa rodar `npx convex dev` localmente para ter um `VITE_CONVEX_URL` real e `convex/_generated` — recomendado fazer isso antes de iniciar qualquer plano que use `useQuery`/`useMutation` de verdade (fases 3+)
- Recomendação de verificação visual humana (D3, marcado `human_judgment: true` acima): abrir `npm run dev` no navegador e confirmar visualmente que `/` e `/admin` renderizam os textos esperados

---
*Phase: 01-funda-o-design-system-deploy*
*Completed: 2026-07-23*

## Self-Check: PASSED

All 17 claimed files confirmed present on disk; both task commits (`acd826a`, `a8ee74e`) confirmed in `git log`.
