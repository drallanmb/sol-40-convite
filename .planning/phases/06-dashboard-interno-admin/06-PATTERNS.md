# Phase 6 — Pattern Mapping

**Mapped:** 2026-07-25  
**Scope:** likely implementation files for the protected `/admin` dashboard  
**Sources:** `06-CONTEXT.md`, `06-RESEARCH.md`, `06-UI-SPEC.md`, current `src/` and `convex/`

## Mapping Principles

- Keep public and administrative Convex entry points separate. Public RSVP, memory, and wine DTOs are deliberately minimal and must not gain admin-only IDs, phones, hidden posts, gift attribution, or revisions.
- Treat the admin token as a server-verified bearer capability. The React gate controls rendering; every Convex admin query and mutation independently calls the same server guard.
- Keep reactive server snapshots as the source of truth. Local React state is for the bearer token, route intent, dirty form drafts, expansion, and transient undo/toast state only.
- Put validators, normalization, transitions, and reducers outside JSX so Vitest can cover them in the existing Node environment.
- Exact filenames below follow the research decomposition and existing project naming. They are recommended boundaries, not a requirement to create one giant module per screen.

## Backend Files

### `convex/schema.ts` — modify

**Role:** add the persisted, hash-only admin session model and the RSVP reverse index needed for capability revocation.

**Data flow:** raw admin token never enters a document; `adminSecurity.ts` hashes it, `adminAuth.ts` inserts/reads/deletes the session, and every protected function resolves it through `by_token_hash`. Phone change/family deletion reads all public RSVP sessions through `rsvpSessions.by_rsvp`.

**Closest analog:** existing `rsvpSessions`.

```ts
rsvpSessions: defineTable({
  tokenHash: v.string(),
  rsvpId: v.id('rsvps'),
  expiresAt: v.number(),
  createdAt: v.number(),
})
  .index('by_token_hash', ['tokenHash'])
  .index('by_expires_at', ['expiresAt']),
```

Follow the same explicit table + indexes shape:

```ts
adminSessions: defineTable({
  tokenHash: v.string(),
  createdAt: v.number(),
  expiresAt: v.number(),
})
  .index('by_token_hash', ['tokenHash'])
  .index('by_expires_at', ['expiresAt'])
```

Add `.index('by_rsvp', ['rsvpId'])` to `rsvpSessions`. Convex indexes are not uniqueness or cascade constraints; mutations must still check cardinality and delete children explicitly.

### `convex/adminModel.ts` — create

**Role:** central constants, validators, public result envelopes, text limits, and pure admin state helpers.

**Data flow:** imported by auth and domain endpoints; values validated at the public boundary before reaching persistence.

**Closest analogs:** `convex/rsvpModel.ts`, `convex/postModel.ts`, `convex/wineModel.ts`.

```ts
export const attendanceValidator = v.union(
  v.literal('pending'),
  v.literal('yes'),
  v.literal('no'),
)

export const wineGiftStateValidator = v.union(
  v.object({ status: v.literal('available') }),
  v.object({
    status: v.literal('gifted'),
    giftedBy: v.string(),
    giftedAt: v.number(),
  }),
)
```

Pattern notes:

- Define `ADMIN_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1_000`; do not update it on reads.
- Reuse existing domain validators rather than duplicate status unions.
- Model login/status/logout and mutation outcomes as discriminated unions (`authenticated`, `invalid_credentials`, `rate_limited`, `invalid_session`, `conflict`, etc.).
- Export pure `isAdminSessionActive(expiresAt, now)` for exact-boundary tests.
- Keep server-owned timestamps out of client input validators.

### `convex/adminSecurity.ts` — create

**Role:** canonical token validation/hash, constant-time password comparison, session resolution, and the shared admin guard.

**Data flow:** client raw token → syntax validation → SHA-256 → indexed `adminSessions` lookup → active-session decision. Protected handlers call `requireAdminSession` before domain reads.

**Closest analog:** `convex/rsvpSecurity.ts`.

