---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 06
current_phase_name: Dashboard Interno (/admin
status: executing
stopped_at: Phase 06 UAT awaiting user response
last_updated: "2026-07-25T06:02:06.769Z"
last_activity: 2026-07-25
last_activity_desc: Phase 06 implementation verified; human UAT required
progress:
  total_phases: 6
  completed_phases: 5
  total_plans: 33
  completed_plans: 33
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-25)

**Core value:** Convidados confirmam presença e escolhem presente sem atrito; donos veem tudo ao vivo, sem trabalho manual.
**Current focus:** Phase 06 — Dashboard Interno (/admin)

## Current Position

Phase: 06 (Dashboard Interno (/admin)) — EXECUTING
Plan: 7 of 7
Status: Human verification required
Last activity: 2026-07-25 — Phase 06 implementation verified; human UAT required

Progress: [████████████████████] 33/33 plans ([██████████] 100% plan execution; human verification pending)

## Performance Metrics

**Velocity:**

- Total plans completed: 21
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 3 | - | - |
| 02 | 8 | - | - |
| 3 | 5 | - | - |
| 4 | 5 | - | - |
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 01 P01 | 45min | 2 tasks | 17 files |
| Phase 01-funda-o-design-system-deploy P02 | ~10min | 2 tasks | 3 files |
| Phase 01 P03 | 25min | 3 tasks | 7 files |
| Phase 02-convite-p-blico P01 | 20min | 3 tasks | 8 files |
| Phase 02 P02 | 10min | 2 tasks | 6 files |
| Phase 02 P03 | 11min | 3 tasks | 4 files |
| Phase 02 P04 | 15min | 2 tasks | 2 files |
| Phase 02 P05 | 12min | 2 tasks | 2 files |
| Phase 02 P06 | 15min | 2 tasks | 2 files |
| Phase 02 P07 | 12min | 2 tasks | 2 files |
| Phase 02 P08 | 8min | 1 tasks | 1 files |
| Phase 03 P01 | 13min | 3 tasks | 16 files |
| Phase 03 P02 | 16 min | 3 tasks | 6 files |
| Phase 03 P03 | 17min | 3 tasks | 12 files |
| Phase 03 P04 | 13min | 2 tasks | 5 files |
| Phase 03 P05 | 39min | 3 tasks | 6 files |
| Phase 04 P01 | 7 min | 3 tasks | 8 files |
| Phase 04 P02 | 5 min | 2 tasks | 8 files |
| Phase 04 P03 | 6 min | 3 tasks | 7 files |
| Phase 04 P04 | 5 min | 3 tasks | 5 files |
| Phase 06 P01 | 5 min | 3 tasks | 11 files |
| Phase 06 P02 | 12 min | 3 tasks | 15 files |
| Phase 06 P05 | 6min | 2 tasks | 6 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table. Recentes:

