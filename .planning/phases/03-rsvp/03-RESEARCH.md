# Phase 3: RSVP — Research

**Researched:** 2026-07-24  
**Scope:** RSVP-01 through RSVP-05  
**Current stack:** React 19.2.8, React Router 7.18.1, Convex 1.42.3, Vite 7.3.1, Vitest 4.1.10  
**Overall confidence:** High

## Executive Summary

Phase 3 should implement RSVP as a deliberately small, capability-scoped public workflow:

1. A visitor opens `/confirmar` from either the hero or navigation.
2. The visitor enters a phone number.
3. A **public mutation**, not a query, normalizes and rate-limits that lookup, finds one pre-existing family, and grants a short-lived opaque session capability for that family.
4. A session-gated query returns only that family's people and current responses.
5. A session-gated, rate-limited mutation applies a **sparse patch** containing only the people changed by the visitor, plus an optional shared contact update.
6. The opaque capability is kept only in `sessionStorage`, so reload in the same tab/browser session can reopen the family while a new browser session asks for the phone again.

The important architectural point is that the phone number is a light access key, not an account or strong authenticator. The backend must therefore limit both enumeration and damage:

- there must be no public list, public seed, or public “get family by phone” query;
- every read and write after lookup must verify an unexpired server-side session and scope itself to one `rsvps` document;
- every submitted guest ID must be checked against that RSVP before any write;
- lookup and save must be rate-limited server-side;
- raw phone, contact, and session tokens must not be logged or exposed unnecessarily.

The phase needs three application tables, even though RSVP-02 names the two domain tables:

- `rsvps` — one pre-existing invitation/family and its canonical phone;
- `rsvpGuests` — individual invitees and their independent status;
- `rsvpSessions` — short-lived hashed capability tokens used to satisfy the locked “current browser session only” behavior.

The extra session table is implementation support for D-06, not a new user-facing domain or guest account.

The phase should also add the official `@convex-dev/rate-limiter` component and `convex-test`. Current published versions researched are `@convex-dev/rate-limiter@0.3.2` and `convex-test@0.0.54`; pin exact versions to match the repository's existing dependency policy. The rate limiter declares compatibility with Convex `^1.24.8` and React 18/19, so it is compatible with the installed Convex 1.42.3 and React 19.2.8.

## Scope and Locked Decisions

The planner should treat every decision in `03-CONTEXT.md` as fixed:

- RSVP lives at the dedicated `/confirmar` route.
- The hero's primary CTA and a navigation link labeled **“Confirmar presença”** both lead there.
- A phone number identifies a pre-existing invitation/family.
- A valid lookup reveals that family's people and current answers.
- Re-entering the phone reopens the same family; it never creates another RSVP.
- A valid family remains unlocked only for the current browser session.
- Every person can independently be `vai`, `não vai`, or `pendente`.
- Partial saves are valid; unanswered people remain pending.
- A shared WhatsApp/email contact is optional and belongs to the family, not each person.
- The UI must contain the literal copy **“Confirme até 30 de setembro”**.
- The deadline is informational. The server must not reject later responses.
- Admin authentication, CRUD, import, and guest accounts remain outside this phase.

The previous project is a behavioral reference, not an architecture to transplant. In particular:

- Keep the useful national phone representation and DDD `55` edge-case tests.
- Keep the per-person response model and optional shared contact.
- Do not restore guest passwords, access codes, staff roles, or the old “all people must answer” constraint.
- Do not expose any path by which a phone number can resolve to staff/admin access.

## Existing Project Fit

The current project already has most frontend foundations:

- `src/main.tsx` wraps the app in both `ConvexProvider` and `BrowserRouter`.
- `src/App.tsx` uses declarative `<Routes>` and already reserves `/admin`.
- `vercel.json` rewrites application URLs to `index.html`, so direct visits to `/confirmar` are already compatible with hosting.
- `Shell`, `Hero`, `Field`, `Button`, `Card`, and `Toast` provide the required visual and accessibility primitives.
- `src/index.css` already defines semantic RSVP colors for yes, pending, and no.
- `src/content/event.ts` is the existing source for navigation, hero, and event copy.
- `Hero.tsx` explicitly leaves the RSVP destination for this phase.

Important gaps:

- `convex/schema.ts` is empty.
- There is no rate-limiter component configuration.
- There are no RSVP functions or data fixtures.
- Vitest currently includes only `src/**/*.test.ts`; Convex test files will not run until its include/project configuration changes.
- `npm run build` type-checks the Vite app but is not sufficient evidence that Convex functions and component code generate/deploy correctly.

The phase should preserve the current declarative router rather than migrate to a data router. React Router's official declarative-mode guidance explicitly supports `<BrowserRouter>`, `<Routes>`, `<Route>`, and `<Link>` for this use case.

