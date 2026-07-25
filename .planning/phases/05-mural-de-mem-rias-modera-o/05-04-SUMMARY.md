---
phase: 05-mural-de-mem-rias-modera-o
plan: 04
subsystem: ui
tags: [react, convex, embla, carousel, accessibility, responsive, vitest]

requires:
  - phase: 05-mural-de-mem-rias-modera-o
    plan: 03
    provides: "Resilient one-memory composer and accepted-only submission flow"
  - phase: 05-mural-de-mem-rias-modera-o
    plan: 02
    provides: "Approved-only minimal public projection and validated upload backend"
provides:
  - "Stable cryptographic per-visit ordering that preserves existing relative order across reactive updates"
  - "Accessible responsive Embla carousel with controllable seven-second autoplay and reduced-motion handling"
  - "Projection-only photo/message cards plus loading, empty, and isolated album-error states"
  - "Canonical memory anchor/navigation/copy and home composition directly after dress code"
affects: [06-admin-moderation, phase-5-uat, public-home]

tech-stack:
  added:
    - "embla-carousel-react@8.6.0"
    - "embla-carousel-autoplay@8.6.0"
  patterns:
    - "A mounted StableVisitOrder owns cryptographic ranks; reactive arrays are copied and never reranked."
    - "Album query failures are isolated by a boundary so the public composer remains usable."
    - "Carousel movement depends on both viewport-visible slide count and reduced-motion preference."
    - "Public cards derive their type directly from api.posts.listApproved and cannot name private post fields."

key-files:
  created:
    - src/lib/stableVisitOrder.ts
    - src/lib/stableVisitOrder.test.ts
    - src/hooks/useReducedMotion.ts
    - src/components/memories/MemoryCard.tsx
    - src/components/memories/MemoryCarousel.tsx
    - src/components/memories/MemoriesSection.tsx
  modified:
    - package.json
    - package-lock.json
    - src/content/event.ts
    - src/content/event.test.ts
    - src/routes/Home.tsx

key-decisions:
  - "Autoplay uses a 7000ms delay and is enabled only when the current viewport has more memories than visible slots."
  - "One to three visible cards are selected at the 40rem and 64rem breakpoints; loop and autoplay stay off when every card is already visible."
  - "Focus, hover, drag, and arrow interaction stop rotation; only the explicit rotation control resumes it."
  - "The home order is DressCodeSection followed immediately by MemoriesSection; Phase 4 remains a separate /presentes route."
  - "Safari iOS HEIC, real photo upload/interruption, and populated-carousel behavior remain explicit manual UAT rather than inferred from Node or source tests."

requirements-completed: [WALL-01, WALL-02, WALL-03, WALL-04, WALL-05]

coverage:
  - id: D1
    description: "Approved memories receive stable cryptographic ranks once per mounted visit without mutating the reactive query array."
    requirement: WALL-04
    verification:
      - kind: unit
        ref: "src/lib/stableVisitOrder.test.ts#stable visit ordering"
        status: pass
    human_judgment: false
  - id: D2
    description: "The public album consumes only api.posts.listApproved and renders a minimal projection through ordinary React text."
    requirement: WALL-04
    verification:
      - kind: integration
        ref: "convex/posts.test.ts#approved projection and author fallback"
        status: pass
      - kind: other
        ref: "private-field and dangerouslySetInnerHTML source prohibition scan"
        status: pass
    human_judgment: false
  - id: D3
    description: "The home exposes a canonical Memórias anchor after dress code, with the album before a composer that remains usable when the album is empty."
    requirement: WALL-01
    verification:
      - kind: unit
        ref: "src/content/event.test.ts#memories integration"
        status: pass
      - kind: automated_ui
        ref: "local Chrome smoke#empty album, message-only submission, accepted confirmation, author-retaining another-memory flow"
        status: pass
    human_judgment: false
  - id: D4
    description: "Cards and the Embla carousel provide consistent layouts, drag/snaps, named controls/slides, pause conditions, and reduced-motion behavior."
    requirement: WALL-04
    verification:
      - kind: other
        ref: "npm run build and carousel ARIA/control source inventory"
        status: pass
      - kind: manual_procedural
        ref: "populated 1/few/many carousel keyboard, swipe, focus, hover, autoplay and 200% zoom UAT"
        status: unknown
    human_judgment: true
    rationale: "The connected development album had no approved fixtures, so interactive populated-carousel behavior still needs browser UAT."
  - id: D5
    description: "The complete composer/backend pipeline retains image, retry, moderation, limiter, cleanup, and privacy contracts after home integration."
    requirement: WALL-02
    verification:
      - kind: integration
        ref: "npm test#16 files, 337 tests"
        status: pass
      - kind: integration
        ref: "npx convex dev --once#development functions ready"
        status: pass
      - kind: manual_procedural
        ref: "real JPEG/PNG/WebP upload, interrupted XHR retry, and approved-only network inspection"
        status: unknown
    human_judgment: true
    rationale: "Chrome file attachment was blocked by the extension file-access permission, so real upload/interruption evidence was not fabricated."
  - id: D6
    description: "HEIC/HEIF follows capability-based browser conversion with actionable fallback and retained text."
    requirement: WALL-02
    verification:
      - kind: unit
        ref: "src/lib/imageProcessing.test.ts#HEIC unsupported fallback"
        status: pass
      - kind: manual_procedural
        ref: "LAUNCH-01 Safari iOS real-device HEIC conversion or fallback"
        status: unknown
    human_judgment: true
    rationale: "No Safari iOS device was available; Node and desktop Chrome cannot prove the phone codec path."

