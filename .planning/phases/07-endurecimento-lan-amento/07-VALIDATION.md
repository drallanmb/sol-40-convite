---
phase: 7
slug: endurecimento-lan-amento
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase)
status: validated
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-25
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Unit/integration framework** | Vitest 4.1.10 + convex-test 0.0.54 |
| **Current config** | `vite.config.ts` |
| **Browser/a11y framework** | Playwright + axe (Wave 0 installs exact pinned versions) |
| **Quick run command** | focused `npx vitest run <files>` command owned by the task |
| **Full suite command** | `npm test && npm run build && npm run test:browser` |
| **Current baseline** | 25 files / 494 tests green; build green |
| **Estimated focused runtime** | under 30 seconds |

---

## Sampling Rate

- **After every implementation task:** Run its focused Vitest/Playwright command plus `npm run build`.
- **After every plan:** Run `npm test && npm run build && git diff --check`.
- **Before DNS changes:** Run the complete release gate against preview and the production `.vercel.app` URL.
- **After DNS:** Run an immediate live smoke and repeat after propagation.
- **After every hotfix:** Run the focused regression, full build and the affected live journey.
- **Before `/gsd-verify-work`:** Automated suite and required live checks must be green; physical-device items may remain explicitly pending because they do not block publication.
- **Max automated feedback latency:** 30 seconds for focused commands.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command (exact `<automated>`) | Manual / Live Evidence | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|----------------------------------------|------------------------|-------------|--------|
| 07-01-01 | 01 | 1 | LAUNCH-03 | T-07-CSV-01 | Vertical importer tracer is authorized and pending-only | unit/integration | `npx vitest run src/lib/guestCsv.test.ts convex/admin.test.ts -t "csv\|import\|pending\|authorization" && npm run build && git diff --check` | None | ❌ W0 | ⬜ pending |
| 07-01-02 | 01 | 1 | LAUNCH-03 | T-07-CSV-03 | Partial success never overwrites existing logical phones | unit/integration | `npx vitest run src/lib/guestCsv.test.ts && npx vitest run convex/admin.test.ts -t "csv\|import\|existing\|pending\|concurrent\|limit" && npm run build && git diff --check` | None | ❌ W0 | ⬜ pending |
| 07-01-03 | 01 | 1 | LAUNCH-03 | T-07-CSV-05 | UI clears sensitive state and reports interruption honestly | UI/build | `npx vitest run src/components/admin/AdminGuestImport.test.tsx && npx vitest run src/lib/guestCsv.test.ts convex/admin.test.ts -t "csv\|import\|family" && npm run build && git diff --check` | None | ❌ W0 | ⬜ pending |
| 07-02-01 | 02 | 2 | LAUNCH-02, LAUNCH-03 | T-07-META-01 | Canonical/OG metadata use the approved origin | unit/browser | `npx vitest run src/lib/productionMetadata.test.ts && npm run build && npx playwright test tests/release.spec.ts -g "canonical tracer" && git diff --check` | None | ❌ W0 | ⬜ pending |
| 07-02-02 | 02 | 2 | LAUNCH-02 | T-07-A11Y-01 | Routes pass browser/axe/mobile/privacy gates | browser/full | `npm run test:browser && npm test && npm run build && git diff --check` | Manual AA checks remain in the matrix | ❌ W0 | ⬜ pending |
| 07-02-03 | 02 | 2 | LAUNCH-01, LAUNCH-04 | T-07-EVIDENCE-01 | Runbooks preserve environment and evidence boundaries | docs/build | `npm test && npm run build && rg -n -- '--prod\|names-only\|LAUNCH-01\|pending\|Vercel.*Convex\|Convex.*Vercel' DEPLOY.md .env.example .planning/phases/07-endurecimento-lan-amento/07-{LAUNCH-CHECKLIST,SMOKE,ROLLBACK,DEVICE-MATRIX}.md && ! rg -n 'PUBLIC_ORIGIN\|ADMIN_PASSWORD=.+' index.html DEPLOY.md .env.example .planning/phases/07-endurecimento-lan-amento/07-{LAUNCH-CHECKLIST,SMOKE,ROLLBACK,DEVICE-MATRIX}.md && git diff --check` | Template review | ❌ W0 | ⬜ pending |
| 07-03-01 | 03 | 3 | LAUNCH-03, LAUNCH-04 | T-07-ENV-01 | Preview/Production tracer remains isolated | CLI/live | `npm test && npm run build && npx convex deploy --dry-run && PLAYWRIGHT_BASE_URL="$PREVIEW_PUBLIC_URL" npm run test:browser && git diff --check` | Vercel/Convex names-only isolation evidence | partial | ⬜ pending |
| 07-03-02 | 03 | 3 | LAUNCH-03, LAUNCH-04 | T-07-DATA-01 | Production secret and backup artifacts stay outside source/workspace | CLI/assertions | `npm run test:release && npx convex env list --names-only --prod \| rg '^ADMIN_PASSWORD$' && test -z "$(find . -path './.git' -prune -o -path './node_modules' -prune -o -type f \( -iname '*.zip' -o -iname '*.bak' -o -iname '*.backup' -o -iname '*.pem' -o -iname '*.key' -o -name '.env.production' -o -name '.env.production.local' -o -name '.env.preview' -o -name '.env.preview.local' \) -print -quit)" && test -z "$(git ls-files \| rg '(^\|/)\.env$\|(^\|/)\.env\.(local\|production\|production\.local\|preview\|preview\.local\|development\|development\.local)$\|\.(zip\|bak\|backup\|pem\|key)$' \|\| true)" && ! git grep -IEn '(ADMIN_PASSWORD\|CONVEX_DEPLOY_KEY)=[^[:space:]&lt;]+' -- ':!package-lock.json' && git diff --check` | Completed external backup timestamp/checksum and names-only console evidence | ❌ W0 | ⬜ pending |
| 07-03-03 | 03 | 3 | LAUNCH-04 | T-07-SMOKE-01 | `.vercel.app` routes, Convex linkage and admin privacy pass | browser/live | `PLAYWRIGHT_BASE_URL="$PRODUCTION_VERCEL_URL" npm run test:browser && curl --fail --silent --show-error --location "$PRODUCTION_VERCEL_URL/admin" >/dev/null && npm test && npm run build && git diff --check` | Sanitized logs and rollback-target register | ❌ W0 | ⬜ pending |
| 07-04-01 | 04 | 4 | LAUNCH-04 | T-07-DNS-01 | Captured Vercel targets, TLS, 2xx www and preserving permanent apex redirect are asserted | HTTP/DNS/browser | `VERCEL_APEX_TARGET="$VERCEL_APEX_TARGET" VERCEL_WWW_TARGET="$VERCEL_WWW_TARGET" node scripts/verify-release-domain.mjs && curl --fail --silent --show-error 'https://www.sol40.com.br/' \| rg '&lt;link rel="canonical" href="https://www\.sol40\.com\.br/"\|&lt;meta property="og:url" content="https://www\.sol40\.com\.br/"\|&lt;meta property="og:image" content="https://www\.sol40\.com\.br/og\.jpg"' && PLAYWRIGHT_BASE_URL='https://www.sol40.com.br' npm run test:browser` | Sanitized Cloudflare before/after inventory and Vercel target capture | ❌ W0 | ⬜ pending |
| 07-04-02 | 04 | 4 | LAUNCH-04 | T-07-ROLLBACK-01 | Propagated domain and layer-honest rollback remain healthy | drill/live | `VERCEL_APEX_TARGET="$VERCEL_APEX_TARGET" VERCEL_WWW_TARGET="$VERCEL_WWW_TARGET" RELEASE_PROBE_PATH='/presentes?origem=rollback' node scripts/verify-release-domain.mjs && PLAYWRIGHT_BASE_URL='https://www.sol40.com.br' npm run test:browser && npx convex env list --names-only --prod >/dev/null && npm test && npm run build && git diff --check` | Second resolver/network plus recorded reversible drill | ❌ W0 | ⬜ pending |
| 07-05-01 | 05 | 5 | LAUNCH-03 | T-07-DATA-03 | Real-list review is backup-gated and aggregate-only | manual/full gate | `npm test && npm run build && git diff --check` | Owner CSV confirmation, backup revalidation and Gate E aggregate sign-off | ❌ W0 | ⬜ pending |
| 07-06-01 | 06 | 5 | LAUNCH-01, LAUNCH-02 | T-07-DEVICE-01 | Physical rows remain independent and never infer pass | manual/docs | `npm run test:release && git diff --check` | Direct evidence per physical row; unavailable rows remain pending | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/guestCsv.test.ts` — BOM, comma/semicolon, quotes, CRLF, header normalization, grouping, Brazilian phone variants, duplicates and partial-report reasons.
- [ ] `src/components/admin/AdminGuestImport.test.tsx` — select/preview/confirm/result, double submit, batch failure, lost authorization, focus and `aria-live`.
- [ ] `src/lib/productionMetadata.test.ts` — canonical origin, absolute OG URL, asset and secret absence.
- [ ] Playwright + axe with exact pinned versions and non-watch scripts `test:browser` and `test:release`.
- [ ] Release browser specs for route refresh, pre-auth transport privacy, axe, 320px/200% reflow and critical production smoke.
- [ ] `scripts/verify-release-domain.mjs` — failing assertions for captured Vercel DNS targets, TLS identity, www 2xx, apex 301/308, canonical Location path/query and redirect-loop absence.
- [ ] `07-LAUNCH-CHECKLIST.md`, `07-SMOKE.md`, `07-DEVICE-MATRIX.md` and `07-ROLLBACK.md` evidence templates.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real `wa.me` handoff in iOS/Android browsers and embedded WebViews | LAUNCH-01 | App handoff and WebView policy require actual mobile environments | Record device, OS, browser/WebView, source URL, result and timestamp; do not count desktop emulation |
| HEIC/HEIF selection and conversion in Safari on iPhone | LAUNCH-01 | Native codec behavior depends on physical Apple hardware/software | Select a real iPhone HEIC photo, confirm preview/downscale/upload/moderation, and preserve no personal fixture |
| Countdown in a changed device timezone | LAUNCH-01 | Requirement explicitly calls for real-device timezone behavior | Change device timezone away from `-03:00`, load/reload countdown and compare with the Aracaju-qualified boundary |
| Keyboard, 200% zoom, 320px reflow, contrast and long-content review | LAUNCH-02 | Automated axe cannot prove all WCAG/mobile behavior | Execute the documented route/state matrix and record issue severity |
| Vercel/Convex environment isolation and backup download/checksum | LAUNCH-03, LAUNCH-04 | Requires authenticated production consoles and external artifacts | Verify names only, never display secrets; save backup outside git and record timestamp/checksum |
| DNS/TLS/redirect propagation and rollback drill | LAUNCH-04 | Depends on live external state and authenticated consoles | Record Vercel domain health, DNS-only Cloudflare records, TLS, preserved path/query, healthy target and recovery outcome |

---

## Validation Sign-Off

- [x] All tasks have an exact automated verify command and any missing executable artifact is a Wave 0 dependency.
- [x] Sampling continuity has no three consecutive tasks without automated feedback.
- [x] Wave 0 covers every missing test/evidence artifact.
- [x] No watch-mode flags are used.
- [x] Focused feedback latency is targeted below 30 seconds; live commands are separately classified.
- [x] Planning fixtures/evidence contracts contain no secret, real guest data or private image.
- [x] No physical-device item is marked passed from emulation.
- [x] Every production Convex environment command that requires production includes `--prod`.
- [x] `nyquist_compliant: true` was set after the final 13-task mapping was checked against exact plan commands.

**Approval:** validation strategy approved; execution evidence remains pending
