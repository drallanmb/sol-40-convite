---
phase: 02-convite-p-blico
verified: 2026-07-24T12:55:45Z
status: human_needed
score: 11/11 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Countdown four-state visual read (Countdown.tsx + CountdownRail.tsx)"
    expected: "At a normal future date: four tiles counting down with correct pt-BR singular/plural labels. At exactly 1 day/hour/minute/second remaining: every label reads singular. At 17/10/2026 09:00 (Aracaju local): 'É HOJE' heading, no digits. At 17/10/2026 20:00: 'TÁ ROLANDO' heading, no digits. At a date ~27 years past EVENT_END: four-digit day count, no clipping/overlap in either the full tiles or the compact rail."
    why_human: "Requires manipulating the system/injected clock and visually reading rendered digits and layout at multiple widths — not derivable from static grep/type checks alone (though the underlying state-machine logic is behaviorally proven by the passing `-t offset/phase/depois/pluralize` vitest filters)."
  - test: "Reduced-motion hero (Hero.tsx / SeaWaves.tsx)"
    expected: "With OS 'reduce motion' on: waves and golden light path are fully visible and correctly positioned, nothing moves. With it off: the three wave bands drift at visibly different speeds and the light path breathes."
    why_human: "Visual motion behavior under a media-query preference toggle."
  - test: "Hero responsive layout at 360px / 768px / 1440px"
    expected: "Sun centered above a clean horizon; both palms bleed off their edges without clipping the copy; Sol/40 anos lockup stacks without horizontal overflow; corner meta stays inside viewport; CTA comfortably tappable at 360px; webfont swap does not visibly jump the display lockup."
    why_human: "Visual layout and font-swap CLS assessment across breakpoints."
  - test: "Local section map reveal and network behavior (LocalSection.tsx)"
    expected: "Before tapping 'Ver mapa': zero requests to any Google origin (devtools Network tab). After tapping on throttled Slow 3G: no layout shift in sections below while the iframe paints. Venue card stays legible over the loaded map; both address lines show 'Matapuã' correctly; route link opens Google Maps in a new tab. With a tracking blocker or offline, the route link still gives a working way to the venue."
    why_human: "Network-tab inspection and third-party embed behavior are runtime/browser-only checks."
  - test: "Guide + hotel external links (GuideSection.tsx)"
    expected: "All four Tripadvisor links and all three hotel links resolve to a live page for the right place in a real browser (Tripadvisor blocks automated fetchers with 403, so this cannot be curl-checked). Grid reads as an intentional layout at 1440px/768px/360px with no orphaned border edge and no stranded single card; longest real place/hotel names wrap without horizontal scroll at 360px."
    why_human: "External URL liveness against a bot-blocking host, plus visual grid layout assessment."
  - test: "Programa section responsive read (ProgramaSection.tsx)"
    expected: "At 360px and 1440px: all seven blocks render in order, times align into a column from the small breakpoint up, emoji title and longest description wrap without horizontal scroll, hero CTA scrolls the heading below the sticky topbar (not under it)."
    why_human: "Visual layout/scroll-offset check across breakpoints."
  - test: "Dress-code gallery CLS + alt-text fallback (DressCodeSection.tsx)"
    expected: "On throttled Slow 3G, the two photo cells are reserved at correct aspect ratio before decode (no shift below them). At 360px the copy column and gallery stack cleanly; callout is legible against its accent background. With images blocked in devtools, descriptive alt text appears in their place."
    why_human: "Network-throttled CLS observation and blocked-image fallback are runtime/visual checks."
  - test: "Topbar scroll-condense + hamburger + skip link + rail slide (Shell.tsx)"
    expected: "At 1440px scrolling down: topbar gains blurred cream chrome shortly after leaving the hero; countdown rail slides in only once the countdown section has scrolled past, and both reverse on scroll-up. At 360px in the pre-event state with rail revealed: topbar carries wordmark + hamburger + rail on one line with the wordmark fully visible. Hamburger is keyboard-tabbable, closes on nav-entry tap, and the target section lands below the sticky chrome. Skip link is the first focusable element and moves focus into main content. `/404` still renders with no topbar nav."
    why_human: "Scroll-driven visual chrome transitions and keyboard-navigation flow are runtime/browser checks."
  - test: "Full-page composition order and footer (Home.tsx + Shell.tsx)"
    expected: "At 360px/768px/1440px, scrolling top to bottom: the six sections appear in the locked order (hero, countdown, local/guide, programa, traje) with no gap, no empty block, no placeholder. Each of the three topbar nav entries lands on a real section with its heading clear of the sticky chrome. Footer reads the event line with corrected spelling. Nothing on the page offers RSVP, gifts or memory-wall actions."
    why_human: "Full-page visual/interaction walkthrough."