```ts
export async function hashOpaqueToken(token: string) {
  if (!validateOpaqueToken(token)) {
    throw new Error('Invalid opaque capability')
  }
  return sha256Hex(token)
}

export async function resolveActiveRsvpSession(ctx, token, now = Date.now()) {
  if (!validateOpaqueToken(token)) return null
  const tokenHash = await hashOpaqueToken(token)
  const sessions = await ctx.db
    .query('rsvpSessions')
    .withIndex('by_token_hash', (query) => query.eq('tokenHash', tokenHash))
    .collect()
  if (sessions.length !== 1 || !isSessionActive(sessions[0].expiresAt, now)) {
    return null
  }
  // ...
}
```

Pattern notes:

- Reuse the same canonical 32-byte base64url contract; do not invent a weaker token format.
- Store only the hash. Never return or log password, raw token, or hash.
- Password comes from server-only `ADMIN_PASSWORD`, never `VITE_*`.
- Compare fixed-length password digests by XOR over every byte; do not early-return on a mismatched character.
- A guard should return one uniform invalid-session result or throw one uniform deliberate auth error. It must not leak whether the token was malformed, unknown, expired, or revoked.
- There is no existing password-comparison or shared admin-guard analog. This portion is new and needs dedicated tests.

### `convex/adminRateLimits.ts` — create

**Role:** brute-force brake for login.

**Data flow:** login checks the global bucket, handles denial, then consumes consistently before password acceptance/rejection is exposed.

**Closest analog:** `convex/rsvpRateLimits.ts` plus the check-then-consume helpers in `convex/rsvps.ts`.

```ts
export const RSVP_RATE_LIMITS = {
  lookupGlobal: {
    kind: 'fixed window',
    rate: 120,
    period: FIFTEEN_MINUTES_MS,
  },
} as const

export const rsvpRateLimiter =
  new RateLimiter(components.rateLimiter, RSVP_RATE_LIMITS)
```

The established endpoint pattern is `check` all relevant limits, return a rounded `retryAfterSeconds`, then `limit` and assert the transactional invariant. Convex does not expose a dependable client IP here, so the research intentionally recommends a conservative global login bucket. There is no trusted per-client login key analog.

### `convex/adminAuth.ts` — create

**Role:** public login, non-sensitive session-status query, and logout mutation.

**Data flow:** password + browser-generated token → limiter → password comparison → hash-only row + scheduled expiry. Status accepts only token and returns `valid { expiresAt }` or `invalid`. Logout resolves and deletes the row.

**Closest analogs:** `rsvps.unlockByPhone`, `rsvps.getCurrent`, `rsvpSecurity.createRsvpSession`.

```ts
export const getCurrent = query({
  args: { token: v.string() },
  returns: v.union(v.null(), familyViewValidator),
  handler: async (ctx, args) => {
    const scoped = await resolveActiveRsvpSession(ctx, args.token)
    if (!scoped) return null
    return buildFamilyView(ctx, scoped.rsvp)
  },
})
```

Differences from RSVP:

- Login verifies a server environment secret, not a phone lookup.
- Schedule expiration at insert time; status never renews `expiresAt`.
- Status is the only query permitted before authorization and returns no domain data.
- Logout deletion is the reactive invalidation mechanism for all protected queries that read the session row.

### `convex/adminInternal.ts` — create

**Role:** idempotent scheduled expiration and optional indexed cleanup.

**Data flow:** login schedules `{ sessionId, expectedExpiresAt }`; the internal mutation re-reads and deletes only the matching still-live record.

**Closest analog:** scheduled reservation expiration in `convex/posts.ts`.

```ts
await ctx.scheduler.runAt(
  now + UPLOAD_RESERVATION_TTL_MS,
  postInternalApi.expireReservation,
  { reservationId },
)
```

Use an `internalMutation`, not a public mutation. The expected-expiry precondition prevents an old scheduled job from deleting a replacement session. The existing `convex/crons.ts` daily jobs are cleanup analogs, but a cron alone is insufficient because time passing is not a reactive database dependency.

### `convex/adminOverview.ts` — create

**Role:** protected reactive counts/badges.

**Data flow:** valid token → guard → read `rsvps`, `rsvpGuests`, pending posts, and wines → return protected family/person/work counts only.

