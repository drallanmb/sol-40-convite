---
phase: 06
slug: dashboard-interno-admin
status: validated
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-25
updated: 2026-07-25
---

# Phase 06 — Validation Strategy

> Nyquist-compliant feedback contract for all 12 execution tasks in waves 1–4.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 + convex-test 0.0.54 |
| **Config file** | `vite.config.ts` |
| **Quick run command** | `npx vitest run convex/admin.test.ts src/lib/adminSession.test.ts src/content/admin.test.ts src/lib/adminSearch.test.ts src/lib/adminGuestDraft.test.ts src/lib/adminOperations.test.ts` |
| **Full suite command** | `npm test && npm run build` |
| **Real backend gate** | `npx convex dev --once` followed by the plan-owned bounded smoke command |
| **Estimated focused latency** | Under 30 seconds |

## Sampling Rate and Continuity

- After every implementation task, run the exact focused command in the map below.
- After every plan/wave, run `npm test && npm run build`.
- Tasks 06-02-03, 06-03-03, and 06-04-03 pair their automated build/suite gate with recorded browser evidence.
- No three consecutive tasks lack automated feedback: in fact, every task has an automated command.
- Plan 02 never depends on RSVP/post/wine fixture helpers from later waves. Domain mutation/reactivity smoke is owned by Plans 03/04.
- Every live domain smoke uses bounded fixture IDs, snapshots all touched rows, and restores/deletes them in `finally`.
- Before `/gsd-verify-work`, the full suite, real Convex deploy/smokes, browser privacy matrix, and ASVS L1 high-severity gate must be recorded.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat refs | Test files / evidence | Automated command | Status |
|---------|------|------|-------------|-------------|-----------------------|-------------------|--------|
| 06-01-01 | 01 | 1 | ADMIN-01 | T-06-01, T-06-02, T-06-04 | `convex/admin.test.ts` | `npx vitest run convex/admin.test.ts -t "password\|hash\|token\|authorization\|rate limit\|boundary" && npm run build && git diff --check` | ⬜ pending |
| 06-01-02 | 01 | 1 | ADMIN-01 | T-06-01, T-06-03 | `convex/admin.test.ts`; real `adminTest:smokeSessionLifecycle` | `npx vitest run convex/admin.test.ts -t "login\|status\|logout\|seven-day\|expiry\|scheduled\|idempotent" && npx convex dev --once && npx convex run adminTest:smokeSessionLifecycle '{}' && npm run build && git diff --check` | ⬜ pending |
| 06-01-03 | 01 | 1 | ADMIN-01 | T-06-02, T-06-05 | `src/lib/adminSession.test.ts`, `convex/admin.test.ts` | `npx vitest run src/lib/adminSession.test.ts && npx vitest run convex/admin.test.ts && npm run build && git diff --check` | ⬜ pending |
| 06-02-01 | 02 | 2 | ADMIN-02 | T-06-06, T-06-07, T-06-10 | `src/lib/adminSession.test.ts`, `src/content/admin.test.ts` | `npx vitest run src/lib/adminSession.test.ts src/content/admin.test.ts && npm run build && git diff --check` | ⬜ pending |
| 06-02-02 | 02 | 2 | ADMIN-03 | T-06-07, T-06-08, T-06-09 | `convex/admin.test.ts` including independent familyCount cases for 0 families and 1 zero-person family, `src/content/admin.test.ts` empty-state routing/copy | `npx vitest run convex/admin.test.ts -t "authorization matrix\|overview\|familyCount\|zero-person\|count\|badge" src/content/admin.test.ts && npm run build && git diff --check` | ⬜ pending |
| 06-02-03 | 02 | 2 | ADMIN-01, ADMIN-02, ADMIN-03 | T-06-06, T-06-08, T-06-10 | Full suite/build plus browser transport, two-session overview parity, session revocation, responsive/focus evidence | `npm test && npm run build && npx convex dev --once && git diff --check` | ⬜ pending |
| 06-03-01 | 03 | 3 | ADMIN-04 | T-06-11 through T-06-16 | `convex/rsvps.test.ts` public save monotonic revision; `convex/admin.test.ts` admin writer parity, equal/backward clocks, stale-admin-vs-public-save conflict; real bounded `adminTest:smokeFamilyCascade` | `npx vitest run convex/rsvps.test.ts -t "revision\|equal clock\|backward clock" && npx vitest run convex/admin.test.ts -t "family\|guest\|phone\|publicRef\|cascade\|revok\|revision\|equal clock\|backward clock\|public save\|conflict\|authorization" && npx convex dev --once && npx convex run adminTest:smokeFamilyCascade '{}' && npm run build && git diff --check` | ⬜ pending |
| 06-03-02 | 03 | 3 | ADMIN-04 | T-06-13 | `src/lib/adminSearch.test.ts`, `src/lib/adminGuestDraft.test.ts` | `npx vitest run src/lib/adminSearch.test.ts src/lib/adminGuestDraft.test.ts && npm run build && git diff --check` | ⬜ pending |
| 06-03-03 | 03 | 3 | ADMIN-04 | T-06-11 through T-06-16 | `convex/admin.test.ts`, `src/lib/adminSearch.test.ts`, `src/lib/adminGuestDraft.test.ts`; grouped guest browser evidence | `npx vitest run convex/admin.test.ts -t "family\|guest\|phone\|cascade\|conflict" src/lib/adminSearch.test.ts src/lib/adminGuestDraft.test.ts && npm test && npm run build && git diff --check` | ⬜ pending |
| 06-04-01 | 04 | 4 | ADMIN-05 | T-06-17 through T-06-19, T-06-21, T-06-22 | `convex/admin.test.ts`, `src/lib/adminOperations.test.ts` | `npx vitest run convex/admin.test.ts -t "moderation\|post\|undo\|revision\|conflict\|public album\|authorization" src/lib/adminOperations.test.ts && npm run build && git diff --check` | ⬜ pending |
| 06-04-02 | 04 | 4 | ADMIN-06 | T-06-20 through T-06-22 | `convex/admin.test.ts` including `ensureWineCatalog` writer-parity/equal-clock/backward-clock revision cases, `src/lib/adminSearch.test.ts`, `src/lib/adminOperations.test.ts`; real bounded `adminTest:smokeModerationAndGift` | `npx vitest run convex/admin.test.ts -t "gift\|wine\|presenter\|atomic\|updatedAt\|ensureWineCatalog\|writer parity\|conflict\|public catalog\|authorization" src/lib/adminSearch.test.ts src/lib/adminOperations.test.ts && npx convex dev --once && npx convex run adminTest:smokeModerationAndGift '{}' && npm run build && git diff --check` | ⬜ pending |
| 06-04-03 | 04 | 4 | ADMIN-05, ADMIN-06 | T-06-17 through T-06-22 | `convex/admin.test.ts`, `src/lib/adminSearch.test.ts`, `src/lib/adminOperations.test.ts`; two-owner/public browser evidence | `npx vitest run convex/admin.test.ts -t "moderation\|undo\|gift\|conflict\|public" src/lib/adminSearch.test.ts src/lib/adminOperations.test.ts && npm test && npm run build && npx convex dev --once && git diff --check` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

