# Phase 10: Abertura cinematográfica do pôr do sol - Pattern Map

**Mapped:** 2026-07-26
**Files analyzed:** 6 likely new/modified files
**Analogs found:** 6 / 6 (one partial: the codebase has no existing WAAPI animation)

## Scope and Likely File Set

The smallest implementation consistent with `10-CONTEXT.md` and
`10-RESEARCH.md` modifies the existing route/component/style boundaries and
adds one browser acceptance file:

- Modify `src/routes/Home.tsx`.
- Modify `src/components/invite/Hero.tsx`.
- Modify `src/components/layout/Shell.tsx`.
- Modify `src/index.css`.
- Create `tests/cinematic-intro.spec.ts`.
- Modify `tests/release.spec.ts`.

`src/hooks/useReducedMotion.ts` and `src/components/invite/SeaWaves.tsx` are
supporting analogs, not expected edits. Do not create `useCinematicIntro.ts`
or `cinematicIntro.ts` by default: the research explicitly marks those
extractions optional, and the project already keeps route-specific
coordination in its owning component. If implementation makes the pure hash
eligibility or scroll-threshold policy nontrivial, extraction to
`src/lib/cinematicIntro.ts` plus a colocated test is acceptable, but it is not
needed to plan the minimum phase.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/routes/Home.tsx` | route / state coordinator | event-driven | `src/routes/Presentes.tsx` hash/effect coordination plus current `Home.tsx` composition | role-match |
| `src/components/invite/Hero.tsx` | component / animation endpoint | event-driven transform | current `src/components/invite/Hero.tsx` responsive art plus `src/components/layout/Shell.tsx` effect cleanup | partial |
| `src/components/layout/Shell.tsx` | layout component | event-driven request-response | current `src/components/layout/Shell.tsx` prop-driven chrome and scroll effect | exact |
| `src/index.css` | style config | transform / state-driven presentation | current hero motion, wave, token, and reduced-motion blocks in `src/index.css` | exact |
| `tests/cinematic-intro.spec.ts` | browser acceptance test | event-driven | `tests/release.spec.ts` | exact |
| `tests/release.spec.ts` | browser regression test | event-driven | current `tests/release.spec.ts` keyboard and reduced-motion cases | exact |

## Pattern Assignments

### `src/routes/Home.tsx` (route / state coordinator, event-driven)

**Analogs:** current `src/routes/Home.tsx` for composition and
`src/routes/Presentes.tsx` for URL-fragment lifecycle.

**Import and composition pattern** (`src/routes/Home.tsx`, lines 1-10 and
19-30):

```tsx
import Shell from '../components/layout/Shell'
import Hero from '../components/invite/Hero'
import Countdown from '../components/invite/Countdown'
// ...
import { NAV_LINKS, SECTION_IDS } from '../content/event'

function Home() {
  return (
    <Shell navLinks={NAV_LINKS} showCountdownRail wordmarkHref={`#${SECTION_IDS.hero}`}>
      <Hero />
      <Countdown />
      {/* remaining sections */}
    </Shell>
  )
}
```

Preserve the local relative-import convention and the existing section order.
Home is the appropriate owner for an intro phase because it already composes
both `Shell` and `Hero`; pass the same phase to both rather than creating
independent timers.

**Fragment lookup and symmetric listener cleanup pattern**
(`src/routes/Presentes.tsx`, lines 117-148):

```tsx
const applyCurrentHash = useCallback(() => {
  const productCode = productCodeFromWineHash(window.location.hash)
  if (!productCode) {
    setSelectedCode(null)
    return
  }

  const target = document.getElementById(wineDomId(productCode))
  if (!target) {
    setSelectedCode(null)
    return
  }

  setSelectedCode(productCode)
  target.scrollIntoView({
    block: 'center',
    behavior: reducedMotion ? 'auto' : 'smooth',
  })
  target.focus({ preventScroll: true })
}, [reducedMotion])

