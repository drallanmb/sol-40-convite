# Phase 07 — Runbook de rollback

Rollback é composto por camadas. **Rollback Vercel não reverte Convex**:
funções, schema, environment variables e dados continuam no estado atual até
uma ação explícita na camada correspondente.

## Registro de alvos saudáveis

| Camada | Ambiente | Commit/deployment saudável | Verificado em | Evidência | Estado |
|---|---|---|---|---|---|
| Frontend Vercel | Preview | commit `3d7aa1c`; `dpl_ESX56bbFXwVLAF6KonicutRm3rzB` | 2026-07-25 09:39 -03:00 | 40/40 browser no `.vercel.app` | saudável |
| Frontend Vercel | Production atual | commit `3d7aa1c`; `dpl_EqoaJyVxbBrcmWHmHegcYRAGFqDS` | 2026-07-25 10:14 -03:00 | no-op compatível; rollback/restore; 40/40 browser, jornadas em leitura e login/logout | saudável e promovido |
| Frontend Vercel | Production anterior | commit `3d7aa1c`; `dpl_55PBruCBvfwrpN7y6WdGk2JpHKnY` | 2026-07-25 10:10 -03:00 | Instant Rollback real e rotas públicas/admin 200 | saudável e elegível |
| Convex functions/schema | Preview | `wooden-hound-372`; commit `3d7aa1c` | 2026-07-25 09:39 -03:00 | log Vercel + deployment presente no projeto correto | saudável |
| Convex functions/schema | Production | `necessary-coyote-763`; commit `3d7aa1c` | 2026-07-25 09:54 -03:00 | bundle no alvo correto; catálogo 37/37, repetição 0/37 e funções atuais sem erro | saudável |
| Env names-only | Production | `ADMIN_PASSWORD` | 2026-07-25 09:54 -03:00 | nome presente e login/logout funcional sem captura do valor | saudável |
| Backup de dados/storage | Production | `20260725T122803Z`; SHA-256 `65ec820bbd06fcb213cb80784719b76994fb081b0aa87480b5de4fb112d89af1` | revalidado 2026-07-25 10:12 -03:00 | ZIP `3897` bytes fora do git, storage incluído e checksum igual; conteúdo não aberto | disponível; nenhum restore |

Os deployments `dpl_A1D9bmdwHbQxNAd6v7r25mSpms2X` (Preview) e
`dpl_8KU4YX7BFRCeVKg236WjFk1uSsGf` (Production) **não são alvos de
rollback**: ambos foram substituídos depois que o log revelou vínculo com o
projeto Convex incorreto `convex-crimson-cloud`.

O alvo Production saudável é composto e deve ser tratado em camadas:

- frontend pretendido: Vercel `dpl_EqoaJyVxbBrcmWHmHegcYRAGFqDS`;
- frontend anterior elegível: Vercel `dpl_55PBruCBvfwrpN7y6WdGk2JpHKnY`;
- functions/schema: commit `3d7aa1c` no Convex `necessary-coyote-763`;
- environment: inventário names-only contendo `ADMIN_PASSWORD`;
- dados/storage: backup `20260725T122803Z`, SHA-256
  `65ec820bbd06fcb213cb80784719b76994fb081b0aa87480b5de4fb112d89af1`.

Reassociar ou promover o frontend Vercel **não** reverte functions, schema,
environment variables, scheduled work, file storage ou linhas do Convex.

## Alvo de domínio publicado

- Vercel: `www.sol40.com.br` em Production e `sol40.com.br` como redirect
  permanente `308` para `www`.
- Cloudflare: apex e `www` como CNAME DNS-only para o alvo específico
  exibido pela Vercel; o apex é achatado em respostas A.
- Em `2026-07-25 10:13 -03:00`, dois resolvedores confirmaram NS/CNAME, TLS
  autorizado, `www` 200 e redirect preservando path/query.
- O domínio aponta ao frontend pretendido
  `dpl_EqoaJyVxbBrcmWHmHegcYRAGFqDS`; o release anterior
  `dpl_55PBruCBvfwrpN7y6WdGk2JpHKnY` permanece como alvo compatível.

## Matriz de incidente

| Falha | Resposta imediata | Recuperação | Verificação obrigatória |
|---|---|---|---|
| Frontend/layout/JS | Reassociar domínio ao deployment Vercel saudável | Corrigir e publicar novo deployment | Rotas, refresh, canonical, Convex linkage e smoke afetado |
| Function/schema Convex | Reduzir impacto público; manter frontend compatível | Redeploy do commit saudável no mesmo deployment Convex | Codegen/build, funções, login, RSVP, mural e logs |
| Env Convex/Vercel | Corrigir apenas o alvo/escopo afetado | Novo deploy quando a env é consumida no build | `npx convex env list --names-only --prod`, login e smoke |
| Importação identificável | Parar novas mutações e exportar antes de corrigir | Correção administrativa direcionada | Contagens/agregados e amostragem autorizada |
| Corrupção material de dados | Declarar P0, preservar evidência e gerar backup adicional | Restore do ZIP validado como última opção | Tabelas/storage, integridade, smoke completo e sign-off |

