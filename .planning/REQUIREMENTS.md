# Requirements: Sol faz 40 — Site Convite

**Defined:** 2026-07-23
**Core Value:** Convidados confirmam presença e escolhem presente sem atrito; donos veem tudo consolidado e ao vivo, sem trabalho manual.

## v1 Requirements

### Setup & Deploy

- [x] **SETUP-01**: Projeto Vite + React + TypeScript + Tailwind v4 + Convex inicializado, com React Router v7 e TypeScript 6 pinados (não as majors recém-lançadas)
- [x] **SETUP-02**: Pipeline de deploy na Vercel funcionando — Build Command `npx convex deploy --cmd 'npm run build'`, `vercel.json` com SPA rewrite para `/admin`, preview e produção separados
- [x] **SETUP-03**: Variáveis de ambiente configuradas (`CONVEX_DEPLOY_KEY` na Vercel, `ADMIN_PASSWORD` só no servidor)

### Design System

- [x] **DESIGN-01**: Tokens de cor (paleta pôr do sol) e fontes (Alegreya display + Gabarito corpo) portados do projeto antigo para Tailwind
- [x] **DESIGN-02**: Primitivos de UI (botões, campos, cards, toasts) e shell/layout base, mobile-first

### Convite Público

- [x] **INVITE-01**: Hero com sol + contagem regressiva usando offset `-03:00` explícito (correto em qualquer fuso)
- [x] **INVITE-02**: Seções de programa e dress code
- [x] **INVITE-03**: Local + mapa de Aracaju + guia da cidade/hotéis
- [x] **INVITE-04**: Navegação/topbar + footer, responsivo

### RSVP

- [ ] **RSVP-01**: Módulo `normalizePhone` (telefone brasileiro canônico, tratando o nono dígito) testado isoladamente
- [ ] **RSVP-02**: Schema Convex de convidados/família (`rsvps` + `rsvpGuests`, índice `by_phone`)
- [ ] **RSVP-03**: Convidado confirma presença por pessoa (vai / não vai) via formulário público sem login
- [ ] **RSVP-04**: Convidado busca por telefone e edita a resposta já enviada
- [ ] **RSVP-05**: Rate-limit nas mutations públicas de RSVP

### Presentes (Carta de Vinhos)

- [ ] **GIFT-01**: Schema Convex `wines` (catálogo + status `presenteado` + quem escolheu)
- [ ] **GIFT-02**: Seed do catálogo de ~37 vinhos (reaproveitado do projeto antigo)
- [ ] **GIFT-03**: Catálogo público; cada card com botão "Presentear pelo WhatsApp" (`wa.me` com número + mensagem pré-preenchida encodada)
- [ ] **GIFT-04**: Card mostra "já escolhido" quando o dono marca presenteado (evita duplicação)

### Mural de Memórias

- [ ] **WALL-01**: Schema Convex `posts` (foto ou recado; status `pendente`/`aprovado`/`oculto`; desenhado pensando no telão v2)
- [ ] **WALL-02**: Upload de foto (Convex 3 passos) com validação server-side de tipo/tamanho (`getMetadata`) e downscale no cliente
- [ ] **WALL-03**: Convidado envia recado de texto
- [ ] **WALL-04**: Galeria/álbum público exibe SOMENTE posts aprovados
- [ ] **WALL-05**: Rate-limit no upload público

### Dashboard Interno (/admin)

- [ ] **ADMIN-01**: Auth do dono — senha compartilhada verificada no servidor, emitindo sessão
- [ ] **ADMIN-02**: Shell `/admin` (sidebar no desktop, barra inferior no mobile)
- [ ] **ADMIN-03**: Visão geral — contagem de confirmações ao vivo (queries reativas Convex)
- [ ] **ADMIN-04**: Convidados — listar / buscar / editar / remover RSVP
- [ ] **ADMIN-05**: Moderação — fila do mural (aprovar / ocultar)
- [ ] **ADMIN-06**: Presentes — marcar vinho como presenteado

### Endurecimento & Lançamento

- [ ] **LAUNCH-01**: Testes manuais em dispositivo real — `wa.me` em WebView iOS/Android, countdown em fuso diferente, upload HEIC no Safari iOS
- [ ] **LAUNCH-02**: Acessibilidade AA + revisão mobile-first
- [ ] **LAUNCH-03**: Settings + checklist-donos (domínio, `PUBLIC_ORIGIN`, senha forte, lista real de convidados importada)
- [ ] **LAUNCH-04**: Deploy de produção verificado ao vivo

## v2 Requirements

Adiado para o próximo milestone (foco imediato após o v1).

### Telão / Ao Vivo

- **LIVE-01**: Telão (`?vista=telao`) — slideshow em tela cheia de fotos/recados aprovados
- **LIVE-02**: QR das mesas apontando para a página de upload de fotos

### Instagram

- **IG-01**: Ingestão do feed `@solfaz40` via Apify (Task + webhook com segredo)
- **IG-02**: Menções públicas sempre caindo na moderação

## Out of Scope

Explicitamente excluído. Documentado para evitar scope creep.

| Feature | Reason |
|---------|--------|
| Checkout / venda de vinho no site | Venda é externa, pelo WhatsApp do vendedor ("Mistral") |
| Login individual de convidado / contas nomeadas | Over-engineered para festa de uma noite; RSVP é público |
| Reserva de vinho com expiração 48h + teto anônimo | Simplificado para marcação manual de "presenteado" |
| Auth de dois níveis (dono + moderadora, código colável) | v1 usa senha única dos donos |
| Google OAuth | Já removido no projeto antigo; não ressuscitar |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SETUP-01 | Phase 1 | Complete |
| SETUP-02 | Phase 1 | Complete |
| SETUP-03 | Phase 1 | Complete |
| DESIGN-01 | Phase 1 | Complete |
| DESIGN-02 | Phase 1 | Complete |
| INVITE-01 | Phase 2 | Complete |
| INVITE-02 | Phase 2 | Complete |
| INVITE-03 | Phase 2 | Complete |
| INVITE-04 | Phase 2 | Complete |
| RSVP-01 | Phase 3 | Pending |
| RSVP-02 | Phase 3 | Pending |
| RSVP-03 | Phase 3 | Pending |
| RSVP-04 | Phase 3 | Pending |
| RSVP-05 | Phase 3 | Pending |
| GIFT-01 | Phase 4 | Pending |
| GIFT-02 | Phase 4 | Pending |
| GIFT-03 | Phase 4 | Pending |
| GIFT-04 | Phase 4 | Pending |
| WALL-01 | Phase 5 | Pending |
| WALL-02 | Phase 5 | Pending |
| WALL-03 | Phase 5 | Pending |
| WALL-04 | Phase 5 | Pending |
| WALL-05 | Phase 5 | Pending |
| ADMIN-01 | Phase 6 | Pending |
| ADMIN-02 | Phase 6 | Pending |
| ADMIN-03 | Phase 6 | Pending |
| ADMIN-04 | Phase 6 | Pending |
| ADMIN-05 | Phase 6 | Pending |
| ADMIN-06 | Phase 6 | Pending |
| LAUNCH-01 | Phase 7 | Pending |
| LAUNCH-02 | Phase 7 | Pending |
| LAUNCH-03 | Phase 7 | Pending |
| LAUNCH-04 | Phase 7 | Pending |

**Coverage:**

- v1 requirements: 31 total
- Mapped to phases: 31
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-23*
*Last updated: 2026-07-23 after initialization*
