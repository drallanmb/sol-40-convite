---
phase: 03-rsvp
plan: 05
subsystem: ui
tags: [react, native-dialog, responsive, accessibility, convex, browser-uat]

requires:
  - phase: 03-rsvp
    plan: 04
    provides: "Working phone unlock, session-only restoration, accessible RSVP form, and sparse partial saves"
provides:
  - "Native dirty-discard confirmation with safe focus, Escape, focus return, and explicit destructive cleanup"
  - "Approved 320/360/640/1024+ RSVP responsive and accessibility contract across normal and edge data shapes"
  - "Guarded fixture/runtime evidence for normal, zero, one, many-long, lookup throttling, partial editing, and save-limit preparation"
  - "A partial Nyquist record that keeps unobservable browser-injection, offline, zoom, and reduced-motion rows routed to human UAT"
affects: [phase-03-verification, 06-admin]

tech-stack:
  added: []
  patterns:
    - "Dirty session switching fails closed behind a native dialog; clean switching remains immediate."
    - "RSVP cards use page-only growth, breakpoint-specific choice anatomy, and native form semantics without a fixed submit bar."
    - "Manual acceptance distinguishes observed browser proof from automated-only or environment-blocked proof."

key-files:
  created:
    - src/components/rsvp/DiscardDialog.tsx
  modified:
    - src/routes/Confirmar.tsx
    - src/components/rsvp/PhoneGate.tsx
    - src/components/rsvp/AttendanceGroup.tsx
    - src/components/rsvp/FamilyForm.tsx
    - src/lib/rsvpDraft.test.ts

key-decisions:
  - "The destructive phone switch uses native dialog semantics and initially focuses the safe action."
  - "The route keeps the literal 30 de setembro informational; neither UI controls nor backend saves acquire a date block."
  - "No public test endpoint, URL token, committed fixture phone, or production bypass was added to compensate for browser-tool limitations."
  - "Unobservable CDP/sessionStorage, offline, literal zoom, and media-emulation rows remain explicit human UAT rather than being inferred as passing."

patterns-established:
  - "RSVP edge acceptance: stable fixture shapes plus bounded DOM/geometry checks at each contracted breakpoint."
  - "Browser privacy audit: family-scoped DOM only after capability, clean path-only URL, empty error/warn console, and no admin/password control."

requirements-completed: [RSVP-03, RSVP-04, RSVP-05]

coverage:
  - id: D1
    description: "Dirty phone switching requires an accessible native confirmation while clean switching immediately clears the capability and scoped family DOM."
    requirement: RSVP-04
    verification:
      - kind: unit
        ref: "src/lib/rsvpDraft.test.ts#dirty draft and pending-copy branches"
        status: pass
      - kind: automated_ui
        ref: "Chrome browser: dirty dialog safe focus, Escape, focus return, destructive clear, and clean immediate switch"
        status: pass
    human_judgment: false
  - id: D2
    description: "Normal, zero, one, and many-long RSVP views use native named controls, approved tone, page-only growth, and the contracted 320/360/640/1024+ layout."
    requirement: RSVP-03
    verification:
      - kind: integration
        ref: "npm test (173/173) and npm run build"
        status: pass
      - kind: automated_ui
        ref: "Chrome geometry/DOM matrix at 320, 360, 390, 640, 1024, 1440 plus zero/one/many-long"
        status: pass
      - kind: manual_procedural
        ref: "Literal 200% browser zoom and reduced-motion media emulation"
        status: unknown
    human_judgment: true
    rationale: "The connector proved equivalent narrow reflow and source-level reduced-motion rules but could not change Chrome zoom or prefers-reduced-motion."
  - id: D3
    description: "Partial saves, optional contact set/clear, reopen/edit, complete-attending, all-no gratitude, generic miss, and lookup throttling retain the approved state and tone."
    requirement: RSVP-03
    verification:
      - kind: integration
        ref: "Focused RSVP suites (85/85) and backend security filters (14/14)"
        status: pass
      - kind: automated_ui
        ref: "Chrome browser state/copy matrix with fixture restoration"
        status: pass
    human_judgment: true
    rationale: "Final UAT should confirm the observed Portuguese tone and visual hierarchy on the target devices."
  - id: D4
    description: "Guarded development fixtures/helpers and precise rate boundaries remain internal-only, reproducible, and cleaned up after validation."
    requirement: RSVP-05
    verification:
      - kind: integration
        ref: "ensureDemoFixtures twice: stable 4 RSVP / 16 guest totals; npx convex dev --once"
        status: pass
      - kind: integration
        ref: "prepareSaveThrottleDemo: nMinusOne 29, atLimit 30, successfulCalls 30, nextCallOrdinal 31; both generated sessions revoked"
        status: pass
      - kind: manual_procedural
        ref: "Expired capability injection, dev-clock rendering, browser save ordinal 31, and browser offline mode"
        status: unknown
    human_judgment: true
    rationale: "The available Chrome extension exposes neither writable CDP/sessionStorage nor offline/media emulation, and no in-app browser was available."

