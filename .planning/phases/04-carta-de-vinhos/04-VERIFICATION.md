---
phase: 04-carta-de-vinhos
verified: 2026-07-25T01:58:56Z
status: passed
score: 3/3 must-haves verified
behavior_unverified: 0
human_verification:
  pending:

    - final_visual_acceptance_against_approved_cellar_direction
    - rsvp_post_save_callout_browser_matrix

deferred:

  - item: "Marcar/desfazer vinho como presenteado no dashboard"
    phase: "Phase 6 — ADMIN-06"

  - item: "Abrir o wa.me em WebViews/dispositivos reais"
    phase: "Phase 7 — LAUNCH-01"
---

# Phase 4: Carta de Vinhos — Verification Report

**Phase Goal:** Convidado escolhe um vinho e é levado ao WhatsApp do vendedor, sem duplicação entre convidados.  
**Verified:** 2026-07-25T01:58:56Z  
**Status:** human_needed  
**Score:** 3/3 roadmap success criteria verified

## Verdict

The implementation achieves all three programmatically verifiable Phase 4
success criteria. The public route receives exactly 37 canonical wines, an
available card builds the exact Vanessa `wa.me` handoff, and a gifted
transition preserves the card while removing its WhatsApp action. The final
palette revision is also substantive: 37 distinct two-color pairs have private
HTTPS provenance, one local neutral bottle silhouette is reused throughout,
and the old image runtime is absent.

The phase remains `human_needed`, not `gaps_found`, because two user-facing
acceptance checks have no completed human UAT artifact: final visual acceptance
of the implemented page and the browser matrix for the post-save RSVP callout.
The executor recorded responsive/browser and live-smoke evidence, so these are
acceptance checks rather than known code defects.

## Goal Achievement

### Observable Truths

Roadmap success criteria override the superseded photo-era truths in Plans
04-01–04-03.

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | The public gifts page displays the complete catalog of approximately 37 wines. | ✓ VERIFIED | `convex/wineCatalog.ts` contains 37 unique canonical rows; `listCatalog` fails closed unless all 37 unique rows are present; `Presentes` subscribes with `useQuery(api.wines.listCatalog)` and renders three open bands. The catalog integration test passes and the executor observed 37 cards in bands 13/10/14. |
| 2 | “Presentear pelo WhatsApp” opens Vanessa's correct `wa.me` destination with the complete prefilled message. | ✓ VERIFIED | `wineWhatsApp.ts` fixes destination `5511993709046`, formats BRL, and applies one `encodeURIComponent` to the complete approved message. `WineCard` renders that URL only for `available`, with `_blank` and `noopener noreferrer`. Value-level URL/message tests pass. |
| 3 | A wine marked gifted remains visible as already chosen and is no longer offered again. | ✓ VERIFIED | `WineCard` derives `gifted` from the reactive public DTO, renders “Já escolhido com carinho”, and omits the anchor. Convex integration tests exercise gifted preservation/projection; the executor's reversible live smoke observed both mounted views update without reload and restored the prior state. |

