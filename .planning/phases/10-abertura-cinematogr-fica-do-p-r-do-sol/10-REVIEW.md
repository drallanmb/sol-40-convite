---
phase: 10-abertura-cinematogr-fica-do-p-r-do-sol
reviewed: 2026-07-26T06:37:22Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - src/components/invite/Hero.tsx
  - src/components/layout/Shell.tsx
  - src/index.css
  - src/lib/cinematicIntro.test.ts
  - src/lib/cinematicIntro.ts
  - src/routes/Home.tsx
  - tests/cinematic-intro.spec.ts
  - tests/release.spec.ts
findings:
  critical: 0
  warning: 3
  info: 0
  total: 3
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-07-26T06:37:22Z
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

The intro state machine, responsive target measurement, navigation lifecycle, and
cross-browser tests are coherent, but the reviewed implementation still has
three robustness defects. A synchronous Web Animations failure can leave the
page permanently hidden and inert, production visibility is coupled to a test
selector, and the release accessibility gate can pass while known WCAG-tagged
violations remain.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: WAAPI exceptions can leave the entire Home permanently locked

**File:** `src/components/invite/Hero.tsx:51-55,87-101`
**Issue:** The implementation checks whether `animate` exists, but does not
handle `visual.animate(...)`, `animation.finish()`, or `animation.cancel()`
throwing. A partial/polyfilled implementation, a browser regression, or an
invalid runtime timing value can therefore escape the animation frame or scroll
handler before `onIntroDescentComplete()` runs. The phase remains
`descending`, which keeps the header and hero controls hidden and `inert`
indefinitely. This violates the project's explicit fail-open motion convention.
**Fix:** Put animation creation behind a `try/catch` that calls
`completeDescent()` on failure, and make completion fail-open with `try/finally`
so the phase callback always executes:

```tsx
try {
  animation = visual.animate(keyframes, timing)
  visual.dataset.introMotionReady = 'true'
  animation.onfinish = completeDescent
} catch {
  completeDescent()
}

// Inside completeDescent:
try {
  if (animation) {
    animation.onfinish = null
    if (animation.playState !== 'finished') animation.finish()
    animation.cancel()
  }
} finally {
  onIntroDescentComplete()
}
```

Add a browser contract that replaces the canonical sun's `animate` method with
a throwing function and asserts that the final hero, header, and controls
become visible and operable.

### WR-02: Production reveal behavior depends on a test-only attribute

**File:** `src/index.css:178-184`
**Related:** `src/components/invite/Hero.tsx:151-154`
**Issue:** The CSS that hides the sun until WAAPI is ready selects
`data-testid="hero-sun-visual"`. Removing or renaming a test hook during routine
test cleanup would silently break production behavior: the sun would no longer
be hidden before motion readiness, producing a flash at its target or making
the first-frame contract browser-dependent. Test identifiers should observe
behavior, not control it.
**Fix:** Add a semantic production attribute such as
`data-intro-sun-visual` to the canonical node and use that in all production CSS
and runtime selectors. Keep `data-testid` only for Playwright location if it is
still useful:

```tsx
<div
  ref={sunVisualRef}
  data-intro-sun-visual
  data-testid="hero-sun-visual"
  ...
/>
```

```css
[data-intro-phase="descending"] [data-intro-sun-visual] {
  visibility: hidden;
}
```

### WR-03: The release gate can report automated AA success with WCAG violations

**File:** `tests/release.spec.ts:33-40`
**Issue:** `expectNoBlockingAxeViolations` runs Axe with WCAG A/AA tags but then
drops every violation whose Axe impact is `moderate` or `minor`. Impact is a
severity estimate, not a conformance level. Consequently, tests named
`passes automated AA` can be green while Axe has returned WCAG-tagged
violations, creating a false release signal for the accessibility requirement.
**Fix:** Either fail on every violation returned by the selected WCAG tags:

```ts
const result = await new AxeBuilder({ page })
  .withTags(WCAG_AA_TAGS)
  .analyze()
expect(result.violations).toEqual([])
```

or explicitly maintain a reviewed rule allowlist with rationale and expiry.
If the intended policy is only to block serious/critical impact, rename the
tests and helper so they do not claim automated AA conformance.

---

_Reviewed: 2026-07-26T06:37:22Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
