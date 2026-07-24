# Phase 03 — RSVP Pattern Mapping

**Mapped:** 2026-07-24  
**Purpose:** implementation-facing map of the existing project patterns for RSVP-01 through RSVP-05. This is not an implementation plan and does not change application code.

## Existing Architecture at a Glance

The application is a small declarative React Router + direct Convex client application. The RSVP flow should preserve that shape:

```text
Home / Hero + NAV_LINKS
        │ absolute route navigation
        ▼
Confirmar route (local UI state + sessionStorage capability only)
        │ useMutation / useQuery
        ▼
public Convex RSVP functions
        │ scoped by hashed, expiring session capability
        ▼
rsvps ──< rsvpGuests       rsvpSessions
```

The important division is already implicit in the project and explicit in the Phase 03 research: route/UI state stays in `src/`; durable RSVP data, authorization scope, normalization enforcement, and rate limits stay in `convex/`. Do not replace the current declarative router, add a client-side data store, or introduce an HTTP/BFF layer merely for this phase.

## Likely File Map

| File | Change | Role and data flow | Closest project analogue / integration point |
|---|---|---|---|
| `src/routes/Confirmar.tsx` | **New** | Owns `/confirmar` composition, token restoration from `sessionStorage`, explicit gate/family state transitions, route-heading focus, and calls to Convex. Holds only the raw capability and local draft; never holds a raw phone after lookup. | `src/routes/Home.tsx` is the route-composition model; `src/components/layout/Shell.tsx` provides the frame. |
| `src/components/rsvp/*` (optional decomposition) | **New, if needed** | Presentational/small state surfaces such as phone gate, family form, and attendance group. Keep route-level session orchestration in `Confirmar.tsx`; do not create a generic form framework. | Invitation sections under `src/components/invite/` are self-contained components, while `Home.tsx` only composes them. |
| `src/lib/phone.ts` and `src/lib/phone.test.ts` | **New** | Pure Brazilian-phone normalization/candidate logic used by Convex. It can also provide a deliberately lightweight client pre-check, but backend normalization is authoritative. | `src/lib/countdown.ts` + adjacent `src/lib/countdown.test.ts`; legacy `lib/phone.mjs` is the behavioral baseline. |
| `src/lib/rsvp.ts` and `src/lib/rsvp.test.ts` (only if draft/count logic is extracted) | **New, optional** | Pure local helpers for sparse dirty updates, contact tri-state, and summary counts. | `countdown.ts` keeps deterministic state derivation outside React; do not test component internals if a pure helper can carry the rule. |
| `src/App.tsx` | **Modify** | Registers `/confirmar` without touching the reserved `/admin` route. | Existing declarative `<Routes>` at lines 8–11. |
| `src/content/event.ts` | **Modify** | Canonical home and RSVP navigation targets plus route-facing copy/deadline constants. May export a distinct `RSVP_NAV_LINKS` whose fragments are absolute. | Existing `NAV_LINKS` and `HERO` (lines 81–101). |
| `src/content/event.test.ts` | **Modify** | Updates the locked navigation expectation when RSVP is prepended and tests any new route content constants with existing content-level style. | `NAV_LINKS` order assertion at lines 47–56. |
| `src/components/invite/Hero.tsx` | **Modify** | Replaces the single fragment CTA with the required primary `/confirmar` CTA plus the existing program fragment CTA. | Current action link at lines 80–82; legacy hero action grouping at previous `EventSite.tsx` lines 405–406. |
| `src/components/layout/Shell.tsx` | **Usually no code change; reuse** | Renders both desktop/mobile navigation from passed link data and provides header, skip link, main landmark, and footer. `Confirmar` passes its own absolute-home navigation and `showCountdownRail={false}`. | `Shell` props at lines 6–14 and shared `navLinks!.map` rendering at lines 137–151 / 183–200. |
| `src/components/ui/Button.tsx` | **Modify** | Add an RSVP-safe primary visual variant (or a narrowly scoped equivalent) that keeps the primitive anatomy but uses plum/cream, not the current orange/cream default. | Existing base/variant split at lines 9–15; `aria-busy` and disabled behavior already belong in `baseClasses`. |
| `src/components/ui/Field.tsx` | **Possibly modify** | Phone and contact use its label/control/hint treatment. It may need a composable error-description API so hint and dynamic error can both be referenced through `aria-describedby`. | Field currently generates one hint id (lines 27–55), then spreads `rest` after `aria-describedby` (lines 44–48). |
| `src/components/ui/Card.tsx` | **Reuse; possibly extend by classes only** | Surface for restoration, phone gate, family form, and invariant state. | Existing paper-card/sand-shadow primitive at lines 12–20. |
| `src/components/ui/Toast.tsx` | **Reuse** | Secondary transient success announcement after a persistent inline save status changes. | Existing fixed polite `role="status"` at lines 13–20. |
| `src/index.css` | **Probably reuse; modify only for a genuinely shared primitive rule** | Supplies RSVP semantic colors, focus defaults, motion behavior, type, z-index and palette. New route styling can mostly use Tailwind tokens/utilities. | RSVP token block at lines 34–39; global focus ring lines 85–88; reduced-motion pattern lines 131–138. |
| `convex/schema.ts` | **Modify** | Defines `rsvps`, `rsvpGuests`, and supporting `rsvpSessions`, validators, and indexes. This becomes Phase 03’s durable data boundary. | Intentionally empty Phase 1 stub, documented at lines 3–15. |
| `convex/rsvps.ts` | **New** | Narrow public backend surface: `unlockByPhone`, `getCurrent`, and `saveResponses`; uses validators and purpose-built family views. | No current Convex function analogue; follow the schema’s TypeScript conventions and generated `api` usage from `src/`. |
| `convex/rsvpHelpers.ts` (or similarly specific backend module) | **New, recommended** | Hash token and rate-limit keys, validate an unexpired session, build the non-sensitive family view, normalize contact, and centralize attendance/session constants. Keep helpers non-public. | The repository has no backend helper yet; this is warranted because the same session-scope check is required for read and write. |
| `convex/rsvpFixtures.ts` | **New, internal/test-only** | Idempotently creates deterministic local/test data through the same phone uniqueness logic. It must be an `internalMutation`, not a public self-registration endpoint. | No current fixture pattern; Phase 03 research explicitly makes this a temporary internal seam. |
| `convex/convex.config.ts` | **New** | Registers the official rate-limiter component with `app.use(...)`; generated component types follow from Convex codegen/dev. | No existing component configuration. |
| `convex/rsvps.test.ts` | **New** | `convex-test` integration proof of scope, expiry, sparse/idempotent writes, atomic rejection, and rate limits. | Existing project tests are Vitest tests; this is the first backend integration suite. |
| `vite.config.ts` | **Modify** | Extends current Vitest selection/environment so `convex/**/*.test.ts` can run with the Convex test setup without dropping `src/**/*.test.ts`. | Current test config includes only `src/**/*.test.ts` (lines 8–13). |
| `package.json` and `package-lock.json` | **Modify** | Add exact `@convex-dev/rate-limiter`, `convex-test`, and any explicitly required Convex test runtime dependency. | Current dependencies are exact-pinned for first-party packages (for example `convex: "1.42.3"`) and the lockfile is committed. |
| `convex/_generated/*` and any component-generated type file | **Regenerate; never hand-edit** | Generated API/component declarations must match schema/functions/component configuration. | Research explicitly requires regeneration; current generated files are present locally and are excluded from `convex/tsconfig.json`. |

