# Phase 05 — Pattern Map

**Mapped:** 2026-07-24  
**Purpose:** give the planner concrete file ownership, data-flow boundaries, and codebase-native patterns for Phase 5.

## Planning Summary

Phase 5 should be planned as four cuts whose files mostly do not overlap:

1. **Domain, schema, security, and Wave 0 tests** — pure validators, post/reservation tables, rate-limit policy, binary sniffing, and the Convex harness.
2. **Storage pipeline** — reserve upload, claim the resulting `_storage` document, validate real bytes in an internal action, finish idempotently, and clean up expired/orphaned files.
3. **Client submission flow** — image conversion/downscale, one-memory draft state, upload progress, retry preservation, and accepted-only success.
4. **Public album and home integration** — approved-only query, stable per-visit ordering, accessible Embla carousel, section copy/navigation, and final home insertion.

Keep `schema.ts`, `Home.tsx`, `event.ts`, `package.json`, and `package-lock.json` in a short final integration task because Phase 4 is being implemented in parallel and may touch the same files.

## End-to-End Data Flow

```text
MemoryForm draft
  ├─ message only
  │    └─ posts.submitTextMemory
  │         ├─ validate/normalize author + message
  │         ├─ check all rate buckets, then consume all
  │         └─ insert posts(status: "pendente")
  │
  └─ photo present
       ├─ imageProcessing: decode -> scale -> JPEG Blob
       ├─ posts.requestUpload
       │    ├─ rate-limit before storage cost
       │    ├─ insert postUploadReservations(awaiting_upload)
       │    └─ ctx.storage.generateUploadUrl()
       ├─ XHR POST Blob -> { storageId }, with upload progress
       ├─ posts.submitPhotoMemory
       │    ├─ verify hashed capability/reservation state
       │    ├─ read ctx.db.system.get("_storage", storageId)
       │    ├─ bind storageId + normalized command
       │    └─ schedule internal.postInternal.validatePhoto
       ├─ postInternal.validatePhoto action
       │    ├─ ctx.storage.get(storageId)
       │    ├─ uploadValidation.sniffImageType(real bytes)
       │    └─ accept/reject internal mutation
       └─ posts.getSubmissionStatus
            └─ UI shows success only after "accepted"

posts.listApproved
  ├─ withIndex("by_status", q => q.eq("status", "aprovado"))
  ├─ map to minimal public view and getUrl only for approved storageIds
  └─ stableVisitOrder -> MemoryCarousel -> MemoryCard
```

## Files Likely to Be Created

### Convex domain and pipeline

