# Architecture Research

**Domain:** Site de convite/RSVP + dashboard operacional para evento único (Convex + React + Vercel)
**Researched:** 2026-07-23
**Confidence:** HIGH (baseado em documentação oficial Convex — schema/índices, file storage, auth — via Context7; tradução do modelo antigo é decisão de projeto, não fato externo)

## Standard Architecture

### System Overview

```
┌───────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Tailwind + TS, Vercel)        │
│                                                                         │
│  ┌───────────────┐   ┌────────────────┐   ┌───────────────────────┐   │
│  │ Site público   │   │ /admin         │   │ ConvexAuthProvider    │   │
│  │ (convite,      │   │ (dashboard,    │   │ (sessão do dono via   │   │
│  │  adega, mural) │   │  moderação)    │   │  JWT, useConvexAuth)  │   │
│  └───────┬────────┘   └───────┬────────┘   └──────────┬────────────┘   │
│          │  useQuery / useMutation (WebSocket, reativo)│                │
├──────────┴──────────────────────┴──────────────────────┴───────────────┤
│                         CONVEX (backend + banco + storage)             │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────┐  │
│  │ convex/public/*  │ │ convex/admin/*  │ │ convex/auth.ts          │  │
│  │ queries/mutations│ │ queries/mutations│ │ (Convex Auth: Password) │  │
│  │ abertas          │ │ com requireOwner │ │ ctx.auth.getUserIdentity│  │
│  └────────┬─────────┘ └────────┬─────────┘ └────────────┬────────────┘  │
├───────────┴────────────────────┴─────────────────────────┴─────────────┤
│                    BANCO REATIVO + FILE STORAGE (Convex)                │
│  ┌──────────┐ ┌───────────────┐ ┌───────┐ ┌───────┐ ┌──────────────┐   │
│  │ rsvps /  │ │ wines         │ │ posts │ │settings│ │ _storage     │   │
│  │rsvpGuests│ │(catálogo)     │ │(mural)│ │(singl.)│ │ (fotos)      │   │
│  └──────────┘ └───────────────┘ └───────┘ └───────┘ └──────────────┘   │
└───────────────────────────────────────────────────────────────────────┘
```

Não há servidor intermediário: o frontend (Vercel) fala **diretamente** com o Convex via
cliente reativo (`ConvexReactClient`). Não existe API REST própria, não existe polling, não
existe cookie de sessão custom — tudo é `useQuery`/`useMutation` sobre WebSocket, e a auth do
dono é resolvida pelo Convex Auth (JWT verificado no servidor, exposto como
`ctx.auth.getUserIdentity()` dentro de cada função Convex).

### Component Responsibilities

| Componente | Responsabilidade | Implementação típica |
|-----------|----------------|------------------------|
| Site público (`/`, `/convite`, `/adega`, `/mural`) | Hero, countdown, form de RSVP, carta de vinhos, galeria aprovada | Rotas React (Vite/TanStack Start), `useQuery`/`useMutation` do `convex/public/*` |
| `/admin` | Visão geral, lista de RSVP, fila de moderação, controle de presentes, ajustes | Rotas React protegidas na UI (cosmético) + `convex/admin/*` protegidas no servidor (real) |
| `convex/public/*` | Mutations/queries sem auth: RSVP, ver carta de vinhos, enviar foto/recado, ver mural aprovado | `mutation`/`query` públicas, sem `ctx.auth` |
| `convex/admin/*` | Mutations/queries que exigem ser o dono: marcar vinho presenteado, aprovar/ocultar post, listar RSVPs, editar settings | Toda função começa com `await requireOwner(ctx)` |
| `convex/auth.ts` | Login do(s) dono(s) — 1 papel só, sem cadastro público | Convex Auth (`@convex-dev/auth`), provider `Password`, sem fluxo de sign-up exposto |
| Banco reativo (tabelas) | Fonte única da verdade; toda mudança dispara reatividade automática | `defineSchema`/`defineTable` + índices |
| File storage (`_storage`) | Guarda os arquivos de foto enviados pelos convidados | `ctx.storage.generateUploadUrl()` / `ctx.storage.getUrl()` |

## Recommended Project Structure

