---
phase: 01-funda-o-design-system-deploy
reviewed: 2026-07-23T00:00:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - convex/schema.ts
  - convex/tsconfig.json
  - src/App.tsx
  - src/components/layout/Shell.tsx
  - src/components/ui/Button.tsx
  - src/components/ui/Card.tsx
  - src/components/ui/Field.tsx
  - src/components/ui/Toast.tsx
  - src/index.css
  - src/main.tsx
  - src/routes/Admin.tsx
  - src/routes/Home.tsx
findings:
  critical: 0
  warning: 5
  info: 3
  total: 8
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-07-23T00:00:00Z
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

This phase scaffolds the Vite/React/TS/Tailwind v4/Convex/React Router stack and stands up the "pôr do sol" design system (tokens + UI primitives + shell). No user input is processed and no data flows to Convex yet, so the security surface is minimal — no injection, XSS, or secret-handling issues were found. The primitives (`Button`, `Card`, `Field`, `Toast`) are reasonably built and mobile-first, but there are real gaps: an unguarded required env var that will hard-crash the app with no error boundary, a missing `aria-describedby` wiring between `Field`'s hint text and its control, a hardcoded surface color that bypasses the very token system this phase exists to establish, and a router with no fallback route. None of these are exploitable security issues, but several are genuine correctness/robustness defects that should be fixed before building on top of this foundation.

## Warnings

### WR-01: `VITE_CONVEX_URL` is read unvalidated and the app has no error boundary

**File:** `src/main.tsx:15`
**Issue:** `new ConvexReactClient(import.meta.env.VITE_CONVEX_URL)` passes the env var straight through with no presence/format check. `ImportMetaEnv` has an index signature, so TypeScript will not catch a missing var at compile time (it types the expression as `any`), and there is no `vite-env.d.ts` in `src/` declaring `VITE_CONVEX_URL: string` for compile-time safety either. At runtime, if the var is unset (e.g. a misconfigured preview/deploy environment), `ConvexReactClient`'s constructor throws (`"No address provided to ConvexReactClient..."`) synchronously during module evaluation of `main.tsx`, before React ever mounts — and there is no error boundary anywhere in the tree (`App.tsx` has none, `main.tsx` has none) to catch it. The result is a fully blank page with nothing rendered, and the only diagnostic is a console stack trace end users will never see.
**Fix:**
```ts
// src/main.tsx
const convexUrl = import.meta.env.VITE_CONVEX_URL
if (!convexUrl) {
  throw new Error(
    'VITE_CONVEX_URL não definida — configure o .env (ver .env.example) antes de rodar/deployar.',
  )
}
const convex = new ConvexReactClient(convexUrl)
```
Also add `src/vite-env.d.ts` with an `ImportMetaEnv` augmentation for `VITE_CONVEX_URL: string` so misuse is caught at compile time, and consider a minimal top-level `ErrorBoundary` so a startup failure renders a message instead of a blank page.

### WR-02: `Field`'s hint text is not programmatically associated with the control

**File:** `src/components/ui/Field.tsx:31-49`
**Issue:** The `hint` (`<small>`) is rendered as a visual sibling of the `<input>`/`<textarea>`, but nothing wires it to the control via `aria-describedby`. Screen reader users navigating by form field (not linear document order) will hear the label but not the hint (e.g., "Como você quer aparecer no convite" on the nome field), which is exactly the kind of contextual guidance hints exist to convey. Given this is the base primitive every form field in the RSVP flow (a core user-facing feature) will be built on, the gap will propagate everywhere `hint` is used.
**Fix:**
```tsx
export function Field(props: FieldProps) {
  const { label, hint, id, multiline, className = '', ...rest } = props
  const hintId = hint ? `${id}-hint` : undefined

  return (
    <div className="mb-[22px] grid gap-[9px]">
      <label htmlFor={id} className="text-small font-bold uppercase tracking-label">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          aria-describedby={hintId}
          className={`${controlClasses} min-h-[110px] resize-y leading-normal ${className}`.trim()}
          {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          id={id}
          aria-describedby={hintId}
          className={`${controlClasses} ${className}`.trim()}
          {...(rest as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
      {hint ? (
        <small id={hintId} className="text-caption normal-case tracking-normal opacity-70">
          {hint}
        </small>
      ) : null}
    </div>
  )
}
```

### WR-03: `Card` hardcodes a surface color that isn't a design token

