---
phase: 06-dashboard-interno-admin
reviewed: 2026-07-25T04:44:48Z
depth: standard
files_reviewed: 43
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
  - convex/rsvpInternal.ts
  - convex/rsvpModel.ts
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
  critical: 1
  warning: 1
  info: 0
  total: 2
status: issues_found
---

# Phase 06: Code Review Report

**Reviewed:** 2026-07-25T04:44:48Z
**Depth:** standard
**Files Reviewed:** 43
**Status:** issues_found

## Summary

The protected admin boundary, optimistic revisions, legal moderation transitions, and public DTO privacy are generally coherent. The review found one shipping blocker in RSVP-session cascading: expired public sessions are retained indefinitely, while the new admin operations refuse to proceed after a fixed row count. It also found one repeated client-side concurrency weakness where a single busy identifier cannot safely represent multiple allowed in-flight record operations.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: Accumulated expired RSVP sessions can permanently block phone changes and family deletion

**Classification:** BLOCKER

**File:** `convex/adminRsvps.ts:227-235,371-380`

**Issue:** Both a logical phone change and family deletion read at most 129 `rsvpSessions` rows and refuse the operation when more than 128 exist. Public RSVP sessions expire after eight hours, but expiry is only checked during authorization; those rows are not removed by any scheduler or cleanup path. Each successful public unlock creates another row. Consequently, ordinary repeated unlocks accumulate forever and eventually make the owner's phone-change and family-delete operations permanently return an error. A party knowing the invitation phone can also deliberately reach this state over repeated rate-limit windows. This violates the phase contract that phone edits revoke linked public access and that owners can delete a family, and creates an availability/data-management denial of service.

**Fix:** Give public RSVP sessions a real lifecycle and make cascade deletion independent of a permanent fixed-count refusal. Schedule idempotent deletion when each RSVP session is created (as admin sessions already do), add a bounded migration/cleanup for existing expired rows, and process large family cascades in paginated internal batches if a transaction cannot safely delete every row at once. The admin operation should complete only after every session for the family has been removed:

```ts
// On public-session creation:
await ctx.scheduler.runAt(expiresAt, internal.rsvpInternal.expireRsvpSession, {
  sessionId,
  expectedExpiresAt: expiresAt,
})

// The expiry mutation must be idempotent and guard against a replaced expiry.
const session = await ctx.db.get(sessionId)
if (session?.expiresAt === expectedExpiresAt) {
  await ctx.db.delete(sessionId)
}
```

Add a regression test with more than 128 historical/expired sessions proving both phone update and family deletion finish and leave zero linked sessions.

## Warnings

### WR-01: A single busy identifier is cleared by the wrong concurrent operation

**Classification:** WARNING

**Files:** `src/components/admin/AdminGuests.tsx:193,264-290,297-331,339-355`; `src/components/admin/AdminModeration.tsx:82,132-168,171-198`; `src/components/admin/AdminGifts.tsx:154,202-230,234-258`

**Issue:** These screens intentionally disable only the affected record, so operations on different records can run concurrently. However, each screen stores only one `busyFamily`, `busyPost`, or `busyWine`. Starting operation B overwrites A's busy identifier; when A finishes, its unconditional `setBusy*(null)` clears B's still-active lock. B can then be submitted again, and later completions can overwrite feedback or dialog state out of order. Server-side expected revisions usually prevent data corruption, but the UI no longer reliably prevents duplicate submissions or represents which records are actually pending.

**Fix:** Track pending record IDs independently (for example, a `Set<string>` or per-record operation map), atomically add the target before a request, and remove only that target in `finally`. Also guard handlers against launching a second request for an ID already present:

```ts
setBusyIds((current) => new Set(current).add(id))
try {
  await mutateRecord()
} finally {
  setBusyIds((current) => {
    const next = new Set(current)
    next.delete(id)
    return next
  })
}
```

Add deferred-promise component tests that start operations for A and B, resolve A first, and verify B remains disabled until B resolves.

---

_Reviewed: 2026-07-25T04:44:48Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