---

# Phase 2: Convite Público Verification Report

**Phase Goal:** Página pública do convite completa e responsiva, ainda sem interações de backend. (Hero with sun + correct countdown at fixed -03:00 offset regardless of viewer timezone; programa, dress code, and local/Aracaju map + city guide sections; working topbar and footer; usable on mobile.)
**Verified:** 2026-07-24T12:55:45Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Guest sees hero with sun and correct countdown, offset -03:00, correct in any timezone (INVITE-01) | ✓ VERIFIED | `src/lib/countdown.ts#getEventState` reads all boundary instants from `-03:00`-qualified strings in `src/content/event.ts`; `npx vitest run src/lib/countdown.test.ts -t "offset"` (2 passed), `-t "phase"` (6 passed), `-t "depois"` (2 passed) actually executed and passed, proving the timezone-independence and 4-phase boundary behavior at runtime, not just by presence. `Hero.tsx` renders the sun/sky/horizon/palms/waves art and is composed in `Home.tsx`; `Countdown.tsx`/`CountdownRail.tsx` both consume `useCountdown()` → `getEventState`. |
| 2 | Programa, dress code, and local/Aracaju map + city guide sections appear (INVITE-02, INVITE-03) | ✓ VERIFIED | `ProgramaSection.tsx` renders `PROGRAMA` (7 blocks, `grep` confirms all 7 time literals present); `DressCodeSection.tsx` renders `DRESS` (intro, 2 rule blocks, callout, 2-photo gallery with real, sips-confirmed pixel dimensions 1120×1400 / 895×1400 matching the declared width/height); `LocalSection.tsx` renders `VENUE` with click-to-reveal Google Maps iframe and always-visible route link; `GuideSection.tsx` renders `GUIDE` (4 cards, `grep -c tripadvisor` = 4) and `HOTELS` (3 entries). All four are composed into `Home.tsx`. |
| 3 | Topbar and footer work, page usable on mobile (INVITE-04) | ✓ VERIFIED (code-level) | `Shell.tsx` implements wordmark, 3 `NAV_LINKS`-driven nav entries, mobile hamburger with `aria-expanded`/`aria-controls`, scroll-condensed chrome, and the `CountdownRail` slot; footer renders wordmark + event line with corrected "Matapuã" spelling. `Home.tsx` composes `Shell` with `NAV_LINKS` and all six sections. Mobile-first utility classes (`clamp()`, `sm:`/`md:`/`lg:` breakpoints, 44px min-tap-targets) are used throughout every section component. Visual/interactive confirmation of "usable on mobile" is a human-verification item (see below) per `human_verify_mode: end-of-phase`. |

