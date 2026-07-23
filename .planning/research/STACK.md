# Stack Research

**Domain:** Site de convite/RSVP de festa (público) + dashboard interno (privado), backend Convex
**Researched:** 2026-07-23
**Confidence:** HIGH (Convex, Tailwind, file storage, deploy — verificado via Context7/docs oficiais) / MEDIUM (escolha de major versions muito recentes — React Router 8, Vite 8, TypeScript 7 — avaliadas com WebSearch datado)

## Recommendation (uma stack só, não um menu)

**Vite (SPA) + React Router v7 (library mode) + Convex + Tailwind v4, senha única via mutation/sessão custom (não Convex Auth, não Clerk), deploy na Vercel com build command customizado apontando pro Convex.**

Por quê, em uma frase: o site não precisa de SSR/SEO por rota (é um único evento, um único link, sem conteúdo personalizado por convidado), então a complexidade de Next.js/TanStack Start (RSC, loaders, streaming) não compra nada — só custa tempo de setup que não sobra até 17/10.

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Vite** | `8.1.5` | Build tool / dev server | Base oficial do quickstart React do Convex (`npm create vite@latest -- --template react-ts`). SPA pura é suficiente porque não há SSR/SEO por rota a resolver — um único link de convite, sem conteúdo personalizado por convidado. Vite 8 (GA desde 12/mar/2026, ~4,5 meses de maturidade) já trocou o bundler interno para Rolldown mantendo compat de plugins; `@tailwindcss/vite` já publica versões compatíveis. |
| **React** | `19.2.8` | UI library | Peer dependency direta do `convex` package (`^19.0.0`). Nenhuma razão para fixar em 18. |
| **React Router** | `7.18.1` (não 8.x) | Roteamento client-side (`/`, `/convite`, `/mural`, `/admin`) | Usado em **library mode** (`<BrowserRouter>`/`createBrowserRouter`), não framework mode — não precisamos de loaders/SSR do RR. **React Router 8.0 saiu em 17/jun/2026 (~5 semanas antes desta pesquisa)** — breaking changes são pequenas (remove `react-router-dom` shim, exige Node ≥22.22, publica só ESM), mas é major recém-lançado. Dado o prazo fixo (17/10) e zero tolerância a bugs de primeira-semana de major, **fixar em v7 estável** é a escolha certa; migrar pra v8 depois do evento é trivial e de baixo risco. |
| **TypeScript** | `6.0.3` (não 7.x) | Tipagem | **TypeScript 7.0 (compilador nativo "tsgo") foi GA em 8/jul/2026** — só 2 semanas antes desta pesquisa. Fontes de jul/2026 confirmam que a API programática estável só chega na 7.1 (meses depois), `typescript-eslint` fechou o pedido de suporte a TS7 como "not planned" por ora, e ferramentas de type-checking de templates (Vue/Svelte/Astro) simplesmente não rodam em TS7 ainda. Usar TS7 hoje arrisca quebrar lint type-aware sem aviso. `convex`'s own devDependency ainda referencia `~5.0.3`, então nada exige TS7. **Ficar em 6.0.x é o pragmatismo certo para um projeto com deadline imutável.** |
| **Convex** | `1.42.3` | Banco reativo, funções serverless, file storage, auth primitives | Decisão já tomada pelo dono. Versão atual do npm confirmada via registry. |

### Styling

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Tailwind CSS** | `4.3.3` | Utility CSS | v4 usa o plugin `@tailwindcss/vite` (zero-config PostCSS), CSS-first config via `@import "tailwindcss"` — mais simples que v3 + `tailwind.config.js` clássico. Design system (paleta pôr do sol, tokens) já existe e será portado para `@theme` no CSS de entrada. |
| `@tailwindcss/vite` | `4.3.3` | Plugin Vite oficial do Tailwind v4 | Substitui `postcss.config.js` + `tailwindcss` como plugin PostCSS — instala direto no `vite.config.ts`. |
| `@fontsource-variable/alegreya` | `5.3.0` | Fonte display (self-hosted, variable) | Já decidido no design system existente; self-host evita dependência de Google Fonts CDN (importante pra performance em rede móvel dos convidados). |
| `@fontsource-variable/gabarito` | `5.3.0` | Fonte de corpo (self-hosted, variable) | Idem. |

### Auth — "senha única dos donos"

**Recomendação: mutation de login + sessão custom via tabela `sessions`, senha guardada como env var do Convex. NÃO Convex Auth, NÃO Clerk.**

