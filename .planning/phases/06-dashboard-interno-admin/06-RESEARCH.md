# Phase 6: Dashboard Interno (/admin) — Research

**Researched:** 2026-07-25  
**Domain:** autenticação própria com senha compartilhada, sessões revogáveis, dashboard reativo e operações administrativas em Convex  
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- O painel usa uma única senha compartilhada dos donos, verificada no servidor. Telefone/capability de RSVP nunca autentica `/admin`.
- A sessão dura sete dias absolutos desde o login, sobrevive ao fechamento do navegador, não renova com uso e é encerrada no servidor ao sair.
- Expiração/revogação remove imediatamente dados protegidos e volta ao login, preservando somente a subrota/filtro pretendido; rascunhos e dados sensíveis não sobrevivem ao gate.
- Desktop usa sidebar; celular usa barra inferior fixa com `Visão`, `Convidados`, `Moderação`, `Presentes`. Logout fica no rodapé da sidebar e no menu do cabeçalho móvel.
- A Visão geral mostra contagens por pessoa (`yes`, `no`, `pending`), memórias pendentes e vinhos presenteados. Pendências têm prioridade; cards são links inteiros para listas filtradas.
- Badges: Convidados = pessoas pendentes; Moderação = memórias pendentes; Presentes não tem badge.
- Convidados são agrupados por convite/família expansível. Busca parcial encontra família, pessoa e telefone, ignora caixa/acentos e normaliza dígitos. Um filtro seleciona famílias que contêm o estado, mas mantém todas as pessoas do grupo visíveis.
- O admin cria famílias manualmente e adiciona pessoas; importação em massa fica na Phase 7. Edição cobre presença, nomes, contato e telefone.
- Remover uma pessoa preserva a família. Remover a família é ação separada com confirmação reforçada, apaga filhos e revoga sessões públicas. Trocar telefone também revoga todas as capabilities públicas do RSVP.
- Moderação tem abas `Pendentes`, `Aprovadas`, `Ocultas`; pendentes mais antigos primeiro; transições permitidas: `pendente → aprovado/oculto`, `aprovado → oculto`, `oculto → aprovado`.
- O toast de Desfazer da moderação só restaura se ninguém alterou o item depois.
- Presentes tem abas `Disponíveis`/`Presenteados`, preserva as três faixas e busca nome, código Mistral ou presenteador. Marcar exige nome e grava hora no servidor; desfazer pede confirmação e limpa `giftedBy` + `giftedAt`.
- Todas as quatro áreas usam queries protegidas e reativas; mudanças válidas aparecem nas outras sessões dos donos e, quando aplicável, nas superfícies públicas.

### Deferred / Out of Scope

- Contas individuais, papéis, moderadora, OAuth e códigos de equipe.
- Instagram, telão, QR de mesas e ajustes.
- Reserva/checkout/confirmação automática de presentes.
- Importação em massa da lista real, que permanece em `LAUNCH-03`.
- Novas capacidades públicas de RSVP, mural ou catálogo.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Requirement | Research support |
|---|---|---|
| ADMIN-01 | Senha compartilhada verificada no servidor, emitindo sessão | Sessão opaca com hash, TTL absoluto, rate-limit, função agendada de expiração e guarda compartilhada |
| ADMIN-02 | Shell `/admin` responsivo | Rotas `/admin/*`, gate, sidebar/bottom bar, badges e retorno à subrota |
| ADMIN-03 | Contagens ao vivo | Query protegida que lê as tabelas fonte; `useQuery` reativo depois do gate |
| ADMIN-04 | Listar/buscar/editar/remover RSVP | Projeção admin por família, mutations transacionais, índice de revogação e cascade explícito |
| ADMIN-05 | Aprovar/ocultar mural | Query por status, transições fechadas e undo com precondição de versão |
| ADMIN-06 | Marcar vinho presenteado | Mutation protegida que mantém a união discriminada do gift state e grava timestamp no servidor |
</phase_requirements>

## Summary