**Closest analog:** no aggregate admin query exists. Existing public queries demonstrate projections but not protected multi-table counts.

Pattern notes:

- Count RSVP states by **person**, not family.
- Return independent `familyCount` plus `yes`, `no`, `pending`, `pendingPosts`, `giftedWines`, and total wines if needed for `N de 37`.
- The overview must branch its no-family copy/action on `familyCount === 0`, never on `yes + no + pending === 0`; a zero-person family is an existing, operable family and must route to family/person management rather than “Adicionar primeira família”.
- Reading the session row inside the guard makes deletion/revocation part of the query dependency graph.
- Do not cache these counts into a second table without a demonstrated scale need.

### `convex/adminRsvps.ts` — create

**Role:** protected family DTO and family/person CRUD.

**Data flow:** valid token → guard → bounded family/guest reads → admin DTO. Mutations validate expected revision/ownership, normalize input, update domain rows, bump family `updatedAt`, and return a typed result.

**Closest analogs:** `buildFamilyView` and `saveResponses` in `convex/rsvps.ts`; `insertInvitation` in `convex/rsvpInternal.ts`.

```ts
export async function buildFamilyView(ctx, rsvp) {
  const guests = await ctx.db
    .query('rsvpGuests')
    .withIndex('by_rsvp_sort', (index) => index.eq('rsvpId', rsvp._id))
    .collect()
  return {
    displayName: rsvp.displayName,
    guests: guests.map((guest) => ({
      guestRef: guest.publicRef,
      name: guest.name,
      attendance: guest.attendance,
    })),
    updatedAt: rsvp.updatedAt,
  }
}
```

Pattern notes:

- Admin DTO may include database IDs, phone, contact, `sortOrder`, `respondedAt`, and revision; never add those to `getCurrent`.
- Reuse `insertInvitation` for family creation. It already normalizes Brazilian phones, enforces logical uniqueness, applies limits, and inserts family/people transactionally.
- Adding a person needs a fresh, stable, collision-checked `publicRef`; no current exported helper supports this. Refactor the private derivation or add a purpose-built helper without regenerating existing refs.
- A phone change must check equivalent-phone uniqueness and delete all sessions from `rsvpSessions.by_rsvp` in the same mutation before patching.
- Person update verifies `guest.rsvpId === rsvpId`; `pending` clears `respondedAt`, while `yes`/`no` receive server time.
- Person deletion preserves family and existing order/ref gaps. Family deletion explicitly deletes guests and RSVP sessions before the RSVP.
- Use `updatedAt` as optimistic revision. Define one shared pure `nextRsvpUpdatedAt(current, now) = Math.max(now, current + 1)` helper in the RSVP model/domain layer and require every production writer of an existing RSVP row—public `rsvps.saveResponses` and all admin family/person writers—to use it. A stale open editor returns `conflict` rather than overwriting the other owner.
- Test public/admin writer parity under equal and backward wall clocks, plus an interleaving where a public save advances the revision after an admin snapshot and the stale admin write loses without overwriting it.
- Current `findLogicalInvitation`, normalization, and public-ref derivation are private in `rsvpInternal.ts`; safe reuse may require modifying that file or extracting pure helpers.

### `convex/adminPosts.ts` — create

**Role:** protected moderation lists, legal transitions, and conditional undo.

**Data flow:** token + requested status → guard → `posts.by_status` → admin DTO including generated image URL. Transition reads current post, checks allowed edge and expected revision, writes server timestamps/status.

**Closest analogs:** `postStatusValidator`, `posts.by_status`, public `posts.listApproved`.

```ts
export const postStatusValidator = v.union(
  v.literal('pendente'),
  v.literal('aprovado'),
  v.literal('oculto'),
)
```

Pattern notes:

- Keep `listApproved` unchanged; pending/hidden rows and moderation metadata belong only in this protected module.
- Query pending oldest-first by `createdAt`; the current `by_status` index does not encode time, so collect/sort is acceptable at event scale or add a specific index if planning requires pagination.
- Allowed edges: pending→approved/hidden, approved→hidden, hidden→approved.
- Approval sets `approvedAt`; every moderation writes `moderatedAt` on the server.
- Undo sends the state/revision produced by the original action and succeeds only if it still matches. Unconditional reverse has no existing safe analog and must not be used.
- Storage URLs are admin data here and are generated only after the guard succeeds.

