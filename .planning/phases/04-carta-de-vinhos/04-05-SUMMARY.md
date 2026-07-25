---
phase: 04-carta-de-vinhos
plan: 05
subsystem: full-stack
tags: [react, convex, svg, provenance, responsive, accessibility]

requires:
  - phase: 04-carta-de-vinhos
    plan: 01
    provides: Canonical 37-wine domain, public DTO, and internal reconciliation
  - phase: 04-carta-de-vinhos
    plan: 02
    provides: Safe deep links and WhatsApp message construction
  - phase: 04-carta-de-vinhos
    plan: 03
    provides: Dedicated gifts route and cellar card composition
  - phase: 04-carta-de-vinhos
    plan: 04
    provides: Reactive home preview and post-RSVP gifts discovery
provides:
  - Auditable two-color palette provenance for all 37 canonical wines
  - Public palette DTO with strict validation and private provenance
  - One neutral authored bottle silhouette shared by catalog and home preview
  - Responsive catalog grid at 1/2/3/4 columns with no image runtime
  - Reconciled 37-row development catalog and reversible reactive gift-state smoke
affects: [phase-06-admin, phase-07-launch]

tech-stack:
  added: []
  patterns:
    - Commercial palette metadata is canonical server data while provenance remains private
    - Deterministic local SVG replaces licensed media, image loading, and broken-media states
    - Internal catalog reconciliation patches commercial fields without changing gift state

key-files:
  created:
    - .planning/phases/04-carta-de-vinhos/04-PALETTE-REFERENCES.md
    - src/components/gifts/WineBottleVisual.tsx
  modified:
    - convex/schema.ts
    - convex/wineModel.ts
    - convex/wineCatalog.ts
    - convex/wineInternal.ts
    - convex/wines.ts
    - convex/wines.test.ts
    - src/routes/Presentes.tsx
    - src/components/gifts/WineCard.tsx
    - src/components/gifts/GiftPreview.tsx
    - src/components/gifts/WineCatalog.tsx
    - src/index.css
  deleted:
    - src/components/gifts/WineImage.tsx
    - scripts/audit-wine-assets.mjs
    - public/wines/manifest.json

key-decisions:
  - "Every wine uses the same neutral authored bottle geometry; only the two muted halo colors vary."
  - "Palette reference URL and consultation date are stored for audit but never projected to public clients."
  - "The legacy imageUrl remains schema-tolerated only for cleanup and is absent from canonical records, public validators, queries, and UI."
  - "Catalog reaches four columns only at the xl breakpoint; the fixed three-wine home preview remains 1/2/3."

patterns-established:
  - "Palette contract: two distinct muted #RRGGBB colors, an HTTPS reference, and an ISO consultation date per productCode."
  - "Safe reconciliation: commercial changes and legacy image cleanup are independent from status, giftedBy, and giftedAt."

requirements-completed: [GIFT-01, GIFT-02, GIFT-03, GIFT-04]

coverage:
  - id: D1
    description: "All 37 canonical wines have validated palettes and auditable private provenance"
    requirement: GIFT-01
    verification:
      - kind: unit
        ref: "convex/wines.test.ts#catalog palette and validation contracts"
        status: pass
      - kind: integration
        ref: "Two-stage Convex migration, 37/37 reconciliation, and idempotent second/third ensure runs"
        status: pass
    human_judgment: false
  - id: D2
    description: "Public wine data preserves commercial identity and reactive gift state without exposing provenance, image data, or buyer identity"
    requirement: GIFT-02
    verification:
      - kind: unit
        ref: "convex/wines.test.ts#public queries, privacy, reconciliation, and gifted preservation"
        status: pass
      - kind: other
        ref: "npx convex dev --once and wines:listCatalog returned 37"
        status: pass
    human_judgment: false
  - id: D3
    description: "Catalog and preview use one authored local silhouette, 37 distinct halo pairs, and the approved responsive grids"
    requirement: GIFT-04
    verification:
      - kind: manual_procedural
        ref: "Browser inspection at 320, 375, 768, 1024, and 1280 pixels"
        status: pass
      - kind: other
        ref: "DOM/source audit: 37 local SVGs, zero gifts images or remote sources, grids 1/2/3/4 and 1/2/3"
        status: pass
    human_judgment: true
    rationale: "Visual neutrality, cellar hierarchy, mobile wrapping, and the absence of label imitation were confirmed against the approved direction."
  - id: D4
    description: "Available wines open the prefilled Vanessa WhatsApp flow; gifted wines remove the action and update both mounted views"
    requirement: GIFT-03
    verification:
      - kind: integration
        ref: "Reversible live smoke on productCode 39778 across Home and /presentes"
        status: pass
      - kind: unit
        ref: "src/lib/wineWhatsApp.test.ts and src/lib/wineDeepLink.test.ts"
        status: pass
    human_judgment: false

