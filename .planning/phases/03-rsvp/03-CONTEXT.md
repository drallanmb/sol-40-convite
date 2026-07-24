# Phase 3: RSVP - Context

**Gathered:** 2026-07-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Entrega o RSVP público em uma rota dedicada, `/confirmar`. O convidado informa o telefone, o sistema identifica o convite/família e libera a lista de pessoas para confirmar ou recusar presença individualmente. A mesma entrada por telefone reabre as respostas atuais para edição, sem conta, senha ou acesso ao painel administrativo.

Cobre RSVP-01 a RSVP-05: normalização de telefone brasileiro, schema Convex `rsvps`/`rsvpGuests`, resposta por pessoa, reabertura por telefone e rate-limit das operações públicas.

**Fora do escopo desta fase:**
- CRUD, busca e edição global de RSVPs pelos donos em `/admin` → Phase 6
- Importação da lista real de convidados e ajustes operacionais finais → Phase 6/7
- Conta, senha ou login individual de convidado → explicitamente fora do v1
- Carta de vinhos, mural e auth dos donos → Phases 4, 5 e 6

</domain>

<decisions>
## Implementation Decisions

### Destino e entrada do RSVP

- **D-01:** O RSVP vive em uma **rota dedicada `/confirmar`**, não como formulário aberto dentro da home.
- **D-02:** A página pública leva a `/confirmar` por **dois pontos de entrada**: botão principal no hero e link **“Confirmar presença”** na navegação. A Phase 3 substitui o comentário/estado sem destino deixado no hero pela Phase 2.

### Identificação e reabertura por telefone

- **D-03:** O telefone funciona como **chave de acesso leve**: o convidado o digita em `/confirmar`, o sistema identifica o convite/família e então mostra as pessoas e as respostas atuais.
- **D-04:** Esse fluxo não cria conta nem concede acesso ao `/admin`. Telefone identifica somente o convite/família; nunca autentica equipe.
- **D-05:** O próprio convidado pode reabrir e editar respostas repetindo a entrada por telefone em `/confirmar`. A edição administrativa de qualquer família continua reservada à Phase 6.
- **D-06:** Depois de uma busca válida, o convite fica liberado **somente durante a sessão atual do navegador**. Uma nova sessão volta a pedir o telefone.

### Resposta da família

- **D-07:** O convidado pode **salvar parcialmente**. Cada pessoa aceita `vai`, `não vai` ou permanece `pendente`; não é obrigatório responder por todos em uma única visita.
- **D-08:** Salvar novamente atualiza o mesmo RSVP/família; nunca cria duplicata para o mesmo telefone.
- **D-09:** O formulário inclui **um contato opcional, compartilhado pelo convite**, para WhatsApp ou e-mail. Pessoas individuais não ganham campos de contato separados nesta fase.

### Prazo e continuidade

- **D-10:** A copy mostra o prazo literal **“30 de setembro”**.
- **D-11:** O prazo é **informativo**, não um bloqueio. Depois de 30 de setembro, novas respostas e edições continuam disponíveis.

### Claude's Discretion

- Composição visual de `/confirmar`, desde que reutilize o design system pôr do sol, seja mobile-first e mantenha a etapa de telefone separada da etapa de respostas.
- Mecanismo técnico que mantém o acesso durante a sessão, desde que não transforme o fluxo em conta/login persistente e não exponha acesso administrativo.
- Copy exata de sucesso, erro, número não encontrado e rate-limit. Deve ser clara e acolhedora; sucesso pode diferenciar respostas com presença, sem presença e parciais.
- Limites exatos do rate-limit, fixtures/demo para desenvolvimento e estratégia de testes, respeitando RSVP-05 e sem armazenar dados sensíveis no cliente além do necessário para a sessão.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Escopo e requisitos atuais

- `.planning/ROADMAP.md` § “Phase 3: RSVP” — goal, dependência, requisitos e critérios de sucesso da fase.
- `.planning/REQUIREMENTS.md` § “RSVP” — RSVP-01 a RSVP-05; conta de convidado permanece fora do escopo.
- `.planning/PROJECT.md` — stack, core value e decisões de simplificação do projeto atual.
- `.planning/phases/02-convite-p-blico/02-CONTEXT.md` — D-05 e Deferred Ideas: composição atual da home e entrada futura de RSVP na navegação.

### Projeto atual

