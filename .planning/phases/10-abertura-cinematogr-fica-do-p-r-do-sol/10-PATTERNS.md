# Phase 10: Abertura cinematográfica do pôr do sol - Pattern Map

**Mapped:** 2026-07-26
**Files analyzed:** 12 source, test, design and evidence targets
**Analogs found:** 10 / 12
**Revision:** complete remap after the first visual concept was rejected

## Mapping Boundary

This map follows the revised `10-CONTEXT.md` and `10-RESEARCH.md`. The closest
code is not automatically the correct visual precedent: the current Phase 10
implementation contains useful policy, lifecycle and test infrastructure, but
its art direction is explicitly rejected.

### Reuse

- mount-scoped eligibility and fragment policy;
- the final responsive sun wrapper and one canonical sun DOM node;
- `useLayoutEffect` setup/cleanup shape;
- passive scroll handling and bfcache generation;
- the existing inline SVG wave construction;
- skip link placement outside `inert`;
- reduced-motion subscription;
- DOMRect alignment helpers and the Playwright browser matrix.

### Replace

- sky-only first frame;
- vertical, centered two-keyframe fall;
- `descending → revealing → complete` as a visual model;
- 2000 ms nominal duration;
- hiding the sea and all copy through `[data-intro-reveal]`;
- the single 260 ms group fade;
- production CSS keyed by `data-testid`;
- tests whose expected result is the rejected visual behavior.

