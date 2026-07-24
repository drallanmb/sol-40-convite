---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 3
current_phase_name: RSVP
status: planning
stopped_at: Completed 02-08-PLAN.md (gap closure G-02-3)
last_updated: "2026-07-24T14:35:40.307Z"
last_activity: 2026-07-24
last_activity_desc: Phase 02 complete, transitioned to Phase 3
progress:
  total_phases: 2
  completed_phases: 2
  total_plans: 11
  completed_plans: 11
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-23)

**Core value:** Convidados confirmam presença e escolhem presente sem atrito; donos veem tudo ao vivo, sem trabalho manual.
**Current focus:** Phase 02 — convite-p-blico

## Current Position

Phase: 3 — RSVP
Plan: Not started
Status: Ready to plan
Last activity: 2026-07-24 — Phase 02 complete, transitioned to Phase 3

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**

- Total plans completed: 11
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 3 | - | - |
| 02 | 8 | - | - |
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

Last session: 2026-07-24T14:19:03.380Z
Stopped at: Completed 02-08-PLAN.md (gap closure G-02-3)
Resume file: None
