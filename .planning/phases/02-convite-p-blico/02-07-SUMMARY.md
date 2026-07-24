---
phase: 02-convite-p-blico
plan: 07
subsystem: ui
tags: [react, tailwind, invite, shell, navigation, scroll, composition]

# Dependency graph
requires:
  - phase: 02-convite-p-blico
    provides: "src/content/event.ts (plan 02-01) NAV_LINKS/SECTION_IDS; Hero (02-03); Countdown/CountdownRail/useCountdown (02-04); ProgramaSection/DressCodeSection (02-05); LocalSection/GuideSection (02-06)"
provides:
  - "Shell.tsx extended with scroll-condensed topbar chrome, wordmark, nav, mobile hamburger, skip link and a countdown-rail slot"
  - "Home.tsx rewritten as the real invite page composition (hero, countdown, local/Aracaju, programa, traje)"
affects: [phase-3-rsvp-nav-entry, phase-4-vinhos-nav-entry, phase-5-mural-nav-entry]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single page-level scroll listener (Shell) throttled via requestAnimationFrame, passive, cleaned up on unmount — CountdownRail is a pure controlled component with no scroll listener of its own"
    - "Rail-reveal threshold derived from live DOM position (getBoundingClientRect().bottom of the element after the hero), not a magic pixel constant"
    - "Skip link via sr-only/focus:not-sr-only, first focusable element, targets main via #conteudo + tabIndex={-1}"

key-files:
  created: []
  modified:
    - src/components/layout/Shell.tsx
    - src/routes/Home.tsx

key-decisions:
  - "[Phase 2-07]: ShellProps gained navLinks/showCountdownRail/wordmarkHref (typed against content/event.ts's NavLink) in place of the old untyped `nav: ReactNode` slot, since nothing in the codebase used the old prop and the acceptance criteria require the nav set to come only from a typed content-module literal"
  - "[Phase 2-07]: Rail-reveal threshold reads the DOM directly (bottom of the element immediately following #inicio) rather than hardcoding a pixel value, so it stays correct if Countdown's height ever changes"
  - "[Phase 2-07]: Topbar chrome is transparent by default and only gains the cream/blur/shadow/border treatment once scrolled past 12px, matching the old project's `.event-header-scrolled` behavior (not applied unconditionally as the Phase 1 placeholder had it)"

patterns-established: []

requirements-completed: [INVITE-01, INVITE-02, INVITE-03, INVITE-04]

coverage:
  - id: D1
    description: "Shell's topbar condenses (translucent cream + blur + shadow + border) past a 12px scroll threshold and reveals the compact CountdownRail once the real countdown section has scrolled out of view, via exactly one throttled passive scroll listener for the whole page"
    requirement: "INVITE-04"
    verification:
      - kind: unit
        ref: "npm run build (typecheck) — pass"
        status: pass
      - kind: other
        ref: "grep-based acceptance criteria (single addEventListener('scroll'), matching removeEventListener, requestAnimationFrame present, passive present, z-(--z-sticky)/z-(--z-skip) parenthesis syntax, zero bare duration-fast/duration-medium utilities)"
        status: pass
      - kind: manual_procedural
        ref: "1440px scroll-from-top chrome/rail timing check, 360px pre-event topbar single-line backstop, hamburger keyboard traversal, skip-link first-Tab check — end-of-phase human_verify_mode"
        status: unknown
    human_judgment: true
    rationale: "The scroll-timing feel (chrome appearing 'shortly after' leaving the hero, rail appearing only after the countdown scrolls past) and the flagged 360px three-piece-topbar backstop (E9) both need a real viewport and scroll interaction — not reproducible by a Node-environment unit test."
  - id: D2
    description: "The topbar renders the wordmark, exactly the three supplied nav links (Local/Programação/Traje) on desktop and a labelled hamburger on mobile that closes on link activation, with no link, badge or placeholder pointing at RSVP, presentes or the memory wall anywhere in Shell.tsx or Home.tsx"
    requirement: "INVITE-04"
    verification:
      - kind: unit
        ref: "npx vitest run — pass, 31 tests (unchanged suite, no regressions)"
        status: pass
      - kind: other
        ref: "grep-based acceptance criteria (aria-expanded=1, aria-controls=1, aria-label>=2, CountdownRail>=2, zero rsvp|presentes|memórias|em breve in either file, min-h-[44px]>=2, footer line byte-identical, git diff --quiet on App.tsx and NotFound.tsx)"
        status: pass
      - kind: manual_procedural
        ref: "Hamburger open/close + keyboard traversal, nav-link scroll targets landing clear of the sticky chrome, /404 rendering unchanged — end-of-phase human_verify_mode"
        status: unknown
    human_judgment: true
    rationale: "Keyboard-traversal correctness and the visual 'target lands clear of the sticky chrome' truth require a real browser session; the grep gates prove the nav set and ARIA wiring exist, not that the interaction feels correct."
  - id: D3
    description: "/ composes the six invite sections in the D-05 locked order (hero, countdown, local, guide, programa, traje) with the Phase 1 design-system scaffold and its dead imports fully removed, and src/App.tsx untouched"
    requirement: "INVITE-01,INVITE-02,INVITE-03,INVITE-04"
    verification:
      - kind: unit
        ref: "npm run build (typecheck, no unused-import errors) + npx vitest run — pass"
        status: pass
      - kind: other
        ref: "grep-based acceptance criteria (section import/usage count >=12, line-number order Hero<Countdown<LocalSection<GuideSection<ProgramaSection<DressCodeSection, zero swatch/Toast/Field/'design system' residue, zero deferred-phase terms, NAV_LINKS used >=2, git diff --quiet src/App.tsx)"
        status: pass
      - kind: manual_procedural
        ref: "Full top-to-bottom scroll at 360/768/1440px confirming no gap/empty block/placeholder — end-of-phase human_verify_mode"
        status: unknown
    human_judgment: true
    rationale: "Visual continuity between sections (no gap, no empty block) is a rendering judgment that needs a real browser at multiple breakpoints, not a static analysis."