duration: 39min
completed: 2026-07-24
status: complete
---

# Phase 3 Plan 5: RSVP Edge Acceptance Summary

**`/confirmar` now has safe dirty-discard, complete fixture-shape rendering, responsive native attendance controls, neutral partial/all-no tone, and a reproducible validation record with the remaining browser-tool gaps kept explicit.**

## Performance

- **Duration:** 39 min
- **Started:** 2026-07-24T20:09:32Z
- **Completed:** 2026-07-24T20:48:28Z
- **Tasks:** 3/3 implementation tasks
- **Files modified:** 6 implementation files

## Accomplishments

- Added the exact native dirty-discard flow with safe initial focus, Escape/cancel, focus return, and destructive cleanup only after explicit confirmation.
- Completed the approved RSVP visual/accessibility contract across 320, 360, 640, and 1024+ breakpoints, including 44px targets, stacked/equal choices, desktop columns, safe-area spacing, and page-only scrolling.
- Exercised normal, zero, one, and twelve-person long-name fixtures; partial/contact/reopen/edit; complete-attending and thankful all-no messages; entry routes; session restoration/isolation; local invalid, generic miss, and lookup throttling.
- Re-ran the full 173-test suite, focused 85-test RSVP suite, 14 backend security filters, production build, real Convex smoke, fixture idempotence, and exact save-throttle preparation/teardown.
- Recorded the unavailable expired/dev-clock/save-N+1 injection, browser-offline, literal 200% zoom, and reduced-motion media rows as human UAT instead of claiming unobserved proof.

## Task Commits

Each task was committed atomically:

1. **Task 1: Native dirty-discard and explicit data states** — `3f95a55` (feat)
2. **Task 2: Responsive, visual, focus, and accessibility contract** — `14cb36e` (feat)
3. **Task 3: Browser-discovered destructive-button contrast fix** — `82a76e0` (fix)

**Plan metadata:** this summary, validation record, roadmap, requirements, and state are committed with the final plan update.

## Files Created/Modified

- `src/components/rsvp/DiscardDialog.tsx` — native modal, safe/destructive actions, Escape, focus return, and explicit wine/cream destructive styling.
- `src/routes/Confirmar.tsx` — stable loading anatomy, exact responsive columns/max widths, deadline helper surface, and scoped state routing.
- `src/components/rsvp/PhoneGate.tsx` — responsive phone-gate treatment, focus, live alerts, and recoverable lookup states.
- `src/components/rsvp/AttendanceGroup.tsx` — semantic radio groups with stacked 320px and equal 360px+ choices.
- `src/components/rsvp/FamilyForm.tsx` — dirty switch wiring, zero/one/many rendering, optional contact, success/rate/network/expiry states, and page-only growth.
- `src/lib/rsvpDraft.test.ts` — locked singular/plural pending and success/tone branches.

## Browser and Runtime Matrix

| Area | Result | Recorded evidence |
|------|--------|-------------------|
| Entry points/direct refresh | Pass | Header and hero links both reached `/confirmar`; direct load and refresh worked. |
| Normal session | Pass | Unlock, same-tab restore, independent-tab phone gate, partial save, reload, edit, and idempotent clean state. |
| Contact | Pass | Optional synthetic contact set, persisted, then explicitly cleared and remained empty after save. |
| Dirty/clean switch | Pass | Dirty opened native dialog; Escape retained draft and returned focus; destructive action cleared scoped DOM; clean switched immediately. |
| Phone failures | Pass | Empty/local invalid alert, generic unknown alert, and attempt 6 rate alert with positive integer retry and retained input. |
| Zero | Pass | Exact invariant message, zero counts, and no save control. |
| One | Pass | Full-width standard anatomy; pending, thankful all-no, and complete-attending branches; fixture restored to pending. |
| Many-long | Pass | Twelve ordered groups, long family/person names wrapped, no ellipsis, no horizontal/nested scroll, natural page height. |
| 320 | Pass | Choices stacked at 44px with 8px separation; long text wrapped; document width stayed within the CSS viewport. |
| 360 | Pass | Three equal 82px choices; no horizontal/nested scroll. |
| 390 / 1440 | Pass | Mobile and desktop screenshots visually inspected; desktop wrapper/columns/gap matched the contract. |
| 640 | Pass | 625px available card width, 32px horizontal padding, no overflow. |
| 1024 | Pass | 257px/560px columns with exact 64px gap and no overflow. |
| Focus/semantics/live | Pass | Native fieldsets/radios/dialog, named groups, visible coral/sea focus, safe initial modal focus, polite saved statuses, alert failures. |
| Privacy/tone | Pass | Path-only URL, no console warnings/errors, no phone/token-like DOM, no password/admin control, neutral pending and thankful all-no copy. |
| 200% zoom / reduced motion | Human needed | 320px equivalent reflow and source rules passed; literal Chrome zoom and media preference could not be emulated. |
| Network/offline | Human needed | Retry/catch and draft model are green; connector had no offline/CDP capability. |