useEffect(() => {
  if (!catalogReady) return

  applyCurrentHash()
  window.addEventListener('hashchange', applyCurrentHash)
  window.addEventListener('popstate', applyCurrentHash)
  return () => {
    window.removeEventListener('hashchange', applyCurrentHash)
    window.removeEventListener('popstate', applyCurrentHash)
  }
}, [applyCurrentHash, catalogReady])
```

Copy the exact-ID lookup and cleanup shape, not the gift route's continuous
hash replay behavior. For phase 10, eligibility is captured on the Home mount:
empty hash and `#inicio` are eligible; other initial hashes skip the intro and
resolve their target after commit. A same-mount change to `#inicio` must not
reset the phase.

**Existing reactive reduced-motion pattern**
(`src/hooks/useReducedMotion.ts`, lines 47-72):

```ts
return {
  getSnapshot: () => getQuery()?.matches ?? false,
  getServerSnapshot: () => false,
  subscribe(onStoreChange: MotionChangeListener) {
    const mediaQuery = getQuery()
    if (!mediaQuery) return () => undefined

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', onStoreChange)
      return () =>
        mediaQuery.removeEventListener?.('change', onStoreChange)
    }

    mediaQuery.addListener?.(onStoreChange)
    return () => mediaQuery.removeListener?.(onStoreChange)
  },
}

export function useReducedMotion() {
  const store = useMemo(() => createReducedMotionStore(), [])
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  )
}
```

Reuse this hook unchanged. Initialize the Home phase synchronously from its
snapshot so reduced motion and ineligible hashes never commit hidden content.

**Applicable landmines:**

- Do not initialize as complete and hide in `useEffect`; that permits a
  first-paint flash.
- Do not key replay to every `location.key`, hash change, or scroll
  intersection.
- A persisted `pageshow` is a new entry even without a React remount; install
  and remove that listener symmetrically.
- Compare the hash to an exact allowlist and use `getElementById`; never
  interpolate an arbitrary hash into HTML or a selector.
- Keep the phase vocabulary small: `descending`, `revealing`, `complete`.

---

### `src/components/invite/Hero.tsx` (component / animation endpoint, event-driven transform)

**Analog:** the current Hero owns the canonical responsive sun and all reveal
groups. There is no exact WAAPI analog in the repository; use the lifecycle
shape from Shell and the concrete WAAPI design in `10-RESEARCH.md`.

**Canonical geometry and art pattern** (`src/components/invite/Hero.tsx`,
lines 20-54):

```tsx
<section
  id={SECTION_IDS.hero}
  tabIndex={-1}
  className="relative grid min-h-[860px] h-screen place-items-center overflow-hidden bg-peach text-cream"
>
  <div
    className="hero-sky-enter absolute inset-0"
    style={{
      backgroundImage:
        'radial-gradient(circle at 50% 61%, var(--color-sky-halo), transparent 21%), linear-gradient(180deg, var(--color-sky-dusk) 0%, var(--color-sky-apricot) 52%, var(--color-sky-coral) 100%)',
    }}
  >
    {/* texture */}
    <div
      className="hero-sun-enter absolute left-1/2 top-[62%] aspect-square w-[clamp(260px,28vw,480px)] rounded-full sm:top-[59%]"
      style={{
        background: 'var(--color-sun)',
        boxShadow: '0 0 100px var(--color-sun-halo)',
        transform: 'translate(-50%, -50%)',
      }}
    />
  </div>

  <SeaWaves />
```

Retain `top-[62%]`, `sm:top-[59%]`,
`w-[clamp(260px,28vw,480px)]`, `--color-sun`, and
`--color-sun-halo` as the single source of final geometry and appearance.
Split positioning and animation:

- The outer target wrapper keeps centering, responsive size, and breakpoint
  position.
- A full-size inner visual disc keeps background/halo and receives only the
  WAAPI `translate3d` animation.

This avoids transform composition with the wrapper's
`translate(-50%, -50%)` and means the only sun node finishes at its normal
style.

