# Roadmap: Sol faz 40 — Site Convite

## Overview

Do zero ao site pronto para a festa de 17/10/2026: primeiro a fundação (scaffold Convex + Vite/React/Tailwind, deploy Vercel e o design system pôr do sol portado do projeto antigo), depois o convite público, e então os três módulos de dados independentes (RSVP, carta de vinhos, mural moderado) que podem ser construídos em paralelo. Com os dados no lugar, o dashboard interno consolida tudo ao vivo, e a última fase é endurecimento e lançamento. As fases 2–5 dependem só da fase 1 e podem rodar em paralelo; a fase 6 depende dos schemas de 3/4/5.

## Phases

- [x] **Phase 1: Fundação, Design System & Deploy** - Scaffold Convex + Vite/React/TS/Tailwind, pipeline Vercel e identidade visual portada (completed 2026-07-23)
- [x] **Phase 2: Convite Público** - Página do evento: hero, countdown, programa, dress code, local/Aracaju (completed 2026-07-24)
- [x] **Phase 3: RSVP** - Confirmação de presença pública por telefone, com edição (completed 2026-07-24)
- [x] **Phase 4: Carta de Vinhos** - Catálogo de presentes que redireciona para o WhatsApp (completed 2026-07-24)
- [x] **Phase 5: Mural de Memórias + Moderação** - Envio de fotos/recados com fila de moderação (completed 2026-07-24)
- [x] **Phase 6: Dashboard Interno (/admin)** - Painel dos donos: confirmações ao vivo, convidados, moderação, presentes (completed 2026-07-25)
- [ ] **Phase 7: Endurecimento & Lançamento** - Rate-limit, testes em dispositivo real, checklist dos donos, deploy de produção

## Phase Details

### Phase 1: Fundação, Design System & Deploy

**Goal**: Projeto scaffoldado e no ar na Vercel com o Convex conectado e a identidade visual pôr do sol disponível como sistema de design.
**Depends on**: Nothing (first phase)
**Requirements**: SETUP-01, SETUP-02, SETUP-03, DESIGN-01, DESIGN-02
**Success Criteria** (what must be TRUE):

  1. Um "olá mundo" com a stack (Vite+React+TS+Tailwind v4+Convex) faz deploy na Vercel e o refresh em `/admin` não quebra
  2. `npx convex deploy` roda no build da Vercel; preview e produção usam backends Convex separados
  3. Tokens de cor (paleta pôr do sol) e fontes (Alegreya + Gabarito) estão disponíveis como classes/tema Tailwind
  4. Primitivos de UI (botão, campo, card, toast) e o shell/layout base renderizam com a identidade visual

**Plans**: 3/3 plans executed

Plans:

- [x] 01-01-PLAN.md — Scaffold Vite+React+TS+Tailwind v4+Convex+React Router v7, versões pinadas, rotas / e /admin, cliente Convex
- [x] 01-02-PLAN.md — Pipeline de deploy Vercel+Convex (buildCommand encadeado, vercel.json SPA rewrite, env server-only, preview/prod)
- [x] 01-03-PLAN.md — Design system: tokens de cor/fontes no @theme + primitivos (botão/campo/card/toast) + shell base

### Phase 2: Convite Público

**Goal**: Página pública do convite completa e responsiva, ainda sem interações de backend.
**Depends on**: Phase 1
**Requirements**: INVITE-01, INVITE-02, INVITE-03, INVITE-04
**Success Criteria** (what must be TRUE):

  1. O convidado vê o hero com o sol e a contagem regressiva correta (offset `-03:00`, certa em qualquer fuso)
  2. As seções de programa, dress code e local/mapa de Aracaju + guia da cidade aparecem
  3. Topbar e footer funcionam e a página é usável no celular

**Plans**: 8/8 plans executed

Plans:

- [x] 02-08-PLAN.md

**Wave 1**