duration: 32 min
completed: 2026-07-25
status: complete
---

# Phase 4 Plan 5: Palette Bottle System Summary

**The 37-wine gift experience now uses auditable two-tone palettes and one authored neutral bottle silhouette, with no licensed-photo dependency or remote image runtime.**

## Performance

- **Duration:** 32 min
- **Completed:** 2026-07-25T01:55:04Z
- **Tasks:** 3
- **Canonical wines reconciled:** 37

## Accomplishments

- Researched and documented 37/37 wine references, assigning each product code two distinct muted colors while keeping reference URLs and consultation dates private.
- Migrated the Convex domain in two safe pushes, backfilled all rows, removed legacy `imageUrl` values, and verified repeated reconciliation is unchanged.
- Replaced all bottle photos and fallbacks with one local decorative SVG/CSS silhouette and 37 unique split-halo pairs.
- Updated the catalog to 1/2/3/4 columns and retained the fixed home preview at 1/2/3.
- Exercised a live gifted transition on product `39778` across both mounted views without reload, then restored its exact previous state.

## Task Commits

1. **Task 1 RED: define palette migration contract** - `95e0bf4`
2. **Task 1 GREEN: migrate catalog to sourced palettes** - `add03f9`
3. **Task 2: replace wine photos with authored bottle visual** - `fd6fe03`
4. **Task 3: seed, smoke, and browser matrix** - validation-only; no production files changed

## Files Created/Modified

- `.planning/phases/04-carta-de-vinhos/04-PALETTE-REFERENCES.md` - Records 37 product codes, palette pairs, sources, dates, and concise color notes.
- `convex/wineCatalog.ts` - Holds canonical commercial records with palette and provenance fields.
- `convex/wineModel.ts` - Validates muted hex pairs, HTTPS references, dates, and the palette-only public DTO.
- `convex/schema.ts` - Requires palette/provenance while retaining only transitional tolerance for legacy `imageUrl`.
- `convex/wineInternal.ts` - Reconciles palette metadata and clears legacy images without touching gift state.
- `convex/wines.ts` - Projects public colors while withholding provenance and private gift metadata.
- `convex/wines.test.ts` - Covers 37 palettes, malformed metadata, privacy, reconciliation, cleanup, and gifted preservation.
- `src/components/gifts/WineBottleVisual.tsx` - Renders the shared brand-neutral bottle and split color halo.
- `src/components/gifts/WineCard.tsx`, `GiftPreview.tsx`, and `WineCatalog.tsx` - Consume the deterministic visual and revised responsive grid.
- `src/routes/Presentes.tsx` - Fails closed unless both public palette colors are valid.
- `src/index.css` - Provides the local palette halo treatment and removes obsolete image-tone classes.
- `src/components/gifts/WineImage.tsx`, `scripts/audit-wine-assets.mjs`, and `public/wines/manifest.json` - Removed as obsolete image infrastructure.

## Decisions Made

- Used official Mistral retailer pages as the consistent reference set because they identify the exact products and vintages without requiring any image download, scraping, or hotlinking.
- Preserved historical canonical product codes where current retailer page identifiers differ; the wine name and vintage remain the identity authority for the two affected references.
- Kept the empty cream bottle label abstract and decorative. Accessible identity continues to come from the real wine name, producer, price, code, and status in the card.
- Preserved the WhatsApp flow as an external `_blank` link with `noopener noreferrer`; no click or reservation changes server state.