| File | Role / data flow | Closest existing analog | Concrete pattern to reuse |
|---|---|---|---|
| `convex/postModel.ts` | Shared server constants, validators, status/media/reservation unions, text normalization, and business invariants. Imported by schema and public/internal functions. | `convex/rsvpModel.ts` | Export validators and TS unions side by side; centralize limits instead of duplicating literals. Use `v.union(v.literal(...))` and named constants. |
| `convex/postRateLimits.ts` | Isolated public-memory rate buckets using the already registered component. | `convex/rsvpRateLimits.ts` | `export const POST_RATE_LIMITS = {...} as const` then `new RateLimiter(components.rateLimiter, POST_RATE_LIMITS)`. Do not register a second component in `convex.config.ts`. |
| `convex/postSecurity.ts` | Validate/hash device keys and reservation capabilities; produce safe retry seconds; resolve an active reservation without exposing raw tokens. | `convex/rsvpSecurity.ts` | Reuse canonical 32-byte base64url validation/hash approach, domain-separated limiter hashes (`scope + "\\0" + value`), hash-at-rest, exact `now < expiresAt`, and `Math.max(1, Math.ceil(ms / 1000))`. Keep RSVP-specific scope types untouched. |
| `convex/uploadValidation.ts` | Pure real-byte sniffing and metadata/content compatibility checks. Called by internal validation, directly unit-tested. | Previous `lib/upload-core.mjs`; structurally similar to pure `src/lib/phone.ts` | Return a discriminated verdict, not throw for hostile input. Recognize JPEG `ff d8 ff`, PNG `89 50 4e 47`, WebP `RIFF....WEBP`, and HEIC `ftyp` brands for a specific rejection. Final accepted media remains JPEG/PNG/WebP. |
| `convex/posts.ts` | Entire public API: text submission, upload reservation, photo claim, status polling/query, and approved-only album query. | `convex/rsvps.ts` | Every function declares `args` and `returns`; return discriminated unions; backend-filter public views; perform all limiter `check`s before any `limit`; never return Convex documents raw. |
| `convex/postInternal.ts` | Internal action reads the real blob; internal mutations accept/reject/expire idempotently and delete invalid storage. May contain ownership helpers for cleanup. | `convex/rsvpInternal.ts` for internal-only boundaries; no current storage analog | Export only `internalAction`/`internalMutation`; pass IDs, not client-controlled documents; re-read reservation state in every finalizer; insert at most one post per reservation. |
| `convex/crons.ts` | Optional daily old-orphan sweep in addition to per-reservation expiry. | No current analog; use Convex cron/scheduler API | Add only if the plan includes the `_storage` gap between POST and claim. Sweep only files older than 24h and preserve any ID owned by `posts` or `postUploadReservations`. Audit future storage owners before deleting. |
| `convex/postTest.ts` | Deploy-loadable test harness factory with test-only dependencies injected by `posts.test.ts`. | `convex/rsvpTest.ts` | Type with `TestConvex<typeof schema>`; accept `{ convexTest, modules, registerRateLimiter }`; call `registerRateLimiter(t)`. Never place `import.meta.glob` in this file. |
| `convex/posts.test.ts` | Integration matrix for schema, public contracts, rate limits, storage pipeline, scheduler/idempotency, approved-only privacy, expiry, and cleanup. | `convex/rsvps.test.ts` | `const modules = import.meta.glob(['./**/*.*s', '!./**/*.test.*s'])`; inject `rateLimiterTest.register`; inspect DB only inside `t.run`; test boundary ordinals and result shapes. |
| `convex/uploadValidation.test.ts` | Small binary fixture matrix for sniffing, exact byte limit, MIME mismatch, and HEIC-specific rejection. | Previous `tests/upload-core.test.mjs` | Build minimal `Uint8Array` fixtures for JPEG/PNG/WebP/HEIC/PDF/HTML; assert exact limit and `+1`; test declared MIME that disagrees with bytes. |

### Client state, processing, and transport