Esta fase não precisa de Convex Auth, JWT, provedor externo ou nova biblioteca de produção. O produto pede uma única credencial compartilhada, não identidades. A solução de menor superfície é uma capability administrativa própria: o navegador gera um token aleatório de 32 bytes, envia esse token junto da senha a uma mutation de login, e o backend compara a senha com `ADMIN_PASSWORD`, aplica rate-limit e persiste somente `SHA-256(token)` numa tabela `adminSessions`. A sessão vence exatamente sete dias depois; logout a apaga/revoga e uma internal mutation agendada para `expiresAt` garante que assinaturas reativas sejam invalidadas mesmo se nenhum outro write ocorrer.

O ponto de segurança decisivo é que o gate React não é a autorização. Toda query e mutation administrativa deve chamar a mesma guarda backend antes de ler qualquer tabela ou produzir URL de storage. No cliente, somente a query não sensível de status da sessão roda enquanto o gate está fechado; todas as queries de overview, convidados, posts e vinhos são `"skip"` até a sessão estar confirmada. Quando a sessão some, as queries protegidas reagem à alteração da linha de sessão, os componentes de dados são desmontados e o token é removido da memória/localStorage.

Para operações, preserve as APIs públicas mínimas existentes e crie portas administrativas separadas. RSVP exige o maior cuidado: adicionar `rsvpSessions.by_rsvp`, reutilizar `insertInvitation`, manter `publicRef` estável, revogar capabilities ao trocar telefone e fazer cascade explícito ao apagar família. Moderação e presentes devem usar mutations que leem o estado atual e gravam o próximo estado na mesma transação. O undo de moderação envia uma precondição (`expectedStatus` + `expectedModeratedAt` ou uma `version`) para não sobrescrever a ação de outra aba.

**Primary recommendation:** decompor a fase em quatro planos, em vez de forçar os dois placeholders do roadmap: (1) modelo/guarda/testes de auth; (2) gate, shell, rotas e overview; (3) CRUD familiar RSVP; (4) moderação e presentes com invariantes e undo concorrente.

## Current Codebase Findings

### Reuse directly

- `src/main.tsx` já monta `ConvexProvider`; não é necessário trocar por provider de identidade.
- `src/components/ui/Button.tsx`, `Card.tsx`, `Field.tsx` e `Toast.tsx` cobrem o painel sem segundo kit.
- `convex/rsvpSecurity.ts` já demonstra token canônico de 32 bytes, hash SHA-256, expiração absoluta e resolução por índice.
- `convex/rsvpInternal.ts::insertInvitation` já centraliza normalização de telefone, unicidade lógica, limites e criação transacional de família/pessoas.
- `convex/postModel.ts` e `posts.by_status` já definem os três estados e suportam a fila.
- `convex/wineGiftStateValidator` e `setWineGiftStateForSmoke` já documentam a invariante correta de `available` versus `gifted`.
- O harness `convex-test` está estabelecido em `rsvps.test.ts`, `posts.test.ts` e `wines.test.ts`; Vitest já inclui `src/**/*.test.ts` e `convex/**/*.test.ts`.

### Gaps to close

- `src/routes/Admin.tsx` é placeholder deliberado e `src/App.tsx` declara somente a rota exata `/admin`. Subrotas reais exigem `/admin/*` ou rota pai com children.
- Não existe tabela/sessão/admin guard.
- `rsvpSessions` não tem índice `by_rsvp`, necessário para revogar todas as capabilities sem full scan.
- Não há cascade automático em Convex; remover família precisa apagar `rsvpGuests`, `rsvpSessions` e `rsvps` na mutation.
- A função que cria `publicRef` está privada em `rsvpInternal.ts`. Adicionar pessoa precisa de uma nova referência opaca e collision-checked sem recalcular as referências existentes.
- `posts.listApproved` é corretamente público e mínimo; não deve ser ampliado com pendentes, ocultos ou metadados administrativos.
- `wines.listCatalog/listFeatured` omitem corretamente `giftedBy`/`giftedAt`; o painel precisa de projeção separada.
- O ambiente de testes é Node sem React Testing Library/jsdom. Não pressupor testes DOM sem adicionar/configurar ferramentas; helpers, router state e backend podem ser testados sem isso, e o shell pode receber smoke manual/browser.

