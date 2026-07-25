# Phase 04 — Pattern Map

**Mapped:** 2026-07-24  
**Purpose:** give the planner concrete file ownership, native analogs, and integration guardrails for the Carta de Vinhos while Phase 5 is being executed in parallel.

## Planning Summary

Phase 4 fits the current repository best as four cuts:

1. **Wave 0 and asset gate** — pure WhatsApp/deep-link contracts, Convex test harness, manifest, and deterministic asset audit.
2. **Wine domain and reconciliation** — validators, canonical 37-row constant, additive schema, internal idempotent reconciliation, and minimal public queries.
3. **Dedicated `/presentes` experience** — route, query states, all three bands, bottle cards, deep-link focus/scroll, and direct WhatsApp handoff.
4. **Shared integration** — header navigation, fixed home trio, RSVP success-only CTA, full regression, live Convex smoke, and responsive/browser checks.

Keep shared-file edits (`convex/schema.ts`, `convex/_generated/*`, `src/App.tsx`, `src/routes/Home.tsx`, `src/content/event.ts`, `src/content/event.test.ts`, `src/index.css`, `package.json`) in small integration tasks that begin by re-reading the live worktree. Phase 5 plans already claim several of these files and explicitly expect Phase 4 additions to be preserved.

## End-to-End Data Flow

```text
convex/wineCatalog.ts (37 immutable commercial records)
  └─ internal.wineInternal.ensureWineCatalog
       ├─ lookup by_product_code
       ├─ insert missing row as available
       ├─ patch commercial fields only
       └─ preserve status/giftedBy/giftedAt

api.wines.listCatalog
  ├─ three indexed category ranges
  ├─ priceCents then productCode order
  └─ minimal public DTO (no _id or gift identity)
       └─ Presentes route
            ├─ WineCatalog -> WineCard
            ├─ /presentes#vinho-{productCode}
            └─ available only -> wa.me anchor

api.wines.listFeatured
  └─ fixed codes 39778, 39158, 39470
       └─ GiftPreview on Home
            └─ semantic route card -> exact product fragment

FamilyForm result.kind === "saved"
  └─ hasSavedSuccessfully = true for mounted family session
       └─ persistent route CTA -> /presentes
```

There is no public wine mutation in Phase 4. `useQuery` subscriptions provide the reactive status update; the future Phase 6 admin writer is the only intended source of `available → gifted`.

## Files Likely to Be Created

### Convex domain, catalog, and tests

| File | Role / data flow | Closest current analog | Concrete pattern to reuse |
|---|---|---|---|
| `convex/wineModel.ts` | Shared category/tone/status validators, TS unions, category order, field limits, public DTO validator, and pure commercial-record validation. Imported by schema, catalog, public functions, internal reconciliation, and tests. | `convex/rsvpModel.ts:1-27` | Export `v.union(v.literal(...))` validators beside TS types and named constants. Keep schema literals out of function files. Add pure runtime checks that `v.number()` cannot express: safe integer centavos, positive price, nonblank bounded strings, and safe `/wines/...` URL. |
| `convex/wineCatalog.ts` | Typed immutable source of the 37 canonical records plus the exact fixed featured code tuple. Contains commercial fields only—never `status`, `giftedBy`, or timestamps. | Old canonical `lib/wines.ts:1-54`; structurally the content arrays in `src/content/event.ts` | Port every old row verbatim, preserve product code as a string (especially `"0699230"`), add deterministic `categoryOrder`, and use `satisfies readonly WineCatalogItem[]` so missing fields fail type-checking. Featured order is exactly `39778`, `39158`, `39470`. |
| `convex/wines.ts` | Public read API: `listCatalog` and `listFeatured`. Returns explicit safe projections only. | `convex/rsvps.ts:23-65` for named return validators and `262-274` for a public query that returns a view rather than a raw document | Declare `args: {}` and `returns` on both functions. Query each category with `by_category_price_code`, concatenate in canonical order, and map through one projection that excludes `_id`, `giftedBy`, `giftedAt`, and `updatedAt`. Resolve featured rows by indexed code and return them in the fixed tuple order, not DB creation order. |
| `convex/wineInternal.ts` | Internal production-capable `ensureWineCatalog`; inserts/patches canonical commercial data idempotently and reports created/updated/unchanged/unexpected. May include a narrowly named internal status seam only if required for smoke/test setup. | `convex/rsvpInternal.ts:175-227` for a centralized internal writer and `rsvpInternal.ts` demo reconciliation; unlike RSVP fixtures, no development flag is needed | Export `internalMutation`, not public `mutation`. For each code, collect through `by_product_code`, fail on duplicates, insert missing rows with `status: "available"`, and patch only canonical commercial fields. Re-read existing documents before every patch and never spread a canonical object over mutable gift state. Surface unknown DB codes; never silently delete them. |
| `convex/wineTest.ts` | Deploy-loadable test harness factory with test-only module discovery injected from `wines.test.ts`. | `convex/rsvpTest.ts:1-27` | Type with `TestConvex<typeof schema>`, accept `convexTest` and `modules`, and keep `import.meta.glob` out of deployable Convex code. No rate-limiter registration is needed for read-only wines. |
| `convex/wines.test.ts` | Schema, 37-row catalog, reconciliation, ordering, featured set, and public privacy contract. | `convex/rsvps.test.ts:25-33` for harness construction, `62-154` for schema cases, and `174-218` for first/second-run idempotency | Use `const modules = import.meta.glob(['./**/*.*s', '!./**/*.test.*s'])`; inspect private DB state only inside `t.run`; call the internal mutation through `internal`. Explicitly gift a row between reconciliation runs and assert status/identity/timestamp survive. Assert returned object keys, not just values, so private fields cannot leak. |