| Opção | Veredito | Por quê |
|-------|----------|---------|
| **Mutation + sessão custom (recomendado)** | ✅ Use isto | Fluxo: (1) `npx convex env set ADMIN_PASSWORD "..."` guarda a senha só no servidor (nunca no bundle do cliente); (2) mutation pública `login(password)` compara com `process.env.ADMIN_PASSWORD`, se bater cria um doc em `sessions` (token aleatório + `expiresAt`) e retorna o token; (3) client guarda o token em `localStorage`; (4) toda query/mutation do `/admin` recebe o token como argumento e valida contra a tabela `sessions` (existe + não expirou) antes de retornar dados. Esse padrão de "shared secret validado em mutation via env var" é o mesmo que o próprio adapter oficial do Convex para Auth.js usa (`CONVEX_AUTH_ADAPTER_SECRET`) — não é um hack, é um padrão documentado pela Convex para "ambiente único de confiança". Zero dependências novas, zero contas de usuário, control total sobre expiração (ex: expira depois de 30/11, um mês pós-festa). |
| **Convex Auth (`@convex-dev/auth`, `Password` provider)** | ❌ Não use | Pacote ainda em `0.0.94` (pré-1.0, projeto "labs"). Foi desenhado para contas de usuário reais: fluxo de sign-up/sign-in separado, reset de senha (exige provedor de e-mail tipo Resend), validação de complexidade de senha. Tudo isso é overhead pra um caso de "2 pessoas, 1 senha compartilhada verbalmente, 1 noite". Adiciona JWTs, refresh tokens e uma superfície de configuração que não paga aluguel aqui. |
| **Clerk** | ❌ Não use | Ótimo para apps multi-usuário com OAuth/SSO, mas é dependência de terceiro com dashboard próprio, SDK extra (`@clerk/clerk-react`), e modelo de conta (signup, verificação) desnecessário para 2 pessoas que já se conhecem. Adiciona ponto de falha externo (rate limits, downtime de terceiro) num evento com data fixa, sem benefício correspondente. |

**Confiança:** MEDIUM-ALTA — o padrão "mutation valida secret contra env var" é documentado oficialmente pela Convex (usado no próprio adapter Auth.js), mas a implementação de sessão (tabela + expiração) é um padrão de arquitetura recomendado por esta pesquisa, não um snippet oficial "copy-paste" da Convex para este caso específico de dashboard. Validar em `/admin` antes de expor dados sensíveis (lista de convidados, telefones).

### File Storage — upload de fotos do mural

API atual (verificada via Context7, `docs.convex.dev/file-storage/*`):

1. **Backend** — mutation gera URL de upload de curta duração:
   ```ts
   export const generateUploadUrl = mutation({
     args: {},
     handler: async (ctx) => ctx.storage.generateUploadUrl(),
   });
   ```
2. **Client** — obtém a URL, faz `POST` do arquivo:
   ```ts
   const postUrl = await generateUploadUrl();
   const result = await fetch(postUrl, {
     method: "POST",
     headers: { "Content-Type": file.type },
     body: file,
   });
   const { storageId } = await result.json();
   ```
3. **Client → Backend** — mutation separada salva `storageId` + metadados (nome do convidado, legenda, status `pending_review`) na tabela `memories`.
4. **Leitura** — `ctx.storage.getUrl(storageId)` retorna URL pública de GET para renderizar no mural/galeria; `ctx.db.system.get("_storage", storageId)` retorna metadados (`size`, `contentType`, `sha256`) — preferível ao `getMetadata` (deprecated).

**Limites e validação (importante pro mural):**
- Convex não limita tamanho de arquivo no fluxo de upload URL (o limite de 20MB é só para HTTP actions, que não é o caminho usado aqui); o POST de upload tem timeout de 2 minutos.
- Como qualquer validação client-side (`file.type.startsWith("image/")`, tamanho máx. ex. 8MB) pode ser burlada, **validar de novo no backend**: na mutation que salva o `storageId`, buscar os metadados via `ctx.db.system.get` e rejeitar (+ `ctx.storage.delete(storageId)`) se `contentType` não for `image/*` ou `size` exceder o limite definido — defesa em profundidade.
- Fila de moderação (`status: "pending" | "approved" | "rejected"`) é decisão de schema/feature, não de stack — ver `FEATURES.md`/`ARCHITECTURE.md`.

**Confiança:** ALTA — API confirmada diretamente nos docs oficiais via Context7.

### Convex + Vercel — deploy e ambientes

Verificado via `docs.convex.dev/production/hosting/vercel` e `.../preview-deployments` (Context7 + WebSearch, jul/2026):

