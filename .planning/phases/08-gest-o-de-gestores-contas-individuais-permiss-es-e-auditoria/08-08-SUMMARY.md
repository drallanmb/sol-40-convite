---
phase: 08-gest-o-de-gestores-contas-individuais-permiss-es-e-auditoria
plan: "08"
status: complete
completed: 2026-07-26
gap_closure: true
---

# Plano 08-08 — Hardening dos links administrativos

## Resultado

Os seis gaps de segurança e concorrência do backend foram fechados:

- links novos usam fragmento, com `Referrer-Policy: no-referrer` no documento
  inicial e na resposta da Vercel;
- emitir reset ou recuperação remove a senha anterior, incrementa
  `credentialVersion` e revoga sessões no mesmo commit;
- geração e invalidação usam CAS por `updatedAt`, impedindo dois sucessos para
  a mesma versão;
- tokens desconhecidos falham em uma leitura barata; capabilities válidas
  consomem limites global e por `tokenHash` antes do scrypt;
- status público e consumo compartilham as mesmas invariantes autoritativas;
- cada link agenda deleção idempotente no TTL, atualizando assinaturas
  reativas, e um sweep diário paginado remove órfãos.

Também foi removido o caminho interno de criação que contornava as invariantes
do fluxo público. Falha ao inserir um link não deixa mudanças parciais na conta
ou nas sessões.

## Evidência

- `npx convex codegen`
- `npm test`: 36 arquivos e 637 testes aprovados
- `npm run build`
- `npx playwright test`: 120 jornadas aprovadas em Chromium/WebKit, desktop e
  viewport mobile de 320 px

Os testes reproduzem a corrida de geração, a senha antiga entre emissão e
consumo, rollback de falha, status com versão obsoleta, rate limit antes do KDF,
resistência a esgotamento global por tokens aleatórios e retenção de links.

## Operação

Qualquer link que tenha sido compartilhado em query string antes desta
correção deve ser tratado como capability exposta: invalidar o link da conta e
gerar outro depois do deploy. Tokens reais não são reproduzidos neste
documento nem nas evidências.

## Deploy de produção

O commit `f13d6f9` foi publicado pelo pipeline Vercel/Convex em 2026-07-26.
O deployment `dpl_ABioaETffe7JeEkExbgTcrrHGAYh` ficou `Ready`; o domínio
`www.sol40.com.br` respondeu `200` em `/admin/ativar` com
`Referrer-Policy: no-referrer` e a meta estática equivalente.