### Pure client contracts and asset preflight

| File | Role / data flow | Closest current analog | Concrete pattern to reuse |
|---|---|---|---|
| `src/lib/wineWhatsApp.ts` | Shared BRL formatter, exact approved message builder, and canonical `https://wa.me/5511993709046?text=...` URL builder. | Pure helpers such as `src/lib/phone.ts` and `src/lib/countdown.ts`; external-link content is centralized in `event.ts` | Keep the phone as a module constant, accept only the public wine shape, format integer centavos through one `Intl.NumberFormat('pt-BR', ...)`, build the complete Unicode sentence, then call `encodeURIComponent` exactly once. No window access and no imperative navigation. |
| `src/lib/wineWhatsApp.test.ts` | Exact phone/path/copy/BRL/encoding/security cases. | `src/lib/phone.test.ts` and `src/lib/countdown.test.ts` | Parse the result with `new URL`, compare `pathname` exactly, and compare `searchParams.get('text')` to the full approved message. Include accents, curly apostrophe, em dash, `"0699230"`, and a delimiter-like product name to prove it cannot create a second query parameter. |
| `src/lib/wineDeepLink.ts` | Pure product-code validation, DOM ID construction, and safe hash parsing. It prevents raw fragments from becoming selectors. | `src/lib/rsvpCapability.ts` / `rsvpSession.ts` for canonical validation and “malformed means null” behavior | Prefer a narrow digits-only code contract derived from the real catalog. `wineDomId(code)` returns `vinho-${code}` only for valid codes; `productCodeFromWineHash(hash)` returns `null` for malformed/unknown-shape fragments. The route should use `getElementById(validatedId)`, never `querySelector(location.hash)`. |
| `src/lib/wineDeepLink.test.ts` | Leading-zero, malformed, encoded, hostile, empty, and round-trip fragment cases. | `src/lib/rsvpSession.test.ts` boundary matrices | Assert `"0699230"` round-trips unchanged; reject spaces, selectors, percent-encoded markup, suffixes, empty codes, and unrelated hashes. DOM timing remains a manual browser check because Vitest currently runs in Node. |
| `scripts/audit-wine-assets.mjs` | Deterministic mapping/existence/format/dimension/alpha/byte-budget audit driven by the canonical catalog and manifest. | No current script analog; follow the repository's fail-fast npm-script style | Fail with per-code diagnostics for missing/duplicate files, invalid dimensions, missing alpha, files over budget, and absent manifest entries. Do not claim that technical checks prove license or correct label identity; those remain human sign-off. Avoid adding a heavyweight image dependency unless the task explicitly owns and pins it. |
| `public/wines/manifest.json` | One entry per code with local file, source/contact, date, publication permission, and allowed transformations; no private message content. | No current analog | Use product code as the stable key. Require all 37 entries and paths to match the catalog exactly. This is the machine-readable evidence index, not the permission document itself. |
| `public/wines/*.{webp,png}` | Thirty-seven normalized `720 × 960` transparent real-bottle assets. | Existing static assets in `public/`, but no bottle analog exists | Local host only; declare intrinsic 720/960 dimensions in UI, use `object-contain`, preserve full cap/base, and target `<=300KB`. Do not hotlink, scrape, or fabricate labels. Placeholders may unblock development but cannot close Phase 4. |