**Reveal-group boundary pattern** (`src/components/invite/Hero.tsx`, lines
54-94):

```tsx
<SeaWaves />

<div className="relative z-[3] mx-auto flex max-w-3xl flex-col items-center px-4 text-center text-plum sm:px-8">
  {/* eyebrow, heading, tagline */}
  <div className="hero-enter hero-enter--actions mt-11 flex w-full max-w-sm flex-col gap-4 sm:w-auto sm:max-w-none sm:flex-row sm:gap-6">
    <Link to={HERO.primaryCtaHref}>
      {HERO.primaryCtaLabel}
    </Link>
    <a href={HERO.secondaryCtaHref}>
      {HERO.secondaryCtaLabel}
    </a>
  </div>
</div>

<div className="hero-enter hero-enter--meta absolute inset-x-[clamp(22px,5vw,78px)] bottom-7 z-[4] flex justify-between">
  <span>{HERO.metaLeft}</span>
  <span>{HERO.metaRight}</span>
</div>
```

Group `SeaWaves`, copy/actions, and metadata behind the reveal state, but do
not include sky or sun. During `descending`, interactive copy is both hidden
and `inert`; remove `inert` as soon as `revealing` begins so CTAs are usable
during the opacity fade.

**Effect cleanup pattern** (`src/components/layout/Shell.tsx`, lines 85-120):

```tsx
useEffect(() => {
  let frame = 0

  const onScroll = () => {
    if (frame) return
    frame = window.requestAnimationFrame(readScrollState)
  }

  readScrollState()
  window.addEventListener('scroll', onScroll, { passive: true })
  return () => {
    window.removeEventListener('scroll', onScroll)
    if (frame) window.cancelAnimationFrame(frame)
  }
}, [])
```

The intro's `useLayoutEffect` must use the same paired setup/cleanup discipline
for RAF, passive scroll listener, `Animation.onfinish`, and `Animation.cancel`.
The application is rendered under `<StrictMode>` (`src/main.tsx`, lines
22-29), so cleanup must tolerate the development setup/cleanup/setup cycle.

**Applicable landmines:**

- Do not clone the sun or swap nodes at landing.
- Do not animate `top`, `left`, width, height, halo, or color; animate the
  inner disc transform only.
- Do not read target geometry during render. Read
  `getBoundingClientRect()` in a first RAF scheduled by `useLayoutEffect`.
- Scroll completion must first put the visual at the endpoint, then start the
  reveal; otherwise it can remain mid-air.
- Null the finish callback before cancellation during cleanup. If using
  `animation.finished`, catch its rejection on cancel.
- The old `.hero-sun-enter` writes `transform`; it cannot remain on the
  animated disc.

---

### `src/components/layout/Shell.tsx` (layout component, event-driven request-response)

**Analog:** current `Shell.tsx`.

**Prop-driven route variation pattern** (`src/components/layout/Shell.tsx`,
lines 7-15 and 37-45):

```tsx
export type ShellProps = {
  children: ReactNode
  navLinks?: NavLink[]
  showCountdownRail?: boolean
  wordmarkHref?: string
}

export function Shell({
  children,
  navLinks,
  showCountdownRail = false,
  wordmarkHref,
}: ShellProps) {
  // ...
  const hasNav = Boolean(navLinks && navLinks.length > 0)
```

Add optional intro/layout props with safe defaults so `/confirmar`,
`/presentes`, admin, and not-found compositions remain unchanged. Follow the
existing pattern of deriving classes/attributes from props rather than
querying route state inside Shell.

**Skip link, header, and main boundaries** (`src/components/layout/Shell.tsx`,
lines 130-142 and 253-260):

```tsx
<div className="flex min-h-screen flex-col bg-cream text-ink">
  <a
    href={`#${MAIN_ID}`}
    className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-(--z-skip) ..."
  >
    Pular para o conteúdo
  </a>

  <header
    className={`sticky top-0 z-(--z-sticky) border-b text-plum ...`}
  >
    {/* topbar, mobile nav, countdown rail */}
  </header>

  <main id={MAIN_ID} tabIndex={-1} className="flex-1 outline-none">
    {children}
  </main>
