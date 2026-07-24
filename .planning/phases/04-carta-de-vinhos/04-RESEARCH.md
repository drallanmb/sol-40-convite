# Phase 4: Carta de Vinhos — Research

**Researched:** 2026-07-24  
**Scope:** GIFT-01 through GIFT-04  
**Current stack:** React 19.2.8, React Router 7.18.1, Convex 1.42.3, Vite 8.1.5 (lockfile), Tailwind 4.3.3, Vitest 4.1.10  
**Overall confidence:** High for architecture and integration; medium for final imagery until written asset permission/source is obtained

## Executive Summary

Phase 4 should be planned as four connected deliverables, not merely “schema + one page”:

1. A typed `wines` domain in Convex, with the 37 canonical commercial records and mutable gift state kept in the same document but updated through different seams.
2. An internal, idempotent production-capable catalog reconciliation that creates/updates canonical commercial fields while **never resetting a wine already marked as gifted**.
3. A small public read API consumed through `useQuery`, so `/presentes` and the three fixed home cards react automatically when Phase 6 later changes gift status.
4. The complete public journey: home navigation and preview, shareable deep link to a specific bottle, direct `wa.me` handoff, unavailable state, and a persistent post-save RSVP CTA.

The largest planning risk is not Convex or React. It is the locked requirement for 37 **real bottle photographs with transparent backgrounds**. The old catalog contains 37 distinct paths but no corresponding asset files. A filesystem search found no bottle images under the old project; paths such as `/wines/catena-malbec-2024.png` are references only.

The Mistral site currently has matching product pages and confirms sampled codes, names, vintages and prices. However, its Terms of Use explicitly prohibit copying, alteration and redistribution of site content without Mistral's consent. Therefore the plan must include a blocking asset-licensing checkpoint:

- ask Vanessa to coordinate an official pack from Mistral/marketing for the exact 37 product codes;
- obtain written permission to publish the images on this invitation and, if required, to remove backgrounds/convert formats;
- store approved files locally under `public/wines/`, with a source/permission manifest;
- do not hotlink, scrape into the repository, or treat Google Images/retailer pages as licensed sources.

A neutral development placeholder can keep backend and layout work moving, but it cannot satisfy D-13 or final acceptance. The most viable fallback is owner-produced photography of the exact bottles (with rights owned by the party) plus background removal; producer press kits are only usable when each kit's terms expressly cover this publication.

The existing roadmap's two-plan sketch is too coarse. A safer plan has a backend/catalog wave, an asset-preflight wave, a public catalog/deep-link/WhatsApp wave, and a home/RSVP integration plus responsive validation wave. Phase 4 and Phase 5 are being developed in parallel, so every plan touching shared files (`convex/schema.ts`, generated Convex types, `src/App.tsx`, `src/routes/Home.tsx`, `src/content/event.ts`, `src/index.css`) must re-read and merge the live file rather than replace it from an earlier snapshot.

## Scope and Locked Decisions

All decisions in `04-CONTEXT.md` are binding for planning:

- full catalog at `/presentes`;
- a header link, three fixed intermediate-price cards on the home page, and literal CTA **“Ver a carta completa”**;
- home cards deep-link to their exact product in `/presentes`;
- post-save RSVP CTA after every successful save, including an all-no response;
- three always-open price bands with top shortcuts and price-ascending stable order;
- all 37 old catalog records, including product code, description, tone and image reference;
- real transparent bottle photos over tone-specific halos;
- 3/2/1 grid;
- direct literal CTA **“Presentear pelo WhatsApp”** to Vanessa at `5511993709046`;
- click does not reserve or write anything;
- gifted cards remain in place, softened, with literal **“Já escolhido com carinho”** and no WhatsApp action;
- manual gift control remains Phase 6; real WebView testing remains Phase 7.

Do not restore the old `disponivel → reservado → presenteado` workflow, guest selector, 48-hour expiry, purchase confirmation button, or reservation writer. They conflict with the current v1 boundary.

## Existing Project Fit

### Verified catalog facts

The canonical source
`/Users/allanmesquitabrito/Documents/Site Sol 40 anos/sol-40-integrado/lib/wines.ts`
contains:

| Band | Count | Price span |
|---|---:|---:|
| `ate-200` | 13 | R$ 109,90–197,60 |
| `200-350` | 10 | R$ 203,00–313,01 |
| `350-500` | 14 | R$ 350,65–499,90 |
| **Total** | **37** | |

