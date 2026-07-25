---
phase: 08
slug: gest-o-de-gestores-contas-individuais-permiss-es-e-auditoria
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-25
---

# Phase 08 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + convex-test + Playwright 1.62 + axe-core |
| **Config file** | `vite.config.ts`, `playwright.config.ts` |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test -- --run && npm run build && npm run test:browser` |
| **Estimated runtime** | ~180 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm test -- --run && npm run build`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 08-01-* | 01 | 1 | D-01–D-18 | T08-01 | Senhas usam KDF lenta; guard resolve ator e papel; sessão falha fechada | unit + convex | `npm test -- --run convex/admin` | ❌ W0 | ⬜ pending |
| 08-02-* | 02 | 2 | D-01–D-05, D-19–D-22 | T08-02 | Link é one-time/72h; bootstrap singleton; cutoff legado é atômico | convex | `npm test -- --run convex/admin` | ❌ W0 | ⬜ pending |
| 08-03-* | 03 | 3 | D-13–D-18, D-37–D-38 | T08-03 | Login individual, troca de senha e revogação limpam dados e sessões corretas | unit + browser | `npm test -- --run src/lib/adminSession` | ❌ W0 | ⬜ pending |
| 08-04-* | 04 | 3 | D-07–D-12, D-34–D-38 | T08-04 | Matriz RBAC bloqueia dados e writers em backend e rotas proibidas não montam queries | convex + browser | `npm test -- --run convex/admin` | ❌ W0 | ⬜ pending |
| 08-05-* | 05 | 4 | D-23–D-28 | T08-05 | Seller altera apenas Presentes; CAS e projeção pública privada permanecem | convex + component | `npm test -- --run adminWines` | ❌ W0 | ⬜ pending |
| 08-06-* | 06 | 4 | D-29–D-33 | T08-06 | Auditoria é atômica, redigida, owner-only e expira em 120 dias | convex + component | `npm test -- --run audit` | ❌ W0 | ⬜ pending |
| 08-07-* | 07 | 5 | D-01–D-38 | T08-01–06 | Fluxos integrados, acessibilidade, migração e runtime Preview comprovados | browser + smoke | `npm run test:browser && npm run build` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Expandir `convex/admin.test.ts` com factories de conta/sessão por papel,
  links one-time, bootstrap, credential version e auditoria.
- [ ] Acrescentar testes puros para normalização de e-mail, envelope scrypt,
  matriz de permissões, redaction/diff e labels de aparelho.
- [ ] Expandir `src/lib/adminSession.test.ts` para principal individual,
  revogação cross-tab, troca de senha e resultados assíncronos tardios.
- [ ] Criar fixtures Playwright para owner, manager e seller sem usar
  credenciais ou tokens reais.
- [ ] Manter chamadas de cleanup/scheduler manuais em convex-test; cron e
  limites reais ficam no smoke Preview.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Custo real de scrypt | D-01–D-05 | convex-test não reproduz runtime/memória Node do deployment | Medir p50/p95 de senha correta/incorreta no Preview e confirmar login utilizável |
| Cutoff de sessão legada ao vivo | D-19–D-22 | Exige duas sessões/browser e deployment real | Manter sessão legada e conta nova em browsers distintos; ativar Allan e confirmar queda reativa da legada |
| Scheduler e retenção | D-29–D-33 | convex-test não executa cron/scheduler real | No Preview, criar eventos com datas controladas, executar cleanup e verificar limite de 120 dias |
| Link compartilhado | D-02–D-04 | Copy/paste, histórico e janela privada são integrações do navegador | Abrir link em janela privada, definir senha e confirmar que replay e URL antigo falham sem expor token |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 180s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