```

The skip link must stay before and outside the reveal/inert header. Apply the
intro visibility and `inert` only to the header chrome. Let Home's `<main>`
underlap the fixed 72px topbar height from the first commit so sky begins at
viewport Y=0 without changing header positioning at reveal.

**Existing input/focus guard pattern** (`src/components/layout/Shell.tsx`,
lines 53-79):

```tsx
useEffect(() => {
  if (!menuOpen) return

  const focusDelay = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 0
    : 280
  const focusTimer = window.setTimeout(() => {
    const firstLink = mobileNavRef.current?.querySelector<HTMLAnchorElement>('a')
    firstLink?.focus()
  }, focusDelay)

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return
    setMenuOpen(false)
    menuToggleRef.current?.focus()
  }

  document.addEventListener('keydown', onKeyDown)
  return () => {
    window.clearTimeout(focusTimer)
    document.removeEventListener('keydown', onKeyDown)
  }
}, [menuOpen])
```

Continue using native listeners and symmetric cleanup. Do not add another
reduced-motion media query for the intro; Home should pass the resolved phase.

**Applicable landmines:**

- Opacity alone does not remove topbar controls from the tab order; use
  `inert` while descending.
- Never put the skip link, `<main>`, or later sections inside an inert
  ancestor.
- Do not switch the header between normal-flow and fixed/absolute at reveal;
  that changes the measured sun target.
- Closing/reopening the existing mobile menu must remain independent from the
  intro state.

---

### `src/index.css` (style config, transform / state-driven presentation)

**Analog:** current `src/index.css`.

**Motion and z-index tokens** (`src/index.css`, lines 89-103):

```css
--duration-fast: 180ms;
--duration-medium: 260ms;
--ease-out: cubic-bezier(.22,1,.36,1);

--z-sticky: 80;
--z-status: 90;
--z-toast: 100;
--z-skip: 110;
```

Use `--duration-medium` for the 260ms reveal. Keep the skip link above the
sticky header. A phase-specific 2000ms descent and
`cubic-bezier(.65, 0, .35, 1)` can live in TypeScript animation timing rather
than becoming a general site token.

**Wave pattern** (`src/index.css`, lines 124-148):

```css
.wave-band {
  animation: wave-scroll 22s linear infinite;
}

.wave-band--mid {
  animation-duration: 30s;
}

.wave-band--back {
  animation-duration: 38s;
}

@keyframes wave-scroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
```

Keep waves mounted and running behind the reveal opacity so they are already
moving when they become visible.

**Old choreography that must be replaced** (`src/index.css`, lines 150-184):

```css
@media (prefers-reduced-motion: no-preference) {
  .hero-sky-enter {
    animation: hero-sky-warmth 900ms var(--ease-out) both;
  }

  .hero-sun-enter {
    animation: hero-sun-settle 900ms var(--ease-out) both;
  }

  .hero-enter {
    animation: hero-copy-settle 680ms var(--ease-out) both;
  }

  .hero-enter--eyebrow { animation-delay: 80ms; }
  .hero-enter--title { animation-delay: 140ms; }
  .hero-enter--tagline { animation-delay: 210ms; }
  .hero-enter--actions { animation-delay: 280ms; }
  .hero-enter--meta { animation-delay: 340ms; }
}
```

Remove the hero-specific use of this stagger (and unused keyframes if no other
selector references them). Replace it with phase selectors that:

- keep sky and sun visible in every phase;
- use `visibility: hidden; opacity: 0` on reveal groups only while
  descending;
- switch visibility on and opacity toward 1 at `revealing`;
- transition opacity for 260ms;
- leave the sun outside the fade.

**Reduced-motion pattern** (`src/index.css`, lines 478-487):

```css
@media (prefers-reduced-motion: reduce) {
  .wave-band,
  .wave-band--mid,
  .wave-band--back {
    animation: none;
  }

  .nav-link::after {
    transition: none;
  }
}
```

Extend this pattern so intro reveal transitions are also absent under reduce.
The React phase should already be `complete`; CSS is the defensive fallback.

**Applicable landmines:**

- Avoid `display: none` on the sun target; it must have measurable geometry.
- Avoid transitions on `visibility` that keep hidden elements unfocusable
  after the reveal starts.
- Do not attach the reveal opacity to an ancestor containing the sun.
- Preserve the global `:focus-visible` outline and existing AA color tokens.

---

### `tests/cinematic-intro.spec.ts` (browser acceptance test, event-driven)

**Analog:** `tests/release.spec.ts`.

**Imports and helper pattern** (`tests/release.spec.ts`, lines 1-3 and 22-40):

```ts
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