## Recommended Backend Architecture

### Data model

Use explicit schema validators and indexes. Convex adds `_id` and `_creationTime` automatically; application timestamps should represent business changes, not duplicate those system fields.

Recommended logical shape:

```ts
const attendance = v.union(
  v.literal("pending"),
  v.literal("yes"),
  v.literal("no"),
);

export default defineSchema({
  rsvps: defineTable({
    phone: v.string(),             // canonical national digits only
    displayName: v.string(),       // family/invitation greeting
    contact: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_phone", ["phone"]),

  rsvpGuests: defineTable({
    rsvpId: v.id("rsvps"),
    name: v.string(),
    attendance,
    sortOrder: v.number(),
    respondedAt: v.optional(v.number()),
  })
    .index("by_rsvp", ["rsvpId"])
    .index("by_rsvp_sort", ["rsvpId", "sortOrder"]),

  rsvpSessions: defineTable({
    tokenHash: v.string(),
    rsvpId: v.id("rsvps"),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_token_hash", ["tokenHash"])
    .index("by_expires_at", ["expiresAt"]),
});
```

Notes for planning:

- `rsvps.phone` is the canonical **national** number (`DDD + subscriber`) without `+55`. This matches the useful part of the previous project and prevents accidental removal of DDD `55`.
- Store the status as a literal union. Do not infer “pending” from a missing property; explicit state makes partial edits, return validation, and admin reporting less error-prone.
- `by_rsvp_sort` is enough for the public family view. A separate `by_attendance` index is not needed for Phase 3 and can be added later if the dashboard needs aggregate filtering.
- Contact should be omitted when absent. At the API boundary, use an explicit nullable command to distinguish “leave unchanged” from “clear it.”
- Never store the raw capability token in `rsvpSessions`; store only a SHA-256 hash.
- Expired session rows may initially be cleaned lazily. The `by_expires_at` index makes a later scheduled cleanup possible without changing the public contract.

Convex indexes accelerate lookups but are not SQL-style unique constraints. Calling `.unique()` detects duplicate rows by throwing, but the index definition itself does not prevent duplicates. Every internal import/create writer must:

1. normalize the phone;
2. read `by_phone`;
3. reject an existing row;
4. insert only when none exists.

Convex mutations run as serializable transactions and retry conflicts, so doing the indexed check and insert in the same mutation gives the desired logical uniqueness under concurrent writers. Centralize that invariant in an internal helper or internal mutation so future Phase 6/7 import work cannot bypass it.

### Public function surface

Keep the public surface narrow. A suitable contract is:

| Function | Kind | Public input | Public output | Security role |
|---|---|---|---|---|
| `unlockByPhone` | mutation | raw phone, fresh opaque token | discriminated success/not-found/rate-limited result | normalizes, consumes lookup limits, creates scoped session |
| `getCurrent` | query | opaque token | family view or `null` | hashes token, validates expiry, returns one family only |
| `saveResponses` | mutation | token, sparse guest patches, optional contact command | updated family view or success revision | validates scope, consumes save limits, patches atomically |

Use `args` **and** `returns` validators on every public function. Convex recommends return validation as part of the public contract, and it prevents an accidental future return of `phone`, `tokenHash`, or an entire database document.

The family view should be a purpose-built object, for example:

```ts
{
  displayName: string,
  contact?: string,
  guests: Array<{
    id: Id<"rsvpGuests">,
    name: string,
    attendance: "pending" | "yes" | "no",
  }>,
  updatedAt: number,
}
```

Do not return:

- canonical/raw phone;
- `rsvpId`;
- session document ID, token hash, or expiration internals;
- unrelated document fields;
- guests from another family.

### Why phone unlock is a mutation

The lookup must be a mutation because it changes two pieces of state:

- the rate-limit bucket;
- the short-lived `rsvpSessions` capability.

A public query such as `getByPhone` would let an attacker enumerate without consuming a transactional application limit. It would also place guest names directly behind a low-entropy identifier with no scoped follow-up capability.

One Convex transaction detail matters: rate-limit consumption is transactional. If `unlockByPhone` consumes a limit and then throws because the phone was not found, the whole transaction rolls back and the attempt does **not** count. Therefore:

- expected outcomes such as `invalid_phone` and `not_found` should return a discriminated result after the relevant limit was consumed;
- unexpected invariant failures can throw;
- a rate-limit failure can either return `{ kind: "rate_limited", retryAfter }` or use the component's typed `ConvexError`, as long as the client maps it to safe copy.

When more than one bucket applies, first `check` all buckets and then consume them, or use throwing semantics that roll back all of them. The official component documentation warns about partial consumption when several limits are evaluated naively.