### Public gifts UI

| File | Role / data flow | Closest current analog | Concrete pattern to reuse |
|---|---|---|---|
| `src/components/gifts/WineCard.tsx` | Shared commercial card for catalog and, if its API remains clean, the home preview. Available cards expose one external anchor; gifted cards expose status text and no anchor. Handles image failure without removing text/action. | Card anatomy from old `EventSite.tsx:78-95` and old CSS `.wine-card`/`.wine-visual`/`.wine-meta`; semantic primitives in `Button.tsx:9-21` | Root catalog card is `<article id tabIndex={-1} aria-labelledby>`. Keep layout/content order from UI spec, but do not copy old reservation form, guest selector, italic quotation marks, or generic CSS bottle. Use `buttonClassName` only if a variant cleanly satisfies cellar contrast; otherwise keep a gifts-local anchor class. |
| `src/components/gifts/WineCatalog.tsx` | Renders all three always-open bands, stable counts, loading skeleton rows, partial/empty/error states, and 3/2/1 grids from already ordered DTOs. | Pure section composition in invite sections; old `WineCatalog` loop in `EventSite.tsx:78-98` | Keep category metadata in centralized gifts content/model. Use semantic `<section aria-labelledby>` and `<h2>` bands; do not filter or re-sort gifted rows. Error/empty states replace only the data region. No tabs, accordion, pagination, or virtualization. |
| `src/components/gifts/GiftPreview.tsx` | Dark home fold after Countdown; subscribes to fixed featured query, keeps exactly three slots while loading, and links each whole card to its exact product fragment. | Existing self-contained invite section pattern (`LocalSection`, `ProgramaSection`, `DressCodeSection`) and `Shell`'s React Router link behavior | Own the query and display states inside the section; `Home.tsx` remains pure composition. Each card is one semantic `<Link>` with no nested action. Keep exact server-returned featured order even after a status change. |
| `src/routes/Presentes.tsx` | Dedicated page composition: gifts navigation, compact intro/note/shortcuts, query state, deep-link effect, and catalog. | `src/routes/Confirmar.tsx:308-347` for a route composed inside shared `Shell`; `Confirmar.tsx:76-99` and `106-134` for route-local loading/error panels | Use `useQuery(api.wines.listCatalog)` for live data. Observe `useLocation().hash`; after data exists, validate via helper, find with `getElementById`, scroll, focus with `preventScroll`, and retain a selected-code state/label. Respect `matchMedia('(prefers-reduced-motion: reduce)')`. Unknown hash is a silent normal page. |

Potential decomposition: `WineCard.tsx` may be paired with a small `WineImage.tsx`, and route query-state markup may move into `WineCatalog.tsx`. Do not create a general component abstraction unless it is used by both the catalog and preview without nested-link or semantic compromises.

## Files Likely to Be Modified

