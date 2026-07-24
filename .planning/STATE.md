---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 2
current_phase_name: Convite Público
status: executing
stopped_at: Phase 2 UI-SPEC approved
last_updated: "2026-07-24T11:17:33.169Z"
last_activity: 2026-07-23
last_activity_desc: Phase 1 complete, transitioned to Phase 2
progress:
  total_phases: 2
  completed_phases: 1
  total_plans: 3
  completed_plans: 3
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-23)

**Core value:** Convidados confirmam presença e escolhem presente sem atrito; donos veem tudo ao vivo, sem trabalho manual.
**Current focus:** Phase 01 — funda-o-design-system-deploy

## Current Position

Phase: 2 — Convite Público
Plan: Not started
Status: Ready to execute
Last activity: 2026-07-23 — Phase 1 complete, transitioned to Phase 2

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**

- Total plans completed: 3
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 3 | - | - |
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 01 P01 | 45min | 2 tasks | 17 files |
| Phase 01-funda-o-design-system-deploy P02 | ~10min | 2 tasks | 3 files |
| Phase 01 P03 | 25min | 3 tasks | 7 files |

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

Last session: 2026-07-24T00:17:33.806Z
Stopped at: Phase 2 UI-SPEC approved
Resume file: .planning/phases/02-convite-p-blico/02-UI-SPEC.md