### Session-scoped capability

The locked browser-session behavior requires more than React state. React state is lost on reload; permanent local storage survives longer than requested.

Recommended flow:

1. Client generates a high-entropy token using `crypto.randomUUID()` or 32 random bytes.
2. Client sends the raw token with the phone lookup.
3. Server hashes it with SHA-256 and stores only the hash, `rsvpId`, and absolute expiry.
4. Client stores the raw token under a versioned key in `sessionStorage`.
5. On `/confirmar`, `useQuery` is skipped until token restoration finishes.
6. `getCurrent` returns `null` for an unknown or expired token.
7. When invalid/expired, the client deletes its local token and returns to the phone gate.

An 8-hour absolute TTL is a reasonable initial value for an invitation workflow. Do not implement sliding extension in Phase 3: an absolute expiry is simpler to reason about and test. A fresh successful phone lookup can create a new session.

This is a **capability**, not authentication. OWASP advises against keeping session identifiers in JavaScript-accessible browser storage because an XSS can read them. In this architecture, a same-origin `HttpOnly` cookie would require adding a BFF/HTTP session layer that the current direct Convex React client does not have. For this low-sensitivity, single-family RSVP, `sessionStorage` is a proportionate compromise if all of these mitigations are kept:

- short absolute lifetime;
- one-family server-side scope;
- no PII inside the token;
- high entropy;
- token stored hashed at rest;
- no token in URL, analytics, logs, error text, or rendered DOM;
- no `dangerouslySetInnerHTML` for guest-provided text;
- normal dependency and XSS hygiene.

If the data becomes more sensitive or the public surface expands, revisit the architecture rather than treating `sessionStorage` as equivalent to an `HttpOnly` authenticated session.

### Internal functions and fixtures

Phase 3 needs a family already present for development and end-to-end acceptance, but must not introduce public self-registration:

- create an `internalMutation` or test-only fixture helper that inserts one deterministic RSVP and guests through the same normalization/uniqueness logic;
- keep production import/CRUD for Phase 6/7;
- never expose a public `seed`, `createRsvp`, or “unknown phone creates family” mutation;
- make fixture setup idempotent so repeated local setup does not duplicate families or guests.

Convex internal functions cannot be called directly from a client, making them the correct boundary for this temporary development seam.

## Brazilian Phone Normalization

### Canonical representation

Use one canonical storage format:

```text
DDD + subscriber digits
```

Examples:

- mobile: `79999999999`
- fixed line: `7932222222`
- DDD 55 mobile: `55999999999`

Do not store punctuation, spaces, trunk prefix `0`, carrier-selection prefix, or country code `55`.

Anatel states that the ninth-digit migration was completed nationally by 14 February 2017 and mobile numbers use `9XXXX-XXXX`. Current Anatel guidance distinguishes ordinary fixed prefixes (`2`–`5`) from mobile (`9`); service-specific/trunk ranges such as `7` make a naïve “all ten-digit numbers beginning 6–9 are definitely legacy mobile” rule potentially ambiguous.

### Parsing order

The country-code/DDD-55 edge case makes order important:

1. Trim the input and reject unsupported alphabetic/control characters rather than silently turning arbitrary text into digits.
2. Record whether the original input explicitly began with `+55`.
3. Remove allowed formatting characters.
4. Remove a domestic trunk `0` when it precedes a plausible national number.
5. Remove country code `55` when:
   - the input explicitly used `+55`, or
   - the digits still have more than 11 digits and begin with `55`.
6. **Do not** remove leading `55` from an already valid 10- or 11-digit national number; that may be DDD 55.
7. Validate the remaining DDD and subscriber length.
8. Resolve current/legacy mobile form as described below.

The previous implementation's useful rule — strip `55` only when the length proves it is a country code — should remain covered by regression tests.

### Ninth-digit ambiguity

Do not hide ambiguity in a broad regex. Model it in the pure phone module.

Recommended API:

```ts
type NormalizedPhone =
  | { kind: "canonical"; phone: string }
  | { kind: "legacy-mobile"; phone: string; lookupCandidates: string[] }
  | { kind: "invalid" };
```

Equivalent shapes are fine, but the module should support these semantics:

- 11 national digits with subscriber starting `9`: current mobile, keep as-is.
- 10 national digits with subscriber starting `2`–`5`: fixed line, keep as-is.
- 10 national digits in a legacy/mobile-looking range: derive the ninth-digit form by inserting `9` after DDD, but preserve an exact candidate for safe migration/lookup.
- malformed length or impossible structure: invalid.

For ambiguous ten-digit input, lookup should:

1. try exact canonical records;
2. try the ninth-digit candidate;
3. return not found when neither matches;
4. treat “both candidates belong to different families” as a data invariant failure, not silently choose one.

All imported data should be canonicalized to the current form, so the candidate path is primarily a compatibility measure for visitors typing a saved legacy number and for old fixture data. This avoids making the UI ask guests to understand the ninth-digit migration while avoiding a false match when data is inconsistent.

If implementation chooses a simpler `string | null` API, it must still document and test the exact policy for ten-digit `6`–`9` prefixes; “strip non-digits and check length” does not satisfy RSVP-01.

### Required normalization test matrix

The isolated module should cover at least:

| Case | Example intent | Expected |
|---|---|---|
| formatted mobile | `(79) 99999-9999` | current national mobile |
| explicit country | `+55 (79) 99999-9999` | same canonical mobile |
| spaced country | `55 79 99999-9999` | same canonical mobile |
| domestic trunk | `0 79 99999-9999` | same canonical mobile |
| fixed line | `(79) 3222-2222` | ten-digit fixed |
| DDD 55 mobile | `(55) 99999-9999` | preserves DDD 55 |
| DDD 55 fixed | `55 3222-2222` | preserves DDD 55 |
| country + DDD 55 | `+55 55 99999-9999` | removes country only |
| legacy mobile | `(79) 9999-9999` | candidate/current ninth-digit policy |
| normalized equivalence | all variants above | same lookup key when equivalent |
| too short/long | malformed digits | invalid |
| letters/control chars | non-phone text | invalid |
| empty/whitespace | blank input | invalid |

The server is authoritative. The client may mask or format for comfort, but it must submit the raw entered value and never be the only place normalization occurs.

## Rate Limiting

### Package and setup

Use the Convex-maintained component:

```text
@convex-dev/rate-limiter@0.3.2
```

Setup requires:

1. install the package;
2. add `convex/convex.config.ts`;
3. call `app.use(rateLimiter)`;
4. run `npx convex dev` so `components.rateLimiter` is generated;
5. construct a `RateLimiter` in a backend-only module;
6. register the component's test adapter in `convex-test`.

Never hand-edit `convex/_generated`. Regenerate it after schema/component/API changes.

### Threat model and keys

Regular Convex queries and mutations do not expose a trustworthy request IP. A client-generated nonce alone is also not an anti-bot identity because an attacker can rotate it. The official Convex rate-limiting guidance explicitly describes:

- a client-generated session ID as optimistic and weak by itself;
- IP association as lossy because legitimate users can share an IP;
- CAPTCHA-bound anonymous sessions as the robust escalation.

For this phase, use defense in depth:

- **per-phone lookup bucket** keyed by a hash of the canonical phone/candidate;
- **global lookup bucket** to put an upper bound on enumeration volume;
- **per-session save bucket** keyed by token hash after a valid unlock;
- **global save bucket** as a circuit breaker.

Do not use the raw phone as a component key. A plain unsalted phone hash is still pseudonymous and guessable, but it avoids copying the number verbatim into rate-limit storage. The application should never expose rate-limit keys.

### Starting limits

Exact production values are Claude's discretion. A reasonable, intentionally conservative baseline for a small private event is:

| Bucket | Algorithm | Starting policy | Purpose |
|---|---|---|---|
| `rsvpLookupByPhone` | token bucket | 5 per 15 minutes, capacity 5 | slows repeated probing of one family |
| `rsvpLookupGlobal` | fixed window/token bucket | 120 per 15 minutes | caps broad enumeration |
| `rsvpSaveBySession` | token bucket | 30 per hour, capacity 10 | permits normal edits/retries |
| `rsvpSaveGlobal` | fixed window/token bucket | 300 per hour | caps automated writes |

These are calibration defaults, not security absolutes. Put values in one exported configuration so tests and future production tuning use the same source. Avoid client copy that reveals which exact bucket was hit.

Trade-off: a global bucket can temporarily affect legitimate guests during an attack. That is acceptable as a last-resort brake for a small event, but it must not be represented as DDoS protection. If telemetry or launch testing shows meaningful hostile automation, add CAPTCHA/Turnstile in the hardening phase rather than relying on rotating client IDs.

### Error semantics

Return stable application-level states:

```text
invalid_phone
not_found
rate_limited
session_expired
invalid_update
saved
```

The UI can still honor D-04 with helpful Portuguese copy. Keep invalid/not-found responses visually similar and avoid returning family-specific clues. Do not rely on raw Convex error message strings in product logic.

## Privacy, Enumeration, and Authorization

The business requirement necessarily leaks whether a known phone maps to an invitation and reveals family names after success. It is impossible to make that equivalent to strong authentication. The implementation should reduce avoidable leakage:

- No public collection query.
- No public phone query returning family data directly.
- No response before successful unlock contains a guest name, contact, canonical phone, or RSVP ID.
- “Not found” does not distinguish “malformed,” “not invited,” “disabled,” or “duplicate data” in a way useful to an attacker; client-side field guidance can still explain formatting.
- Similar control flow/timing for failed lookups where practical; do not do expensive work only for existing records.
- Rate-limit failed as well as successful lookups.
- Hash correlation keys and tokens.
- Never log raw phone, contact, family result, or token.
- Validate input lengths before database work.
- Limit the patch array to a realistic family size.
- Validate guest ownership on **every** save; a Convex document ID is not authorization.
- Return `null`/generic expired state for unknown, expired, or malformed tokens.
- Render all names/contact as normal React text; no raw HTML.

OWASP's generic authentication-response guidance is stricter than the locked “number not found” behavior. The phase cannot eliminate enumeration without changing product requirements, so rate limiting and minimal response shape are the primary controls. Document this residual risk for Phase 7.

## Idempotent Partial RSVP Updates

### Sparse command, not full replacement

The save mutation should receive only changed people:

```ts
{
  token: string,
  guestUpdates: Array<{
    guestId: Id<"rsvpGuests">,
    attendance: "pending" | "yes" | "no",
  }>,
  contact:
    | { kind: "unchanged" }
    | { kind: "set"; value: string }
    | { kind: "clear" },
}
```

The exact validator shape may vary. The essential semantics are:

- omission means “leave unchanged”;
- explicit `pending` is allowed;
- contact has a true tri-state so an empty field does not accidentally clear on an unrelated person edit;
- every guest ID in the command is unique;
- every guest belongs to the session's `rsvpId`;
- the array and contact length have server-side bounds.

Before writing:

1. validate and hash the session token;
2. load one unexpired session;
3. query that RSVP's guests through `by_rsvp`;
4. reject duplicate submitted IDs;
5. reject any submitted ID outside the allowed set;
6. normalize/trim the optional contact and enforce the chosen maximum (the legacy UI used 120 characters);
7. apply only changed fields in one mutation.

Convex commits the mutation atomically, including all per-person patches and contact. If validation fails, no partial family update should survive.

### Idempotence definition

Calling the mutation twice with the same valid sparse command must yield the same business state and must never insert another RSVP or guest.

For clean idempotence:

- use `db.patch`, never delete/reinsert guests;
- skip a patch when the stored status already equals the requested status;
- update `respondedAt` only when that person's status changes;
- update family `updatedAt` only when at least one business field changes;
- make a contact set to its already-normalized value a no-op.

This prevents double-clicks/retries from creating timestamp churn while preserving the desired final state.

### Concurrent edits

Sparse patches are preferable to submitting the entire family snapshot:

- two tabs changing different people can compose;
- omitted people are never overwritten by a stale client;
- two tabs changing the same person resolve to the last committed write;
- shared contact is also last-write-wins.

An `expectedUpdatedAt` optimistic-concurrency protocol is not necessary for this low-stakes flow and would complicate partial edits. The UI should maintain:

- the latest server snapshot;
- a local draft;
- a set of dirty guest IDs/contact state;
- a busy flag to prevent accidental duplicate interaction.

After save, allow the reactive `getCurrent` query to reconcile the view and show `Toast` success. Server idempotence, not the disabled button, is the correctness boundary.

## React and Router Integration

### Route and entry points

Add the route to the existing declarative router:

```tsx
<Route path="/confirmar" element={<Confirmar />} />
```

Use React Router `<Link to="/confirmar">` for route navigation. Keep normal fragment anchors for same-page home sections. On `/confirmar`, do not render bare `#programacao` links that would target the RSVP page; either:

- give that page a reduced navigation/back-to-invitation treatment, or
- make home-section targets absolute, such as `/#programacao`.

The hero should expose:

- primary: **Confirmar presença** → `/confirmar`;
- secondary: existing program/scroll action.

Centralize route-facing labels and deadline copy in the established content module rather than scattering literals, while ensuring the rendered sentence is exactly **“Confirme até 30 de setembro”**.

### Two-stage UI state machine

Model the page as explicit states rather than one deeply conditional component:

```text
restoring session
  -> phone gate
  -> unlocking
  -> family form
  -> saving
  -> saved
  -> expired/error -> phone gate
```

Recommended details:

- phone input: `type="tel"`, `inputMode="tel"`, `autoComplete="tel"`;
- stage one submits through `useMutation(unlockByPhone)`;
- token restoration happens once on mount;
- `useQuery(api.rsvps.getCurrent, token ? { token } : "skip")`;
- loading should not briefly show “not found”;
- invalid/expired sessions remove the stored token;
- each person's three options use native radios inside a `fieldset`/`legend`, or an equivalently complete accessible radio group;
- show pending as a deliberate selectable state, not just “nothing clicked”;
- preserve focus and put inline errors in a live region;
- use `Button`'s busy state and existing `Toast` for save feedback;
- provide a visible “usar outro telefone” action that clears the capability.

The summary should distinguish answered and pending people, but partial save must remain available. Do not copy the legacy form's “answer everyone before saving” validation.

### Contact behavior

The field is a single optional family-level contact. A practical UI can label it:

> WhatsApp ou e-mail para contato (opcional)

Normalize only surrounding whitespace. Do not attempt to turn a mixed email/WhatsApp field into one canonical identifier. Apply the server-side length limit and allow an explicit clear.

## Testing Strategy

### Dependency and configuration changes needed before behavior tests

Wave 0 should prepare the harness:

- add exact dev dependency `convex-test@0.0.54`;
- add the official `@edge-runtime/vm` test dependency if not pulled transitively, following Convex's setup guide;
- update Vitest so `convex/**/*.test.ts` runs in a Convex-compatible environment;
- add the rate-limiter component test registration;
- add `convex/convex.config.ts`;
- regenerate Convex API/component types.

The rate limiter exports a test adapter:

```ts
import rateLimiterTest from "@convex-dev/rate-limiter/test";

rateLimiterTest.register(t);
```

Use `convexTest(schema, modules)` and seed documents with `t.run(...)` or an internal test helper. Tests should call the public functions through generated `api`, so validators, authorization, and return shapes are exercised together.

### Automated layers

#### Pure unit tests

Keep deterministic logic outside handlers where possible:

- phone parsing/normalization and candidate generation;
- contact normalization;
- sparse patch/draft calculation;
- presentation summary counts if non-trivial.

These tests are fast and should cover every boundary table in this research.

#### Convex integration tests

Use `convex-test` for:

- indexed lookup and session issuance;
- session scope and expiry;
- partial/idempotent mutations;
- ownership and validation rejection;
- rate-limiter behavior;
- transactional rollback.

The test harness should register the rate-limiter component for every test instance that exercises public RSVP mutations.

#### Build/backend smoke

`convex-test` is a mock and does not exactly reproduce backend limits, ID format, or every runtime builtin. Convex's own docs require manual/real-backend checking for those differences. Therefore phase completion requires:

```bash
npm test
npm run build
npx convex dev --once
```

If the local deployment is unavailable in CI, `npx convex codegen` plus the repository's Convex TypeScript check is the minimum automated fallback, but a connected development deployment smoke remains required before phase sign-off.

#### Manual browser acceptance

No Testing Library or browser E2E stack currently exists. For this phase, focused pure/model tests plus a manual browser matrix are lower cost than introducing a full DOM suite only for one page. Revisit an E2E tool in hardening if more public workflows need it.

Manual acceptance should cover:

- direct load and refresh of `/confirmar`;
- both entry points from home;
- valid and unknown numbers;
- equivalent phone formats;
- partial save with at least one pending person;
- reopen/edit with the same phone;
- reload in the same tab retaining access;
- a new browser session/incognito asking for phone;
- expired/invalid token returning safely to the gate;
- keyboard-only and mobile-width interaction;
- screen-reader naming of each person's status group;
- literal deadline copy and continued editing after the date.

## Validation Architecture

This section is intended to feed the phase's Nyquist `VALIDATION.md`.

### Validation principle

Every task should have a fast local proof, and every requirement should have at least one automated proof plus the minimum human check needed for visual/browser-session behavior. Do not postpone all integration checks to the end of the phase.

### Requirement-to-proof matrix

| Requirement | Automated proof | Integration proof | Human/browser proof |
|---|---|---|---|
| RSVP-01 phone normalization | isolated table-driven tests for formatting, country code, trunk zero, DDD 55, fixed, legacy ninth digit, invalid input | same equivalent forms unlock the same fixture and consume the same per-phone bucket | masked/raw entry behaves consistently on mobile keyboard |
| RSVP-02 Convex schema | `convex-test` inserts valid docs; invalid literals/shapes rejected; indexes used in functions | `npx convex dev --once` validates schema, indexes, component, and generated APIs | fixture visible only through scoped public workflow |
| RSVP-03 per-person public response | integration tests for yes/no/pending, partial patch, explicit pending, contact set/clear, atomic rejection | repeat identical mutation is a no-op; omitted guests unchanged | keyboard/mobile save, summary, success feedback, literal deadline |
| RSVP-04 phone lookup and edit | valid unlock, unknown lookup, scoped query, session expiry, repeated lookup, sparse concurrent edits | same family ID/guest rows remain; no duplicate RSVP/guests | reload same tab restores; new session asks phone; “usar outro telefone” clears |
| RSVP-05 rate limiting | threshold, retry metadata, distinct-key isolation, normalized-key equivalence, invalid/not-found attempts consume | component registered and callable on real dev backend | friendly generic throttled state; form cannot spam while busy |

