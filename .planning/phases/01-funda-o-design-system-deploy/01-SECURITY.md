---
phase: 01
slug: funda-o-design-system-deploy
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-07-23
---

# Phase 01 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Registro STRIDE derivado dos blocos `<threat_model>` dos 3 planos (register_authored_at_plan_time: true).
> Auditoria L1 (grep-depth) via short-circuit — nenhuma ameaça aberta no threshold `high`.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| dev → registro npm | pacotes de terceiros entram na árvore de build | código/deps de terceiros (supply chain) |
| frontend (browser) → deployment Convex | cliente conecta via `VITE_CONVEX_URL` | URL pública do backend reativo (não-segredo) |
| repositório git → mundo | arquivos versionados (repo público) | código-fonte — não pode conter segredos |
| build Vercel → backend Convex | deploy key autentica push de schema/funções | `CONVEX_DEPLOY_KEY` (server/build-time) |
| deployment preview → produção | builds de PR vs produção | precisam usar backends Convex distintos |
| conteúdo renderizado → DOM | primitivos de UI exibindo texto | texto → vetor XSS se não escapado |
| app → assets de fonte | fontes locais vs CDN de terceiro | requisições de rede a origem externa |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-01-SC | Tampering | instalação npm (deps) | high | mitigate | Versões EXATAS pinadas (sem `^`/`~`); `package-lock.json` commitado; checkpoint blocking-human verificou pacotes antes de instalar | closed |
| T-01-01 | Tampering | major recém-lançado (React Router 8 / TS 7) | medium | mitigate | Pins forçam `react-router@7.18.1`, `typescript@6.0.3` (verificado em package.json) | closed |
| T-01-02 | Information disclosure | `VITE_CONVEX_URL` no bundle do cliente | low | accept | URL do deployment Convex é pública por design; nenhum segredo exposto | closed |
| T-01-03 | Spoofing | rota `/admin` sem auth | low | accept | Placeholder sem dados nesta fase; gate real (`requireOwner`) é escopo da Phase 6 | closed |
| T-02-01 | Information disclosure | segredos vazando no bundle do cliente | high | mitigate | Sem prefixo `VITE_`; ausentes em `src/` (grep gate == 0); `ADMIN_PASSWORD` só no env Convex, `CONVEX_DEPLOY_KEY` só na Vercel | closed |
| T-02-02 | Information disclosure | segredo commitado no git | high | mitigate | `.env.local` no `.gitignore`; `.env.example` só placeholders; varredura pré-push público confirmou 0 segredos versionados | closed |
| T-02-03 | Elevation of privilege / Tampering | preview escrevendo na base de produção | medium | mitigate | Deploy keys separadas (Production/Preview) → backends Convex distintos. **Verificado ao vivo (UAT Teste 3): prod `rugged-hippopotamus-117` ≠ preview `neat-snake-930`** | closed |
| T-02-04 | Denial of service | SPA rewrite mascarando 404 legítimos de assets | low | accept | Fallback SPA é padrão; assets `/assets/*` servidos antes do fallback; risco cosmético sem dado sensível | closed |
| T-02-SC | Tampering | `npx convex deploy` na cadeia de build | low | accept | Nenhum pacote novo instalado; usa `convex` já verificado/pinado em 01-01 | closed |
| T-03-01 | Tampering | XSS via primitivos (Toast/Field) | medium | mitigate | JSX (auto-escape do React); `dangerouslySetInnerHTML` proibido (grep gate == 0 em src/components/ui/) | closed |
| T-03-02 | Information disclosure | CDN externo de fontes (Google Fonts) | low | mitigate | Fontes self-hosted via `@fontsource-variable/*` (import CSS local); sem chamada a CDN de terceiro | closed |
| T-03-03 | Tampering | UI kit de terceiro não auditado | low | accept | Nenhum pacote novo instalado; primitivos usam só React + Tailwind já pinados | closed |

*Status: open · closed · open — below `high` threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above `high` count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-01 | T-01-02 | URL do backend Convex é pública por design (o cliente WebSocket precisa dela); não é segredo | Allan (dono) — documentado no plano 01-01 | 2026-07-23 |
| AR-02 | T-01-03 | `/admin` é placeholder sem dados; auth do dono é escopo da Phase 6 | Allan (dono) — documentado no plano 01-01 | 2026-07-23 |
| AR-03 | T-02-04 | Rewrite de fallback SPA é padrão; assets servidos antes; risco cosmético sem dado sensível | Allan (dono) — documentado no plano 01-02 | 2026-07-23 |
| AR-04 | T-02-SC | Nenhum pacote novo na cadeia de deploy; usa `convex` já verificado em 01-01 | Allan (dono) — documentado no plano 01-02 | 2026-07-23 |
| AR-05 | T-03-03 | Nenhum UI kit de terceiro instalado; só React + Tailwind já pinados | Allan (dono) — documentado no plano 01-03 | 2026-07-23 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-23 | 12 | 12 | 0 | Claude (gsd secure-phase, ASVS L1 short-circuit; T-02-03 confirmado ao vivo) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-23