```
sol-40-convite/
├── convex/
│   ├── schema.ts              # defineSchema — única fonte do modelo de dados
│   ├── auth.ts                 # convexAuth({ providers: [Password] })
│   ├── auth.config.ts          # config do provider JWT (gerado pelo Convex Auth)
│   ├── lib/
│   │   └── auth.ts             # requireOwner(ctx) — helper de gate reusado
│   ├── public/
│   │   ├── rsvps.ts            # upsertRsvp (mutation aberta), getByPhone (query aberta)
│   │   ├── wines.ts            # listCatalog (query aberta, só leitura)
│   │   └── posts.ts            # generateUploadUrl, submitPhoto, submitMessage, listApproved
│   ├── admin/
│   │   ├── dashboard.ts        # overview (contagens agregadas, reativo)
│   │   ├── rsvps.ts            # listAll, remove
│   │   ├── wines.ts            # markGifted, markAvailable
│   │   ├── posts.ts            # listPending, moderate (approve/hide)
│   │   └── settings.ts         # get, update
│   └── settings.ts             # getSettings/ensureSettings (singleton, usado por public e admin)
├── src/
│   ├── main.tsx                 # ConvexReactClient + ConvexAuthProvider
│   ├── routes/                  # site público + /admin (React Router ou file-based)
│   └── components/
└── ...
```

### Structure Rationale

- **`convex/public/` vs `convex/admin/`:** a fronteira de segurança fica visível na estrutura de
  pastas — qualquer revisor sabe que tudo em `admin/` DEVE começar com `requireOwner(ctx)`. Isso
  também produz nomes de API autoexplicativos no cliente (`api.public.wines.listCatalog` vs
  `api.admin.wines.markGifted`), o que facilita auditoria e evita que uma mutation sensível seja
  criada "pública por engano".
- **`convex/lib/auth.ts` central:** um único helper `requireOwner` chamado em toda função
  admin evita duplicar a lógica de checagem (e evita alguém esquecer de checá-la numa função
  nova).
- **`convex/schema.ts` único arquivo:** é assim que Convex exige — todas as tabelas do projeto
  ficam num só lugar, o que também documenta o modelo de dados inteiro em um só olhar (função
  equivalente ao `drizzle/000x` do projeto antigo, mas sem migrations manuais: o schema é
  aplicado automaticamente no deploy).