### Critical backend test cases

The phase should not be marked complete without automated coverage for:

1. Valid phone unlock returns only its family's display data.
2. Unknown and malformed numbers return safe outcomes and no session.
3. A raw phone or contact is never returned before successful session validation.
4. A session for family A cannot read or write family B.
5. Unknown, malformed, and expired tokens return the same public “expired/locked” shape.
6. A partial patch changes only submitted guest IDs.
7. Explicit `pending` works and omitted guests remain unchanged.
8. Repeating an identical patch leaves business fields and timestamps unchanged.
9. Duplicate guest IDs in one command are rejected atomically.
10. A guest ID from another family is rejected atomically.
11. A malformed later item cannot leave earlier patches committed.
12. Contact supports set, trim, no-op, clear, and maximum-length rejection.
13. Equivalent phone formats map to the same family and per-phone limiter key.
14. DDD 55 is not mistaken for country code 55.
15. Ninth-digit candidates resolve correctly; a two-family ambiguity fails closed.
16. Logical phone uniqueness is enforced by the internal create/import seam.
17. Lookup limits count not-found attempts instead of rolling them back.
18. Per-phone/per-session limits isolate unrelated legitimate guests.
19. Global limits cap aggregate attempts.
20. No public function can create invitations, enumerate families, or accept an RSVP ID as its authorization.

### Per-task and per-wave commands

Use the narrowest relevant test during implementation:

```bash
npx vitest run src/lib/phone.test.ts
npx vitest run convex/rsvps.test.ts
```

At the end of every implementation wave:

```bash
npm test
npm run build
```

At the schema/component/API integration boundary and before final sign-off:

```bash
npx convex dev --once
```

Generated code must be regenerated, never manually patched. A clean `git diff --check` should be part of final verification.

### Validation sequencing

Recommended sequence:

1. Phone unit tests fail first, then normalization implementation passes.
2. Schema/component test harness compiles before public handlers are planned as complete.
3. Backend integration tests establish access, partial-save, idempotence, and rate limits.
4. Frontend state/model tests cover sparse draft calculation.
5. Route/form implementation integrates with those stable contracts.
6. Full tests/build/Convex smoke run.
7. Manual browser matrix validates session lifetime, routing, copy, and accessibility.

This sequencing ensures that UI work is not forced to compensate for an unstable or over-broad public API.

## Planning Implications

The phase naturally divides into dependencies, backend behavior, and integration:

1. **Foundation:** phone module/tests, schema, rate-limiter component, Convex test harness, internal fixture seam.
2. **Public RSVP backend:** unlock capability, scoped query, sparse/idempotent save, privacy checks, rate-limit tests.
3. **Frontend integration:** `/confirmar`, session restoration, two-stage form, entry points, responsive/accessibility/manual validation.

The phone/schema/component foundation should land before UI work that depends on generated APIs. Once the public function contract exists, frontend layout/state work and deeper backend edge-case tests can proceed in parallel.

The planner should explicitly budget for generated Convex files and real-backend codegen/deploy validation. A green Vite build alone is not sufficient.

## Common Pitfalls to Avoid

- Making phone lookup a query and trying to rate-limit only save.
- Treating a client-generated “session ID” as meaningful anti-bot protection before it is authorized by a successful phone lookup.
- Keeping the raw phone as the post-unlock credential.
- Storing raw capability tokens server-side.
- Putting the token in a query string or route parameter.
- Returning entire Convex documents from public functions.
- Accepting an `rsvpId` from the client as authorization.
- Using `db.get(guestId)` without also checking the guest belongs to the session family.
- Assuming a Convex index enforces uniqueness.
- Throwing on ordinary not-found after consuming a transactional rate limit, thereby rolling back the attempt.
- Saving a complete stale family snapshot when only one person changed.
- Replacing/deleting guest rows on edit, which changes IDs and creates duplicate/race risks.
- Updating timestamps on idempotent retries.
- Collapsing `pending` into an absent value.
- Requiring every person to answer, contrary to the phase's partial-save decision.
- Stripping every leading `55`, which breaks DDD 55.
- Treating every ten-digit `6`–`9` subscriber as unambiguously mobile without a documented candidate policy.
- Relying on the client mask as phone validation.
- Creating a public seed/self-registration route because production import is deferred.
- Reusing home fragment links unchanged on `/confirmar`.
- Assuming `sessionStorage` is protected from XSS like an `HttpOnly` cookie.
- Claiming application-level limits are DDoS protection.
- Testing only with `convex-test` and never running Convex codegen/dev against the real runtime.