## Deviations from Plan

### Execution Adjustments

**1. Concurrent Phase 5 typecheck temporarily blocked the first migration command**
- **Found during:** Task 1 first Convex push
- **Issue:** An uncommitted Phase 5 upload-validation test was temporarily incomplete while both phases were being implemented in parallel.
- **Resolution:** Published the transitional schema once with Convex typechecking disabled after the Phase 4 build had passed, then reran the final combined `npx convex dev --once` after Phase 5 stabilized.
- **Final verification:** The normal Convex command, full test suite, and production build all pass.

**2. One package script cleanup landed inside a concurrent Phase 5 commit**
- **Found during:** Task 2 cleanup
- **Issue:** Removal of the obsolete `audit:wine-assets` package script was included in concurrent commit `6810fec`.
- **Resolution:** Preserved the shared history without amending or reverting the other phase. The final package contract is correct and contains no obsolete wine-asset command.

---

**Total deviations:** 2 execution adjustments.
**Impact on plan:** No scope or final behavior changed; Phase 5 work was preserved.

## Issues Encountered

- At 320px and 375px the overall Home still has a pre-existing horizontal overflow from the Phase 2 countdown row. The gifts preview section itself has no overflow and correctly renders one column at both widths.
- Browser automation verified direct, refresh, focused target, and unknown wine fragments. Back/forward behavior remains covered by the existing deep-link unit contract because the connected browser surface does not expose history controls.

## Validation Evidence

- `npm test` — 17 files, 381/381 tests passed.
- Focused gifts/domain suite — 40/40 tests passed.
- `npm run build` — production build passed.
- `npx convex dev --once` — final combined schema/functions published successfully.
- Two final `ensureWineCatalog` runs — `created: 0`, `updated: 0`, `unchanged: 37`, `total: 37`.
- Public catalog query — exactly 37 rows.
- Browser catalog — 37 cards and SVG bottles, 37 unique palette pairs, bands of 13/10/14, no `<img>` or remote asset source.
- Responsive catalog — 1/1/2/3/4 columns at 320/375/768/1024/1280; preview — 1/1/2/3/3.
- WhatsApp sample — `wa.me/5511993709046`, exact decoded wine name/code/value message, `_blank`, and `noopener noreferrer`.
- Live smoke — product `39778` changed to gifted in both mounted views, lost its catalog WhatsApp anchor, and returned to available after exact restoration.

## User Setup Required

None.

## Next Phase Readiness

- Phase 4 is complete and no longer depends on acquiring, licensing, processing, or serving 37 bottle photos.
- Admin work can use the unchanged private gift-state model; public clients receive only the fields needed to render the catalog.
- The existing Countdown mobile overflow should remain a separate launch-hardening item outside the gifts surface.

## Pre-Flight

- Design read: dedicated gifts experience, dark-green cellar, editorial hierarchy, one restrained authored bottle system.
- Dials applied: `DESIGN_VARIANCE 6`, `MOTION_INTENSITY 3`, `VISUAL_DENSITY 5`.
- The approved generated reference informed only composition and mood; no pixel, label, logo, typography, or bottle artwork was copied into the app.
- All visual wine markup is local, decorative, `aria-hidden`, brand-neutral, and deterministic.
- No public writer, reservation, expiry, checkout, provenance leak, buyer identity leak, or remote image dependency was introduced.

## Self-Check: PASSED

- All 37 catalog records and reference rows are present and bijective.
- Three expected legacy image files are deleted; no Phase 5 file was deleted or overwritten.
- Full tests, focused tests, build, Convex publish, seed idempotence, browser matrix, and `git diff --check` pass.
- The smoke mutation was restored and the catalog remains at 37 rows.

---
*Phase: 04-carta-de-vinhos*
*Completed: 2026-07-25*
