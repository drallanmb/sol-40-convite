---
phase: 02-convite-p-blico
plan: 02
subsystem: assets
tags: [sips, static-assets, seo, open-graph, favicon, index-html]

# Dependency graph
requires:
  - phase: 01-funda-o-design-system-deploy
    provides: plum design token (#35192a), Vite SPA scaffold with /src/main.tsx and #root mount
provides:
  - "Five web-sized static assets under public/: dress-code-men.jpg, dress-code-women.jpg, sol-symbol.png, og.jpg, favicon.png"
  - "index.html head metadata: pt-BR title, description, full Open Graph set, favicon link, theme-color"
affects: [02-01 (DRESS.gallery src/width/height literals), 02-05, 02-07 (Shell.tsx topbar wordmark), 07 (owners' checklist — absolute og:url once domain is fixed)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Image compression via macOS `sips` (no new npm dependency) — resize with -Z/-z then re-encode JPEG quality via -s formatOptions"
    - "og:image kept root-relative (no og:url) until production domain is fixed; deferral recorded as an HTML comment with no literal URL scheme"

key-files:
  created:
    - public/dress-code-men.jpg
    - public/dress-code-women.jpg
    - public/sol-symbol.png
    - public/og.jpg
    - public/favicon.png
  modified:
    - index.html

key-decisions:
  - "Ported assets from /Users/allanmesquitabrito/Documents/Site Sol 40 anos/sol-40-integrado/public/ using the exact sips recipe and quality numbers specified in the plan (JPEG q50 for dress-code photos, q70 re-encode for OG, 176px resize for the wordmark) — all measured outputs matched the plan's pre-verified byte counts and dimensions exactly."
  - "og.png was NOT copied — the plan explicitly requires og.jpg (re-encoded JPEG) since a resize on the already-1200x630 PNG is a no-op and only re-encoding reduces weight."
  - "sol40-favicon.png was NOT copied — D-09/plan lists only favicon.png as the asset to port."

patterns-established:
  - "Static asset compression recipe (sips, no new deps) documented in 02-02-PLAN.md Task 1 — reusable if more old-project images need porting later."

requirements-completed: [INVITE-02, INVITE-04]

coverage:
  - id: D1
    description: "All five public/ assets ported and compressed to web weights (dress-code-men.jpg, dress-code-women.jpg, sol-symbol.png, og.jpg, favicon.png)"
    requirement: "INVITE-02"
    verification:
      - kind: other
        ref: "shell verification: ls all 5 files, find public -size +250k count=0, du -sk public <700, sips dims on og.jpg=1200x630 -> ASSETS_OK"
        status: pass
    human_judgment: false
  - id: D2
    description: "index.html carries pt-BR title, meta description, full Open Graph set (title/description/image/type/locale), favicon link and theme-color, with SPA mount/script intact and no external origin referenced"
    requirement: "INVITE-04"
    verification:
      - kind: other
        ref: "shell verification: npm run build exit 0, dist/index.html contains title + og:image + /og.jpg, index.html has zero http(s):// occurrences -> HEAD_OK"
        status: pass
    human_judgment: false
  - id: D3
    description: "Link-preview card renders correctly when the deployed URL is pasted into WhatsApp (sunset OG art + event title)"
    verification: []
    human_judgment: true
    rationale: "Requires a live deployed URL and visual inspection inside WhatsApp's own link-preview renderer — cannot be verified from source or build output alone. Deferred to end-of-phase human check per the plan's <verification> section."

duration: 10min
completed: 2026-07-24
status: complete
---

# Phase 2 Plan 2: Public Asset Port & index.html Metadata Summary

**Ported five old-project images to `public/` via macOS `sips` compression (604 KB total, 203 KB worst file) and gave `index.html` a full pt-BR title/description/Open Graph/favicon head.**

## Performance

- **Duration:** 10 min
- **Completed:** 2026-07-24T11:41:54Z
- **Tasks:** 2
- **Files modified:** 6 (5 created, 1 modified)

## Accomplishments

- All five assets D-09 requires are present under `public/` at the exact filenames the app references, each within the plan's pre-verified compression recipe.
- `index.html` now declares a descriptive pt-BR title, meta description, complete Open Graph set (title/description/image/type/locale), a favicon link and a plum theme-color, while the SPA's `#root` mount and `/src/main.tsx` module script remain untouched.
- `npm run build` succeeds and `dist/index.html` carries the new metadata.

## Task Commits

Each task was committed atomically:

1. **Task 1: Port and compress the five static assets into public/** - `94ac830` (feat)
2. **Task 2: Give index.html its title, description, Open Graph set and favicon** - `a23ed10` (feat)

**Plan metadata:** pending (this docs commit)

## Files Created/Modified

- `public/dress-code-men.jpg` - 203,090 bytes, 1120x1400, JPEG q50 (matches `DRESS.gallery[0]` width/height literals in `src/content/event.ts`)
- `public/dress-code-women.jpg` - 180,811 bytes, 895x1400, JPEG q50 (matches `DRESS.gallery[1]` width/height literals)
- `public/sol-symbol.png` - 12,103 bytes, 176x150, resized from ~220 KB source for the topbar wordmark
- `public/og.jpg` - 201,200 bytes, 1200x630, re-encoded JPEG q70 from the source `og.png` (no resize — source was already at target dimensions)
- `public/favicon.png` - 8,208 bytes, 64x64, copied as-is
- `index.html` - added title, meta description, `og:title`/`og:description`/`og:image`/`og:type`/`og:locale`, favicon `link`, `theme-color`; `<html lang="pt-BR">`, `#root` and `/src/main.tsx` script preserved

## Measured Asset Dimensions (for reconciliation with plans 02-01 / 02-05)

| File | Bytes | Dimensions |
|------|-------|-----------|
| `dress-code-men.jpg` | 203,090 | 1120 x 1400 |
| `dress-code-women.jpg` | 180,811 | 895 x 1400 |
| `sol-symbol.png` | 12,103 | 176 x 150 |
| `og.jpg` | 201,200 | 1200 x 630 |
| `favicon.png` | 8,208 | 64 x 64 |
| **Directory total** | **604 KB** (`du -sk`) | budget: <700 KB |

All measured values matched the plan's pre-verified numbers exactly (the recipe had already been run against the real source files during planning). `src/content/event.ts`'s `DRESS.gallery` `width`/`height` literals (1120x1400, 895x1400) already match these measured outputs — no discrepancy to flag.

## Decisions Made

- Followed the plan's exact `sips` recipe and quality numbers (JPEG q50 for both dress-code photos at 1400px long edge, PNG resize to 176px for the wordmark, JPEG q70 re-encode with no resize for OG). No quality/size adjustments were needed — every acceptance gate passed on the first run.
- `og.png` intentionally not copied — only `og.jpg` ships, matching Task 1/Task 2's contract.
- The `og:image` deferred-canonical-URL comment was written without any `http`/`https` literal, satisfying the plan's own no-external-origin acceptance gate on `index.html`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `og:image` grep-count acceptance criterion initially failed due to the deferral comment reusing the string "og:image"**
- **Found during:** Task 2 (index.html metadata) — post-edit verification
- **Issue:** The HTML comment documenting the deferred absolute `og:url` originally read `<!-- og:image is root-relative; ... -->`, which made `grep -c 'og:image' index.html` return `2` instead of the required `1`, failing the plan's own acceptance criterion.
- **Fix:** Reworded the comment to describe the deferral without repeating the literal string `og:image` (now reads "the preview image is root-relative; ..."), while keeping the same information and still avoiding any URL scheme per the plan's other constraint.
- **Files modified:** `index.html`
- **Verification:** `grep -c 'og:image' index.html` returns `1`; the matching line contains `/og.jpg`.
- **Committed in:** `a23ed10` (Task 2 commit — fixed before commit, so the commit reflects the corrected comment)

---

**Total deviations:** 1 auto-fixed (1 bug — self-inflicted acceptance-criterion collision, fixed before commit)
**Impact on plan:** No scope creep; fix was a one-word rewording caught by re-running the plan's own verification command before committing.

## Issues Encountered

None beyond the deviation above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `public/` now serves all five assets plans 02-01, 02-05 and 02-07 depend on (dress-code gallery, topbar wordmark, OG card, favicon).
- `index.html` is ready for a public link share; the only remaining gap is the absolute canonical `og:url`, explicitly deferred to Phase 7 once the production domain is fixed (owners' checklist).
- End-of-phase human check still pending per the plan's `<verification>` section: paste the deployed URL into WhatsApp and confirm the preview card renders the sunset art and event title (tracked as coverage `D3`, `human_judgment: true`).

## Self-Check: PASSED

All created files verified present on disk (5 public/ assets, index.html, this SUMMARY). Both task commits (`94ac830`, `a23ed10`) verified present in git history.

---
*Phase: 02-convite-p-blico*
*Completed: 2026-07-24*
