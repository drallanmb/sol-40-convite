---
phase: 07-endurecimento-lan-amento
plan: 04
subsystem: infra
tags: [vercel, cloudflare, dns, tls, convex, playwright]

requires:
  - phase: 07-03
    provides: Production Vercel/Convex isolada, segredo server-only, backup e alvos saudáveis
provides:
  - Domínio canônico público com DNS/TLS/redirect verificados
  - Verificador executável para DNS, TLS, HTTP e preservação de path/query
  - Smoke imediato/pós-propagação e drill de rollback Vercel separado de Convex/dados
affects: [07-05, 07-06, launch, incident-response]

tech-stack:
  added: []
  patterns:
    - Vercel owns the only apex-to-www redirect; Cloudflare stays DNS-only
    - Frontend alias rollback is documented separately from Convex/env/data recovery

key-files:
  created:
    - scripts/verify-release-domain.mjs
  modified:
    - .planning/phases/07-endurecimento-lan-amento/07-LAUNCH-CHECKLIST.md
    - .planning/phases/07-endurecimento-lan-amento/07-SMOKE.md
    - .planning/phases/07-endurecimento-lan-amento/07-ROLLBACK.md

key-decisions:
  - "Vercel mantém o único redirect permanente apex→www; Cloudflare usa somente os dois CNAME DNS-only específicos do projeto e preserva todos os demais registros."
  - "Sem um segundo Production compatível, o drill cria primeiro um redeploy no-op do commit saudável e jamais usa o deployment ligado ao Convex incorreto."
  - "Rollback/promote Vercel move somente aliases do frontend; Convex functions/schema, env, scheduled work, storage e dados exigem recuperação separada."

patterns-established:
  - "Release-domain verifier: targets capturados são obrigatórios; NS/CNAME/TLS/status/redirect/path/query falham fechados."
  - "Evidence boundary: registros sanitizados, login efêmero e jornadas em leitura; sem segredo, convidado, foto ou conteúdo de backup."

requirements-completed: [LAUNCH-04]

coverage:
  - id: D1
    description: "Domínio canônico publicado com Cloudflare DNS-only, TLS válido, www 200 e apex 308 preservando caminho/consulta."
    requirement: LAUNCH-04
    verification:
      - kind: integration
        ref: "VERCEL_APEX_TARGET=... VERCEL_WWW_TARGET=... node scripts/verify-release-domain.mjs"
        status: pass
      - kind: integration
        ref: "DNS_RESOLVER=8.8.8.8 VERCEL_APEX_TARGET=... VERCEL_WWW_TARGET=... node scripts/verify-release-domain.mjs"
        status: pass
    human_judgment: false
  - id: D2
    description: "SPA, metadados, jornadas públicas em leitura e privacidade/login admin comprovados no domínio pós-propagação."
    requirement: LAUNCH-04
    verification:
      - kind: automated_ui
        ref: "PLAYWRIGHT_BASE_URL=https://www.sol40.com.br npm run test:browser — 40/40"
        status: pass
      - kind: unit
        ref: "npm test — 528/528"
        status: pass
      - kind: manual_procedural
        ref: "07-SMOKE.md — RSVP read-only, 37 wa.me, memory boundary, login/logout"
        status: pass
    human_judgment: false
  - id: D3
    description: "Rollback real entre dois frontends compatíveis, restauração do release pretendido e recuperação Convex/dados mantida em camadas separadas."
    requirement: LAUNCH-04
    verification:
      - kind: manual_procedural
        ref: "07-ROLLBACK.md — Vercel Instant Rollback + Undo Rollback"
        status: pass
      - kind: integration
        ref: "npx convex env list --names-only --prod; backup checksum revalidation"
        status: pass
    human_judgment: true
    rationale: "A reassociação de aliases, o histórico de promoção e a permanência do artefato externo dependem de evidência autenticada de control-plane, não apenas de testes do repositório."

duration: 18min
completed: 2026-07-25
status: complete
---

# Phase 07 Plan 04: Publicação canônica e rollback composto Summary