async function expectNoDocumentOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    document:
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }))
  expect(overflow.document).toBeLessThanOrEqual(1)
  expect(overflow.body).toBeLessThanOrEqual(1)
}
```

Use Playwright's direct `expect` style and small typed helpers. Keep phase
selectors (`data-intro-phase`, `data-testid="hero-sun-target"`, and
`data-testid="hero-sun-visual"`) as observable browser contracts rather than
testing React state.

**Pre-app instrumentation pattern** (`tests/release.spec.ts`, lines 43-58):

```ts
async function observeConvexTraffic(page: Page) {
  await page.addInitScript(() => {
    const OriginalWebSocket = window.WebSocket
    window.__releaseConvexTraffic = []
    // ...
    window.WebSocket = ObservedWebSocket
  })
}
```

Copy this `addInitScript` timing pattern to wrap
`Element.prototype.animate` before application code, pause only the animation
whose node has `data-testid="hero-sun-visual"`, and store its handle on a
declared Window test property. Finish it programmatically for deterministic
tests.

**Geometry and media patterns** (`tests/release.spec.ts`, lines 180-188 and
192-201):

```ts
const firstMobileLinkIsTopmost = await firstMobileLink.evaluate((element) => {
  const rect = element.getBoundingClientRect()
  const topElement = document.elementFromPoint(
    rect.left + Math.min(12, rect.width / 2),
    rect.top + rect.height / 2,
  )
  return topElement === element || element.contains(topElement)
})
expect(firstMobileLinkIsTopmost).toBe(true)

await page.emulateMedia({ reducedMotion: 'reduce' })
await page.goto('/')
await expect(page.locator('.wave-band').first()).toBeVisible()
await expect(page.locator('.wave-band').first()).toHaveCSS(
  'animation-name',
  'none',
)
```

Use `getBoundingClientRect()`/`boundingBox()` in CSS pixels with absolute
error at most 1px. Exercise 320px, an explicit tablet viewport, and desktop.
Use `emulateMedia` before navigation for reduced motion.

**Required coverage and landmines:**

- Pause at the first WAAPI frame and prove only sky is visible, the visual sun
  is fully above the viewport, and skip link remains first focus target.
- Finish and prove the same visual node aligns with the target rect within
  1px, then reveal groups become visible/interactable.
- Inspect timing: 2000ms, chosen easing, transform only; assert old hero
  animations are absent.
- Trigger actual scroll of at least 4px and prove it completes without
  resetting scroll position.
- Cover eligible replay after route remount, no replay on same-mount
  `#inicio`, direct-section fragment skip/scroll, reduced motion, and
  persisted `pageshow`.
- Do not use screenshots as the primary start-state oracle because Playwright
  can fast-forward finite animations for screenshots.
- Keep one natural-duration smoke; programmatically finish all other cases to
  avoid multiplying two-second waits.

---

### `tests/release.spec.ts` (browser regression test, event-driven)

**Analog:** current keyboard and reduced-motion tests in the same file.

**Keyboard ordering contract** (`tests/release.spec.ts`, lines 126-151):