| File | Role / data flow | Closest existing analog | Concrete pattern to reuse |
|---|---|---|---|
| `src/lib/imageProcessing.ts` | Browser adapter around decode, dimensions, Canvas reencode, quality retries, and actionable HEIC failure. Returns a final upload `Blob`; never mutates the draft. | Previous `lib/image-client.ts`; pure-boundary style of `src/lib/rsvpDraft.ts` | Extract dimension/quality calculations as pure exports; inject decode/canvas adapters for Node tests; always `bitmap.close()` and revoke temporary object URLs. Do not fall back to uploading raw HEIC. |
| `src/lib/imageProcessing.test.ts` | Tests aspect ratio, max edge, final-size retry decisions, accepted extensions/types, and decode failure classification. | `src/lib/countdown.test.ts`, `src/lib/phone.test.ts` | Test pure functions/adapters in Node; leave actual device codec behavior to manual smoke tests. |
| `src/lib/memoryDraft.ts` | Pure draft/submission state machine. Keeps author, message, original file, processed blob, preview URL metadata, transport IDs, progress, and failure/success separate. | `src/lib/rsvpDraft.ts` | Use `create...`, `reduce...`, and discriminated actions. Failure changes submission state only. Successful reset clears photo/message/transport but preserves author. |
| `src/lib/memoryDraft.test.ts` | Verifies photo/message/both validity, 280 code-point limit, failure preservation, remove/replace behavior, and author-preserving reset. | `src/lib/rsvpDraft.test.ts` | Test state transitions rather than component internals; include emoji/code-point boundaries and whitespace normalization. |
| `src/lib/memorySession.ts` (or equivalent small helper) | Creates/persists the anonymous device key used only for rate-limit fairness and creates per-reservation capabilities. | `src/lib/rsvpSession.ts` + `src/lib/rsvpCapability.ts` | Use `crypto.getRandomValues` for 32 bytes, canonical unpadded base64url, a versioned `localStorage` key, malformed-value cleanup, and storage-access `try/catch`. Device key is not authentication. |
| `src/lib/memorySession.test.ts` | Tests canonical generation, versioned storage, malformed cleanup, and storage-denied fallback. | `src/lib/rsvpSession.test.ts` | Reuse the local `MemoryStorage implements Storage` test double and deterministic random filler. |
| `src/lib/uploadBlob.ts` (may be folded into the form if deliberately kept tiny) | XHR transport to the Convex upload URL with real progress and parsed `{ storageId }`. | No current client transport analog; research example is canonical | Promise wrapper over `XMLHttpRequest`; listen on `xhr.upload.progress`; reject non-2xx, invalid JSON, network error, and abort with stable error codes. Never put capability in the upload URL. |
| `src/lib/stableVisitOrder.ts` | Maintains a random rank per post ID for one mount/visit and sorts copies without reshuffling existing cards. | `src/lib/countdown.ts` for pure UI derivation | Accept/read a rank map and random source; add ranks only for unseen IDs; sort by rank with deterministic ID tie-break; never use `sort(() => Math.random() - 0.5)`. |
| `src/lib/stableVisitOrder.test.ts` | Verifies rerender stability, insertion of new IDs, immutability, and deterministic injected random values. | Existing adjacent `src/lib/*.test.ts` convention | Plain Vitest, no DOM dependency. |
| `src/hooks/useReducedMotion.ts` | Reactive `matchMedia('(prefers-reduced-motion: reduce)')` bridge for carousel initialization and autoplay control. | `Shell.tsx` effect cleanup style; `src/hooks/useCountdown.ts` for hook placement | Subscribe with `addEventListener('change', ...)`, initialize from `matches`, and remove the listener on cleanup. CSS `motion-reduce` alone cannot decide whether the autoplay plugin starts. |

### Memories UI

| File | Role / data flow | Closest existing analog | Concrete pattern to reuse |
|---|---|---|---|
| `src/components/memories/MemoriesSection.tsx` | Owns the home fold: section heading/copy, approved query, carousel first, then form. | Invite sections such as `DressCodeSection.tsx` and `ProgramaSection.tsx` | Derive `id` from `SECTION_IDS.memories`; use `tabIndex={-1}`, `scroll-mt-[120px]`, responsive clamp padding, and content from `event.ts`. Query errors/empty state remain inside this section. |
| `src/components/memories/MemoryCarousel.tsx` | Embla viewport/slides, stable visit order, previous/next, pause/resume, drag, slow autoplay, interaction stop, reduced-motion behavior. | `Shell.tsx` for refs/effect cleanup/focus semantics; no current carousel analog | Use official React Embla API, not pointer listeners. Container: labelled region plus `aria-roledescription="carrossel"`; slide: `role="group"` and “Memória X de N”; do not live-announce automatic advances. |
| `src/components/memories/MemoryCard.tsx` | Consistent public card for photo+message, photo-only, or message-only; applies fallback author. | `src/components/ui/Card.tsx` and previous `.memory-card` intent | Receive the minimal public view only. Render plain React text, never HTML. Use `author ?? "De alguém que te ama"` only in the public projection/view. Preserve a fixed media/text frame across card shapes. |
| `src/components/memories/MemoryForm.tsx` | Orchestrates one draft through processing/uploading/validating/failed/success; calls public Convex functions and polls/queries reservation status. | `PhoneGate.tsx` for guarded submit/rate-limit; `FamilyForm.tsx` for preserved draft, inline status, retry timer, and `aria-busy` | Guard duplicate submits with `busyRef`; clear feedback on edits; catch transport errors into stable state; retain draft on every failure; success only after backend state is `accepted`. |
| `src/components/memories/PhotoPicker.tsx` | File input, full-image preview, replace/remove actions, accepted-format guidance, and object-URL lifecycle. | Old `UploadForm.tsx`; `Field.tsx` labelling conventions | One file only; `accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"`; revoke the old preview before replacement/removal/unmount; input/action targets at least 44px. |
| `src/components/memories/SubmissionSuccess.tsx` | Inline state replacing the form after accepted submission and offering “Enviar outra memória”. | `Confirmar.tsx` state-card switch and `FamilyForm.tsx` status styles | Render `role="status"`/polite announcement and a real `Button`; action dispatches the partial reset that preserves author. This is the primary success—not a transient Toast. |