## Standard Stack

| Library/API | Installed version | Use in this phase |
|---|---:|---|
| Convex | 1.42.3 | schema, queries reativas, mutations transacionais, internal mutation agendada |
| React | 19.2.8 | gate, shell e áreas do dashboard |
| React Router | 7.18.1, declarative/library mode | layout `/admin/*`, subrotas e filtros na URL |
| Tailwind CSS | 4.3.3 | layout responsivo e estados visuais |
| `@convex-dev/rate-limiter` | 0.3.2 | rate-limit global da mutation de login |
| `convex-test` | 0.0.54 | isolamento/autorização/invariantes backend |
| Vitest | 4.1.10 | helpers de sessão, busca, filtros, reducers e timers |

**New dependencies:** nenhuma obrigatória.

### Why not Convex Auth

Convex Auth e provedores OIDC resolvem identidade de usuário, sign-up e contas. Esta fase deliberadamente tem uma senha compartilhada, sem contas ou papéis. Uma capability própria reduz migração, configuração e estados não usados. A documentação Convex também reconhece funções públicas que verificam segredo compartilhado; aqui, a senha só deve abrir uma sessão curta/revogável, nunca acompanhar cada query.

## Recommended Architecture

### Data and trust flow

```text
/admin/convidados?presenca=pending
            |
            v
AdminSessionGate
  token localStorage? -- no --> Login
            |
            +-- getSessionStatus(token) [única query antes da auth]
                      |
             valid ---+--- invalid/expired
               |                 |
               v                 v
          mount AdminShell   clear token/data; Login
               |
               +-- protected overview/families/posts/wines queries
               |      cada uma chama requireAdminSession(token)
               |
               +-- protected mutations
                      guarda + validação + read/check/write atômico

login mutation:
  client gera token 32 bytes
  password + token -> rate-limit -> constant-time compare env
                                  -> INSERT hash(token), expiresAt=now+7d
                                  -> agenda expireAdminSession(sessionId)

logout mutation -> valida token -> DELETE/revoga sessão
                              -> todas as queries que leram a sessão invalidam
```

### Suggested modules

```text
convex/
├── adminModel.ts          # TTL, validators, result envelopes, text limits
├── adminSecurity.ts       # token/hash, password compare, require/resolve session
├── adminRateLimits.ts     # login global
├── adminAuth.ts           # login, status, logout
├── adminInternal.ts       # expiration idempotente/cleanup
├── adminOverview.ts       # counts/badges
├── adminRsvps.ts          # family projection + CRUD
├── adminPosts.ts          # list/transition/undo
├── adminWines.ts          # list/set gift state
└── admin.test.ts          # auth + endpoint isolation + invariants
src/
├── routes/
│   └── Admin.tsx          # route layout/gate, sem domínio operacional
├── components/admin/
│   ├── AdminLogin.tsx
│   ├── AdminShell.tsx
│   ├── AdminOverview.tsx
│   ├── AdminGuests.tsx
│   ├── AdminModeration.tsx
│   └── AdminGifts.tsx
└── lib/
    ├── adminSession.ts    # token/localStorage/storage event; sem dados admin
    ├── adminSearch.ts     # fold accents/case + phone digits
    └── admin*.test.ts
```

Do not treat exact filenames as a mandate; separation of security/domain/public APIs is the important boundary.

## Authentication and Session Design

### Session record

Recommended schema:

```ts
adminSessions: defineTable({
  tokenHash: v.string(),
  createdAt: v.number(),
  expiresAt: v.number(),
}).index("by_token_hash", ["tokenHash"])
  .index("by_expires_at", ["expiresAt"])
```