## Guarded Fixture and Boundary Evidence

- `npx convex run rsvpInternal:ensureDemoFixtures '{}'` was executed twice before sign-off. Both runs returned the same four labeled shapes and totals: 4 RSVP rows, 16 guest rows, with no duplicate creation.
- `npx convex run rsvpInternal:issueDemoSession '{"fixture":"normal","state":"expired"}'` issued the internal expired capability. It was not committed or placed in a URL, and teardown returned `deleted`.
- One interactive shell generated a fresh capability, ran `prepareSaveThrottleDemo`, and received exactly `{ nMinusOne: 29, atLimit: 30, successfulCalls: 30, nextCallOrdinal: 31 }`.
- The prepared throttle capability was revoked in the same shell and the variable was unset. No raw capability or synthetic phone is present in source or this planning record.
- Browser call 31 was not executed because the available Chrome surface had no writable CDP/sessionStorage API; this remains human UAT and is not represented as a pass.
- Backend coverage stayed green for token conflict, global invalid-token saves, expiry -1/at/+1, retry rounding, lookup/save rate boundaries, partial/idempotent saves, contact clear, and recursive privacy.

## Verification Commands

- `npx vitest run src/lib/rsvpDraft.test.ts src/lib/rsvpSession.test.ts src/lib/rsvpClock.test.ts convex/rsvps.test.ts` — 85/85 passed.
- `npx vitest run convex/rsvps.test.ts -t 'immutable session owner|global invalid token|expiry|rate limit|partial save|save privacy'` — 14 passed, 29 skipped.
- `npm test` — 7 files, 173/173 tests passed.
- `npm run build` — TypeScript and Vite production build passed.
- `npx convex dev --once` — connected development deployment prepared successfully.
- `git diff --check` and privacy/account-copy scans — passed.

## Decisions Made

- Use a native `<dialog>` and focus the safe action first; destructive cleanup is never the implicit/default keyboard outcome.
- Preserve the existing session-only capability contract and keep all validation helpers internal/dev-only.
- Treat the literal deadline as presentation-only and leave all editing controls enabled.
- Keep the remaining browser-tool limitations visible in Nyquist/UAT metadata rather than adding a public test endpoint, query token, storage bypass, or production-only seam.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Visual correctness] Tailwind quiet-button cascade overrode destructive contrast**

- **Found during:** Task 3 browser dialog review.
- **Issue:** The destructive action inherited the quiet variant's later colors, producing dark text on wine instead of the approved cream-on-wine treatment.
- **Fix:** Applied explicit Tailwind important color utilities to the destructive action only.
- **Files modified:** `src/components/rsvp/DiscardDialog.tsx`
- **Verification:** Reopened the real native dialog, inspected computed wine/cream colors and screenshot, then reran focused/full tests and build.
- **Committed in:** `82a76e0`

### Environment Adaptations

- The Chrome password-manager popup intermittently blocked extension automation. Validation continued by switching among the locally created test tabs; no user action or extension setting change was required.
- The in-app browser was not installed (`Browser is not available: iab`), Chrome exposed only viewport/page-assets capabilities, and Playwright evaluation was explicitly read-only. No unsafe workaround or test endpoint was added.

---

**Total auto-fixed deviations:** 1 visual correctness bug.
**Impact on plan:** Implementation scope stayed within the declared RSVP files; incomplete browser-only proofs are isolated in the validation record.

## Issues Encountered

The following high-value manual rows remain open:

1. Inject the internal expired capability into the exact session key and observe scoped DOM removal/expired notice.
2. Set the DEV clock key after 30 September and confirm the helper plus enabled save.
3. Inject the prepared throttle capability, make one dirty edit, and observe browser save call 31 retaining the draft with retry time.
4. Exercise browser offline save/lookup recovery, literal 200% zoom, and reduced-motion emulation.

The code paths and their automated/backend proofs are green, but these rows were not observable on the available browser surface.

## User Setup Required

None for the application. Final Phase 3 sign-off needs a browser session with DevTools/CDP or a human to perform the open UAT rows above.

## Residual Risk

Phone lookup remains intentionally light access: anyone who knows an invited phone number may request that family's short-lived RSVP capability. Rate limits, generic misses, scoped opaque guest references, eight-hour expiry, session-only storage, and no admin crossover reduce the risk, but the phone is not a strong authentication factor.

## Next Phase Readiness

- Phase 3 implementation and all automated/real-runtime checks are ready for verification.
- Nyquist remains partial until the five browser-only UAT rows are observed; do not use this summary alone as final Phase 3 sign-off.
- `/admin` remains untouched; authenticated phone search/edit belongs to Phase 6.

## Self-Check: FAILED

- All six implementation files and three task commits exist; full automated/build/Convex checks pass.
- The acceptance self-check is intentionally failed because expired/dev-clock/save-N+1 injection, browser offline, literal 200% zoom, and reduced-motion emulation were not observed.

---
*Phase: 03-rsvp*
*Completed: 2026-07-24 with open human UAT*