duration: 9min
completed: 2026-07-25
status: complete
---

# Phase 5 Plan 4: Public Memories Album and Home Integration Summary

**The invitation now ends with a stable approved-memory album and resilient composer, backed by exact Embla 8.6.0 motion controls, canonical navigation, and the privacy-minimal Convex projection.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-07-25T00:55:39Z
- **Completed:** 2026-07-25T01:04:35Z
- **Tasks:** 3/3
- **Files modified:** 11

## Accomplishments

- Added a tested `StableVisitOrder` whose cryptographic ranks survive reactive additions/removals for one mounted visit without mutating Convex results.
- Added consistent photo/text cards and an exact-pinned Embla carousel with drag, responsive snaps, seven-second autoplay, arrows, pause/resume, focus/hover/interaction stops, and reduced-motion shutdown.
- Added approved-album loading, empty, and isolated error states while keeping the full Phase 5 composer available beneath the album.
- Added `#memorias`, canonical album copy, navigation, and the final home order `DressCodeSection -> MemoriesSection -> Shell footer`.

## Task Commits

1. **Task 1 RED: stable ordering and reduced-motion contracts** — `29831dc`
2. **Task 1 GREEN: Embla pins, stable ordering, and motion primitives** — `b328cde`
3. **Task 2: projection-only cards, accessible carousel, and resilient section states** — `d09bdc5`
4. **Task 3: canonical content/navigation and home integration** — `658f437`

## Files Created/Modified

- `package.json`, `package-lock.json` — exact official Embla React and Autoplay `8.6.0` dependencies, merged with the Phase 4 audit script.
- `src/lib/stableVisitOrder.ts` — per-mount rank owner and immutable ordering adapter.
- `src/lib/stableVisitOrder.test.ts` — rerender/addition/removal/immutability plus modern/legacy motion-listener coverage.
- `src/hooks/useReducedMotion.ts` — SSR-safe `useSyncExternalStore` media-query bridge with cleanup.
- `src/components/memories/MemoryCard.tsx` — fixed-height public photo/message/text-only card.
- `src/components/memories/MemoryCarousel.tsx` — Embla viewport, responsive visible-count policy, autoplay, controls, and WAI carousel semantics.
- `src/components/memories/MemoriesSection.tsx` — approved query, stable ordering, concrete album states, and composer composition.
- `src/content/event.ts`, `src/content/event.test.ts` — canonical anchor/navigation/copy and additive source-order assertions.
- `src/routes/Home.tsx` — memory section immediately after dress code.

## Carousel and Accessibility Contract

- `embla-carousel-react` and `embla-carousel-autoplay` are exact `8.6.0` pins.
- Autoplay delay is `7000ms`; loop and autoplay activate only when the current viewport has hidden slides.
- Visible cards are 1 below 40rem, 2 from 40rem, and 3 from 64rem.
- `stopOnInteraction`, `stopOnFocusIn`, and `stopOnMouseEnter` are enabled; arrows explicitly pause before moving.
- The named `region` has `aria-roledescription="carrossel"`; each named `group` slide exposes its current/total position.
- The rotation control precedes moving content; arrows and the rotation control retain 44px targets.
- Automatic movement is never a live region and never starts under reduced motion.
- Photo/card text is ordinary JSX; the contextual image alt never derives from a filename.

## D-01–D-17 Evidence

| Decision | Evidence |
|---|---|
| D-01 | Backend/reducer suites cover photo-only, message-only, and both; browser smoke submitted message-only successfully. |
| D-02 | Approved projection tests enforce `De alguém que te ama`; public card receives required projected author only. |
| D-03 | Reducer/form remain one file and one post per submit; no `multiple`, album, or batch UI exists. |
| D-04 | Browser smoke confirmed “Enviar outra memória” clears message and retains author. |
| D-05 | `event.test.ts` and browser DOM confirm `#memorias` after dress code and before the Shell footer. |
| D-06 | Source-order assertion proves `ApprovedAlbum` precedes `MemoryForm`. |
| D-07 | Composer source/unit coverage retains one-photo whole-image preview, replace, and remove; real chooser remains manual UAT. |
| D-08 | Reducer/XHR unit suites prove preserved retry/progress state; real interrupted-network retry remains manual UAT. |
| D-09 | Browser smoke confirmed inline “aguarda aprovação” success and “Enviar outra memória”. |
| D-10 | Backend approved projection suite passed; browser empty-state DOM contained no private post/storage/capability names. |
| D-11 | Six focused ordering/motion tests passed, including reactive addition and immutable input. |
| D-12 | Exact Embla source/build checks passed; populated swipe/focus/hover/reduced-motion behavior remains manual UAT. |
| D-13 | Public card source/build proves one consistent frame and centered text-only branch; populated visual comparison remains manual UAT. |
| D-14 | Reducer tests passed; browser boundary kept exactly 280 characters, blocked character 281, and displayed zero remaining. |
| D-15 | JPEG/PNG/WebP/HEIC unit policy passed; Safari iOS is carried as LAUNCH-01. |
| D-16 | Client bounds and backend metadata/real-byte validation passed; real browser attachment remains manual UAT. |
| D-17 | Backend limiter boundary/concurrency suites passed; browser success returned directly to an unrestricted next-memory form with no lifetime count. |

