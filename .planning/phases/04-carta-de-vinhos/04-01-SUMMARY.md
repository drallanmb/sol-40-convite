---
phase: 04-carta-de-vinhos
plan: 01
subsystem: database
tags: [convex, catalog, privacy, reactive-queries, vitest]

requires:
  - phase: 03-rsvp
    provides: Convex schema, internal-function conventions, and deploy-safe test harness pattern
provides:
  - Canonical typed catalog with all 37 wine records
  - Additive wines schema with separate commercial and gift-state fields
  - Idempotent internal reconciliation and reversible operational smoke mutation
  - Privacy-safe public catalog and featured queries
affects: [04-02, 04-03, 04-04, 04-05, phase-06-admin]

tech-stack:
  added: []
  patterns:
    - Canonical server catalog reconciled without overwriting mutable state
    - Explicit public DTO projection from Convex documents
    - Operational smoke mutation returns its exact restoration snapshot

key-files:
  created:
    - convex/wineModel.ts
    - convex/wineCatalog.ts
    - convex/wineInternal.ts
    - convex/wines.ts
    - convex/wineTest.ts
    - convex/wines.test.ts
  modified:
    - convex/schema.ts
    - convex/_generated/api.d.ts

key-decisions:
  - "Catalog ordering reads each category index in the approved category tuple, then relies on price and product-code index order."
  - "Public queries fail closed when the canonical set is incomplete or duplicated and never return raw Convex documents."
  - "The smoke seam is internal-only and returns the exact prior gift state so restoration never assumes the initial status."

patterns-established:
  - "Commercial reconciliation: patch only canonical commercial fields, preserving status, giftedBy, and giftedAt."
  - "Public projection: construct every PublicWine key explicitly; never spread persisted documents into public returns."

requirements-completed: [GIFT-01, GIFT-02, GIFT-03, GIFT-04]

coverage:
  - id: D1
    description: "Typed Convex wine domain, additive schema, and byte-faithful 37-record canonical catalog"
    requirement: GIFT-01
    verification:
      - kind: unit
        ref: "convex/wines.test.ts#catalog wines and schema wines"
        status: pass
      - kind: other
        ref: "npx vitest run convex/wines.test.ts -t 'schema|catalog'"
        status: pass
    human_judgment: false
  - id: D2
    description: "Idempotent internal reconciliation plus reversible smoke gift-state transition"
    requirement: GIFT-02
    verification:
      - kind: integration
        ref: "convex/wines.test.ts#wine reconciliation and wine smoke seam"
        status: pass
      - kind: other
        ref: "npx vitest run convex/wines.test.ts -t 'reconciliation|smoke seam|internal only'"
        status: pass
    human_judgment: false
  - id: D3
    description: "Stable privacy-safe public catalog and fixed featured wine queries"
    requirement: GIFT-03
    verification:
      - kind: integration
        ref: "convex/wines.test.ts#wine public queries"
        status: pass
      - kind: other
        ref: "npm test && npm run build"
        status: pass
    human_judgment: false

duration: 7min
completed: 2026-07-25
status: complete
---

# Phase 4 Plan 1: Convex Wine Tracer Summary

**Canonical 37-wine Convex catalog with state-preserving reconciliation, reversible internal smoke controls, and privacy-safe reactive readers**

## Performance

- **Duration:** 7 min
- **Started:** 2026-07-25T00:47:02Z
- **Completed:** 2026-07-25T00:54:28Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Ported all 37 canonical records byte-for-byte, preserving the leading-zero code, unique images, fixed featured trio, and 13/10/14 price-band distribution.
- Added internal-only reconciliation and smoke operations that preserve or restore exact gift state and fail closed on duplicates.
- Exposed stable public catalog and featured projections without IDs, buyer identity, timestamps, or public writers.

## Task Commits

Each task was committed with its TDD RED and GREEN gates:

1. **Task 1: Define model, canonical catalog, and additive schema**
   - `f475fd6` (test)
   - `54481dd` (feat)
2. **Task 2: Implement reconciliation and reversible internal smoke seam**
   - `637cb67` (test)
   - `00173a8` (feat)
3. **Task 3: Close the tracer with public queries and combined generation**
   - `16d45a4` (test)
   - `3b2d1a6` (feat)

## Files Created/Modified

- `convex/wineModel.ts` - Closed validators, shared types, limits, category order, and public DTO validator.
- `convex/wineCatalog.ts` - Canonical 37-record catalog and fixed featured tuple.
- `convex/schema.ts` - Additive wines table and deterministic lookup/order indexes.
- `convex/wineInternal.ts` - Internal reconciliation and reversible operational smoke writers.
- `convex/wines.ts` - Public catalog and featured readers with explicit projection.
- `convex/wineTest.ts` - Deploy-safe injected Convex test harness.
- `convex/wines.test.ts` - Catalog, schema, lifecycle, privacy, order, and namespace coverage.
- `convex/_generated/api.d.ts` - Combined generated API declarations for Phase 4 and existing Phase 5 modules.

## Decisions Made

- Queried the three categories in the approved tuple order because category slugs are not lexically ordered for presentation; each compound-index range supplies price/code ordering.
- Filtered public catalog reads to canonical product codes and fail closed unless the complete unique 37-item set is present.
- Kept all write operations under `internalMutation`; public clients receive only the two read queries.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed Node-only imports from the Convex test module**

- **Found during:** Task 3 (combined Convex code generation)
- **Issue:** Convex typechecking excludes Node globals, so `node:crypto` and `node:fs` imports blocked generated bindings.
- **Fix:** Replaced hashing with Web Crypto and source inspection with compile-time `RegisteredMutation<'internal'>` plus `@ts-expect-error` public-API assertions.
- **Files modified:** `convex/wines.test.ts`
- **Verification:** `npx convex codegen`, focused tests, full suite, and build all pass.
- **Committed in:** `3b2d1a6`

---

**Total deviations:** 1 auto-fixed (1 blocking).
**Impact on plan:** Test intent is unchanged and the replacement strengthens compatibility with the Convex runtime typecheck.

## Issues Encountered

- The first combined codegen correctly exposed the Node-only test imports; the test was made runtime-portable and codegen then completed successfully.

## User Setup Required

None - no new environment variables or external service configuration required.

## Next Phase Readiness

- Plans 04-02 and 04-03 can consume the generated public readers and canonical product codes.
- The 37 licensed final bottle images remain governed by the planned asset gate in 04-05; this backend tracer does not treat placeholders as final assets.
- No Phase 5 table, index, function, or generated module was removed or overwritten.

## Self-Check: PASSED

- All eight key files exist.
- Six TDD/task commits are present.
- `convex/wines.test.ts`: 15/15 passing.
- Full suite: 305/305 passing.
- Production build and `git diff --check`: passing.
- Generated bindings include both Phase 4 wine modules and existing Phase 5 post modules.
- ASVS L1 review: no high-severity finding; buyer identity is excluded from public DTOs and no public wine writer exists.

---
*Phase: 04-carta-de-vinhos*
*Completed: 2026-07-25*