# Metrics
duration: 12min
completed: 2026-07-24
status: complete
---

# Phase 2 Plan 07: Shell Composition — Topbar, Navigation and the Real Invite Page Summary

**Shell gained a scroll-condensed topbar (wordmark, nav, hamburger, skip link, countdown-rail slot) and Home.tsx now composes the six invite sections in D-05 order, replacing the Phase 1 design-system scaffold**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-24T12:35:00Z
- **Completed:** 2026-07-24T12:41:02Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `Shell.tsx` extended in place: three new optional props (`navLinks`, `showCountdownRail`, `wordmarkHref`), a single throttled/passive scroll listener driving both the condensed topbar chrome and the `CountdownRail` reveal (derived from the live DOM position of the section after the hero, not a magic pixel), a wordmark image with proper touch target and `aria-label`, nav rendered only from the supplied links, a three-bar-to-X hamburger with `aria-expanded`/`aria-controls`/state-dependent `aria-label` that closes on link activation, and a skip link as the first focusable element targeting `#conteudo`
- `Home.tsx` rewritten from the Phase 1 scaffold to the real composition: `Shell` wrapping `Hero`, `Countdown`, `LocalSection`, `GuideSection`, `ProgramaSection`, `DressCodeSection` in the D-05 locked order, wired to `NAV_LINKS`/`SECTION_IDS` from `src/content/event.ts`
- The Phase 1 footer and `NotFound.tsx` are byte-identical to before this plan — verified via `git diff --quiet` and an exact-string grep on the footer line
- No nav link, anchor, badge or placeholder anywhere in either file points at RSVP, presentes or the memory wall — verified via grep across both files

## Task Commits

Each task was committed atomically:

1. **Task 1: Shell — scroll state, condensed topbar and the countdown rail slot** - `31704b9` (feat)
2. **Task 2: Home — replace the design-system scaffold with the invite page** - `3ad9723` (feat)

**Plan metadata:** (this commit, docs)

## Files Created/Modified
- `src/components/layout/Shell.tsx` - Scroll-condensed topbar chrome, wordmark, nav, mobile hamburger, skip link, countdown-rail slot
- `src/routes/Home.tsx` - Real invite page composition replacing the Phase 1 scaffold

## Decisions Made
- Replaced the old untyped `nav: ReactNode` prop with the three typed props the plan specified (`navLinks`, `showCountdownRail`, `wordmarkHref`) rather than keeping both — nothing in the codebase passed the old prop, and the acceptance criteria require the nav set to come only from a typed content-module literal.
- Derived the countdown-rail reveal threshold from `document.getElementById(SECTION_IDS.hero).nextElementSibling`'s live `getBoundingClientRect().bottom` rather than a hardcoded pixel value, with a viewport-height-based fallback for routes that don't render the invite composition (e.g. a future route reusing Shell without Countdown as the second section).
- Topbar chrome (cream background, blur, shadow, visible border) is now scroll-conditional — transparent by default, matching the old project's `.event-header-scrolled` behavior — rather than always-on as the Phase 1 placeholder had it, since the header sits over the hero art before the guest scrolls.

## Deviations from Plan

None — plan executed exactly as written; all automated acceptance criteria in both tasks passed on first implementation.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None — every section renders live content from `src/content/event.ts`; no empty/placeholder state exists on this route.

## Threat Flags
None — the STRIDE threats already registered in `02-07-PLAN.md`'s `<threat_model>` (unthrottled-scroll DoS, deferred-phase nav spoofing, Phase 1 footer/NotFound tampering) are exactly the threats this plan's acceptance criteria (single throttled passive listener, deferred-term greps, `git diff --quiet` on NotFound) already enforce. No new trust boundary was opened.

## Next Phase Readiness
- Phase 2 (convite-p-blico) is now feature-complete: all seven plans executed, `/` renders the full static invite page, and `INVITE-01` through `INVITE-04` are all wired end to end.
- Outstanding before the phase gate: the end-of-phase browser walk consolidating every `🧪 backstop` flagged across plans 02-03 through 02-07 in `02-UI-SPEC.md` (360px topbar three-piece check, scroll-timing feel, hamburger keyboard traversal, full top-to-bottom scroll continuity at 360/768/1440px, plus the map/guide/dress-code backstops from earlier plans) — routed to `human_verify_mode: end-of-phase` per this project's config, not blocking this plan's completion.
- Phase 3 (RSVP) will add its own nav entry and hero CTA promotion; nothing in this plan needs to change for that beyond appending to `NAV_LINKS`.

---
*Phase: 02-convite-p-blico*
*Completed: 2026-07-24*

## Self-Check: PASSED
- FOUND: src/components/layout/Shell.tsx
- FOUND: src/routes/Home.tsx
- FOUND: .planning/phases/02-convite-p-blico/02-07-SUMMARY.md
- FOUND commit: 31704b9
- FOUND commit: 3ad9723