All 37 product codes and all 37 image paths are unique. `productCode` must remain a string because `0699230` has a significant leading zero. Prices are already integer centavos and must not be converted to floating-point reais in storage.

The old CSS and React code remain useful visual references for the dark green cellar, tone halos and card anatomy, but not for data flow. The prior grid was 4/2/1 and used a generic CSS bottle; Phase 4 explicitly changes these to 3/2/1 and real images.

### Existing reusable seams

- `src/main.tsx` already mounts `ConvexProvider` and `BrowserRouter`.
- `src/App.tsx` uses declarative routes; add `/presentes` without migrating router architecture.
- `Shell` already renders absolute internal links through React Router and shares desktop/mobile navigation.
- `src/content/event.ts` is the correct source for nav/copy/URLs.
- `Home.tsx` is a pure section composition; add one gift preview component without embedding catalog literals there.
- `FamilyForm` has an exact success boundary: `result.kind === "saved"` after the backend mutation resolves.
- `Button`/`buttonClassName` supports semantic route/external anchors.
- the app already enforces 44px targets, visible focus, AA-conscious colors and reduced motion.
- Convex tests use `convex-test`, a shared schema, and generated API types.

### Shared-file concurrency hazard

Phase 5 is running in parallel and is expected to add tables/routes/home/nav/styles too. Plans must explicitly preserve concurrent work:

- append the `wines` table to the current `defineSchema` object; never restore a captured Phase 3 version;
- regenerate Convex files only after both live schema additions are present;
- insert routes and sections into the live `App.tsx`/`Home.tsx`;
- extend, not overwrite, nav arrays and tokens;
- run full tests, not only Phase 4 filters, before handoff.

## Recommended Backend Architecture

### Domain validators

Create a small `convex/wineModel.ts` (or equivalent) that exports validators and types shared by schema/functions:

```ts
const wineCategoryValidator = v.union(
  v.literal("ate-200"),
  v.literal("200-350"),
  v.literal("350-500"),
)

const wineToneValidator = v.union(
  v.literal("rubi"),
  v.literal("dourado"),
  v.literal("rose"),
  v.literal("verde"),
)

const wineStatusValidator = v.union(
  v.literal("available"),
  v.literal("gifted"),
)
```

Use an explicit status union rather than a boolean: it gives Phase 6 a clear command/state contract and avoids divergent combinations such as `gifted: false` with a stale `giftedBy`.

### Schema

A suitable shape is:

```ts
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
  .index("by_product_code", ["productCode"])
  .index("by_category_price_code", [
    "categoryOrder",
    "priceCents",
    "productCode",
  ])
```

Planning notes:

- `categoryOrder` should be canonical (`0`, `1`, `2`) because lexical order of the category slugs is not presentation order.
- `by_category_price_code` produces deterministic placement. The product code is the explicit tie-breaker instead of `_creationTime`, so re-seeding cannot visually reorder equal-price cards.
- `by_product_code` supports idempotent reconciliation, future admin targeting and deep links. Convex indexes are not unique constraints; the seed/admin helper must enforce one logical row per code in a single mutation.
- `giftedBy` satisfies GIFT-01's “quem escolheu” future field. Do not expose it from the public query. Its exact admin input/clear behavior belongs to Phase 6.
- `giftedAt` and `updatedAt` support operations/auditing without resurrecting reservation.
- do not add reservation fields, buyer phone, invite ID or a public mutation in this phase.
- validate integers and bounds in the reconciliation helper (`Number.isSafeInteger(priceCents)`, positive price, exact known category/tone, nonempty bounded strings, safe root-relative image URL). Convex's `v.number()` alone does not express integer centavos.

### Public view

Return an explicit public DTO and `returns` validator:

```ts
{
  productCode,
  name,
  producer,
  description,
  tone,
  priceCents,
  category,
  imageUrl,
  status,
}
```

Do not return raw `Doc<"wines">`, `_id`, `giftedBy`, `giftedAt` or admin audit fields. The public list is intentionally readable, but buyer identity is not.

One public `listCatalog` query is sufficient for 37 small records. Read each category through `by_category_price_code` with its `categoryOrder` equality and concatenate the three ranges; this both documents the desired order and bounds each range. A second fixed `listFeatured` query may return only the three curated codes for the home subscription. Keeping featured codes with the canonical server catalog avoids scattering magic product codes through UI components.

