---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 07
current_phase_name: endurecimento-lan-amento
status: executing
stopped_at: Completed 08-01-PLAN.md
last_updated: "2026-07-25T16:17:22.185Z"
last_activity: 2026-07-25
last_activity_desc: Phase 07 execution started
progress:
  total_phases: 8
  completed_phases: 6
  total_plans: 46
  completed_plans: 38
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-25)

**Core value:** Convidados confirmam presença e escolhem presente sem atrito; donos veem tudo ao vivo, sem trabalho manual.
**Current focus:** Phase 07 — endurecimento-lan-amento

## Current Position

Phase: 07 (endurecimento-lan-amento) — EXECUTING
Plan: 5 of 6
Status: Ready to execute
Last activity: 2026-07-25 — Phase 07 execution started

Progress: [████████░░] 83%

## Performance Metrics

**Velocity:**

- Total plans completed: 33
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
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
| Phase 07 P01 | 2h 21m | 3 tasks | 10 files |
| Phase 07 P02 | 9min | 3 tasks | 19 files |
| Phase 07 P03 | 55min | 3 tasks | 4 files |
| Phase 07 P04 | 18min | 2 tasks | 4 files |
| Phase 08 P01 | 4 min | 2 tasks | 7 files |

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
- [Phase ?]: Invitation and session generation omissions map to zero for additive legacy compatibility; invalid internal generations fail closed.
- [Phase ?]: Only the no-argument start mutation establishes the RSVP sweep cutoff; continuations require the paired opaque cursor and unchanged validated cutoff.
- [Phase ?]: Per-session scheduled expiry is primary cleanup; the daily bounded sweep recovers historical or stranded RSVP session rows.
- [Phase 07]: CSV bruto permanece local; somente grupos normalizados entram em lotes protegidos no Convex. — Preserva privacidade e obriga revalidação server-side antes de qualquer write.
- [Phase 07]: LAUNCH-03 permanece pendente após 07-01. — O importador está pronto, mas domínio, senha de produção e lista real revisada pertencem aos planos posteriores.
- [Phase 07]: A origem canônica estática é https://www.sol40.com.br; PUBLIC_ORIGIN não foi criado porque a stack não o consome.
- [Phase 07]: O gate Playwright é explicitamente emulado; hardware, HEIC, WebViews, fuso e teclado virtual permanecem pending.
- [Phase 07]: Produção Convex usa --prod e entrada interativa/stdin; evidência verifica somente nomes e login.
- [Phase 07]: Domínio público não autoriza divulgação: Gate E exige backup e lista real revisada.
- [Phase 07]: Deployments ligados ao projeto Convex incorreto nunca são alvos de rollback. — Somente tracer live, bundle e smoke verde promovem um alvo externo a saudável.
- [Phase 07]: Senha Production permanece somente no Convex e no Chaveiro do dono. — Evidência guarda apenas nome, resultado funcional e logs sanitizados; nunca o valor.
- [Phase 07]: Rollback Vercel e rollback Convex são operações independentes. — Frontend não reverte functions, schema, env, scheduled work, storage ou dados.
- [Phase 07]: Vercel mantém o único redirect permanente apex→www; Cloudflare fica DNS-only com os alvos específicos do projeto. — Evita redirect concorrente, proxy acidental e alteração de registros externos ao site.
- [Phase 07]: O drill usa apenas dois frontends Production no commit saudável; deployment ligado ao Convex incorreto permanece inelegível. — Rollback só é seguro entre clientes compatíveis com o backend Production atual.
- [Phase 07]: Rollback/promote Vercel move somente aliases; Convex, env, scheduled work, storage e dados têm recuperação separada. — Impede que recuperação de frontend seja registrada como restauração de backend ou dados.
- [Phase 08]: Sessões legadas recebem principal sintético somente antes de legacyDisabledAt; contas individuais são a identidade persistente. — Mantém rollout aditivo e cria um cutoff lógico global imediato.
- [Phase 08]: Senhas humanas usam envelope scrypt versionado em internal actions Node exclusivas. — Evita hash rápido de senha e impede módulos Web-runtime de importar Node crypto.

### Pending Todos

- Phase 8: substituir o compartilhamento da senha-mestra por contas individuais
  de gestores, com papéis, revogação, redefinição de senha e auditoria.

### Roadmap Evolution

- Phase 8 added: Gestão de gestores — contas individuais, permissões e
  auditoria pós-lançamento.

### Blockers/Concerns

- Phase 7 launch requirements remain pending; real-list and physical-device follow-ups are independently resumable after publication.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Feature | Telão / slideshow ao vivo | v2 | 2026-07-23 |
| Feature | Instagram (Apify) | v2 | 2026-07-23 |
| Feature | QR das mesas | v2 | 2026-07-23 |

## Session Continuity

Last session: 2026-07-25T16:17:22.177Z
Stopped at: Completed 08-01-PLAN.md
Resume file: None