**File:** `src/components/ui/Card.tsx:15`
**Issue:** `bg-[#fffaf1]` is a raw hex literal, distinct from `--color-cream` (`#fff3df`) defined in `@theme` (`src/index.css:50`). This phase's stated purpose is establishing the token system as the single source of truth (per the file header comments in `Shell.tsx`/`Button.tsx` referencing "tokens do `@theme`"), yet `Card` — one of the four core primitives — bypasses it with an untracked magic value. Any future component needing the same "card surface" color (wine cards, memory-mural cards per the comment) will either duplicate this literal or drift from it, and there's no single place to retheme it.
**Fix:** Add the surface color to `@theme` and reference it:
```css
/* src/index.css, inside @theme */
--color-card: #fffaf1;
```
```tsx
// src/components/ui/Card.tsx
className={`border border-line bg-card p-6 shadow-[14px_14px_0_var(--color-sand)] sm:p-8 ${className}`.trim()}
```

### WR-04: No fallback/404 route

**File:** `src/App.tsx:6-11`
**Issue:** `<Routes>` only declares `/` and `/admin`. Any other path (typos, stale links, crawlers) renders nothing inside `<main>` — no 404 page, no redirect. This is a router-completeness gap that's easy to close now and easy to forget once more routes are added in later phases.
**Fix:**
```tsx
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/admin" element={<Admin />} />
  <Route path="*" element={<NotFound />} />
</Routes>
```

### WR-05: Fonts are loaded via hand-authored relative paths into `node_modules`

**File:** `src/index.css:11,20,29,38`
**Issue:** Each `@font-face` `src` points at `../node_modules/@fontsource-variable/<pkg>/files/<file>.woff2` directly. This couples the stylesheet to the internal file layout of `@fontsource-variable/*`, which is not a stable public API — a minor/patch bump of either package that renames or restructures its `files/` directory (both are pinned to exact `5.3.0` in `package.json`, so an upgrade will eventually happen) silently breaks font loading with no compile-time signal, only a visual regression (fallback fonts rendering with no error). Fontsource packages ship ready-to-import CSS (e.g. `@fontsource-variable/alegreya/index.css` or per-weight files) specifically so consumers don't have to hand-roll `@font-face`/`unicode-range` blocks against internal paths.
**Fix:** Prefer importing the package's own generated CSS and layer the project's `font-display`/subsetting needs on top, or at minimum pin this dependency more defensively and add a comment noting the coupling requires re-verification on every `@fontsource-variable/*` version bump.

## Info

### IN-01: Toast preview in `Home.tsx` has no dismissal path

**File:** `src/routes/Home.tsx:27,78-84`
**Issue:** `showToast` is only ever set to `true`; once triggered there is no timeout, close button, or click-outside handler to set it back to `false`, so the toast stays on screen permanently after the first click. This is scoped to the Phase 1 design-system preview scaffold (explicitly documented as non-final in the file's own comment), so it's low-impact, but worth fixing before this page is reused as a reference/QA tool.
**Fix:** Add a `setTimeout(() => setShowToast(false), 4000)` on trigger, or a close affordance on `Toast` itself.

### IN-02: `convex/tsconfig.json` includes browser-only `vite/client` types for backend code

**File:** `convex/tsconfig.json:12`
**Issue:** `"types": ["vite/client"]` pulls in `ImportMetaEnv`/`import.meta.env` typings intended for browser/Vite-bundled code, but `convex/` functions run in Convex's isolated backend runtime, not the browser — `import.meta.env.VITE_*` vars are not available there. This is likely inherited scaffold boilerplate; it's harmless today (schema.ts doesn't use `import.meta`) but could mislead a future contributor into thinking `VITE_CONVEX_URL`-style client env vars are readable from a Convex function.
**Fix:** Consider trimming `"types"` to what backend functions actually need (e.g. omit `vite/client`, or use `"types": ["node"]` if Node-only globals are needed), unless this was deliberately kept to match the official Convex+Vite template.

### IN-03: Magic pixel values instead of the `--space-*` scale

**File:** `src/components/ui/Card.tsx:15`, `src/components/ui/Toast.tsx:17`, `src/components/ui/Field.tsx:31,38`
**Issue:** Several primitives use one-off pixel literals (`shadow-[14px_14px_0_...]`, `bottom-[max(26px,...)]`, `mb-[22px]`, `min-h-[110px]`) even though `@theme` defines a `--space-2xs..xl` scale (`src/index.css:86-91`). None of the existing space tokens happen to match these exact values, so this isn't strictly a defect, but it does mean the space scale isn't actually being used anywhere yet, undercutting its purpose as a shared source of truth.
**Fix:** Either extend the `--space-*` scale to cover these values (if they're meant to be reused) or leave as intentional one-offs with a short comment explaining why they fall outside the scale.

---

_Reviewed: 2026-07-23T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
