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

- [x] **RSVP-01**: Módulo `normalizePhone` (telefone brasileiro canônico, tratando o nono dígito) testado isoladamente
- [x] **RSVP-02**: Schema Convex de convidados/família (`rsvps` + `rsvpGuests`, índice `by_phone`)
- [x] **RSVP-03**: Convidado confirma presença por pessoa (vai / não vai) via formulário público sem login
- [x] **RSVP-04**: Convidado busca por telefone e edita a resposta já enviada
- [x] **RSVP-05**: Rate-limit nas mutations públicas de RSVP

### Presentes (Carta de Vinhos)

- [x] **GIFT-01**: Schema Convex `wines` (catálogo + status `presenteado` + quem escolheu)
- [x] **GIFT-02**: Seed do catálogo de ~37 vinhos (reaproveitado do projeto antigo)
- [x] **GIFT-03**: Catálogo público; cada card com botão "Presentear pelo WhatsApp" (`wa.me` com número + mensagem pré-preenchida encodada)
- [x] **GIFT-04**: Card mostra "já escolhido" quando o dono marca presenteado (evita duplicação)

### Mural de Memórias

- [x] **WALL-01**: Schema Convex `posts` (foto ou recado; status `pendente`/`aprovado`/`oculto`; desenhado pensando no telão v2)
- [x] **WALL-02**: Upload de foto (Convex 3 passos) com validação server-side de tipo/tamanho (`getMetadata`) e downscale no cliente
- [x] **WALL-03**: Convidado envia recado de texto
- [x] **WALL-04**: Galeria/álbum público exibe SOMENTE posts aprovados
- [x] **WALL-05**: Rate-limit no upload público

### Dashboard Interno (/admin)

- [x] **ADMIN-01**: Auth administrativa verificada no servidor, emitindo sessão opaca; o login compartilhado original foi migrado para contas individuais na Fase 8
- [x] **ADMIN-02**: Shell `/admin` (sidebar no desktop, barra inferior no mobile)
- [x] **ADMIN-03**: Visão geral — contagem de confirmações ao vivo (queries reativas Convex)
- [x] **ADMIN-04**: Convidados — listar / buscar / editar / remover RSVP
- [x] **ADMIN-05**: Moderação — fila do mural (aprovar / ocultar)
- [x] **ADMIN-06**: Presentes — marcar vinho como presenteado

### Gestão de Gestores

- [x] **MGR-01**: Contas individuais com papéis fixos `owner`, `manager` e `seller`, sem login cotidiano por senha compartilhada
- [x] **MGR-02**: Ativação e redefinição por links one-time; credencial-mestra restrita ao bootstrap e à recuperação do proprietário
- [x] **MGR-03**: Sessões individuais com expiração absoluta, múltiplos aparelhos e revogação seletiva ou total
- [x] **MGR-04**: RBAC aplicado no backend e na navegação; `seller` restrita à operação de Presentes
- [x] **MGR-05**: Auditoria administrativa owner-only, redigida e com retenção de 120 dias
- [x] **MGR-06**: Rollout Preview validado com jornadas reais de contas, links, revogação, Presentes, retenção e acessibilidade

### Endurecimento & Lançamento

- [ ] **LAUNCH-01**: Testes manuais em dispositivo real — `wa.me` em WebView iOS/Android, countdown em fuso diferente, upload HEIC no Safari iOS
- [ ] **LAUNCH-02**: Acessibilidade AA + revisão mobile-first
- [ ] **LAUNCH-03**: Checklist dos donos concluído — origem canônica, credencial-mestra segura, contas individuais ativas e lista real de convidados importada/revisada
- [x] **LAUNCH-04**: Deploy de produção verificado ao vivo

### Instagram + Moderação

- [ ] **IG-01**: Ingestão do conteúdo público relacionado ao `@solfaz40` por integração externa autenticada, idempotente e sem expor segredos
- [ ] **IG-02**: Toda publicação ou menção ingerida entra como pendente na fila existente; nada vindo do Instagram é publicado sem moderação

### Abertura Cinematográfica

- [ ] **INTRO-01**: A entrada do site encena o sol se pondo e termina exatamente na geometria responsiva do sol real do hero, sem salto visual
- [ ] **INTRO-02**: A abertura preserva interação, desempenho mobile e acessibilidade, incluindo alternativa segura para `prefers-reduced-motion`

## v2 Requirements

Adiado para o próximo milestone (foco imediato após o v1).

### Telão / Ao Vivo

- **LIVE-01**: Telão (`?vista=telao`) — slideshow em tela cheia de fotos/recados aprovados
- **LIVE-02**: QR das mesas apontando para a página de upload de fotos

## Out of Scope

Explicitamente excluído. Documentado para evitar scope creep.

| Feature | Reason |
|---------|--------|
| Checkout / venda de vinho no site | Venda é externa, pelo WhatsApp do vendedor ("Mistral") |
| Login individual de convidado / contas nomeadas | Over-engineered para festa de uma noite; RSVP é público |
| Reserva de vinho com expiração 48h + teto anônimo | Simplificado para marcação manual de "presenteado" |
| Auth de dois níveis (dono + moderadora, código colável) | Substituído por contas individuais e RBAC na Fase 8 |
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
| RSVP-01 | Phase 3 | Complete |
| RSVP-02 | Phase 3 | Complete |
| RSVP-03 | Phase 3 | Complete |
| RSVP-04 | Phase 3 | Complete |
| RSVP-05 | Phase 3 | Complete |
| GIFT-01 | Phase 4 | Complete |
| GIFT-02 | Phase 4 | Complete |
| GIFT-03 | Phase 4 | Complete |
| GIFT-04 | Phase 4 | Complete |
| WALL-01 | Phase 5 | Complete |
| WALL-02 | Phase 5 | Complete |
| WALL-03 | Phase 5 | Complete |
| WALL-04 | Phase 5 | Complete |
| WALL-05 | Phase 5 | Complete |
| ADMIN-01 | Phase 6 | Complete |
| ADMIN-02 | Phase 6 | Complete |
| ADMIN-03 | Phase 6 | Complete |
| ADMIN-04 | Phase 6 | Complete |
| ADMIN-05 | Phase 6 | Complete |
| ADMIN-06 | Phase 6 | Complete |
| MGR-01 | Phase 8 | Complete |
| MGR-02 | Phase 8 | Complete |
| MGR-03 | Phase 8 | Complete |
| MGR-04 | Phase 8 | Complete |
| MGR-05 | Phase 8 | Complete |
| MGR-06 | Phase 8 | Complete |
| LAUNCH-01 | Phase 7 | Pending |
| LAUNCH-02 | Phase 7 | Pending |
| LAUNCH-03 | Phase 7 | Pending |
| LAUNCH-04 | Phase 7 | Complete |
| IG-01 | Phase 9 | Pending |
| IG-02 | Phase 9 | Pending |
| INTRO-01 | Phase 10 | Pending |
| INTRO-02 | Phase 10 | Pending |

**Coverage:**

- Current milestone requirements: 43 total
- Mapped to phases: 43
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-23*
*Last updated: 2026-07-25 after Phase 9 addition and documentation cleanup*