## Schema Convex (concreto)

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // --- RSVP público, sem login ---------------------------------------
  // Uma linha por telefone (o "convite"/família). Convidado informa
  // telefone + nome(s); pode reabrir e editar depois (upsert por telefone).
  rsvps: defineTable({
    phone: v.string(),        // normalizado: só dígitos, com DDI+DDD
    displayName: v.string(),  // ex.: "Allan e Bruna" — como some na lista do dashboard
    updatedAt: v.number(),
  }).index("by_phone", ["phone"]),

  // Uma linha por pessoa dentro do RSVP — permite confirmar "vai/não vai"
  // individualmente quando o telefone representa mais de uma pessoa.
  rsvpGuests: defineTable({
    rsvpId: v.id("rsvps"),
    name: v.string(),
    attending: v.union(
      v.literal("pending"),
      v.literal("yes"),
      v.literal("no"),
    ),
  })
    .index("by_rsvp", ["rsvpId"])       // listar pessoas de um RSVP
    .index("by_attending", ["attending"]), // contagem do dashboard (headcount)

  // --- Carta de vinhos (catálogo fixo, ~37 itens) ---------------------
  wines: defineTable({
    order: v.number(),                 // ordem de exibição na carta
    name: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    whatsappNumber: v.string(),        // número do vendedor ("Mistral")
    status: v.union(v.literal("available"), v.literal("gifted")),
    giftedByName: v.optional(v.string()),   // "quem escolheu"
    giftedByPhone: v.optional(v.string()),
    giftedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])    // carta filtrada por disponível/presenteado
    .index("by_order", ["order"]),     // ordem de exibição estável

  // --- Mural: foto ou recado, moderado antes de publicar --------------
  posts: defineTable({
    type: v.union(v.literal("photo"), v.literal("message")),
    storageId: v.optional(v.id("_storage")), // presente quando type === "photo"
    caption: v.optional(v.string()),
    authorName: v.optional(v.string()),
    authorPhone: v.optional(v.string()),      // correlaciona com rsvps, opcional
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("hidden"),
    ),
  }).index("by_status", ["status"]),
  // Nota: índices Convex sempre ordenam adicionalmente por `_creationTime`,
  // então `by_status` já entrega a fila de moderação em ordem cronológica
  // sem precisar de um índice composto (`status + creationTime`).

  // --- Config única (singleton) ---------------------------------------
  settings: defineTable({
    rsvpDeadline: v.optional(v.number()),      // epoch ms, prazo de confirmação
    wallAutoPublishPhotos: v.boolean(),        // true = pula moderação (não recomendado no v1)
    telaoIntervalMs: v.optional(v.number()),   // reservado para v2 (telão), sem uso no v1
  }),
});
```

**Por que não replicar `invites`/`invite_guests`/`invite_phones` do projeto antigo 1:1:** lá,
esse desenho existia para resolver um problema que o v1 deste projeto **não tem** — identificar
um convite pré-cadastrado por código/QR e distinguir "telefone da casa" (`guest_id = NULL`) de
pessoa nomeada, para dar acesso a uma área logada por convidado. Aqui o RSVP é público e
autoatendido (o convidado *cria* seu próprio registro ao confirmar, não acessa um que já
existia), então `rsvps` + `rsvpGuests` (upsert por telefone) cobre o mesmo caso de uso — contagem
por pessoa, edição, dashboard — com metade das tabelas e sem `invite_phones` (não existe QR de
mesa nem múltiplos telefones por convite no v1).

## Architectural Patterns

### Pattern 1: Dashboard reativo sem polling

**What:** toda tela do `/admin` assina queries Convex (`useQuery`) em vez de buscar dados sob
demanda ou dar poll periódico.
**When to use:** sempre, para qualquer contagem/lista que precise refletir mudanças de outros
usuários em tempo real (RSVPs chegando, foto nova pendente, vinho marcado como presenteado).
**Trade-offs:** zero código de invalidação/poll (ganho grande vs. o `/api/telao` do projeto
antigo, que dava poll a cada ~12s); em troca, toda query deve ser barata/indexada, porque ela
roda de novo a cada mudança relevante nos dados que leu.

**Example:**
```typescript
// convex/admin/dashboard.ts
import { query } from "../_generated/server";
import { requireOwner } from "../lib/auth";

export const overview = query({
  args: {},
  handler: async (ctx) => {
    await requireOwner(ctx);
    const confirmed = await ctx.db
      .query("rsvpGuests")
      .withIndex("by_attending", (q) => q.eq("attending", "yes"))
      .collect();
    const pendingPosts = await ctx.db
      .query("posts")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    const giftedWines = await ctx.db
      .query("wines")
      .withIndex("by_status", (q) => q.eq("status", "gifted"))
      .collect();
    return {
      confirmedCount: confirmed.length,
      pendingPostsCount: pendingPosts.length,
      giftedWinesCount: giftedWines.length,
    };
  },
});
```
```tsx
// src/routes/admin/index.tsx
const overview = useQuery(api.admin.dashboard.overview);
// Sempre que alguém confirmar presença, enviar foto ou marcar vinho presenteado
// em QUALQUER outra aba/dispositivo, este componente re-renderiza sozinho —
// Convex reexecuta a query no servidor e empurra o novo resultado via WebSocket.
```

### Pattern 2: Upload de foto em 3 passos + validação server-side

**What:** o cliente nunca envia bytes de arquivo direto para uma mutation Convex — mutations só
trafegam JSON. O fluxo é: (1) mutation `generateUploadUrl` devolve uma URL efêmera; (2) o
navegador faz `POST` do arquivo direto para essa URL e recebe um `storageId`; (3) uma segunda
mutation recebe esse `storageId` e grava o `post` como `pending`.
**When to use:** todo upload de mídia no Convex segue esse padrão — é a única forma suportada.
**Trade-offs:** dois round-trips em vez de um, mas o arquivo nunca passa pela função Convex
(sem limite de payload de mutation), e o passo 3 é o lugar certo para **validar server-side**
antes de aceitar o post na fila de moderação.

**Example:**
```typescript
// convex/public/posts.ts
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => ctx.storage.generateUploadUrl(),
});

