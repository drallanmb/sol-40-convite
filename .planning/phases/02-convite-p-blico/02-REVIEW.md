---
phase: 02-convite-p-blico
reviewed: 2026-07-24T00:00:00Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - index.html
  - package.json
  - vite.config.ts
  - src/index.css
  - src/content/event.ts
  - src/content/event.test.ts
  - src/lib/countdown.ts
  - src/lib/countdown.test.ts
  - src/hooks/useCountdown.ts
  - src/components/invite/PalmSvg.tsx
  - src/components/invite/SeaWaves.tsx
  - src/components/invite/Hero.tsx
  - src/components/invite/Countdown.tsx
  - src/components/invite/CountdownRail.tsx
  - src/components/invite/ProgramaSection.tsx
  - src/components/invite/DressCodeSection.tsx
  - src/components/invite/LocalSection.tsx
  - src/components/invite/GuideSection.tsx
  - src/components/layout/Shell.tsx
  - src/routes/Home.tsx
findings:
  critical: 0
  warning: 5
  info: 2
  total: 7
status: issues_found
---

# Phase 02-convite-p-blico: Code Review Report

**Reviewed:** 2026-07-24T00:00:00Z
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found

## Summary

Reviewed the full public-invite surface: content module, the offset-qualified countdown state machine + its hook, all `invite/*` section components, the `Shell` layout (topbar, hamburger, skip link, scroll-driven countdown rail), and the click-to-load map. No security vulnerabilities, no XSS surface (all copy is static, no `dangerouslySetInnerHTML`/`eval`/`innerHTML`), no hardcoded secrets, no empty catch blocks, no debug artifacts (`console.*`/`TODO`/`FIXME`) anywhere in scope. The timezone-safe countdown math (`getEventState`/`toParts`) is correct at every boundary I traced, including the "depois" unbounded-growth path, and is well covered by `countdown.test.ts`. The map's zero-external-request-on-load property holds: the Google Maps `<iframe>` only ever mounts after `showMap` is flipped by an explicit button click, and no `<link>`/`@import` in this scope pulls from a third-party CDN (fonts are self-hosted via `@fontsource-variable`). The dress-code gallery's declared `width`/`height`/`aspect-ratio` values were verified against the actual files in `public/` and match exactly, so there is no layout-shift risk there.

The issues found are all in the "correctness under edge cases" and "quality/maintainability" tier rather than anything ship-blocking: two independent per-second timers that the code's own comments claim can "never disagree," an accessibility inconsistency where only one of four anchor-link targets is keyboard-focusable, a hamburger menu with no Escape/focus handling, a spelling regression test that excludes the one object the correction actually lives in, and a fragile DOM-heuristic coupling between `Shell` and `Home`'s section order.

## Warnings

### WR-01: Two independent per-second timers can show different digits, contradicting the documented invariant

**File:** `src/hooks/useCountdown.ts:15-27`, also `src/components/invite/Countdown.tsx:50` and `src/components/invite/CountdownRail.tsx:19-21,38`

**Issue:** `useCountdown()` creates its own `useState` + `setInterval(…, 1000)` per call site. `Home.tsx` renders `<Countdown />` and `Shell` (via `showCountdownRail`) renders `<CountdownRail />` simultaneously, so there are **two separate, independently-scheduled 1000ms timers**, each calling `getEventState(new Date())` at whatever millisecond its own `setInterval` happens to fire — not in lockstep with the other instance. `CountdownRail.tsx`'s doc comment asserts: *"Reads the same `useCountdown()` state as `Countdown.tsx` so the two can never disagree about the current phase"* — this is not accurate for the `seconds` (and momentarily `minutes`) digit: the two components can and will show values up to ~1s apart at the same wall-clock instant, since nothing synchronizes the two interval callbacks to the same tick. The phase-level boundary case is comparatively low-risk (phases persist for hours/months), but the digit-level claim in the comment is false, and the pattern is a hook-design smell: shared "live clock" state should come from one ticking source, not be re-derived per consumer.

**Fix:** Hoist the tick to a single shared source, e.g. a small module-level `useSyncExternalStore` subscription (one `setInterval` for the whole app) or a Context provider that both `Countdown` and `CountdownRail` read from:
```ts
// src/hooks/useCountdown.ts
let listeners = new Set<() => void>()
let state = getEventState(new Date())
let timer: number | undefined

function ensureTicking() {
  if (timer !== undefined) return
  timer = window.setInterval(() => {
    state = getEventState(new Date())
    listeners.forEach((l) => l())
  }, 1000)
}

export function useCountdown() {
  return useSyncExternalStore(
    (onStoreChange) => {
      listeners.add(onStoreChange)
      ensureTicking()
      return () => listeners.delete(onStoreChange)
    },
    () => state,
  )
}
```

### WR-02: Only the Hero section is focusable via anchor navigation — the other three `NAV_LINKS` targets are not

**File:** `src/components/invite/Hero.tsx:23` (has `tabIndex={-1}`) vs. `src/components/invite/LocalSection.tsx:19-22`, `src/components/invite/ProgramaSection.tsx:16-19`, `src/components/invite/DressCodeSection.tsx:15-18` (no `tabIndex`)

**Issue:** `Hero.tsx`'s own comment explains the purpose of `tabIndex={-1}`: it makes the section a valid focus target so browsers move keyboard/AT focus there on fragment navigation. `NAV_LINKS` (Local `#aracaju`, Programação `#programacao`, Traje `#traje`) link to `LocalSection`, `ProgramaSection`, and `DressCodeSection` — none of which set `tabIndex`. For a keyboard-only or screen-reader user, activating "Programação" in the topbar nav scrolls the viewport to that section but does **not** move focus there (the section isn't part of the focus order), so the next `Tab` press continues from wherever focus was before the jump instead of from the newly-visible content. This is inconsistent within the same file set — the pattern was clearly known and applied once, then not applied to the three sections that are actually the nav's real targets.

