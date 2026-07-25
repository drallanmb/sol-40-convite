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

> Nyquist-compliant feedback contract for all 18 execution tasks in waves 1–6, including the six pending gap-closure tasks.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 + convex-test 0.0.54 |
| **Config file** | `vite.config.ts` |
| **Quick run command** | `npx vitest run convex/admin.test.ts convex/rsvps.test.ts src/lib/adminSession.test.ts src/content/admin.test.ts src/lib/adminSearch.test.ts src/lib/adminGuestDraft.test.ts src/lib/adminOperations.test.ts src/components/admin/adminPendingOperations.test.ts` |
| **Full suite command** | `npm test && npm run build` |
| **Real backend gate** | `npx convex dev --once` followed by the plan-owned bounded smoke command |
| **Estimated focused latency** | Under 30 seconds |

## Sampling Rate and Continuity

- After every implementation task, run the exact focused command in the map below.
- After every plan/wave, run `npm test && npm run build`.
- Tasks 06-02-03, 06-03-03, and 06-04-03 pair their automated build/suite gate with recorded browser evidence.
- Gap tasks 06-05-01 through 06-07-02 remain `pending` until execution; this strategy does not treat planned tests, generated functions, DOM coverage, or smokes as existing evidence.
- No three consecutive tasks lack automated feedback: in fact, every task has an automated command.
- Plan 02 never depends on RSVP/post/wine fixture helpers from later waves. Domain mutation/reactivity smoke is owned by Plans 03/04.
- Wave 5 owns session lifecycle/migration (`06-05`) and per-record UI pending-state (`06-07`) independently; Wave 6 owns the family cascade only after the generation-aware lifecycle exists (`06-06` depends on `06-05`).
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
| 06-05-01 | 05 | 5 | ADMIN-04 | T-06-21 through T-06-25 | `convex/rsvps.test.ts` generation, absolute expiry, retry, exact-boundary, and legacy cases | `npx vitest run convex/rsvps.test.ts -t "session\|expiry\|generation\|legacy" && npx convex dev --once && npm run build && git diff --check` | ⬜ pending |
| 06-05-02 | 05 | 5 | ADMIN-04 | T-06-21 through T-06-25 | `convex/rsvps.test.ts` bounded sweep, server-owned cutoff, invalid continuation, pagination, active survival; real `adminTest:smokeRsvpSessionLifecycle` | `npx vitest run convex/rsvps.test.ts -t "sweep\|start\|continuation\|cutoff\|malformed\|historical\|pagination\|idempotent\|active" && npx convex dev --once && npx convex run adminTest:smokeRsvpSessionLifecycle '{}' && npm test && npm run build && git diff --check` | ⬜ pending |
| 06-06-01 | 06 | 6 | ADMIN-04 | T-06-31 through T-06-37 | `convex/admin.test.ts` >128 rows, tagged purge modes, two phone changes, delayed/reordered delivery, equal/newer-generation survival, family delete-all | `npx vitest run convex/admin.test.ts -t "129\|128\|historical\|generation\|phone\|cascade\|purge\|reorder\|delayed\|deleteAll\|olderThanGeneration\|equivalent\|session" && npx convex dev --once && npm run build && git diff --check` | ⬜ pending |
| 06-06-02 | 06 | 6 | ADMIN-04 | T-06-31 through T-06-37 | `convex/admin.test.ts`, `convex/rsvps.test.ts`; real bounded `adminTest:smokeFamilyCascade` | `npx vitest run convex/admin.test.ts convex/rsvps.test.ts && npx convex dev --once && npx convex run adminTest:smokeFamilyCascade '{}' && npm test && npm run build && git diff --check` | ⬜ pending |
| 06-07-01 | 07 | 5 | ADMIN-04, ADMIN-05, ADMIN-06 | T-06-41 through T-06-45 | `src/lib/adminOperations.test.ts`; new test-first `src/components/admin/adminPendingOperations.test.ts` jsdom harness | `npx vitest run src/lib/adminOperations.test.ts src/components/admin/adminPendingOperations.test.ts && npm run build && git diff --check` | ⬜ pending |
| 06-07-02 | 07 | 5 | ADMIN-04, ADMIN-05, ADMIN-06 | T-06-41 through T-06-45 | `adminPendingOperations.test.ts` deferred A/B component cases for guests, moderation, gifts; full suite/build | `npx vitest run src/lib/adminOperations.test.ts src/components/admin/adminPendingOperations.test.ts && npm test && npm run build && git diff --check` | ⬜ pending |

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
- [ ] `convex/rsvps.test.ts` gap additions — generation-aware expiry plus no-argument sweep start, exact cursor+cutoff continuation, future/malformed input rejection, stable cutoff, pagination, retry, and active-session survival. These cases are not green until 06-05 executes.
- [ ] `convex/admin.test.ts` gap additions — >128-row phone/delete cascades and the two-successive-phone-change delayed/reordered purge regression proving generations 0/1 converge to zero while generation 2 survives. These cases are not green until 06-06 executes.
- [ ] `src/components/admin/adminPendingOperations.test.ts` — created test-first in 06-07 with jsdom, controlled A/B promises, same-id duplicate protection, per-record `aria-busy`/disabled assertions, out-of-order settlement, dialog isolation, and auth-loss cleanup. The file and dependency are pending execution.
- [ ] Real Convex helpers are internal/dev-only, bounded, snapshot every touched row, and restore in `finally`; production secrets are never hardcoded.