## Wave 0 Requirements

These files are intentionally created test-first by their owning execution tasks; therefore `wave_0_complete` remains false until those tasks run.

- [ ] `convex/admin.test.ts` — injected `convex-test` harness covering auth/session, authorization matrix, overview familyCount distinction (0 families versus 1 zero-person family), zero-person family creation/CRUD/cascade, shared public/admin RSVP revision parity and stale-admin-vs-public-save conflict, moderation, wine invariants, public projections, and writer parity including `ensureWineCatalog` monotonic revisions under equal/backward clocks.
- [ ] `convex/rsvps.test.ts` — public saveResponses uses the shared monotonic RSVP revision helper and advances exactly once under equal/backward clocks.
- [ ] `src/lib/adminSession.test.ts` — capability persistence, reducer races, expiry, logout, and cross-tab fail-closed behavior.
- [ ] `src/content/admin.test.ts` — canonical routes, query filters, navigation order, pluralization, and familyCount-driven no-family versus zero-person-family overview copy/actions.
- [ ] `src/lib/adminSearch.test.ts` — accent/case/phone normalization, whole-family filtering, and wine/code/presenter search.
- [ ] `src/lib/adminGuestDraft.test.ts` — dirty-field reconciliation, logout clearing, stale response, remote removal, and revision conflicts.
- [ ] `src/lib/adminOperations.test.ts` — moderation transition/undo timers plus gift dialog and remote-revision reducers.
- [ ] Real Convex helpers are internal/dev-only, bounded, snapshot every touched row, and restore in `finally`; production secrets are never hardcoded.

