---
phase: 2
slug: convite-p-blico
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-23
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Seeded from `02-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.10 (not yet installed — Wave 0 gap; peer-verified against installed vite 8.1.5) |
| **Config file** | none — Wave 0 creates `vitest.config.ts` (or a `test` key in `vite.config.ts`) |
| **Quick run command** | `npx vitest run src/lib/countdown.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds (pure-function surface, node environment, no jsdom) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/countdown.test.ts` (plus any new test file added in that commit) and `npm run build` (typecheck)
- **After every plan wave:** Run `npx vitest run` and `npm run build`
- **Before `/gsd-verify-work`:** Full suite green AND every `manual_procedural` row below walked in a real browser (`human_verify_mode: end-of-phase`)
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

> Task IDs are assigned by the planner. Rows below are keyed by requirement until
> `/gsd-execute-phase` binds them to concrete task IDs.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | 02-01 | 0 | INVITE-01 | — | N/A | infra | `npx vitest run` (exits 0 on empty suite) | ❌ W0 | ⬜ pending |
| TBD | 02-01 | 1 | INVITE-01 | — | N/A | unit | `npx vitest run src/lib/countdown.test.ts -t "offset"` | ❌ W0 | ⬜ pending |
| TBD | 02-01 | 1 | INVITE-01 | — | N/A | unit | `npx vitest run src/lib/countdown.test.ts -t "phase"` | ❌ W0 | ⬜ pending |
| TBD | 02-01 | 1 | INVITE-01 | — | N/A | unit | `npx vitest run src/lib/countdown.test.ts -t "depois"` | ❌ W0 | ⬜ pending |
| TBD | 02-01 | 1 | INVITE-01 | — | N/A | unit | `npx vitest run src/lib/countdown.test.ts -t "pluralize"` | ❌ W0 | ⬜ pending |
| TBD | 02-02 | 2 | INVITE-02 | — | N/A | unit | `npx vitest run src/content/event.test.ts` | ❌ W0 | ⬜ pending |
| TBD | 02-02 | 2 | INVITE-04 | — | N/A | unit | snapshot/grep assertion on `Shell.tsx` footer markup | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest@4.1.10` — exact-pinned devDependency (`npm install --save-exact --save-dev vitest@4.1.10`); no test framework exists today
- [ ] `vitest.config.ts` (or `test` block in `vite.config.ts`) — node environment; no `jsdom`/`happy-dom` needed for this phase's pure-function surface
- [ ] `package.json` — add `"test": "vitest run"` script (none exists today)
- [ ] No shared fixture/conftest equivalent needed — tests are fixed-date-in, object-out

*`src/lib/countdown.ts` and its test file are phase deliverables, not Wave 0 infra — only the framework to run them is the Wave 0 gap.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Countdown interval is cleared on unmount (no leaked timers) | INVITE-01 | Full React Testing Library setup is not justified for this phase's scope | Navigate away from and back to the route; confirm timer count does not grow in DevTools |
| Dress-code gallery reserves image space (no CLS) | INVITE-02 | Layout shift is a rendering-time property | Load with Slow 3G throttle; confirm no visible shift on image decode |
| Map card: venue name + "Matapuã" address correct, "Abrir rota ↗" always visible, iframe mounts only after "Ver mapa" click | INVITE-03 | Interaction + visual assertion | Browser check: confirm no iframe in DOM before click, present after |
| Guide/hotel external links resolve | INVITE-03 | Tripadvisor returns 403 to all automated `curl`/bot fetches — an automated link check produces false failures (Pitfall 8) | Open each link in a real browser; never gate on a fetch-based checker |
| Topbar collapses to hamburger, countdown rail condenses past scroll threshold, 44px touch targets | INVITE-04 | Responsive/visual behavior | Browser check at 360px / 768px / 1440px |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags (`vitest run`, never bare `vitest`)
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