### `convex/adminWines.ts` — create

**Role:** protected wine list with attribution and guarded mark/unmark mutations.

**Data flow:** valid token → admin DTO with `giftedBy`, `giftedAt`, `updatedAt`; mutation reads current revision and atomically writes a complete discriminated gift state.

**Closest analog:** `readGiftState`, `assertValidGiftState`, `setWineGiftStateForSmoke`, and `ensureWineCatalog` in `convex/wineInternal.ts`.

```ts
if (state.status === 'available') {
  await ctx.db.patch(wine._id, {
    status: 'available',
    giftedBy: undefined,
    giftedAt: undefined,
    updatedAt,
  })
} else {
  await ctx.db.patch(wine._id, {
    status: 'gifted',
    giftedBy: state.giftedBy,
    giftedAt: state.giftedAt,
    updatedAt,
  })
}
```

Production admin mutation differences:

- Accept presenter text, not client `giftedAt`; trim/validate and stamp `Date.now()` server-side.
- Require expected `updatedAt` to avoid stale writes.
- Unmark always clears `giftedBy` and `giftedAt` together.
- Define one shared `nextWineUpdatedAt(current, now) = Math.max(now, current.updatedAt + 1)` helper and use it in every wine-row writer. Gift transitions use it inside the shared atomic state helper; `ensureWineCatalog` commercial-field patches also use it instead of raw `Date.now()`.
- Test writer parity explicitly, including equal-clock and backward-clock `ensureWineCatalog` patches, so every successful write strictly advances `updatedAt`.
- Keep `wines.listCatalog/listFeatured` minimal; their existing `status` projection will update the public catalog reactively.
- `readGiftState`/`assertValidGiftState` are private; consider extracting reusable pure helpers instead of copying invariants.

### `convex/adminTest.ts` (or split `admin*.test.ts`) and `convex/adminTest.ts` harness — create

**Role:** Convex integration coverage for auth lifecycle, endpoint isolation, cascades, transitions, concurrency, and gift invariants.

**Data flow:** test-only module glob/dependencies → injected harness → real schema/modules and registered limiter component.

**Closest analog:** `convex/rsvpTest.ts` + `convex/rsvps.test.ts`.

```ts
const modules = import.meta.glob(['./**/*.*s', '!./**/*.test.*s'])

function makeRsvpTest() {
  return makeRsvpTestHarness({
    convexTest,
    modules,
    registerRateLimiter: (testInstance) =>
      rateLimiterTest.register(testInstance),
  })
}
```

Keep `import.meta.glob` and `convex-test` imports in `*.test.ts`. The deploy-loadable harness receives them by injection. Set and restore `process.env.ADMIN_PASSWORD` as RSVP tests do for fixture environment variables. Directly invoke the internal expiration mutation because the harness does not advance scheduled jobs like production.

The test matrix must exercise every exported admin function with missing, malformed, unknown, expired, revoked, and valid tokens. Invalid mutation cases must leave domain tables unchanged. Add exact expiry-boundary, token collision, rate limit, phone/session revocation, explicit cascade, stale revision, legal moderation edge, conditional undo, and complete wine-state cases.

## Frontend Files

### `src/App.tsx` — modify

**Role:** make nested/deep admin URLs routable.

**Closest analog:** current flat React Router declaration.

```tsx
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/confirmar" element={<Confirmar />} />
  <Route path="/presentes" element={<Presentes />} />
  <Route path="/admin" element={<Admin />} />
  <Route path="*" element={<NotFound />} />
</Routes>
```

Change the admin boundary to `/admin/*`, then implement stable subroutes or URL-derived sections inside `Admin.tsx`: `/admin/visao`, `/admin/convidados`, `/admin/moderacao`, `/admin/presentes`. `/admin` redirects to `/admin/visao`. Filters live in query parameters; invalid values fall back safely.