- **Duas partes de deploy**: (1) `npx convex deploy` empurra funções/schema pro backend Convex; (2) Vercel builda e serve o frontend estático (Vite). O comando de build da Vercel deve encadear os dois: `npx convex deploy --cmd 'npm run build'`.
- **Variáveis de ambiente na Vercel**:
  - `CONVEX_DEPLOY_KEY` — criada no dashboard Convex, colada nas env vars do projeto Vercel. Para produção, escopo "Production"; para preview, escopo "Preview" (chave de deploy diferente, tipo "Preview Deploy Key").
  - `VITE_CONVEX_URL` — normalmente **não** setada manualmente: `npx convex deploy --cmd` já injeta a URL do deployment recém-criado como env var que o `npm run build` do Vite lê (`import.meta.env.VITE_CONVEX_URL`).
- **Preview deployments**: cada branch/PR gera um **deployment Convex efêmero próprio**, sem dados compartilhados com dev/produção — ótimo para testar o fluxo de RSVP/upload sem sujar dados reais de convidados. Pode rodar uma função de seed só em preview via `--preview-run 'nomeDaFuncao'`.
- Existe uma **integração oficial no Vercel Marketplace** ("Convex for Vercel") que automatiza esse setup — vale usar em vez de configurar tudo manualmente.
- **Importante para SPA em Vite na Vercel**: como não há framework SSR, é preciso configurar rewrite de SPA (`vercel.json` com fallback `"/(.*)" -> "/index.html"`) para que rotas como `/admin` não deem 404 em refresh — isso é responsabilidade do deploy da Vercel, não do Convex.

**Confiança:** ALTA para os mecanismos de deploy/env vars (docs oficiais); MÉDIA para detalhes finos de preview deploy key scoping (confirmar no dashboard Convex/Vercel na hora de configurar, telas mudam com frequência).

## Alternatives Considered

| Categoria | Recomendado | Alternativa | Quando a alternativa faz sentido |
|-----------|-------------|-------------|-----------------------------------|
| Base React | Vite (SPA) + React Router v7 | **Next.js (App Router)** | Se precisássemos de SSR real (SEO por página, OG tags dinâmicas por convidado, ISR) ou de API routes co-localizadas. Não é o caso: link único, sem personalização por URL. Next também traz complexidade (RSC vs client boundary, cache implícito) que não compensa para este escopo. |
| Base React | Vite (SPA) + React Router v7 | **TanStack Start** | Framework mais novo (quickstart oficial do Convex existe), type-safety de rota superior, mas é RC/recém-GA e adiciona SSR/streaming que este projeto não precisa. Reavaliar para o v2 (telão ao vivo) se esse componente precisar de rota própria com SSR. |
| Roteamento | React Router v7.18.x | **React Router v8.3.0** | Se o projeto começasse hoje sem pressão de prazo, v8 seria a escolha natural (é a versão "boring, madura" segundo a comunidade). Reavaliar pós-evento. |
| TypeScript | 6.0.3 | **TypeScript 7.0.2 (tsgo)** | Quando `typescript-eslint` e o ecossistema de lint type-aware tiverem suporte estável (esperado a partir da 7.1). Ganho de velocidade de compilação (8-12x) não compensa o risco de tooling quebrado num projeto de 3 meses. |
| Auth admin | Mutation + sessão custom | **Convex Auth (Password provider)** | Se v2 precisar de múltiplos perfis nomeados (dono + moderador com contas separadas) — já descartado explicitamente no PROJECT.md ("Auth de dois níveis" está em Out of Scope). |
| Auth admin | Mutation + sessão custom | **Clerk** | Se o projeto crescesse para múltiplos eventos/organizadores com necessidade de SSO/times — fora de escopo para uma festa de uma noite. |
| File storage | Convex storage nativo | **`@convex-dev/r2` (Cloudflare R2 component)** | Só se precisar de custos de storage em escala muito maior ou já ter infra R2 — não é o caso; Convex storage nativo já resolve upload/serve de fotos do mural sem componente extra. |

## What NOT to Use

| Evitar | Por quê | Use em vez disso |
|--------|---------|-------------------|
| **TypeScript 7.0.2 (tsgo)** agora | GA há só 2 semanas; API programática estável só na 7.1; `typescript-eslint` sem suporte; ferramentas de template-checking ainda não rodam nele | TypeScript `6.0.3` |
| **React Router 8.x** agora | Major com 5 semanas de idade; exige Node ≥22.22 e publica ESM-only — risco desnecessário perto do deadline | React Router `7.18.1` |
| **Convex Auth / Clerk** para o admin | Resolvem problema de multi-usuário/OAuth que este projeto não tem; adicionam setup (email provider, dashboard de terceiro) sem necessidade | Mutation + sessão custom com env var |
| **Next.js App Router** | RSC + cache implícito + client/server boundary é complexidade que não compra nada sem necessidade real de SSR/SEO por rota | Vite (SPA) + React Router |
| **Stack antiga (Cloudflare Workers/D1/R2/Images, Drizzle, wrangler)** do projeto anterior | Já descartada explicitamente no PROJECT.md — Convex substitui banco, storage e (parcialmente) auth com uma API única e reativa | Convex |
| **Reserva de vinho com expiração 48h / checkout no site** | Fora de escopo v1 (venda é externa via WhatsApp do vendedor) — não é decisão de stack, mas evita adicionar Stripe/webhooks desnecessários | Campo "presenteado" marcado manualmente no dashboard |