| File | Exact Phase 4 integration | Existing pattern / guardrail |
|---|---|---|
| `convex/schema.ts` | Import wine validators and append `wines` with `by_product_code` and `by_category_price_code`. | Current schema is one additive `defineSchema` object (`schema.ts:5-33`). Preserve RSVP tables/indexes verbatim. Phase 5 plans `05-01` and `05-04` also add `posts` and `postUploadReservations`; re-read the complete live file and targeted diff immediately before patching. Never restore the current three-table snapshot over Phase 5. |
| `convex/_generated/*` | Regenerate after the live schema/functions contain both phases' additions. | Tool-owned only. Both Phase 5 plans explicitly claim these outputs. Never hand-edit, cherry-pick a stale generated file, or run generation from a partial schema. |
| `src/App.tsx` | Import `Presentes` and add `<Route path="/presentes" element={<Presentes />} />` before the wildcard. | Declarative, flat router at `App.tsx:7-14`; no router migration or nested layout is needed. Phase 5 currently does not claim a route, but always merge against the live route list. |
| `src/routes/Home.tsx` | Import/render `<GiftPreview />` immediately after `<Countdown />`, before `<LocalSection />`; update the composition comment. | Home is intentionally pure ordered composition (`Home.tsx:17-26`). Do not put `useQuery`, feature codes, or wine copy here. Phase 5 plan `05-04` will insert `<MemoriesSection />` after `<DressCodeSection />`; preserve both positions. |
| `src/content/event.ts` | Add gifts section ID if needed, `Presentes` to home and RSVP navigation, a dedicated gifts-page nav array, and centralized gifts/RSVP-callout copy. | `SECTION_IDS` is the anchor source (`event.ts:30-36`); `NAV_LINKS`/`RSVP_NAV_LINKS` are centralized at `83-95`; `RSVP_COPY` is a nested exact-copy contract at `119-186`. Additive exports are safer than embedding strings in UI. Phase 5 `05-04` also adds memories ID/nav/copy—re-read and merge, never replace arrays from this snapshot. |
| `src/content/event.test.ts` | Update exact nav expectations and lock gifts copy/URLs/featured labels. | Existing tests deliberately assert exact arrays (`event.test.ts:148-165`) and the full RSVP copy object (`182-253`). Update both together or the suite will fail. Phase 5 plans change these same expectations, so assert the combined final order rather than one phase's isolated order. |
| `src/components/rsvp/FamilyForm.tsx` | Add `hasSavedSuccessfully`, set it only in `case 'saved'`, and render the persistent gifts callout/link below save feedback/action. | The exact success seam is `FamilyForm.tsx:177-188`. Transient feedback is cleared by edits at `111-118`, so the new flag must be independent. Do not derive visibility from `dirty === false` (`103-109`) or attendance counts. Preserve it through subsequent failures/edits in the same mounted family session; a route/session remount may reset it. |
| `src/components/ui/Button.tsx` | Prefer no semantic change; reuse `buttonClassName` for route/external anchors where a current variant meets the visual contract. Add a cellar variant only if multiple gifts surfaces truly need it. | `buttonClassName` exists specifically for semantic links (`Button.tsx:19-21`). The `Button` component itself always renders `<button>` (`30-38`), so do not use it for navigation or WhatsApp. A gifted card must omit the anchor entirely, not pass `disabled`. |
| `src/components/layout/Shell.tsx` | Expected no functional change. Feed route-appropriate arrays through existing props. | `NavigationAnchor` already maps hrefs beginning with `/` to React Router `Link` (`Shell.tsx:19-25`), and both desktop/mobile navs consume the same array (`146-209`). `/presentes#...` and absolute home fragments work through this seam. Note: a hash-only href remains a native `<a>`, which is correct for same-page band shortcuts. |
| `src/index.css` | Add named cellar/status/halo tokens and only genuinely global gifts behavior that Tailwind utilities cannot express cleanly. | Existing `@theme` is the canonical token registry (`index.css:21-70`), global focus is at `85-88`, and reduced-motion policy is at `131-138`. Add `--color-cellar: #263f3e`, cellar line/surface derivations, and an AA gifted green. Avoid scattering old CSS hex values or copying the full legacy stylesheet. Preserve Phase 5's possible global carousel additions. |
| `package.json` | Add `audit:wine-assets`; add an image-inspection package only if the chosen audit implementation requires it and pin the exact runtime/dev version. | Existing scripts are short, non-watch commands and runtime dependencies are exact-pinned. Phase 5 `05-04` installs exact Embla packages and updates the lockfile; re-read both package files and merge. |
| `package-lock.json` | npm-generated only if dependencies/scripts affect it. | Do not hand-edit. Preserve concurrent Phase 5 Embla entries. A scripts-only `package.json` change may not require lockfile churn. |