- [x] 02-01-PLAN.md — Wave 0 (vitest) + `src/content/event.ts` + countdown puro (`getEventState`, `pluralizeUnit`, `useCountdown`)
- [x] 02-02-PLAN.md — Assets do projeto antigo para `public/` (comprimidos) + metadados do `index.html` (título, description, OG, favicon)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02-03-PLAN.md — Hero: céu/sol/horizonte, palmeiras em SVG, mar animado + `prefers-reduced-motion`
- [x] 02-04-PLAN.md — Countdown UI: seção de 4 estados + trilho compacto do topbar
- [x] 02-05-PLAN.md — Seções programa (7 blocos) e dress code (regras + callout + galeria)
- [x] 02-06-PLAN.md — Local (card + mapa sob clique) + guia de Aracaju (4 cards) + 3 hotéis

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 02-07-PLAN.md — Topbar com scroll/hambúrguer/trilho + skip link + composição da página em `Home.tsx`

### Phase 3: RSVP

**Goal**: Convidado confirma presença sem login e pode editar a resposta; os dados ficam prontos para o dashboard.
**Depends on**: Phase 1
**Requirements**: RSVP-01, RSVP-02, RSVP-03, RSVP-04, RSVP-05
**Success Criteria** (what must be TRUE):

  1. `normalizePhone` converte telefones brasileiros para uma forma canônica (testado isoladamente)
  2. O convidado informa telefone e confirma presença por pessoa (vai / não vai)
  3. Buscando pelo telefone, o convidado reabre e edita a resposta já enviada (sem virar duplicata)
  4. Mutations públicas de RSVP têm rate-limit

**Plans**: 5/5 plans executed

Plans:
**Wave 1**

- [x] 03-01-PLAN.md — Wave 0: dependências/harness Convex, `normalizePhone`, schema `rsvps`/`rsvpGuests`/`rsvpSessions` e fixtures internas dev-only
- [x] 03-02-PLAN.md — Wave 1: backend público seguro com capability/hash/expiração, leitura escopada, sparse save idempotente e rate limits precisos

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 03-03-PLAN.md — Wave 2: fundação frontend de copy/entry points/primitivos, modelo sparse, sessionStorage/token retry e clock de prazo

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 03-04-PLAN.md — Wave 3: rota `/confirmar` com restauração, phone gate, formulário acessível e fluxo normal de salvar/reabrir

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 03-05-PLAN.md — Wave 4: dialog/estados completos, responsividade/acessibilidade e validação Nyquist/manual final

### Phase 4: Carta de Vinhos

**Goal**: Convidado escolhe um vinho e é levado ao WhatsApp do vendedor, sem duplicação entre convidados.
**Depends on**: Phase 1
**Requirements**: GIFT-01, GIFT-02, GIFT-03, GIFT-04
**Success Criteria** (what must be TRUE):

  1. O catálogo de ~37 vinhos aparece na página pública
  2. Clicar em "Presentear pelo WhatsApp" abre o `wa.me` com número e mensagem pré-preenchida corretos
  3. Vinho marcado como presenteado no dashboard mostra "já escolhido" e não é oferecido de novo

**Plans**: 4/5 plans executed

Plans:
**Wave 1**

- [x] 04-01-PLAN.md
- [x] 04-02-PLAN.md

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 04-03-PLAN.md

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 04-04-PLAN.md

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 04-05-PLAN.md

### Phase 5: Mural de Memórias + Moderação

**Goal**: Convidado envia foto/recado; nada aparece em público sem aprovação.
**Depends on**: Phase 1
**Requirements**: WALL-01, WALL-02, WALL-03, WALL-04, WALL-05
**Success Criteria** (what must be TRUE):

  1. O convidado envia uma foto (upload Convex) e um recado de texto
  2. Tipo e tamanho da foto são validados no servidor após o upload (não só no cliente)
  3. A galeria/álbum público mostra SOMENTE posts com status aprovado
  4. Uploads públicos têm rate-limit

**Plans**: 5/5 plans complete

Plans:

- [x] 05-01-PLAN.md
- [x] 05-02-PLAN.md
- [x] 05-03-PLAN.md
- [x] 05-04-PLAN.md
- [x] 05-05-PLAN.md

- [x] 05-01: Schema `posts` (pensado p/ telão v2) + upload 3-passos + validação server-side + downscale no cliente
- [x] 05-02: Envio de recado + galeria pública (só aprovados) + rate-limit

### Phase 6: Dashboard Interno (/admin)

**Goal**: Os donos operam tudo de um painel protegido que atualiza ao vivo.
**Depends on**: Phase 3, Phase 4, Phase 5
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, ADMIN-06
**Success Criteria** (what must be TRUE):

  1. O dono entra com a senha compartilhada; sem senha, `/admin` não expõe dados
  2. A visão geral mostra a contagem de confirmações atualizando ao vivo (query reativa)
  3. O dono lista/busca/edita/remove convidados e RSVPs
  4. O dono aprova/oculta posts do mural na fila de moderação
  5. O dono marca vinhos como presenteados