## Stack Patterns by Variant

**Se o v2 (telão ao vivo) avançar:**
- Reavaliar TanStack Start ou uma rota Next.js isolada só para a página do telão, já que aí SSR/streaming de atualizações ao vivo tem valor real (hoje resolvido via `useQuery` reativo do Convex, que já é live por padrão — pode não precisar de framework novo, só de uma rota dedicada em tela cheia).
- Esquema do Convex já deve prever essa extensão (campos/índices), mesmo sem construir a feature agora — conforme já anotado no PROJECT.md.

**Se aparecer necessidade de SEO real (ex: convite virar landing pública indexável no Google):**
- Migrar para Next.js ou TanStack Start só nesse momento; não antecipar agora.

## Installation

```bash
# Scaffold (gera projeto Vite + React + TS + Convex já conectado)
npm create convex@latest
# escolher: React (Vite) — NÃO escolher Convex Auth no prompt

# Roteamento
npm install react-router@7.18.1

# Estilo
npm install tailwindcss@4.3.3 @tailwindcss/vite@4.3.3
npm install @fontsource-variable/alegreya@5.3.0 @fontsource-variable/gabarito@5.3.0

# Dev dependencies
npm install -D typescript@6.0.3
```

`vite.config.ts`:
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

CSS de entrada:
```css
@import "tailwindcss";
/* @theme com os tokens do design system pôr do sol vem aqui */
```

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `convex@1.42.3` | `react@^18 \|\| ^19` | Peer dependency oficial, sem restrição de versão do TypeScript. |
| `@tailwindcss/vite@4.3.3` | `vite@8.x` e `vite@7.x` | Plugin oficial mantém compat entre majors recentes do Vite. |
| `react-router@7.18.1` | `react@19.2.8` | Sem fricção; v8 exigiria revisar Node runtime da Vercel (≥22.22) — não necessário na v7. |
| `typescript@6.0.3` | `@tailwindcss/vite`, `vite@8`, `convex` | Linha estável pré-tsgo; evita os gaps de tooling da 7.x documentados em jul/2026. |

## Sources

- Context7 `/websites/convex_dev` — quickstart React/Vite, `ConvexProvider`/`ConvexReactClient`, `ctx.storage.getUrl`, deploy keys, `npx convex env` — HIGH
- Context7 `/get-convex/convex-auth` — configuração do `Password` provider, formulário de sign-in — HIGH (confirma que o design do pacote é orientado a contas de usuário, não a senha compartilhada)
- Context7 `/websites/tailwindcss_installation_using-vite` — instalação Tailwind v4 + plugin Vite — HIGH
- https://docs.convex.dev/production/hosting/vercel e https://docs.convex.dev/production/hosting/preview-deployments (via WebSearch, jul/2026) — HIGH
- https://docs.convex.dev/file-storage/upload-files (via WebSearch, jul/2026) — HIGH
- npm registry (`registry.npmjs.org`) — versões atuais confirmadas por consulta direta em 2026-07-23: `convex@1.42.3`, `react@19.2.8`, `react-router@7.18.1`/`8.3.0`, `tailwindcss@4.3.3`, `vite@8.1.5`, `typescript@6.0.3`/`7.0.2`, `@fontsource-variable/alegreya@5.3.0`, `@fontsource-variable/gabarito@5.3.0`, `@convex-dev/auth@0.0.94` — HIGH (dado primário do registro)
- https://tanstack.com/start/latest/docs/framework/react/comparison, https://reactrouter.com/upgrading/v7, https://remix.run/blog/react-router-v8 (via WebSearch, jul/2026) — MEDIUM (blogs/changelogs de terceiros e do próprio time, cross-checados entre 2-3 fontes)
- Artigos datados de jul/2026 sobre TypeScript 7 GA e gaps de `typescript-eslint`/API programática (via WebSearch) — MEDIUM (múltiplas fontes de blog convergindo na mesma linha do tempo e nos mesmos breaking changes, mas não é doc oficial única)
- Vite 8 release blog (`vite.dev/blog/announcing-vite8`) via WebSearch — MEDIUM-HIGH (post oficial do time Vite)

---
*Stack research for: site de convite/RSVP + dashboard com Convex*
*Researched: 2026-07-23*