`src/routes/Confirmar.tsx`, `src/main.tsx`, `convex/convex.config.ts`, and `vite.config.ts` should remain unchanged:

- `Confirmar.tsx:284-305` already passes the mounted family session into `FamilyForm`; the success CTA belongs inside the form where the mutation outcome exists.
- `src/main.tsx` already places `ConvexProvider` and `BrowserRouter` above all routes.
- wines need no rate limiter or component registration.
- Vitest already includes both `src/**/*.test.ts` and `convex/**/*.test.ts` in Node; do not add a second test stack solely for DOM behavior.

## Native Patterns by Flow

### 1. Additive schema and validators

Current shape:

```ts
import { attendanceValidator } from './rsvpModel'

export default defineSchema({
  rsvps: defineTable({ /* ... */ }).index('by_phone', ['phone']),
  rsvpGuests: defineTable({ /* ... */ })
    .index('by_rsvp', ['rsvpId'])
    .index('by_rsvp_sort', ['rsvpId', 'sortOrder']),
  rsvpSessions: defineTable({ /* ... */ }),
})
```

Phase 4 should follow the same module boundary:

```ts
import {
  wineCategoryValidator,
  wineStatusValidator,
  wineToneValidator,
} from './wineModel'

wines: defineTable({
  productCode: v.string(),
  name: v.string(),
  producer: v.string(),
  description: v.string(),
  tone: wineToneValidator,
  priceCents: v.number(),
  category: wineCategoryValidator,
  categoryOrder: v.number(),
  imageUrl: v.string(),
  status: wineStatusValidator,
  giftedBy: v.optional(v.string()),
  giftedAt: v.optional(v.number()),
  updatedAt: v.number(),
})
  .index('by_product_code', ['productCode'])
  .index('by_category_price_code', [
    'categoryOrder',
    'priceCents',
    'productCode',
  ])
```

The indexes are not uniqueness constraints. `ensureWineCatalog` must collect and reject `>1` matches for a code inside the mutation, just as `findInvitation` treats duplicate indexed phones as an invariant failure in `rsvps.ts:85-100`.

### 2. Safe public projection

`buildFamilyView` in `rsvps.ts:206-221` is the key privacy analog: it reads internal documents, then constructs the exact public object. Wines should use one equivalent projection:

```ts
function toPublicWine(wine: Doc<'wines'>) {
  return {
    productCode: wine.productCode,
    name: wine.name,
    producer: wine.producer,
    description: wine.description,
    tone: wine.tone,
    priceCents: wine.priceCents,
    category: wine.category,
    imageUrl: wine.imageUrl,
    status: wine.status,
  }
}
```

Never return `Doc<'wines'>` directly. Even if `giftedBy` is blank today, exposing the field establishes the wrong public contract for Phase 6.

### 3. Reconciliation without resetting mutable state

The RSVP internal module centralizes normalization and inserts instead of allowing arbitrary callers (`rsvpInternal.ts:132-227`). Wine reconciliation should be similarly centralized but update-aware:

```ts
const commercialPatch = {
  name: canonical.name,
  producer: canonical.producer,
  description: canonical.description,
  tone: canonical.tone,
  priceCents: canonical.priceCents,
  category: canonical.category,
  categoryOrder: canonical.categoryOrder,
  imageUrl: canonical.imageUrl,
  updatedAt: now,
}

await ctx.db.patch(existing._id, commercialPatch)
```

Do not construct `{ ...canonical, status: 'available' }` for an existing document. Do not clear `giftedBy`/`giftedAt` because those keys are absent from the canonical source. Only set `updatedAt` when commercial data actually changed, so the second run can report `unchanged`.

### 4. Convex integration tests

Use the existing split:

```ts
// wineTest.ts — deploy-loadable
export function makeWineTest({ convexTest, modules }: Dependencies) {
  return convexTest(schema, modules)
}

// wines.test.ts — test-only discovery
const modules = import.meta.glob(['./**/*.*s', '!./**/*.test.*s'])
```

Important assertions:

- first internal run creates 37; second creates 0/updates 0;
- category counts are `13/10/14`;
- equal-price rows use product code as tie-breaker;
- after manually patching one DB row to `gifted` with identity metadata, reconciliation may update commercial copy but must preserve all mutable fields;
- `listFeatured` is exactly `39778`, `39158`, `39470`;
- public output has an exact key list and no `_id`, `_creationTime`, `giftedBy`, `giftedAt`, or `updatedAt`.

### 5. Router, navigation, and anchors

`App.tsx:9-13` owns routes; `Shell.tsx:23-25` already selects `Link` for absolute application destinations. Therefore:

```tsx
<Route path="/presentes" element={<Presentes />} />
```

and:

```tsx
<Link to={`/presentes#${wineDomId(wine.productCode)}`}>
  {/* whole preview card */}
</Link>
```

Band shortcuts are native same-page anchors (`#faixa-...`). Product deep links require the route effect because the async target is absent during `useQuery === undefined`; native fragment behavior alone is insufficient.

Avoid placing a `<Link>` around a `WineCard` that itself renders a WhatsApp `<a>`. The preview needs a non-interactive card presentation or a dedicated `preview` composition with no nested anchors.

### 6. RSVP success persistence

Current save boundary:

```ts
case 'saved':
  setDraft(createRsvpDraft(result.view))
  onViewChange(result.view)
  showSavedFeedback(result.view)
  break
```

Add the durable flag there:

```ts
case 'saved':
  setDraft(createRsvpDraft(result.view))
  onViewChange(result.view)
  showSavedFeedback(result.view)
  setHasSavedSuccessfully(true)
  break
```

`resetTransientFeedback()` intentionally clears status/toast on edit; it must not clear this flag. Render the callout outside the transient status node and after the form action group so it persists across edits and later save failures. It is unconditional with respect to yes/no/pending counts.

### 7. Button and anchor semantics

The repository already exposes classes independently of element type:

```tsx
<Link
  to="/presentes"
  className={buttonClassName('rsvp')}
>
  Escolher um presente
</Link>
```

WhatsApp remains a real anchor:

```tsx
<a
  href={buildWineWhatsAppUrl(wine)}
  target="_blank"
  rel="noopener noreferrer"
>
  Presentear pelo WhatsApp
  <span className="sr-only"> Abre o WhatsApp em uma nova aba.</span>
</a>
```

No `onClick`, `window.open`, mutation, optimistic status, or confirmation modal belongs on this action. In the gifted branch, omit this anchor from the DOM.

### 8. Cellar styling

The old project is a visual reference, not a stylesheet to paste. Reusable ideas are:

- `#263f3e` dark cellar surface;
- tone halos: rubi `#732d3f`, rose `#d98479`, verde `#8aa085`, and the old default coral/gold direction;
- editorial border grid and flex card body;
- band heading anatomy and counts.

Required divergences:

- old grid is 4/2/1; Phase 4 is 3/2/1;
- old card contains a generated `.wine-bottle`; Phase 4 requires approved real transparent images;
- old descriptions are italic quoted copy; Phase 4 uses plain Alegreya with no decorative quotation marks;
- old buttons reserve and expose guest flows; Phase 4 uses one direct external anchor and no public write;
- old cellar hero is 640–720px with gradients; Phase 4 compact intro is 360/420px minimum with a restrained solid-surface sun.

Prefer Tailwind utilities for local layout and add only named, reusable colors/timings to `@theme`. The global `:focus-visible` outline is 2px coral; gifts surfaces explicitly require a 3px peach replacement on dark backgrounds, so local classes must win without suppressing focus.

## Phase 5 Concurrency Map

The Phase 5 plan files are already present and declare ownership as follows:

| Shared target | Phase 5 claim | Phase 4 action |
|---|---|---|
| `convex/schema.ts` | `05-01` and final `05-04` | Re-read live file immediately before the wine-table patch; append to whichever RSVP/posts tables exist. Never reorder/delete post indexes. |
| `convex/_generated/*` | `05-01`, `05-02`, `05-04` | Regenerate once from the combined live schema/functions when possible; never hand-merge generated declarations. |
| `src/content/event.ts` / `.test.ts` | `05-04` | Merge `Presentes` and `Memórias` into the final intended nav order and update exact tests atomically. Preserve both copy matrices. |
| `src/routes/Home.tsx` | `05-04` | Keep `GiftPreview` after `Countdown`; keep `MemoriesSection` after `DressCodeSection`. Rebuild neither file from an old snapshot. |
| `src/index.css` | referenced by `05-04`, possible global additions | Add named cellar tokens without replacing future carousel/reduced-motion CSS. |
| `package.json` / `package-lock.json` | `05-04` Embla install | Add audit script/dependency against the live package files; preserve exact Embla pins and npm-generated lock data. |
| `src/App.tsx` | not currently claimed | Still inspect live routes; Phase 5 may evolve. Add only the `/presentes` route delta. |
| `FamilyForm.tsx` / `Button.tsx` | not claimed | Phase 4 may edit directly, but retain unrelated concurrent changes and run the full suite. |

Before every shared edit:

```bash
git status --short
git diff -- <target files>
```

Then read the complete live target, patch only the Phase 4 delta, and run the focused tests plus `npm test && npm run build` at the end of each integration wave. Do not “resolve” overlap by reverting files to the versions described in this map.

## Asset Gate and Planning Implication

The old canonical source provides 37 image paths but the corresponding files do not exist in the old project. The UI can be developed against visibly labelled placeholders, but final Phase 4 acceptance is blocked until:

1. all 37 exact product-code images are locally present;
2. each is a real, front-facing bottle on a transparent `720 × 960` canvas;
3. each maps uniquely to the canonical code/title/vintage;
4. the audit passes dimensions, alpha, size, existence, and manifest coverage;
5. a human confirms written publication/transformation rights and product identity.

The asset request/permission checkpoint should be its own early task and may run in parallel with backend work. It must not be hidden inside the final UI task, because failure is external and blocks visual acceptance even when code is complete.

## Anti-Patterns to Reject During Planning

- A public `seed`, `reserveWine`, `giftWine`, or status mutation.
- Reconciliation that resets `status` or deletes unexpected rows.
- A second static catalog under `src/`; Convex is the public source of truth.
- Returning raw wine documents or future buyer identity.
- Sorting/filtering by status or replacing a gifted featured bottle.
- Using names, slugs, or Convex IDs for deep links instead of product code.
- Raw `querySelector(location.hash)` or trusting malformed fragments.
- Nested `<a>`/`Link` controls in preview cards.
- Imperative `window.open` when a semantic anchor works.
- Double-encoding the message or allowing phone/query data to set the destination.
- A disabled WhatsApp button for gifted rows; the action must be absent.
- Copying the old reservation/48-hour/“já comprei” flow.
- Copying the old 4-column grid, 640–720px hero, generic bottle, or italic quoted description.
- Hotlinking/scraping Mistral or treating search-result images as licensed.
- Marking placeholders as final acceptance assets.
- Overwriting shared Phase 5 additions from a stale Phase 4 snapshot.

## Verification Hooks for the Planner

| Concern | Closest existing verification pattern | Phase 4 hook |
|---|---|---|
| Schema and internal functions | `convex/rsvps.test.ts` with `convex-test` | `npx vitest run convex/wines.test.ts` |
| Exact content/navigation | `src/content/event.test.ts` exact arrays/objects | Extend the same test with the combined Phase 4 + Phase 5 contract |
| Pure URL/deep-link logic | Adjacent `src/lib/*.test.ts` | `npx vitest run src/lib/wineWhatsApp.test.ts src/lib/wineDeepLink.test.ts` |
| Assets | no analog | `npm run audit:wine-assets` plus human rights/identity sign-off |
| Route/home/RSVP semantics | current stack has no DOM runner | Browser matrix at 375/768/1280, keyboard, 200% zoom, reduced motion, save-outcome matrix |
| Reactive status | Convex subscription behavior | Two mounted views against live Convex; patch internally, observe both, restore |
| Shared regression | current scripts | `npm test && npm run build && npx convex dev --once && git diff --check` |

The planner should keep manual browser checks explicit instead of adding a new test framework casually. Automated coverage belongs on pure contracts, Convex data/privacy invariants, and the deterministic asset structure; focus/scroll, responsive geometry, live subscriptions, and real external-app launch retain the manual gates defined in `04-VALIDATION.md`.