`src/main.tsx`, `src/routes/Home.tsx`, `src/components/ui/Card.tsx`, `src/components/ui/Toast.tsx`, and `src/index.css` are primarily **reuse points**, not presumptive edits. Keep their scope narrow unless an implementation need is concrete.

## Concrete Reuse Patterns

### 1. Route composition and navigation data

`Home` is intentionally a thin route composer, not a stateful page shell:

```tsx
// src/routes/Home.tsx:17-26
function Home() {
  return (
    <Shell navLinks={NAV_LINKS} showCountdownRail wordmarkHref={`#${SECTION_IDS.hero}`}>
      <Hero />
      <Countdown />
      ...
    </Shell>
  )
}
```

Match this with a `Confirmar` route that calls `Shell` directly, passes a route-specific navigation array, sets `showCountdownRail={false}`, and gives the wordmark `"/"`. The existing router is the correct integration seam:

```tsx
// src/App.tsx:8-11
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/admin" element={<Admin />} />
  <Route path="*" element={<NotFound />} />
</Routes>
```

Add one sibling `<Route path="/confirmar" ... />`; do not modify the catch-all or turn `/admin` into a nested/public RSVP route.

Navigation is data-driven. `Shell` uses the same `navLinks` data twice (desktop and mobile):

```tsx
// src/components/layout/Shell.tsx:137-151
{navLinks!.map((link) => (
  <a key={link.href} href={link.href} ...>{link.label}</a>
))}
```

This supports a `NAV_LINKS` entry for `/confirmar` on Home and a second RSVP-route list such as `Convite → /`, `Programação → /#programacao`, `Local → /#aracaju`. The latter is essential because the shell renders raw anchors, so bare `#programacao` would point into the RSVP document.