Deleting the row is sufficient revocation and avoids a lingering valid-looking row. A `revokedAt` field is only useful if an audit trail is a real requirement; it is not required by CONTEXT. Never return `tokenHash` to the browser.

The token should follow the existing RSVP capability contract: 32 cryptographically random bytes, canonical unpadded base64url, generated with `crypto.getRandomValues`. Store it in a dedicated versioned `localStorage` key because D-01 requires survival across browser close. Store no password, family data, drafts, post metadata or wine state in browser persistence.

### Login

1. Browser generates the token.
2. `login({password, token})` validates argument shape before expensive work.
3. Consume a conservative global login bucket. Convex functions do not expose a dependable client IP here; a rotatable client key is not an authorization boundary. A small global bucket is a useful brute-force brake, with the accepted tradeoff that an attacker could temporarily delay owner login.
4. Read `ADMIN_PASSWORD` from the Convex deployment environment. Prefer declaring it in `convex/convex.config.ts` for deploy-time validation/type-safe `env`; never prefix it `VITE_`.
5. Compare fixed-length digests in constant time (XOR every byte); do not early-return by character. Return the same `invalid_credentials` response for missing/misconfigured secret and wrong password at the public boundary, while failing deployment/configuration checks separately.
6. Ensure the token hash does not already exist, insert session with `expiresAt = now + 7 * 24h`, and schedule its expiration in the same mutation.
7. Return `{kind:"authenticated", expiresAt}` but not the raw token (the browser already owns it).

Do not log password, token, token hash or mutation arguments in application logging.

### Absolute expiration and reactivity

Every guard checks `now < expiresAt`; therefore an expired token can never authorize a new call. However, time passing alone does not modify a Convex dependency, so a live `useQuery` is not guaranteed to rerun exactly at expiry. Schedule `expireAdminSession({sessionId, expectedExpiresAt})` at login. It deletes the row only if it still exists with that expiry, making it safe after early logout. The deletion invalidates every protected query that read the session row.

The client should also set a local timer from the server-returned `expiresAt` as a UX backstop, clear data at the boundary, and let the next status call confirm. Server guard remains authoritative if clocks disagree. An indexed periodic cleanup can remove leftovers, but is not the primary authorization mechanism.

### Gate and cross-tab behavior

- `getSessionStatus` returns only `checking` via hook loading, or backend `valid {expiresAt}` / `invalid`; no dashboard data.
- Protected components are not mounted until status is valid. If hooks must remain structurally present, pass `"skip"`; Convex documents that skipped queries do not contact the backend.
- All protected query/mutation results use one invalid-session signal. The gate handles it centrally by unmounting children before rendering login.
- Listen to the browser `storage` event so removing the token in one tab clears other tabs promptly. Server deletion independently invalidates their subscriptions.
- Preserve section/filter in the URL, not sensitive component state. After login, the same `/admin/...` location renders.
- Logout awaits the server mutation before deleting local token. On network failure, fail closed locally and explain that the server session could not be confirmed revoked; retry revocation opportunistically with the still-held token during that attempt.

## Routing and Shell

Prefer stable routes:

```text
/admin                    -> redirect/index Overview
/admin/visao
/admin/convidados?presenca=pending
/admin/moderacao?status=pendente
/admin/presentes?status=gifted
```

This makes card deep links, reloads, browser back/forward and post-expiry return deterministic. Update the SPA rewrite so nested `/admin/*` resolves to `index.html` (the existing catch-all likely already does, but validate). Use `NavLink`/`aria-current` for active navigation. Badges come from the same protected overview query and remain visible across sections.

The shell should not reuse the public `Shell`: its navigation semantics and fixed mobile bottom bar are different. It should reuse tokens/primitives. Reserve bottom padding on mobile so the bar does not cover content; keep 44px targets, visible focus and safe-area inset support. Large destructive actions should not sit next to primary save actions without separation.

## Reactive Overview

Use one protected query returning a compact snapshot:

```ts
{
  attendance: { yes, no, pending, total },
  pendingMemories,
  giftedWines
}
```