## Real-Backend Smoke Ownership

| Plan | Allowed mutation scope | Cleanup contract |
|------|------------------------|------------------|
| 06-01 | Disposable admin session only | Exact session id/expiry; logout/expiry idempotently removes it |
| 06-02 | No RSVP/post/wine mutation | Session revocation only; overview query/subscription behavior |
| 06-03 | Disposable family, guests, and RSVP sessions | Bounded IDs; snapshot all touched rows; `finally` restores pre-existing state and deletes created rows |
| 06-04 | Disposable moderation post and wine state | Bounded IDs; snapshot post/wine; `finally` restore through the same guarded transition invariants |

## Manual / Browser Verifications

| Behavior | Requirement | Why browser/manual | Test instructions |
|----------|-------------|--------------------|-------------------|
| Pre-auth transport privacy, seven-day restore, cross-tab expiry/logout | ADMIN-01 | Storage lifecycle and WebSocket traffic | Open a nested admin URL logged out; verify only status traffic. Login, reopen, revoke/expire, and confirm all tabs clear protected DOM/drafts while URL remains. |
| Responsive shell and navigation | ADMIN-02 | Visual/focus/safe-area behavior | Verify one nav at 1023/1024px, four mobile destinations, logout placement, 320px at 200% zoom, keyboard focus, reduced motion, and touch targets. |
| Overview subscription parity | ADMIN-03 | Two live browser subscriptions | In Plan 02, verify two authenticated tabs show the same protected live query state without domain fixture mutation. In Plans 03/04, verify actual domain mutations update counts/badges. |
| Family administration UX/public revocation | ADMIN-04 | Confirmation hierarchy and public capability behavior | Exercise search/filter/create/edit/person delete/family delete; use a second owner tab for conflict and a public RSVP session for phone-change revocation. |
| Moderation/public album | ADMIN-05 | Protected media and reactive public rendering | Approve/hide/undo in two owner tabs; verify stale undo loses and public album includes approved rows only. |
| Gifts/public catalog | ADMIN-06 | Dialog keyboard and reactive public rendering | Mark/unmark with presenter, test stale open dialog, mobile keyboard reachability, and verify public status changes without presenter/time fields. |

## Validation Sign-Off

- [x] All 12 tasks have exact `<automated>` verification commands.
- [x] Waves 1–4 and dependencies match the four plans.
- [x] Sampling continuity has no gap of three consecutive tasks.
- [x] `adminGuestDraft.test.ts` and `adminOperations.test.ts` are explicitly owned and mapped.
- [x] Plan 02 is independent of later domain fixture helpers.
- [x] Domain smoke restoration is bounded and explicit.
- [x] No watch-mode flags are used.
- [x] Expected focused feedback latency is under 30 seconds.
- [x] `nyquist_compliant: true` is set; `wave_0_complete` remains honestly false until test-first execution creates the planned files.

**Approval:** validation strategy is validated and Nyquist-compliant; execution evidence pending.
