# Roadmap: Sol faz 40 — Site Convite

## Overview

Do zero ao site pronto para a festa de 17/10/2026: primeiro a fundação (scaffold Convex + Vite/React/Tailwind, deploy Vercel e o design system pôr do sol portado do projeto antigo), depois o convite público, e então os três módulos de dados independentes (RSVP, carta de vinhos, mural moderado) que podem ser construídos em paralelo. Com os dados no lugar, o dashboard interno consolida tudo ao vivo, e a última fase é endurecimento e lançamento. As fases 2–5 dependem só da fase 1 e podem rodar em paralelo; a fase 6 depende dos schemas de 3/4/5.

## Phases

- [x] **Phase 1: Fundação, Design System & Deploy** - Scaffold Convex + Vite/React/TS/Tailwind, pipeline Vercel e identidade visual portada (completed 2026-07-23)
- [ ] **Phase 2: Convite Público** - Página do evento: hero, countdown, programa, dress code, local/Aracaju
- [ ] **Phase 3: RSVP** - Confirmação de presença pública por telefone, com edição
- [ ] **Phase 4: Carta de Vinhos** - Catálogo de presentes que redireciona para o WhatsApp
- [ ] **Phase 5: Mural de Memórias + Moderação** - Envio de fotos/recados com fila de moderação
- [ ] **Phase 6: Dashboard Interno (/admin)** - Painel dos donos: confirmações ao vivo, convidados, moderação, presentes
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

**Plans**: TBD

Plans:

- [ ] 02-01: Hero + countdown (fuso explícito)
- [ ] 02-02: Seções de conteúdo (programa, dress code, Aracaju/mapa/guia, topbar/footer)

### Phase 3: RSVP

**Goal**: Convidado confirma presença sem login e pode editar a resposta; os dados ficam prontos para o dashboard.
**Depends on**: Phase 1
**Requirements**: RSVP-01, RSVP-02, RSVP-03, RSVP-04, RSVP-05
**Success Criteria** (what must be TRUE):

  1. `normalizePhone` converte telefones brasileiros para uma forma canônica (testado isoladamente)
  2. O convidado informa telefone e confirma presença por pessoa (vai / não vai)
  3. Buscando pelo telefone, o convidado reabre e edita a resposta já enviada (sem virar duplicata)
  4. Mutations públicas de RSVP têm rate-limit

**Plans**: TBD

Plans:

- [ ] 03-01: `normalizePhone` + schema `rsvps`/`rsvpGuests` (índice `by_phone`)
- [ ] 03-02: Formulário público de confirmação + edição por telefone + rate-limit

### Phase 4: Carta de Vinhos

**Goal**: Convidado escolhe um vinho e é levado ao WhatsApp do vendedor, sem duplicação entre convidados.
**Depends on**: Phase 1
**Requirements**: GIFT-01, GIFT-02, GIFT-03, GIFT-04
**Success Criteria** (what must be TRUE):

  1. O catálogo de ~37 vinhos aparece na página pública
  2. Clicar em "Presentear pelo WhatsApp" abre o `wa.me` com número e mensagem pré-preenchida corretos
  3. Vinho marcado como presenteado no dashboard mostra "já escolhido" e não é oferecido de novo

**Plans**: TBD

Plans:

- [ ] 04-01: Schema `wines` + seed do catálogo de 37 vinhos
- [ ] 04-02: Catálogo público + botão wa.me + estado "já escolhido"

### Phase 5: Mural de Memórias + Moderação

**Goal**: Convidado envia foto/recado; nada aparece em público sem aprovação.
**Depends on**: Phase 1
**Requirements**: WALL-01, WALL-02, WALL-03, WALL-04, WALL-05
**Success Criteria** (what must be TRUE):

  1. O convidado envia uma foto (upload Convex) e um recado de texto
  2. Tipo e tamanho da foto são validados no servidor após o upload (não só no cliente)
  3. A galeria/álbum público mostra SOMENTE posts com status aprovado
  4. Uploads públicos têm rate-limit

**Plans**: TBD

Plans:

- [ ] 05-01: Schema `posts` (pensado p/ telão v2) + upload 3-passos + validação server-side + downscale no cliente
- [ ] 05-02: Envio de recado + galeria pública (só aprovados) + rate-limit

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

**Plans**: TBD

Plans:

- [ ] 06-01: Auth do dono (senha compartilhada) + shell `/admin` (sidebar/bottom bar) + Visão geral ao vivo
- [ ] 06-02: Convidados + Moderação + Presentes

### Phase 7: Endurecimento & Lançamento

**Goal**: Site testado em condições reais e publicado em produção para a festa.
**Depends on**: Phase 6
**Requirements**: LAUNCH-01, LAUNCH-02, LAUNCH-03, LAUNCH-04
**Success Criteria** (what must be TRUE):

  1. `wa.me`, countdown e upload de foto foram testados em dispositivo real (WebView iOS/Android, fuso diferente, HEIC no Safari)
  2. Acessibilidade AA e uso no celular revisados
  3. Checklist dos donos concluído (domínio, `PUBLIC_ORIGIN`, senha forte, lista real importada)
  4. O site está no ar em produção e verificado ao vivo

**Plans**: TBD

Plans:

- [ ] 07-01: Rate-limit final + testes manuais em dispositivo + acessibilidade/mobile
- [ ] 07-02: Settings + checklist dos donos + deploy de produção

## Progress

**Execution Order:**
Fases executam em ordem numérica: 1 → 2 → 3 → 4 → 5 → 6 → 7 (2–5 são independentes após a 1 e podem ser paralelizadas).

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Fundação, Design System & Deploy | 3/3 | Complete    | 2026-07-23 |
| 2. Convite Público | 0/2 | Not started | - |
| 3. RSVP | 0/2 | Not started | - |
| 4. Carta de Vinhos | 0/2 | Not started | - |
| 5. Mural de Memórias + Moderação | 0/2 | Not started | - |
| 6. Dashboard Interno (/admin) | 0/2 | Not started | - |
| 7. Endurecimento & Lançamento | 0/2 | Not started | - |
