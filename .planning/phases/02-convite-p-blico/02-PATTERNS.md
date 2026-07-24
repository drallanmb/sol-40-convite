# Phase 2: Convite Público - Pattern Map

**Mapped:** 2026-07-23
**Files analyzed:** 15 (creates + modifies)
**Analogs found:** 6 real-codebase / 5 old-project-only / 4 no-analog (greenfield infra)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|-----------------|---------------|
| `src/content/event.ts` | model (static content module) | transform (literal data) | *none in this repo* — `src/index.css` `@theme` tokens are the closest "single source of typed constants" precedent; old project's `lib/event.ts` is the real content precedent | role-match (cross-project) |
| `src/lib/countdown.ts` | utility (pure fn) | transform | *none in this repo* — old project's `useCountdown` inline logic (`EventSite.tsx` lines 119-134) is the only precedent, but it's a hook, not extracted pure fn | no analog (greenfield pattern) |
| `src/hooks/useCountdown.ts` | hook | event-driven (interval) | old project `EventSite.tsx` lines 119-134 (`function useCountdown()`) | exact (cross-project only) |
| `src/components/layout/Shell.tsx` (extended) | layout/component | request-response (render) | itself — extend in place | exact (same file) |
| `src/routes/Home.tsx` (replaced) | route/page composition | request-response (render) | itself — same file, current content is Phase 1 scaffold to be replaced | exact (same file, full rewrite) |
| `src/components/invite/Hero.tsx` | component | request-response (render) | `src/routes/Home.tsx` (page-level section composition pattern) + old project hero markup (`EventSite.tsx` ~398-415) | role-match |
| `src/components/invite/PalmSvg.tsx` | component (inline SVG) | transform (render-only) | *none* — no SVG component exists in this repo yet | no analog (greenfield) |
| `src/components/invite/SeaWaves.tsx` | component (inline SVG + CSS animation) | transform (render-only) | *none* — no SVG/animation component exists in this repo yet | no analog (greenfield) |
| `src/components/invite/Countdown.tsx` | component | event-driven (consumes `useCountdown`) | old project countdown markup (`EventSite.tsx` ~398-415) | role-match (cross-project only) |
| `src/components/invite/CountdownRail.tsx` | component | event-driven (consumes `useCountdown`, scroll-gated) | old project `.countdown-rail` markup + `headerCondensed` state (`EventSite.tsx` lines 193-194, ~243-249) | role-match (cross-project only) |
| `src/components/invite/ProgramaSection.tsx` | component | CRUD (read-only list render) | `src/routes/Home.tsx` swatch-grid `.map()` pattern (lines 41-50) | role-match |
| `src/components/invite/DressCodeSection.tsx` | component | CRUD (read-only list/gallery render) | `src/components/ui/Card.tsx` (surface) + `src/routes/Home.tsx` card-grid layout (lines 61-74) | role-match |
| `src/components/invite/LocalSection.tsx` | component | event-driven (click-to-load iframe, local `useState`) | `src/routes/Home.tsx` `showToast` `useState` toggle pattern (lines 27, 78-84) | role-match (state-toggle shape only; new: reserved-height + iframe) |
| `src/components/invite/GuideSection.tsx` | component | CRUD (read-only list render, external links) | `src/routes/Home.tsx` swatch-grid `.map()` pattern (lines 41-50) | role-match |
| `index.html` (modified) | config | request-response (static meta) | itself — extend in place | exact (same file) |
| `src/lib/countdown.test.ts` | test | transform (pure-fn assertions) | *none* — no test file/framework exists in this repo yet | no analog (greenfield, Wave 0 infra) |
| `vitest.config.ts` / `test` block | config | — | *none* — no test config exists yet | no analog (greenfield, Wave 0 infra) |

## Pattern Assignments

### `src/content/event.ts` (model, static data)

**Analog:** none in this repo (first content module). Structural precedent: `src/index.css` `@theme` block shows the project's convention of centralizing constants in one typed/tokenized place rather than scattering literals across components. Canonical **data source** is the old project.