## Files Likely to Be Modified

| File | Exact integration | Existing pattern / guardrail |
|---|---|---|
| `convex/schema.ts` | Add `posts` and `postUploadReservations`; import Phase 5 validators. Preserve all RSVP tables and indexes verbatim. | Current schema extends one object with `defineTable`; add `.index('by_status', ['status'])`, `.index('by_storage_id', ['storageId'])`, `.index('by_upload_reservation', ['uploadReservationId'])`, plus reservation indexes for storage/expiry. |
| `package.json` | Add exact `embla-carousel-react: "8.6.0"` and `embla-carousel-autoplay: "8.6.0"`. | Existing dependencies pin exact runtime versions. Do not add another test framework or HEIC/WASM library. |
| `package-lock.json` | npm-generated lock update for those two official packages. | Update with npm; do not hand-edit. Integrate after re-reading Phase 4 changes. |
| `src/content/event.ts` | Add `SECTION_IDS.memories`, a home nav link, and centralized `MEMORIES_COPY` for section, form, progress/errors, empty state, carousel controls, and accepted confirmation. | `SECTION_IDS` is the anchor source of truth; `NAV_LINKS` order is asserted; `RSVP_COPY` demonstrates nested route-state copy. Avoid hardcoded user-facing memory copy in components. |
| `src/content/event.test.ts` | Assert the new nav item/anchor and locked memory copy contract. Add raw imports only when enforcing source-level constraints is useful. | Existing test reflects optional new exports during phased work and checks exact navigation arrays/copy matrices. Once Phase 5 lands, import the final exports directly where possible. |
| `src/routes/Home.tsx` | Import and render `<MemoriesSection />` immediately after `<DressCodeSection />`, before `Shell`'s footer. Update the composition comment. | Home is intentionally a pure ordered composition; do not add query/form state here. |
| `src/components/ui/Field.tsx` | Prefer no change. If the plan needs a first-class error/counter slot, extend `aria-describedby` composition compatibly. | It already merges `${id}-hint` with caller-provided `aria-describedby`. MemoryForm can supply counter/error IDs without changing the primitive. Do not replace this merge behavior. |
| `src/index.css` | Usually no change; only add genuinely global carousel behavior if Embla cannot be expressed locally. | Existing global reduced-motion rule disables named decorative animations; component utilities already use `motion-reduce:*`. Autoplay itself must still be disabled in JS. |
| `convex/convex.config.ts` | Expected no change. | `app.use(rateLimiter)` already registers the one shared component. A second registration is incorrect. |
| `src/main.tsx` | Expected no change. | `ConvexProvider` already wraps the app, so components can use `useQuery`, `useMutation`, or `useConvex`. |
| `vite.config.ts` | Expected no change. | Test include already covers `src/**/*.test.ts` and `convex/**/*.test.ts`; Node environment is intentional. |

## Recommended Signatures and Contracts

