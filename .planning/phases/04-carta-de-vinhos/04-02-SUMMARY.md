---
phase: 04-carta-de-vinhos
plan: 02
subsystem: frontend-contracts
tags: [whatsapp, deep-links, asset-audit, security, vitest]

requires:
  - phase: 04-carta-de-vinhos
    plan: 01
    provides: Typed PublicWine DTO and canonical 37-record wine catalog
provides:
  - Exact single-encoded Vanessa WhatsApp handoff helpers
  - Digits-only stable wine deep-link helpers with leading-zero preservation
  - Canonical 37-slot pending asset manifest
  - Native Node preflight and strict image/provenance audit
affects: [04-03, 04-04, 04-05, phase-07-launch]

tech-stack:
  added: []
  patterns:
    - Pure URL contracts consume only a type-level public wine shape
    - Preflight validates development structure while strict mode gates final media

key-files:
  created:
    - src/lib/wineWhatsApp.ts
    - src/lib/wineWhatsApp.test.ts
    - src/lib/wineDeepLink.ts
    - src/lib/wineDeepLink.test.ts
    - scripts/audit-wine-assets.mjs
    - public/wines/manifest.json
  modified:
    - package.json

key-decisions:
  - "The WhatsApp URL is assembled from a constant Vanessa path and one encodeURIComponent call over the finished Unicode message."
  - "Wine fragments accept only the exact #vinho-{digits} grammar and preserve product codes as strings."
  - "The asset manifest records unknown external facts only as pending; strict approval requires provenance, identity confirmation, a local binary, exact dimensions, alpha, and byte budget."
  - "The audit uses Node built-ins only, so package-lock.json requires no Phase 4 delta."

patterns-established:
  - "Pure handoff: formatting, copy construction, URL construction, and fragment parsing have no DOM or Convex runtime access."
  - "Two-stage media gate: --preflight proves the canonical bijection; default strict proves rights metadata and binary constraints."

requirements-completed: [GIFT-02, GIFT-03]

coverage:
  - id: D1
    description: "Exact WhatsApp and hostile-safe deep-link contracts"
    requirement: GIFT-03
    verification:
      - kind: unit
        ref: "src/lib/wineWhatsApp.test.ts"
        status: pass
      - kind: unit
        ref: "src/lib/wineDeepLink.test.ts"
        status: pass
      - kind: other
        ref: "npx vitest run src/lib/wineWhatsApp.test.ts src/lib/wineDeepLink.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "Canonical 37-slot manifest with preflight pass and fail-closed strict audit"
    requirement: GIFT-02
    verification:
      - kind: other
        ref: "npm run audit:wine-assets -- --preflight"
        status: pass
      - kind: other
        ref: "npm run audit:wine-assets (expected pending rejection)"
        status: pass
      - kind: other
        ref: "npm test && npm run build && git diff --check"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-07-25
status: complete
---

# Phase 4 Plan 2: WhatsApp, Deep Links, and Asset Gate Summary

**Exact Vanessa handoff and safe wine fragments backed by a 37/37 media preflight whose strict mode remains blocked until licensed bottle assets are real**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-25T00:55:00Z
- **Completed:** 2026-07-25T00:59:46Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Froze the complete Unicode WhatsApp message, canonical Vanessa destination, shared BRL formatting, and exactly-once query encoding in pure tested helpers.
- Added a digits-only fragment contract that preserves the leading-zero product code and rejects empty, suffixed, encoded-selector, markup, and other hostile hashes before any DOM lookup.
- Established a 37/37 canonical pending manifest plus dependency-free preflight/strict audit for rights metadata, product identity, local existence, alpha, exact `720 × 960` dimensions, and the 300KB budget.

## Task Commits

Each task was committed with its TDD RED and GREEN gates:

1. **Task 1: Criar contratos puros de WhatsApp e deep link**
   - `18813fa` (test)
   - `dbdac06` (feat)
2. **Task 2: Criar manifest 37/37 e auditor preflight/strict**
   - `50f7da9` (test)
   - `3b0c0a1` (feat)

## Files Created/Modified

- `src/lib/wineWhatsApp.ts` - Shared BRL formatter, exact approved message, and single-encoded Vanessa URL.
- `src/lib/wineWhatsApp.test.ts` - Destination, pathname, decoded copy, delimiter isolation, and encoding tests.
- `src/lib/wineDeepLink.ts` - Stable DOM ID and safe fragment parser.
- `src/lib/wineDeepLink.test.ts` - Leading-zero round-trip and hostile-fragment matrix.
- `scripts/audit-wine-assets.mjs` - Canonical bijection, provenance, PNG/WebP, alpha, dimensions, and budget audit.
- `public/wines/manifest.json` - All 37 canonical code/path slots, explicitly pending.
- `package.json` - `audit:wine-assets` command only; existing Phase 5 dependencies were preserved.

## Decisions Made

- Kept product codes as strings end-to-end so `0699230` cannot lose its leading zero.
- Used a single `encodeURIComponent` call on the complete message instead of piecemeal query construction, preventing delimiter injection.
- Required explicit `localHostingApproved`, `productIdentityConfirmed`, dated provenance, source/contact, and allowed transformations before strict media acceptance.
- Used native PNG/WebP metadata parsing rather than adding an image or DOM dependency.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - final licensed bottle files and provenance remain the planned blocking human gate in 04-05, not setup for this plan.

## Next Phase Readiness

- Plan 04-03 can consume the WhatsApp and deep-link helpers without duplicating copy or validation.
- Plan 04-05 can replace pending entries with reviewed provenance and run the same command in strict mode.
- Phase 5 package dependencies and active memory UI files were not staged, altered, or included in any 04-02 commit.

## Self-Check: PASSED

- All seven key files exist; no package-lock delta was needed.
- Four TDD/task commits are present.
- Focused contracts: 23/23 tests passing.
- Full suite: 334/334 tests passing.
- Asset preflight: 37 unique canonical mappings, 37 pending.
- Strict audit: correctly exits nonzero on pending.
- Production build and `git diff --check`: passing.
- ASVS L1 review: no high-severity finding; phone destination is constant, query text is encoded once, fragments are digits-only, and helpers expose no DOM, mutation, or buyer identity.

---
*Phase: 04-carta-de-vinhos*
*Completed: 2026-07-25*