### 2. Content remains centralized; visual ownership remains local

`event.ts` is explicitly the source of public content and hrefs:

```ts
// src/content/event.ts:77-101
export const NAV_LINKS: NavLink[] = [ ... ]
export const HERO = {
  ...
  ctaLabel: 'Ver programação ↓',
  ctaHref: '#programacao',
}
```

Extend this model for RSVP labels, deadline, and navigation targets. `Hero` should consume those values, but the action-group layout itself belongs in `Hero`, as the current one-link action does at lines 80–82. Avoid hardcoding route copy across both `Hero.tsx` and `Confirmar.tsx`.

Existing content tests encode array ordering, rather than snapshotting rendered markup:

```ts
// src/content/event.test.ts:47-56
expect(NAV_LINKS).toHaveLength(3)
expect(NAV_LINKS.map((link) => link.href)).toEqual([
  '#aracaju', '#programacao', '#traje',
])
```

Revise those expectations deliberately when prepending the RSVP entry rather than silently weakening the assertion.

### 3. Primitive use, semantic HTML, and accessible feedback

`Field` owns persistent label, control, and optional hint semantics:

```tsx
// src/components/ui/Field.tsx:31-55
<label htmlFor={id} ...>{label}</label>
<input id={id} aria-describedby={hintId} ... {...rest} />
{hint ? <small id={hintId} ...>{hint}</small> : null}
```

Use it for phone (`type="tel"`, `inputMode="tel"`, `autoComplete="tel"`) and shared contact. Use native `form`, visible `fieldset` and `legend`, and native radios for attendance; this differs intentionally from the legacy RSVP’s button group. Keep dynamic lookup/error text in a separately identified inline region, merged with the Field hint in `aria-describedby`.

`Button` already centralizes target size, motion, disabled behavior, and busy cursor:

```ts
// src/components/ui/Button.tsx:9-15
const baseClasses = 'inline-flex min-h-[44px] ... disabled:... aria-[busy=true]:cursor-progress'
const variantClasses = {
  primary: 'border-0 bg-orange text-cream ...',
  quiet: 'border border-plum bg-transparent text-plum ...',
}
```

Add a targeted RSVP plum/cream variant rather than duplicating the full base class in the route. Preserve `quiet` for “Usar outro telefone.” The UI contract rejects use of the orange/cream `primary` variant unchanged, and the global focus rule remains in force:

```css
/* src/index.css:85-88 */
:focus-visible { outline: 2px solid var(--color-coral); outline-offset: 3px; }
```

The RSVP primary exception needs its sea, 3px outline/offset class without removing the global fallback.

`Toast` is a secondary announcement only. It already uses `role="status"`:

```tsx
// src/components/ui/Toast.tsx:13-20
<div role="status" className="fixed ... bg-plum ...">{children}</div>
```

The family form therefore needs its own persistent inline polite status region. A toast timeout must never be the sole saved state.

### 4. Responsive styling and tokens

The existing palette already has the exact semantic RSVP tokens needed:

```css
/* src/index.css:34-39 */
--color-rsvp-sim: var(--color-sea);
--color-rsvp-pendente: #8a4a15;
--color-rsvp-nao: var(--color-wine);
```

Use Tailwind’s generated `bg-rsvp-*`/`text-rsvp-*` utilities with visible radio checked state and text labels. Do not introduce green, a second palette, a component library, or a global route-specific animation. The established motion opt-out is global and applies to new custom motion only if any is added:

```css
/* src/index.css:131-138 */
@media (prefers-reduced-motion: reduce) { ... animation: none; }
```

`Card` sets a 14px shadow offset by default:

```tsx
// src/components/ui/Card.tsx:12-20
className={`border border-line bg-card p-6 shadow-[14px_14px_0_var(--color-sand)] sm:p-8 ${className}`}
```

Pass an override class for the UI-spec 8px narrow-phone shadow if necessary; its interpolation order allows a later caller utility to win. Do not fork Card solely for RSVP.

### 5. Convex boundary and client provider

The direct client infrastructure already exists:

```tsx
// src/main.tsx:23-30
<ConvexProvider client={convex}>
  <BrowserRouter>
    <App />
  </BrowserRouter>
</ConvexProvider>
```

`Confirmar` can use Convex React hooks directly. The correct public surface is narrow:

| Public function | Caller data | Must return / do |
|---|---|---|
| `unlockByPhone` mutation | raw typed phone + fresh opaque token | Normalize server-side, consume limits, find one record, store a hashed session capability, and return a discriminated safe outcome. |
| `getCurrent` query | opaque token | Validate hash and expiry; return only a purpose-built family view or `null`. |
| `saveResponses` mutation | token + sparse guest updates + contact command | Revalidate session scope; apply an atomic sparse patch; return/reconcile the scoped view or a stable outcome. |

Schema ownership belongs in the formerly empty `convex/schema.ts`; use explicit validator unions for `pending | yes | no`, indexes for `by_phone`, `by_rsvp_sort`, and hashed session lookup. Any public function must validate both args and returns so it cannot accidentally leak the stored canonical phone, `rsvpId`, session IDs, or token hashes.

The legacy route demonstrates an important *partial* analogue: it scopes writes with both guest and invitation IDs inside one batch:

```ts
// prior project app/api/rsvp/route.ts:19-24
UPDATE invite_guests
SET confirmed = ?, contact = ?, responded_at = CURRENT_TIMESTAMP
WHERE id = ? AND invite_id = ?
```

Carry forward the ownership invariant, not the exact API shape. Phase 03 must instead verify every submitted Convex guest ID belongs to the session’s RSVP, allow explicit `pending`, allow sparse updates, and keep contact at the RSVP/family level. The legacy requirement that every guest answer is specifically obsolete:

```ts
// prior project app/api/rsvp/route.ts:12-15
if (responses.length !== invite.guests.length || ...) {
  return ... 'Responda por todas as pessoas do convite.'
}
```

### 6. Phone normalization pattern

The closest behavioral analogue is the prior pure module:

```js
// prior project lib/phone.mjs:10-17
let digits = raw.replace(/\D+/g, "");
digits = digits.replace(/^0+/, "");
if (digits.length > 11 && digits.startsWith("55")) digits = digits.slice(2);
if (digits.length === 10 || digits.length === 11) return digits;
```