**Score:** 3/3 truths verified (0 behavior-unverified)

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `convex/schema.ts` | Wine persistence plus gift state | ✓ VERIFIED | `wines` has commercial fields, required palette/provenance, optional legacy `imageUrl`, status, private gift identity/time and deterministic indexes; Phase 5 tables remain present. |
| `convex/wineCatalog.ts` | Canonical 37-row seed | ✓ VERIFIED | 37 unique codes, 13/10/14 bands, leading-zero code preserved, 37 distinct palette pairs and 37 HTTPS references/dates. |
| `convex/wineModel.ts` | Closed domain/public contracts | ✓ VERIFIED | Category/tone/status validators, palette/HTTPS/date assertions and a public type omitting provenance. |
| `convex/wineInternal.ts` | Safe internal reconciliation and smoke seam | ✓ VERIFIED | Both writers are `internalMutation`; reconciliation is idempotent, clears legacy images and patches commercial fields without touching gift state. |
| `convex/wines.ts` | Privacy-safe reactive readers | ✓ VERIFIED | Explicit projection returns commercial data, two colors and status only; no raw document spread or public writer. |
| `convex/wines.test.ts` | Catalog, migration, privacy and state evidence | ✓ VERIFIED | Active integration/value assertions cover 37 rows, malformed palettes, idempotence, legacy cleanup, gifted preservation, internal-only writers and public DTO allowlist. |
| `.planning/phases/04-carta-de-vinhos/04-PALETTE-REFERENCES.md` | Auditable palette provenance | ✓ VERIFIED | 37 reference rows are bijective with the 37 catalog codes and record two colors, HTTPS source and date. |
| `src/routes/Presentes.tsx` | Dedicated public catalog route | ✓ VERIFIED | Shell route, compact intro, shortcuts, runtime DTO guard, reactive catalog, error isolation and safe fragment focus are substantive and wired. |
| `src/components/gifts/WineBottleVisual.tsx` | One local neutral bottle visual | ✓ VERIFIED | One decorative `aria-hidden` SVG geometry with empty cream label and data-driven split halo; no image or remote source. |
| `WineCard.tsx` / `WineCatalog.tsx` | Complete available/gifted catalog UI | ✓ VERIFIED | Three stable bands, data states, 1/2/3/4 grid, full commercial details and mutually exclusive available/gifted action states. |
| `GiftPreview.tsx` / `Home.tsx` | Fixed reactive home preview | ✓ VERIFIED | `listFeatured` feeds three fixed links; preview is after Countdown, while Phase 5 `MemoriesSection` remains mounted after DressCode. |
| `event.ts` / `FamilyForm.tsx` | Header and post-RSVP discovery | ✓ VERIFIED | Presentes is centralized in home/RSVP navigation; the callout flag is written only in `case 'saved'` and is never reset in the mounted family session. |

The generic artifact checker reports missing `WineImage.tsx`, the manifest and
the asset auditor. Their absence is intentional and required by the revised
04-05 contract. It also treats `convex/_generated/*` as a literal path even
though all five generated files exist. These are checker-shape limitations, not
implementation gaps.

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `wineCatalog.ts` | `wineInternal.ts` | `WINE_CATALOG` reconciliation | ✓ WIRED | Canonical commercial/palette fields are inserted or patched; state fields are separate. |
| `wineInternal.ts` | `wines.ts` | persisted status → explicit public projection | ✓ WIRED | Internal mutation changes status; public Convex queries expose only status and commercial DTO. |
| `Presentes.tsx` | `wines.listCatalog` | reactive `useQuery` | ✓ WIRED | Query result drives loading/ready/error catalog states and deep-link readiness. |
| `WineCard.tsx` | `wineWhatsApp.ts` | available-only semantic anchor | ✓ WIRED | URL helper output is used as the anchor `href`; gifted renders no anchor. |
| `wines.ts` | `WineBottleVisual.tsx` | public palette fields | ✓ WIRED | Colors flow through `PublicWine` to CSS custom properties; provenance does not cross the API. |
| `GiftPreview.tsx` | `wines.listFeatured` | reactive `useQuery` | ✓ WIRED | Fixed trio and gifted state are rendered from the same backend source. |
| `GiftPreview.tsx` | `/presentes` | validated fragment | ✓ WIRED | Each preview is one `Link` using `wineDomId`; no nested WhatsApp action. |
| `Home.tsx` / `FamilyForm.tsx` | public discovery | composition and saved branch | ✓ WIRED | Home header/preview and backend-confirmed RSVP success lead to `/presentes`. |

The generic key-link checker misses dotted generated API patterns and
`file.ts#symbol` pseudo-paths. Manual source tracing above confirms the live
connections.

## Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| GIFT-01 — `wines` schema with catalog, gifted status and chooser identity | ✓ SATISFIED | Explicit Convex table/validators/indexes; public/private separation; gift state tests. |
| GIFT-02 — seed of approximately 37 wines from the prior project | ✓ SATISFIED | Exactly 37 canonical records, commercial digest lock, 13/10/14 bands, idempotent reconciliation and 37-row live evidence. |
| GIFT-03 — public catalog with encoded WhatsApp handoff | ✓ SATISFIED | `/presentes`, full cards, exact Vanessa URL/message helper and value-level tests. |
| GIFT-04 — “já escolhido” after owner marking | ✓ SATISFIED | Gifted DTO/state stays in place, exposes literal label, removes action and updates reactively. The owner-facing writer UI is correctly deferred to ADMIN-06. |

**Coverage:** 4/4 Phase 4 requirements satisfied.

`REQUIREMENTS.md` and `ROADMAP.md` still show Phase 4/04-05 as pending. That is
tracking debt for the orchestrator's phase-completion update, not a product
gap.

## Decision Coverage

| Decisions | Status | Evidence |
|-----------|--------|----------|
| D-01–D-06 | ✓ IMPLEMENTED | Dedicated route, header link, fixed middle-band trio, reactive status, product fragment links and saved-only RSVP callout all exist. |
| D-07–D-09 | ✓ IMPLEMENTED | Three open bands and shortcuts; backend supplies category/price/code ordering unaffected by status. |
| D-10–D-16 revised visual contract | ✓ IMPLEMENTED / HUMAN ACCEPTANCE PENDING | Commercial details, one neutral SVG, 37 sourced palettes, 1/2/3/4 catalog, 1/2/3 preview and dark-cellar sections are present. Final aesthetic acceptance remains below. |
| D-17–D-20 | ✓ IMPLEMENTED | Direct Vanessa handoff with exact message, no confirmation form, reservation or state mutation on click; operational note is visible. |
| D-21–D-22 | ✓ IMPLEMENTED | Gifted remains in place with literal label and no action; Convex subscriptions and live smoke establish reactive propagation. |

No Context decision is orphaned. Administrative marking is explicitly Phase 6
and real-device/WebView WhatsApp verification is explicitly Phase 7.

## Privacy, Migration and Runtime Audit

- Public DTO allowlist excludes `_id`, `giftedBy`, `giftedAt`, `updatedAt`,
  `imageUrl`, `paletteReferenceUrl` and `paletteReferencedAt`; the integration
  test asserts the exact key set.

- Provenance exists only in canonical/server data and planning documentation.
  No gifts component, route or helper contains a Mistral URL, `<img>`,
  background image or remote fetch.

- `imageUrl` remains only as an optional schema migration field and in the
  legacy-cleanup test. `ensureWineCatalog` explicitly patches it to
  `undefined`.

- Reconciliation compares and patches commercial/palette fields separately
  from `status`, `giftedBy` and `giftedAt`; tests preserve a complete gifted
  state across repair and legacy cleanup.

- `WineImage.tsx`, `scripts/audit-wine-assets.mjs`,
  `public/wines/manifest.json` and `audit:wine-assets` are absent.

- Phase 5 isolation is intact in the final tree: `posts`,
  `postUploadReservations`, Memórias navigation and `MemoriesSection` remain.
  The concurrently modified `05-REVIEW.md` was not edited by this verification.

## Prohibition Checks

| Prohibition | Status | Evidence |
|-------------|--------|----------|
| No reservation, expiry, checkout or click mutation | ✓ VERIFIED | Gifts UI imports no mutation and contains no reserve/checkout path; the click is an external anchor. |
| No public wine writer or buyer identity leak | ✓ VERIFIED | Both writers are internal; public DTO exact-key test excludes private fields. |
| No copied/hotlinked/versioned label image runtime | ✓ VERIFIED | Local abstract SVG only; obsolete asset infrastructure absent; scoped source scan finds no remote image path. |
| No fidelity claim or branded label text | ✓ VERIFIED | The SVG label is an empty cream rectangle and the decorative group is `aria-hidden`. |
| No Phase 5 overwrite/deletion | ✓ VERIFIED | Combined schema, home and navigation retain the Phase 5 tables/section/link; full combined suite and build are green. |

## Test Quality Audit

