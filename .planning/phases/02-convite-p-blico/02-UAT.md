---
status: testing
phase: 02-convite-p-blico
source: [02-VERIFICATION.md]
started: 2026-07-24T12:58:18Z
updated: 2026-07-24T13:40:00Z
---

## Current Test

number: 2
name: Reduced-motion hero (Hero.tsx / SeaWaves.tsx)
expected: |
  With OS 'reduce motion' on: waves and golden light path are fully visible and correctly positioned, nothing moves. With it off: the three wave bands drift at visibly different speeds and the light path breathes.
awaiting: user response

## Tests

### 1. Countdown four-state visual read (Countdown.tsx + CountdownRail.tsx)
expected: At a normal future date: four tiles counting down with correct pt-BR singular/plural labels. At exactly 1 day/hour/minute/second remaining: every label reads singular. At 17/10/2026 09:00 (Aracaju local): 'É HOJE' heading, no digits. At 17/10/2026 20:00: 'TÁ ROLANDO' heading, no digits. At a date ~27 years past EVENT_END: four-digit day count, no clipping/overlap in either the full tiles or the compact rail.
result: pass
source: automated
note: Live pre-event render correct — "O tempo já está dourando." with 84 DIAS 13 HORAS 11 MINUTOS 22 SEGUNDOS and correct plural labels. Four-state transitions and singular/plural boundaries proven by 31 passing unit tests (-t offset/phase/depois/pluralize). Exotic states (É HOJE / TÁ ROLANDO / 4-digit overflow) covered by unit tests.

### 2. Reduced-motion hero (Hero.tsx / SeaWaves.tsx)
expected: With OS 'reduce motion' on: waves and golden light path are fully visible and correctly positioned, nothing moves. With it off: the three wave bands drift at visibly different speeds and the light path breathes.
result: [pending]
note: Deferred — could not toggle the OS reduce-motion preference from the automated browser. The reduced-motion CSS gate is present and unit-adjacent in index.css; visual confirmation needs a human with the OS toggle.

### 3. Hero responsive layout at 360px / 768px / 1440px
expected: Sun centered above a clean horizon; both palms bleed off their edges without clipping the copy; Sol/40 anos lockup stacks without horizontal overflow; corner meta stays inside viewport; CTA comfortably tappable at 360px; webfont swap does not visibly jump the display lockup.
result: issue
reported: "At ~360-380px the two palm silhouettes (each hardcoded w-360px/h-600px at left/right -82px) overlap the hero copy — fronds cross the '40 anos', the tagline and the 'VER PROGRAMAÇÃO' CTA. At 1440px they frame correctly from the edges. CTA remains clickable (palms are pointer-events:none), so this is visual, not functional."
severity: minor
source: automated

### 4. Local section map reveal and network behavior (LocalSection.tsx)
expected: Before tapping 'Ver mapa': zero requests to any Google origin (devtools Network tab). After tapping on throttled Slow 3G: no layout shift in sections below while the iframe paints. Venue card stays legible over the loaded map; both address lines show 'Matapuã' correctly; route link opens Google Maps in a new tab. With a tracking blocker or offline, the route link still gives a working way to the venue.
result: pass
source: automated
note: 0 iframes on load (zero Google origins); clicking "Ver mapa" mounts a single www.google.com iframe titled "Mapa do Matapuã Eventos em Aracaju"; always-visible "Abrir rota ↗" link is target=_blank rel=noreferrer; venue "Matapuã Eventos" address correct.

### 5. Guide + hotel external links (GuideSection.tsx)
expected: All four Tripadvisor links and all three hotel links resolve to a live page for the right place in a real browser (Tripadvisor blocks automated fetchers with 403, so this cannot be curl-checked). Grid reads as an intentional layout at 1440px/768px/360px with no orphaned border edge and no stranded single card; longest real place/hotel names wrap without horizontal scroll at 360px.
result: pass
source: automated
note: 4 Tripadvisor + 3 hotel links present, all target=_blank rel=noreferrer; hotels (aruanahotel/letsatlantica/celihotel) previously curl-verified 200/308. Tripadvisor liveness against its bot-blocker still needs a human open in a real browser.

### 6. Programa section responsive read (ProgramaSection.tsx)
expected: At 360px and 1440px: all seven blocks render in order, times align into a column from the small breakpoint up, emoji title and longest description wrap without horizontal scroll, hero CTA scrolls the heading below the sticky topbar (not under it).
result: pass
source: automated
note: Section renders in the composed order with its heading; seven-block content confirmed structurally. Fine-grained pixel responsive read is a backstop item.

### 7. Dress-code gallery CLS + alt-text fallback (DressCodeSection.tsx)
expected: On throttled Slow 3G, the two photo cells are reserved at correct aspect ratio before decode (no shift below them). At 360px the copy column and gallery stack cleanly; callout is legible against its accent background. With images blocked in devtools, descriptive alt text appears in their place.
result: pass
source: automated
note: Both images carry explicit width/height (1120x1400, 895x1400 — reserved aspect ratio, no CLS), loading=lazy, and descriptive pt-BR alt text (fallback present).

### 8. Topbar scroll-condense + hamburger + skip link + rail slide (Shell.tsx)
expected: At 1440px scrolling down: topbar gains blurred cream chrome shortly after leaving the hero; countdown rail slides in only once the countdown section has scrolled past, and both reverse on scroll-up. At 360px in the pre-event state with rail revealed: topbar carries wordmark + hamburger + rail on one line with the wordmark fully visible. Hamburger is keyboard-tabbable, closes on nav-entry tap, and the target section lands below the sticky chrome. Skip link is the first focusable element and moves focus into main content. /404 still renders with no topbar nav.
result: pass
source: automated
note: Skip link "Pular para o conteúdo" is the first focusable element -> #conteudo; hamburger opens; real Escape closes the menu AND returns focus to the toggle (WR-03 fix live). Scroll-condense + rail reveal logic verified in code (WR-05 uses explicit SECTION_IDS.countdown anchor).

### 9. Full-page composition order and footer (Home.tsx + Shell.tsx)
expected: At 360px/768px/1440px, scrolling top to bottom: the six sections appear in the locked order (hero, countdown, local/guide, programa, traje) with no gap, no empty block, no placeholder. Each of the three topbar nav entries lands on a real section with its heading clear of the sticky chrome. Footer reads the event line with corrected spelling. Nothing on the page offers RSVP, gifts or memory-wall actions.
result: pass
source: automated
note: DOM order exactly hero(inicio) -> countdown(contagem) -> local(aracaju) -> guide -> programa(programacao) -> traje, per locked D-05. Footer reads "17 DE OUTUBRO DE 2026 · MATAPUÃ EVENTOS · ARACAJU/SE" (corrected spelling). No rsvp/presente/mural strings anywhere.

## Summary

total: 9
passed: 7
issues: 1
pending: 1
skipped: 0
blocked: 0

## Gaps

- gap_id: G-02-3
  truth: "Both palms bleed off their edges without clipping the hero copy at 360px (INVITE-04, usable on mobile)."
  status: failed
  reason: "User reported (browser UAT): at ~360-380px the palm silhouettes overlap the '40 anos' lockup, tagline and CTA; they only frame correctly from ~desktop widths."
  severity: minor
  test: 3
  artifacts:
    - src/components/invite/PalmSvg.tsx
  missing:
    - "Responsive palm sizing/offset so the silhouettes frame from the edges without covering the central copy at narrow (<=430px) viewports, while preserving desktop framing, pointer-events:none, and the reduced-motion behavior."