## Real-Backend Smoke Ownership

| Plan | Allowed mutation scope | Cleanup contract |
|------|------------------------|------------------|
| 06-01 | Disposable admin session only | Exact session id/expiry; logout/expiry idempotently removes it |
| 06-02 | No RSVP/post/wine mutation | Session revocation only; overview query/subscription behavior |
| 06-03 | Disposable family, guests, and RSVP sessions | Bounded IDs; snapshot all touched rows; `finally` restores pre-existing state and deletes created rows |
| 06-04 | Disposable moderation post and wine state | Bounded IDs; snapshot post/wine; `finally` restore through the same guarded transition invariants |
| 06-05 | Disposable invitation plus expired and active RSVP-session controls | `smokeRsvpSessionLifecycle` invokes expiry and validated sweep twice; `finally` removes every session/guest/family and returns no capability/hash |
| 06-06 | Disposable generation/cascade family with bounded real-backend row count | `smokeFamilyCascade` proves immediate old-generation denial plus tagged purge idempotency; `finally` removes every session/guest/family |
| 06-07 | No real-backend fixture mutation | jsdom owns deterministic A/B concurrency; full Convex suite/build guards existing server contracts |

## Manual / Browser Verifications

The following five UI/device backstops remain human-owned after gap execution. Automated Convex and jsdom evidence must not mark them complete:

| Backstop | Requirements | Why browser/manual | Test instructions |
|----------|--------------|--------------------|-------------------|
| 1. Two-session reactivity and authorization loss | ADMIN-01, ADMIN-03, ADMIN-04, ADMIN-05, ADMIN-06 | Real storage/WebSocket/tab lifecycle | Use two authenticated owner sessions plus the relevant public surface. Mutate RSVP, moderation, and gift state in one; observe overview/badges/lists/public projections in the other; revoke/expire/logout and confirm protected DOM, drafts, dialogs, and pending state clear while route restoration remains correct. |
| 2. Zoom and breakpoint boundaries | ADMIN-02 | Real browser layout and navigation composition | At 320 CSS px with 200% zoom and at 1023/1024 px, verify no overflow or duplicate navigation, all four mobile destinations, reachable logout, touch targets, and correct focus order. |
| 3. Long-content resilience | ADMIN-02, ADMIN-04, ADMIN-05, ADMIN-06 | Intrinsic sizing and destructive-control reachability | Use long family/person/wine names and a long memory; verify wrapping never hides badges, decision content, dialogs, or destructive controls. |
| 4. Real virtual keyboards | ADMIN-02, ADMIN-04, ADMIN-06 | iOS/Android viewport behavior is not faithfully modeled by jsdom | On iOS and Android, open family and presenter dialogs, focus each field, and verify the active input and primary CTA remain visible/reachable above the keyboard. |
| 5. Accessibility and device chrome | ADMIN-02, ADMIN-04, ADMIN-05, ADMIN-06 | Rendered contrast, safe area, focus trap/restore, and OS motion preferences | Check contrast and visible focus for text/chips/buttons, safe-area padding, Escape, dialog trap and focus restoration, reduced motion, and keyboard-only completion on real browsers/devices. |

## Validation Sign-Off

- [x] All 18 tasks have exact `<automated>` verification commands.
- [x] Waves 1–6 and dependencies match all seven plans; 06-05 and 06-07 share Wave 5 without file overlap, and 06-06 follows 06-05 in Wave 6.
- [x] Sampling continuity has no gap of three consecutive tasks.
- [x] `adminGuestDraft.test.ts` and `adminOperations.test.ts` are explicitly owned and mapped.
- [x] `adminPendingOperations.test.ts` is explicitly test-first, pending, and mapped to both 06-07 tasks.
- [x] Plan 02 is independent of later domain fixture helpers.
- [x] Lifecycle and cascade smoke ownership/restoration are bounded and explicit for 06-05 and 06-06.
- [x] The five UI/device backstops remain human-owned and unclaimed by automated evidence.
- [x] No watch-mode flags are used.
- [x] Expected focused feedback latency is under 30 seconds.
- [x] `nyquist_compliant: true` is set; `wave_0_complete` remains honestly false until test-first execution creates the planned files.

**Approval:** validation strategy is validated and Nyquist-compliant; execution evidence pending.