- `convex/schema.ts` — stub do schema e fronteira já documentada para `rsvps`/`rsvpGuests`.
- `src/routes/Home.tsx` — composição atual da página pública onde hero e navegação recebem o novo destino.
- `src/components/invite/Hero.tsx` — CTA cujo destino de RSVP foi explicitamente adiado para a Phase 3.
- `src/components/layout/Shell.tsx` — navegação desktop/mobile alimentada por `NAV_LINKS`.
- `src/content/event.ts` — fonte canônica dos links de navegação e IDs da página.
- `src/components/ui/Field.tsx` — campo base para telefone e contato opcional.
- `src/components/ui/Button.tsx` — CTAs e ações do formulário.
- `src/components/ui/Card.tsx` — superfície natural para o gate e a lista da família.
- `src/components/ui/Toast.tsx` — feedback acessível já existente.
- `src/index.css` — tokens `--color-rsvp-sim`, `--color-rsvp-pendente` e `--color-rsvp-nao`, além do design system.
- `src/App.tsx` — roteamento atual; ponto de integração da rota `/confirmar`.

### Referência do projeto anterior

- `/Users/allanmesquitabrito/Documents/Site Sol 40 anos/sol-40-integrado/design.md` §§ 3, 4, 6, 7 e 8 — semântica de telefone/família, modelo anterior e invariantes; usar como referência, sem ressuscitar contas, códigos ou papéis removidos do v1 atual.
- `/Users/allanmesquitabrito/Documents/Site Sol 40 anos/sol-40-integrado/lib/phone.mjs` — normalização anterior e regra de match pelo número completo.
- `/Users/allanmesquitabrito/Documents/Site Sol 40 anos/sol-40-integrado/tests/phone.test.mjs` — casos brasileiros existentes, inclusive DDD 55 e prefixo internacional.
- `/Users/allanmesquitabrito/Documents/Site Sol 40 anos/sol-40-integrado/app/api/rsvp/route.ts` — atualização atômica anterior por pessoa; adaptar à decisão atual de salvamento parcial.
- `/Users/allanmesquitabrito/Documents/Site Sol 40 anos/sol-40-integrado/app/convite/EventSite.tsx` — UI anterior de RSVP, copy do prazo e estados `pendente`/`sim`/`nao`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `Field`, `Button`, `Card` e `Toast` já cobrem entrada, ações, superfície e feedback do fluxo.
- `Shell` já renderiza a mesma lista de links no desktop e no menu mobile.
- `src/index.css` já define cores semânticas AA para RSVP: `sea` para sim, `wine` para não e marrom dedicado para pendente.
- O cliente inteiro já está sob `ConvexProvider` em `src/main.tsx`.

### Established Patterns

- React Router com rotas declaradas em `src/App.tsx`.
- Conteúdo e navegação centralizados em `src/content/event.ts`.
- Componentes mobile-first, Tailwind v4, foco visível e alvos de toque de pelo menos 44px.
- Vitest configurado em `vite.config.ts`; funções puras vivem em `src/lib/` com testes adjacentes.
- O schema Convex começa vazio de propósito e deve ser expandido somente pela fase proprietária.

### Integration Points

- Adicionar `/confirmar` ao router sem alterar `/admin`.
- Atualizar hero e `NAV_LINKS` para apontarem à nova rota.
- Criar funções Convex públicas para buscar a família e salvar atualizações parciais, com rate-limit.
- Manter a API pronta para queries administrativas futuras, sem construir o dashboard nesta fase.

</code_context>

<specifics>
## Specific Ideas

- O modelo mental aprovado é **“como login”**, mas sem conta: digitar o telefone libera a família durante a sessão do navegador.
- A tela deve deixar claro quais pessoas continuam pendentes depois de um salvamento parcial.
- Copy obrigatória: **“Confirme até 30 de setembro”**, sem impedir uso tardio.
- O acesso deve continuar simples o bastante para alguém abrir pelo WhatsApp no celular e responder sem cadastro.

</specifics>

<deferred>
## Deferred Ideas

- Busca, edição e remoção administrativa de qualquer RSVP dentro de `/admin` → Phase 6 (`ADMIN-04`).
- Importação/colagem da lista real de convidados e telefones → Phase 6/7.

</deferred>

---

*Phase: 3-RSVP*
*Context gathered: 2026-07-24*
