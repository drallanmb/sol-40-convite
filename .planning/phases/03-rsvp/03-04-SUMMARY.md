---
phase: 03-rsvp
plan: 04
subsystem: ui
tags: [react-router, convex, session-storage, accessibility, sparse-updates]

requires:
  - phase: 03-rsvp
    plan: 02
    provides: "Purpose-built public RSVP views, sparse save commands, bounded rate limits, and scoped session expiry"
  - phase: 03-rsvp
    plan: 03
    provides: "Canonical RSVP copy, draft/session helpers, route-safe navigation, and informational deadline presentation"
provides:
  - "Public /confirmar route with same-tab session restoration and phone-based capability unlock"
  - "Accessible per-person yes/pending/no attendance form with one optional shared contact"
  - "Sparse partial saves with persistent success, retry preservation, and scoped expiry cleanup"
  - "Session-only phone access with bounded token-conflict recovery and no account/admin surface"
affects: [03-05-rsvp-acceptance, 06-admin]

tech-stack:
  added: []
  patterns:
    - "Catchable Convex reads keep restoration and family failures explicit instead of rendering stale scoped data"
    - "Native fieldset, legend, and radio groups preserve per-person semantics and 44px interaction targets"
    - "Sparse drafts survive retryable failures and reconcile only from a successful returned server view"
    - "Raw RSVP capabilities persist only in sessionStorage and every expiry/switch path clears scoped UI state"

key-files:
  created:
    - src/routes/Confirmar.tsx
    - src/components/rsvp/PhoneGate.tsx
    - src/components/rsvp/AttendanceGroup.tsx
    - src/components/rsvp/FamilyForm.tsx
  modified:
    - src/App.tsx

key-decisions:
  - "Session restoration uses a catchable Convex query so malformed, expired, network, and valid states remain distinct without briefly exposing the phone gate."
  - "Save keeps focus on the submit control through aria-disabled plus an imperative busy guard, while only the form controls become natively disabled during the request."
  - "A dirty family draft refuses phone switching until the confirmation dialog planned for 03-05; a clean switch clears capability and family DOM immediately."
  - "The literal 30 de setembro deadline remains informational and never disables unlock or save."

patterns-established:
  - "RSVP route state: restoration -> phone gate -> family loading/error/form, with scoped data cleared before every return to the gate."
  - "Family save state: clean/dirty/saving/persistent result, with Toast as a secondary announcement rather than the sole success surface."
  - "Phone unlock state: input retained on miss/rate/network failures, cleared only after a successful capability is stored."

requirements-completed: [RSVP-03, RSVP-04, RSVP-05]

coverage:
  - id: D1
    description: "The public /confirmar route restores only a valid same-tab capability, unlocks by phone without account semantics, retries one token collision, and clears scoped family data on expiry or clean switching."
    requirement: RSVP-04
    verification:
      - kind: unit
        ref: "src/lib/rsvpSession.test.ts#storage, malformed restore, and bounded collision retry"
        status: pass
      - kind: integration
        ref: "Focused RSVP route/component suites plus npm run build"
        status: pass
      - kind: manual
        ref: "Browser smoke: unlock, reload restoration, new-tab isolation, saved reload, and clean switch"
        status: pass
    human_judgment: false
  - id: D2
    description: "Each guest has a native labelled Vai/Pendente/Não vai group, the shared contact is optional, and partial submissions emit only sparse changed intent while preserving retryable drafts."
    requirement: RSVP-03
    verification:
      - kind: unit
        ref: "src/lib/rsvpDraft.test.ts#partial draft, pending status, sparse command, reconciliation, and contact"
        status: pass
      - kind: integration
        ref: "npm test: 172 tests passed; production TypeScript/Vite build passed"
        status: pass
      - kind: manual
        ref: "Browser smoke: accessible group names/order, one-person partial save, shared contact, persistent success, focused submit, and saved reload"
        status: pass
    human_judgment: true
    rationale: "Plan 03-05 still owns final responsive, focus, and edge-state visual acceptance even though the normal browser flow passed."
  - id: D3
    description: "Unlock and save requests reject duplicates, use only server-provided integer retry timing, retain phone/draft input after retryable failures, and remove scoped DOM after session expiry."
    requirement: RSVP-05
    verification:
      - kind: unit
        ref: "PhoneGate/FamilyForm source contracts plus backend rate-limit and expiry suites"
        status: pass
      - kind: integration
        ref: "Full npm test and production build; source scan excludes localStorage, console logging, and unsafe HTML"
        status: pass
    human_judgment: false