**`www.sol40.com.br` está no ar com DNS/TLS/redirect verificados em dois resolvedores, smoke completo e rollback Vercel restaurado sem confundir frontend com Convex ou dados.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-07-25T12:59:53Z
- **Completed:** 2026-07-25T13:18:33Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Domínio canônico publicado com Cloudflare DNS-only, TLS válido, `www` 200 e apex 308 preservando caminho/consulta.
- SPA, metadados, jornadas públicas em leitura e privacidade/login admin comprovados no domínio pós-propagação.
- Rollback real entre dois frontends compatíveis, restauração do release pretendido e recuperação Convex/dados mantida em camadas separadas.

## Task Commits

Each task was committed atomically:

1. **Task 1: Publicar domínio canônico e automatizar Gate D imediato** - `83eae06` (chore)
2. **Task 2: Revalidar propagação e executar drill de rollback em camadas** - `c75a684` (chore)
3. **Post-verification hardening: Tornar o resolvedor público padrão determinístico** - `1bd737d` (fix)

## Files Created/Modified

- `scripts/verify-release-domain.mjs` - Valida NS, alvo DNS, TLS, status HTTP, cadeia de redirect e preservação de path/query; usa `1.1.1.1` por padrão e aceita resolvedor explícito.
- `.planning/phases/07-endurecimento-lan-amento/07-LAUNCH-CHECKLIST.md` - Fecha Gate D e mantém divulgação bloqueada pelo Gate E.
- `.planning/phases/07-endurecimento-lan-amento/07-SMOKE.md` - Registra smokes imediato/pós-propagação e jornadas sem escrita.
- `.planning/phases/07-endurecimento-lan-amento/07-ROLLBACK.md` - Registra alvos compatíveis, drill real e caminhos separados de recuperação.

## Decisions Made

- A Vercel é dona do único redirect apex→`www`; a Cloudflare permanece DNS-only e não altera nameservers ou registros externos ao site.
- O segundo release saudável foi criado por redeploy no-op do mesmo commit/backend antes do drill; o deployment incompatível foi excluído.
- O alvo final é `dpl_EqoaJyVxbBrcmWHmHegcYRAGFqDS`; o anterior `dpl_55PBruCBvfwrpN7y6WdGk2JpHKnY` permanece elegível.
- Recuperação de Convex usa o commit saudável e a Production Deploy Key; envs usam `--prod`; restore de dados não é ensaiado em Production.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Missing critical] Consulta pública independente do cache local**
- **Found during:** Verificação final pós-commit
- **Issue:** O DNS público e os dois resolvedores diretos estavam corretos, mas o cache local do macOS ainda devolvia `ENOTFOUND` para o CNAME de `www`, tornando o comando exato do plano não determinístico.
- **Fix:** O verificador passou a usar `1.1.1.1` como resolvedor público padrão e manteve `DNS_RESOLVER` para o segundo passe com `8.8.8.8`.
- **Files modified:** `scripts/verify-release-domain.mjs`
- **Verification:** O comando do plano passou sem `DNS_RESOLVER`; o override `8.8.8.8` passou; valor inválido falhou fechado.
- **Committed in:** `1bd737d`

**Total deviations:** 1 auto-fixed (1 missing critical).
**Impact on plan:** Fortalece a reprodutibilidade da verificação pública sem alterar DNS, domínio ou aplicação.

## Issues Encountered

- Não existia um segundo frontend Production compatível. Conforme previsto no plano, foi criado e validado um redeploy no-op antes do Instant Rollback.

## User Setup Required

None - Vercel, Cloudflare, DNS e domínios foram configurados e verificados durante a execução.

## Next Phase Readiness

- `07-05` pode importar/revisar a lista real e assinar Gate E antes de qualquer divulgação.
- `07-06` pode executar a matriz física iOS/Android/WebViews/HEIC/fuso de forma independente.
- O site público não autoriza envio do convite: lista real/revisão e sign-off dos donos continuam pendentes.

## Self-Check: PASSED

- Os arquivos listados existem e os commits de tarefa estão presentes.
- Dois resolvedores, TLS, redirect, SPA, login/logout e rollback/restore passaram.
- `40/40` browser, `528/528` unitários, build, env names-only Production e `git diff --check` passaram.
- O backup continua disponível com tamanho/checksum esperado; nenhum conteúdo foi aberto e nenhum restore foi executado.

---
*Phase: 07-endurecimento-lan-amento*
*Completed: 2026-07-25*