const MAX_BYTES = 12 * 1024 * 1024; // mesmo teto do projeto antigo (12MB)

export const submitPhoto = mutation({
  args: {
    storageId: v.id("_storage"),
    caption: v.optional(v.string()),
    authorName: v.optional(v.string()),
    authorPhone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Metadados reais do arquivo já persistido — não confiar no que o cliente alega.
    const meta = await ctx.db.system.get(args.storageId);
    if (!meta) throw new Error("Upload inválido");
    if (!meta.contentType?.startsWith("image/")) {
      await ctx.storage.delete(args.storageId); // evita arquivo órfão (armadilha do projeto antigo com R2)
      throw new Error("Só imagens são aceitas");
    }
    if (meta.size > MAX_BYTES) {
      await ctx.storage.delete(args.storageId);
      throw new Error("Arquivo maior que 12MB");
    }
    await ctx.db.insert("posts", {
      type: "photo",
      storageId: args.storageId,
      caption: args.caption,
      authorName: args.authorName,
      authorPhone: args.authorPhone,
      status: "pending", // moderação sempre entra pendente no v1
    });
  },
});

// Só devolve URL de fotos JÁ aprovadas — nunca vazar storageId/url de pendente/oculto.
export const listApproved = query({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .order("desc")
      .collect();
    return Promise.all(
      posts.map(async (p) => ({
        ...p,
        url: p.storageId ? await ctx.storage.getUrl(p.storageId) : null,
      })),
    );
  },
});
```

**Onde validar tipo/tamanho, explicitamente:**
- **Cliente (UX, não segurança):** checar `file.type`/`file.size` antes de sequer pedir a
  `uploadUrl` — feedback instantâneo, evita gastar banda com um arquivo óbvio errado.
- **Servidor (o gate real):** em `submitPhoto`, depois que o upload já aconteceu, ler
  `ctx.db.system.get(storageId)` (metadados reais: `contentType`, `size`, `sha256`) e só então
  decidir aceitar. Um upload inválido é apagado imediatamente com `ctx.storage.delete` — isso
  evita o problema que o projeto antigo tinha no R2 (arquivo órfão sem `PHOTOS.delete`, invariante
  #1 do `design.md` antigo).

### Pattern 3: Gate de auth no servidor, nunca no cliente

**What:** toda função em `convex/admin/*` chama `requireOwner(ctx)` como primeira linha. Esse
helper lê `ctx.auth.getUserIdentity()` — que o Convex só popula depois de verificar a assinatura
do JWT emitido pelo Convex Auth no login. Não há como o cliente falsificar isso.
**When to use:** qualquer mutation/query que só o dono pode chamar (marcar vinho presenteado,
aprovar/ocultar post, listar todos os RSVPs, editar settings).
**Trade-offs:** nenhum — é o único jeito correto no Convex. A alternativa errada (esconder botão
"Admin" na UI e deixar a mutation aberta) é um convite (trocadilho intencional) a qualquer pessoa
que abra o devtools chamar a mutation direto.

**Example:**
```typescript
// convex/lib/auth.ts
import type { QueryCtx, MutationCtx } from "../_generated/server";

export async function requireOwner(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    throw new Error("Unauthorized: faça login em /admin");
  }
  return identity;
}
```
```typescript
// convex/auth.ts — Convex Auth, 1 papel só (dono), sem cadastro público
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
  callbacks: {
    // Bloqueia qualquer criação de conta nova pela UI: só os 2 donos,
    // semeados uma vez via `npx convex run` (nunca por um form público de sign-up).
    async createOrUpdateUser(ctx, { existingUserId }) {
      if (existingUserId) return existingUserId;
      throw new Error("Cadastro de novo dono não é permitido pela UI.");
    },
  },
});
```

**Por que Convex Auth em vez de reimplementar `sessions`/cookies como no projeto antigo:** o
projeto antigo precisou de uma tabela `sessions` própria, 3 cookies (`sol_sessao`, `sol_festa`,
`sol_equipe`), `sameOriginJson` manual e rate-limit escopado por porta — tudo para compensar que
Cloudflare Workers não tem primitiva de sessão. Convex Auth resolve isso nativamente (JWT + gate
server-side via `ctx.auth`), então o v1 não precisa reinventar nada disso; só sobrevive a ideia
central do invariante #5 do projeto antigo ("gate de papel no servidor"), agora expressa como
`requireOwner(ctx)`.

## Data Flow

### Fluxo 1 — RSVP público

```
Convidado preenche telefone + nome(s) no site
    ↓
public/rsvps.upsertByPhone (mutation aberta)
    ↓ busca rsvps por índice by_phone; cria ou atualiza
rsvps + rsvpGuests (banco)
    ↓ (reativo, automático)
admin/dashboard.overview (query) → recalculada e empurrada
    ↓
Dashboard do dono atualiza contagem "confirmados" ao vivo, sem refresh
```

### Fluxo 2 — Upload de foto com moderação

```
Convidado escolhe foto
    ↓
public/posts.generateUploadUrl (mutation) → URL efêmera
    ↓
Navegador faz POST do arquivo pra essa URL → recebe storageId
    ↓
public/posts.submitPhoto (mutation): valida contentType/size via ctx.db.system.get
    ↓ grava post com status = "pending"
posts (banco) + _storage (arquivo)
    ↓ (reativo)
admin/posts.listPending (query, requireOwner) → dono vê na fila de moderação
    ↓
Dono aprova → admin/posts.moderate({ action: "approve" }) → status = "approved"
    ↓ (reativo)
public/posts.listApproved (query aberta) → galeria pública atualiza sozinha
```

### Fluxo 3 — Login do dono e mutation protegida

```
Dono acessa /admin, ainda sem sessão
    ↓
Form de login → signIn("password", { email, password, flow: "signIn" })
    ↓ Convex Auth verifica contra o usuário semeado; NUNCA cria conta nova
JWT de sessão guardado pelo ConvexAuthProvider no navegador
    ↓
Toda chamada subsequente a convex/admin/* já carrega esse JWT
    ↓
requireOwner(ctx) lê ctx.auth.getUserIdentity() no SERVIDOR e libera ou rejeita
    ↓
Se alguém chamar a mesma mutation sem estar logado (ex.: via devtools) → erro "Unauthorized",
mesmo que a aba "Admin" esteja escondida na UI
```

## Scaling Considerations

Este é um evento único (~150–300 convidados esperados, 17/10/2026), não um produto multi-tenant.
Escala não é um risco real aqui — a preocupação é **simplicidade e correção**, não throughput.

| Escala | Ajuste de arquitetura |
|-------|--------------------------|
| Até a festa (centenas de RSVPs, dezenas de fotos) | Nenhum ajuste necessário — o schema acima com índices já cobre com folga; nenhuma paginação é obrigatória, mas usar `.take(n)` em vez de `.collect()` sem limite é boa prática desde o início |
| Durante a festa (pico de uploads simultâneos) | Convex escala automaticamente (é um serviço gerenciado); o único cuidado é compressão client-side da foto antes do upload (reduz tempo de POST em rede de evento, não por limite do Convex) |
| Pós-evento / v2 (telão, Instagram) | Schema já deixa espaço (`telaoIntervalMs` em `settings`, `posts.status="approved"` já é a playlist do telão); adicionar isso depois é aditivo, não uma migration destrutiva |

### Scaling Priorities

1. **Não existe "primeiro gargalo" relevante neste volume** — o risco real é operacional (rede do
   local do evento, convidados sem 4G), não o backend.
2. **Se necessário**, o único ponto de atenção é limitar uploads simultâneos grandes (12MB por
   arquivo já é o teto herdado do projeto antigo) e considerar compressão client-side antes do
   `POST`.

## Anti-Patterns

### Anti-Pattern 1: Gate de auth só na UI

**What people do:** esconder a aba/rota `/admin` no React e assumir que isso protege as
mutations por baixo.
**Why it's wrong:** qualquer um pode chamar `api.admin.wines.markGifted` direto pelo console do
navegador ou pelo painel do Convex; sem `requireOwner(ctx)` na função, a mutation aceita.
**Do this instead:** todo arquivo em `convex/admin/*` chama `requireOwner(ctx)` como primeira
linha do handler — sem exceção, mesmo em funções "óbvias".

### Anti-Pattern 2: Reintroduzir tabela de sessões/cookies customizada

**What people do:** trazer o padrão antigo (`sessions` + `sol_equipe` cookie + comparação manual
de senha) só porque "é o que já existia".
**Why it's wrong:** Convex Auth já resolve isso nativamente; recriar sessões manuais reintroduz
toda a superfície de bugs que o projeto antigo teve que blindar a mão (`sameOriginJson`,
rate-limit escopado, TTL de token) sem necessidade.
**Do this instead:** Convex Auth (`Password` provider) com 1–2 contas semeadas manualmente, sem
fluxo de sign-up exposto.

### Anti-Pattern 3: Query pública devolvendo `storageId`/URL de post não aprovado

**What people do:** uma query "genérica" `listPosts` que devolve todos os posts (inclusive
`pending`/`hidden`) e deixa o filtro por `status === "approved"` só no componente React.
**Why it's wrong:** a URL de storage do Convex é acessível por qualquer um que a tenha — se ela
vazar num payload de query pública, a moderação vira decorativa (dá pra ver a foto reprovada
direto pela network tab).
**Do this instead:** duas queries fisicamente separadas — `public/posts.listApproved` (só
`status="approved"`, e só ela resolve `storage.getUrl`) e `admin/posts.listPending`
(`requireOwner`). Nunca uma query só com filtro client-side.

### Anti-Pattern 4: `.collect()` sem índice em tabela que só cresce

**What people do:** `ctx.db.query("posts").collect()` e filtrar em memória por `status`.
**Why it's wrong:** funciona bem com poucos itens, mas não usa o índice `by_status` disponível e
não escala nem é idiomático — Convex recomenda sempre filtrar via `withIndex` quando o campo tem
índice.
**Do this instead:** `ctx.db.query("posts").withIndex("by_status", q => q.eq("status", "pending")).collect()`.

## Integration Points

### External Services

| Serviço | Padrão de integração | Notas |
|---------|---------------------|-------|
| WhatsApp (vendedor "Mistral", presente de vinho) | Link `wa.me/<numero>?text=<mensagem pronta>` gerado no client a partir de `wines.whatsappNumber` | Não é integração de API — é só um link; a marcação de "presenteado" é manual no `/admin`, não automática |
| Vercel (hosting do frontend) | Deploy do build React/Vite; variáveis de ambiente com `VITE_CONVEX_URL` apontando pro deployment Convex | Convex roda como backend gerenciado separado — Vercel só serve o frontend estático/SPA |
| Convex (backend gerenciado) | `ConvexReactClient` no frontend + `npx convex dev`/`deploy` no backend | Sem servidor próprio no meio; deploy do schema/functions é `convex deploy`, independente do deploy do frontend |

### Internal Boundaries

| Fronteira | Comunicação | Considerações |
|----------|---------------|-------------|
| Site público ↔ `convex/public/*` | `useQuery`/`useMutation` sem auth | Toda validação de entrada (formato de telefone, tamanho de recado) acontece na função Convex, não só no form |
| `/admin` ↔ `convex/admin/*` | `useQuery`/`useMutation` com JWT do Convex Auth anexado automaticamente pelo `ConvexAuthProvider` | Gate real é `requireOwner(ctx)` no servidor; a UI só decide o que *mostrar*, nunca o que *permitir* |
| `convex/public/posts.ts` ↔ `_storage` | `ctx.storage.generateUploadUrl()` / `ctx.storage.getUrl()` / `ctx.db.system.get()` | Validação de tipo/tamanho acontece depois do upload, lendo metadados reais — nunca confiar em `file.type` que o cliente informou |
| `convex/settings.ts` ↔ demais módulos | Helper interno (`internalQuery`/função compartilhada) chamado por `public/posts.ts` (decidir auto-publish) e por `admin/settings.ts` (editar) | `settings` é singleton — garantir exatamente 1 documento (seed na primeira execução) evita ambiguidade de "qual linha é a config" |

## Ordem de Build Sugerida (dependências entre componentes)

1. **Fundação Convex + Vercel + Auth** — `npx create convex`, `schema.ts` com as 5 tabelas acima,
   `ConvexReactClient` + `ConvexAuthProvider` no frontend, deploy conectado (Convex dev deployment
   + env var na Vercel), e Convex Auth (`Password`) com as 1–2 contas dos donos semeadas. Nada
   mais pode ser construído sem isso; construir o gate de auth **aqui**, não depois, evita ter que
   retrofitar `requireOwner` em mutations já publicadas (uma delas ficaria aberta por engano).
2. **RSVP (fatia vertical completa)** — tabelas `rsvps`/`rsvpGuests`, mutation pública de
   upsert por telefone, query admin de listagem e a primeira versão de `admin/dashboard.overview`.
   Prioridade #1 porque é o "Core Value" do projeto (PROJECT.md: confirmação sempre chega ao
   dashboard) e é a fatia mais simples para provar o padrão reativo ponta a ponta (sem storage,
   sem moderação).
3. **Vinhos** — seed dos ~37 vinhos (`lib/wines.ts` do projeto antigo), query pública de catálogo
   e mutation admin `markGifted`/`markAvailable`. Depende só da fundação (passo 1); reaproveita o
   mesmo padrão de dashboard do passo 2.
4. **Mural com upload + moderação** — passo mais complexo (widget de upload no cliente,
   `generateUploadUrl`, validação server-side, fila de moderação, galeria pública). Construir
   depois de 2 e 3, quando o padrão "lista reativa + gate admin" já está validado e pode ser
   copiado, reduzindo risco na parte que mexe com arquivo.
5. **Shell do `/admin`** — layout final (sidebar desktop / barra inferior mobile) agregando as
   telas dos passos 2–4 nas seções do v1 (Visão geral, Convidados, Moderação, Presentes, Ajustes —
   sem Instagram, que é v2).
6. **Site público final** — hero, countdown, programa, dress code, mapa/guia da cidade — em boa
   parte conteúdo estático que pode ser desenhado em paralelo aos passos 2–4, mas a integração com
   dados reais (form de RSVP, carta de vinhos, galeria) só fecha depois que os módulos de backend
   correspondentes existem.
7. **Settings + ajustes finos** — `wallAutoPublishPhotos`, `rsvpDeadline`, expostos na aba
   "Ajustes" do passo 5; baixo risco, pode vir a qualquer momento depois do passo 1.
8. **Endurecimento pré-lançamento** — revisão de rate-limit em mutations públicas (Convex não tem
   um equivalente pronto ao `access_failures` do D1 antigo; se necessário, avaliar um componente
   de rate limiting do ecossistema Convex ou um contador simples por IP/telefone numa tabela
   dedicada) e teste de carga leve antes do dia 17/10. **Flag para pesquisa mais profunda na fase
   correspondente do roadmap** — não é um bloqueio de arquitetura, é um detalhe de implementação a
   validar quando o RSVP público estiver perto de ir ao ar.

## Sources

- Convex — Indexes: https://docs.convex.dev/database/indexes (defineSchema/defineTable, withIndex, ordenação implícita por `_creationTime`) — HIGH
- Convex — Reading Data: https://docs.convex.dev/database/reading-data — HIGH
- Convex — Best Practices: https://docs.convex.dev/understanding/best-practices (evitar `.collect()` sem índice, `internalMutation` vs mutation pública, checagem de auth com `ctx.auth`) — HIGH
- Convex — Upload Files: https://docs.convex.dev/file-storage/upload-files (`generateUploadUrl`, fluxo de 3 passos) — HIGH
- Convex — File Metadata: https://docs.convex.dev/file-storage/file-metadata (`ctx.db.system.get`, `contentType`/`size`/`sha256`) — HIGH
- Convex — Auth Functions: https://docs.convex.dev/auth/functions-auth (`ctx.auth.getUserIdentity()`, gate server-side) — HIGH
- Convex Auth — Passwords config: https://github.com/get-convex/convex-auth (provider `Password`, callback `createOrUpdateUser` para bloquear sign-up público) — HIGH
- `design.md` do projeto antigo (`sol-40-integrado`), seções 4 e 7 — fonte de inspiração do modelo de dados e dos invariantes, traduzidos (não copiados) para primitivas Convex — fonte interna do projeto

---
*Architecture research for: site convite/RSVP + dashboard (Convex)*
*Researched: 2026-07-23*