**Fix:** Add the same `tabIndex={-1}` (and, ideally, `className="... outline-none"` to avoid an unwanted visible ring on programmatic focus, matching `Shell`'s `<main>` pattern) to each section that is a `NAV_LINKS`/`ctaHref` target:
```tsx
// LocalSection.tsx / ProgramaSection.tsx / DressCodeSection.tsx
<section id={SECTION_IDS.local} tabIndex={-1} className="scroll-mt-[120px] outline-none ...">
```

### WR-03: Mobile hamburger menu has no Escape-to-close or focus management

**File:** `src/components/layout/Shell.tsx:129-152` (toggle button), `157-174` (nav panel)

**Issue:** The hamburger toggles `menuOpen` and the mobile `<nav>` is shown/hidden purely with a CSS class swap. There is no keydown handler for `Escape`, no focus is moved into the panel when it opens (or back to the toggle button when it closes), and there's no click-outside-to-close. A keyboard user who opens the menu has no way to dismiss it except tabbing through all the links and past them, and a screen-reader user gets no cue that focus has entered a new navigation region. `aria-expanded`/`aria-controls` are wired correctly, but the missing keyboard escape hatch is a real gap for a review scope that explicitly calls out the hamburger.

**Fix:** Add an effect that closes on `Escape` and returns focus to the toggle button:
```tsx
useEffect(() => {
  if (!menuOpen) return
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setMenuOpen(false)
  }
  document.addEventListener('keydown', onKeyDown)
  return () => document.removeEventListener('keydown', onKeyDown)
}, [menuOpen])
```

### WR-04: The spelling-regression test excludes `VENUE` — the one object the correction actually lives in

**File:** `src/content/event.test.ts:84-92`

**Issue:** The `event content — spelling` test builds the historical misspelled variant and asserts it doesn't appear in `JSON.stringify({ DRESS, GUIDE, HOTELS, NAV_LINKS, PROGRAMA })`. But `event.ts`'s own comment on `VENUE` says: *"D-04 — corrected Matapuã spelling in both name and street"* — `VENUE.name` and `VENUE.addressLine1` are exactly where the fix was made, and `VENUE` is not part of the object this test stringifies. As written, the test would still pass even if a future edit reintroduced the misspelling into `VENUE.name` or `VENUE.addressLine1`, defeating the purpose the test's own `describe` block claims to serve.

**Fix:**
```ts
const source = JSON.stringify({ DRESS, GUIDE, HOTELS, NAV_LINKS, PROGRAMA, VENUE })
```
(and add `VENUE` to the imports at the top of the file).

### WR-05: `CountdownRail` reveal logic depends on a runtime DOM heuristic that silently degrades if section order changes

**File:** `src/components/layout/Shell.tsx:47-60`

**Issue:** `readScrollState` finds the reveal threshold via `document.getElementById(SECTION_IDS.hero)?.nextElementSibling`, relying on `Home.tsx` always rendering the countdown section as the literal next DOM sibling after Hero. There is no ref, no id, and no runtime assertion tying this contract to `Home.tsx` — if a future change reorders sections (e.g., inserts a banner between Hero and Countdown), the rail's reveal timing silently falls back to `window.scrollY > window.innerHeight * 2`, an approximation that no longer matches the real countdown section's position, with no error, warning, or test failure signaling the drift.

**Fix:** Make the contract explicit instead of implicit — e.g. have `Home.tsx` mark the section that should gate the reveal (`data-countdown-rail-anchor`) and have `Shell` query that attribute instead of relying on DOM adjacency to `SECTION_IDS.hero`:
```tsx
// Home.tsx
<Countdown data-countdown-rail-anchor="" />
// Shell.tsx
const anchorEl = document.querySelector('[data-countdown-rail-anchor]')
```
or pass a ref down through `children`/context so `Shell` doesn't need to infer DOM adjacency at all.

## Info

### IN-01: `PROGRAMA`/`PROGRAMA_KICKER`/`PROGRAMA_HEADING` are merged into one multi-declarator `const` purely to dodge a grep-based verification gate

**File:** `src/content/event.ts:147`

**Issue:** The comment explains this merge is deliberate so that only one physical line in the file starts with `const PROGRAMA…`, avoiding a false-positive on an "exact count" grep gate elsewhere in the plan. That's a reasonable one-off workaround, but it ships as permanent production code: three semantically unrelated exports (two strings, one typed array) now share a single declaration, which hurts readability/discoverability (`PROGRAMA_HEADING`'s type is inferred rather than stated, and a future contributor adding a fourth related export is likely to either break the merge or copy the anti-pattern forward).

**Fix:** Split back into three independent `export const` statements now that this review is a separate, later gate than the one being dodged; if the original gate still exists and is genuinely miscalibrated, fix the gate's grep pattern instead of shaping source code around it long-term.

### IN-02: `og:image` uses a root-relative URL, which most social crawlers won't resolve

**File:** `index.html:17`

**Issue:** `<meta property="og:image" content="/og.jpg" />` is root-relative. Facebook/Twitter/LinkedIn link-preview crawlers generally require an absolute URL for `og:image` to render a preview at all. This is already called out in an adjacent code comment as intentionally deferred to a later phase's owner checklist, so it's not a defect introduced by this phase — flagging here only for completeness/traceability, since it is a real gap in the file that was in scope for this review.

**Fix:** Once the production domain is fixed, replace with the absolute form, e.g. `content="https://sol-40-convite.vercel.app/og.jpg"` (or the final custom domain).

---

_Reviewed: 2026-07-24T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
