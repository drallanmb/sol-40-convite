---
phase: 06
slug: dashboard-interno-admin
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-25
---

# Phase 06 — Security

> Verificação OWASP ASVS L1 das fronteiras e mitigações previstas nos sete planos da fase.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Navegador anônimo → autenticação administrativa | Credencial e capability são validadas no servidor, com limitação de tentativas e persistência somente do hash | Senha compartilhada, token opaco, expiração |
| React → APIs administrativas protegidas | Visibilidade de rota não concede autoridade; cada operação revalida a sessão | Dados de RSVP, moderação, presentes |
| Capability pública → dados da família | Expiração, existência da família e geração corrente são verificadas antes da projeção | Token RSVP, dados públicos estreitos |
| Scheduler/cleanup → sessões persistidas | Comandos internos usam identidade, expiração, geração e paginação limitadas | IDs internos, cursores e metadados de lifecycle |
| Estado reativo → drafts e comandos locais | Revisão otimista e ownership por operação impedem sobrescrita ou conclusão stale | Drafts, revisões, pending state |
| Registros protegidos → superfícies públicas | DTOs separados omitem contato, atribuição, revisão e conteúdo não aprovado | Posts, vinhos e dados de convite |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation / Evidence | Status |
|-----------|----------|-----------|----------|-------------|-----------------------|--------|
| T-06-01 | Spoofing / DoS | `adminAuth.login` | high | mitigate | Rate limit e resposta uniforme cobertos por `convex/admin.test.ts` | closed |
| T-06-02 | Information disclosure | capability administrativa | high | mitigate | Token canônico, hash-only e TTL absoluto em `adminSecurity.ts`/`adminAuth.ts` | closed |
| T-06-03 | Spoofing | expiração agendada | high | mitigate | Deleção idempotente por id + expiração e sessão absoluta testadas | closed |
| T-06-04 | Elevation of privilege | APIs administrativas | high | mitigate | `requireAdminSession` e matriz de autorização em `convex/admin.test.ts` | closed |
| T-06-05 | Information disclosure | cache/drafts entre abas | high | mitigate | Limpeza fail-closed coberta por `adminSession.test.ts` e testes de pending | closed |
| T-06-06 | Information disclosure | subscriptions pré-auth | high | mitigate | Árvore protegida não monta antes do status válido | closed |
| T-06-07 | Elevation of privilege | rotas/overview | high | mitigate | Deep links preservam gate e `adminOverview.get` reautoriza no servidor | closed |
| T-06-08 | Information disclosure | reconnect/revogação | high | mitigate | Falha de autorização desmonta dados e estado protegido | closed |
| T-06-09 | Tampering | agregados do overview | medium | mitigate | Contagens derivadas das tabelas fonte e casos zero/mistos testados | closed |
| T-06-10 | Spoofing | navegação/ações | medium | mitigate | Links semânticos, foco, labels e alvos definidos e aceitos no UAT | closed |
| T-06-11 | Elevation of privilege | CRUD família/pessoa | high | mitigate | Autorização, ownership e revisão na mesma transação | closed |
| T-06-12 | Spoofing | capability RSVP antiga | high | mitigate | Mudança de telefone avança geração atomicamente | closed |
| T-06-13 | Tampering | revisão da família | high | mitigate | Revisão monotônica compartilhada e conflito sem escrita testados | closed |
| T-06-14 | Tampering | remoção em cascata | high | mitigate | Negação lógica imediata e purge interno paginado | closed |
| T-06-15 | Spoofing | `publicRef` de convidado | high | mitigate | Referência opaca com colisão verificada apenas na criação | closed |
| T-06-16 | Information disclosure | projeções RSVP | high | mitigate | DTO admin protegido e regressão da projeção pública estreita | closed |
| T-06-17 | Information disclosure | moderação/storage | high | mitigate | Autorização precede leitura e geração de URL | closed |
| T-06-18 | Tampering | transição de moderação | high | mitigate | Mapa fechado e comparação/incremento transacional de revisão | closed |
| T-06-19 | Tampering | undo de moderação | high | mitigate | Status e revisão exatos impedem undo stale/ABA | closed |
| T-06-20 | Tampering | estado de presente | high | mitigate | Helper atômico compartilhado e revisão monotônica | closed |
| T-06-21 (06-04) | Information disclosure | projeções públicas post/vinho | high | mitigate | Posts aprovados e vinho sem atribuição/revisão em regressões públicas | closed |
| T-06-22 (06-04) | Repudiation / Tampering | submit concorrente | high | mitigate | Revisão esperada, conflito sem falso sucesso e lock por registro | closed |
| T-06-21 (06-05) | Denial of service | sessões RSVP acumuladas | high | mitigate | Expiração agendada e sweep histórico indexado/paginado | closed |
| T-06-22 (06-05) | Tampering | comando de expiração atrasado | high | mitigate | Deleção exige id + `expectedExpiresAt`; retry é idempotente | closed |
| T-06-23 | Elevation of privilege | capability de geração antiga | high | mitigate | Resolução exige expiração válida e geração corrente | closed |
| T-06-24 | Denial of service | continuação de cleanup | high | mitigate | Página fixa, cutoff estável, cursor validado e término determinístico | closed |
| T-06-25 | Information disclosure | resultados de lifecycle | high | mitigate | Funções internas e respostas sem token/hash | closed |
| T-06-31 | Denial of service | update/remove família | high | mitigate | Revogação independe da quantidade histórica; caso de 160 sessões passa | closed |
| T-06-32 | Spoofing | capability pré-mudança | high | mitigate | Geração avança junto do patch e tokens antigos falham imediatamente | closed |
| T-06-33 | Tampering | edição stale | high | mitigate | `expectedUpdatedAt` e unicidade normalizada impedem escrita inválida | closed |
| T-06-34 | Denial of service | cleanup em cascata | high | mitigate | Páginas fixas, comando tipado e continuação convergente | closed |
| T-06-35 | Tampering | purge atrasado/reordenado | high | mitigate | Predicado monotônico preserva gerações iguais e posteriores | closed |
| T-06-37 | Tampering | confusão de modo de cleanup | high | mitigate | Comando discriminado separa `olderThanGeneration` de `deleteAll` | closed |
| T-06-36 | Information disclosure | smoke/purge | high | mitigate | Helpers internos retornam somente contagens/estado não sensível | closed |
| T-06-41 | Denial of service | submit duplicado | medium | mitigate | Guarda síncrona por id bloqueia segunda chamada antes da mutation | closed |
| T-06-42 | Tampering | conclusão fora de ordem | medium | mitigate | Token de ownership remove apenas a operação correspondente | closed |
| T-06-43 | Repudiation | busy/feedback incorreto | medium | mitigate | Feedback e `aria-busy` derivam da operação exata | closed |
| T-06-44 | Information disclosure | pending após perda de auth | high | mitigate | Evento de limpeza invalida tokens, diálogos e estado pendente | closed |
| T-06-45 | Supply chain | `jsdom` | high | mitigate | Dependência exata, lockfile com integridade e uso somente em teste | closed |

> Nota de rastreabilidade: os planos 06-04 e 06-05 reutilizam `T-06-21` e
> `T-06-22`. Os sufixos de plano acima desambiguam os quatro registros sem
> reescrever retroativamente os artefatos de execução.

---

## Accepted Risks Log

No accepted risks.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-25 | 39 | 39 | 0 | Codex / UAT owner confirmation |

Evidence basis: `06-VERIFICATION.md`, 25 arquivos/494 testes aprovados, build,
smokes Convex e confirmação humana dos 21 checkpoints de UAT.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-25
