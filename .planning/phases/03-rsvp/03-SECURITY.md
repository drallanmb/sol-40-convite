---
phase: 03
slug: rsvp
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-24
---

# Phase 03 — Security

> Verificação retroativa das mitigações planejadas para o RSVP público.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Telefone público → normalização | Entrada anônima vira candidatos nacionais determinísticos antes da busca. | Telefone; dado pessoal de baixa sensibilidade |
| Browser → API Convex pública | Telefone, capability e comandos sparse atravessam validadores e rate limits. | Capability, presença e contato opcional |
| Capability → sessão RSVP | O token bruto é validado, resumido com SHA-256 e resolve no máximo uma família não expirada. | Segredo efêmero e escopo familiar |
| Comando de edição → documentos | Referências opacas são revalidadas contra o RSVP da sessão antes de qualquer patch atômico. | Respostas de presença e contato |
| Banco → browser | Retornos com validadores próprios excluem telefone, IDs internos, hashes e sessões. | Visão mínima da própria família |
| CLI interna → fixtures UAT | Helpers sintéticos exigem guard de desenvolvimento e não existem na API pública. | Dados sintéticos e capabilities temporárias |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-03-01-A | Spoofing | Normalização de telefone | high | mitigate | Parser ordenado, DDDs válidos e matriz de equivalência em `src/lib/phone.test.ts`. | closed |
| T-03-01-B | Elevation of Privilege | Fixtures | high | mitigate | Criação somente por `internalMutation`, guard de desenvolvimento e seed do servidor. | closed |
| T-03-01-C | Tampering | Persistência RSVP | high | mitigate | Checagem indexada e inserção serializável; fixtures idempotentes e refs opacas. | closed |
| T-03-01-D | Tampering | Schema Convex | high | mitigate | Validadores explícitos e constantes de domínio limitadas. | closed |
| T-03-01-E | Tampering | Código gerado/limiter | medium | mitigate | Componente oficial registrado e artefatos regenerados por Convex. | closed |
| T-03-01-F | Tampering | Dependências | medium | mitigate | Versões exatas e lockfile verificados pelo build e instalação. | closed |
| T-03-02-A | Information Disclosure | Busca por telefone | high | mitigate | Mutation com limites global/telefone, resposta genérica e nenhuma listagem pública. | closed |
| T-03-02-B | Information Disclosure | Capability | high | mitigate | 256 bits, SHA-256 em repouso, TTL absoluto de 8 horas e ausência em URL/log. | closed |
| T-03-02-C | Elevation of Privilege | Escopo familiar | high | mitigate | RSVP derivado da sessão; refs opacas e ownership validado em toda escrita. | closed |
| T-03-02-D | Tampering | Comando de salvamento | high | mitigate | Atualização sparse e contato tri-state; nenhum spread de documento. | closed |
| T-03-02-E | Tampering | Transação de salvamento | high | mitigate | Comando completo validado antes dos patches; mutation atômica. | closed |
| T-03-02-F | Tampering | Idempotência | high | mitigate | Somente patches com comparação de valor; sem inserção/remoção no save. | closed |
| T-03-02-G | Denial of Service | Rate limit | high | mitigate | Falhas esperadas retornam após consumo e buckets são verificados antes do consumo conjunto. | closed |
| T-03-02-H | Information Disclosure | Retornos públicos | high | mitigate | Views mínimas com validadores e testes de chaves proibidas. | closed |
| T-03-02-I | Tampering | Regra de prazo | medium | mitigate | Backend não depende da data; testes congelados antes/no/depois preservam o contrato. | closed |
| T-03-02-J | Elevation of Privilege | Hash de token | high | mitigate | Colisão é rejeitada antes do insert; token nunca é reatribuído. | closed |
| T-03-02-K | Denial of Service | Limite global de save | high | mitigate | Bucket global é verificado primeiro inclusive para token inválido/expirado. | closed |
| T-03-02-L | Elevation of Privilege | Helper de throttle | high | mitigate | Action interna, guard de desenvolvimento, token fornecido localmente e teardown explícito. | closed |
| T-03-03-A | Information Disclosure | Sessão do browser | high | mitigate | Token aleatório de 32 bytes somente na chave versionada de `sessionStorage`. | closed |
| T-03-03-B | Elevation of Privilege | Retry de colisão | high | mitigate | Token colidido é descartado; uma única nova tentativa com token distinto. | closed |
| T-03-03-C | Tampering | Modelo de rascunho | high | mitigate | Snapshot, draft e dirty separados; builder envia apenas mudanças sparse. | closed |
| T-03-03-D | Spoofing | Conteúdo/acesso | high | mitigate | Fluxo é somente desbloqueio leve; não cria conta, login ou admin. | closed |
| T-03-04-A | Elevation of Privilege | Restauração da capability | high | mitigate | Apenas o helper testado controla retry e só persiste após `unlocked`. | closed |
| T-03-04-B | Information Disclosure | Expiração/troca | high | mitigate | Capability, snapshot, draft e status são limpos antes de voltar ao gate; UAT 22 passou. | closed |
| T-03-04-C | Elevation of Privilege | Formulário familiar | high | mitigate | Frontend envia refs opacas sparse e backend aplica testes de IDOR/idempotência. | closed |
| T-03-04-D | Spoofing | Gate de telefone | high | mitigate | Nenhum registro público ou controle administrativo foi adicionado. | closed |
| T-03-04-E | Denial of Service | Retry de save | high | mitigate | Busy guard, retry inteiro, rascunho retido e idempotência do servidor. | closed |
| T-03-05-A | Information Disclosure | UI expirada | high | mitigate | Dados escopados são removidos antes do gate; helper expirado validado no UAT. | closed |
| T-03-05-B | Tampering | Descarte de rascunho | high | mitigate | Diálogo nativo exige ação destrutiva explícita e devolve o foco. | closed |
| T-03-05-C | Elevation of Privilege | Fixtures UAT | high | mitigate | Helpers internos, guard/seed de desenvolvimento, telefones sintéticos e scan de superfície. | closed |
| T-03-05-D | Tampering | Relógio de prazo | high | mitigate | Override existe somente em DEV e não altera autorização do backend; UAT 23 passou. | closed |
| T-03-05-E | Denial of Service | Throttle/rede | high | mitigate | Preparação determinística 30/31, retry genérico e rascunho preservado; UAT 21/24 passou. | closed |
| T-03-05-F | Denial of Service | Acessibilidade/responsividade | high | mitigate | Semântica nativa, foco/live regions, breakpoints, zoom e movimento reduzido validados. | closed |
| T-03-05-G | Spoofing | Tom e controles | high | mitigate | Copy neutra para pendente/negativa e ausência de linguagem de conta/admin. | closed |

*Status: open · closed · open — below high threshold (non-blocking)*

---

## Accepted Risks Log

No accepted risks.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-24 | 34 | 34 | 0 | Codex — ASVS L1 artifact/code/test review |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-24