**Data to port verbatim (source of truth for values, not code style):**
- `/Users/allanmesquitabrito/Documents/Site Sol 40 anos/sol-40-integrado/lib/event.ts` — `EVENT_DATE`/`EVENT_END` constants and offset-qualified string format.
- `/Users/allanmesquitabrito/Documents/Site Sol 40 anos/sol-40-integrado/app/convite/EventSite.tsx` lines 398-415 (hero copy), ~473-476 (7 programa blocks), ~478-493 (dress code + gallery captions), ~495-503 (mapa + guia + hotéis), line 389 (topbar menu items), line 504 (footer) — see `02-CONTEXT.md` `<canonical_refs>` for the authoritative line map; copy is finalized in `02-UI-SPEC.md` § Copywriting Contract, which supersedes the old file wherever they differ (e.g. corrected "Matapuã" spelling, new "Ver mapa" CTA, hero CTA text).

**Shape convention to follow (this repo, not the old one):** TypeScript literal exports, no runtime validation library (no zod) — matches this repo's lightweight-dependency posture (Package Legitimacy Audit in RESEARCH.md: no new runtime deps this phase). Export typed `const` arrays/objects, e.g.:
```typescript
export const EVENT_DATE = "2026-10-17T16:00:00-03:00";
export const EVENT_END = "2026-10-18T05:00:00-03:00";
export const EVENT_DAY_START = "2026-10-17T00:00:00-03:00";

export type ProgramaItem = { time: string; title: string; description: string };
export const PROGRAMA: ProgramaItem[] = [ /* 7 blocks, D-02 */ ];
```

---

### `src/lib/countdown.ts` (utility, pure fn)

**Analog:** No pure-function equivalent exists in this repo (greenfield — first file in a `src/lib/` directory, which does not yet exist). RESEARCH.md's Pattern 1 (Architecture Patterns section) is the concrete spec to implement — already fully worked out with real code:

```typescript
// RESEARCH.md Pattern 1 — copy this shape directly
export function getEventState(now: Date): { phase: EventPhase; parts: Parts } {
  const dayStart = new Date(EVENT_DAY_START).getTime();
  const start = new Date(EVENT_DATE).getTime();
  const end = new Date(EVENT_END).getTime();
  const t = now.getTime();

  if (t < dayStart) return { phase: "antes", parts: toParts(dayStart - t) };
  if (t < start) return { phase: "hoje", parts: toParts(0) };
  if (t <= end) return { phase: "agora", parts: toParts(0) };
  return { phase: "depois", parts: toParts(t - end) }; // grows without ceiling (D-10)
}
```
Plus `pluralizeUnit(count, unit)` — see RESEARCH.md § Code Examples "pt-BR pluralization helper."

**Critical constraint (from RESEARCH.md Anti-Patterns + Pitfall 1):** `now` must always be an injected parameter, never `Date.now()` called internally — this is what makes the function unit-testable without mocking global time.

---

### `src/hooks/useCountdown.ts` (hook, event-driven)

**Analog:** `EventSite.tsx` lines 119-134 (old project — exact shape to port, already cleans up its interval):

```typescript
// old project: sol-40-integrado/app/convite/EventSite.tsx lines 119-134
function useCountdown() {
  const [remaining, setRemaining] = useState<CountdownRemaining>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  useEffect(() => {
    // ... compute + setRemaining
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);
  return remaining;
}
```

**This repo's target shape** (RESEARCH.md Pattern 2, already adapted to call the new pure `getEventState`):
```typescript
import { useEffect, useState } from "react";
import { getEventState, type EventPhase, type Parts } from "../lib/countdown";

export function useCountdown() {
  const [state, setState] = useState(() => getEventState(new Date()));
  useEffect(() => {
    const update = () => setState(getEventState(new Date()));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);
  return state as { phase: EventPhase; parts: Parts };
}
```

**Pitfall to carry forward (RESEARCH.md Pitfall 2):** always return the cleanup from the same `useEffect` that calls `setInterval` — StrictMode double-invokes effects in dev; a missing cleanup doubles the tick rate.

---