Counts are by `rsvpGuests`, not families. For this event-sized dataset, bounded `collect()` and in-memory counting are reasonable and simpler than denormalized counter documents. `posts.by_status` can count pending rows; 37 wines are fixed and cheap to scan. If scale grows materially, add `rsvpGuests.by_attendance` and `wines.by_status`; do not add indexes speculatively merely to count dozens/hundreds of rows.

Convex `useQuery` subscriptions update automatically when a read document/range changes. Do not add polling, manual cache invalidation or a second client state copy. Whole-card links should carry the relevant query parameter.

## RSVP Administration

### Protected projection

Return admin IDs/revisions only from a protected function:

```ts
type AdminFamily = {
  id: Id<"rsvps">
  displayName: string
  phone: string
  contact?: string
  updatedAt: number
  guests: Array<{
    id: Id<"rsvpGuests">
    name: string
    attendance: "pending" | "yes" | "no"
    sortOrder: number
    respondedAt?: number
  }>
}
```

Do not extend public `getCurrent`; it intentionally omits phone/internal IDs and scopes to one capability.

At likely event scale, one protected list followed by client-side accent/case/digit folding gives immediate search and preserves family context. Fetch all guests in one bounded read and group by `rsvpId`, rather than issuing an uncontrolled N+1 query per family. Empty families must remain operable in “Todos”.

### Mutations and invariants

- **Create family:** reuse `insertInvitation`, including equivalent legacy/current Brazilian-phone uniqueness. Zero guests is allowed by existing fixtures/model and remains deletable/editable.
- **Add person:** validate name/limit, choose `sortOrder = max + 1`, create a fresh stable `publicRef`, collision-check within the family, and never renumber or regenerate existing refs.
- **Edit family:** normalize/validate display name/contact/phone. When phone logically changes, assert uniqueness against all lookup candidates, delete every `rsvpSession` for that RSVP using new `by_rsvp`, then patch phone. Perform all in one mutation so the new key and revocation commit together.
- **Edit person:** validate ownership (`guest.rsvpId === rsvpId`), name and attendance. Set `respondedAt = undefined` for `pending`; for a transition to `yes`/`no`, stamp server time. Do not trust a client timestamp.
- **Remove person:** ownership check, then delete only that row. Preserve remaining `sortOrder`/`publicRef`; gaps are harmless.
- **Remove family:** read children and sessions by index, delete them, then delete RSVP, all transactionally. Confirmation strength is client UX, not backend authorization.

Every mutation should accept current `updatedAt`/expected values where an open editor could be stale. Return `conflict` instead of silently replacing a newer edit from the other owner. Patch `rsvps.updatedAt` when a child changes so the family has one revision signal.

## Moderation

`posts.by_status` already supports tabs. For pending, query `eq("pendente").order("asc")`; Convex index order includes creation-time tie-breaking, and `createdAt` can be returned for display. Generate image URLs only after the admin guard passes. Keep a finite `.take()`/pagination boundary; an initial 100 is consistent with the public gallery and enough for v1, while pagination is preferable if the queue can exceed that.

Use one transition mutation:

```ts
transitionPost({
  token,
  postId,
  fromStatus,
  fromModeratedAt,
  toStatus,
})
```

It must:

1. authorize;
2. read post;
3. confirm `(status, moderatedAt)` matches the precondition;
4. validate the allowed transition set;
5. patch `status`, `moderatedAt = now`, and `approvedAt`.

Recommended timestamp semantics: approving sets `approvedAt = now`; hiding clears `approvedAt` because it is no longer currently approved. This keeps `approvedAt` as “current publication began”, not historical audit data. If historical moderation becomes needed, add an event table later; it is outside v1.

The initial action returns the exact post-action `(status, moderatedAt)` plus prior state. Undo calls the same transition mechanism with the post-action values as its precondition. A second owner’s later change produces `conflict` and the toast explains that the newer change was kept. Convex mutations are serializable and automatically retried, so the read-check-write is sufficient; no client-side lock is needed.

