---
status: testing
phase: 02-convite-p-blico
source: [02-VERIFICATION.md]
started: 2026-07-24T12:58:18Z
updated: 2026-07-24T12:58:18Z
---

## Current Test

number: 1
name: Countdown four-state visual read (Countdown.tsx + CountdownRail.tsx)
expected: |
  At a normal future date: four tiles counting down with correct pt-BR singular/plural labels. At exactly 1 day/hour/minute/second remaining: every label reads singular. At 17/10/2026 09:00 (Aracaju local): 'É HOJE' heading, no digits. At 17/10/2026 20:00: 'TÁ ROLANDO' heading, no digits. At a date ~27 years past EVENT_END: four-digit day count, no clipping/overlap in either the full tiles or the compact rail.
awaiting: user response

## Tests

### 1. Countdown four-state visual read (Countdown.tsx + CountdownRail.tsx)
expected: At a normal future date: four tiles counting down with correct pt-BR singular/plural labels. At exactly 1 day/hour/minute/second remaining: every label reads singular. At 17/10/2026 09:00 (Aracaju local): 'É HOJE' heading, no digits. At 17/10/2026 20:00: 'TÁ ROLANDO' heading, no digits. At a date ~27 years past EVENT_END: four-digit day count, no clipping/overlap in either the full tiles or the compact rail.
result: [pending]

### 2. Reduced-motion hero (Hero.tsx / SeaWaves.tsx)
expected: With OS 'reduce motion' on: waves and golden light path are fully visible and correctly positioned, nothing moves. With it off: the three wave bands drift at visibly different speeds and the light path breathes.
result: [pending]

### 3. Hero responsive layout at 360px / 768px / 1440px
expected: Sun centered above a clean horizon; both palms bleed off their edges without clipping the copy; Sol/40 anos lockup stacks without horizontal overflow; corner meta stays inside viewport; CTA comfortably tappable at 360px; webfont swap does not visibly jump the display lockup.
result: [pending]

### 4. Local section map reveal and network behavior (LocalSection.tsx)
expected: Before tapping 'Ver mapa': zero requests to any Google origin (devtools Network tab). After tapping on throttled Slow 3G: no layout shift in sections below while the iframe paints. Venue card stays legible over the loaded map; both address lines show 'Matapuã' correctly; route link opens Google Maps in a new tab. With a tracking blocker or offline, the route link still gives a working way to the venue.
result: [pending]

### 5. Guide + hotel external links (GuideSection.tsx)
expected: All four Tripadvisor links and all three hotel links resolve to a live page for the right place in a real browser (Tripadvisor blocks automated fetchers with 403, so this cannot be curl-checked). Grid reads as an intentional layout at 1440px/768px/360px with no orphaned border edge and no stranded single card; longest real place/hotel names wrap without horizontal scroll at 360px.
result: [pending]

### 6. Programa section responsive read (ProgramaSection.tsx)
expected: At 360px and 1440px: all seven blocks render in order, times align into a column from the small breakpoint up, emoji title and longest description wrap without horizontal scroll, hero CTA scrolls the heading below the sticky topbar (not under it).
result: [pending]

### 7. Dress-code gallery CLS + alt-text fallback (DressCodeSection.tsx)
expected: On throttled Slow 3G, the two photo cells are reserved at correct aspect ratio before decode (no shift below them). At 360px the copy column and gallery stack cleanly; callout is legible against its accent background. With images blocked in devtools, descriptive alt text appears in their place.
result: [pending]

### 8. Topbar scroll-condense + hamburger + skip link + rail slide (Shell.tsx)
expected: At 1440px scrolling down: topbar gains blurred cream chrome shortly after leaving the hero; countdown rail slides in only once the countdown section has scrolled past, and both reverse on scroll-up. At 360px in the pre-event state with rail revealed: topbar carries wordmark + hamburger + rail on one line with the wordmark fully visible. Hamburger is keyboard-tabbable, closes on nav-entry tap, and the target section lands below the sticky chrome. Skip link is the first focusable element and moves focus into main content. /404 still renders with no topbar nav.
result: [pending]

### 9. Full-page composition order and footer (Home.tsx + Shell.tsx)
expected: At 360px/768px/1440px, scrolling top to bottom: the six sections appear in the locked order (hero, countdown, local/guide, programa, traje) with no gap, no empty block, no placeholder. Each of the three topbar nav entries lands on a real section with its heading clear of the sticky chrome. Footer reads the event line with corrected spelling. Nothing on the page offers RSVP, gifts or memory-wall actions.
result: [pending]

## Summary

total: 9
passed: 0
issues: 0
pending: 9
skipped: 0
blocked: 0

## Gaps
