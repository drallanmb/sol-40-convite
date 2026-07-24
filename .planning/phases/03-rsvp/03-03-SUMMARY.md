---
phase: 03-rsvp
plan: 03
subsystem: ui
tags: [react-router, vitest, session-storage, web-crypto, accessibility]

requires:
  - phase: 03-rsvp
    plan: 02
    provides: "Purpose-built public RSVP views, sparse save commands, and the token_conflict result"
provides:
  - "Canonical RSVP copy, absolute route navigation, and Router-aware home entry points"
  - "RSVP Button/Field contracts for focus, minimum targets, hints, and dynamic descriptions"
  - "Pure sparse RSVP draft, contact, attendance-count, and save-summary model"
  - "Canonical 256-bit session capability storage and bounded collision retry"
  - "Compile-time development-only clock override for informational deadline presentation"
affects: [03-04-confirmar-flow, 03-05-rsvp-acceptance, 06-admin]

tech-stack:
  added: []
  patterns:
    - "Absolute app routes use React Router Link; same-document fragments remain native anchors"
    - "RSVP edits reconcile latest server state with local dirty guest/contact intent and emit sparse commands"
    - "Raw public capabilities live under one versioned sessionStorage key and are never persisted with lookup data"
    - "Deadline helpers expose presentation copy only; backend save authorization remains date-independent"

key-files:
  created:
    - src/lib/rsvpDraft.ts
    - src/lib/rsvpDraft.test.ts
    - src/lib/rsvpSession.ts
    - src/lib/rsvpSession.test.ts
    - src/lib/rsvpClock.ts
    - src/lib/rsvpClock.test.ts
  modified:
    - src/content/event.ts
    - src/content/event.test.ts
    - src/components/invite/Hero.tsx
    - src/components/layout/Shell.tsx
    - src/components/ui/Button.tsx
    - src/components/ui/Field.tsx

key-decisions:
  - "RSVP route copy, entry labels, absolute navigation, and the explicit -03:00 boundary have one source in event.ts."
  - "Latest server snapshot, local draft, and dirty guest/contact intent remain distinct so reconciliation cannot turn omitted people into stale writes."
  - "The client accepts only canonical 32-byte unpadded base64url capabilities, stores the raw value under one session key, and retries token_conflict exactly once with a distinct token."
  - "The post-30-September state is copy-only; a direct import.meta.env.DEV guard is the sole path to the browser clock override."
  - "RSVP focus longhands are important because the unlayered global shorthand wins over Tailwind utilities; placeholders use solid wine for AA contrast."

patterns-established:
  - "Sparse RSVP command: changed opaque guest refs plus explicit contact unchanged/set/clear."
  - "Session capability: canonical Web Crypto token, Storage-parameterized helpers, malformed-value clearing, no phone/contact persistence."
  - "Presentation clock: real time in production and a versioned non-sensitive session override only in development."

requirements-completed: [RSVP-03, RSVP-04, RSVP-05]

coverage:
  - id: D1
    description: "The complete approved RSVP copy, saved-count/accessibility templates, deadline text, reduced navigation, and both home entry labels/targets are centralized and account-safe."
    requirement: RSVP-04
    verification:
      - kind: unit
        ref: "src/content/event.test.ts#approved RSVP copy, navigation, entry, and deadline contracts"
        status: pass
      - kind: integration
        ref: "npx vitest run src/content/event.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "Hero and desktop/mobile Shell navigation use Router-aware RSVP links, while the RSVP Button and Field expose the approved focus and description semantics."
    requirement: RSVP-04
    verification:
      - kind: integration
        ref: "npm run build plus compiled CSS assertions for important 3px sea focus and solid wine placeholder"
        status: pass
    human_judgment: true
    rationale: "A browser pass is still needed to judge responsive action spacing, menu behavior, visible focus treatment, and visual continuity with the sunset artwork."
  - id: D3
    description: "A pure draft model preserves pending answers, reconciles concurrent snapshots, validates optional contact guidance, and emits only sparse dirty intent with exact neutral success copy."
    requirement: RSVP-03
    verification:
      - kind: unit
        ref: "src/lib/rsvpDraft.test.ts#sparse command, reconciliation, contact, counts, and success summaries"
        status: pass
      - kind: integration
        ref: "npx vitest run src/lib/rsvpDraft.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "The browser model generates canonical 32-byte capabilities, restores only the sole session-scoped value, and caps token-conflict recovery at two distinct attempts."
    requirement: RSVP-05
    verification:
      - kind: unit
        ref: "src/lib/rsvpSession.test.ts#capability generation, storage, malformed restore, and bounded retry"
        status: pass
      - kind: integration
        ref: "npx vitest run src/lib/rsvpSession.test.ts"
        status: pass
    human_judgment: false
  - id: D5
    description: "The deadline clock switches only the informational helper at the first instant after 30 September and ignores the development override in production."
    requirement: RSVP-03
    verification:
      - kind: unit
        ref: "src/lib/rsvpClock.test.ts#production guard, malformed override, console setup, and boundary -1/at/+1"
        status: pass
      - kind: integration
        ref: "npx vitest run src/lib/rsvpClock.test.ts"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-07-24
