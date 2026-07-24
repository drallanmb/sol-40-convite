# Phase 2: Convite Público - Research

**Researched:** 2026-07-23
**Domain:** Static/client-rendered marketing page (React SPA), timezone-safe countdown, CSS/SVG art, third-party map embed
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** O conteúdo do convite é **portado do site antigo** (`sol-40-integrado/app/convite/EventSite.tsx`), melhorando o que for visivelmente melhorável. O texto antigo é a fonte canônica de copy — não reescrever do zero.
- **D-02:** A **programação está confirmada** e vai igual ao antigo, nos 7 blocos: `16:00` Chegadas & abraços · `17:00` Banda Nona · `17:45` O brinde da Sol · `19:00` Jantar sob as luzes · `20:30` Dança com Alma Gêmea · `00:30` A festa não para: Latino! · `03:00` Tudo que é bom tem que acabar 🥺. Sem nota de "provisória".
- **D-03:** Conteúdo do evento (data, local, endereço, programação, regras de traje, guia, hotéis) vive em um **arquivo de conteúdo separado** — `src/content/event.ts` — para os donos editarem horário/atração sem tocar no layout. Inclui `EVENT_DATE = "2026-10-17T16:00:00-03:00"` e `EVENT_END = "2026-10-18T05:00:00-03:00"` (portados de `lib/event.ts` do antigo).
- **D-04:** Grafia do local: **"Matapuã" em tudo** — `Matapuã Eventos · Estrada Matapuã, 1213 · Mosqueiro · Aracaju/SE`. Corrige a inconsistência do antigo (título "Matapuã", endereço "Matapoã") e fecha a pendência de grafia do checklist dos donos.
- **D-05:** **Ordem das seções:** hero → countdown → **local/Aracaju (mapa + guia + hotéis)** → programa → dress code → footer. Quem vem de fora vê local e hospedagem cedo. Sem buracos nem placeholders das seções das fases 3–5.
- **D-06:** **Manter a arte do hero** do antigo — céu em gradiente de pôr do sol, sol central com halo, linha do horizonte. Referência exata: `.hero`, `.hero-sky`, `.hero-sun`, `.hero-horizon` em `globals.css` (linhas ~187–207).
- **D-07:** **Palmeiras refeitas em SVG**, não portadas em CSS. Mesma silhueta e posicionamento do antigo (`.palm`, esquerda e direita, sangrando na base), mas desenho de verdade: folhas com nervura e variação entre os dois lados. Inline, sem arquivo de imagem.
- **D-08:** **Animação no mar** — o dono pediu explicitamente "se conseguir fazer animação no mar legal". Efeito à escolha do time (ver Claude's Discretion). Restrição: **sem vídeo e sem biblioteca de animação** — CSS/SVG puro.
- **D-09:** Assets do antigo a portar para `public/` (hoje vazio): `dress-code-men.jpg`, `dress-code-women.jpg` (galeria de referência de traje, com as legendas originais), `sol-symbol.png` (wordmark da topbar), `og.png` e favicon.
- **D-10:** **Quatro estados**, calculados sempre contra o offset `-03:00` explícito (correto em qualquer fuso — INVITE-01): 1. **Antes** — contagem regressiva até `2026-10-17T00:00:00-03:00`. 2. **É HOJE** — das `00:00` às `16:00` de 17/10. 3. **É AGORA / TÁ ROLANDO** — das `16:00` de 17/10 até `05:00` de 18/10 (`EVENT_END`). 4. **Depois** — contagem **crescente, sem teto**, com a copy **"JÁ QUE VOCÊ NÃO FOI, PERDEU!"**
- **D-11:** **Manter o trilho de countdown compacto no topbar**, que aparece ao rolar a página (comportamento e visual de `.countdown-rail` / `.countdown-compact` no `globals.css` antigo, linhas ~169–186).
- **D-12:** **Mapa carregado sob clique.** Por padrão aparece o card do local (nome, endereço, botão "Abrir rota" que abre Google Maps/Waze). O iframe do Google Maps só é montado quando a pessoa toca em "ver mapa" — mantém a página leve e não injeta cookie de terceiro em quem não pediu.
- **D-13:** **Guia da cidade:** manter os 3 lugares do antigo (Museu da Gente Sergipana, Passarela do Caranguejo, Orla de Atalaia — com distância aproximada da festa e link do Tripadvisor) **e ampliar com os mais bem avaliados de Aracaju no Tripadvisor**. A pesquisa da fase deve levantar os candidatos.
- **D-14:** **Hotéis: incluir agora.** Os três indicados pelos donos são **Arauanã, Quality e Celi**. Nome oficial completo, link e distância aproximada da festa precisam ser confirmados na pesquisa — **não inventar URL**.

### Claude's Discretion

- **Efeito do mar (D-08):** o dono respondeu "você decide o efeito". Recomendação registrada na discussão: caminho de luz dourado descendo do sol até a borda, cintilando devagar, sobre ondas lentas na horizontal — 100% CSS/SVG. Deve respeitar `prefers-reduced-motion` (o projeto mira AA — LAUNCH-02).
- **Topbar e navegação:** o dono optou por não discutir e deixou a critério do planejamento/UI. Regra que se segue do escopo: a topbar lista **apenas** o que a Phase 2 entrega (contagem, local, programa, traje) — nada de âncora quebrada ou "em breve" apontando para RSVP/presentes/memórias. O menu hambúrguer no celular é o padrão do antigo (`.menu-toggle` / `.topbar-links`).
- **Tradução do CSS antigo para Tailwind v4:** quanto vira utilitária e quanto precisa de CSS custom (gradientes do céu, keyframes do mar, silhueta das palmeiras) é decisão técnica do planner.
- **`index.html`:** título, meta description, favicon e tags OG não existem ainda — cabe nesta fase por ser a página pública.

### Deferred Ideas (OUT OF SCOPE)

- **Links de navegação para RSVP, Presentes e Memórias** — as seções nascem nas fases 3, 4 e 5; cada fase acrescenta o próprio link na topbar. Nada de âncora quebrada ou "em breve" agora.
- **Hospedagem além dos 3 hotéis** (bloco de descontos/parceria) — se os donos fecharem indicação, entra na Phase 7 junto com o checklist.
- **Álbum público / telão** — já registrado como v2 no PROJECT.md.

Additionally, the **UI-SPEC.md** (`02-UI-SPEC.md`, checker-approved, 6/6 dimensions) locks the full visual/copy/interaction contract for this phase — design system (bespoke Tailwind v4 `@theme`, no shadcn, no icon library), spacing scale, typography, color roles, copywriting per element (including the hero CTA being "Ver programação ↓" this phase, NOT "Confirmar presença"), the Hero & Motion Spec, and 70 UI-state considerations (57 covered, 13 flagged as `🧪 backstop` needing explicit verification). Treat UI-SPEC as settled alongside CONTEXT.md — this research does not re-open any of it.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INVITE-01 | Hero com sol + contagem regressiva usando offset `-03:00` explícito (correto em qualquer fuso) | Architecture Pattern 1 (pure `getEventState` fn) + Pattern 2 (interval hook) + Pitfalls 1-4 + Code Examples + Validation Architecture test map |
| INVITE-02 | Seções de programa e dress code | Architecture Patterns (project structure — `ProgramaSection.tsx`/`DressCodeSection.tsx`), Pitfall 7 (image weight), content ported verbatim per D-01/D-02 |
| INVITE-03 | Local + mapa de Aracaju + guia da cidade/hotéis | Architecture Pattern 3 (click-to-load map, no CLS), Pitfall 5 (CLS), Pitfall 6 (guide-grid border), Pitfall 8 (Tripadvisor link-check caveat), Open Question 1 (3 vs 4 guide cards), Don't Hand-Roll (map embed choice) |
| INVITE-04 | Navegação/topbar + footer, responsivo | Architecture diagram (Shell scroll-state extension), Anti-Patterns (`duration-(--var)`/`z-(--var)` syntax), Security Domain (external link `rel="noreferrer"`) |

</phase_requirements>

## Summary

Phase 2 replaces the Phase 1 scaffold route (`src/routes/Home.tsx`) with the real public invite page. This is a **pure frontend, client-only rendering problem** — the project runs React Router v7 in **library mode** (confirmed in `01-01-SUMMARY.md`: "library mode, NÃO framework mode, NÃO v8"), which is plain client-side SPA routing with no server loaders and no SSR. `[CITED: react-router docs via web search — library mode = "client-only routing, no server, no loaders"]` This eliminates the SSR/hydration-mismatch risk called out in the phase brief: there is no server render pass to diverge from the client, so `Date.now()`-based countdown math is safe to compute directly in `useEffect`/render without a `useLayoutEffect` or `suppressHydrationWarning` workaround.

The countdown correctness requirement (INVITE-01, "correto em qualquer fuso") is solved by parsing an ISO-8601 string that carries an **explicit UTC offset** (`2026-10-17T16:00:00-03:00`). Per ECMA-262 `Date.parse`, a datetime string with an explicit offset is unambiguous and produces the same instant in time regardless of the browser's local timezone — the browser does not need to know or guess Aracaju's offset. `[CITED: ECMA-262 Date Time String Format — offset-qualified ISO 8601 strings are timezone-independent]` This is already the pattern used by the old project (`lib/event.ts`, `EVENT_DATE`/`EVENT_END`) and is locked by CONTEXT.md D-03. No date library (`date-fns`, `dayjs`, `luxon`) is needed for this phase — the only operations required are subtraction of two `Date` instants and integer division into days/hours/minutes/seconds, which native `Date` handles correctly.

Everything else in this phase is CSS/SVG art (hero sky/sun/horizon/palms/waves), content ported verbatim into a typed content module (`src/content/event.ts`), and Tailwind v4 layout built on top of the Phase 1 design system — no new runtime dependencies are needed. The one legitimate new dependency this phase should introduce is a **test framework** (none exists in the repo yet), because several UI-SPEC-flagged behaviors (countdown state transitions, pt-BR unit pluralization, the "depois" no-ceiling count-up) are pure functions that are cheap to unit test and easy to get subtly wrong.

**Primary recommendation:** Build the countdown as a pure, testable state-machine function (`getEventState(now, EVENT_DATE, EVENT_END)` returning one of 4 states + remaining/elapsed parts), called from a small `useCountdown` hook that only owns the `setInterval`/cleanup; port the hero/wave/palm art as inline SVG + Tailwind arbitrary-value CSS per the UI-SPEC's Hero & Motion Spec (already prescriptive — do not re-derive); gate the Google Maps iframe behind the existing click-to-load pattern with a reserved-height placeholder to avoid CLS.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Countdown state/math (4 states, timezone-safe) | Browser / Client | — | Pure `Date` arithmetic against a hardcoded, offset-qualified ISO string baked into the client bundle at build time — no server involvement, no API call |
| Hero art (sky/sun/horizon/palms/waves) | Browser / Client | — | Inline SVG + CSS, drawn entirely client-side, no assets to fetch beyond the bundle itself |
| Event content (programa, dress code, local, guia, hotéis) | Browser / Client | — | Static TypeScript literals in `src/content/event.ts`, bundled at build time (D-03) — no Convex query on this route |
| Map (Google Maps embed) | CDN / Static (third-party) | Browser / Client | The iframe is a third-party embed (Google's server), but its mount/unmount is entirely client-controlled (click-to-load, D-12) |
| Scroll-driven topbar/rail state | Browser / Client | — | `scrollY`/`requestAnimationFrame` read, no layout/data dependency |
| Static assets (dress-code photos, wordmark, OG image, favicon) | CDN / Static | Browser / Client | Served from Vercel's static file handling (`public/`), referenced by relative path, no build-time transform needed |
| Routing (`/` renders the invite) | Browser / Client | — | React Router v7 library mode — client-side route table only, already wired in `src/App.tsx` (Phase 1), not touched this phase |
| Backend / Convex | — | — | Explicitly untouched this phase (CONTEXT.md: `convex/schema.ts` not touched) — no capability in this phase reaches the API/Backend or Database tier |

## Standard Stack

### Core

No new production dependencies are needed. This phase consumes what Phase 1 already installed and pinned:

| Library | Version (installed) | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react / react-dom | 19.2.8 | Component runtime | Already pinned Phase 1, do not bump |
| react-router | 7.18.1 (library mode) | Client-side routing for `/` | Already pinned Phase 1; library mode confirmed client-only (no SSR) `[CITED: react-router v7 docs — library mode]` |
| tailwindcss / @tailwindcss/vite | 4.3.3 | Utility CSS + `@theme` tokens | Design system already built on this in Phase 1 |
| typescript | 6.0.3 | Types | Pinned Phase 1 |
| vite | 8.1.5 (installed; `^8.1.1` in package.json) | Build/dev server | Pinned Phase 1 |

### Supporting (new this phase)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` | `4.1.10` `[VERIFIED: npm registry — npm view vitest version, peerDependencies includes "vite": "^6.0.0 \|\| ^7.0.0 \|\| ^8.0.0"]` | Unit-test the countdown state machine and pt-BR unit-pluralization helper | Add in Wave 0 — no test framework exists in the repo yet (`package.json` has no `test` script, no jest/vitest config found) |

No `@testing-library/react`, `jsdom`, or `happy-dom` is required for this phase's testable surface — the countdown logic and pluralization helper are pure functions (`Date` in, object out; `number` in, string out) and can be tested with plain `vitest` assertions, no DOM needed. Add a DOM testing layer only if a later phase needs it.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled `useCountdown` + pure state function | `date-fns` / `dayjs` / `luxon` for the countdown | Unnecessary — the only operations needed are `Date` subtraction and integer division; pulling in a date library adds bundle weight for zero correctness gain on a single fixed target date. `date-fns`/`dayjs` become worth it only if the project later needs real timezone *conversion* (displaying a date in the *viewer's* local timezone), which INVITE-01 explicitly does not need (it needs the opposite — always compute against Aracaju's fixed `-03:00`, ignore viewer TZ). |
| Native `scrollY` + `requestAnimationFrame` (old pattern, D-11 keeps it) | `IntersectionObserver` for the topbar-condense/rail-reveal trigger | `IntersectionObserver` is the more modern idiom for "has the user scrolled past section X," but D-11 explicitly locks porting the old `.countdown-rail`/`.event-header-condensed` behavior 1:1, which is scroll-position-threshold based. Not worth relitigating — flag as a future refactor opportunity only, not a Phase 2 change. |
| Google Maps `output=embed` iframe (no API key) | Google Maps JavaScript API / Embed API with API key, or a static map image (Static Maps API) | The old project already used the no-key `https://www.google.com/maps?q=...&output=embed` iframe form successfully — no billing account, no key management, no key-leak risk in a public repo. A JS API embed would need an API key exposed client-side (fine to expose, Maps JS keys are meant to be public, but requires Google Cloud billing setup that is out of scope for this phase and not mentioned in CONTEXT.md/UI-SPEC). Stick with the iframe. |

**Installation:**
```bash
npm install --save-exact --save-dev vitest@4.1.10
```

**Version verification:** `npm view vitest version` returned `4.1.10` on 2026-07-23, with `peerDependencies.vite` accepting `^8.0.0` — compatible with the installed `vite@8.1.5`. `[VERIFIED: npm registry]`

## Package Legitimacy Audit

Only one new package is proposed this phase (`vitest`, dev-only, no runtime/bundle impact).

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `vitest` | npm | Multi-year, actively maintained (Vite ecosystem's official test runner) | Very high (tens of millions/week class) | `github.com/vitest-dev/vitest` | OK | Approved |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

No production/runtime packages are introduced this phase — UI-SPEC's Design System section explicitly locks "no shadcn, no icon library, no third-party registries" for this phase, and CONTEXT.md's Claude's Discretion section restricts the wave animation to "sem vídeo e sem biblioteca de animação — CSS/SVG puro." The planner should not introduce any animation library (e.g. `framer-motion`/`motion`), icon package (e.g. `lucide-react`), or map SDK — all are explicitly out of scope for this phase per locked decisions.

## Architecture Patterns

### System Architecture Diagram

```
Browser navigates to "/"
        │
        ▼
React Router v7 (library mode, client-only)
        │
        ▼
   <Invite /> route component (replaces Home.tsx)
        │
        ├─▶ Shell (topbar slot + main + footer)  ← Phase 1, extended with scroll state
        │       │
        │       ├─▶ scroll listener (rAF-throttled) ──▶ headerScrolled / headerCondensed state
        │       │                                             │
        │       │                                             ▼
        │       └─▶ CountdownRail (compact, shown when headerCondensed)
        │
        ├─▶ useCountdown() hook
        │       │
        │       ├─▶ getEventState(now, EVENT_DATE, EVENT_END)  ← pure fn, unit-tested
        │       │       returns: { phase: "antes"|"hoje"|"agora"|"depois", parts: {d,h,m,s} }
        │       │
        │       └─▶ setInterval(1000) drives re-render; cleared on unmount
        │
        ├─▶ Hero section (SVG sky/sun/horizon/palms/waves + 4 text layers + CTA)
        │       reads: content from src/content/event.ts (static import, no fetch)
        │
        ├─▶ Local/Aracaju section (card always visible)
        │       │
        │       └─▶ "Ver mapa" click ──▶ mounts <iframe src="google.com/maps?...&output=embed">
        │               (reserved-height container before mount → no CLS)
        │
        ├─▶ Programa section (static list, from content module)
        │
        ├─▶ Dress code section (static content + 2 lazy <img>)
        │
        └─▶ Footer (already exists in Shell.tsx, D-04 grafia already correct)

No network calls except: font files (self-hosted, Phase 1), dress-code images (public/, same-origin),
and — only after a click — the Google Maps iframe (third-party, cross-origin).
No Convex query/mutation is reachable from this route this phase.
```

### Recommended Project Structure
```
src/
├── content/
│   └── event.ts             # EVENT_DATE/EVENT_END, programa[], hotels[], guide[], dress copy — typed literals (D-03)
├── lib/
│   └── countdown.ts          # getEventState() pure fn + pluralizeUnit() helper — unit-tested, no DOM
├── hooks/
│   └── useCountdown.ts       # setInterval wiring around countdown.ts, cleanup on unmount
├── components/
│   ├── layout/
│   │   └── Shell.tsx          # extended: scroll state (headerScrolled/headerCondensed), hamburger menu
│   ├── ui/                    # Phase 1 primitives, reused as-is (Button, Card, Field, Toast)
│   └── invite/                 # NEW this phase — page-specific, not reusable primitives
│       ├── Hero.tsx
│       ├── PalmSvg.tsx
│       ├── SeaWaves.tsx        # SVG waves + golden light path, prefers-reduced-motion aware
│       ├── Countdown.tsx        # renders 4-tile or compact-rail countdown from useCountdown()
│       ├── CountdownRail.tsx
│       ├── ProgramaSection.tsx
│       ├── DressCodeSection.tsx
│       ├── LocalSection.tsx     # card + click-to-load map + "Abrir rota"
│       └── GuideSection.tsx     # city guide cards + hotel list
├── routes/
│   └── Home.tsx                # REPLACED — becomes the invite page composition (or renamed; router wiring in App.tsx untouched)
public/
├── dress-code-men.jpg          # ported from old project (D-09)
├── dress-code-women.jpg
├── sol-symbol.png
├── og.png
└── favicon.png
```

### Pattern 1: Timezone-safe countdown as a pure state function
**What:** Compute the event phase and remaining/elapsed time as a pure function of `now`, `EVENT_DATE`, `EVENT_END` — no DOM, no `Date.now()` called internally (pass `now` in) so it is trivially unit-testable with fixed dates.
**When to use:** Any time-gated UI whose correctness must not depend on the viewer's system timezone.
**Example:**
```typescript
// Source: pattern derived from sol-40-integrado/lib/event.ts (old project, offset-qualified
// ISO strings) + ECMA-262 Date Time String Format (offset-qualified strings parse to an
// unambiguous instant regardless of the host's local timezone).
export const EVENT_DATE = "2026-10-17T16:00:00-03:00";
export const EVENT_END = "2026-10-18T05:00:00-03:00";
// The "antes" countdown target is midnight of event day per D-10, distinct from EVENT_DATE (16:00 arrival).
export const EVENT_DAY_START = "2026-10-17T00:00:00-03:00";

export type EventPhase = "antes" | "hoje" | "agora" | "depois";
export type Parts = { days: number; hours: number; minutes: number; seconds: number };

export function getEventState(now: Date): { phase: EventPhase; parts: Parts } {
  const dayStart = new Date(EVENT_DAY_START).getTime();
  const start = new Date(EVENT_DATE).getTime();
  const end = new Date(EVENT_END).getTime();
  const t = now.getTime();

  if (t < dayStart) return { phase: "antes", parts: toParts(dayStart - t) };
  if (t < start) return { phase: "hoje", parts: toParts(0) };
  if (t <= end) return { phase: "agora", parts: toParts(0) };
  return { phase: "depois", parts: toParts(t - end) }; // grows without ceiling (D-10)
}

function toParts(distanceMs: number): Parts {
  const distance = Math.max(0, distanceMs);
  return {
    days: Math.floor(distance / 86_400_000),
    hours: Math.floor((distance / 3_600_000) % 24),
    minutes: Math.floor((distance / 60_000) % 60),
    seconds: Math.floor((distance / 1_000) % 60),
  };
}
```

### Pattern 2: setInterval hook with guaranteed cleanup
**What:** Isolate the only side-effectful part of the countdown (the ticking clock) in a small hook; the hook's only job is scheduling, not math.
**When to use:** Any UI that needs to re-render on a wall-clock tick.
**Example:**
```typescript
// Source: pattern ported from sol-40-integrado/app/convite/EventSite.tsx `useCountdown`
// (already cleans up its interval on unmount — carry that forward, do not regress it).
import { useEffect, useState } from "react";
import { getEventState, type EventPhase, type Parts } from "../lib/countdown";

export function useCountdown() {
  const [state, setState] = useState(() => getEventState(new Date()));
  useEffect(() => {
    const update = () => setState(getEventState(new Date()));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);
  return state as { phase: EventPhase; parts: Parts };
}
```

### Pattern 3: Click-to-load third-party iframe with reserved height (no CLS, no unsolicited cookie)
**What:** Render the venue card + always-visible "Abrir rota" link by default (no iframe mounted); mount the Google Maps iframe only after a click, in a container whose final height is already reserved via CSS.
**When to use:** Any third-party embed that is not essential to task completion (D-12: the "Abrir rota" link alone is a complete way to reach the venue).
**Example:**
```tsx
// Source: pattern ported from sol-40-integrado (iframe src pattern) + D-12 (click-to-load gate, new this phase)
function LocalMap() {
  const [showMap, setShowMap] = useState(false);
  return (
    <div className="relative h-[610px] md:h-[610px] sm:h-[540px]"> {/* height reserved before mount */}
      {showMap ? (
        <iframe
          title="Mapa do Matapuã Eventos em Aracaju"
          src="https://www.google.com/maps?q=Matapu%C3%A3%20Eventos%20Aracaju&output=embed"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="h-full w-full border-0"
        />
      ) : (
        <button type="button" onClick={() => setShowMap(true)} className="…">
          Ver mapa
        </button>
      )}
      {/* map-card overlay: name, address, "Abrir rota ↗" — always rendered, independent of showMap */}
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Calling `new Date()` (no offset) or building the target date from separate y/m/d/h/m/s numbers:** `new Date(2026, 9, 17, 16, 0, 0)` constructs the date in the *browser's local timezone*, which is exactly the bug INVITE-01 exists to prevent. Always parse a string literal that carries the explicit `-03:00` offset.
- **Calling `getEventState`/`toParts` with an internally-captured `Date.now()` instead of an injected `now` parameter:** makes the function untestable without mocking global time; keep `now` as a parameter.
- **Mounting the Google Maps iframe unconditionally on page load:** defeats D-12 (page-weight and third-party-cookie consent reasoning) and the phase's "leve" requirement — must stay behind the "Ver mapa" click.
- **Re-deriving the hero/wave/palm CSS from scratch instead of the UI-SPEC's Hero & Motion Spec:** that spec is already prescriptive (exact gradients, exact `@keyframes` durations, exact `prefers-reduced-motion` fallback) — treat it as settled, not as a design question to reopen.
- **Using `duration-fast`/`z-sticky` as bare Tailwind utility names:** confirmed in Phase 1 (`01-03-SUMMARY.md`) that `--duration-*`/`--z-*` have no official Tailwind v4 namespace and silently emit no CSS as named utilities — use the parenthesis syntax (`duration-(--duration-fast)`, `z-(--z-sticky)`) instead. `tracking-*` and `ease-*` ARE official namespaces and work as named utilities.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| pt-BR singular/plural unit labels (UI-SPEC backstop: "1 dias" bug) | Ad-hoc `count === 1 ? "dia" : "dias"` scattered inline at each render site | One small `pluralizeUnit(count, unit)` helper, unit-tested at 0/1/2 for all four units, called from both the full tiles and the compact rail | UI-SPEC explicitly flags this as a reachable bug (countdown passes through 1 for every unit on the way down) — a single tested helper guarantees both renderers agree, instead of two copies drifting |
| Fixed-instant timezone math | A general-purpose date/timezone library (`date-fns-tz`, `luxon`) for what is just "subtract two fixed instants" | Native `Date` + explicit-offset ISO strings (see Pattern 1) | The only timezone requirement is "the target instant is fixed regardless of viewer TZ" — that's what an offset-qualified ISO string already guarantees per spec; no conversion between timezones is ever needed |
| Third-party map embedding | A hand-rolled Leaflet/Mapbox integration, or the Google Maps JS SDK with API key + billing | The plain `output=embed` iframe URL (no key) already proven in the old project | Zero key management, zero billing setup, matches D-12's "keep it light" framing; only reconsider if a future phase needs interactive markers/routing beyond "open in Maps app" |
| Reduced-motion handling | Per-animation `useEffect` + `matchMedia` listeners in every SVG component | A single `@media (prefers-reduced-motion: reduce) { animation: none }` rule applied to the wave/light-path classes | CSS media queries handle this declaratively with zero JS and zero risk of a missed listener; D-08 calls this a hard requirement, not optional polish |

**Key insight:** Nearly everything hand-rolled in this phase — SVG art, the countdown state machine, the click-to-reveal map — is hand-rolled *on purpose* and correctly so (CONTEXT.md explicitly bars animation/icon libraries). The risk in this phase is not "under-using libraries," it's "duplicating small pieces of logic (pluralization, phase-state derivation) across the 4-tile and compact-rail renderers" — solve that with shared pure functions, not with a library.

## Common Pitfalls

### Pitfall 1: Constructing the target Date without an explicit offset
**What goes wrong:** A guest in a different timezone (e.g. UTC, or US Pacific) sees a countdown that is off by the difference between their local offset and `-03:00` (up to several hours).
**Why it happens:** `new Date("2026-10-17T16:00:00")` (no offset) or `new Date(y, m, d, h, mi, s)` (numeric constructor) both resolve against the *browser's* local timezone, not Aracaju's.
**How to avoid:** Only ever parse the offset-qualified string literals from `src/content/event.ts` (`EVENT_DATE`, `EVENT_END`, `EVENT_DAY_START`). Never rebuild a `Date` from separate numeric components.
**Warning signs:** A manual test that changes the OS timezone (System Settings → Date & Time, or `TZ=America/Los_Angeles npm run dev` in the browser devtools' sensor override) shows a different countdown value than with `TZ=America/Sao_Paulo`.

### Pitfall 2: `setInterval` leak on unmount / StrictMode double-invoke
**What goes wrong:** In dev, React 19 StrictMode double-invokes effects; without a cleanup return, two intervals stack up and the countdown updates twice as fast (or leaks after navigating away, in production).
**Why it happens:** Missing (or incorrectly conditioned) `return () => clearInterval(timer)`.
**How to avoid:** Always return the cleanup from the *same* `useEffect` that calls `setInterval`, exactly as the old project's `useCountdown` already does — carry that shape forward unchanged (see Pattern 2).
**Warning signs:** Countdown seconds appear to tick faster than 1/sec in dev, or React DevTools Profiler shows growing effect count on repeated route re-entry.

### Pitfall 3: pt-BR singular/plural label mismatch ("1 dias")
**What goes wrong:** Every countdown naturally passes through `days: 1`, `hours: 1`, etc. on its way to zero; a naive `${n} dias` renders "1 dias," a visible grammar bug on a page the family will scrutinize closely.
**Why it happens:** Labels hardcoded as always-plural (`countdownLabels` in the old code is exactly this — `days: "dias"` unconditionally).
**How to avoid:** Introduce `pluralizeUnit(count, unit)` (see Don't Hand-Roll) and unit-test at 0, 1, 2 for all four units in both the full-tile and compact-rail renderers.
**Warning signs:** Manually set the system clock to within 1 day/hour/minute/second of `EVENT_DAY_START` and read the tiles.

### Pitfall 4: "depois" state day-count overflow breaking layout
**What goes wrong:** The "depois" state (D-10) counts up with no ceiling. Months after the party, `days` becomes a 3-4 digit number; if tiles use a fixed 2-digit width (`padStart(2, "0")` assumption baked into layout), the digits clip or the tile row wraps awkwardly.
**Why it happens:** The old CSS (`.countdown strong`) was authored assuming a countdown that only ever *decreases* toward a 2-3 digit max.
**How to avoid:** Use `tabular-nums` and a `min-width` sized for at least 4 digits on the day tile; verify by forcing `days: 9999` in a test render (per UI-SPEC's own backstop note on this exact risk).
**Warning signs:** Visual QA at a far-future system clock date shows overlapping or clipped tiles.

### Pitfall 5: Layout shift when the Google Maps iframe mounts
**What goes wrong:** Tapping "Ver mapa" on a slow connection causes the page below the map to jump as the iframe's content paints in.
**Why it happens:** No height reserved on the container before the iframe has content; the iframe defaults to its intrinsic/zero size until the embed's own page loads.
**How to avoid:** Set the container's final height via CSS (`h-[610px]` desktop / smaller on mobile per UI-SPEC) *before* conditionally rendering the `<iframe>`, so the reveal only changes what's inside a fixed-size box (see Pattern 3).
**Warning signs:** Throttle to "Slow 3G" in devtools, tap "Ver mapa," watch for layout shift below the map section.

### Pitfall 6: 4-card guide grid breaking the old CSS's `:last-child` border rule
**What goes wrong:** `.guide-grid > *:last-child { border-right: 0 }` (old CSS) only removes the right border from the actual last DOM child. In a 3-column grid with 4 items, the 4th card wraps to a new row alone and only its own right border is removed — the 3rd card (last item of row 1) keeps an unwanted right border, and the 4th card's left edge has no matching border treatment.
**Why it happens:** The rule was authored when the guide list was hardcoded at exactly 3 items (a multiple of the 3-column grid). D-13 explicitly asks to consider adding a 4th card.
**How to avoid:** If the guide ships with 4 cards, don't reuse the old `:last-child` rule verbatim — use a grid-aware selector (e.g. `nth-child(3n)` for right-border removal, or a border-collapse approach with `divide-x`/`divide-y` Tailwind utilities) that works for both 3 and 4 item counts, or switch to a border strategy indifferent to item count. Already flagged as a UI-SPEC backstop (E7) — verify both counts before shipping.
**Warning signs:** Visual QA at both 3-card and 4-card configurations, desktop/tablet/360px.

### Pitfall 7: Large unoptimized dress-code JPEGs
**What goes wrong:** The two dress-code reference photos ported from the old project are ~500KB each at 1122×1402 / 1003×1568 px `[VERIFIED: file inspection of source assets]`. Even with `loading="lazy"`, that's ~1MB of image weight the first time a mobile guest scrolls to that section.
**Why it happens:** Source assets were never compressed/resized for web delivery in the old project.
**How to avoid:** Re-export or compress the two JPEGs (e.g. via `sharp`/`squoosh`/an image tool available in the environment) to a reasonable web size (long edge ~1200-1600px is already fine; the win is in JPEG quality/compression, not resolution) before copying into `public/`. Not a blocking correctness issue, but worth doing while porting assets in the same task as D-09.
**Warning signs:** Lighthouse/PageSpeed flags "Properly size images" or "Efficiently encode images" on the dress-code section.

### Pitfall 8: Tripadvisor/hotel link rot going undetected by automated tooling
**What goes wrong:** Tripadvisor blocks non-browser HTTP clients (`curl`, most bot user-agents) with `403 Forbidden` even for known-good URLs — confirmed this session: the 3 *already-locked* guide URLs from the old site (Museu da Gente Sergipana, Passarela do Caranguejo, Orla de Atalaia) all returned `403` via `curl -L` despite being real, working pages. `[VERIFIED: curl probe this session, 2026-07-23]` A naive "curl and check for 200" verification step will therefore falsely flag every Tripadvisor link as broken.
**Why it happens:** Tripadvisor's bot/scraper protection rejects requests without a real browser fingerprint (JS execution, cookies, TLS/HTTP2 fingerprint).
**How to avoid:** Link-check Tripadvisor URLs with an actual browser context (Playwright/a real browser tab) or accept a manual click-through as the verification method for those specific links — do not gate phase completion on a `curl`/`fetch`-based automated check for `tripadvisor.com*` domains. Hotel URLs (`aruanahotel.com.br`, `letsatlantica.com.br`, `celihotel.com.br`) are NOT behind this same protection — all three returned `200` via plain `curl` this session and can be automated-checked normally.
**Warning signs:** An automated link-checker reports 100% of Tripadvisor links as dead while the hotel links pass — that pattern itself is the signal that the checker's method (not the links) is the problem.

## Code Examples

### pt-BR pluralization helper (unit-tested)
```typescript
// Source: derived from D-10 countdown states + UI-SPEC "zero-one-many" backstop rows for E2/E3
const UNIT_LABELS: Record<"days" | "hours" | "minutes" | "seconds", [string, string]> = {
  days: ["dia", "dias"],
  hours: ["hora", "horas"],
  minutes: ["minuto", "minutos"],
  seconds: ["segundo", "segundos"],
};

export function pluralizeUnit(count: number, unit: keyof typeof UNIT_LABELS): string {
  const [singular, plural] = UNIT_LABELS[unit];
  return count === 1 ? singular : plural;
}
```

### `prefers-reduced-motion` gate for the sea/wave animation (D-08, hard requirement)
```css
/* Source: pattern per MDN prefers-reduced-motion + D-08 ("motion is removed but the
   visual richness is not" — waves/light path stay as static art, not hidden). */
.wave-band { animation: wave-scroll 22s linear infinite; }
.wave-band--mid { animation-duration: 30s; }
.wave-band--back { animation-duration: 38s; }
.golden-light { animation: light-shimmer 3.5s ease-in-out infinite; }

@keyframes wave-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@keyframes light-shimmer { 0%, 100% { opacity: 0.85; } 50% { opacity: 1; } }

@media (prefers-reduced-motion: reduce) {
  .wave-band,
  .golden-light {
    animation: none;
  }
}
```

### Palm SVG shape (D-07 — redraw with a real trunk + fronds, not identical rotated bars)
```tsx
// Source: footprint/positioning ported from globals.css .palm/.palm-left/.palm-right
// (width 360 / height 600, bottom -130px, left/right -82px, mirrored) — D-07 requires
// the frond drawing itself to be a real leaf shape with a midrib, not 6 identical bars.
function PalmSvg({ side }: { side: "left" | "right" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 360 600"
      className={`pointer-events-none absolute bottom-[-130px] z-[2] h-[600px] w-[360px] drop-shadow-[0_12px_30px_rgba(18,15,22,0.2)] ${
        side === "left" ? "left-[-82px]" : "right-[-82px] scale-x-[-1]"
      }`}
    >
      {/* trunk */}
      <path d="M132 590 Q118 340 150 78" stroke="#291c25" strokeWidth="24" fill="none" strokeLinecap="round" />
      {/* fronds: each a leaf path with a visible midrib line, asymmetric per-frond curvature */}
      {/* … 6 <g> groups, each <path fill="#291c25"> + a lighter <path> midrib stroke … */}
    </svg>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Old project: Next.js "use client" component, server-fetched `Snapshot` (RSVP/posts/wines) polled every 60s even in the static-view parts | This phase: pure client SPA (React Router v7 library mode), zero network polling — nothing to poll, RSVP/posts/wines don't exist until Phases 3-5 | This project (not an external ecosystem shift) | Simpler mental model: no `online`/`offline` network-pill state, no `refresh()` polling loop are relevant to Phase 2's scope at all — do not port those from `EventSite.tsx` |
| Old project: 6 identical rotated `<i>` bars per palm (CSS-only) | This phase: inline SVG with a real leaf/midrib shape (D-07) | This phase, explicit "melhorar o que é visível pra melhora" | Slightly larger markup per palm, but a materially better-looking asset with no image request |

**Deprecated/outdated:** Nothing framework-level has changed here — React 19, Tailwind v4, and React Router v7 are all already the versions pinned in Phase 1; no version research gap exists for this phase's frontend-only scope.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The `.com.br` equivalent Tripadvisor URL for "Croa do Goré" (`tripadvisor.com.br/Attraction_Review-g303638-d4007022-...`) resolves the same as the confirmed `.com` URL, matching the other 3 guide cards' domain convention | UI-SPEC Copywriting Contract (4th guide card, already flagged `[AUTO — needs planner confirmation]`); this research only confirmed the `.com` variant via WebFetch, not the `.com.br` one (both blocked automated `curl` per Pitfall 8) | If wrong, the 4th card's link would 404 for guests — low severity (external link, not blocking core flow) but should be spot-checked in a browser before shipping |
| A2 | Whether the guide grid ships with 3 or 4 cards (Croa do Goré inclusion) is still open per UI-SPEC — this research treated it as "planner/human decides," not settled | Copywriting Contract / Open Questions | Affects the grid-border pitfall (Pitfall 6) and layout verification scope — low risk either way, both counts are covered in UI-SPEC's UI Considerations |
| A3 | Tripadvisor review counts/ranking ("#6 of 94 things to do in Aracaju," 2,729 reviews) reflect a live, changing number and will drift from whatever is baked into static copy at build time | Code Examples / Don't Hand-Roll | Low — these numbers are informational copy on an external-link card, not something the site claims to keep live; no action needed beyond not over-promising exact figures in on-page copy if they're included verbatim |

## Open Questions (RESOLVED)

Both questions below were open at research time and have since been settled during planning. Markers record where.

1. **Does the guide grid ship with 3 or 4 cards (Croa do Goré)?** — **RESOLVED: four cards.** Settled in plan 02-06 ("Resolved open question… this plan settles it at four") and delivered by plan 02-01's content module, which ships four `GUIDE` cards. D-13 asked to widen the guide with best-rated attractions, research surfaced exactly one strong verified candidate, and 02-06's count-indifferent grid-border strategy renders deliberately at both three and four cards. The fourth card keeps the research-verified `.com` host; the unverified `.com.br` variant is not used (prohibition P-04).
   - What we know: The `.com` Tripadvisor URL for Croa do Goré is confirmed real (`#6 of 94 things to do in Aracaju`, 4.3★, 2,729 reviews, boat tour to a sandbank via Orla do Pôr do Sol). UI-SPEC frames the copy as "quem tiver um dia a mais" (day-trip framing, distinct from the "aprox. X km" framing of the other 3).
   - What's unclear: Whether the dono wants a 4th card at all (D-13 says "amplify with best-rated," this research surfaces one strong candidate but doesn't finalize inclusion), and whether the `.com.br` URL variant resolves identically.
   - Recommendation: Planner should keep both a 3-card and 4-card layout path viable (Pitfall 6's grid-border fix works for either), and treat final inclusion as a `checkpoint:human-verify`-style confirmation before the guide section ships, or default to including it (research supports it as legitimate/well-reviewed) with a fast manual link check.

2. **Exact compressed size/format for the two dress-code photos.** — **RESOLVED: manual re-compression, no new dependency.** Settled in plan 02-02 Task 1, whose recipe was executed against the real source files during planning and lands the `public/` directory at 604 KB total with a 203 KB worst file (both dress-code JPEGs under the 250 KB per-file budget) — a low-effort re-export, not a build-pipeline image-optimization dependency, exactly as recommended below.
   - What we know: Source JPEGs are ~500KB each at high resolution (Pitfall 7).
   - What's unclear: Whether the planner should introduce an image-optimization step (manual re-export, or a build-time tool) versus just copying as-is and accepting the weight since both images are `loading="lazy"` and below the fold.
   - Recommendation: Low-effort manual re-compression (no new library) during the D-09 asset-porting task is sufficient; not worth a build-pipeline image-optimization dependency for 2 static photos.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js / npm | Build, dev server, `vitest` | ✓ (implied by working Phase 1 build) | — | — |
| Vite dev server | Local preview of hero/countdown/responsive states | ✓ | 8.1.5 | — |
| Browser DevTools (device toolbar, Slow 3G throttle, `prefers-reduced-motion` emulation, system clock override) | Manual verification of countdown states, CLS on map reveal, reduced-motion fallback (all flagged as UI-SPEC 🧪 backstops) | Assumed available in the execution environment | — | If a headless browser (Playwright) is available in the harness, prefer it for the `days: 9999` overflow check and the 3-vs-4-card grid check; otherwise these route to `human_needed` per UI-SPEC's own backstop framing |
| Network access to `google.com/maps` (embed) and external link targets (Tripadvisor, hotel sites) | Verifying the map iframe renders and links aren't dead | ✓ (confirmed reachable this session) | — | — |
| `vitest` | Countdown/pluralization unit tests (Wave 0 gap, see below) | ✗ (not yet installed) | — | Install per Standard Stack; no viable "skip tests" fallback given the explicit UI-SPEC backstops that need pure-function verification |

**Missing dependencies with no fallback:**
- `vitest` — must be installed in Wave 0 for this phase's automated verification story to hold together (see Validation Architecture below).

**Missing dependencies with fallback:**
- Playwright/headless browser for visual backstops — falls back to `human_verify_mode: end-of-phase` manual checks (already the project's configured mode per `.planning/config.json`).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.10 (not yet installed — Wave 0 gap) |
| Config file | none yet — `vitest.config.ts` (or reuse `vite.config.ts` via `test` key) to be created in Wave 0 |
| Quick run command | `npx vitest run src/lib/countdown.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INVITE-01 | Countdown target parses to the correct instant regardless of the string being interpreted with an explicit `-03:00` offset (i.e. two `Date` objects constructed from the same offset-qualified string are equal instants) | unit | `npx vitest run src/lib/countdown.test.ts -t "offset"` | ❌ Wave 0 |
| INVITE-01 | `getEventState` returns the correct one of 4 phases (`antes`/`hoje`/`agora`/`depois`) for `now` values on both sides of each of the 3 boundaries (`EVENT_DAY_START`, `EVENT_DATE`, `EVENT_END`) | unit | `npx vitest run src/lib/countdown.test.ts -t "phase"` | ❌ Wave 0 |
| INVITE-01 | `depois` phase parts grow without ceiling and never clamp/overflow into `NaN` for a `now` far in the future (e.g. `days: 9999` case, per UI-SPEC overflow backstop) | unit | `npx vitest run src/lib/countdown.test.ts -t "depois"` | ❌ Wave 0 |
| INVITE-01 | `pluralizeUnit` returns singular at exactly 1 and plural at 0/2/other for all 4 units (UI-SPEC zero-one-many backstop) | unit | `npx vitest run src/lib/countdown.test.ts -t "pluralize"` | ❌ Wave 0 |
| INVITE-01 | Countdown UI renders and the interval is cleared on unmount (no leaked timers) | integration (component) | manual/browser check — full React Testing Library setup is not justified for this phase's scope (see Standard Stack rationale); verify via DevTools timer count on route navigation away/back | manual_procedural |
| INVITE-02 | Programa renders all 7 blocks in order with exact copy (D-02, no "provisório" note) | unit | `npx vitest run src/content/event.test.ts` (snapshot or literal-count assertion against `src/content/event.ts`) | ❌ Wave 0 |
| INVITE-02 | Dress-code gallery images have explicit width/height or aspect-ratio reserved (no CLS on lazy image decode) | manual_procedural (visual/DevTools CLS check) | browser check, Slow 3G throttle | — |
| INVITE-03 | Map card renders with venue name + corrected address ("Matapuã" throughout, D-04) and "Abrir rota ↗" always visible; iframe mounts only after "Ver mapa" click | manual_procedural (interaction + visual) | browser check | — |
| INVITE-03 | Guide/hotel external links resolve (not dead) | manual_procedural (browser-based link check — NOT `curl`, per Pitfall 8) | browser check per link | — |
| INVITE-04 | Topbar collapses to hamburger + condenses/reveals countdown rail past scroll threshold; 44px touch targets on nav/hamburger/CTAs | manual_procedural (responsive/visual check at 360/768/1440px) | browser check | — |
| INVITE-04 | Footer renders unchanged (already correct per D-04, no regression) | unit | `grep` or snapshot assertion against `Shell.tsx` footer markup | — |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/countdown.test.ts` (and any other new test file added that commit) + `npm run build` (typecheck)
- **Per wave merge:** `npx vitest run` (full suite) + `npm run build`
- **Phase gate:** Full suite green + all `manual_procedural` items above walked through in a real browser (per `human_verify_mode: end-of-phase` already configured) before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] Install `vitest@4.1.10` as an exact-pinned devDependency (`npm install --save-exact --save-dev vitest@4.1.10`)
- [ ] `vitest.config.ts` (or `test` block in `vite.config.ts`) — Node environment is sufficient (no `jsdom`/`happy-dom` needed for this phase's pure-function test surface)
- [ ] `package.json` — add a `"test": "vitest run"` script (none exists today)
- [ ] `src/lib/countdown.ts` + `src/lib/countdown.test.ts` — the pure state-machine function and its test file are themselves phase-2 deliverables, not pre-existing infra, but the *framework* to run them is the Wave 0 gap
- [ ] No `conftest`/fixture-equivalent needed — tests are fixed-date-in, object-out, no shared setup required

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No auth surface exists on this route this phase |
| V3 Session Management | No | No session/cookie handling introduced this phase |
| V4 Access Control | No | Fully public route, no access decisions |
| V5 Input Validation | Marginal | No user-submitted input exists this phase (no forms) — N/A for this phase's actual surface, but do not regress: no `dangerouslySetInnerHTML` anywhere (Phase 1 pattern, JSX auto-escapes all rendered copy, including any future-proofing of `src/content/event.ts` strings) |
| V6 Cryptography | No | Not applicable — no secrets/crypto touched this phase |
| V14 Config/Communications (nearest applicable category for this phase's actual risk surface) | Yes | External links (Tripadvisor, hotel sites, Google Maps "Abrir rota") must use `target="_blank" rel="noreferrer"` (or `rel="noopener noreferrer"`) to prevent reverse-tabnabbing — pattern already present in the old code's `<a target="_blank" rel="noreferrer">` usage, carry it forward on every new external link added this phase |

### Known Threat Patterns for this phase's stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Reverse tabnabbing via external links (guide/hotel cards, Google Maps "Abrir rota", any future social links) opened with `target="_blank"` without `rel="noopener"` | Tampering (the opened tab can use `window.opener` to navigate the original tab to a phishing page) | Always pair `target="_blank"` with `rel="noreferrer"` (also implies `noopener`) on every external anchor added this phase |
| Third-party iframe (Google Maps) leaking full referrer URL to Google on load | Information Disclosure | The old project already sets `referrerPolicy="no-referrer-when-downgrade"` on the map iframe — carry this forward unchanged; combined with D-12's click-to-load gating, this also limits the third-party request to only guests who actively opt in |
| Static content injection via `src/content/event.ts` if it's ever populated from anything other than a literal (not a risk this phase, since it's a hardcoded TypeScript module, not user input) | Tampering / Injection | Not applicable this phase — flagged only so a future phase that makes any part of this content dynamic (e.g. editable event details) re-evaluates this row |

## Sources

### Primary (HIGH confidence)
- `01-01-SUMMARY.md`, `01-02-SUMMARY.md`, `01-03-SUMMARY.md` (this repo, `.planning/phases/01-funda-o-design-system-deploy/`) — confirmed installed versions, React Router library mode, Tailwind v4 namespace gotchas
- `src/index.css`, `src/components/layout/Shell.tsx`, `src/components/ui/Button.tsx`, `src/components/ui/Card.tsx`, `src/App.tsx`, `index.html` (this repo) — read directly to ground all "reuse as-is" claims
- `sol-40-integrado/app/convite/EventSite.tsx`, `sol-40-integrado/app/globals.css`, `sol-40-integrado/lib/event.ts` (canonical old-project source, read directly per CONTEXT.md's canonical_refs) — countdown logic, all CSS rules referenced by line number in this document, hotel data
- `npm view vitest version` / `npm view vitest peerDependencies` — direct registry query, 2026-07-23
- `file` inspection of `sol-40-integrado/public/dress-code-*.jpg`, `sol-symbol.png`, `og.png`, `favicon.png` — direct filesystem check, 2026-07-23

### Secondary (MEDIUM confidence)
- WebFetch of `tripadvisor.com/Attraction_Review-...-Croa_do_Gore-...` — confirmed page exists, rating 4.3★, 2,729 reviews, #6 of 94 Aracaju attractions, 2026-07-23
- WebSearch "React Router v7 library mode vs framework mode SSR client-side only" — confirmed library mode = client-only routing, no server, no loaders, 2026-07-23

### Tertiary (LOW confidence)
- ECMA-262 Date Time String Format behavior for offset-qualified strings — stated from training knowledge, consistent with long-standing, stable spec behavior and with the old project's own working use of the identical pattern in production; not re-fetched from tc39.es this session

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new runtime deps; the one new dev dep (`vitest`) was version/peer-verified directly against the npm registry
- Architecture: HIGH — grounded directly in this repo's own Phase 1 code and the old project's canonical source, both read in full for the relevant sections
- Pitfalls: HIGH — each pitfall traces to either a UI-SPEC-flagged backstop, a directly-read old-code pattern, or a directly-probed fact this session (Tripadvisor 403 behavior, image file sizes)

**Research date:** 2026-07-23
**Valid until:** 30 days (stable stack, no fast-moving dependencies; re-verify Tripadvisor URL/hotel link liveness and review counts closer to execution if this phase is delayed by more than a few weeks)
