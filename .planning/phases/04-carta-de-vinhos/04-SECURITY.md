---
phase: 04
slug: carta-de-vinhos
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-25
---

# Phase 04 — Security

> OWASP ASVS L1 verification of the threat registers authored across Plans 04-01 through 04-05.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Browser → Convex public queries | Guests read catalog and reactive status | Public commercial DTO only |
| Convex internal functions → wine records | Seed, reconciliation and reversible smoke mutate server data | Commercial metadata and private gift state |
| Browser → WhatsApp | Available-card anchor opens Vanessa’s `wa.me` URL | Encoded wine name, code and price |
| Server catalog → browser CSS | Palette colors render decorative halos | Two validated hex colors; provenance remains private |
| Phase 4 → Phase 5 shared application | Shared schema, home and package files evolved concurrently | Combined application code and generated types |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation evidence | Status |
|-----------|----------|-----------|----------|-------------|---------------------|--------|
| T-04-01 | Information disclosure | Public wine DTO | high | mitigate | Explicit allowlist projection and exact-key integration tests omit buyer identity. | closed |
| T-04-02 | Integrity | Catalog reconciliation | high | mitigate | Gifted-state preservation test proves commercial repair does not reset state. | closed |
| T-04-03 | Integrity | Catalog query | medium | mitigate | Unique canonical codes plus fail-closed 37-row validation and tests. | closed |
| T-04-04 | Elevation of privilege | Operational writer | high | mitigate | Writers are `internalMutation`; API-vs-internal tests prevent public exposure. | closed |
| T-04-05 | Integrity | Reversible smoke | high | mitigate | Full previous-state snapshot and exact restore are tested for available and gifted records. | closed |
| T-04-06 | Injection | WhatsApp URL | high | mitigate | Constant phone number, single whole-message encoding and URL parser tests. | closed |
| T-04-07 | Injection | Wine deep link | high | mitigate | Digits-only parser, canonical DOM IDs and `getElementById` no-op for unknown fragments. | closed |
| T-04-08 | Intellectual property | Legacy photo assets | medium | mitigate | Superseded photo runtime, manifest and auditor were removed; local neutral SVG is final. | closed |
| T-04-09 | Integrity | Shared package files | medium | mitigate | Narrow staging preserved concurrent Phase 5 work; combined suite/build pass. | closed |
| T-04-10 | Spoofing | External WhatsApp anchor | high | mitigate | Every external gift anchor uses `_blank` with `noopener noreferrer`. | closed |
| T-04-11 | Integrity | Gifted card action | high | mitigate | Gifted state removes the WhatsApp anchor from the DOM instead of disabling it visually. | closed |
| T-04-12 | Injection | Fragment focus | high | mitigate | Validated helper plus direct ID lookup; hostile and malformed fragment tests pass. | closed |
| T-04-13 | Information disclosure | Gift components | high | mitigate | Components accept `PublicWine`; provenance and private gift fields never cross the query. | closed |
| T-04-14 | Availability | Wine visual | medium | mitigate | Superseded network image path was replaced by deterministic local SVG markup. | closed |
| T-04-15 | Integrity | RSVP callout | high | mitigate | Visibility flag changes only in the backend-confirmed `saved` branch; UAT passed. | closed |
| T-04-16 | Integrity | Home preview | medium | mitigate | `listFeatured` is the sole reactive source and canonical featured codes are tested. | closed |
| T-04-17 | Spoofing | Preview interaction | medium | mitigate | Entire preview card is one internal link with no nested WhatsApp action. | closed |
| T-04-18 | Integrity | Phase 4/5 integration | high | mitigate | Combined navigation, schema and home composition remain covered by tests and build. | closed |
| T-04-24 | Injection | Palette CSS | high | mitigate | Strict `#RRGGBB`, distinct-pair, HTTPS and ISO-date validators cover all 37 entries. | closed |
| T-04-25 | Information disclosure / IP | Palette provenance | high | mitigate | Provenance stays server-side; gifts DOM contains no remote image/fetch source. | closed |
| T-04-26 | Intellectual property | Bottle silhouette | medium | mitigate | One unbranded SVG with empty abstract label; final visual UAT passed. | closed |
| T-04-27 | Integrity | Palette migration | high | mitigate | Two-stage migration and reconciliation tests preserve `status`, `giftedBy` and `giftedAt`. | closed |
| T-04-28 | Integrity | Legacy cleanup | high | mitigate | Only three obsolete Phase 4 asset paths were deleted; Phase 5 remains in the final tree. | closed |
| T-04-29 | Integrity | Live verification | high | mitigate | Snapshot/finally restore and idempotent 37-row post-smoke checks passed. | closed |

*Status: open · closed · open — below high threshold (non-blocking)*

---

## Accepted Risks Log

No accepted risks.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-25 | 24 | 24 | 0 | Codex / GSD ASVS L1 |

---

## Sign-Off

- [x] All threats have a disposition.
- [x] No accepted risk requires documentation.
- [x] `threats_open: 0` confirmed.
- [x] `status: verified` set in frontmatter.

**Approval:** verified 2026-07-25