The three suggested featured products should be chosen once from `200-350`, ideally spanning price/tone rather than simply taking the first three. The choice must remain fixed after status changes.

### Why `useQuery` is enough for live status

Convex's React `useQuery` creates a subscription and re-renders when read data changes; it also returns `undefined` during initial load. Therefore:

- `/presentes` uses `useQuery(api.wines.listCatalog)`;
- the home preview uses `useQuery(api.wines.listFeatured)`;
- when Phase 6 patches a wine to `gifted`, both mounted views update without polling or manual invalidation;
- explicitly render loading skeletons for `undefined` and an error boundary/retry state for query failure;
- do not add a WebSocket layer, local cache or optimistic “gifted” update—this phase has no public write.

Convex documents `useQuery` reactivity and consistent query views in its [React client guide](https://docs.convex.dev/client/react/overview). Index ordering behavior is documented in [Indexes](https://docs.convex.dev/database/reading-data/indexes/).

## Seed and Catalog Reconciliation

### Canonical source

Port the 37 records verbatim into a typed server-side constant such as `convex/wineCatalog.ts`. Add:

- `categoryOrder`;
- approved local `imageUrl`;
- no mutable status or buyer data in the constant.

The source constant should fail the type checker on a missing field and have tests for:

- exactly 37 records;
- 37 unique string product codes;
- 37 unique image URLs;
- `0699230` preserved;
- category counts 13/10/14;
- price/category boundaries;
- all prices positive safe integers;
- only the four allowed tones;
- every referenced asset present once the licensed pack lands.

### Internal-only reconciliation

Implement `ensureWineCatalog` as an `internalMutation`, runnable through the Convex dashboard/CLI. Internal functions are the right boundary because Convex clients cannot invoke them directly; see [Convex Internal Functions](https://docs.convex.dev/functions/internal-functions).

For each canonical record:

1. query `by_product_code`;
2. fail loudly if more than one row exists;
3. insert a missing row with `status: "available"` and no gift metadata;
4. patch changed **commercial fields only** on an existing row;
5. preserve `status`, `giftedBy`, `giftedAt` on every rerun.

After processing:

- report `created`, `updated`, `unchanged` and unexpected product codes;
- fail or return a clearly non-success result for unexpected/duplicate codes;
- do not silently delete unknown rows;
- assert the resulting canonical set count is 37.

The seed must be production-capable because the catalog is real content, not a development fixture. It does not need the secret HMAC fixture guard used by RSVP, but it must remain internal and require an explicit operator run on each isolated deployment (development, preview and production). `npx convex deploy` deploys functions/schema; it does not automatically invoke this mutation. Document exact commands and verify a second run is count/status stable. The CLI supports running internal functions; see [`npx convex run`](https://docs.convex.dev/cli/reference/run).

Do not overwrite gift state during deployment. That is the most important seed invariant for Phase 6 compatibility.

## Images: Legitimate Source and Delivery Gate

### What was verified

- The old `lib/wines.ts` references 37 `/wines/*.png` paths.
- No corresponding image assets were found in the old project; only API source files happened to live under directories whose path contained `wines`.
- Current sampled Mistral product pages match the canonical catalog:
  - [Il Pumo Primitivo 2023, code 38872, R$ 109,90](https://www.mistral.com.br/produto/il-pumo-primitivo-2023-san-marzano)
  - [Catena Malbec 2024, code 39778, R$ 222,69](https://www.mistral.com.br/produto/catena-malbec-2024-catena-zapata)
  - [Soalheiro Allo 2024, code 39467, R$ 187,56](https://www.mistral.com.br/produto/soalheiro-allo-2024-soalheiro)
  - [Sessantanni 2019, code 38863, R$ 485,90](https://www.mistral.com.br/produto/sessantanni-2019-san-marzano)
- Mistral warns that the vintage visible in an image may differ from the product's actual specified vintage, so image QA must compare the product code/title and not rely only on label pixels; see its [shipping/product-image notice](https://www.mistral.com.br/politica-de-frete).
- Most importantly, Mistral's [Terms of Use](https://www.mistral.com.br/termos-de-uso) state that site content is copyright-protected and prohibit copying, alteration and redistribution without consent.

### Required acquisition path

The preferred operational path is:

1. Give Vanessa/Mistral the exact 37-code list.
2. Request official front-facing bottle assets, ideally PNG/WebP with alpha and consistent crop.
3. Request written permission covering:
   - publication on the `Sol faz 40` invitation;
   - local hosting by the owners/Vercel;
   - resize/compression;
   - background removal or format conversion if source files are not already transparent.
4. Save evidence of source and permission in a non-public owner record; add a repository manifest containing source/contact/date/allowed transformations but no private conversation content.
5. Normalize copies to consistent canvas, color profile and maximum dimensions; preserve recognizable labels and never fabricate a vintage.
6. Commit local optimized assets and use root-relative paths. Do not hotlink Mistral's CDN: hotlinks are brittle, leak visitor requests to a third party, can change without the release and do not solve permission.

Mistral lists `info@mistral.com.br` and phone channels on its official site, but Vanessa is the agreed commercial contact and should coordinate the correct rights holder.

### Fallback order

1. Official Mistral/producer pack with express permission.
2. Owner-produced photos of the exact bottles, with owned publication rights and permitted label/trademark depiction, then locally remove the background.
3. Individually licensed producer media-kit images, recording terms per asset.

Do not use:

- Google/Bing image-search downloads;
- other retailer images;
- screenshots from Mistral;
- automated scraping before permission;
- AI-generated labels/bottles (not “real photos” and likely inaccurate);
- generic bottle illustration as final delivery.

### Asset acceptance contract

Before the final UI plan can be marked complete, every catalog row must have:

- exact product-code mapping;
- a real bottle photograph;
- transparent alpha (or explicitly approved background-removal derivative);
- no clipping at cap/base;
- consistent canvas and meaningful `alt` text;
- optimized local file with width/height known to prevent layout shift;
- source/permission recorded.

During development only, use one clearly marked neutral placeholder/fallback and an `img onError`/fallback treatment that preserves text and CTA. Do not let a broken image hide product name, price, status or WhatsApp action.

## Public Route, Cards and Deep Link

### Route and composition

Add `/presentes` to `src/App.tsx` and a dedicated nav set for this route. `Shell` can be reused, but the page's compact dark-green opening and catalog should own their visual surface. The page should include:

- compact editorial intro;
- short operational note: WhatsApp coordinates payment/delivery and clicking does not reserve;
- three 44px minimum band shortcuts;
- all three open sections;
- stable count labels;
- 3/2/1 card grid.

The home preview should query the same backend, render exactly the curated three in a dark-green section, and keep a gifted featured card visible rather than replacing it.

### Shareable product anchor

Use a URL fragment based on the stable product code:

```text
/presentes#vinho-39778
```

Recommended contract:

- pure helper `wineDomId(productCode)` validates/delimits the ID;
- each `<article>` owns `id={wineDomId(code)}` and `tabIndex={-1}`;
- a home card is a semantic `<Link to="/presentes#vinho-…">`;
- `/presentes` observes `location.hash` after the asynchronous catalog is rendered;
- if the code exists, call `scrollIntoView({ block: "center", behavior: reducedMotion ? "auto" : "smooth" })`, then focus with `{ preventScroll: true }`;
- apply a temporary or `:target` highlight that does not rely on color alone;
- if the code is unknown, leave the page at its normal start without error or unsafe selector construction.

Native fragment scrolling alone is unreliable here because the target does not exist while `useQuery` is loading. The post-query effect is therefore part of the feature, not optional polish. Product code, not name or database `_id`, is the durable URL key.

Test initial direct load, navigation from home, browser back/forward, refresh on the fragment, gifted target and unknown fragment. Keep the URL free of guest identity and reservation state.

## Safe WhatsApp Handoff

Centralize the number, message formatter and URL builder in a pure module such as `src/lib/wineWhatsApp.ts`:

```ts
const VANESSA_WHATSAPP = "5511993709046"

function buildWineWhatsAppUrl(wine: PublicWine) {
  const message =
    `Olá, Vanessa! Vim pelo convite da festa Sol faz 40 e gostaria de ` +
    `presentear a Sol com o vinho ${wine.name} — cód. ${wine.productCode}, ` +
    `no valor de ${formatBRL(wine.priceCents)}. Pode me orientar sobre o ` +
    `pagamento e a entrega?`

  return `https://wa.me/${VANESSA_WHATSAPP}?text=${encodeURIComponent(message)}`
}
```

Safety/correctness rules:

- phone is a compile-time constant and must match `/^\d{10,15}$/`; never accept it from a query string or wine row;
- interpolate only the public wine DTO;
- format centavos with one shared `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`;
- encode the **whole finished message once** with `encodeURIComponent`;
- test by parsing the URL and comparing `searchParams.get("text")` to the exact approved Unicode string;
- render as `<a target="_blank" rel="noopener noreferrer">`, not an imperative click handler;
- gifted cards render no WhatsApp anchor at all—visual disabling alone is insufficient;
- click performs no Convex mutation and makes no reservation claim;
- keep actual iOS/Android/Instagram WebView acceptance in Phase 7, as locked.

Unit cases should include accents, curly apostrophe, em dash, the leading-zero product code and BRL formatting. Also assert that malicious delimiter characters in a name remain inside the decoded `text` value and cannot create a second query parameter.

## RSVP and Navigation Integration

### Post-save RSVP CTA

`FamilyForm` already distinguishes a backend-confirmed save at:

```ts
case "saved":
```

Set a local `hasSavedSuccessfully` flag only in that branch and render a route link to `/presentes` near the success feedback. Do not:

- show it before the first successful save;
- infer success merely from `dirty === false` (initial/restored forms are also clean);
- show it on rate limit/network/invalid/session-expired outcomes;
- hide it because every guest answered “no”;
- couple it to attendance counts.

The existing toast expires after 4.5 seconds; the gifts CTA should remain in the form after a successful save for the rest of that mounted family session. Editing again may clear transient status, but should not erase the fact that a save succeeded.

### Navigation source

Extend `NAV_LINKS` with `/presentes`; add the appropriate entry to `RSVP_NAV_LINKS`; define a gifts-page nav set whose home fragment links are absolute. Keep labels and URLs centralized in `src/content/event.ts` (or a small `gifts.ts` content module imported there). Avoid hardcoded copies across `Shell`, route and preview.

## UI, Accessibility and Performance Constraints

- The compact hero must not reproduce the old 640–720px cellar hero; catalog/shortcuts should enter the first screen sooner.
- Add the cellar green as a named token (the old value is `#263f3e`) if it is reused; do not scatter hex values.
- Validate cream/peach/coral/status text against the actual dark surface at AA sizes.
- Gifted state must be conveyed by text and absent action, not opacity alone. Keep enough contrast despite “softened” styling.
- Every bottle image gets accurate alt text such as “Garrafa do vinho Catena Malbec 2024”; the halo is decorative.
- Reserve image aspect ratio/dimensions to avoid layout shift; use `object-contain`, `loading="lazy"` below the fold and `decoding="async"`.
- Do not lazy-load the three home preview images so aggressively that the section appears empty at entry; the catalog's later cards should be lazy.
- Keep the product text readable when an image fails.
- Band shortcuts and CTAs need 44px targets and visible focus.
- Use headings in document order and `aria-labelledby` per band.
- Respect `prefers-reduced-motion` for scroll/highlight transitions.
- Thirty-seven cards are small enough for one query/page; pagination or virtualization would harm band navigation and is unnecessary.

## Suggested Plan Shape

### Wave 0 — external asset preflight and test contracts

- send/prepare the exact 37-code asset request and permission checklist;
- define the asset manifest/acceptance gate;
- add pure catalog/WhatsApp/deep-link tests before UI;
- this wave can proceed in parallel with backend work, but final UI acceptance is blocked on approved assets.

### Wave 1 — Convex domain and idempotent catalog

- add validators/table/indexes while merging concurrent Phase 5 schema work;
- port the 37 records into the canonical typed constant;
- implement/test internal reconciliation and public DTO queries;
- run seed twice on the connected development deployment and prove status/count stability;
- record explicit preview/production seed commands for later deployment.

### Wave 2 — `/presentes`

- add route, content contract, query states and complete 3/2/1 catalog;
- implement deterministic sorting, shortcuts, gifted state and approved image/fallback pipeline;
- implement shareable fragment scroll/focus/highlight;
- implement and test exact `wa.me` URL/message;
- no public wine mutation.

### Wave 3 — home, RSVP and system validation

- add header/route navigation;
- add the fixed three-card dark home preview and deep links;
- add the persistent success-only RSVP CTA;
- validate live Convex updates (future admin-like internal patch fixture may be test-only);
- run full suite/build/Convex smoke plus browser viewport/accessibility/deep-link matrix.

This decomposition is safer than putting all UI and integration into one large “04-02” plan and exposes the image gate early.

## Anti-Patterns to Avoid

- Public `seed`, `setGifted` or reservation mutation.
- Reconciliation that writes `status: "available"` on every run.
- Returning buyer identity in the public catalog.
- Using `_id` or wine name as the shareable deep-link key.
- Sorting gifted products last or filtering them out.
- Duplicating a static frontend catalog that can drift from Convex.
- Calling `window.open` from a button when a semantic external anchor works.
- Building query text by string concatenation without whole-message encoding.
- Treating CTA click as a reservation or status change.
- Assuming native fragment scroll will work before async query data renders.
- Scraping/hotlinking retailer images or using generated labels as “real photos”.
- Replacing shared schema/router/home files while Phase 5 changes are live.

## Validation Architecture

### Test infrastructure

Use the existing Vitest + `convex-test` stack. Follow the Phase 3 pattern in which the deployable Convex harness receives test-only module imports by injection; do not import `import.meta.glob` from deployable Convex files.

Recommended files:

- `convex/wines.test.ts` — schema, catalog constant, reconciliation, public DTO/order/reactivity prerequisites;
- `src/lib/wineWhatsApp.test.ts` — exact number/message/encoding/price;
- `src/lib/wineDeepLink.test.ts` — safe product IDs/hash parsing;
- route/component tests only if the existing dependency set supports them; otherwise cover pure contracts automatically and reserve DOM behavior for the browser matrix rather than adding a new testing library casually.

### Nyquist matrix

| ID | Requirement | Behavior | Level | Automated command/evidence |
|---|---|---|---|---|
| T-04-01-A | GIFT-01 | `wines` accepts only known category/tone/status shapes; code stays string | schema/unit | `npx vitest run convex/wines.test.ts -t "schema"` |
| T-04-01-B | GIFT-01/02 | canonical constant has exactly 37 unique codes/images, counts 13/10/14 and valid integer centavos | unit | `npx vitest run convex/wines.test.ts -t "catalog"` |
| T-04-01-C | GIFT-02 | first reconciliation creates 37; second creates 0 and keeps count 37 | integration | `npx vitest run convex/wines.test.ts -t "reconciliation"` |
| T-04-01-D | GIFT-01/02/04 | reconciliation patches commercial changes but preserves `gifted`, `giftedBy`, `giftedAt` | integration | focused Convex test |
| T-04-01-E | GIFT-01 | duplicate product code fails closed; unexpected rows are surfaced, never silently deleted | integration | focused Convex test |
| T-04-01-F | GIFT-03/04 | public query returns 37 in band/price/code order and omits buyer/admin fields | integration | focused Convex test |
| T-04-01-G | GIFT-03/04 | featured query returns the same fixed three `200-350` codes and status changes do not replace/reorder them | integration | focused Convex test |
| T-04-02-A | GIFT-03 | URL path is exactly `/5511993709046`, decoded `text` equals approved copy with exact wine/code/BRL price | unit | `npx vitest run src/lib/wineWhatsApp.test.ts` |
| T-04-02-B | GIFT-03 | accents, em dash, apostrophes and delimiter-like input remain one encoded `text` parameter | unit/security | same focused test |
| T-04-02-C | GIFT-03/04 | available card has WhatsApp anchor; gifted card has literal status and no anchor | browser/DOM | browser inspection + link count |
| T-04-02-D | GIFT-04 | mounted home and catalog change to gifted after backend patch without reload/polling | real Convex/browser | two-view live update smoke |
| T-04-02-E | D-05 | direct fragment load, home click, refresh and back/forward focus/scroll/highlight exact product after query resolves | browser | browser matrix |
| T-04-03-A | D-03/04 | home shows exactly fixed three intermediate cards plus “Ver a carta completa” | browser | DOM/count/content assertion |
| T-04-03-B | D-06 | CTA appears only after `result.kind === "saved"` and for partial/attending/all-no; never on failure | unit/browser | save outcome matrix |
| T-04-03-C | D-15 | catalog is 1 column mobile, 2 tablet, 3 desktop with no horizontal overflow | visual/browser | 375/768/1280 viewport geometry |
| T-04-03-D | D-13 | 37 exact real transparent images pass existence/alpha/dimension/source manifest checks | asset script + human rights check | deterministic asset audit plus signed-off manifest |
| T-04-03-E | all | full regression, production build and real Convex function/type smoke pass with Phase 5 changes present | system | `npm test && npm run build && npx convex dev --once && git diff --check` |

### Asset audit

The asset audit should be deterministic and fail on:

- missing referenced file;
- duplicate mapping;
- zero/invalid dimensions;
- no alpha channel where transparency is required;
- file above the agreed byte/dimension budget;
- absent manifest entry.

Automated alpha detection proves file structure, not legal permission or product identity. A human checkpoint must compare each bottle to the code/title and confirm permission evidence before final acceptance.

### Real Convex smoke

After automated `convex-test`:

1. run `npx convex dev --once` to regenerate/check live schema/functions;
2. run the internal seed on development;
3. run it again and record `created: 0`, stable 37 count;
4. mark one test wine gifted through an internal/test seam, observe both subscriptions update, then restore it;
5. ensure no public wine mutation appears in generated `api`;
6. defer production seed execution until deploy ownership is explicit, but include it in the Phase 7/production checklist.

### Manual browser matrix

At minimum:

- widths 375, 768 and 1280;
- keyboard-only shortcuts/cards/CTA;
- reduced motion;
- deep link before query load and to a gifted wine;
- image failure fallback;
- query loading and failure presentation;
- live status update in home and `/presentes`;
- RSVP partial, all-yes/mixed and all-no successful saves;
- unknown fragment;
- external anchor attributes and exact destination inspected without sending a message.

Actual `wa.me` launches in Safari/Chrome and Instagram/Facebook WebViews remain Phase 7 (`LAUNCH-01`).

## Planning Decisions Still Needed

Only two external facts remain unresolved; neither should be guessed:

1. **Asset rights/source:** written Mistral/producer permission or owner-shot fallback.
2. **Exact featured trio:** choose and lock three codes from `200-350`; this is within Claude's discretion, but must be recorded once in the canonical catalog tests.

Neither requires changing the schema/API design. Backend, URL helper, layout scaffolding and placeholder development can proceed while the asset request is open, but D-13 and final Phase 4 verification cannot pass without legitimate real assets.

## Sources

### Local canonical sources

- `.planning/phases/04-carta-de-vinhos/04-CONTEXT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/ROADMAP.md`
- `.planning/PROJECT.md`
- `convex/schema.ts`, `convex/rsvps.ts`, `convex/rsvpInternal.ts`, `convex/rsvps.test.ts`
- `src/App.tsx`, `src/routes/Home.tsx`, `src/routes/Confirmar.tsx`
- `src/components/rsvp/FamilyForm.tsx`, `src/components/layout/Shell.tsx`
- `src/content/event.ts`, `src/components/ui/Button.tsx`, `src/index.css`
- previous project's `lib/wines.ts`, `app/convite/EventSite.tsx`, `app/globals.css`, `app/adega/page.tsx`

No project-local `CLAUDE.md`, `.claude/CLAUDE.md`, `AGENTS.md` or `SKILL.md` was present in the searched project paths.

### Primary external sources

- [Convex React: fetching, loading, reactivity and consistency](https://docs.convex.dev/client/react/overview)
- [Convex query caching/reactivity/consistency](https://docs.convex.dev/functions/query-functions)
- [Convex internal functions](https://docs.convex.dev/functions/internal-functions)
- [Convex indexes and deterministic index ordering](https://docs.convex.dev/database/reading-data/indexes/)
- [Convex CLI `run`](https://docs.convex.dev/cli/reference/run)
- [Mistral Terms of Use](https://www.mistral.com.br/termos-de-uso)
- [Mistral product image/vintage notice and official contact](https://www.mistral.com.br/politica-de-frete)
- sampled Mistral product pages linked in the image findings above

## Confidence

**High:** schema shape, separation of commercial/mutable fields, idempotent seed invariants, public DTO, Convex reactivity, deep-link strategy, `wa.me` construction, RSVP success seam, validation matrix and shared-file risks.

**Medium until externally resolved:** acquisition of all 37 approved transparent bottle photos. The technical pipeline is clear, but lawful availability cannot be inferred from files shown on a retailer website.