**Score:** 3/3 roadmap truths verified at the code level; 11/11 plan-level must-haves verified; 9 items deferred to human verification per project's `end-of-phase` mode (visual/interactive/browser-only checks).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/content/event.ts` | Single source of all invite copy/dates/URLs | ✓ VERIFIED | All exports present (EVENT_DATE/END/DAY_START, HERO, COUNTDOWN_COPY, PROGRAMA, DRESS, VENUE, GUIDE, HOTELS, NAV_LINKS, SECTION_IDS); imported by every downstream component |
| `src/lib/countdown.ts` | Timezone-safe state machine | ✓ VERIFIED | `getEventState`, `toParts`, `pluralizeUnit` present, exact signatures match plan, tests pass |
| `src/hooks/useCountdown.ts` | 1s-tick hook | ✓ VERIFIED | Exactly 1 `setInterval`, ≥1 `clearInterval`, seeds via lazy initializer |
| `src/components/invite/Hero.tsx` | Sunset hero composition | ✓ VERIFIED | Sky/sun/horizon gradients, SeaWaves, 2×PalmSvg, 4 text layers, 1 CTA — all present and wired |
| `src/components/invite/PalmSvg.tsx` | Real SVG palm geometry, asymmetric sides | ✓ VERIFIED | Distinct path data for `left` vs `right` (trunk curvature, frond origin point, 6 fronds each with midrib stroke) — confirmed by direct file read, not just mirrored via `scale-x` |
| `src/components/invite/SeaWaves.tsx` | Animated waves + reduced-motion gate | ✓ VERIFIED | 3 wave bands + golden light, `@keyframes wave-scroll`/`light-shimmer` and `@media (prefers-reduced-motion: reduce)` block present in `src/index.css` |
| `src/components/invite/Countdown.tsx` | Full 4-state section | ✓ VERIFIED | Branches on `COUNTDOWN_COPY[phase].showTiles`, uses `pluralizeUnit`, reads `useCountdown()` |
| `src/components/invite/CountdownRail.tsx` | Compact rail | ✓ VERIFIED | Same state source, `revealed` prop controlled, no own scroll listener |
| `src/components/invite/ProgramaSection.tsx` | 7-block programa | ✓ VERIFIED | Maps `PROGRAMA` array, id from `SECTION_IDS.programa` |
| `src/components/invite/DressCodeSection.tsx` | Dress code + gallery | ✓ VERIFIED | Maps `DRESS.rules`/`.gallery`, real aspect-ratio reservation, lazy+async images |
| `src/components/invite/LocalSection.tsx` | Venue card + click-to-load map | ✓ VERIFIED | `useState` gates iframe mount; always-visible route link outside conditional |
| `src/components/invite/GuideSection.tsx` | 4 guide cards + 3 hotels | ✓ VERIFIED | Maps `GUIDE`/`HOTELS`, all external links `target="_blank" rel="noreferrer"` |
| `src/components/layout/Shell.tsx` | Topbar + footer + rail | ✓ VERIFIED | Skip link first, scroll-condense logic, hamburger, footer with corrected spelling |
| `src/routes/Home.tsx` | Page composition | ✓ VERIFIED | Composes Shell + Hero + Countdown + LocalSection + GuideSection + ProgramaSection + DressCodeSection in D-05 locked order |
| `public/dress-code-men.jpg`, `public/dress-code-women.jpg`, `public/sol-symbol.png`, `public/og.jpg`, `public/favicon.png` | Web-sized ported assets | ✓ VERIFIED | All 5 exist; total 604 KB (< 700 KB budget), worst file 203 KB (< 250 KB budget); `sips` confirms dress-code image pixel dimensions exactly match declared `width`/`height` literals |
| `index.html` | Title, description, OG, favicon, lang, mount | ✓ VERIFIED | `lang="pt-BR"`, `<title>`, meta description, full OG set, favicon link, `#root` + `/src/main.tsx` module script intact |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `useCountdown.ts` | `countdown.ts#getEventState` | hook calls pure fn | ✓ WIRED | Confirmed by read |
| `countdown.ts` | `content/event.ts` boundary consts | `import { EVENT_DATE, EVENT_DAY_START, EVENT_END }` | ✓ WIRED | Confirmed by read |
| `Countdown.tsx` / `CountdownRail.tsx` | `useCountdown.ts` / `pluralizeUnit` / `COUNTDOWN_COPY` | direct imports | ✓ WIRED | Confirmed by read |
| `Hero.tsx` | `content/event.ts#HERO`, `#SECTION_IDS` | direct imports | ✓ WIRED | Confirmed by read |
| `Hero.tsx` CTA href | `#programacao` → `ProgramaSection` id | in-page anchor | ✓ WIRED | `SECTION_IDS.programa = 'programacao'`, `ProgramaSection` id matches |
| `ProgramaSection.tsx` / `DressCodeSection.tsx` | `content/event.ts#PROGRAMA`/`DRESS` | direct imports | ✓ WIRED | Confirmed by read |
| `LocalSection.tsx` / `GuideSection.tsx` | `content/event.ts#VENUE`/`GUIDE`/`HOTELS` | direct imports | ✓ WIRED | Confirmed by read |
| `DressCodeSection.tsx` | `public/dress-code-{men,women}.jpg` | `<img src>` | ✓ WIRED | Files exist at exact paths, dims match |
| `Shell.tsx` | `CountdownRail.tsx` | mounted when `showCountdownRail` | ✓ WIRED | Confirmed by read |
| `Shell.tsx` | `content/event.ts#NAV_LINKS` | prop passed from `Home.tsx` | ✓ WIRED | Confirmed by read |
| `Shell.tsx` | `public/sol-symbol.png` | wordmark `<img>` | ✓ WIRED | File exists |
| `Home.tsx` | `Hero`/`Countdown`/`LocalSection`/`GuideSection`/`ProgramaSection`/`DressCodeSection` | composed as children of `Shell` | ✓ WIRED | Confirmed by read, order matches D-05 |
| `index.html` | `og.jpg`, `favicon.png` | meta/link tags | ✓ WIRED | Files exist at referenced paths |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite passes | `npx vitest run` | 2 test files, 31 tests passed | ✓ PASS |
| Production build compiles | `npm run build` | `tsc -b && vite build` exits 0, `dist/` produced | ✓ PASS |
| `getEventState` timezone-offset independence (named test) | `npx vitest run src/lib/countdown.test.ts -t "offset"` | 2 passed | ✓ PASS |
| `getEventState` 4-phase boundary transitions (named test) | `npx vitest run src/lib/countdown.test.ts -t "phase"` | 6 passed | ✓ PASS |
| `depois` no-ceiling growth (named test) | `npx vitest run src/lib/countdown.test.ts -t "depois"` | 2 passed | ✓ PASS |
| pt-BR pluralization at 0/1/2 (named test) | `npx vitest run src/lib/countdown.test.ts -t "pluralize"` | 12 passed | ✓ PASS |
| No misspelled street variant in `src/` | `grep -rq 'Matapoã' src/` | not found | ✓ PASS |
| `tripadvisor` URL count in content module | `grep -c 'tripadvisor' src/content/event.ts` | 4 | ✓ PASS |
| `PROGRAMA` single-declaration gate | `grep -c 'export const PROGRAMA' src/content/event.ts` | 1 | ✓ PASS |
| Dress-code image pixel dims match declared literals | `sips -g pixelWidth -g pixelHeight` | men 1120×1400, women 895×1400 — exact match | ✓ PASS |
| `public/` asset weight budget | `du -sh public/*` | total 604 KB, worst file 203 KB | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|----------------|--------------|--------|----------|
| INVITE-01 | 02-01, 02-03, 02-04, 02-07 | Hero com sol + contagem regressiva usando offset -03:00 explícito | ✓ SATISFIED | Countdown state machine tested and passing at all boundaries; Hero art fully implemented; composed in Home.tsx |
| INVITE-02 | 02-01, 02-02, 02-05, 02-07 | Seções de programa e dress code | ✓ SATISFIED | ProgramaSection (7 blocks) and DressCodeSection (rules/callout/gallery) fully implemented and composed |
| INVITE-03 | 02-01, 02-06, 02-07 | Local + mapa de Aracaju + guia da cidade/hotéis | ✓ SATISFIED | LocalSection (click-to-load map, corrected spelling) and GuideSection (4 cards + 3 hotels) fully implemented and composed |
| INVITE-04 | 02-02, 02-07 | Navegação/topbar + footer, responsivo | ✓ SATISFIED | Shell.tsx topbar (nav, hamburger, scroll-condense) and footer implemented; mobile-first utility classes throughout; visual "responsive" confirmation deferred to human verification |