- Stack: Convex + React/Tailwind (Vite SPA + React Router v7) + Vercel; auth do dono por senha compartilhada
- Refaz do zero o projeto antigo `sol-40-integrado`, aproveitando design/vinhos/dados do evento e descartando a stack Cloudflare, Instagram, telão (→ v2)
- RSVP público sem login; presente = redirect wa.me; mural com moderação
- [Phase ?]: Checkpoint blocking-human de legitimidade de pacotes satisfeito por verificação first-party prévia (STACK.md) — instalação prosseguiu com versões EXATAS pinadas
- [Phase ?]: src/main.tsx monta apenas ConvexProvider, sem provider de auth — auth do dono é escopo da Phase 6
- [Phase ?]: npx convex dev NÃO executado (ambiente não-interativo); dono precisa rodar manualmente para provisionar VITE_CONVEX_URL e convex/_generated
- [Phase ?]: Build da Vercel encadeia npx convex deploy --cmd 'npm run build'; VITE_CONVEX_URL injetada automaticamente, nunca setada manualmente
- [Phase ?]: CONVEX_DEPLOY_KEY e ADMIN_PASSWORD documentados como server-only (sem prefixo VITE_); deploy keys Production/Preview separadas isolam backends Convex de produção e preview
- [Phase ?]: [Phase 1-03]: duration-*/z-* não têm namespace @theme oficial no Tailwind v4 — usar sintaxe de parênteses duration-(--var)/z-(--var) em vez de utilitária nomeada; tracking-*/ease-* são namespaces oficiais e funcionam direto
- [Phase ?]: [Phase 2-01]: vitest config lives in vite.config.ts (defineConfig from vitest/config) with passWithNoTests: true, not a separate vitest.config.ts
- [Phase ?]: [Phase 2-01]: Croa do Goré guide URL intentionally uses the .com Tripadvisor host (research-verified) while the other 3 guide cards use .com.br (old project's verbatim URLs)
- [Phase ?]: [Phase 2-02]: og.jpg (not og.png) ships as the Open Graph image — the source PNG was already at target 1200x630, so re-encoding to JPEG q70 was the only available weight reduction; any reference to /og.png is stale.
- [Phase ?]: [Phase 2-02]: Absolute og:url deferred to Phase 7 (owners' checklist) until the production domain is fixed — index.html uses a root-relative /og.jpg with a comment documenting the deferral, no literal URL scheme.
- [Phase ?]: [Phase 2-03]: SeaWaves wrapper is absolute inset-0 (full hero height) rather than a bottom-anchored strip so the golden-light path can span from the sun's top-54% position down to the hero bottom without clipping
- [Phase ?]: [Phase 2-03]: PalmSvg left/right instances use distinct crown coordinates and frond curvature (not just CSS scale-x mirror) so the two palms don't read as the same tree mirrored (D-07)
- [Phase ?]: [Phase 2-04]: Countdown.tsx branches its heading on a switch(phase) helper component (not a single COUNTDOWN_COPY[phase] variable) so TypeScript keeps each per-phase field access (headingLead/headingEm on antes, sub on agora) statically type-safe
- [Phase ?]: [Phase 2-04]: min-w-[4ch] for the no-ceiling post-party day count is applied only to the day tile in both Countdown.tsx and CountdownRail.tsx, not all four tiles
- [Phase ?]: [Phase 2-05]: ProgramaSection renders both a visible label-role kicker AND a separate aria-hidden decorative sun disc (day/month derived from PROGRAMA_KICKER.split(' ')), not just one, per the plan's explicit action text
- [Phase ?]: [Phase 2-05]: DressCodeSection reserves each gallery figure's real aspect-ratio via inline style={{ aspectRatio }} (not a static Tailwind class) since the two ported photos have different real proportions (1120x1400 vs 895x1400) that a single static class can't express
- [Phase ?]: [Phase 2-06]: Guide card border strategy uses a full border on every card (border border-line) rather than divide-x/nth-child tricks — simplest strategy indifferent to item count
- [Phase ?]: [Phase 2-06]: Guide grid uses grid-cols-1 / sm:grid-cols-2 / lg:grid-cols-4 (never grid-cols-3) so 4 cards always fill complete rows
- [Phase ?]: [Phase 2-07]: ShellProps gained typed navLinks/showCountdownRail/wordmarkHref props in place of the old untyped nav slot; the topbar's nav set now comes only from src/content/event.ts's NAV_LINKS
- [Phase ?]: [Phase 2-07]: Countdown-rail reveal threshold is derived from the live DOM position (getBoundingClientRect of the element after the hero) rather than a hardcoded pixel value
- [Phase ?]: [Phase 2-08]: Hero palm silhouettes scale via base/sm:/md: Tailwind breakpoints (380x228 -> 500x300 -> 600x360) instead of one fixed footprint, restoring the exact original md: values so desktop framing stays byte-identical (closes UAT gap G-02-3)
- [Phase 03]: convex-test 0.0.54 exige apenas Convex como peer; @edge-runtime/vm não foi adicionado sem necessidade.
- [Phase 03]: Telefone móvel legado expõe candidatos exato/atual; normalizedKey usa a forma atual e inserts verificam também a inversa legada.
- [Phase 03]: Fixtures RSVP são internalMutation dev-only, derivadas por HMAC de seed server-only e idempotentes em quatro formatos.
- [Phase 03]: Harness Convex recebe dependências de teste por injeção de *.test.ts para não levar import.meta ao deploy.
- [Phase 03]: Telefone libera apenas uma capability RSVP de 8 horas; não cria conta, login persistente ou acesso ao admin. — Separar a chave leve de busca da autorização pós-desbloqueio limita enumeração e mantém o escopo em uma família.
- [Phase 03]: Save verifica o limite global primeiro; sessões inválidas consomem só global e sessões válidas consomem global mais sessão de forma coerente. — O circuito global não pode ser contornado por rotação de tokens e nenhum bucket aplicável deve ser consumido parcialmente.
- [Phase 03]: 30 de setembro permanece informativo e não participa da autorização backend de RSVP. — A edição continua disponível antes, no dia e depois do prazo conforme a decisão de produto D-11.
- [Phase 03]: RSVP route copy, entry labels, absolute navigation, and the explicit -03:00 boundary share one source in event.ts. — Keeps Hero, Shell, and the future /confirmar route aligned to the approved UI contract.
- [Phase 03]: Latest server snapshot, local draft, and dirty guest/contact intent remain distinct. — Reconciliation can preserve local edits while sparse commands never overwrite omitted people.
- [Phase 03]: Client capabilities must be canonical 32-byte unpadded base64url, live under one session key, and retry token_conflict once with a distinct token. — Matches the backend validator and keeps phone/contact data outside browser persistence.
- [Phase 03]: Deadline state is presentation-only and the browser override is gated directly by import.meta.env.DEV. — Production never reads debug time and post-deadline editing remains available.
- [Phase 03]: RSVP focus longhands are important because the unlayered global shorthand wins over Tailwind utilities; placeholders use solid wine. — This preserves the ordinary coral focus rule while delivering the contracted 3px sea ring and AA placeholder contrast.
- [Phase 03]: A restauração de /confirmar usa consulta Convex capturável e nunca exibe dados familiares obsoletos. — Distingue falha de rede de sessão expirada e mantém dados escopados fora do DOM até uma leitura válida.
- [Phase 03]: Troca de telefone com rascunho sujo falha fechada até o diálogo final de 03-05. — Evita perda silenciosa de respostas; troca limpa já remove capability e DOM escopado.
- [Phase 03]: Troca de telefone suja usa dialog nativo com foco inicial seguro; descarte só ocorre por ação destrutiva explícita. — Evita perda silenciosa, preserva Escape/retorno de foco e mantém a troca limpa imediata.
- [Phase 04]: Presentes usam 37 registros canônicos em três faixas, com o WhatsApp da Vanessa como handoff externo e sem reserva/checkout.
- [Phase 04]: Uma silhueta vetorial neutra compartilhada e duas cores auditáveis por vinho substituem fotos licenciadas; proveniência permanece privada.
- [Phase 04]: Gift state é reativo e separado da reconciliação comercial; `gifted` mantém o card e remove a ação.
- [Phase 06]: Sessões administrativas usam uma capability opaca por navegador, armazenada apenas por hash no servidor. — Mantém a senha compartilhada como credencial única sem criar identidades, papéis ou credenciais reutilizáveis.
- [Phase 06]: A sessão administrativa expira absolutamente após sete dias e nunca renova por leitura. — Evita acesso indefinido e mantém o limite simples, revogável e verificável no servidor.
- [Phase 06]: O cliente preserva somente o destino na URL e limpa dados protegidos em expiração, revogação, logout e remoção cross-tab. — Impede remontagem por respostas assíncronas antigas e vazamento de rascunhos ou DTOs no armazenamento.
- [Phase 06]: Consultas protegidas do admin só montam abaixo do gate de sessão; adminOverview retorna unauthorized sem DTO. — Mantém o invariante de nenhuma consulta de domínio pré-auth e desmonta dados no mesmo render da perda de autorização.
- [Phase 06]: familyCount vem diretamente de rsvps e permanece independente da soma de presenças. — Distingue zero famílias de uma família válida com zero pessoas e impede copy operacional falsa.
- [Phase 06]: O foco admin mantém coral e usa anel externo plum nas superfícies claras. — Preserva a identidade existente e garante uma borda perceptível acima de 3:1.
- [Phase ?]: Invitation and session generation omissions map to zero for additive legacy compatibility; invalid internal generations fail closed.
- [Phase ?]: Only the no-argument start mutation establishes the RSVP sweep cutoff; continuations require the paired opaque cursor and unchanged validated cutoff.
- [Phase ?]: Per-session scheduled expiry is primary cleanup; the daily bounded sweep recovers historical or stranded RSVP session rows.

### Pending Todos

None yet.

### Blockers/Concerns

- Método exato de auth do dono (Convex Auth × mutation custom) a decidir na Phase 6
- Prazo de RSVP e domínio final ainda a definir com os donos (checklist na Phase 7)

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Feature | Telão / slideshow ao vivo | v2 | 2026-07-23 |
| Feature | Instagram (Apify) | v2 | 2026-07-23 |
| Feature | QR das mesas | v2 | 2026-07-23 |

## Session Continuity

Last session: 2026-07-25T05:37:57.786Z
Stopped at: Phase 06 UAT awaiting user response
Resume file: None