There is no nested-route admin analog in the current app.

### `src/routes/Admin.tsx` — replace placeholder

**Role:** session gate and route/layout composition only.

**Data flow:** read local token → session-status query → checking/login/protected subtree. Invalid/expired status unmounts the entire protected subtree, clears token and drafts, but leaves URL route/filter intact.

**Closest analog:** the explicit route-state machine in `src/routes/Confirmar.tsx`.

```ts
type RouteState =
  | { kind: 'restoring' }
  | { kind: 'phone'; notice?: 'expired'; focusInput: boolean }
  | { kind: 'family-loading'; capability: string; announceOnSuccess: boolean }
  | { kind: 'family'; capability: string; view: RsvpFamilyView; announce: boolean }
```

Use a similarly explicit discriminated state (`checking`, `anonymous`, `authenticated`, possibly `logging-out`) and request-sequence protection for async races. Unlike `Confirmar`, the admin token is in `localStorage`, and protected components should use reactive `useQuery` only after the gate is valid. Do not render cached shell/counts during checking.

### `src/lib/adminSession.ts` + `src/lib/adminSession.test.ts` — create

**Role:** generate/validate token, safe localStorage persistence, expiry timer inputs, cross-tab event interpretation, and pure session reducer.

**Data flow:** browser generates capability → login mutation → persist only valid capability and optional expiry hint. Logout/invalid status removes it. `storage` events dispatch the same fail-closed transition in other tabs.

**Closest analog:** `src/lib/rsvpSession.ts`.

```ts
export function readRsvpCapability(storage: Storage) {
  try {
    const capability = storage.getItem(RSVP_CAPABILITY_STORAGE_KEY)
    if (capability === null) return null
    if (isRsvpCapability(capability)) return capability
    clearRsvpCapability(storage)
  } catch {
    return null
  }
  return null
}
```

Reuse safe storage `try/catch`, canonical token generation, collision retry, and dependency injection of `Storage`/random fill. Differences:

- use a versioned dedicated localStorage key;
- persist no password, DTO, draft, or moderation/gift data;
- expose pure reducer/actions for `status_valid`, `status_invalid`, `expired`, `logout_local`, and storage-event removal;
- preserve route intent externally in URL, not reducer payload;
- listen to `storage`; `BroadcastChannel` has no current analog and is unnecessary for the locked requirement.

### `src/lib/adminSearch.ts` + tests — create

**Role:** pure accent/case/digit folding and family/wine filtering.

**Data flow:** reactive DTO + local search/filter → displayed grouped collection; server state remains untouched.

**Closest analog:** `src/lib/phone.ts` for phone normalization, but no existing general accent-fold/search helper exists.

Pattern notes:

- Normalize names with Unicode decomposition + combining-mark removal + lowercasing.
- Normalize phone matching to digits.
- A presence filter includes a family if any guest matches, then returns the complete family/guest list.
- Wine search covers wine name, product code, and `giftedBy`.
- Keep this outside JSX and cover accent/case/partial-phone/group-preservation cases in Node Vitest.

### `src/components/admin/AdminLogin.tsx` — create

**Role:** password form and server result presentation.

**Closest analogs:** `PhoneGate`, `Field`, `Button`, `Card`.

Pattern notes:

- `type="password"`, `autoComplete="current-password"`, Enter submit, disabled/busy duplicate prevention.
- Wrong password keeps/selects input and uses `role="alert"`.
- Only the login card uses the existing offset sand shadow.
- No admin query is mounted here except session status at the route gate.
- Login copy should be centralized in `src/content/admin.ts`, not hardcoded across components.

### `src/components/admin/AdminShell.tsx` — create

**Role:** desktop sidebar, mobile header/menu, fixed four-item bottom navigation, focus/scroll behavior, and logout placement.

**Closest analog:** `src/components/layout/Shell.tsx`.

Useful existing patterns:

```tsx
<button
  aria-expanded={menuOpen}
  aria-controls={menuId}
  aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
  className="relative flex h-11 min-h-[44px] w-11 ..."
/>
```