duration: 13min
completed: 2026-07-24
status: complete
---

# Phase 3 Plan 4: RSVP Normal Flow Summary

**`/confirmar` now provides session-only phone unlock, accessible per-person attendance editing, optional shared contact, and sparse partial saves without creating a login or exposing admin access.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-07-24T19:51:58Z
- **Completed:** 2026-07-24T20:04:56Z
- **Tasks:** 2/2
- **Files modified:** 5

## Accomplishments

- Added the real `/confirmar` route beside the untouched `/admin` route, with an explicit restoration state that remembers access only for the browser tab session and never flashes an incorrect phone gate.
- Added phone unlock with canonical capability generation, one bounded token-conflict retry, retained input on recoverable failures, and immediate scoped cleanup on expiry or family switching.
- Added accessible native attendance groups in the exact Vai/Pendente/Não vai order, optional shared contact, partial/pending sparse saves, server-count reconciliation, persistent success, and a secondary toast.
- Verified the normal flow in a real browser across unlock, same-tab reload, new-tab isolation, dirty/clean switching, partial save, saved reload, focus retention, and fixture restoration.

## Task Commits

Each task was committed atomically:

1. **Task 1: RSVP route and phone unlock gate** — `5d6bbb4` (feat)
2. **Task 2: Accessible sparse family form** — `50816e5` (feat)

**Plan metadata:** summary, roadmap, requirements, and state are committed with the final plan update.

## Files Created/Modified

- `src/App.tsx` — mounts `/confirmar` without changing `/admin` or catch-all behavior.
- `src/routes/Confirmar.tsx` — owns restoration, unlock, family loading/error/form, capability storage, focus, and scoped cleanup.
- `src/components/rsvp/PhoneGate.tsx` — phone search and bounded capability unlock with approved privacy/account-safe copy.
- `src/components/rsvp/AttendanceGroup.tsx` — visible native fieldset/legend/radio semantics and responsive minimum-target layout.
- `src/components/rsvp/FamilyForm.tsx` — sparse draft editing, optional contact, save/retry/expiry state, persistent success, and dirty-switch protection.

## Decisions Made

- Use `useConvex().query` for the restoration/family read because it makes network and expiry failures catchable while preserving the capability for retryable reads.
- Keep a valid capability during a family-read network error, but never retain or render a stale family snapshot.
- Keep the save button focusable when clean/saving via `aria-disabled`; duplicate protection remains imperative and all data controls are disabled only during a request.
- Fail closed on a dirty phone switch until Plan 03-05 adds the final discard dialog; clean switching already clears the session capability and all family/contact DOM.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Captured the contact value before the React state update**

- **Found during:** Task 2 real-browser smoke.
- **Issue:** The contact change handler read `event.currentTarget.value` inside a functional state updater; React had already cleared `currentTarget`, causing the form to crash while typing.
- **Fix:** Captured the string before calling `setDraft` and passed the stable value into the reducer.
- **Files modified:** `src/components/rsvp/FamilyForm.tsx`
- **Verification:** Repeated the complete browser flow, then passed all 172 tests and the production build.
- **Committed in:** `50816e5`

---

**Total deviations:** 1 auto-fixed correctness bug.
**Impact on plan:** The fix stayed inside the planned contact-edit path and added no scope, dependency, endpoint, or persistence.

## Issues Encountered

None remaining. Browser coverage exercised the normal success/session paths; Plan 03-05 retains ownership of exhaustive failure-state and final responsive/visual acceptance.

## User Setup Required

None.

## Next Phase Readiness

- Plan 03-05 can add the dirty-discard dialog and complete edge-state, responsive, focus, and accessibility acceptance over the working normal flow.
- Phone access remains session-only; reopening in a new browser session requests the phone again.
- Search/edit by phone inside `/admin` remains reserved for Phase 6 and was not touched.

## Self-Check: PASSED

- All five claimed implementation files exist and both task commits resolve from repository history.
- Full suite: 7 files and 172 tests passed; production TypeScript/Vite build passed.
- Browser smoke passed and restored its test fixture; no phone, contact, or capability appeared in the URL or persistent storage.
