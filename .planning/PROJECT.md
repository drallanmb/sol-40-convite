# Sol faz 40 — Site Convite

## What This Is

Site de convite + operação da festa de 40 anos da **Soraya ("Sol")**. Tem dois públicos num só site: **convidados** (página pública) confirmam presença, escolhem um vinho de presente que os redireciona para o WhatsApp do vendedor, e deixam fotos/recados num mural moderado; os **donos** (Allan/Soraya) gerenciam tudo num dashboard interno que atualiza em tempo real.

Evento: **17 de outubro de 2026, 16h · Matapuã Eventos · Aracaju/SE.**

## Core Value

Os convidados confirmam presença e escolhem presente **sem atrito**, e os donos veem quem vem e quais vinhos já foram escolhidos **consolidado e ao vivo, sem trabalho manual**. Se tudo mais falhar, isto precisa funcionar: uma confirmação de presença ou escolha de presente sempre chega ao dashboard.

## Current State

Fases 1–4 concluídas e verificadas. O convite público, o RSVP por telefone e a
carta de 37 vinhos estão implementados; o mural da Fase 5 foi desenvolvido em
paralelo e segue para seu fechamento antes do dashboard.

## Requirements

### Validated

- [x] **Convite público** com identidade "hora dourada / pôr do sol" — validado na Fase 2
- [x] **RSVP público por telefone** (sem login) — confirmação por pessoa, edição posterior, contato opcional e rate limit validados na Fase 3
- [x] **Carta de vinhos** — 37 sugestões em três faixas, estados reativos e handoff para o WhatsApp da Vanessa validados na Fase 4

### Active

<!-- Escopo v1. Hipóteses até serem entregues e validadas. -->

- [ ] **Mural de memórias** — convidados enviam fotos + recados; **moderação** dos donos antes de publicar; galeria/álbum público
- [ ] **Dashboard interno** (senha única dos donos) — visão geral com contagem de confirmações ao vivo, lista de convidados/RSVP, fila de moderação do mural, controle de presentes
- [ ] **Stack**: Convex (banco reativo + file storage p/ fotos + auth), frontend React + Tailwind + TypeScript, deploy na Vercel

### Out of Scope

<!-- Fronteiras explícitas com o motivo, pra não re-adicionar. -->

- **Telão / slideshow ao vivo** — v2 prioritário (foco imediato após o v1); arquitetura do schema já será desenhada pensando nele
- **Integração Instagram (Apify)** — v2; custo e complexidade externos não justificados no v1
- **QR das mesas** — depende do telão/upload ao vivo; v2
- **Venda / checkout de vinhos no site** — intencional: a venda é externa, pelo WhatsApp do vendedor ("Mistral")
- **Login individual de convidado / contas nomeadas** — over-engineered para uma festa de uma noite; RSVP é público
- **Reserva de vinho com expiração de 48h e teto anônimo** — simplificado para marcação manual de "presenteado" no dashboard
- **Auth de dois níveis (dono + moderadora, senha + código colável)** — v1 usa senha única dos donos

## Context

Este projeto **refaz do zero** um projeto anterior (`sol-40-integrado`), aproveitando o que ficou bom e descartando o que era complexo demais ou não desejado:

- **Aproveitado**: o sistema visual completo (paleta pôr do sol, fontes Alegreya + Gabarito, todas as seções do convite e o layout do dashboard — de `app/globals.css` do projeto antigo); os **dados do evento**; o **catálogo de ~37 vinhos** (`lib/wines.ts`, vendedor "Mistral"); o `checklist-donos.md` como base de pendências externas.
- **Descartado**: a stack Cloudflare (Workers/D1/R2/Images, vinext, Next 16, Drizzle, wrangler), Instagram/Apify, telão, QR das mesas, auth de convidado por sessão, e o modelo de acesso de dois níveis — tudo substituído por primitivas do Convex (banco reativo, file storage, auth) num frontend React/Tailwind na Vercel.
- **Fonte da verdade do antigo**: `/Users/allanmesquitabrito/Documents/Site Sol 40 anos/sol-40-integrado/design.md` (+ `globals.css`, `checklist-donos.md`, `lib/event.ts`, `lib/wines.ts`).
- Handle de Instagram planejado para v2: **@solfaz40**.

## Constraints

- **Tech stack**: React + Tailwind + TypeScript (frontend), **Convex** (backend/DB/storage/auth), **Vercel** (hosting) — decisão do dono; a base React exata (Vite / Next / TanStack Start) e a estratégia de auth serão validadas na pesquisa
- **Timeline**: festa em **17/10/2026**; 30/09 é prazo informativo do RSVP e nunca bloqueia edição posterior
- **Design**: seguir a identidade "hora dourada / pôr do sol" já definida (paleta cream/peach/coral/orange/plum/wine + teal na adega; Alegreya display + Gabarito corpo)
- **Escopo**: manter o v1 enxuto; telão e Instagram são v2
- **Acessibilidade**: o design antigo já mira contraste AA — manter

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Stack Convex + React/Tailwind + Vercel | Dono quer Convex; substitui infra custom (D1/R2/sessões/rate-limit) por primitivas reativas | — Pending |
| RSVP público sem login | Festa de uma noite não justifica contas individuais; capability efêmera escopa uma família | ✓ Good — validado na Fase 3 |
| Presente = redirect WhatsApp (sem checkout) | Venda é externa, pelo vendedor "Mistral" | ✓ Good — validado na Fase 4 |
| Mural com moderação antes de publicar | Evitar conteúdo indevido no álbum/telão público | — Pending |
| Dashboard com senha única dos donos | 2 donos; contas nomeadas já foram descartadas no projeto antigo | ✓ Good (herdado) |
| Telão + Instagram → v2 | Reduz escopo v1 e evita custo externo (Apify) | — Pending |
| Marcar "presenteado" manual (sem reserva 48h) | Simplicidade; a compra acontece fora do site | ✓ Modelo reativo validado na Fase 4; controle do dono segue para a Fase 6 |
| Carta usa uma garrafa vetorial neutra e duas cores por vinho | Evita dependência de 37 fotos licenciadas sem perder diferenciação visual | ✓ Good — 37 paletas com proveniência privada e zero mídia remota |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-25 after Phase 4 completion*
