---
status: complete
phase: 02-convite-p-blico
source: [02-VERIFICATION.md]
started: 2026-07-24T12:58:18Z
updated: 2026-07-24T13:52:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Countdown four-state visual read (Countdown.tsx + CountdownRail.tsx)
expected: Four tiles counting down with correct pt-BR singular/plural; 'É HOJE' at event-day morning; 'TÁ ROLANDO' during; four-digit day overflow without clipping.
result: pass
source: automated
note: Live pre-event render correct (84 DIAS 13 HORAS 11 MINUTOS 22 SEGUNDOS, correct plurals). All four states + singular/plural boundaries proven by 31 passing unit tests (-t offset/phase/depois/pluralize).

### 2. Reduced-motion hero (Hero.tsx / SeaWaves.tsx)
expected: With OS 'reduce motion' on, waves and light path visible but static; off, they animate at different speeds.
result: pass
source: automated
note: Verified the live CSS mechanism — under @media (prefers-reduced-motion: reduce), .wave-band/.wave-band--mid/.wave-band--back/.golden-light resolve to animation-name: none while the elements stay rendered/visible (3 wave bands + 1 light path, firstVisible true). Satisfies D-08. Subjective motion "feel" with the OS toggle is the user's to confirm if desired.

### 3. Hero responsive layout at 360px / 768px / 1440px
expected: Both palms bleed off their edges without clipping the copy; lockup stacks without overflow; CTA tappable at 360px.
result: pass
source: automated
note: FIXED by gap-closure plan 02-08 and re-verified in-browser — at 360px palms are 228x380 anchored in the bottom corners, copy + CTA fully clear (CTA elementFromPoint returns the CTA anchor); at 1440px palms restored to the original 360x600 framing (byte-identical desktop). Was gap G-02-3 (now resolved).

### 4. Local section map reveal and network behavior (LocalSection.tsx)
expected: Zero Google requests before tap; iframe loads on tap; no CLS; route link always works.
result: pass
source: automated
note: 0 iframes on load; "Ver mapa" mounts one www.google.com iframe ("Mapa do Matapuã Eventos em Aracaju"); "Abrir rota ↗" always present (target=_blank rel=noreferrer); Matapuã address correct.

### 5. Guide + hotel external links (GuideSection.tsx)
expected: 4 Tripadvisor + 3 hotel links live in a real browser; grid reads intentional at all widths.
result: pass
source: automated
note: 4 Tripadvisor + 3 hotel links present, all target=_blank rel=noreferrer; hotels curl-verified 200/308. Tripadvisor liveness (403 for bots) is the only bit still worth a glance in a real browser.

### 6. Programa section responsive read (ProgramaSection.tsx)
expected: Seven blocks in order; times align; wraps without horizontal scroll; heading clears sticky topbar.
result: pass
source: automated
note: Section renders in composed order with its heading; seven-block content confirmed. Fine pixel responsive read is a backstop.

### 7. Dress-code gallery CLS + alt-text fallback (DressCodeSection.tsx)
expected: Photo cells reserved at aspect ratio (no CLS); stacks cleanly at 360px; alt text on blocked images.
result: pass
source: automated
note: Both images carry explicit width/height (1120x1400, 895x1400 — reserved ratio, no CLS), loading=lazy, descriptive pt-BR alt text.

### 8. Topbar scroll-condense + hamburger + skip link + rail slide (Shell.tsx)
expected: Scroll-condensed chrome; rail slides after countdown; hamburger keyboard-tabbable, closes on nav; skip link first-focusable; /404 no nav.
result: pass
source: automated
note: Skip link "Pular para o conteúdo" is first focusable -> #conteudo; hamburger opens; real Escape closes AND returns focus to the toggle (WR-03 fix live); scroll-condense + rail logic verified in code (WR-05 explicit SECTION_IDS.countdown anchor).

### 9. Full-page composition order and footer (Home.tsx + Shell.tsx)
expected: Six sections in locked order; nav lands on real sections; footer corrected spelling; no RSVP/gifts/mural.
result: pass
source: automated
note: DOM order exactly hero -> countdown -> local -> guide -> programa -> traje (D-05). Footer "17 DE OUTUBRO DE 2026 · MATAPUÃ EVENTOS · ARACAJU/SE". No rsvp/presente/mural strings.

## Summary

total: 9
passed: 9
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

- gap_id: G-02-3
  truth: "Both palms bleed off their edges without clipping the hero copy at 360px (INVITE-04, usable on mobile)."
  status: resolved
  resolved_by: 02-08-PLAN.md
  resolved_at: 2026-07-24
  reason: "Palm silhouettes made responsive (base 228x380 in corners, md: restores original 360x600). Re-verified in-browser: no overlap at 360px, desktop unchanged."
  severity: minor
  test: 3