```ts
useEffect(() => {
  if (!menuOpen) return
  const firstLink = mobileNavRef.current?.querySelector('a')
  firstLink?.focus()
  // Escape closes and restores focus
}, [menuOpen])
```

Do not reuse the public Shell composition directly: the admin has no invite footer/top navigation and needs a fixed 248px sidebar at `lg` plus a 64px safe-area bottom bar below `lg`. Use semantic route links with `aria-current`, badges omitted at zero, and page-heading focus after route changes.

### `src/components/admin/AdminOverview.tsx` — create

**Role:** render the protected aggregate query as actionable whole-card links.

**Closest analogs:** `useQuery` in `Presentes.tsx`/`MemoriesSection.tsx`; `Card` surfaces.

```ts
const catalog = useQuery(api.wines.listCatalog)
// undefined is loading; data is reactive after resolution
```

Do not copy the result into local state. Render exact-layout skeletons while `undefined`; error uses `—` and a recovery message. Links carry URL filters and must be semantic links, not click handlers on `div`.

### `src/components/admin/AdminGuests.tsx` — create

**Role:** search/filter, independently expandable family rows, dirty editors, create/add dialogs/forms, and destructive confirmations.

**Closest analogs:** `FamilyForm` plus the reducer in `src/lib/rsvpDraft.ts`.

```ts
case 'server_reconciled':
  return reconcileServer(state, action.snapshot)
```

The existing reconciliation rule is directly relevant: clean fields accept reactive server updates; dirty fields preserve local edits. Extend the pattern to admin family/person drafts and surface a conflict instead of silently replacing stale edits. Keep expansion state local and allow multiple open families. Native `<dialog>`/focus-trapped portal has no current reusable dialog primitive; `DiscardDialog.tsx` is the nearest implementation reference and should be inspected when implementing confirmations.

### `src/components/admin/AdminModeration.tsx` — create

**Role:** status tabs, oldest-first review cards, actions, and short-lived conditional undo.

**Closest analogs:** `MemoryCard` for safe text/image rendering and `Toast` for feedback. There is no current moderation UI or undo reducer.

Pattern notes:

- Use one consistent semantic tab model (keyboard arrows + tabpanel) or route links; do not mix.
- Never truncate content needed for the decision; generate protected image URLs only after auth.
- Toast undo holds only the command/precondition, not a shadow copy of the whole protected list.
- On conflict, let the reactive query win and announce that another session changed the memory.

### `src/components/admin/AdminGifts.tsx` — create

**Role:** available/gifted tabs, grouped price bands, search, mark form, and confirmed unmark.

**Closest analogs:** `WineCatalog`/`WineCard` and `GIFT_BANDS` for category ordering/content.

Keep the three established categories and product-code conventions, but do not reuse the decorative public card wholesale. Admin state comes from the protected query because `giftedBy`/`giftedAt` are intentionally absent from public wine DTOs.

### `src/components/ui/Button.tsx` — modify

**Role:** add admin-compatible `secondary` and `destructive` vocabulary without one-off class strings.

**Closest current shape:**

```ts
export type ButtonVariant = 'primary' | 'quiet' | 'rsvp'
const variantClasses: Record<ButtonVariant, string> = { /* ... */ }
```

Preserve 44px targets and existing public variants. Admin variants should be sentence case with compact padding; the current shared base forces uppercase, tracking, pill radius, and generous padding, so either add a density/treatment prop or isolate variant-specific typography/radius without changing existing callers.

### `src/components/ui/Card.tsx` — modify carefully

**Role:** support operational panels without offset shadow or nested decorated cards.

**Closest current shape:**

```tsx
className={`border border-line bg-card p-6
  shadow-[14px_14px_0_var(--color-sand)] sm:p-8 ${className}`}
```

Add an explicit operational treatment (1px border, 8px radius, no shadow) while preserving the public default. Do not rely on every admin caller overriding the hardcoded shadow independently.

### `src/components/ui/Field.tsx` — modify carefully

**Role:** support outlined admin search/select/input controls while retaining the current RSVP bottom-border field.

**Closest current shape:**

```ts
const controlClasses =
  'w-full min-h-[44px] border-0 border-b border-line bg-transparent ...'
```

