# Project Research Summary — Sol faz 40 (Site Convite)

**Sintetizado:** 2026-07-23
**Fontes:** 4 pesquisas paralelas (Stack, Features, Architecture, Pitfalls), via Context7 + docs oficiais Convex/Tailwind + WebSearch datado.

## Key Findings

### Stack (confiança: ALTA no core Convex; MÉDIA em versões muito recentes)
- **Base React: Vite (SPA) + React Router** — não Next.js, não TanStack Start. O convite não tem URLs personalizadas por convidado nem necessidade real de SEO/SSR; RSC/loaders só custariam setup antes de 17/10.
- **Pinar versões maduras**, não as recém-lançadas: React Router **v7** (não v8), TypeScript **6** (não o TS7 "tsgo", cujo tooling de lint/type-check ainda não está pronto).
- **Tailwind v4** (via plugin Vite oficial).
- **Deploy Vercel + Convex**: build em duas partes, encadeado por `npx convex deploy --cmd 'npm run build'`; `CONVEX_DEPLOY_KEY` no env da Vercel; preview deployments ganham backend Convex efêmero (bom p/ testar RSVP/upload sem sujar produção).

### Features (confiança: MÉDIA-ALTA)
- **RSVP sem login por telefone/nome, uma pessoa confirma pela família, com poder de EDITAR a resposta** (busca por telefone) é o padrão universal do setor (Zola, Joy, RSVPify) — a busca/match por telefone é table stakes, não opcional.
- **Presentes**: registries grandes sofrem com duplicação por sync de 24-48h. O toggle manual "presenteado" no dashboard é o mesmo fallback que os próprios registries recomendam — e mais simples aqui, pois não há checkout concorrente.
- **Mural**: moderação antes de publicar é padrão mínimo dos guestbooks digitais, não diferencial.
- **Anti-features validadas** (soluções p/ escala que não existe aqui): login individual de convidado, auth de 2 níveis, reserva de presente com expiração, checkout no site.

### Architecture (confiança: ALTA)
- **Schema Convex simplificado**: `rsvps` + `rsvpGuests` (índices `by_phone`, `by_attending`) substituem invites/invite_guests/invite_phones do projeto antigo. `wines` e `posts` usam um `by_status` cada (Convex já ordena por `_creationTime`).
- **Upload = 3 passos** (`generateUploadUrl` → POST direto → mutation de registro); validação de tipo/tamanho acontece **depois**, via `ctx.storage.getMetadata()`/`ctx.db.system.get` — nunca confiar no `file.type` do cliente.
- **Fronteira público × admin** vira estrutura de pastas (`convex/public/*` vs `convex/admin/*`) com `requireOwner(ctx)` como primeira linha de toda função admin.

### Pitfalls (confiança: MÉDIA; lições do projeto antigo: ALTA)
- **Telefone BR é a armadilha mais sutil**: o nono dígito tem representação inconsistente por DDD; sem `normalizePhone` canônico antes de gravar, o mesmo convidado vira duas linhas.
- **Convite = grupo de pessoas**, não uma linha só (herdado do projeto antigo).
- **wa.me quebra em WebView** (Instagram/Facebook in-app, Android 11/12) mesmo funcionando no navegador padrão — exige teste explícito.
- **Countdown**: `new Date()` sem offset `-03:00` explícito quebra para quem está em outro fuso.
- **Deploy**: build da Vercel não dispara `convex deploy` sem Build Command configurado; preview cria backend separado (fácil confundir com produção).
- **Rate-limit**: mutations públicas (RSVP/upload) sem login precisam de rate-limit (componente `@convex-dev/rate-limiter` ou tabela contadora).

## Divergência resolvida — Auth do dono
Architecture sugeriu **Convex Auth (Password provider)**; Stack sugeriu **mutation custom + token de sessão com `ADMIN_PASSWORD` em env**. Ambos válidos. **Resolução:** senha compartilhada verificada no servidor via env var, emitindo sessão. O método exato (Convex Auth com sign-up bloqueado × mutation custom) é decisão de baixo risco adiada para a fase do dashboard/plan-phase. Nenhum dos dois reintroduz contas nomeadas (já descartadas).

## Implications for Roadmap

1. **Setup/deploy primeiro** e completo: pinar versões no scaffold, Build Command da Vercel, vercel.json (SPA rewrite p/ `/admin`), separação preview/prod. Errar aqui quebra o refresh de `/admin` em produção silenciosamente.
2. **RSVP** precisa do modelo convite↔convidados e do `normalizePhone` (módulo testado) **antes** de qualquer mutation depender dele.
3. **Mural nasce com moderação obrigatória**: posts entram como `pendente`, galeria pública só mostra `aprovado` — o invariante (nada não-moderado público) vale desde a fase do mural, antes mesmo da UI de moderação existir.
4. **Presentes**: toggle "presenteado" depende só do auth do dashboard, sem reserva/expiração.
5. **Schema do mural desenhado pensando no telão (v2)** — sem implementar a exibição ao vivo agora.
6. **wa.me e countdown** merecem item explícito de teste manual (WebView/fuso) antes de "prontos".

## Sources
- Convex docs (Context7): file storage, indexes, deploy, env vars, auth
- Tailwind v4 docs oficiais (Context7)
- Zola/Joy/RSVPify/WedSites (padrões de RSVP e registry)
- WhatsApp FAQ + issues react-native-webview (wa.me em WebView)
- `sol-40-integrado/design.md` (modelo de dados/invariantes do projeto antigo — fonte primária)

## Open Questions (p/ plan-phase)
- Método exato de auth do dono (Convex Auth × mutation custom) — decidir na fase do dashboard.
- `@convex-dev/rate-limiter` compatível com a versão de Convex usada — validar ao instalar.
- Template atual do `npm create convex` já mira Vite 8? — verificar no scaffold.
- Lembrete automático de prazo de RSVP (e-mail/WhatsApp) — não decidido; possível v2.