These signatures express the codebase pattern and should guide task boundaries; exact symbol names may be refined in planning.

### Domain validators and normalization

```ts
export const postStatusValidator = v.union(
  v.literal('pendente'),
  v.literal('aprovado'),
  v.literal('oculto'),
)

export const uploadStateValidator = v.union(
  v.literal('awaiting_upload'),
  v.literal('processing'),
  v.literal('accepted'),
  v.literal('rejected'),
  v.literal('expired'),
)

export const MESSAGE_MAX_LENGTH = 280
export const AUTHOR_MAX_LENGTH = 60
export const MAX_FINAL_IMAGE_BYTES = 5 * 1024 * 1024
export const UPLOAD_RESERVATION_TTL_MS = 24 * 60 * 60 * 1_000

export function normalizeMemoryText(input: {
  author?: string
  message?: string
}):
  | { kind: 'valid'; author?: string; message?: string }
  | { kind: 'invalid_content' }
```

Normalization should convert CRLF to LF, trim, reject disallowed controls, count Unicode code points with `[...value].length`, and enforce that at least one of `message` or the eventual `storageId` exists. Store omitted author as `undefined`, not as presentation copy.

### Schema shape

```ts
posts: defineTable({
  author: v.optional(v.string()),
  message: v.optional(v.string()),
  storageId: v.optional(v.id('_storage')),
  mediaType: v.optional(mediaTypeValidator),
  mediaSize: v.optional(v.number()),
  status: postStatusValidator,
  source: v.literal('convidado'),
  uploadReservationId: v.optional(v.id('postUploadReservations')),
  createdAt: v.number(),
  moderatedAt: v.optional(v.number()),
  approvedAt: v.optional(v.number()),
})
  .index('by_status', ['status'])
  .index('by_storage_id', ['storageId'])
  .index('by_upload_reservation', ['uploadReservationId'])

postUploadReservations: defineTable({
  tokenHash: v.string(),
  deviceKeyHash: v.string(),
  state: uploadStateValidator,
  storageId: v.optional(v.id('_storage')),
  author: v.optional(v.string()),
  message: v.optional(v.string()),
  postId: v.optional(v.id('posts')),
  errorCode: v.optional(v.string()),
  expiresAt: v.number(),
  validationRequestedAt: v.optional(v.number()),
  createdAt: v.number(),
})
  .index('by_storage_id', ['storageId'])
  .index('by_expires_at', ['expiresAt'])
```

Schema validators cannot express the cross-field invariants. Enforce them in centralized writer helpers:

- one of `message`/`storageId` must exist on a post;
- `storageId`, `mediaType`, and `mediaSize` move together;
- every public-created post starts as `pendente`;
- one reservation creates at most one post.

### Public Convex surface

```ts
export const requestUpload = mutation({
  args: { deviceKey: v.string(), token: v.string() },
  returns: v.union(
    v.object({
      kind: v.literal('reserved'),
      reservationId: v.id('postUploadReservations'),
      uploadUrl: v.string(),
    }),
    v.object({ kind: v.literal('token_conflict') }),
    rateLimitedValidator,
  ),
  handler: async (ctx, args) => { /* ... */ },
})

export const submitPhotoMemory = mutation({
  args: {
    reservationId: v.id('postUploadReservations'),
    token: v.string(),
    storageId: v.id('_storage'),
    author: v.optional(v.string()),
    message: v.optional(v.string()),
  },
  returns: photoSubmitResultValidator,
  handler: async (ctx, args) => { /* metadata + claim + schedule */ },
})

export const getSubmissionStatus = query({
  args: {
    reservationId: v.id('postUploadReservations'),
    token: v.string(),
  },
  returns: submissionStatusValidator,
  handler: async (ctx, args) => { /* safe state only */ },
})

export const submitTextMemory = mutation({
  args: {
    deviceKey: v.string(),
    author: v.optional(v.string()),
    message: v.string(),
  },
  returns: textSubmitResultValidator,
  handler: async (ctx, args) => { /* pendente */ },
})

export const listApproved = query({
  args: {},
  returns: v.array(publicMemoryValidator),
  handler: async (ctx) => { /* approved index + safe projection */ },
})
```