## Open Questions for Implementation Discretion — RESOLVED

All planning-discretion questions are resolved; none remains open for implementation:

- **(RESOLVED) Portuguese state copy:** use the exact approved strings in `03-UI-SPEC.md` for generic not-found, lookup/save rate-limit, connection failure, and expired session. Invalid/not-found remain one generic public message; rate-limit copy receives only the rounded `{tempo}` value and never names a bucket/threshold.
- **(RESOLVED) RSVP Shell navigation:** use the reduced route navigation with absolute home targets: `Convite -> /`, `Programação -> /#programacao`, and `Local -> /#aracaju`; no bare fragment is rendered on `/confirmar`.
- **(RESOLVED) Per-person choice layout:** preserve the semantic order `Vai`, `Pendente`, `Não vai`; stack as full-width rows at 320–359px, use three equal columns from 360px, and place name/choices side-by-side only from 768px when the name column can remain at least 180px.
- **(RESOLVED) Saved confirmation feedback:** render a persistent inline status/count summary as the authoritative state and use the existing Toast only as a secondary polite announcement; completion is never toast-only.
- **(RESOLVED) Session TTL and initial limiter policies:** use an absolute, non-sliding 8-hour server TTL. Centralize fixed-window limits at lookup-per-phone 5/15min, lookup-global 120/15min, save-per-session 30/hour, and save-global 300/hour, with exact boundary/retry tests.
- **(RESOLVED) Expired-session cleanup:** Phase 3 uses lazy expiration only—every read/write validates `now < expiresAt` and rejects expired capabilities. No cron or scheduled cleanup is added in this phase. The `by_expires_at` index preserves a future cleanup path; scheduled deletion remains out of scope unless storage/operations later demonstrate it is necessary.

The following are **not** open:

- no login;
- no public invitation creation;
- partial save is valid;
- pending is explicit;
- access expires with the browser session/server TTL;
- deadline remains informational;
- phone lookup never grants admin access.

## Sources

### Project sources

- `.planning/phases/03-rsvp/03-CONTEXT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/PROJECT.md`
- `package.json`, `vite.config.ts`, `vercel.json`
- `src/main.tsx`, `src/App.tsx`, `src/content/event.ts`
- `src/components/invite/Hero.tsx`, `src/components/layout/Shell.tsx`
- `src/components/ui/Field.tsx`, `Button.tsx`, `Card.tsx`, `Toast.tsx`
- `convex/schema.ts`
- Canonical previous-project references named in `03-CONTEXT.md`: `design.md`, `lib/phone.mjs`, `tests/phone.test.mjs`, `app/api/rsvp/route.ts`, and `EventSite.tsx`

### Primary and official external sources

- [Convex schemas](https://docs.convex.dev/database/schemas)
- [Convex indexes](https://docs.convex.dev/database/reading-data/indexes/)
- [Convex reading data](https://docs.convex.dev/database/reading-data/)
- [Convex writing data and atomic bulk writes](https://docs.convex.dev/database/writing-data)
- [Convex argument and return validation](https://docs.convex.dev/functions/validation)
- [Convex mutation functions and transactions](https://docs.convex.dev/functions/mutation-functions)
- [Convex internal functions](https://docs.convex.dev/functions/internal-functions)
- [Convex application errors](https://docs.convex.dev/functions/error-handling/application-errors)
- [Convex runtimes](https://docs.convex.dev/functions/runtimes)
- [Convex React client](https://docs.convex.dev/client/react/overview)
- [Using Convex components](https://docs.convex.dev/components/using)
- [Testing Convex functions with convex-test](https://docs.convex.dev/testing/convex-test)
- [Official Convex rate-limiter component](https://github.com/get-convex/rate-limiter)
- [Official Convex application-layer rate-limiting guidance](https://stack.convex.dev/rate-limiting)
- [React Router declarative routing](https://reactrouter.com/start/declarative/routing)
- [React Router Link](https://reactrouter.com/api/components/Link)
- [Anatel: ninth digit](https://www.gov.br/anatel/pt-br/regulado/numeracao/nono-digito)
- [Anatel: mobile numbering table](https://www.gov.br/anatel/pt-br/regulado/numeracao/tabela-servico-movel-celular)
- [Anatel numbering FAQ](https://www.gov.br/anatel/pt-br/regulado/numeracao/perguntas-frequentes)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP API4:2023 Unrestricted Resource Consumption](https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/)
- [MDN sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage)
- [MDN Crypto.randomUUID](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID)