status: complete
---

# Phase 3 Plan 3: RSVP Frontend Foundation Summary

**Canonical RSVP entry/copy, sparse-edit state, session-only 256-bit capabilities, and a presentation-only deadline clock now form a tested frontend contract for `/confirmar`.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-07-24T19:23:50Z
- **Completed:** 2026-07-24T19:48:26Z
- **Tasks:** 3/3
- **Files modified:** 12

## Accomplishments

- Centralized the complete approved RSVP copy—including saved counts and `Presença de {name}`—the literal `30 de setembro` deadline, route-safe navigation, and both home entry points without adding account or admin language.
- Integrated Router-aware hero/Shell links and extended the existing Button/Field primitives with a cascade-safe 3px sea focus ring, AA placeholder contrast, target-size, hint, error, and status contracts.
- Added a pure sparse draft model that preserves explicit pending answers, contact `unchanged | set | clear`, cross-snapshot dirty intent, attendance counts, and every approved saved summary.
- Added canonical 32-byte Web Crypto capabilities, one-key session storage, malformed-value clearing, and an exact one-retry collision policy with no persisted phone/contact data.
- Added an informational deadline clock whose override is compile-time development-only and whose `-1 / at / +1` boundary never exposes save eligibility or a closed state.

## Task Commits

Each TDD task was committed with separate RED and GREEN history; correctness/security follow-ups remained atomic:

1. **Task 1 RED: RSVP content contract** — `30bf1c2` (test)
2. **Task 1 GREEN: content, entry, and primitive contracts** — `1c01228` (feat)
3. **Task 2 RED: sparse RSVP draft contract** — `1dabd33` (test)
4. **Task 2 GREEN: sparse draft model** — `30c75e4` (feat)
5. **Task 3 RED: session and clock contracts** — `80d3f5e` (test)
6. **Task 3 GREEN: session capability and RSVP clock** — `8adca8c` (feat)
7. **Task 3 hardening: canonical capability restore** — `6ab84db` (fix)
8. **Task 3 hardening: compile-time development clock guard** — `6681d6b` (fix)
9. **Task 1 hardening RED: visual, copy, and account-surface contracts** — `2b0a0ca` (test)
10. **Task 1 hardening GREEN: primitive and copy gaps** — `a9c4a58` (fix)

**Plan metadata:** initial summary/state commit `2aca836`, state synchronization `c8e5703`, and final hardening recorded with this update.

## Files Created/Modified

- `src/content/event.ts` — complete RSVP copy including saved/accessibility templates, route navigation, hero actions, and offset-qualified deadline boundary.
- `src/content/event.test.ts` — exact copy/navigation/account-safety and primitive cascade/placeholder contract.
- `src/components/invite/Hero.tsx` — responsive primary Router action plus secondary fragment action, with artwork/text preserved.
- `src/components/layout/Shell.tsx` — shared Router/native-anchor selection across wordmark and desktop/mobile navigation.
- `src/components/ui/Button.tsx` — reusable RSVP variant whose important focus longhands beat the unlayered global shorthand.
- `src/components/ui/Field.tsx` — merged hint/caller description IDs, caller-controlled invalid state, and solid wine placeholder text.
- `src/lib/rsvpDraft.ts` — pure draft/reducer, sparse command, contact validation, counts, and success-summary helpers.
- `src/lib/rsvpDraft.test.ts` — 17 sparse/reconciliation/contact/count/copy tests.
- `src/lib/rsvpSession.ts` — capability generation, one-key Storage helpers, and bounded unlock collision recovery.
- `src/lib/rsvpSession.test.ts` — canonical encoding/restore, session storage, and exact call-count tests.
- `src/lib/rsvpClock.ts` — production clock, development-only override, and deadline presentation helper.
- `src/lib/rsvpClock.test.ts` — production/dev and deadline precision tests.

## Decisions Made

- Use React Router only for absolute internal app routes; keep home fragments as native anchors so existing same-document scroll behavior remains intact.
- Normalize optional contact by trimming only at the sparse-command boundary, while preserving the user's in-progress field value locally.
- Match the backend's canonical base64url constraint on restore, including final-character pad bits, rather than accepting every decodable 43-character value.
- Keep the deadline as presentation state only. Production never reads the debug clock key, and neither clock helper exports `canSave` or `closed`.
- Use important RSVP focus longhands instead of changing the ordinary global focus rule; use solid wine placeholders for 9.69:1 cream and 10.22:1 card contrast.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Narrowed the Web Crypto random buffer for TypeScript 6**

- **Found during:** Task 3 build verification.
- **Issue:** TypeScript's typed-array generic inferred an `ArrayBufferLike` shape that did not satisfy the injected random-fill contract.
- **Fix:** Constructed and typed the 32-byte buffer as `Uint8Array<ArrayBuffer>` without changing runtime generation.
- **Files modified:** `src/lib/rsvpSession.ts`
- **Verification:** `npm run build` and all capability tests pass.
- **Committed in:** `8adca8c`

