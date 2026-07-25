---
phase: 06
slug: dashboard-interno-admin
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-25
---

# Phase 06 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 + convex-test 0.0.54 |
| **Config file** | `vite.config.ts` |
| **Quick run command** | `npx vitest run convex/admin.test.ts src/lib/adminSession.test.ts src/lib/adminSearch.test.ts` |
| **Full suite command** | `npm test && npm run build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run the focused Vitest files owned by that task.
- **After every plan wave:** Run `npm test && npm run build`.
- **Before `/gsd-verify-work`:** Full suite must be green and the real-Convex
  browser matrix must be recorded.
- **Max feedback latency:** 30 seconds for focused automated feedback.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | ADMIN-01 | T-06-01 | Password never reaches storage; only a hashed opaque session is persisted | integration | `npx vitest run convex/admin.test.ts -t "login\\|password\\|hash"` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | ADMIN-01 | Missing, malformed, expired and revoked tokens expose no protected DTO or write | integration | `npx vitest run convex/admin.test.ts -t "authorization matrix"` | ❌ W0 | ⬜ pending |
| 06-01-03 | 01 | 1 | ADMIN-01 | Seven-day absolute boundary, logout and scheduled expiry are exact and idempotent | integration | `npx vitest run convex/admin.test.ts src/lib/adminSession.test.ts` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 2 | ADMIN-02 | The client performs no protected query before a valid session | unit/build | `npx vitest run src/lib/adminSession.test.ts && npm run build` | ❌ W0 | ⬜ pending |
| 06-02-02 | 02 | 2 | ADMIN-03 | Overview counts people exactly and rejects invalid sessions uniformly | integration | `npx vitest run convex/admin.test.ts -t "overview"` | ❌ W0 | ⬜ pending |
| 06-03-01 | 03 | 2 | ADMIN-04 | Search/filter helpers preserve family context and normalize accents/phones | unit | `npx vitest run src/lib/adminSearch.test.ts` | ❌ W0 | ⬜ pending |
| 06-03-02 | 03 | 2 | ADMIN-04 | Create/edit/delete preserves uniqueness, cascades children and revokes RSVP sessions | integration | `npx vitest run convex/admin.test.ts -t "family\\|guest\\|phone\\|cascade"` | ❌ W0 | ⬜ pending |
| 06-04-01 | 04 | 2 | ADMIN-05 | Only legal moderation transitions succeed and stale undo cannot overwrite a later change | integration | `npx vitest run convex/admin.test.ts -t "moderation\\|undo\\|conflict"` | ❌ W0 | ⬜ pending |
| 06-04-02 | 04 | 2 | ADMIN-06 | Gift mark is atomic and unmark clears `giftedBy` and `giftedAt` together | integration | `npx vitest run convex/admin.test.ts -t "gift"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `convex/admin.test.ts` — admin-specific `convex-test` harness,
  authorization matrix, session lifecycle, overview, RSVP CRUD, moderation and
  gift invariants.
- [ ] `src/lib/adminSession.test.ts` — pure token persistence, expiry and
  client gate state tests.
- [ ] `src/lib/adminSearch.test.ts` — accent/case/phone normalization and
  family-filter semantics.
- [ ] Admin test harness follows the existing injected module-glob and
  rate-limiter component pattern; production secrets are never hardcoded.
- [ ] Real Convex smoke invokes the internal expiry mutation because the test
  harness does not advance scheduled functions by wall clock.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Persistent seven-day login and expiry | ADMIN-01 | Browser storage lifecycle and real scheduled execution | Login, close/reopen browser, confirm session restoration; expire/revoke server-side and confirm protected content disappears in all tabs |
| Responsive shell and accessible navigation | ADMIN-02 | Visual layout, safe areas, focus and touch behavior | Verify desktop sidebar, four-item mobile bar, 44px targets, focus visibility and logout placement |
| Cross-tab reactivity | ADMIN-03 | Requires two live browser sessions over Convex WebSocket | Change RSVP, moderation and gift state in one tab and verify overview/badges update in the other |
| Family administration UX | ADMIN-04 | Confirmation hierarchy and responsive expansion are interaction qualities | Exercise search, status filters, person removal, family removal and phone change with active public RSVP session |
| Moderation queue and public album | ADMIN-05 | Full media preview and public reactivity need browser rendering | Approve/hide/undo across tabs and verify public album inclusion/removal |
| Present operation and public catalog | ADMIN-06 | Confirmation and reactive public status need live UI | Mark/unmark a wine, search by giver/code and verify `/presentes` updates |
| Pre-auth network privacy | ADMIN-01 | Browser transport inspection | Open `/admin` logged out and verify Network/WebSocket contains no overview, RSVP, post or wine payload |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