Add an explicit treatment prop or a companion class helper. Labels remain programmatic/visible, height remains 44px, and errors/hints compose through `aria-describedby`. A reusable Select primitive does not currently exist.

### `src/components/ui/Toast.tsx` — modify

**Role:** optional action/dismiss controls, configurable live-role, and admin mobile safe-area offset.

**Closest current shape:**

```tsx
<div role="status" className="fixed ... bottom-[max(26px,env(safe-area-inset-bottom))]">
  {children}
</div>
```

Extend rather than duplicate. Success/undo uses `role="status"`; failures use `role="alert"`. Admin mobile position must clear `64px + env(safe-area-inset-bottom)`.

### `src/content/admin.ts` + `src/content/admin.test.ts` — create

**Role:** single source of admin navigation labels, routes, status labels, login/error/empty-state/confirmation copy.

**Closest analog:** `src/content/event.ts` and `src/content/gifts.ts`.

```ts
export const RSVP_COPY = {
  session: {
    restoring: 'Reabrindo seu convite…',
    expired: 'Sua sessão terminou...',
  },
  // ...
} as const
```

Centralize route paths/query keys too, so sidebar, bottom bar, overview links, and route validation cannot drift. Component-specific dynamic user data remains props, not global content.

### `src/index.css` — modify minimally

**Role:** admin-wide tokens/utilities only where Tailwind classes cannot express repeated safe-area/layout behavior cleanly.

**Closest conventions:**

```css
@theme {
  --color-cream: #fff3df;
  --color-plum: #35192a;
  --color-rsvp-pendente: #8a4a15;
  --z-toast: 100;
}

:focus-visible {
  outline: 2px solid var(--color-coral);
  outline-offset: 3px;
}
```

Use Tailwind v4 mobile-first classes: base phone layout, `sm:` for 640px density/grid changes, `lg:` for the 248px sidebar, `xl:` for wider gutters. Preserve global focus, AA status colors, `motion-reduce:*`, `env(safe-area-inset-bottom)`, and 44px targets. Add no gradient, glass, decorative hero, or second token palette.

## Files That Should Usually Stay Unchanged

- `src/main.tsx`: existing `ConvexProvider` is sufficient; no identity provider is required.
- `convex/rsvps.ts`: keep guest capability projection public and narrow. Share extracted internals, but do not add admin switches to public handlers.
- `convex/posts.ts`: keep `listApproved` public/minimal; moderation belongs in `adminPosts.ts`.
- `convex/wines.ts`: keep public attribution hidden; status already provides desired public reactivity.
- `src/components/layout/Shell.tsx`: use as behavior reference, not as the admin layout through conditional branches.

## No-Analog / High-Risk Gaps

- Constant-time shared-password verification and deployment-secret validation have no current implementation.
- A shared server admin guard and mandatory endpoint authorization matrix do not exist.
- Reactive exact-time session expiration via scheduled row deletion is new; reservation scheduling is only a structural analog.
- Cross-tab logout/expiry is new; current RSVP session is sessionStorage-scoped and does not listen for storage events.
- Nested admin routing/deep links are new.
- General accent-insensitive search and grouped-family filter semantics are new.
- Native accessible tab keyboard behavior, generic destructive dialogs, conditional undo, and optimistic concurrency across two admin sessions have no reusable shared implementation.
- UI tests currently run in Node without React Testing Library/jsdom. Keep UI logic pure and plan manual browser smoke for focus, responsive shell, storage events, dialogs, safe areas, and live Convex reactivity.

## Recommended Implementation Order

1. Schema, admin model/security/rate limiter/auth/internal expiry, then the authorization/lifecycle tests.
2. Client session helper/reducer, nested routes, gate, shell, content, and protected overview.
3. RSVP admin projection/CRUD with reverse session index, search/reducer tests, then guest UI.
4. Post/wine protected state helpers and concurrency tests, then moderation/gift UI and Toast/dialog extensions.
5. Full `npm test`, `npm run build`, and real-browser/real-Convex smoke for scheduled expiry and two-tab reactivity.

## PATTERN MAPPING COMPLETE