## Gifts

Create a protected projection that includes `giftedBy`/`giftedAt`, while the public projections remain unchanged. Extract the gift-state normalization/assertion currently embedded in `wineInternal.ts` so both internal smoke tooling and admin mutation share it.

`markGifted({token, wineId/productCode, giftedBy, expectedUpdatedAt})` trims/validates the name, stamps `giftedAt` and `updatedAt` on the server, and atomically writes all gifted fields. `markAvailable` validates revision/status and atomically writes:

```ts
{
  status: "available",
  giftedBy: undefined,
  giftedAt: undefined,
  updatedAt: now,
}
```

Never allow:

- `gifted` without both metadata fields;
- `available` retaining either metadata field;
- client-supplied `giftedAt`;
- duplicate `productCode` matches to be silently accepted.

The public catalog already reads `status`, so these writes automatically update “Já escolhido com carinho”.

## Security Checklist

- Declare and configure `ADMIN_PASSWORD` only in the Convex deployment; `VITE_*` variables are public bundle inputs.
- Validators on every public function, plus domain validation after authorization.
- One guard imported by every admin endpoint; add a source-level regression test or explicit endpoint matrix so a new function cannot be forgotten.
- No admin data query before verified session, and no sensitive data returned by status/login.
- No password/token/hash logging; password input uses `type=password`, `autoComplete=current-password`.
- Rate-limit failed and successful login attempts consistently enough not to create an easy oracle.
- Public queries remain minimal and unchanged.
- React renders text, not `dangerouslySetInnerHTML`; no admin-entered HTML.
- LocalStorage contains only the bearer token and expiry hint. XSS can steal localStorage tokens, so keep the application free of raw HTML/script injection and use the existing same-origin CSP/deployment hardening when available.
- Server authorization is checked again inside each mutation even if the UI hides actions.

## Recommended Plan Decomposition

### Plan 06-01 — Auth model and security contract

- `adminSessions`, indexes, model/security/rate-limit/internal expiry.
- Login, status, logout and typed `ADMIN_PASSWORD`.
- Backend tests first: valid/wrong/malformed, collision, boundary expiry, logout, scheduled expiration idempotency, brute-force bucket.

### Plan 06-02 — Gate, routes, shell and overview

- Persistent token helper and cross-tab event.
- `/admin/*`, login gate, intent preservation and safe unmount on invalid session.
- Sidebar/bottom bar/badges; protected reactive overview.
- Build + route/deep-link/session smoke.

### Plan 06-03 — Family RSVP operations

- `rsvpSessions.by_rsvp`; protected family DTO.
- Create family/add person/edit family/edit person/remove person/remove family.
- Search/filter/expand UI and confirmations.
- Revocation/cascade/conflict tests.

### Plan 06-04 — Moderation and gifts

- Protected lists and mutations.
- Moderation tabs, oldest-first queue, conditional undo.
- Gift tabs/search, required presenter, confirmed unmark.
- Public reactivity and concurrent-write tests.

## Validation Architecture

### Test layers

| Layer | Tool | What it proves |
|---|---|---|
| Pure domain | Vitest Node | token encoding/storage helper, accent/digit search, family filter semantics, allowed transitions, result reducers |
| Convex integration | `convex-test` + real schema/modules | guards, session lifecycle, CRUD cascades, state invariants, projections and transactional conflicts |
| Compile/build | `npm run build` | generated API usage, route/component types, production bundle |
| Browser/manual smoke | Vite + real Convex dev deployment | WebSocket reactivity, nested route refresh, localStorage/storage-event tabs, responsive shell, focus/dialog/toast behavior |
| Production/preview smoke | deployed preview | `ADMIN_PASSWORD` deployment scope, SPA rewrite, scheduled expiry wiring |

### Wave 0 / harness requirements

