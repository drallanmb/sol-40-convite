# Phase 7: Endurecimento & Lançamento - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-25
**Phase:** 7-Endurecimento & Lançamento
**Areas discussed:** Domínio e momento do lançamento, Testes em celulares reais, Lista real de convidados, Critério de aprovação e contingência

---

## Domínio e momento do lançamento

| Decision | Options considered | Selected |
|----------|--------------------|----------|
| Host canônico | Redirecionar apex para `www`; servir ambos; delegar | `www` canônico, apex redirecionado ✓ |
| Momento de publicar | Imediatamente após gate; URL Vercel temporária; delegar | Publicar após gate ✓ |
| Divulgação sem lista | Site público, convite retido; divulgar já; delegar | Reter o envio do convite até revisar a lista ✓ |
| Execução operacional | Codex conduz sessões; guia manual; delegar | Codex conduz Vercel/Cloudflare ✓ |

**User's choice:** `https://www.sol40.com.br` é canônico; o domínio pode ficar
público depois do gate, mas o convite só é enviado depois da lista.

**Notes:** A consulta DNS mostrou que o domínio já usa os nameservers
Cloudflare `ainsley` e `cody`, mas ainda não publica registros de apex/`www`.
O repositório está no GitHub e ainda não possui vínculo local `.vercel`.

---

## Testes em celulares reais

| Decision | Options considered | Selected |
|----------|--------------------|----------|
| Ordem | Smoke publicado seguido por aparelhos; esperar aparelhos; delegar | Smoke primeiro, aparelhos conforme disponíveis ✓ |
| Cobertura | Jornada completa; dividir por plataforma; ponto específico; delegar | Jornada pública completa ✓ |
| Tratamento de falhas | Gravidade; corrigir tudo; esperar matriz; delegar | Corrigir por gravidade ✓ |
| Gate de publicação | Exigir aparelhos; navegadores principais; sem mínimo | Não bloquear lançamento ✓ |

**User's choice:** lançar antes dos testes físicos e manter esses testes
marcados para execução posterior.

**Notes:** Fluxos críticos encontrados depois do lançamento devem ser
corrigidos imediatamente; problemas somente visuais podem ser priorizados.

---

## Lista real de convidados

| Decision | Options considered | Selected |
|----------|--------------------|----------|
| Entrada em massa | Upload com prévia; texto colado; ambos; delegar | Upload CSV com prévia ✓ |
| Estrutura | Pessoa por linha; família por linha; delegar | Pessoa por linha ✓ |
| Presença inicial | Todos pendentes; coluna opcional; delegar | Todos pendentes ✓ |
| Erros | Bloquear tudo; importar válidos; sobrescrever; delegar | Importar válidos e relatar inválidos ✓ |

**User's choice:** CSV com `familia`, `telefone` e `convidado`, uma pessoa por
linha; manter também a entrada manual família por família.

**Notes:** A lista ainda não está em mãos. O importador precisa oferecer
template, prévia e relatório detalhado. Conflitos não sobrescrevem famílias
existentes automaticamente.

---

## Critério de aprovação e contingência

| Decision | Options considered | Selected |
|----------|--------------------|----------|
| Gate | Gate técnico curto; somente build; delegar | Gate técnico curto ✓ |
| Pós-deploy | Smoke imediato + propagação; apenas imediato; apenas tardio; delegar | Duas conferências ✓ |
| Regressão | Rollback; corrigir sobre atual; delegar por incidente | Rollback para versão saudável ✓ |
| Proteção de dados | Ponto de recuperação; sem backup; delegar | Ponto de recuperação/exportação ✓ |

**User's choice:** publicar com um gate curto, corrigir incidentes com o site
no ar e voltar à última versão saudável quando uma atualização piorar
produção.

**Notes:** Antes da primeira importação real, deve existir uma recuperação ou
exportação verificável.

---

## Claude's Discretion

- Mecânica exata de Vercel, Cloudflare, DNS, SSL e redirect.
- Parser, encoding, UX da prévia e formato visual do relatório CSV.
- Formato da evidência de smoke e da matriz viva de dispositivos.
- Ajustes de rate limit somente quando sustentados por teste/evidência.

## Deferred Ideas

- Telão, QR das mesas e Instagram/Apify permanecem no milestone v2.