### `src/components/layout/Shell.tsx` (extended in place)

**Analog:** itself, current state (this repo, full file read):

```tsx
// src/components/layout/Shell.tsx (current, Phase 1)
export function Shell({ children, nav }: ShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-cream text-ink">
      <header className="sticky top-0 z-(--z-sticky) border-b border-line bg-cream/90 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-4 px-4 sm:px-8">
          <span className="font-serif text-lead tracking-display">Sol faz 40</span>
          {nav ? (
            <nav className="flex items-center gap-4 text-small uppercase tracking-label sm:gap-6">{nav}</nav>
          ) : null}
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="grid place-content-center gap-2 bg-plum px-4 py-16 text-center text-cream sm:py-24">
        <h2 className="font-serif text-heading leading-[0.9] tracking-display">
          Sol <em className="not-italic text-coral">faz 40</em>
        </h2>
        <p className="text-caption font-bold uppercase tracking-label opacity-80">
          17 de outubro de 2026 · Matapuã Eventos · Aracaju/SE
        </p>
      </footer>
    </div>
  )
}
```

**What to add (this phase):**
- Scroll-state (`headerScrolled`/`headerCondensed`) — old project shape at `EventSite.tsx` lines 193-194 (`useState`) + effect around lines 243-249 (`scrollY` read). Port the *threshold logic*, not the JSX.
- Hamburger menu state (`menuOpen`, `EventSite.tsx` line 195) for mobile nav — UI-SPEC E9.
- `CountdownRail` slot, shown when `headerCondensed` is true, per D-11 and UI-SPEC Hero & Motion Spec's "Countdown rail" paragraph.
- Footer content is **already correct** (D-04 grafia matches) — do not regress; no changes needed to the footer JSX itself, only to the `<header>` and the overall component (state + rail slot).

**Existing token/utility conventions to keep using:** `z-(--z-sticky)` parenthesis syntax (not `z-sticky` as a bare utility — Phase 1's documented Tailwind v4 gotcha, RESEARCH.md Anti-Patterns confirms this).

---

### `src/routes/Home.tsx` (replaced)

**Analog:** itself, current scaffold state (this repo, full file read above). Current file demonstrates the established **page composition shape** to keep: `Shell` wrapping a `<section>` with `mx-auto max-w-6xl px-4 py-… sm:px-8 sm:py-…`, using `Button`/`Card`/`Field`/`Toast` primitives, `useState` for interactive toggles.

```tsx
// src/routes/Home.tsx (current, Phase 1 scaffold) — composition shape to keep, content to replace
function Home() {
  const [showToast, setShowToast] = useState(false)
  return (
    <Shell>
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-8 sm:py-16">
        {/* ... */}
      </section>
      {showToast ? <Toast>...</Toast> : null}
    </Shell>
  )
}
```

**This phase:** the body becomes a composition of the new `src/components/invite/*` section components in D-05 order (hero → countdown → local/Aracaju → programa → dress code), passed as `Shell`'s `nav` prop for the topbar links (per UI-SPEC E9, 3 links: Local/Programação/Traje).

---

### `src/components/invite/Hero.tsx` (component)

**Analog:** No hero component exists in this repo. Composition precedent is `src/routes/Home.tsx`'s section-with-heading shape (`font-serif text-heading`, `<em className="not-italic text-coral">` for word emphasis — already used identically in both `Home.tsx` line 34-35 and `Shell.tsx` footer line 30, confirming this is the project's established emphasis idiom):

```tsx
// established emphasis idiom, repeated verbatim in Home.tsx and Shell.tsx:
<h1 className="... font-serif text-heading ...">
  Sol <em className="not-italic text-coral">faz 40</em>
</h1>
```

**Art/copy source:** old project `EventSite.tsx` ~398-415 for structure; exact gradients/CTA copy are locked in `02-UI-SPEC.md` § Hero & Motion Spec (sky/sun/horizon gradient values, 1:1 with `globals.css` lines 187-191) and § Copywriting Contract (hero eyebrow/title/tagline/meta, CTA = "Ver programação ↓" this phase, NOT "Confirmar presença"). Treat the UI-SPEC as settled — do not re-derive.