Its companion tests preserve the crucial DDD-55 behavior:

```js
// prior project tests/phone.test.mjs:13-18
normalizePhone("(55) 99999-0000") === "55999990000"
normalizePhone("+55 55 99999-0000") === "55999990000"
```

Use a new TypeScript module in `src/lib/`, adjacent Vitest tests, and a richer result/candidate policy from the research. Do not blindly port the old broad digit stripping: Phase 03 requires rejection of unsupported letters/control characters, explicit handling of legacy ambiguous ten-digit mobile input, and server-authoritative lookup. The code should strip the country code only when an explicit `+55`/excess length proves it is a country code, never merely because a valid national number begins with DDD 55.

### 7. Test conventions and backend harness boundary

Pure tests are co-located with their source and use Vitest’s named imports and `describe`/`it` blocks:

```ts
// src/lib/countdown.test.ts:1 (same pattern in event.test.ts)
import { describe, expect, it } from 'vitest'
```

The current Vitest configuration is intentionally narrow:

```ts
// vite.config.ts:8-13
test: {
  environment: 'node',
  globals: false,
  include: ['src/**/*.test.ts'],
}
```

Phase 03 must expand this setup before relying on `convex/rsvps.test.ts`; otherwise backend tests will not run. Register the rate-limiter test adapter in each Convex test harness. Keep browser/manual acceptance separate—there is no existing Testing Library or E2E convention to extend.

## Naming, Style, and Placement Conventions

| Concern | Existing convention | RSVP application |
|---|---|---|
| Routes | PascalCase files in `src/routes/`, default export; component function named after route. | `Confirmar.tsx`, `function Confirmar()`, default export. |
| UI components | PascalCase file/component; usually named export plus default export; exported `Props` type. | Follow for reusable RSVP components only. Avoid a component file for trivial one-use markup. |
| Invite components | `src/components/invite/` for public-event visual sections. | Place RSVP-specific visually reusable pieces in `src/components/rsvp/` rather than making `invite/` misleading, or keep compact state-owned markup in the route. |
| Pure logic | Lower camel-case `.ts` in `src/lib/`, adjacent `.test.ts`. | `phone.ts`, perhaps `rsvp.ts`; no React/DOM imports. |
| Data/content | `src/content/event.ts` uses exported uppercase constants and explicit `type` aliases. | RSVP public copy/navigation follows the same source of truth. |
| TypeScript | Single quotes, no semicolons, explicit `type` imports, strict compiler/no unused locals. | Match exactly; avoid stale helper imports and unused status variants. |
| Copy/comments | Product copy and explanatory comments are Portuguese. | Keep UI/error strings in Portuguese and comments concise, especially at security boundaries. |
| Convex function names | No local precedent. Research names are lower camel case. | Use `unlockByPhone`, `getCurrent`, `saveResponses`; keep only those three public. |
| Data names | Phase research uses plural tables and camelCase fields. | `rsvps`, `rsvpGuests`, `rsvpSessions`; `rsvpId`, `updatedAt`, `respondedAt`, `tokenHash`. |
| Generated code | Convex generated artifacts exist and are excluded from backend TS config. | Regenerate with Convex; never patch generated files. |

## Required Integration Contracts

