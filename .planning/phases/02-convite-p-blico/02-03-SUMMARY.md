---
phase: 02-convite-p-blico
plan: 03
subsystem: ui
tags: [react, tailwind-v4, svg, css-keyframes, prefers-reduced-motion, hero]

# Dependency graph
requires:
  - phase: 02-convite-p-blico
    provides: "02-01's src/content/event.ts (HERO, SECTION_IDS) — every hero string and the section anchor"
provides:
  - "Hero.tsx — the full sunset composition (sky/sun/horizon, palms, animated sea, 4 text layers, 1 CTA)"
  - "PalmSvg.tsx — reusable palm silhouette component (side='left'|'right')"
  - "SeaWaves.tsx — reusable animated sea/golden-light component"
  - ".wave-band/.wave-band--mid/.wave-band--back/.golden-light classes + @keyframes wave-scroll/light-shimmer in src/index.css, gated by prefers-reduced-motion"
affects: [02-04, 02-05, 02-06, 02-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Inline SVG art components (PalmSvg, SeaWaves) with no state/effects — pure render, aria-hidden, decorative"
    - "Multi-stop CSS gradients as inline style objects (not achievable via plain Tailwind utilities), Tailwind arbitrary values for everything else"
    - "CSS keyframe animation gated by @media (prefers-reduced-motion: reduce) setting animation: none only — art stays visible as static"

key-files:
  created:
    - src/components/invite/PalmSvg.tsx
    - src/components/invite/SeaWaves.tsx
    - src/components/invite/Hero.tsx
  modified:
    - src/index.css

key-decisions:
  - "Golden-light div is positioned top-[54%] to bottom-0 relative to a full-hero-height SeaWaves wrapper (absolute inset-0), not clipped to a bottom strip, so it can visually span from directly under the sun (which sits at top-54% per the sky gradient) down to the hero's bottom edge as UI-SPEC requires"
  - "Palm left/right instances use distinct crown coordinates and frond curvature (not just a CSS scale-x-[-1] mirror of identical geometry) so the two palms don't read as the same tree pixel-mirrored"
  - "Hero CTA is a plain anchor (not the Button component) reusing the Button quiet-variant class recipe verbatim, since it navigates in-page (#programacao) rather than performing an action"

requirements-completed: [INVITE-01]

coverage:
  - id: D1
    description: "PalmSvg redraws both palm silhouettes as real SVG geometry (S-curve trunk + 6 individually-shaped fronds with midribs each), same old-CSS footprint, asymmetric between the two sides"
    requirement: "INVITE-01"
    verification:
      - kind: unit
        ref: "npm run build (tsc) — exit 0"
        status: pass
      - kind: other
        ref: "grep -c 'd=\"' PalmSvg.tsx >= 7 and no duplicate d values (sort | uniq -d = 0)"
        status: pass
    human_judgment: false
  - id: D2
    description: "SeaWaves renders three parallax wave bands (22s/30s/38s staggered translateX loops, doubled-tile paths) and a shimmering golden light path; prefers-reduced-motion sets animation: none on all four classes while the art stays visible as static"
    requirement: "INVITE-01"
    verification:
      - kind: unit
        ref: "npm run build — emitted CSS contains wave-scroll and light-shimmer"
        status: pass
      - kind: other
        ref: "grep -A8 prefers-reduced-motion src/index.css — no display:none/visibility:hidden/opacity:0 present"
        status: pass
    human_judgment: true
    rationale: "Visual confirmation that the three bands drift at visibly different speeds, the light path breathes, and — with OS reduce-motion on — everything is still visible and static, requires a real browser per the plan's own human-check step; not fully provable by grep alone."
  - id: D3
    description: "Hero composes sky (5-stop gradient + radial sun glow), sun, horizon, SeaWaves and both PalmSvg instances behind 4 text layers (eyebrow, Sol/40 anos lockup, tagline, corner meta) sourced from HERO, plus exactly one CTA and no RSVP link"
    requirement: "INVITE-01"
    verification:
      - kind: unit
        ref: "npm run build (tsc) — exit 0"
        status: pass
      - kind: other
        ref: "grep checks: single '<a ' anchor, 0 'confirmar presen' matches, all 6 gradient/sun hex colors present, tabIndex={-1} exactly once, min-h-[44px] present, HERO/SECTION_IDS import present"
        status: pass
    human_judgment: true
    rationale: "Layout correctness at 360/768/1440px, palm bleed without clipping copy, lockup stacking without overflow, corner-meta containment, CTA tap comfort, and the throttled-first-load font-swap backstop are all visual/interactive checks the plan itself defers to a human-check step."

duration: 11min
completed: 2026-07-24
status: complete
---

# Phase 02 Plan 03: Hero — Sky, Sun, Palms, Animated Sea Summary

**Full sunset hero built from three components: redrawn SVG palm silhouettes, a CSS-keyframe animated sea with golden light path (reduced-motion gated), and the sky/sun/horizon gradient composition carrying all four hero text layers plus one CTA.**

## Performance

- **Duration:** ~11 min
- **Started:** 2026-07-24T08:43:30-03:00 (previous plan's completion commit)
- **Completed:** 2026-07-24T08:53:45-03:00
- **Tasks:** 3
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments
- `PalmSvg` redraws the old six-identical-rotated-bars palm as real geometry: an S-curve trunk plus six individually-drawn leaf paths (each with its own midrib stroke), with the left and right instances using distinct crown coordinates and frond curvature so they don't read as the same tree mirrored
- `SeaWaves` ships three parallax wave bands (front/mid/back, 22s/30s/38s staggered `translateX` loops on doubled-tile paths so the loop never seams) plus a blurred-trapezoid golden light path shimmering from the sun to the hero's bottom edge
- `prefers-reduced-motion: reduce` sets `animation: none` on all four motion classes (`.wave-band`, `.wave-band--mid`, `.wave-band--back`, `.golden-light`) and nothing else — the art stays fully visible as static art, satisfying the hard D-08/P-01 requirement
- `Hero` composes the full sunset (5-stop sky gradient + radial sun glow, circular sun with amber box-shadow glow, two-band horizon) with `SeaWaves` and both `PalmSvg` instances behind the copy layer, and renders all four text layers (eyebrow, Sol/40 anos display lockup, tagline with the established `<em className="not-italic text-coral">` idiom, corner meta) plus exactly one CTA — all strings sourced from `HERO` in `src/content/event.ts`, zero hardcoded copy, zero RSVP link
- Phase 1's `@theme` design-system token block in `src/index.css` is untouched — the new keyframes/classes were appended after it

## Task Commits

Each task was committed atomically:

1. **Task 1: PalmSvg — redraw the palm silhouette as real SVG geometry** - `3f3d8f6` (feat)
2. **Task 2: SeaWaves plus the wave/light keyframes and the reduced-motion gate** - `e6ce1ac` (feat)
3. **Task 3: Hero — sky, sun, horizon and the four text layers** - `9dda3ff` (feat)

_No plan-metadata commit tracked separately — this SUMMARY's own commit closes the plan (sequential mode)._

## Files Created/Modified
- `src/components/invite/PalmSvg.tsx` - Palm silhouette, `side: 'left' | 'right'` prop, trunk + 6 fronds, decorative/aria-hidden
- `src/components/invite/SeaWaves.tsx` - Three parallax wave-band SVGs + golden light path, decorative/aria-hidden
- `src/index.css` - Appended `.wave-band`/`.wave-band--mid`/`.wave-band--back`/`.golden-light` classes, `@keyframes wave-scroll`/`light-shimmer`, and the `prefers-reduced-motion` gate; Phase 1 `@theme` block untouched
- `src/components/invite/Hero.tsx` - Full hero: sky/sun/horizon art, `SeaWaves`, both `PalmSvg` instances, 4 text layers, 1 CTA

## Decisions Made
- Golden-light element is positioned relative to a full-hero-height wrapper (`SeaWaves` root now `absolute inset-0`, not a bottom-anchored strip) so it can span from the sun's vertical position (`top-[54%]`, matching the sky's sun placement) down to the hero's bottom edge without being clipped by an undersized `overflow-hidden` container — this was corrected during Task 2 after the first draft clipped the beam too short
- Palm left/right variation is real geometry (different crown coordinates and frond curvature for at least two fronds), not relying solely on the CSS `scale-x-[-1]` mirror, per D-07's "the two sides are not pixel-identical" requirement
- Hero CTA renders as a plain `<a>` styled with the `Button` `quiet` variant's exact class recipe (not the `Button` component itself), since an in-page anchor is the correct semantic element for `#programacao` navigation

## Deviations from Plan

None — plan executed exactly as written. Two self-caught issues were fixed inline during authoring, before any commit, so they are not deviations from committed work:
- The first draft of `SeaWaves`'s golden-light positioning clipped the beam inside a 220px bottom strip; corrected to span from the sun's position to the hero bottom before the Task 2 commit.
- The first draft of `Hero.tsx`'s doc comment contained the literal strings `"Confirmar presença"` and `tabIndex={-1}` and the CTA anchor wrapped `<a` onto its own line, which self-tripped this task's own acceptance-criteria greps (RSVP-copy check, tabIndex exact-count check, single-anchor check). Reworded the comment and collapsed the anchor's opening tag onto one line before the Task 3 commit; verified all three greps pass afterward.

## Issues Encountered
None beyond the self-caught items above, resolved before committing.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `Hero` is a complete, self-contained component ready to be composed into `src/routes/Home.tsx` by a later plan in this phase (page composition is plan 02-06/02-07's job, per the pattern map)
- The hero's CTA links to `#programacao`, whose target section (`ProgramaSection`, `id={SECTION_IDS.programa}`) ships in plan 02-05 — no broken link exists yet because nothing currently mounts `Hero` on a route; this is expected sequencing, not a gap
- Automated verification (`npm run build`, `npx vitest run`, all acceptance-criteria greps) is green; the plan's own `<human-check>` items (reduced-motion visual confirmation, 360/768/1440px layout, throttled font-swap backstop) are deferred to the phase's `human_verify_mode: end-of-phase` per project config, not blocking this plan's completion

---
*Phase: 02-convite-p-blico*
*Completed: 2026-07-24*

## Self-Check: PASSED

All claimed files exist (`PalmSvg.tsx`, `SeaWaves.tsx`, `Hero.tsx`, `src/index.css`, this SUMMARY.md) and all four commits (`3f3d8f6`, `e6ce1ac`, `9dda3ff`, `1a2b56b`) are present in git history.