No orphaned requirements found — REQUIREMENTS.md maps exactly INVITE-01..04 to Phase 2, and all four appear in plan frontmatter `requirements:` fields (02-01, 02-02, 02-03, 02-04, 02-05, 02-06, 02-07).

### Anti-Patterns Found

No blocker-level anti-patterns (`TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER`, empty implementations, or hardcoded-empty stub patterns) found across the 17 phase-scope files (`grep` returned zero matches).

A prior code review (`.planning/phases/02-convite-p-blico/02-REVIEW.md`, `status: issues_found`, 0 critical / 5 warning / 2 info) flagged non-blocking quality/robustness issues, carried here for completeness — none contradict a roadmap success criterion:

| File | Finding | Severity | Impact |
|------|---------|----------|--------|
| `useCountdown.ts`, `Countdown.tsx`, `CountdownRail.tsx` | Two independently-scheduled 1s timers can show digits up to ~1s apart between the full section and the compact rail, contradicting the code comment's "can never disagree" claim | ⚠️ Warning | Cosmetic (seconds-digit drift only); does not affect phase-level correctness, which is proven by passing tests |
| `Hero.tsx` vs `LocalSection.tsx`/`ProgramaSection.tsx`/`DressCodeSection.tsx` | Only Hero sets `tabIndex={-1}` as an anchor-nav focus target; the other three `NAV_LINKS` targets don't move keyboard/AT focus on jump | ⚠️ Warning | Accessibility gap for keyboard/screen-reader users navigating via topbar links |
| `Shell.tsx` hamburger | No Escape-to-close, no focus trap/return on open/close | ⚠️ Warning | Accessibility gap for keyboard-only mobile-menu users |
| `event.test.ts` | Spelling-regression test's `JSON.stringify` excludes `VENUE`, the object the D-04 correction actually lives in — a future regression in `VENUE.name`/`addressLine1` would not be caught | ⚠️ Warning | Test coverage gap, not a current defect (current `VENUE` values are correct, confirmed by direct read) |
| `Shell.tsx` | Countdown-rail reveal threshold relies on `Hero`'s `nextElementSibling` DOM adjacency to `Countdown`, an implicit contract with `Home.tsx`'s render order | ⚠️ Warning | Silent degrades to an approximation if section order changes later; not a current defect |
| `event.ts` | `PROGRAMA`/`PROGRAMA_KICKER`/`PROGRAMA_HEADING` merged into one multi-declarator `const` to satisfy a grep gate | ℹ️ Info | Maintainability/readability, no functional impact |
| `index.html` | `og:image` is root-relative, not absolute — most social crawlers need an absolute URL | ℹ️ Info | Already flagged in-code as intentionally deferred to the Phase 7 owners' checklist (production domain not yet fixed) |