1. Add an admin-specific `makeAdminTest` following existing injected `convexTest` module-glob patterns; register the existing rate-limiter component.
2. Make password lookup injectable or set/restore `process.env.ADMIN_PASSWORD` in tests exactly as existing fixture tests manage env. Never hardcode the production secret.
3. Expose pure `isAdminSessionActive(expiresAt, now)` and transition/normalization helpers for boundary tests.
4. Because Convex test mocks do not execute cron/schedules as wall-clock production, directly invoke the internal expiry mutation in tests and add one real-dev smoke for the scheduled call.
5. Keep UI domain transformations out of JSX so the Node test environment can cover them without jsdom.

### Requirement-to-test matrix

| Requirement / decision | Automated evidence | Manual evidence |
|---|---|---|
| ADMIN-01, D-01/D-02 | wrong password rejected; strong valid token creates hash-only record; `now < expiresAt`; exact boundary invalid; logout deletion; expiry internal mutation idempotent; login rate-limit | close/reopen browser remains logged in; scheduled expiry returns to login |
| D-03/D-04 | session state reducer clears token/data and preserves only URL; logout mutation required before success | expire/revoke while a protected tab is open; confirm same subroute after login; logout placement |
| ADMIN-02, D-06/D-10/D-11 | route helpers/deep-link parameters; build | desktop sidebar; mobile four-item bar; focus/44px/safe area; badges |
| ADMIN-03, D-09/D-25 | overview query rejects invalid token; exact counts by person/status | two tabs: edit RSVP/moderate/gift in one, see overview/badge update in other |
| ADMIN-04, D-13–D-18 | projection isolation; normalized unique phone; create/add/edit; by-rsvp revocation; person delete; family cascade; stale revision conflict | search accent/case/partial phone; filter retains all family members; confirmations |
| ADMIN-05, D-19–D-21 | status ordering; only legal transitions; timestamps; undo succeeds only with matching precondition; concurrent change wins | full image/text card; tab movement; toast duration and conflict copy; public album adds/removes reactively |
| ADMIN-06, D-22–D-24 | required trimmed presenter; server time; mark invariant; unmark clears both fields; stale revision conflict | search/tabs/faixas; confirmation before unmark; public wine status updates |
| No pre-auth exposure | call every admin query/mutation with missing/malformed/expired/revoked token and assert no DTO/write; public APIs unchanged | inspect Network/WebSocket before login: only session-status request, no overview/family/post/wine payload |

### Mandatory backend authorization matrix

For each exported admin function, run table-driven cases:

```text
missing token
malformed token
unknown token
expired token
revoked/deleted token
valid token
```

Queries must return only the shared invalid-session envelope (or throw a deliberately uniform auth error) and never partial data. Mutations must leave all domain tables byte-for-byte unchanged in the five invalid cases.

### Concurrency validation

- Create one post, read revision A, apply A→B, then apply a second valid B→C. Attempt undo using expected B revision from the first caller; assert `conflict` and C remains.
- Read family/wine at revision A in two simulated owners; first update succeeds and bumps revision; second stale update returns `conflict`.
- Run equivalent-phone check+insert/update concurrently where possible; Convex serializable OCC should leave one logical phone owner.

### Commands

```bash
npm test
npm run build
npx convex dev
```

For focused development:

```bash
npx vitest run convex/admin.test.ts
npx vitest run src/lib/adminSession.test.ts src/lib/adminSearch.test.ts
```

### Exit criteria

- All ADMIN-01–06 rows have automated evidence plus the listed manual smoke.
- No protected DTO appears before session validation.
- Every admin public endpoint is in the authorization matrix.
- Session expiry/logout clears all mounted protected views and preserves the URL destination.
- RSVP delete/phone-change revokes capabilities and preserves unrelated families.
- Undo cannot overwrite another owner’s later action.
- Gift state never enters a partial combination.
- `npm test` and `npm run build` pass with pre-existing user changes preserved.

## Common Pitfalls

