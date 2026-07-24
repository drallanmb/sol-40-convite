---
phase: 3
slug: rsvp
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-24
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Seeded from `03-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.10 + convex-test 0.0.54 |
| **Config file** | `vite.config.ts` exists; Wave 0 extends it for `convex/**/*.test.ts` and registers the rate-limiter test adapter |
| **Quick run command** | `npx vitest run src/lib/phone.test.ts convex/rsvps.test.ts` |
| **Full suite command** | `npm test && npm run build` |
| **Estimated runtime** | ~20 seconds locally; real Convex smoke is separate |

---

## Sampling Rate

- **After every task commit:** Run the narrowest relevant `npx vitest run <test-file>` command.
- **After every plan wave:** Run `npm test && npm run build`.
- **At schema/component boundaries:** Run `npx convex dev --once`; if a connected local deployment is unavailable, run codegen/typecheck and record the missing real-backend smoke explicitly.
- **Before `/gsd-verify-work`:** Full suite and build must be green, generated Convex files must be current, and the manual browser matrix below must be completed.
- **Max feedback latency:** 30 seconds for automated local feedback.

---

## Per-Task Verification Map

> Task IDs are assigned by the planner. Rows are keyed by requirement until
> `/gsd-execute-phase` binds them to concrete task IDs.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 0 | RSVP-01 | T-03-01 | Equivalent formats map to one canonical/candidate set; DDD 55 is preserved | unit | `npx vitest run src/lib/phone.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | RSVP-02 | T-03-02 | Validators and indexes reject invalid shapes; fixture creation preserves logical phone uniqueness | integration | `npx vitest run convex/rsvps.test.ts -t "schema\\|fixture\\|unique"` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | RSVP-03 | T-03-03 | Sparse patches affect only scoped guest IDs; contact set/clear is bounded and atomic | integration | `npx vitest run convex/rsvps.test.ts -t "partial\\|contact\\|atomic"` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | RSVP-04 | T-03-04 | Capability for family A cannot read/write family B; expired/invalid tokens fail closed | integration | `npx vitest run convex/rsvps.test.ts -t "unlock\\|scope\\|session\\|idempotent"` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | RSVP-05 | T-03-05 | Invalid/not-found attempts consume lookup limits; families/sessions remain isolated | integration | `npx vitest run convex/rsvps.test.ts -t "rate limit"` | ❌ W0 | ⬜ pending |
| TBD | TBD | 2 | RSVP-03, RSVP-04 | T-03-03 / T-03-04 | Client sends only dirty changes and clears expired session capability | unit/model | `npx vitest run src/lib/rsvpDraft.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 2 | RSVP-01–05 | T-03-01–05 | Production-shaped schema, component and generated API compile on Convex runtime | smoke | `npx convex dev --once` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `convex-test@0.0.54` — exact-pinned dev dependency.
- [ ] `@convex-dev/rate-limiter@0.3.2` — exact-pinned application dependency.
- [ ] `@edge-runtime/vm` — exact-pinned dev dependency if required by the installed convex-test setup.
- [ ] `vite.config.ts` — include `convex/**/*.test.ts` without regressing existing `src/**/*.test.ts`.
- [ ] `convex/convex.config.ts` — register the rate-limiter component.
- [ ] Convex test setup — register `@convex-dev/rate-limiter/test` in every relevant test instance.
- [ ] `src/lib/phone.test.ts` — table-driven normalization/candidate cases.
- [ ] `convex/rsvps.test.ts` — fixtures and public-function integration harness.
- [ ] Generated Convex API/component types — regenerate; never patch by hand.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hero CTA and menu link both open `/confirmar`; direct load and refresh work | RSVP-03 | Browser routing/navigation behavior | Open from both home entry points, then directly load and refresh `/confirmar` |
| Same browser session restores the unlocked family; a new session/incognito asks for phone | RSVP-04 | `sessionStorage` lifetime is browser behavior | Unlock, reload same tab, then close session/open incognito and compare |
| Valid, unknown, expired and throttled states have clear Portuguese feedback without exposing other data | RSVP-04, RSVP-05 | Copy/live-region behavior | Exercise each state with keyboard and screen reader; inspect rendered payload |
| Partial response visibly preserves pending people and can be edited later | RSVP-03, RSVP-04 | End-to-end interaction state | Save one person, leave another pending, reopen by phone and edit both |
| Person controls are usable at 360px and by keyboard, with named groups and 44px targets | RSVP-03 | Responsive/accessibility rendering | Test at 360px, tab through each group, select all three statuses |
| Literal “Confirme até 30 de setembro” renders while late edits remain available | RSVP-03, RSVP-04 | Date copy plus policy behavior | Set test clock after the deadline and confirm no UI/server block |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