**2. [Rule 1 - Bug] Rejected noncanonical base64url pad bits during capability restore**

- **Found during:** Task 3 security audit.
- **Issue:** A length/alphabet-only client pattern accepted some 43-character encodings that decoded to 32 bytes but were rejected by the canonical backend validator.
- **Fix:** Restricted the last character to canonical values and added a regression case for noncanonical pad bits.
- **Files modified:** `src/lib/rsvpSession.ts`, `src/lib/rsvpSession.test.ts`
- **Verification:** The malformed value is cleared, canonical tokens still round-trip, and the session suite passes.
- **Committed in:** `6ab84db`

**3. [Rule 2 - Missing Critical] Made the development clock guard compile-time only**

- **Found during:** Task 3 contract review.
- **Issue:** The first clock API allowed a caller-supplied development flag, which could bypass the required production-ignore guarantee.
- **Fix:** Removed caller control and gated storage reads directly with `import.meta.env.DEV`; the production test now proves zero storage reads.
- **Files modified:** `src/lib/rsvpClock.ts`, `src/lib/rsvpClock.test.ts`
- **Verification:** Production ignores a valid override, development accepts it, malformed values fail safe, and the build passes.
- **Committed in:** `6681d6b`

**4. [Rule 1 - Bug] Made the RSVP focus treatment win the CSS cascade**

- **Found during:** Late independent Task 1 audit.
- **Issue:** The unlayered global `outline` shorthand overrode layered Tailwind focus utilities, leaving the RSVP action at 2px coral instead of the contracted 3px sea.
- **Fix:** Marked the RSVP outline width, sea color, and 3px offset longhands important so both native buttons and Router links beat the ordinary global shorthand.
- **Files modified:** `src/components/ui/Button.tsx`, `src/content/event.test.ts`
- **Verification:** The production CSS contains all three important declarations; the focused content suite and build pass.
- **Committed in:** `2b0a0ca`, `a9c4a58`

**5. [Rule 1 - Bug] Corrected placeholder contrast**

- **Found during:** Late independent Task 1 audit.
- **Issue:** Tailwind Preflight rendered inherited ink at 50% for placeholders, measuring about 3.2:1 on cream/card instead of the required 4.5:1.
- **Fix:** Set Field placeholders to solid wine, preserving distinction from entered ink while reaching 9.69:1 on cream and 10.22:1 on card.
- **Files modified:** `src/components/ui/Field.tsx`, `src/content/event.test.ts`
- **Verification:** The compiled placeholder rule is solid wine; contrast calculation, focused tests, and build pass.
- **Committed in:** `2b0a0ca`, `a9c4a58`

**6. [Rule 2 - Missing Critical] Completed route copy and widened the account-surface regression proof**

- **Found during:** Late independent Task 1 audit.
- **Issue:** The saved-count template and radio-group accessible-name template were not centralized, while the account-language test examined only `RSVP_COPY`.
- **Fix:** Added both exact UI-SPEC templates and made the test scan the complete current RSVP source surface for unapproved account/login/password/admin language and routes after whitelisting the two negative assurances.
- **Files modified:** `src/content/event.ts`, `src/content/event.test.ts`
- **Verification:** Exact object equality includes both templates, the scoped source corpus passes the deny-list, and no `/admin` or account endpoint changed.
- **Committed in:** `2b0a0ca`, `a9c4a58`

---

**Total deviations:** 6 auto-fixed (1 blocking type boundary, 3 correctness/accessibility bugs, 2 missing critical guards/contracts).
**Impact on plan:** All fixes tightened the planned contracts without adding product scope, dependencies, endpoints, or persistence.

## Issues Encountered

None remaining. A late secondary audit found the focus cascade, placeholder contrast, two missing copy templates, and narrow account-surface proof after the initial metadata commit. All four were fixed in `a9c4a58`; a fresh read-only review of that head reran the focused suite/build, inspected production CSS, recalculated contrast, and reported `PASS` with no new findings.

## User Setup Required

None. The development deadline state is available when needed through the documented browser console command:

```js
sessionStorage.setItem('sol40:rsvp-dev-now:v1', '2026-10-01T00:00:00-03:00'); location.reload()
```

## Next Phase Readiness

- Plan 03-04 can compose `/confirmar`, PhoneGate, and FamilyForm over the stable copy, draft, session, and clock contracts.
- The raw capability remains scoped to the current browser session; a new session must request the phone again.
- Admin lookup/edit by phone remains untouched and reserved for Phase 6.

## Self-Check: PASSED

- All 12 claimed files exist; all ten task/fix commits resolve from repository history.
- Focused foundation verification passed: **4 files / 57 tests**.
- Full suite passed: **7 files / 172 tests**.
- `npm run build`, compiled focus/placeholder CSS assertions, `git diff --check dd32677..HEAD`, privacy/storage scans, and the sole capability-key literal check passed.
- Neither `/admin` nor `convex/_generated` changed.
- Follow-up independent review reported `PASS` on `a9c4a58`.

---
*Phase: 03-rsvp*
*Completed: 2026-07-24*