## Automated and Runtime Verification

- Focused Phase 5 gate — **7 files, 132/132 passed**.
- Full repository suite after all commits — **16 files, 337/337 passed**.
- Production build — **passed**, including the concurrently added Phase 4 `/presentes` route.
- `npx convex dev --once` — **passed**, development functions ready with posts and wine declarations together.
- `git diff --check` — **passed**.
- Exact dependency-pin check — **passed**.
- Private-field/raw-HTML/deferred-feature source prohibitions — **passed**.

## Interactive Browser Evidence

Passed against the connected development backend:

- Canonical navigation and anchor; memory section appears after dress code.
- Album resolved from loading to the concrete empty state without blocking the form.
- Message-only submission reached durable inline approval-pending success.
- “Enviar outra memória” restored the form, retained `Teste Fase 5`, cleared the message, and reset the counter to 280.
- Character 280 was accepted; character 281 was blocked while the counter stayed at zero.
- The memory fold remained usable at 320, 360, 640, 1024, and desktop widths; its submit target computed to 44px.
- No browser console warning/error was recorded.

Outstanding manual UAT:

- Populated one/few/many approved carousel: autoplay, arrows, swipe, pause/resume, focus/hover stop, reduced motion, card variants, and 200% zoom.
- Real JPEG/PNG/WebP attachment, upload progress, interruption, retry, and approved-only network payload inspection. Chrome attachment was blocked because the extension lacked file-URL access.
- Safari iOS HEIC/HEIF conversion or actionable fallback with retained author/message (**LAUNCH-01**).

The smoke created one intentional development-only pending text memory (`Teste Fase 5`) and did not approve or expose it publicly.

## Phase 4 Parallel Merge

- `HEAD` advanced repeatedly while this plan ran; every advance was followed by a live re-read before the next patch/commit.
- Phase 4 wine schema, generated declarations, package audit script, `/presentes` route, gift content, styles, and components were never staged, reverted, deleted, or reconstructed.
- The final generated/runtime smoke contains both post and wine modules.
- The resolved public composition is: the home ends with dress code then memories; Phase 4 gifts live on the separate `/presentes` route.

## Decisions Made

- Used viewport-aware movement instead of a fixed “more than N” rule so autoplay is not meaningless when every card is already visible.
- Kept album failure inside a class error boundary; the composer remains outside and available.
- Centralized only the new public album/navigation/card copy in `MEMORIES_COPY`; the proven 05-03 composer copy and state machine were left intact.
- Kept manual codec, real file chooser/network, and populated-carousel judgment explicit rather than converting source inspection into a false UI pass.

## Deviations from Plan

None - plan executed as designed. Interactive checks that could not be run are recorded as manual UAT, not silently passed.

## Issues Encountered

- The initial legacy RSVP source scan treated the word “entrar” in unrelated memory copy as account language. The equivalent phrase was changed to “fazer parte do álbum,” retaining product meaning while keeping the existing regression guard precise.
- Chrome refused `fileChooser.setFiles` because the ChatGPT extension did not have “Allow access to file URLs” enabled. No retry or upload success was claimed.
- The development deployment had no approved post fixtures, so populated carousel interaction could not be exercised without introducing an unplanned moderation/fixture write surface.

## User Setup Required

For the remaining Chrome upload UAT, enable “Allow access to file URLs” in the ChatGPT Chrome Extension details. No application/runtime configuration is required.

## Next Phase Readiness

- Phase 5 production code and automated/runtime gates are complete.
- Phase 6 can consume pending posts for authenticated moderation without changing the public projection.
- Before launch sign-off, complete populated-carousel/network browser UAT and LAUNCH-01 Safari iOS HEIC verification.

## Self-Check: PASSED

- All eleven declared plan artifacts exist.
- Four commits matching `05-04` exist, including required RED and GREEN TDD commits.
- Every automated acceptance command, full suite, build, Convex runtime smoke, source prohibition scan, and diff check passed after the production commits.
- Manual-only browser/device gaps are explicitly classified `unknown` and were not falsely marked automated or passed.

---
*Phase: 05-mural-de-mem-rias-modera-o*
*Completed: 2026-07-25*
