# API Coverage — Carta de Vinhos

> Full coverage by default. Opt-outs are explicit, reasoned decisions.

| capability | decision | reason |
|---|---|---|
| Convex — public reactive query: complete wine catalog | INTEGRATE | Required by `/presentes` to render all 37 wines and react to gifted state. |
| Convex — public reactive query: featured wines | INTEGRATE | Required by the fixed three-wine preview on the home page. |
| Convex — internal catalog reconciliation and seed | INTEGRATE | Required to create, migrate and idempotently maintain the canonical 37 records. |
| Convex — internal reversible gift-state smoke seam | INTEGRATE | Required for controlled verification of reactive available/gifted behavior. |
| Convex — public mutation to mark or unmark gifts | OPT-OUT | Explicitly deferred to authenticated administration in Phase 6 (`ADMIN-06`); exposing it publicly would allow unauthorized state changes. |
| Convex — reservation or temporary hold | OPT-OUT | Explicitly outside Phase 4; the approved flow is a direct WhatsApp handoff with no reservation state. |
| Convex — checkout or payment | OPT-OUT | Explicitly outside the invitation and gift-catalog scope. |
| Convex — public buyer identity or provenance fields | OPT-OUT | Private metadata must remain server-side; the public DTO exposes only commercial fields, palette colors and status. |
| WhatsApp — `wa.me` handoff to Vanessa with prefilled message | INTEGRATE | This is the approved purchase handoff for every available wine. |
| WhatsApp — automatic message sending through Business API | OPT-OUT | The guest must review and send the message; no Business API integration or credential is required. |
| WhatsApp — delivery/read status tracking | OPT-OUT | No automatic message is sent and tracking is outside the event-site scope. |
| WhatsApp — contact synchronization or conversation history | OPT-OUT | The site only opens the user-controlled `wa.me` destination and stores no WhatsApp data. |
