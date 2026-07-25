# Phase 07 — Runbook de rollback

Rollback é composto por camadas. **Rollback Vercel não reverte Convex**:
funções, schema, environment variables e dados continuam no estado atual até
uma ação explícita na camada correspondente.

## Registro de alvos saudáveis

| Camada | Ambiente | Commit/deployment saudável | Verificado em | Evidência | Estado |
|---|---|---|---|---|---|
| Frontend Vercel | Preview | pending | pending | pending | pending |
| Frontend Vercel | Production | pending | pending | pending | pending |
| Convex functions/schema | Preview | pending | pending | pending | pending |
| Convex functions/schema | Production | pending | pending | pending | pending |
| Env names-only | Production | `ADMIN_PASSWORD` esperado | pending | nomes somente | pending |
| Backup de dados/storage | Production | timestamp + checksum fora do git | pending | metadados somente | pending |

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
3. Fazer redeploy do commit saudável ao deployment Convex Production.
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