```ts
await page.goto('/')
const desktopNavigation = page.getByRole('navigation', {
  name: 'Navegação principal',
})
if (await desktopNavigation.isVisible()) {
  // navigation assertion
}

const skipLink = page.getByRole('link', { name: 'Pular para o conteúdo' })
if (browserName === 'webkit') {
  await skipLink.focus()
} else {
  await page.keyboard.press('Tab')
}
await expect(skipLink).toBeFocused()
await page.keyboard.press('Enter')
await expect(page.locator('#conteudo')).toBeFocused()
```

Keep the skip-link assertion before intro completion: it proves the
first-frame accessibility requirement. Then deterministically finish the
intro or await `data-intro-phase="complete"` before locating/asserting desktop
or mobile navigation. Otherwise the intentional `inert` state can make the
current `isVisible()` branches silently skip navigation coverage.

**Reduced-motion regression contract** (`tests/release.spec.ts`, lines
192-207):

```ts
await page.emulateMedia({ reducedMotion: 'reduce' })
await page.goto('/')
await expect(page.locator('.wave-band').first()).toBeVisible()
await expect(page.locator('.wave-band').first()).toHaveCSS(
  'animation-name',
  'none',
)
```

Add an assertion that Home starts directly in `complete` and exposes no
active intro/reveal animation. Preserve the existing wave assertion and the
secondary-route checks.

## Shared Patterns

### Lifecycle cleanup

**Source:** `src/components/layout/Shell.tsx`, lines 53-79 and 85-120.

**Apply to:** Home entry/bfcache coordination and Hero WAAPI/scroll handling.

Every timeout, RAF, event listener, and animation callback installed by an
effect is removed by that effect's cleanup. Cleanup is idempotent and must not
set state after disposal because `src/main.tsx` uses React Strict Mode.

### Accessibility boundary

**Source:** `src/components/layout/Shell.tsx`, lines 130-142 and 258-260.

**Apply to:** Shell and Hero reveal groups.

The skip link and main focus target remain live. Only visually hidden
interactive subtrees become `inert`; opacity is not treated as a focus guard.
The intro adds no modal, focus trap, or pointer-capturing overlay.

### Responsive geometry

**Source:** `src/components/invite/Hero.tsx`, lines 43-51.

**Apply to:** Hero and browser geometry tests.

CSS owns final target position and size. JavaScript measures the rendered
wrapper rather than duplicating mobile/tablet/desktop coordinates. Preserve
subpixel values and test with a 1 CSS-pixel tolerance.

### Motion policy

**Sources:** `src/hooks/useReducedMotion.ts`, lines 47-72, and
`src/index.css`, lines 478-487.

**Apply to:** Home initial state, Hero effect, CSS reveal, and both test files.

The existing reactive hook is the JavaScript source of truth. Reduced motion
renders complete content synchronously, and CSS defensively disables both
continuous wave motion and intro transitions.

### Authentication, validation, and error handling

Not applicable. This phase adds no network request, backend mutation,
authentication boundary, or user-submitted data. The only external input is
`location.hash`, handled by exact comparison and `getElementById`.

## No Exact Analog Found

| Capability | Planned File | Closest Partial Match | Planner Direction |
|---|---|---|---|
| Measured, cancellable WAAPI shared-element descent | `src/components/invite/Hero.tsx` | Shell's RAF/listener lifecycle | Follow `10-RESEARCH.md` Pattern 2/3: one target wrapper, one visual child, `useLayoutEffect`, first-frame RAF, `Element.animate`, idempotent finish, symmetric cleanup. |

## Metadata

**Analog search scope:** `src/routes`, `src/components/invite`,
`src/components/layout`, `src/hooks`, `src/lib`, `tests`, root test configs,
and `src/index.css`.

**Strong analogs used:** 5 (`Home`/`Presentes`, `Hero`, `Shell`,
`useReducedMotion`/CSS, and `release.spec.ts`).

**Pattern extraction date:** 2026-07-26