---

### `src/components/invite/PalmSvg.tsx` (component, inline SVG)

**Analog:** No analog — no SVG-drawing component exists in this repo yet. Full implementation spec is in RESEARCH.md § Code Examples "Palm SVG shape," which already gives the exact viewBox, positioning classes (ported footprint from old CSS `.palm`/`.palm-left`/`.palm-right`), and drawing approach (trunk path + 6 frond `<g>` groups with midrib strokes, per D-07):

```tsx
function PalmSvg({ side }: { side: "left" | "right" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 360 600"
      className={`pointer-events-none absolute bottom-[-130px] z-[2] h-[600px] w-[360px] drop-shadow-[0_12px_30px_rgba(18,15,22,0.2)] ${
        side === "left" ? "left-[-82px]" : "right-[-82px] scale-x-[-1]"
      }`}
    >
      <path d="M132 590 Q118 340 150 78" stroke="#291c25" strokeWidth="24" fill="none" strokeLinecap="round" />
      {/* fronds: 6 <g> groups, each <path fill="#291c25"> + midrib stroke */}
    </svg>
  );
}
```

---

### `src/components/invite/SeaWaves.tsx` (component, inline SVG + CSS animation)

**Analog:** No analog — no animated SVG component exists in this repo yet. Full spec is in RESEARCH.md § Code Examples "`prefers-reduced-motion` gate for the sea/wave animation" and `02-UI-SPEC.md` § Hero & Motion Spec "Mar" bullet (2-3 stacked `<path>` bands, staggered `translateX` keyframes at 22s/30s/38s, golden-light shimmer layer at 3.5s):

```css
.wave-band { animation: wave-scroll 22s linear infinite; }
.wave-band--mid { animation-duration: 30s; }
.wave-band--back { animation-duration: 38s; }
.golden-light { animation: light-shimmer 3.5s ease-in-out infinite; }
@keyframes wave-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@keyframes light-shimmer { 0%, 100% { opacity: 0.85; } 50% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .wave-band, .golden-light { animation: none; }
}
```
**Hard requirement (D-08):** `prefers-reduced-motion: reduce` must set `animation: none` while keeping the art visible as static (last-frame equivalent) — not hide it.

---

### `src/components/invite/Countdown.tsx` + `CountdownRail.tsx` (components, event-driven)