## Procedimento por camada

### Frontend Vercel

1. Confirmar que o problema é de frontend e identificar o deployment saudável.
2. Executar rollback/promote pelo mecanismo Vercel autorizado.
3. Registrar deployment anterior/novo e horário, sem secrets.
4. Reexecutar smoke no `.vercel.app` e domínio.

Esse passo não altera functions, schema, env ou dados Convex.

### Functions/schema Convex

1. Selecionar o commit saudável compatível com clientes já abertos.
2. Usar a Production Deploy Key somente no escopo Production autorizado.
3. Em checkout isolado do commit `3d7aa1c`, confirmar o alvo sanitizado
   `necessary-coyote-763` associado à chave e executar:

   ```bash
   npx convex deploy --cmd 'npm run build' \
     --message 'recover healthy commit 3d7aa1c'
   ```

   O `CONVEX_DEPLOY_KEY` deve vir do escopo Production autorizado e nunca ser
   impresso, salvo em `.env` ou passado como argumento.
4. Validar funções e logs antes de encerrar o incidente.

Mudanças Convex durante o lançamento devem ser aditivas e backward-compatible;
clientes antigos podem continuar abertos durante deploy/rollback.

### Environment variables

1. Confirmar deployment/escopo sem imprimir valores.
2. Para produção, verificar nomes com:

   ```bash
   npx convex env list --names-only --prod
   ```

3. Corrigir segredo de produção por entrada interativa/stdin, nunca argumento:

   ```bash
   npx convex env set --prod ADMIN_PASSWORD
   ```

4. Publicar novo build quando a variável é usada no build da Vercel.

Instant rollback não reconstrói envs nem reaplica valores antigos.

## Drill executado em 2026-07-25

1. A ausência de um segundo Production compatível foi resolvida com um
   redeploy no-op do release saudável. O novo
   `dpl_EqoaJyVxbBrcmWHmHegcYRAGFqDS` manteve commit `3d7aa1c` e Convex
   `necessary-coyote-763`, passou rotas, inspeção do bundle e 40/40 browser.
2. O painel confirmou esse novo deployment como Production atual. O Instant
   Rollback então reassociou apex, `www` e domínio Vercel ao anterior
   `dpl_55PBruCBvfwrpN7y6WdGk2JpHKnY`.
3. Rotas públicas e `/admin` responderam 200 no alvo anterior. O `Undo
   Rollback` promoveu novamente `dpl_EqoaJyVxbBrcmWHmHegcYRAGFqDS` e
   reativou a atribuição automática de domínios.
4. No release restaurado, dois resolvedores, TLS/redirect, jornadas
   públicas em leitura, privacidade pré-auth, login/logout, 40/40 browser,
   528/528 unitários, build e `git diff --check` passaram.
5. O movimento de aliases não alterou Convex functions/schema, env,
   scheduled work, storage ou linhas. A criação do no-op executou o build
   normal do mesmo commit contra o mesmo deployment, sem mudança de schema,
   env ou dados. Nenhum restore foi executado.

O caminho Convex foi verificado sem publicar: o commit existe, a configuração
de build está disponível e `npx convex env list --names-only --prod` contém
`ADMIN_PASSWORD`. Todas as operações de env documentadas usam `--prod`; o
deploy de functions é selecionado exclusivamente pela Production Deploy Key.

### Dados e storage

1. Antes da primeira lista real ou mudança material, gerar backup consistente
   incluindo storage quando aplicável.
2. Aguardar conclusão, baixar para local seguro fora do workspace/repositório
   e registrar somente timestamp/deployment/checksum.
3. Preferir correção direcionada quando os registros afetados são
   identificáveis.
4. Fazer restore global apenas após avaliação de impacto e validação do ZIP.
5. Nunca “testar restore” sobre produção.

## Severidade e encerramento

- **P0:** exposição, indisponibilidade de domínio ou perda/corrupção de dados —
  contenção/rollback imediato.
- **P1:** RSVP, WhatsApp, upload ou login impossível — correção imediata no ar.
- **P2:** fluxo degradado com workaround — priorizar e registrar.
- **P3:** diferença apenas visual — backlog.

Incidente só fecha depois de registrar causa, camada revertida, alvo saudável,
smoke pós-recuperação e ação preventiva.