`getSubmissionStatus` must not return token hashes, storage IDs, or the pending post document. `listApproved` should return only:

```ts
{
  id: string
  author: string
  message?: string
  imageUrl?: string
  createdAt: number
}
```

Generate `imageUrl` only after the backend `by_status === "aprovado"` filter. Storage URLs are bearer URLs; never generate them for pending/hidden posts, even for a form preview.

### Phase 3 rate-limit sequence

The important Phase 3 invariant is not just using the component; it is checking every applicable bucket before consuming any:

```ts
const globalStatus = await postRateLimiter.check(ctx, 'requestUploadGlobal', {
  key: undefined,
})
const deviceStatus = await postRateLimiter.check(ctx, 'requestUploadByDevice', {
  key: hashedDeviceKey,
})

if (!globalStatus.ok || !deviceStatus.ok) {
  return {
    kind: 'rate_limited',
    retryAfterSeconds: retrySeconds(
      globalStatus.retryAfter,
      deviceStatus.retryAfter,
    ),
  } as const
}

const globalConsumption = await postRateLimiter.limit(
  ctx,
  'requestUploadGlobal',
  { key: undefined },
)
const deviceConsumption = await postRateLimiter.limit(
  ctx,
  'requestUploadByDevice',
  { key: hashedDeviceKey },
)

if (!globalConsumption.ok || !deviceConsumption.ok) {
  throw new Error('Post upload limiter transaction invariant failed')
}
```

Do this before `generateUploadUrl()`. Hash the device key before it becomes a limiter key. A rotating device key is only a casual-fairness mechanism; retain the global cost breaker.

### Idempotent internal finalization

```ts
export const validatePhoto = internalAction({
  args: { reservationId: v.id('postUploadReservations') },
  returns: v.null(),
  handler: async (ctx, { reservationId }) => {
    // Read reservation through an internal query if needed.
    // Read the Blob via ctx.storage.get(storageId).
    // Sniff actual bytes.
    // Call exactly one accept/reject internal mutation.
    return null
  },
})
```

The accept mutation should:

1. re-read the reservation;
2. return the existing `postId` when already accepted;
3. proceed only when state/storageId still match;
4. insert one `pendente` post;
5. patch reservation to `accepted` with `postId`.

The reject mutation should delete the invalid storage blob and set a stable `errorCode`. A retry while `processing` may re-schedule only after the planned cooldown (research recommendation: 15 seconds), never create another reservation/post implicitly.

### Client draft state

```ts
type MemoryDraft = {
  author: string
  message: string
  photo: null | {
    file: File
    processed?: Blob
    previewUrl: string
  }
}

type SubmissionState =
  | { kind: 'idle' }
  | { kind: 'processing' }
  | { kind: 'uploading'; percent: number }
  | { kind: 'validating' }
  | { kind: 'failed'; code: MemoryErrorCode; retryAfterSeconds?: number }
  | { kind: 'success' }

type MemoryState = {
  draft: MemoryDraft
  submission: SubmissionState
  transport: null | {
    reservationId: string
    capability: string
    storageId?: string
  }
}
```

Reducer rules:

- edits clear transient failure but do not erase other fields;
- failed processing/upload/claim/validation preserves the full draft;
- “Tentar novamente” reuses safe transport state when possible;
- success is dispatched only for accepted backend status;
- “Enviar outra memória” clears message/photo/transport, revokes preview, and preserves `author`;
- changing/removing a photo revokes the previous object URL.

### Accessible carousel shell