1. **Using a React route guard as security.** It only hides UI; callable Convex functions remain public unless each one authorizes.
2. **Mounting dashboard hooks while status is loading.** `undefined` means loading, not authorized. Use a separate gated subtree or `"skip"`.
3. **Checking expiry only with `Date.now()` inside a query.** Time alone is not a reactive database dependency; schedule deletion and keep a client timer.
4. **Saving the password or raw token server-side.** Persist only token hash; password stays in deployment env and only in login request memory.
5. **Sliding expiry accidentally.** Never patch `expiresAt` on status/query use.
6. **Full-scanning sessions on phone/delete.** Add `rsvpSessions.by_rsvp`.
7. **Regenerating guest refs after reorder/name/phone changes.** Existing public forms address guests by `publicRef`; keep them stable.
8. **Assuming database cascade/unique constraint.** Convex requires explicit cascade; indexes are not uniqueness constraints. Enforce uniqueness in the same mutation.
9. **Returning pending/hidden posts through the public query.** Add a protected admin query instead of broadening `listApproved`.
10. **Implementing undo as unconditional reverse.** Require the exact post-action state/revision.
11. **Letting client choose timestamps.** `respondedAt`, `moderatedAt`, `approvedAt`, `giftedAt`, `updatedAt` are server-owned.
12. **Duplicating reactive data into long-lived local React state.** It creates stale views. Keep local state for drafts/expanded rows only.
13. **Forcing scope into two giant plans because ROADMAP has placeholders.** The locked decisions now exceed that placeholder decomposition; four independently verifiable plans reduce security and merge risk.

## Open Questions for Planning

No product question blocks planning. `06-CONTEXT.md` records manual family/person creation as locked and bulk import as Phase 7; plan to that contract.

One technical choice should be made consistently in the plan: whether invalid-session responses are discriminated return envelopes or uniform thrown auth errors. Envelopes make mid-session expiry easier to handle without error-boundary noise and are recommended for this project because public RSVP already uses result unions.

## Sources

### Primary / official

- [Convex Authentication overview](https://docs.convex.dev/auth/overview)
- [Convex environment variables](https://docs.convex.dev/production/environment-variables)
- [Convex function validation](https://docs.convex.dev/functions/validation)
- [Convex React queries, reactivity and `skip`](https://docs.convex.dev/client/react/overview)
- [Convex mutations and transactions](https://docs.convex.dev/functions/mutation-functions)
- [Convex OCC and serializability](https://docs.convex.dev/database/advanced/occ)
- [Convex indexes](https://docs.convex.dev/database/reading-data/indexes/)
- [Convex pagination](https://docs.convex.dev/database/pagination)
- [Convex scheduled functions](https://docs.convex.dev/scheduling/scheduled-functions)
- [Convex internal functions](https://docs.convex.dev/functions/internal-functions)
- [Convex testing with `convex-test`](https://docs.convex.dev/testing/convex-test)
- [React Router declarative routing](https://reactrouter.com/start/declarative/routing)
- [React Router navigation](https://reactrouter.com/start/declarative/navigating)
- [React Router SPA hosting](https://reactrouter.com/how-to/spa)
- [Vite environment variables and public `VITE_*` exposure](https://vite.dev/guide/env-and-mode)
- [MDN `storage` event](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event)
- [Vitest timer mocks](https://vitest.dev/guide/mocking/timers)

### Project evidence

- `.planning/phases/06-dashboard-interno-admin/06-CONTEXT.md`
- `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`
- `.planning/phases/03-rsvp/03-CONTEXT.md`
- `.planning/phases/04-carta-de-vinhos/04-CONTEXT.md`
- `.planning/phases/05-mural-de-mem-rias-modera-o/05-CONTEXT.md`
- `convex/schema.ts`, `rsvpSecurity.ts`, `rsvpInternal.ts`, `posts.ts`, `postModel.ts`, `wines.ts`, `wineModel.ts`, `wineInternal.ts`
- `src/App.tsx`, `src/main.tsx`, `src/routes/Admin.tsx`, shared UI primitives and existing tests

---

*Research artifact for planning Phase 6. No implementation files were modified.*
