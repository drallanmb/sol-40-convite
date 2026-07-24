---
phase: 02-convite-p-blico
fixed_at: 2026-07-24T13:23:48Z
review_path: .planning/phases/02-convite-p-blico/02-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 02-convite-p-blico: Code Review Fix Report

**Fixed at:** 2026-07-24T13:23:48Z
**Source review:** .planning/phases/02-convite-p-blico/02-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (WR-01 through WR-05; IN-01/IN-02 out of scope per fix_scope)
- Fixed: 5
- Skipped: 0

## Fixed Issues

### WR-01: Two independent per-second timers can show different digits, contradicting the documented invariant

**Files modified:** `src/hooks/useCountdown.ts`
**Commit:** e2cf797
**Applied fix:** Rewrote `useCountdown()` to read from a single module-level shared tick source via `useSyncExternalStore` instead of each call site owning its own `useState`/`setInterval`. There is now exactly one `setInterval` for the whole app (started lazily on first subscriber, stopped when the last subscriber unmounts); `Countdown.tsx` and `CountdownRail.tsx` both call the same unchanged `useCountdown()` API and now re-render from the identical `state` reference on the identical tick, so the `seconds`/`minutes` digits can genuinely never disagree — `CountdownRail.tsx`'s existing doc comment claiming this is now accurate rather than aspirational. No exported API surface changed (`getEventState`, `toParts`, `pluralizeUnit`, the `-03:00` offset semantics in `src/lib/countdown.ts` were not touched), and no second scroll listener or new prop was introduced.

### WR-02: Only the Hero section is focusable via anchor navigation — the other three `NAV_LINKS` targets are not

**Files modified:** `src/components/invite/LocalSection.tsx`, `src/components/invite/ProgramaSection.tsx`, `src/components/invite/DressCodeSection.tsx`
**Commit:** 8fe75cc
**Applied fix:** Added `tabIndex={-1}` to the `<section>` element in each of the three files, matching `Hero.tsx`'s existing pattern (which already has `tabIndex={-1}` and no extra `outline-none` class, so the same minimal pattern was applied here rather than the review's optional `outline-none` embellishment). Keyboard/AT focus now follows all four `NAV_LINKS`/`ctaHref` targets (Hero, Local, Programa, DressCode) consistently.

### WR-03: Mobile hamburger menu has no Escape-to-close or focus management

**Files modified:** `src/components/layout/Shell.tsx`
**Commit:** 56aeb83
**Applied fix:** Added `menuToggleRef`/`mobileNavRef` refs and a `useEffect` scoped to `menuOpen`: when the panel opens, focus moves to the first link inside it; pressing `Escape` while it's open closes the panel and returns focus to the hamburger toggle button. Existing nav-link `onClick={() => setMenuOpen(false)}` handlers were left untouched so in-page navigation continues to work exactly as before (no double-focus race with the browser's own fragment-navigation focus move).

### WR-04: The spelling-regression test excludes `VENUE` — the one object the correction actually lives in

**Files modified:** `src/content/event.test.ts`
**Commit:** e1eea52
**Applied fix:** Added `VENUE` to the imports and to the `JSON.stringify({...})` call inside the `event content — spelling` test, so the misspelling-regression guard now actually covers `VENUE.name`/`VENUE.addressLine1`, where the D-04 Matapuã correction lives. Test count unchanged (31 passing) since this strengthens an existing assertion rather than adding a new test.

### WR-05: `CountdownRail` reveal logic depends on a runtime DOM heuristic that silently degrades if section order changes

**Files modified:** `src/content/event.ts`, `src/components/invite/Countdown.tsx`, `src/components/layout/Shell.tsx`
**Commit:** f58ad79
**Applied fix:** Added a new `countdown: 'contagem'` key to `SECTION_IDS` (no test or other consumer referenced the previous fixed shape, so this is additive and safe), gave the `Countdown` section that `id={SECTION_IDS.countdown}`, and changed `Shell.tsx`'s `readScrollState` to look the element up directly via `document.getElementById(SECTION_IDS.countdown)` instead of `document.getElementById(SECTION_IDS.hero)?.nextElementSibling`. The reveal threshold is now tied to an explicit, stable id rather than DOM adjacency, so a future reorder of sections in `Home.tsx` can no longer silently desync the rail's reveal timing. The existing fallback path (`window.scrollY > window.innerHeight * 2` when the element isn't found) was left in place unchanged.

## Skipped Issues

None — all 5 in-scope findings (WR-01 through WR-05) were fixed. IN-01 and IN-02 were explicitly out of scope per the fix instructions and were not touched.

---

_Fixed: 2026-07-24T13:23:48Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