1. **Home → RSVP:** prepend `Confirmar presença` to the centralized home nav data; Hero gets two actions, with route navigation to `/confirmar` and existing program fragment navigation retained.
2. **RSVP route → Shell:** `Shell` receives `showCountdownRail={false}`, wordmark `/`, and an RSVP-safe absolute-home nav list. Keep the sole `<main>` owned by `Shell`; `Confirmar` adds a single `h1` and focuses it after mount.
3. **Route → browser session:** read a versioned capability once from `sessionStorage`; do not render a false phone error before resolution. On expired/unknown read or save response, clear it and remove scoped data/draft from UI.
4. **Route → Convex:** client produces a high-entropy capability, but the server hashes it before persistence. Never put raw token, canonical phone, contact, family identifier, or guest ID into a URL, telemetry/debug UI, or a pre-unlock response.
5. **Convex → schema:** access to a family is always derived from a valid, unexpired `rsvpSessions` document. A guest document ID is data, not authorization; verify every patch against the session’s RSVP.
6. **Save behavior:** client calculates sparse dirty changes; backend validates them all before writing, patches only changed records, and makes repeated commands business-state no-ops. Contact needs `unchanged` / `set` / `clear`, not an ambiguous empty string.
7. **Rate limits:** use the official component via component configuration; consume expected failed lookup attempts transactionally and expose stable application states rather than raw error strings. Do not use a raw phone as a limiter key.
8. **Verification:** pure phone tests, Convex integration tests, `npm test`, `npm run build`, and `npx convex dev --once` are all required proof layers. Build alone does not validate component config or deployed Convex behavior.

## Landmines and Non-Patterns

- **Do not reuse the legacy all-guests-required behavior.** Its UI blocks `pendente` and its backend requires a full response array; Phase 03 explicitly permits partial saves and explicit `pending`.
- **Do not treat a phone lookup as a public query.** It must create a scoped, rate-limited capability, and no public list/seed/create endpoint may be introduced.
- **Do not translate the old stack architecture.** The prior Next.js/D1/cookie implementation is only a semantic reference; the current app is Vite + React Router + Convex.
- **Do not make phone a staff credential.** The legacy design’s central invariant says phone never authenticates the team; `/admin` remains untouched until Phase 6.
- **Do not strip every leading `55`.** A valid Brazilian number can begin with DDD 55. Preserve the prior regression test and expand it for the new candidate policy.
- **Do not make a visual selected button group masquerade as radios.** The UI contract requires native fieldset/legend/radio semantics, a visible checked cue, full-label targets, and all three options in the locked order.
- **Do not lose Field’s hint while adding an error.** Because `rest` is spread after the component’s default `aria-describedby`, an incoming value currently replaces the hint id. Merge ids intentionally if both must be announced.
- **Do not reuse `Button`’s orange primary unchanged.** RSVP’s 15px primary text needs the specified plum/cream treatment and sea focus outline. Keep the existing variant for non-RSVP surfaces.
- **Do not use `Toast` as the only save confirmation.** It disappears; the card must retain success/dirty text and counts.
- **Do not use localStorage or React state as the session mechanism.** The decision is browser-session-only with reload restoration, which means `sessionStorage` plus server TTL/capability validation.
- **Do not retain/copy sensitive values unnecessarily.** Clear raw phone after successful unlock; never return `phone`, `rsvpId`, token hash, or session internals from the family-view API.
- **Do not submit a stale full family snapshot.** Sparse local updates avoid overwriting a different person changed in another tab.
- **Do not assume indexes enforce unique phone numbers.** Enforce lookup-before-insert in the same internal mutation transaction; future Phase 6/7 import writers must use the same seam.
- **Do not add a nested guest-list scroll area or use fragment-only home links on `/confirmar`.** The page scrolls naturally and RSVP navigation must target `/#...`.
- **Do not hand-edit `convex/_generated`.** Run codegen/dev after schema, function, and component changes.
- **Do not rely solely on `npm run build`.** Current `tsconfig.app.json` includes only `src`, and current Vitest excludes `convex`; real Convex generation/dev smoke remains needed.

## Mapper Confidence / Open Implementation Choices

High confidence: existing route, navigation, primitive, content, type/style, and test patterns are clear. The backend module split (`rsvps.ts` plus a helper/fixture file) is recommended rather than mandated by existing code because the repository currently has only a schema stub. Its boundaries follow the locked security and test requirements, while leaving exact helper names and UI component granularity to the implementation phase.

## PATTERN MAPPING COMPLETE
