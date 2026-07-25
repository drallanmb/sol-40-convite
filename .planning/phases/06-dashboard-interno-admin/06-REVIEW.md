---
phase: 06-dashboard-interno-admin
reviewed: 2026-07-25T05:57:19Z
depth: standard
files_reviewed: 47
files_reviewed_list:
  - convex/_generated/api.d.ts
  - convex/admin.test.ts
  - convex/adminAuth.ts
  - convex/adminInternal.ts
  - convex/adminModel.ts
  - convex/adminOverview.ts
  - convex/adminPosts.ts
  - convex/adminRateLimits.ts
  - convex/adminRsvps.ts
  - convex/adminSecurity.ts
  - convex/adminTest.ts
  - convex/adminWines.ts
  - convex/crons.ts
  - convex/rsvpInternal.ts
  - convex/rsvpModel.ts
  - convex/rsvpSecurity.ts
  - convex/rsvps.test.ts
  - convex/rsvps.ts
  - convex/schema.ts
  - convex/wineInternal.ts
  - convex/wineModel.ts
  - convex/wineOperations.ts
  - convex/wines.test.ts
  - src/App.tsx
  - src/components/admin/AdminConfirmDialog.tsx
  - src/components/admin/AdminGifts.tsx
  - src/components/admin/AdminGuests.tsx
  - src/components/admin/AdminLogin.tsx
  - src/components/admin/AdminModeration.tsx
  - src/components/admin/AdminOverview.tsx
  - src/components/admin/AdminShell.tsx
  - src/components/admin/adminPendingOperations.test.ts
  - src/components/ui/Button.tsx
  - src/components/ui/Card.tsx
  - src/components/ui/Field.tsx
  - src/components/ui/Toast.tsx
  - src/content/admin.test.ts
  - src/content/admin.ts
  - src/index.css
  - src/lib/adminGuestDraft.ts
  - src/lib/adminOperations.test.ts
  - src/lib/adminOperations.ts
  - src/lib/adminSearch.test.ts
  - src/lib/adminSearch.ts
  - src/lib/adminSession.test.ts
  - src/lib/adminSession.ts
  - src/routes/Admin.tsx
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Phase 06: Code Review Report

**Reviewed:** 2026-07-25T05:57:19Z
**Depth:** standard
**Files Reviewed:** 47
**Status:** clean

## Summary

The complete Phase 06 admin surface and the three gap-closure plans were reviewed adversarially. The earlier fixed-session-count blocker and scalar busy-state warning are closed in the production paths, not merely hidden by tests. Authorization remains server-side, protected projections stay separate from public DTOs, and the new internal cleanup writers do not widen the public API.

Focused regression execution passed 101 tests across `convex/admin.test.ts`, `convex/rsvps.test.ts`, `src/lib/adminOperations.test.ts`, and `src/components/admin/adminPendingOperations.test.ts`.

All reviewed files meet quality standards. No issues found.

## Narrative Findings (AI reviewer)

### Prior CR-01 closure: verified

`createRsvpSession` snapshots the current invitation generation and schedules one guarded expiry at the absolute `expiresAt`. Authorization requires strict `now < expiresAt`, an existing invitation, and legacy-aware generation equality. The daily recovery path starts with a server-owned cutoff, scans `by_expires_at` in fixed pages, carries the same cutoff and opaque continuation cursor, re-reads rows before deletion, and is retry-safe.

Phone changes no longer enumerate or refuse a fixed number of sessions. They atomically increment the invitation generation before scheduling `olderThanGeneration` cleanup, so every old capability becomes unauthorized immediately. The predicate is monotonic (`sessionGeneration < commandGeneration`), preserving equal/newer sessions even when consecutive phone-change jobs are delayed, retried, or reordered. Family deletion removes the invitation before scheduling the exclusive `deleteAll` cleanup, so access fails closed immediately and no new family session can be issued. Pagination advances after deletes and the checked 160-row regressions converge correctly.

### Prior WR-01 closure: verified

`usePendingOperations` owns each record with a synchronous ref-backed token, exposes independent immutable pending membership, rejects same-tick duplicate work before calling the mutation, and settles only the matching token/id. Authorization clear invalidates every token before pending UI state is cleared, so late promises cannot repopulate protected feedback.

Guests serialize commands per family while allowing different families to overlap; moderation scopes apply/undo by post; gifts scope mark/unmark and dialog cleanup by wine and captured revision. Completion handlers check current ownership, and global feedback uses latest-command ownership. The component tests exercise the actual exported screens with deferred mutation promises: A and B start, duplicate B is refused, A resolves first, and B remains disabled and `aria-busy` until its own settlement.

### Security and contract probes

- Public RSVP DTOs still omit session generation, token hashes, internal cleanup handles, phone, and storage metadata.
- Public wine DTOs still omit giver identity and timestamp; those fields remain available only through authorized admin queries.
- Every admin query and mutation authorizes before reading or writing protected records.
- Moderation and gift writes retain expected-status/revision checks, legal-transition enforcement, and stale/ABA conflict behavior.
- Scheduled expiry, historical sweep, phone purge, and family purge are internal mutations. Their retries are idempotent and active/equal/newer RSVP sessions survive the relevant cleanup predicate.
- The generated API declares cleanup and smoke modules only through the internal API filter; no admin operational writer was accidentally removed.
- No test was accepted as proof of physical-device layout, independent-browser WebSocket reactivity, zoom, virtual keyboard, safe-area, focus, reduced-motion, or contrast. Those remain human UAT backstops rather than code-review findings.

---

_Reviewed: 2026-07-25T05:57:19Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