The new visual precedent is the **final hero itself as a continuously mounted,
layered scene**. There must be no alternate intro backdrop and no handoff to a
different hero.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/components/invite/Hero.tsx` | component / scene host | event-driven + transform | current `Hero.tsx`; `SeaWaves.tsx` for layered SVG | role-match; visual choreography must be replaced |
| `src/components/invite/CinematicIntroScene.tsx` *(create if scene is split from Hero)* | component / motion controller | event-driven + transform | `Hero.tsx` `useLayoutEffect` lifecycle | role-match only |
| `src/components/invite/SeaWaves.tsx` | decorative component | transform / streaming loop | current `SeaWaves.tsx` | exact structural analog |
| `src/index.css` | visual config / style system | transform | existing wave and reduced-motion rules | exact mechanics; rejected intro selectors must be removed |
| `src/lib/cinematicIntro.ts` | policy and geometry utility | transform | current `cinematicIntro.ts` | exact for policy; new geometry/controller math has no full analog |
| `src/lib/cinematicIntro.test.ts` | unit test | transform / batch | current `cinematicIntro.test.ts` | exact |
| `src/routes/Home.tsx` | route coordinator | event-driven | current `Home.tsx` | exact lifecycle analog; phase model must change |
| `src/components/layout/Shell.tsx` | layout / accessible chrome | event-driven | current `Shell.tsx` | exact |
| `tests/cinematic-intro.spec.ts` | focused browser contract | event-driven + batch | current `cinematic-intro.spec.ts` | exact harness; many assertions are obsolete |
| `tests/cinematic-intro-visual.spec.ts` *(create or isolate in focused spec)* | visual checkpoint test | batch + file I/O | Playwright config and current animation interception helper | partial |
| `tests/release.spec.ts` | release browser test | batch | current `release.spec.ts` | exact |
| `DESIGN.md` | normative design config | transform | current `DESIGN.md` § Hero Sunset / Motion | exact document location; content conflicts with revised direction |

Generated checkpoint artifacts such as
`.planning/phases/10-abertura-cinematogr-fica-do-p-r-do-sol/artifacts/intro-keyframes-desktop.png`
and `intro-keyframes-mobile.png` are outputs of the visual checkpoint rather
than authored application code. They have no existing repository analog.

## Pattern Assignments

### `src/components/invite/Hero.tsx` (component / scene host, event-driven)

**Primary analog:** `src/components/invite/Hero.tsx`

**Secondary analog:** `src/components/invite/SeaWaves.tsx`

#### Imports and local-module pattern

Current local imports establish the project convention: React hooks first,
router/content/lib modules next, then sibling components.

**Source:** `src/components/invite/Hero.tsx:1-11`

```tsx
import { useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router'
import { HERO, SECTION_IDS } from '../../content/event'
import {
  CINEMATIC_INTRO_DURATION_MS,
  CINEMATIC_INTRO_EASING,
  hasIntentionalIntroScroll,
  type IntroPhase,
} from '../../lib/cinematicIntro'
import { buttonClassName } from '../ui/Button'
import { SeaWaves } from './SeaWaves'
```

Keep the relative import convention. If the scene controller becomes a sibling
file, `Hero.tsx` should import it from `./CinematicIntroScene`; pure normalized
geometry and playback-rate math stay in `../../lib/cinematicIntro`.

#### Canonical target pattern to preserve

**Source:** `src/components/invite/Hero.tsx:143-162`

```tsx
<div
  ref={sunTargetRef}
  data-testid="hero-sun-target"
  className="absolute left-1/2 top-[62%] aspect-square
    w-[clamp(260px,28vw,480px)] -translate-x-1/2 -translate-y-1/2
    sm:top-[59%]"
>
  <div
    ref={sunVisualRef}
    data-testid="hero-sun-visual"
    aria-hidden="true"
    className="h-full w-full rounded-full"
  />
</div>
```

Copy the **wrapper/visual identity**, not these exact coordinates. The revised
scene needs three transform responsibilities:

```tsx
<div ref={sunTargetRef} data-intro-sun-target>
  <div ref={sunRetargetRef} data-intro-sun-retarget>
    <div ref={sunRef} data-intro-sun data-testid="hero-sun-visual" />
  </div>
</div>
```

- `sun-target`: final responsive layout geometry;
- `sun-retarget`: temporary FLIP correction after resize;
- `sun`: artistic arc.

The final artistic keyframe is `transform: none`, so the same node naturally
occupies the real target. `data-testid` may coexist for tests, but production
CSS and controller lookup must use `data-intro-*`.

#### Layout-effect lifecycle skeleton to preserve

**Source:** `src/components/invite/Hero.tsx:39-116`

```tsx
useLayoutEffect(() => {
  if (introPhase !== 'descending') return

  let animation: Animation | undefined
  let completed = false
  let disposed = false

  const frame = window.requestAnimationFrame(() => {
    // measure the rendered target and create the transient effect
  })

  return () => {
    disposed = true
    window.cancelAnimationFrame(frame)
    window.removeEventListener('scroll', onScroll)
    if (animation) {
      animation.onfinish = null
      animation.cancel()
    }
  }
}, [introPhase, introRunGeneration, onIntroDescentComplete])
```

Preserve:

- measurement after DOM commit;
- mount/generation-scoped handles;
- explicit RAF/listener/animation cleanup;
- dependency on the bfcache run generation.

Replace the single `Animation` variable with a local controller owning every
animation, observer, listener and correction animation. All setup and cleanup
operations must cross the fail-open boundary described under Shared Patterns.

#### Scene-layer pattern to create

The root should expose stable semantic layers. The closest existing pattern is
the always-mounted, decorative `SeaWaves` tree, not an overlay screen:

```tsx
<div
  ref={sceneViewportRef}
  data-intro-scene
  aria-hidden="true"
  className="pointer-events-none absolute inset-0 overflow-hidden"
>
  <div ref={cameraRef} data-intro-layer="camera">
    <div data-intro-layer="sky-base" />
    <div data-intro-layer="cool-veil" />
    <svg data-intro-layer="cloud-far">{/* simple paths */}</svg>
    <svg data-intro-layer="cloud-near">{/* simple paths */}</svg>
    <div data-intro-layer="haze-horizon" />
    {/* canonical target / retarget / sun wrappers */}
    <div data-intro-layer="horizon-depth" />
    <div data-intro-layer="reflection" />
    <SeaWaves />
    <svg data-intro-layer="palms">{/* token-driven silhouettes */}</svg>
    <div data-intro-layer="texture" />
  </div>
</div>
```

This structure must render in both `playing` and `complete`. The initial frame
changes light, depth and framing; it does not remove the landscape.

#### Copy grouping pattern to create

The current hero already keeps semantic copy and links in normal DOM order.
Split its visual animation into two named groups without changing content:

```tsx
<div data-intro-copy="primary">
  {/* eyebrow, “Sol faz 40”, date */}
</div>
<div
  data-intro-copy="secondary"
  inert={secondaryIsNotYetVisible ? true : undefined}
>
  {/* invitation/tagline and CTAs */}
</div>
```

Primary begins before secondary within one 500–700 ms window near the end of
the 3000 ms clock. Remove `inert` when a group becomes visibly available, not
only after all decorative animation ends.

#### Rejected code: do not copy

**Source:** `src/components/invite/Hero.tsx:87-100`

```tsx
animation = visual.animate(
  [
    {
      transform: `translate3d(0, ${-(rect.bottom + rect.height)}px, 0)`,
    },
    { transform: 'translate3d(0, 0, 0)' },
  ],
  {
    duration: CINEMATIC_INTRO_DURATION_MS,
    easing: CINEMATIC_INTRO_EASING,
    fill: 'both',
  },
)
```

This is the rejected vertical fall. It must become 3–4 geometry-derived
keyframes containing meaningful X and Y deltas, with segment easings and a
longer approach. Do not retain it as a fallback visual.

Also remove the three blanket `data-intro-reveal` groups at
`Hero.tsx:165`, `Hero.tsx:173` and `Hero.tsx:212`. The sea, atmosphere and
silhouettes must be present from frame zero; copy uses `primary`/`secondary`
hierarchy rather than a generic reveal bucket.

---

### `src/components/invite/CinematicIntroScene.tsx` (optional new component / motion controller, event-driven)

**Analog:** `src/components/invite/Hero.tsx:39-116`

Use this split if keeping layer refs, timeline creation, retargeting and
fail-open cleanup inside `Hero.tsx` would obscure the semantic hero markup.
This is a local scene controller, not a reusable animation framework.

Recommended interface:

```tsx
export type CinematicIntroSceneProps = {
  state: 'playing' | 'complete'
  generation: number
  reducedMotion: boolean
  onComplete: (reason: IntroCompletionReason) => void
}
```

The component may render the decorative scene and own its refs. `Home` should
not receive raw `Animation` handles, geometry or layer selectors.

No exact analog exists for a multi-effect WAAPI controller. Follow the
existing `useLayoutEffect` ownership pattern, then implement the controller
shape from research:

```ts
type CinematicIntroController = {
  animations: Animation[]
  getProgress(): number
  seek(progress: number): void
  accelerate(maxRemainingMs?: number): void
  finishOpen(reason: IntroCompletionReason): void
  dispose(): void
}
```

`finishOpen` and `dispose` must be distinct: normal/error completion is allowed
to call React state through `onComplete`; unmount cleanup must not.

---

### `src/components/invite/SeaWaves.tsx` (decorative component, transform / streaming loop)

**Analog:** `src/components/invite/SeaWaves.tsx`

#### Inline SVG and token pattern

**Source:** `src/components/invite/SeaWaves.tsx:15-64`

```tsx
<svg
  viewBox="0 0 800 120"
  preserveAspectRatio="none"
  className="wave-band wave-band--back absolute inset-x-0 ..."
>
  <path
    d="M0,30 C50,15 100,15 ..."
    fill="var(--color-plum)"
  />
</svg>
```

Copy:

- inline SVG;
- stable `viewBox`;
- CSS-variable fills rather than color literals;
- `aria-hidden="true"` and `pointer-events-none`;
- few large grouped paths rather than many DOM elements;
- duplicated wave tiles for seamless translation.

Extend with semantic layer attributes and a light overlay:

```tsx
<svg data-intro-layer="waves-back" className="wave-band wave-band--back">
  <path className="wave-fill" ... />
  <path className="wave-rim-light" ... />
</svg>
```

The base sea and waves are visible from frame zero. The finite intro timeline
may animate rim-light opacity; the independent slow wave loop remains separate.
Under reduced motion, both finite motion and wave loops stop while the final
art remains visible.

Do not animate `fill`, SVG blur or path data per frame.

---

### `src/index.css` (visual config / style system, transform)

**Analog:** existing `src/index.css` wave rules and reduced-motion blocks.

#### Continuous transform-only loop to preserve

**Source:** `src/index.css:129-148`

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

This is the correct performance pattern: slow, transform-only, depth-specific
motion. Keep the loops independent from the finite cinematic timeline.

#### Reduced-motion pattern to preserve and broaden

**Source:** `src/index.css:449-459`

```css
@media (prefers-reduced-motion: reduce) {
  .wave-band,
  .wave-band--mid,
  .wave-band--back {
    animation: none;
  }
}
```

The revised rule must also ensure every cinematic layer uses its base final
style immediately. Do not add a reduced-motion fade.

#### New layer-state pattern

Base CSS is the authoritative final hero:

```css
[data-intro-state="complete"],
[data-intro-scene]:not([data-intro-state]) {
  /* all base styles are already the final composition */
}

[data-intro-state="playing"] [data-intro-layer="camera"],
[data-intro-state="playing"] [data-intro-sun],
[data-intro-state="playing"] [data-intro-copy] {
  will-change: transform, opacity;
}
```

WAAPI supplies transient sampled values. After promoting the root to
`complete`, canceling effects must expose an identical base frame. Remove
`will-change` in the complete state.

Art-direction CSS should use custom properties per composition rather than
duplicated pixel coordinates:

```css
[data-intro-scene] {
  --intro-horizon-y: 69%;
  --intro-camera-start-scale: 1.045;
  --intro-reflection-width: clamp(5rem, 12vw, 10rem);
}

@media (max-width: 639px) {
  [data-intro-scene] {
    --intro-horizon-y: 74%;
    --intro-camera-start-scale: 1.035;
    --intro-reflection-width: clamp(3rem, 22vw, 5rem);
  }
}
```

Mobile variables are a separate art-direction profile: a higher/compact arc,
lower horizon, vertical reflection and side-framing palms. They are not a
scale factor applied to desktop.

#### Layered atmosphere pattern

- static final gradient on `sky-base`;
- cool/tonal veil animated only by opacity;
- warm horizon/haze animated by opacity and scale;
- clouds and palms animated as SVG groups through transform/opacity;
- reflection uses a static simple mask and animates opacity/scale;
- texture is one static low-opacity layer;
- no animated `filter`, gradient stops, `mask-image`, `top`, `left`, width or
  height.

#### Rejected selectors: remove

**Source:** `src/index.css:150-185`

```css
[data-intro-phase="descending"] [data-intro-reveal] {
  visibility: hidden;
  opacity: 0;
}

[data-intro-phase="revealing"] [data-intro-reveal],
[data-intro-phase="complete"] [data-intro-reveal] {
  transition: opacity var(--duration-medium) var(--ease-out);
}

[data-intro-phase="descending"] [data-testid="hero-sun-visual"] {
  visibility: hidden;
}
```

These rules directly encode the rejected sky-only frame, generic fade and
test-selector coupling. Do not rename and preserve them; delete the pattern.

---

### `src/lib/cinematicIntro.ts` (policy and geometry utility, transform)

**Analog:** `src/lib/cinematicIntro.ts`

#### Pure policy functions to preserve

**Source:** `src/lib/cinematicIntro.ts:10-39`

```ts
const HOME_SECTION_IDS = new Set<string>(Object.values(SECTION_IDS))

export function isEligibleHeroHash(hash: string): boolean {
  return hash === '' || hash === `#${SECTION_IDS.hero}`
}

export function hasIntentionalIntroScroll(
  startScrollY: number,
  currentScrollY: number,
): boolean {
  return (
    Math.abs(currentScrollY - startScrollY) >=
    CINEMATIC_INTRO_SCROLL_THRESHOLD_PX
  )
}

export function homeSectionIdFromHash(hash: string): string | null {
  if (!hash.startsWith('#')) return null

  const sectionId = hash.slice(1)
  return HOME_SECTION_IDS.has(sectionId) ? sectionId : null
}
```

These are the strongest exact analogs. Keep them pure, deterministic and free
of DOM access.

#### Replace the phase vocabulary

**Source:** `src/lib/cinematicIntro.ts:3-6`

```ts
export type IntroPhase = 'descending' | 'revealing' | 'complete'
export const CINEMATIC_INTRO_DURATION_MS = 2000
export const CINEMATIC_INTRO_REVEAL_MS = 260
```

Use a scene lifecycle such as:

```ts
export type IntroState = 'playing' | 'complete'
export const CINEMATIC_INTRO_DURATION_MS = 3000
export const CINEMATIC_INTRO_INTENT_MAX_MS = 180
export const CINEMATIC_INTRO_COPY_WINDOW_MS = 620
```

The primary/secondary copy offsets belong to the shared 3000 ms clock; there
is no separate reveal phase or timeout.

#### Pure geometry pattern to add

Keep browser reads outside the utility. Pass numeric shapes and return numeric
deltas/keyframes:

```ts
export type IntroComposition = 'mobile' | 'desktop'
export type Point = { x: number; y: number }
export type RectLike = {
  left: number
  top: number
  width: number
  height: number
}

export function resolveSunArc(
  stage: RectLike,
  target: RectLike,
  composition: IntroComposition,
): Point[] {
  // normalized composition points -> deltas from target center
}
```

Also extract:

- clamp/normalize progress;
- composition selection;
- playback rate required to finish within 150–200 ms;
- segment offsets for the copy window.

Do not place `Element`, `DOMRect`, `Animation`, `ResizeObserver` or React state
inside the pure functions.

---

### `src/lib/cinematicIntro.test.ts` (unit test, transform / batch)

**Analog:** `src/lib/cinematicIntro.test.ts`

#### Table-driven policy pattern

**Source:** `src/lib/cinematicIntro.test.ts:13-64`

```ts
describe('cinematic intro eligibility', () => {
  it.each(['', `#${SECTION_IDS.hero}`])(
    'accepts a new entry through the hero: %j',
    (hash) => {
      expect(isEligibleHeroHash(hash)).toBe(true)
    },
  )
})
```

Copy the `describe` + `it.each` style for:

- desktop/mobile normalized arc points;
- conversion to target-relative deltas;
- progress clamping;
- rate calculation at several remaining durations;
- `reduce` and fragment policy.

Delete assertions for `2000`, `260` and the `descending`/`revealing` names.
Unit tests should not fabricate layout or assert CSS transforms in jsdom.

---

### `src/routes/Home.tsx` (route coordinator, event-driven)

**Analog:** `src/routes/Home.tsx`

#### Initial eligibility pattern to preserve

**Source:** `src/routes/Home.tsx:28-35`

```tsx
const location = useLocation()
const reducedMotion = useReducedMotion()
const initialHashRef = useRef(location.hash)
const [introPhase, setIntroPhase] = useState(() =>
  resolveInitialIntroPhase(initialHashRef.current, reducedMotion),
)
const [introRunGeneration, setIntroRunGeneration] = useState(0)
```

Keep the initial hash snapshot and mount-scoped generation. Rename state to the
new two-state scene vocabulary. Reduced motion and ineligible fragments must
initialize synchronously to `complete`, preventing a first-paint flash.

#### bfcache generation pattern to preserve

**Source:** `src/routes/Home.tsx:57-73`

```tsx
useEffect(() => {
  const onPageShow = (event: PageTransitionEvent) => {
    if (
      !event.persisted ||
      reducedMotion ||
      !isEligibleHeroHash(window.location.hash)
    ) {
      return
    }

    setIntroRunGeneration((generation) => generation + 1)
    setIntroPhase('descending')
  }

  window.addEventListener('pageshow', onPageShow)
  return () => window.removeEventListener('pageshow', onPageShow)
}, [reducedMotion])
```

Reuse the eligibility guard and generation increment, but start `playing`.
The generation change must make the old controller dispose before the new one
registers listeners or observers.

#### Direct-fragment positioning pattern to preserve

**Source:** `src/routes/Home.tsx:75-88`

```tsx
const sectionId = homeSectionIdFromHash(initialHashRef.current)
if (!sectionId || sectionId === SECTION_IDS.hero) return

const frame = window.requestAnimationFrame(() => {
  document.getElementById(sectionId)?.scrollIntoView({
    block: 'start',
    behavior: 'auto',
  })
})
```

Keep direct section hashes outside the intro. Same-mount scrolling back to
`#inicio` must not alter the generation.

#### Rejected route pattern: remove

**Source:** `src/routes/Home.tsx:43-53`

```tsx
setIntroPhase((phase) =>
  phase === 'descending' ? 'revealing' : phase,
)

const revealTimer = window.setTimeout(() => {
  setIntroPhase('complete')
}, CINEMATIC_INTRO_REVEAL_MS)
```

The single controller owns the full 3000 ms clock. `Home` receives one
idempotent final completion callback; it must not schedule a second visual
phase.

---

### `src/components/layout/Shell.tsx` (layout / accessible chrome, event-driven)

**Analog:** `src/components/layout/Shell.tsx`

#### Skip link ordering pattern to preserve exactly

**Source:** `src/components/layout/Shell.tsx:143-151`

```tsx
<div className="flex min-h-screen flex-col bg-cream text-ink">
  <a
    href={`#${MAIN_ID}`}
    className="sr-only focus:not-sr-only focus:fixed focus:left-4
      focus:top-4 focus:z-(--z-skip) ..."
  >
    Pular para o conteúdo
  </a>
```

It remains the first focusable element, outside all cinematic `inert` regions
and above the scene through `--z-skip`.

#### Chrome coordination pattern to refine

**Source:** `src/components/layout/Shell.tsx:152-157`

```tsx
<header
  data-intro-chrome
  data-intro-chrome-phase={introPhase}
  inert={introPhase === 'descending' ? true : undefined}
  className="sticky top-0 ..."
>
```

Keep the explicit prop and semantic attribute, but do not hold the topbar
hidden/inert for all 3 seconds. Its visibility/interactivity must be linked to
the early or accelerated part of the single timeline. Focus, pointer or
navigation intent accelerates completion without preventing the original
event.

The current passive scroll listener + RAF throttle at `Shell.tsx:97-130` is
the local event-handling precedent: no `preventDefault`, bounded work per
frame, symmetric cleanup.

---

### `tests/cinematic-intro.spec.ts` (focused browser contract, event-driven + batch)

**Analog:** `tests/cinematic-intro.spec.ts`

#### Geometry helper to preserve

**Source:** `tests/cinematic-intro.spec.ts:70-102`

```ts
export async function readSunGeometry(page: Page) {
  return page.evaluate(() => {
    const target = document.querySelector<HTMLElement>(
      '[data-testid="hero-sun-target"]',
    )
    const visual = document.querySelector<HTMLElement>(
      '[data-testid="hero-sun-visual"]',
    )
    // ...
    return {
      target: target.getBoundingClientRect().toJSON(),
      visual: visual.getBoundingClientRect().toJSON(),
    }
  })
}
```

`expectSunGeometryAligned` already compares center, width and height within one
pixel. Preserve it for frame 100%, and additionally prove that the visual node
remains identical from frame 0 to 100.

#### Animation interception pattern to generalize

**Source:** `tests/cinematic-intro.spec.ts:25-51`

```ts
const originalAnimate = Element.prototype.animate
window.__cinematicIntroAnimations = []

Element.prototype.animate = function (keyframes, options) {
  const animation = originalAnimate.call(this, keyframes, options)
  if ((this as HTMLElement).dataset.testid === 'hero-sun-visual') {
    animation.pause()
    window.__cinematicIntroAnimations.push(animation)
  }
  return animation
}
```

Generalize capture by semantic intro ownership (`closest('[data-intro-scene]')`
or `data-intro-animation`) so tests can pause and seek every finite effect on
the shared clock. Do not make the app expose production behavior through a
test id.

Recommended deterministic helper:

```ts
async function seekIntro(page: Page, progress: number) {
  await page.evaluate((value) => {
    window.__cinematicIntroController?.seek(value)
  }, progress)
  await page.evaluate(() => new Promise(requestAnimationFrame))
}
```

If a test-only bridge is used, expose it only in development/test builds and
keep it as controller delegation rather than a second timeline.

#### Contracts to rewrite

Replace the test at `tests/cinematic-intro.spec.ts:105` (“first frame shows
only the final sky”) with objective layer assertions:

- sky, horizon, sea, waves and silhouettes exist and are visible at 0%;
- reflection is present but initially quieter;
- exactly one `[data-intro-sun]`;
- no document overflow;
- decoration is `aria-hidden` and pointer-transparent.

Replace the timing assertion at `tests/cinematic-intro.spec.ts:282`:

- all finite cinematic effects use nominal 3000 ms;
- the sun has X and Y displacement in intermediate keyframes;
- camera, cloud/parallax, light/reflection and copy share a clock;
- final sun and camera transforms are identity;
- primary copy starts before secondary and the total window is 500–700 ms;
- keyframes animate only transform/opacity.

Keep and upgrade:

- canonical geometry at 320×760, tablet and 1280×800;
- resize test, now checking preserved progress/generation and bounded
  consecutive-frame displacement;
- eligible remount / same-mount wordmark / direct fragment policy;
- bfcache generation and cleanup;
- reduced-motion zero finite animations.

#### Failure matrix to add

Install one monkeypatch per test before navigation:

```ts
Element.prototype.animate = function () {
  throw new Error('forced animate failure')
}
```

Repeat for `updatePlaybackRate`, `finish`, `cancel` and
`KeyframeEffect.prototype.setKeyframes` when used. Every failure must converge
to:

- `data-intro-state="complete"`;
- header and CTA visible and not inert;
- skip link functional;
- no uncaught page error;
- scroll/navigation still succeeds.

---

### `tests/cinematic-intro-visual.spec.ts` (new visual checkpoint test, batch + file I/O)

**Partial analogs:** the interception helper in
`tests/cinematic-intro.spec.ts:25-51` and projects in
`playwright.config.ts:18-52`.

Create this as a separate spec if contact-sheet generation would make the
behavior spec noisy. It should:

1. set either 1280×800 or 320×760;
2. navigate to `/` with motion enabled;
3. deterministically seek to `0`, `.40`, `.70`, `.88`, `1`;
4. wait exactly one paint after each seek;
5. capture only the hero viewport;
6. compose or retain named frames for the human checkpoint.

Example naming:

```ts
for (const progress of [0, 0.4, 0.7, 0.88, 1]) {
  await seekIntro(page, progress)
  await page.locator('#inicio').screenshot({
    path: artifactPath(`desktop-${progress}.png`),
    animations: 'disabled',
  })
}
```

Do not make pixel snapshots a permanent gate until the user approves the
direction. After approval, retain only canonical 0%, ~70% and 100% snapshots
in stable Chromium; WebKit remains a behavioral/rasterization matrix and real
Safari remains UAT.

No exact existing analog generates contact sheets. The implementation must
follow the research checkpoint rather than inventing a precedent.

---

### `tests/release.spec.ts` (release browser test, batch)

**Analog:** `tests/release.spec.ts`

#### Release matrix hook to preserve

`package.json` already defines:

```json
{
  "test:browser": "npm run build && playwright test",
  "test:release": "npm test && npm run test:browser"
}
```

`playwright.config.ts:18-52` already supplies the required four projects:

- Chromium 1280×800;
- Chromium 320×760 @2x with touch;
- WebKit 1280×800;
- WebKit 320×760 @2x with touch.

Reuse that matrix rather than creating one-off viewport loops for every release
test.

#### Axe helper to correct

**Source:** `tests/release.spec.ts:33-41`

```ts
const result = await new AxeBuilder({ page })
  .withTags(WCAG_AA_TAGS)
  .analyze()
const blocking = result.violations.filter(
  ({ impact }) => impact === 'serious' || impact === 'critical',
)
expect(blocking).toEqual([])
```

The function name/claim is narrower than “passes automated AA.” Either assert
all tagged violations are empty:

```ts
expect(result.violations).toEqual([])
```

or rename every test and helper to accurately say it checks only blocking
impact. The revised research calls for the former.

#### Release additions

- 320 px no horizontal overflow at 0%, ~70% and complete;
- correct tab/skip order before, during and after copy activation;
- no invisible focusable CTAs;
- reduced motion has final art but no finite or wave animation;
- decorative layers are pointer-transparent;
- forced-colors content remains usable even if art degrades;
- full failure matrix stays focused in `cinematic-intro.spec.ts`, with one
  fail-open smoke case in release if useful.

The existing release animation helper captures only the old sun test id and
calls `finish()`. Replace it with semantic controller seek/complete so the
release suite does not preserve the rejected cut-to-end behavior.

---

### `DESIGN.md` (normative design config, transform)

**Analog location:** `DESIGN.md:253-279`

The document contains the correct structural place for the new rules, but its
current content conflicts with the latest user decision:

```md
- **Composition:** somente céu, disco solar e três faixas do mar;
  coqueiros e outras silhuetas laterais são proibidos.
- **Reflection:** não existe feixe, caminho ou reflexo saindo do sol.
- **Signature entrance:** céu aquece em `900ms`, sol assenta no horizonte
  e a cópia chega em cinco tempos de `680ms`.
```

Do not preserve those statements. After the visual checkpoint is approved,
replace them with normative rules for:

- continuous layered landscape from frame zero;
- editorial clouds, haze, depth and subtle texture;
- reflection as the sun/hero continuity bridge;
- responsive mobile framing with palms at the sides;
- one ~3000 ms cinematic clock;
- primary then secondary copy within 500–700 ms;
- reduced-motion immediate final composition;
- only transform/opacity animated on large layers.

Update after approval, not before: the checkpoint may change exact
composition values within Claude's discretion.

## Shared Patterns

### 1. One final DOM scene, one canonical sun

**Sources:** `Hero.tsx:143-162`, `SeaWaves.tsx:15-64`

Apply to `Hero.tsx`, optional `CinematicIntroScene.tsx`, CSS and browser tests.
All landscape layers are continuously mounted. The sun travels through
transforms on its existing visual node and ends at identity inside the final
responsive wrapper. No clone, overlay hero, background swap or post-animation
node replacement is allowed.

### 2. One clock, many WAAPI effects

**Source mechanics:** `Hero.tsx:87-100`; choreography replacement:
`10-RESEARCH.md` § Timeline Architecture.

Create each finite animation with the same nominal 3000 ms duration and use
keyframe offsets for:

- sun arc;
- camera retreat;
- cloud/palm parallax;
- cool veil, horizon warmth and haze;
- reflection;
- wave rim light;
- primary and secondary copy.

This enables deterministic seek and uniform acceleration. Do not use React
state per frame or `setTimeout(3000)` as the master clock.

### 3. Fail-open WAAPI boundary

**Closest lifecycle analog:** `Hero.tsx:39-116`.

The existing code has the correct idempotency intent (`completed`/`disposed`)
but unsafe calls to `finish()` and `cancel()`. The replacement must promote DOM
state before attempting cleanup, isolate failures per animation, and call the
completion callback at most once:

```ts
function commitFinal(reason: IntroCompletionReason) {
  if (completed || disposed) return
  completed = true
  promoteDomToFinalState()

  for (const animation of animations) {
    try {
      animation.onfinish = null
      animation.cancel()
    } catch {
      // final DOM state is already authoritative
    }
  }

  try {
    resizeObserver?.disconnect()
  } catch {
    // final DOM state remains authoritative
  }

  onComplete(reason)
}
```

Wrap every `animate`, `pause`, `setKeyframes`, `updatePlaybackRate`, `finish`
and `cancel`. Any failure enters `commitFinal('error')`. Attach rejection
handlers to `animation.finished` if used.

Unmount uses a cleanup path that never invokes `onComplete` or a React setter.
Strict Mode setup → cleanup → setup must leave no listener, observer, RAF or
animation from the first generation.

### 4. Responsive retargeting with preserved progress

**No complete repository analog.** Use separate camera/sun-retarget/sun
wrappers and follow the research algorithm:

```ts
const progress = controller.getProgress()
const before = sun.getBoundingClientRect()
controller.replaceGeometry(nextGeometry, progress)
const after = sun.getBoundingClientRect()

const correction = {
  x: before.left - after.left,
  y: before.top - after.top,
  scaleX: before.width / after.width,
  scaleY: before.height / after.height,
}
```

Apply the inverse on `sun-retarget`, animate it to identity over about 180 ms,
and restore the same master progress. A `ResizeObserver` watches the scene
viewport and real target only while playing. Failure concludes open; resize
never restarts the generation.

### 5. Navigation intent accelerates; it does not cut

**Sources:** pure threshold in `cinematicIntro.ts:25-33`; passive event style in
`Shell.tsx:97-130`.

On real scroll, skip activation, navigation pointer/focus or CTA intent:

- calculate remaining timeline time;
- call `updatePlaybackRate()` so completion occurs within about 180 ms;
- never call `preventDefault`;
- never restore scroll;
- never call `finish()` as the normal intent path;
- preserve the original click/focus/navigation result.

If rate update fails, commit the final DOM state immediately.

### 6. Accessibility state follows visible state

**Sources:** skip link at `Shell.tsx:143-151`; reduced motion rules at
`index.css:449-459`.

- Scene art is `aria-hidden` and `pointer-events:none`.
- Skip remains first, focusable and outside `inert`.
- Copy can remain in semantic DOM, but an invisible interactive group is
  `inert`.
- Remove `inert` when its corresponding content becomes visibly available.
- Reduced motion initializes `complete` synchronously, creates no finite
  animations and stops wave loops.
- A runtime change to `reduce` completes immediately and does not restart when
  switched back.
- Contrast must be checked at intermediate copy-bearing frames, not only at
  100%.

### 7. Semantic selectors in production, test ids in tests

Use:

```text
data-intro-scene
data-intro-state="playing|complete"
data-intro-layer="cloud-far|cloud-near|haze-horizon|reflection|..."
data-intro-sun
data-intro-copy="primary|secondary"
```

`data-testid` may remain as a locator convenience, but no production CSS or
controller lookup may depend on it. The current selector at
`index.css:178-183` is specifically rejected.

### 8. Checkpoint before lifecycle investment

The visual checkpoint is blocking:

| Viewport | Progress samples |
|---|---|
| Desktop 1280×800 | 0%, 40%, 70%, 88%, 100% |
| Mobile 320×760 | 0%, 40%, 70%, 88%, 100% |

The planner should separate prototype/approval from responsive retarget,
bfcache and full release work. The user must judge whether:

- frame zero looks finished;
- the arc reads as diagonal/natural;
- the retreat reads as camera, not UI zoom;
- halo/reflection absorb the landing;
- mobile is art-directed rather than cropped;
- 100% remains the recognizable invitation hero.

Only after approval should `DESIGN.md` and permanent visual snapshots be
updated.

## Reusable vs. Rejected Matrix

| Existing pattern | Classification | Planner action |
|---|---|---|
| `isEligibleHeroHash`, `homeSectionIdFromHash` | reusable policy | preserve and keep unit-tested |
| mount-scoped `initialHashRef` | reusable lifecycle | preserve |
| `pageshow.persisted` generation increment | reusable lifecycle | preserve with `playing` vocabulary |
| one real sun wrapper/node | reusable identity | preserve; add retarget wrapper |
| measurement in `useLayoutEffect` | reusable lifecycle | preserve inside fail-open boundary |
| passive scroll listener | reusable interaction | preserve; change completion to acceleration |
| inline SVG wave bands and token fills | reusable art mechanism | extend with rim light/depth |
| reduced-motion wave shutdown | reusable accessibility | preserve and broaden |
| skip link before header/main | reusable accessibility | preserve exactly |
| DOMRect alignment helper | reusable test infrastructure | preserve |
| Chromium/WebKit desktop/mobile projects | reusable release infrastructure | preserve |
| sky-only first frame | rejected visual | delete assertions and hiding CSS |
| centered vertical two-keyframe fall | rejected visual | replace with responsive diagonal arc |
| 2000 ms duration | rejected timing | replace with ~3000 ms |
| `descending → revealing → complete` | rejected visual state model | replace with `playing → complete` |
| `[data-intro-reveal]` hides sea/copy | rejected visual | remove |
| 260 ms generic group fade | rejected reveal | replace with primary/secondary offsets |
| immediate `finish()` on intent | rejected transition | accelerate to 150–200 ms |
| production CSS using `data-testid` | rejected coupling | use semantic attributes |

## No Analog Found

| File / Concern | Role | Data Flow | Reason / Required Source |
|---|---|---|---|
| `src/components/invite/CinematicIntroScene.tsx` multi-layer controller | component / controller | event-driven | No existing controller coordinates multiple WAAPI effects, ResizeObserver and fail-open completion; use `Hero.tsx` lifecycle plus revised research |
| contact-sheet artifact generation | visual evidence | batch + file I/O | No existing visual approval artifact pipeline; use deterministic Playwright seek and screenshots |
| FLIP retarget during active WAAPI timeline | utility/controller concern | transform + event-driven | No repository implementation preserves progress and visual position through responsive keyframe replacement |

## Planner Handoff

Recommended grouping based on pattern boundaries:

1. **Art-direction prototype:** `Hero.tsx`, `SeaWaves.tsx`, `index.css`,
   deterministic visual checkpoint spec/artifacts. Stop for human approval.
2. **Timeline and geometry:** optional scene controller,
   `cinematicIntro.ts`, unit tests, focused browser contracts, fail-open and
   resize retarget.
3. **Route/accessibility/release:** `Home.tsx`, `Shell.tsx`, lifecycle and
   failure matrix, release suite, then `DESIGN.md` after approved visuals.

Do not bundle the checkpoint after the complete implementation. Visual quality
is the known highest-risk assumption and must be resolved first.

## Metadata

**Analog search scope:** `src/components/invite`, `src/components/layout`,
`src/routes`, `src/lib`, `src/index.css`, `tests`, `playwright.config.ts`,
`package.json`, `DESIGN.md`

**Strong analog files read:** 10

**Pattern extraction date:** 2026-07-26

**Canonical inputs:** revised `10-CONTEXT.md` and revised `10-RESEARCH.md`