**Analog:** old project `EventSite.tsx` countdown JSX (~398-415, full tiles) and `.countdown-rail`/`.countdown-compact` CSS (`globals.css` lines ~169-186) for the compact variant. Both consume the new `useCountdown()` hook (not the old project's inline state) and render 4 states per D-10, with copy per UI-SPEC § Copywriting Contract rows "Countdown kicker/heading" through "Countdown rail (topbar, compact)."

**Reusable primitive for tile styling:** `src/components/ui/Card.tsx` surface convention (`border border-line`, offset shadow) is available if tiles need a card-like frame, though UI-SPEC does not mandate `Card` specifically for tiles — planner's discretion.

**Critical implementation detail (RESEARCH.md Pitfall 3 + 4, UI-SPEC backstops E2/E3):**
- Use `pluralizeUnit(count, unit)` from `src/lib/countdown.ts` in both `Countdown.tsx` and `CountdownRail.tsx` — do not duplicate the singular/plural logic.
- Day tile needs `tabular-nums` + `min-width` sized for 4 digits (the "depois" state counts up with no ceiling, D-10).

---

### `src/components/invite/ProgramaSection.tsx` (component, CRUD read-only list)

**Analog:** `src/routes/Home.tsx` lines 41-50 — the swatch-grid `.map()` pattern is this repo's only existing precedent for rendering a static array into a grid of items:

```tsx
// src/routes/Home.tsx lines 41-50 — list-render pattern to follow
<div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
  {swatches.map((swatch) => (
    <div key={swatch.name} className="...">
      {swatch.name}
    </div>
  ))}
</div>
```

**Data source:** `PROGRAMA` array from `src/content/event.ts` (7 items, D-02, exact copy in UI-SPEC § Copywriting Contract "Programa items"). Section heading pattern: kicker (`text-caption font-bold uppercase tracking-label`, established in `Home.tsx` line 32) + `h2` (`font-serif text-heading`).

---

### `src/components/invite/DressCodeSection.tsx` (component, CRUD + media)

**Analog:** `src/components/ui/Card.tsx` for any card-like grouping (Homens/Mulheres blocks, grass-note callout) + `src/routes/Home.tsx` lines 61-74 (2-column card grid layout, `grid gap-6 sm:grid-cols-2`):

```tsx
// src/routes/Home.tsx lines 61-74 — 2-col card grid to follow for gallery/rules layout
<div className="mt-4 grid gap-6 sm:grid-cols-2">
  <Card>...</Card>
  <Card>...</Card>
</div>
```

**Image handling (RESEARCH.md Pitfall 7):** `<img loading="lazy" decoding="async">` with explicit `width`/`height` or `aspect-ratio` reserved (no analog in this repo — first `<img>` tag in the codebase; assets `dress-code-men.jpg`/`dress-code-women.jpg` are already present in `public/`, confirmed via filesystem check, but need re-compression per Pitfall 7 before use).

---

### `src/components/invite/LocalSection.tsx` (component, click-to-load)

**Analog (state-toggle shape only):** `src/routes/Home.tsx` lines 27, 78-84 — `useState` boolean gating conditional render is this repo's only existing precedent for a click-to-reveal interaction:

```tsx
// src/routes/Home.tsx lines 27, 78-84 — click-to-reveal shape to follow
const [showToast, setShowToast] = useState(false)
// ...
<Button variant="quiet" onClick={() => setShowToast(true)}>Disparar toast</Button>
// ...
{showToast ? <Toast>Presença confirmada! Obrigado ✨</Toast> : null}
```

**Full click-to-load-iframe spec (new pattern, no analog):** RESEARCH.md Pattern 3 gives the complete reserved-height container + click-to-mount iframe implementation (D-12):

```tsx
function LocalMap() {
  const [showMap, setShowMap] = useState(false);
  return (
    <div className="relative h-[610px] md:h-[610px] sm:h-[540px]">
      {showMap ? (
        <iframe
          title="Mapa do Matapuã Eventos em Aracaju"
          src="https://www.google.com/maps?q=Matapu%C3%A3%20Eventos%20Aracaju&output=embed"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="h-full w-full border-0"
        />
      ) : (
        <button type="button" onClick={() => setShowMap(true)} className="…">Ver mapa</button>
      )}
    </div>
  );
}
```
**Security requirement (RESEARCH.md Security Domain):** the "Abrir rota ↗" link must use `target="_blank" rel="noreferrer"` (reverse-tabnabbing mitigation) — carried forward from the old project's pattern, applies to every external link in this phase (also `GuideSection.tsx`, hotel links).

---

### `src/components/invite/GuideSection.tsx` (component, CRUD + external links)

**Analog:** same swatch-grid `.map()` pattern as `ProgramaSection.tsx` (`src/routes/Home.tsx` lines 41-50), extended with anchor tags per card.

**Data source:** `GUIDE` array from `src/content/event.ts` (3 or 4 cards, D-13, open question flagged in RESEARCH.md — planner decides count) + `HOTELS` array (3 items, D-14, real URLs already confirmed in UI-SPEC § Copywriting Contract "Hotel list" row — do not invent URLs).

**Grid-border pitfall (RESEARCH.md Pitfall 6):** if 4 cards ship, do not reuse the old `:last-child { border-right: 0 }` CSS rule verbatim — use `nth-child(3n)` or Tailwind `divide-x`/`divide-y` utilities that work for both 3 and 4 item counts.

---

## Shared Patterns

### External link security (reverse-tabnabbing)
**Source:** old project convention (`<a target="_blank" rel="noreferrer">`), reaffirmed in RESEARCH.md § Security Domain, table row "Reverse tabnabbing."
**Apply to:** every external anchor added this phase — `LocalSection.tsx` "Abrir rota ↗", `GuideSection.tsx` Tripadvisor links, `GuideSection.tsx` hotel links.
```tsx
<a href="https://…" target="_blank" rel="noreferrer">Abrir rota ↗</a>
```

### Section heading kicker + h2 idiom
**Source:** `src/routes/Home.tsx` line 32-35 (kicker `text-caption font-bold uppercase tracking-label text-wine` + `h1`/`h2` `font-serif text-heading` with `<em className="not-italic text-coral">` emphasis), also present identically in `Shell.tsx` footer (line 29-30).
**Apply to:** every `invite/*Section.tsx` component — all use the kicker/H2 pattern per UI-SPEC's per-element copy table (each row pairs a "kicker" with an "H2").

### Tailwind v4 parenthesis syntax for `--duration-*`/`--z-*`
**Source:** `src/components/ui/Button.tsx` line 10 (`duration-(--duration-fast)`), `src/components/layout/Shell.tsx` line 17 (`z-(--z-sticky)`) — both already use the correct syntax in this repo.
**Apply to:** any new component using duration/z-index tokens (`CountdownRail.tsx` reveal transition, `Shell.tsx` scroll-state transitions, palm/wave `z-[2]` values which are fine as arbitrary values since they're not theme tokens).
```tsx
// correct (from Button.tsx):
"transition-[transform,...] duration-(--duration-fast) ease-out"
// correct (from Shell.tsx):
"sticky top-0 z-(--z-sticky)"
```

### 44px minimum touch target
**Source:** `src/components/ui/Button.tsx` line 10 (`min-h-[44px]` baked into `baseClasses`).
**Apply to:** every new tappable element per UI-SPEC's Spacing Scale note — "Ver mapa" button, guide/hotel card links, hamburger toggle, nav links. Reuse `Button` component where the element is a real CTA; apply `min-h-[44px]` manually to plain `<a>` tags that aren't `Button` instances.

### Card surface
**Source:** `src/components/ui/Card.tsx` — `border border-line bg-card p-6 shadow-[14px_14px_0_var(--color-sand)] sm:p-8`.
**Apply to:** guide cards, hotel list items, local/map card, dress-code rule blocks — anywhere UI-SPEC calls for a cream card-like surface. Confirm against UI-SPEC's actual visual spec per element before assuming `Card` applies as-is (some sections, e.g. the map-card overlay on `plum`, use the dark/plum surface instead — see UI-SPEC § Color "Secondary (30%)" row, "map-card overlay" usage).

## No Analog Found

Files with no close match anywhere (planner should use RESEARCH.md/UI-SPEC patterns directly, not a codebase analog):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/lib/countdown.ts` | utility | transform | First file in a `src/lib/` directory (doesn't exist yet). Full implementation already specified in RESEARCH.md Pattern 1 — use that directly. |
| `src/components/invite/PalmSvg.tsx` | component | transform (render-only) | No SVG-drawing component exists in this repo. Full spec in RESEARCH.md § Code Examples. |
| `src/components/invite/SeaWaves.tsx` | component | transform (render-only, animated) | No animated-SVG/CSS-keyframe component exists in this repo. Full spec in RESEARCH.md § Code Examples + UI-SPEC § Hero & Motion Spec. |
| `src/lib/countdown.test.ts` + `vitest.config.ts` | test / config | — | No test framework installed in this repo yet (Wave 0 gap per RESEARCH.md § Validation Architecture). Nothing to pattern-match against; follow standard `vitest` setup (Node environment, no jsdom needed — pure functions only). |

## Metadata

**Analog search scope:** `src/` (this repo, all 12 existing files read directly), `sol-40-integrado/app/convite/EventSite.tsx`, `sol-40-integrado/app/globals.css`, `sol-40-integrado/lib/event.ts` (old project canonical source, per CONTEXT.md `<canonical_refs>`)
**Files scanned:** 12 (this repo, exhaustive — small codebase, Phase 1 only) + 3 (old project, targeted per CONTEXT.md line references)
**Pattern extraction date:** 2026-07-23