None of these block the phase goal: the observable truths (hero+countdown, sections present, topbar/footer wired) all hold at the code level. They are legitimate follow-up items for a later hardening/accessibility pass (LAUNCH-02 in REQUIREMENTS.md already covers "Acessibilidade AA + revisão mobile-first").

### Human Verification Required

Per this project's `human_verify_mode: end-of-phase`, the following visual/interactive/browser-only checks — deferred from each plan's `<verify><human-check>` blocks — are required before this phase can be considered fully validated. None of these are code gaps; they are checks that cannot be performed by static analysis. See the frontmatter `human_verification` list above for the full detail (test/expected/why_human) on all 9 items:

1. Countdown four-state visual read (multiple clock positions, both renderers)
2. Reduced-motion hero behavior
3. Hero responsive layout at 360/768/1440px + font-swap CLS
4. Local section map reveal network behavior (zero pre-tap requests, no CLS on reveal, spelling, route link)
5. Guide + hotel external link liveness (7 links, Tripadvisor blocks automated fetchers) + grid layout at 3 widths
6. Programa section responsive read + CTA scroll-offset
7. Dress-code gallery CLS + alt-text fallback under throttled/blocked network
8. Topbar scroll-condense + hamburger keyboard flow + skip link + rail slide-in/out
9. Full-page composition order, footer, and confirmation that no RSVP/gift/memory-wall affordance is present

### Gaps Summary

No gaps found. All 3 roadmap success criteria and all 11 plan-level must-haves (truths) are verified at the code level: content module, timezone-safe countdown state machine (with passing behavioral tests at every phase boundary), all six invite sections, and the topbar/footer shell are implemented, substantive (no stubs), and wired end-to-end into `Home.tsx`. The full test suite (31/31) and production build both pass. All grep-based acceptance gates from every plan's frontmatter reproduce the claimed values exactly. No blocker-level anti-patterns exist.

Status is `human_needed` rather than `passed` solely because this phase's success criteria include "usable on mobile" and other inherently visual/interactive properties (hero art rendering, reduced-motion behavior, scroll-driven chrome, external link liveness) that the project's `human_verify_mode: end-of-phase` setting correctly defers to human browser testing rather than treating as code-verifiable. A prior code review also surfaced 5 non-blocking warnings (timer drift, incomplete focus management, a test coverage gap) worth addressing in a later hardening pass, but they do not prevent the phase goal from being considered achieved at the code level.

---

*Verified: 2026-07-24T12:55:45Z*
*Verifier: Claude (gsd-verifier)*