```tsx
<section aria-labelledby={headingId}>
  <div
    role="region"
    aria-roledescription="carrossel"
    aria-label="Memórias para a Sol"
  >
    <div ref={emblaRef} className="overflow-hidden">
      <div className="flex">
        {ordered.map((memory, index) => (
          <div
            key={memory.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`Memória ${index + 1} de ${ordered.length}`}
          >
            <MemoryCard memory={memory} />
          </div>
        ))}
      </div>
    </div>
    {/* previous, next, and Pause/Resume buttons */}
  </div>
</section>
```

Recommended Embla options: `loop` only when there are enough cards, roughly 7-second delay, `stopOnInteraction: true`, `stopOnFocusIn: true`, and `stopOnMouseEnter: true`. Do not initialize autoplay under reduced motion. An explicit pause/resume control is required even when the plugin stops on interaction.

## Existing UI Patterns to Preserve

### Section and home ownership

- `Home.tsx` only composes owner sections. `MemoriesSection` owns its query, form, copy consumption, and album state.
- Every anchorable section uses `SECTION_IDS`, `tabIndex={-1}`, and `scroll-mt-[120px]`.
- Public home sections use responsive `px-[clamp(...)] py-[clamp(...)]` and a centered max-width container.
- `Shell` already owns footer, mobile navigation, focus escape, countdown rail, and global page chrome. Phase 5 should not duplicate any of those.

### Primitive use

- `Button` already enforces 44px targets, disabled styling, `aria-busy` cursor behavior, and primary/quiet/rsvp variants.
- `Card` is the canonical bordered `bg-card` surface with sand offset shadow. Memory cards may adjust its class but should not introduce a parallel card primitive.
- `Field` already composes its hint ID with caller-supplied `aria-describedby`; pass the counter and error IDs from `MemoryForm`.
- `Toast` is optional secondary feedback only. D-09 requires accepted success to replace the form inline.

### Error, retry, and focus

Copy these behaviors from `PhoneGate`/`FamilyForm`:

- `busyRef` prevents duplicate async submissions before React state catches up.
- `aria-busy` sits on the form and the submitting button.
- rate-limit uses a timer to disable retry until the returned positive whole seconds elapse;
- connection errors are caught and translated to local discriminated feedback;
- error containers use `role="alert"`; neutral progress/success uses `role="status"` and polite announcements;
- draft reset occurs only inside the confirmed-success branch;
- retry errors do not clear controlled fields.

For the success-card transition, follow `Confirmar.tsx`: represent the major UI modes as a discriminated union and render the relevant card rather than stacking hidden forms. Move focus to the success heading only when that improves context; keep `tabIndex={-1}` on programmatically focused headings.

## Test Layout and Verification Pattern

### Convex harness

```ts
// convex/postTest.ts — deploy-safe
export function makePostTest({
  convexTest,
  modules,
  registerRateLimiter,
}: PostTestDependencies) {
  const t = convexTest(schema, modules)
  registerRateLimiter(t)
  return t
}

// convex/posts.test.ts — test-only module discovery
const modules = import.meta.glob(['./**/*.*s', '!./**/*.test.*s'])

function makePostTest() {
  return makePostTestHarness({
    convexTest,
    modules,
    registerRateLimiter: (testInstance) =>
      rateLimiterTest.register(testInstance),
  })
}
```

Use `vi.useFakeTimers()` plus `vi.setSystemTime(...)` for exact expiry/cooldown boundaries. For scheduled validation/expiry, run the public mutation, advance timers, then call `await t.finishAllScheduledFunctions(vi.runAllTimers)` before asserting reservation/post/storage state. Restore real timers in `afterEach`.

### Minimum backend groups

1. schema accepts all three valid memory shapes and rejects invalid literals/required fields;
2. normalization at 0/1/280/281 code points, emoji, CRLF, controls, and 60/61 author;
3. reservation capability collision, expiry `-1/0/+1`, and hashed-at-rest checks;
4. request-upload device/global rate boundary and proof no reservation is created when throttled;
5. metadata absent, size exact/+1, MIME allowlist, and metadata/byte mismatch;
6. scheduled JPEG/PNG/WebP acceptance, HEIC/PDF/HTML rejection, invalid storage deletion;
7. repeated claim/action/finalization returns the same post and never duplicates;
8. text-only post starts `pendente`;
9. `listApproved` excludes pending/hidden, omits storage IDs/private fields, and applies author fallback;
10. expiry and orphan ownership preserve live/owned storage and delete only eligible old files.