| Test File | Linked Req | Active | Skipped | Circular | Assertion Level | Verdict |
|-----------|------------|--------|---------|----------|-----------------|---------|
| `convex/wines.test.ts` | GIFT-01, GIFT-02, GIFT-04 | 13 | 0 | No | Behavioral/value | Strong: real Convex-test transactions, exact DTO keys, ordering, idempotence and state restoration. |
| `src/lib/wineWhatsApp.test.ts` | GIFT-03 | 5 | 0 | No | Value | Strong: exact origin/path/message, delimiter isolation and single encoding. |
| `src/lib/wineDeepLink.test.ts` | GIFT-03 | 3 parameterized groups | 0 | No | Value/security | Strong: leading-zero round-trip and hostile-fragment matrix. |
| `src/content/event.test.ts` | GIFT-03 integration | active | 0 | No | Value | Exact combined Phase 4/5 navigation and callout copy. |

**Fresh focused verification:** 4 files, 60/60 tests passed.  
**Independent full-suite evidence supplied to verifier:** 17 files, 381/381 tests passed.  
**Production build:** passed.  
**Disabled requirement tests:** 0.  
**Circular expected-value writers:** 0.  
**Insufficient assertions on core requirements:** 0.

The commercial digest is a fixed independent oracle rather than generated
during the test. Palette provenance uses independent documented retailer URLs;
tests verify its structural contract and bijection, not the subjective color
choice.

## Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `src/content/gifts.ts` | Unused legacy `GIFTS_COPY.image` strings remain after `WineImage` deletion. | ⚠️ Warning | No runtime image path consumes them and they do not affect the goal; remove during routine cleanup to keep the final contract tighter. |

No blocker anti-pattern was found. Phase 4 production surfaces contain no
TODO/FIXME/placeholder implementation, log-only handler, unsafe selector,
public writer, remote label source or nested interactive control.

## Human Verification Required

### 1. Final cellar visual acceptance

**Test:** Open `/presentes` at approximately 375px and 1280px, then compare the
implemented cards with the approved dark-cellar direction. Inspect several
different palettes and one gifted card.

**Expected:** The page feels like the approved editorial cellar; all cards use
the same neutral unbranded bottle with an empty abstract label; palettes vary
without imitating branded label artwork; text remains readable and the catalog
is 1 column on mobile and 4 only at 1280px.

**Why human:** Visual neutrality, hierarchy, taste and final resemblance to an
approved art direction cannot be conclusively graded by source/tests.

### 2. RSVP post-save callout matrix

**Test:** In `/confirmar`, save partial, mixed and all-“não vai” responses.
After one successful save, edit again and induce a later recoverable failure;
then start a fresh mounted family session.

**Expected:** “Escolher um presente” is absent before a successful backend
save, appears after every successful attendance outcome, persists through
edits/later transient failure in that mounted session, and is absent in a
fresh session until its first success.

**Why human:** Source has the correct single write inside `case 'saved'`, but no
DOM-level test exercises the mounted-session visibility lifecycle.

## Deferred Items

| Item | Deferred To | Rationale |
|------|-------------|-----------|
| Owner marks/unmarks a wine through `/admin` | Phase 6 (`ADMIN-06`) | Phase 4 provides schema, internal state seam and reactive public behavior; admin auth/UI is a later phase by design. |
| Real `wa.me` app/WebView behavior | Phase 7 (`LAUNCH-01`) | URL/copy semantics are verified now; actual iOS/Android/Instagram/Facebook handoff is explicitly launch testing. |
| Existing Home countdown horizontal overflow at 320/375px | Phase 7 (`LAUNCH-02`) | Executor isolated it to the pre-existing Phase 2 countdown; the gifts preview itself has no overflow. |

Deferred items do not change the Phase 4 status.

## Gaps Summary

No implementation gap was found against GIFT-01–04 or the three roadmap
success criteria. Two final user-facing acceptance checks remain, so the
canonical result is `human_needed`.

---

_Verified: 2026-07-25T01:58:56Z_  
_Verifier: Codex (gsd-verifier)_
