---
phase: 01-funda-o-design-system-deploy
fixed_at: 2026-07-23T00:00:00Z
review_path: .planning/phases/01-funda-o-design-system-deploy/01-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 01: Code Review Fix Report

**Fixed at:** 2026-07-23T00:00:00Z
**Source review:** .planning/phases/01-funda-o-design-system-deploy/01-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (WR-01..WR-05 — `fix_scope: critical_warning`; Critical count was 0, so no CR/BL findings existed; the 3 Info findings IN-01..IN-03 are out of scope for this run)
- Fixed: 5
- Skipped: 0

**Build verification:** `npm run build` (`tsc -b && vite build`) ran clean after all five fixes were applied — no type errors, all assets (including the re-pointed font imports from WR-05) resolved and emitted correctly.

## Fixed Issues

### WR-01: `VITE_CONVEX_URL` is read unvalidated and the app has no error boundary

**Files modified:** `src/main.tsx`, `src/vite-env.d.ts` (new)
**Commit:** 2752789
**Applied fix:** Added a presence check on `import.meta.env.VITE_CONVEX_URL` that throws a clear pt-BR error message before constructing `ConvexReactClient`, so a missing env var fails loudly instead of producing a silent blank page. Also added `src/vite-env.d.ts` augmenting `ImportMetaEnv`/`ImportMeta` so `VITE_CONVEX_URL: string` is typed at compile time (closing the `any`-typed index-signature gap the review flagged). Did not add a top-level `ErrorBoundary` — the review's own fix section phrased that as an optional "consider," not a required change, and it is out of scope for a minimal, narrowly-targeted fix; left for a future phase if desired.

### WR-02: `Field`'s hint text is not programmatically associated with the control

**Files modified:** `src/components/ui/Field.tsx`
**Commit:** 7a7b59d
**Applied fix:** Derived `hintId` from `id` when `hint` is present, wired it via `aria-describedby` on both the `<input>` and `<textarea>` branches, and set `id={hintId}` on the `<small>` hint element — applied exactly as the review's fix snippet, matching current code state 1:1.

### WR-03: `Card` hardcodes a surface color that isn't a design token

**Files modified:** `src/index.css`, `src/components/ui/Card.tsx`
**Commit:** ff7ab96
**Applied fix:** Added `--color-card: #fffaf1;` to the `@theme` block in `src/index.css` (alongside `--color-cream`) and replaced `bg-[#fffaf1]` with `bg-card` in `Card.tsx`, per the review's suggested fix.

### WR-04: No fallback/404 route

**Files modified:** `src/App.tsx`, `src/routes/NotFound.tsx` (new)
**Commit:** b297cc9
**Applied fix:** Created `src/routes/NotFound.tsx` (a `Shell`-wrapped 404 page consistent with the existing `Home.tsx`/`Admin.tsx` style — pt-BR copy, no data/auth) and added `<Route path="*" element={<NotFound />} />` as the last route in `App.tsx`, matching the review's suggested `Routes` structure.

### WR-05: Fonts are loaded via hand-authored relative paths into `node_modules`

**Files modified:** `src/index.css`
**Commit:** adeb5b7
**Applied fix:** Investigated the review's suggested direction ("prefer importing the package's own generated CSS") and found a clean first-party path: both `@fontsource-variable/alegreya` and `@fontsource-variable/gabarito` ship a `wght.css` (variable-weight-only, no italic) that Vite resolves natively via bare-specifier `@import`. Replaced the four hand-authored `@font-face` blocks (which referenced `../node_modules/.../files/*.woff2` directly) with `@import "@fontsource-variable/alegreya/wght.css";` and `@import "@fontsource-variable/gabarito/wght.css";`. This removes the coupling to `files/`'s internal layout entirely — future version bumps only need re-verification if the package's own exported `wght.css` path changes, which is a much smaller and more stable surface. Verified with `npx vite build`: all font subset assets resolved and emitted correctly (now includes a few additional subsets — cyrillic/greek/vietnamese — beyond the previously hand-picked latin/latin-ext, but each is only downloaded by the browser if its `unicode-range` is actually used, so there is no real cost). This was not treated as a "deliberate skip" per the task notes' fallback guidance, since a clean, verified fix was available and applied.

## Skipped Issues

None — all 5 in-scope findings (WR-01 through WR-05) were fixed.

---

_Fixed: 2026-07-23T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