Use `t.run` to insert fixtures and inspect tables/system storage; call public behavior through `api.posts.*` and internal behavior through `internal.postInternal.*`. Assert discriminated result objects, not only that a promise resolves.

### Minimum client groups

- `imageProcessing.test.ts`: dimensions, quality/final-byte policy, adapter cleanup, decode/HEIC error;
- `memoryDraft.test.ts`: photo/message/both, retry preservation, partial reset, preview replacement/removal;
- `memorySession.test.ts`: random bytes, base64url, localStorage failure/malformed cleanup;
- `stableVisitOrder.test.ts`: same IDs preserve order, new IDs integrate without moving existing relative order, source array not mutated.

No React Testing Library is installed and `vite.config.ts` uses the Node environment. Keep behavior-heavy logic in pure modules rather than adding a UI test stack solely for this phase.

### Commands

```bash
npm test -- convex/posts.test.ts convex/uploadValidation.test.ts
npm test -- src/lib/imageProcessing.test.ts src/lib/memoryDraft.test.ts src/lib/memorySession.test.ts src/lib/stableVisitOrder.test.ts
npm test
npm run build
npx convex dev --once
```

Manual gates remain required for real XHR progress, drag/focus/autoplay behavior, and HEIC behavior on Safari iOS.

## Planner Guardrails

- Do not create a post from client-declared MIME alone.
- Do not show success when `submitPhotoMemory` merely returns `processing`.
- Do not return a pending/hidden storage URL for preview.
- Do not reset draft state at submit start or on error.
- Do not store the anonymous display fallback in the database.
- Do not couple Phase 5 token/limiter types into `rsvpSecurity.ts`; copy/extract only truly generic logic without changing Phase 3 behavior.
- Do not add a second rate-limiter component registration.
- Do not hand-roll swipe/snap/autoplay; use the two approved Embla packages.
- Do not use `Math.random()` sorting per render.
- Do not make device key an authentication claim.
- Do not immediately delete every unreferenced `_storage` record; require age and ownership checks.
- Do not port old R2 routes, multi-file queue, mandatory name, auto-publish, raw-HEIC fallback, telão, QR, or admin moderation.
- Re-read `git diff` immediately before every shared-file patch because Phase 4 is parallel.

## Suggested Task-to-File Isolation

| Task | Primary files | Shared files deferred |
|---|---|---|
| 05-01 Domain + Wave 0 | `postModel.ts`, `postSecurity.ts`, `postRateLimits.ts`, `uploadValidation.ts`, `postTest.ts`, tests | `schema.ts` only at the end of this task |
| 05-02 Storage pipeline | `posts.ts`, `postInternal.ts`, optional `crons.ts`, backend tests | none beyond generated Convex types |
| 05-03 Client submission | `imageProcessing*`, `memoryDraft*`, `memorySession*`, `uploadBlob.ts`, `MemoryForm.tsx`, `PhotoPicker.tsx`, `SubmissionSuccess.tsx` | package files only if not already integrated |
| 05-04 Album | `stableVisitOrder*`, `useReducedMotion.ts`, `MemoryCard.tsx`, `MemoryCarousel.tsx`, `MemoriesSection.tsx` | package files only if not already integrated |
| 05-05 Home integration | content test, final full-suite/build/smoke | `event.ts`, `Home.tsx`, `package.json`, `package-lock.json`, and any Phase 4-overlapped `schema.ts` reconciliation |

Generated files under `convex/_generated/` are outputs of `npx convex dev --once`, not hand-edited task files.