**Plans**: 7/7 plans executed

Plans:

- [x] 06-01-PLAN.md
- [x] 06-02-PLAN.md
- [x] 06-03-PLAN.md
- [x] 06-04-PLAN.md
- [x] 06-05-PLAN.md
- [x] 06-06-PLAN.md
- [x] 06-07-PLAN.md

**Wave 1**

- [x] 06-01: Auth do dono — senha compartilhada, sessão opaca revogável de 7 dias e gate cliente fail-closed

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 06-02: Shell `/admin` responsivo + navegação canônica + Visão geral e badges reativos

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 06-03: Operação de convidados por família — busca/filtros, criação manual, edição, remoções, conflitos e revogação RSVP

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 06-04: Moderação e Presentes — filas/tabs, transições e undo condicionais, presentes atômicos e reatividade pública

**Wave 5** *(gap closure; blocked on Wave 4 completion)*

- [x] 06-05: Lifecycle físico e migração paginada das sessões RSVP
- [x] 06-07: Pending state por registro e proteção contra submissões duplicadas

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 06-06: Revogação por geração e cascade RSVP sem teto fixo

### Phase 7: Endurecimento & Lançamento

**Goal**: Site testado em condições reais e publicado em produção para a festa.
**Depends on**: Phase 6
**Requirements**: LAUNCH-01, LAUNCH-02, LAUNCH-03, LAUNCH-04
**Success Criteria** (what must be TRUE):

  1. `wa.me`, countdown e upload de foto foram testados em dispositivo real (WebView iOS/Android, fuso diferente, HEIC no Safari)
  2. Acessibilidade AA e uso no celular revisados
  3. Checklist dos donos concluído (domínio/origem canônica, senha forte e lista real importada/revisada, sem introduzir variável não consumida)
  4. O site está no ar em produção e verificado ao vivo

**Plans**: 4/6 plans executed

Plans:

**Wave 1**

- [x] 07-01-PLAN.md — Importador CSV protegido: tracer vertical, pending-only, lotes, partial success e relatório sem overwrite

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 07-02-PLAN.md — Origem canônica, gate Playwright/axe AA/mobile e artefatos operacionais honestos

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 07-03-PLAN.md — Vercel + Convex Preview/Production, segredo server-only, backup e smoke `.vercel.app`

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 07-04-PLAN.md — Core de publicação: Cloudflare/domínio/redirect, verificações executáveis, smokes e rollback

**Wave 5** *(07-05 e 07-06 independentes entre si; blocked on Wave 4 completion)*

- [ ] 07-05-PLAN.md — Follow-up independente: importar/revisar lista real e assinar Gate E antes de divulgar
- [ ] 07-06-PLAN.md — Follow-up independente: matriz física iOS/Android/WebViews/HEIC/fuso/admin

**Cross-cutting constraints:**

- Nenhum segredo, PII de convidado, foto privada, capability, CSV real ou backup entra em source control, logs ou evidência commitada.
- Preview e Production permanecem isolados; rollback de frontend nunca é descrito como rollback de Convex, env ou dados.
- Publicação não espera lista real ou hardware; 07-05 bloqueia apenas divulgação e 07-06 bloqueia apenas conclusão de LAUNCH-01/02.

## Progress

**Execution Order:**
Fases executam em ordem numérica: 1 → 2 → 3 → 4 → 5 → 6 → 7 (2–5 são independentes após a 1 e podem ser paralelizadas).

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Fundação, Design System & Deploy | 3/3 | Complete    | 2026-07-23 |
| 2. Convite Público | 8/8 | Complete    | 2026-07-24 |
| 3. RSVP | 5/5 | Complete    | 2026-07-24 |
| 4. Carta de Vinhos | 5/5 | Complete    | 2026-07-24 |
| 5. Mural de Memórias + Moderação | 5/5 | Complete   | 2026-07-24 |
| 6. Dashboard Interno (/admin) | 7/7 | Complete    | 2026-07-25 |
| 7. Endurecimento & Lançamento | 4/6 | In Progress|  |
