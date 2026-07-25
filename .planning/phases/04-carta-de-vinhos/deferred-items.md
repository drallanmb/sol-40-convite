# Deferred Items

## Pre-existing mobile overflow

- **Found during:** Plan 04-04 responsive browser check at 375px
- **Observed:** the existing `Countdown` tile row extends about 17px beyond the document client width and exposes a horizontal scrollbar.
- **Scope:** `src/components/invite/Countdown.tsx` is a Phase 2 surface and is not modified by Plan 04-04. The new `GiftPreview` section itself reports equal scroll/client widths at 375px, 768px, and 1280px.
- **Follow-up:** correct the mobile countdown row in a dedicated regression fix, then repeat the page-level 320px/375px overflow check.
