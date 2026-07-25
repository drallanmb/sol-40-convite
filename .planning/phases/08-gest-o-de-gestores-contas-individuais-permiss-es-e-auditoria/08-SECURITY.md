---
phase: 08
slug: gest-o-de-gestores-contas-individuais-permiss-es-e-auditoria
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-25
---

# Phase 08 — Security

> Contrato de segurança para contas administrativas individuais, RBAC,
> sessões, presentes e auditoria.

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Navegador → Convex | Capability passa pela guarda, sessão e conta autoritativa | token de sessão |
| Senha → action Node | scrypt e comparação timing-safe antes do finalizer Web-runtime | senha humana e hash |
| URL → link one-time | Capability permanece em memória e é consumida transacionalmente | token de ativação/reset |
| Senha-mestra → recovery | Recuperação isolada resolve somente a conta proprietária | segredo de recuperação |
| Papel/rota → backend | Matriz fixa de capacidades autoriza cada endpoint | papel, rota e IDs |
| Vinho privado → catálogo | DTO público allowlisted remove metadados privados | estado público do presente |
| Mutation → auditoria | Evento é escrito no mesmo commit da operação | ator, ação e diff redigido |
| Auditoria → owner | Guarda owner-only, paginação e retenção limitam leitura | histórico administrativo |
| Fixtures/smoke → Preview | Evidência sanitizada e guard contra Production | métricas e status sem segredos |

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T08-01-S | Spoofing | sessão/conta | high | mitigate | capability única, conta ativa e `credentialVersion` | closed |
| T08-01-E | Elevation | RBAC | high | mitigate | matriz fixa derivada da conta e testes por endpoint | closed |
| T08-01-I | Information disclosure | KDF/sessão | high | mitigate | salt aleatório, comparação timing-safe e DTOs sem segredos | closed |
| T08-01-D | Denial of service | scrypt | high | mitigate | tamanho, formato, parâmetros e memória limitados | closed |
| T08-02-S | Spoofing | links de acesso | high | mitigate | token hash, TTL, finalidade e single-use | closed |
| T08-02-T | Tampering | ativação/reset | high | mitigate | revalidação e consumo transacional | closed |
| T08-02-E | Elevation | recovery | high | mitigate | alvo fixo em `ownerAccountId`, sem target do cliente | closed |
| T08-02-I | Information disclosure | URL/token | high | mitigate | token em memória, `replaceState` e `no-referrer` | closed |
| T08-03-S | Spoofing | login | high | mitigate | rate limit global/e-mail, envelope dummy e erro neutro | closed |
| T08-03-E | Elevation | sessões | high | mitigate | revogação self-or-owner no backend | closed |
| T08-03-R | Repudiation | sessões/senha | high | mitigate | ator derivado e auditoria atômica | closed |
| T08-03-I | Information disclosure | Minha conta | high | mitigate | projeções mínimas e e-mail somente na área autenticada | closed |
| T08-04-E | Elevation | endpoints admin | high | mitigate | guards por capacidade e matriz integral de testes | closed |
| T08-04-I | Information disclosure | shell/rotas | high | mitigate | áreas proibidas não montam queries; backend fail-closed | closed |
| T08-04-T | Tampering | contas | high | mitigate | owner-only, CAS, proteção do owner e versionamento | closed |
| T08-04-R | Repudiation | lifecycle de contas | high | mitigate | eventos redigidos no mesmo handler | closed |
| T08-05-E | Elevation | Presentes | high | mitigate | sessão válida e seller restrita à capacidade gifts | closed |
| T08-05-T | Tampering | vinho | high | mitigate | CAS e transições explícitas confirmar/editar/reabrir | closed |
| T08-05-I | Information disclosure | catálogo público | high | mitigate | DTO allowlisted e testes negativos de campos privados | closed |
| T08-05-R | Repudiation | compra do vinho | high | mitigate | ator do principal e write+audit atômicos | closed |
| T08-06-R | Repudiation | writers admin | high | mitigate | inventário completo de `appendAuditEvent` e atomicidade | closed |
| T08-06-I | Information disclosure | audit log | high | mitigate | vocabulário fechado, denylist, bounds e sanitização | closed |
| T08-06-E | Elevation | consulta de auditoria | high | mitigate | `requireAdminSession` + `requireOwner` em cada página | closed |
| T08-06-D | Denial of service | auditoria/retenção | high | mitigate | paginação, índices, limites e sweep em lotes | closed |
| T08-07-I | Information disclosure | fixtures/evidência | high | mitigate | sanitizer, canary e remoção de capability | closed |
| T08-07-T | Tampering | smoke Preview | high | mitigate | abort de Production antes de subprocesso ou write | closed |
| T08-07-E | Elevation | navegador/backend | high | mitigate | ausência de request pré-auth e matriz backend completa | closed |
| T08-07-D | Denial of service | probes | high | mitigate | amostras bounded, cleanup em `finally` e ambiente isolado | closed |

## Accepted Risks Log

No accepted risks.

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-25 | 28 | 28 | 0 | Codex / gsd-security-auditor |

## Sign-Off

- [x] All threats have a disposition.
- [x] Accepted risks documented.
- [x] `threats_open: 0` confirmed.
- [x] `status: verified` set in frontmatter.

**Approval:** verified 2026-07-25
