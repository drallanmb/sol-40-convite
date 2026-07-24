# API Coverage — RSVP Convex application surface

> Full phase surface is enumerated below. This is the application's own Convex
> backend, not a third-party API integration. Public guest capabilities are
> integrated; development-only internals are explicitly excluded from the
> browser surface.

| capability | decision | reason |
|---|---|---|
| `rsvps.unlockByPhone` | INTEGRATE | Public guest entry point required to identify an existing invitation and issue a scoped capability. |
| `rsvps.getCurrent` | INTEGRATE | Public capability-scoped read required to reopen one family's current RSVP. |
| `rsvps.saveResponses` | INTEGRATE | Public capability-scoped mutation required for sparse, idempotent guest/contact updates. |
| `rsvpInternal.ensureDemoFixtures` | OPT-OUT | Internal development fixture seam; exposing it to the browser would create invitations outside the trusted workflow. |
| `rsvpInternal.issueDemoSession` | OPT-OUT | Internal UAT helper only; public exposure would bypass phone-based invitation lookup. |
| `rsvpInternal.prepareSaveThrottleDemo` | OPT-OUT | Internal deterministic rate-limit preparation only; must never become a public abuse endpoint. |
| `rsvpInternal.revokeDemoSession` | OPT-OUT | Internal UAT cleanup only; public exposure could revoke another guest's session. |

