# Phase 8 — Runbook de validação Preview

Este runbook valida autenticação individual, RBAC, sessões, Presentes e
auditoria em um deployment Convex/Vercel isolado. Nunca execute os probes em
Production. Não salve senhas, tokens, links, hashes, screenshots autenticados
ou traces.

## 1. Pré-condições e trava de ambiente

1. Use um deployment com `CONVEX_DEPLOYMENT` iniciado por `preview:` ou `dev:`.
2. Confirme que `VERCEL_ENV` não é `production`.
3. Faça a verificação local, sem rede e sem writes:

   ```bash
   node scripts/phase8-preview-smoke.mjs --check-only
   ```

   A saída esperada é um JSON com `status:"ready"` e
   `writesAttempted:0`. Production deve encerrar com código diferente de zero
   antes de iniciar qualquer subprocesso.

4. Quando o Preview ainda não tiver as functions da branch, publique somente
   no deployment isolado com `npx convex dev --once`. Não edite
   `convex/_generated` manualmente.

## 2. Rollout aditivo

1. Faça backup do Preview e registre apenas o horário/status.
2. Publique o schema aditivo; sessões sem `accountId` continuam legadas.
3. Em `/admin/configurar`, use a senha-mestra para criar Allan
   (`allanmesquitab@gmail.com`) e copie o link uma única vez.
4. Em janela privada, abra o link, defina a senha e confirme que a URL perde o
   token.
5. A ativação deve gravar o cutoff e derrubar a sessão legada aberta no outro
   navegador sem refresh.
6. Como Allan, crie e compartilhe manualmente:

   - Soraya — `sorayathorsjo@outlook.com` — Gestora
   - Guga — `gugart@hotmail.com` — Gestor
   - Vanessa — `vanessa.alonso@mistral.com.br` — Vendedora

Não registre as senhas ou links usados.

## 3. Probes de runtime sanitizados

Depois do check-only e somente no Preview isolado:

```bash
node scripts/phase8-preview-smoke.mjs --run --confirm-preview
```

O script retorna apenas status, latências e contagens. Ele mede scrypt correto
e incorreto com valores internos descartáveis, verifica a forma do rollout e
executa o mesmo handler bounded do cleanup de auditoria. Qualquer probe falho
encerra com código diferente de zero sem imprimir stderr do Convex.

Registre apenas:

- p50/p95 de scrypt correto e incorreto;
- status do cutoff legado;
- contagens do sweep e confirmação do limite de 120 dias;
- `passed`/`failed` dos probes.

## 4. Verificações humanas obrigatórias

### Scrypt

Faça login correto e incorreto algumas vezes no Preview. Confirme que a UI
permanece utilizável e compare o comportamento com o p50/p95 sanitizado.

### Cutoff e sessões

Mantenha uma sessão legada e a ativação de Allan em navegadores separados.
Após ativar Allan, a sessão legada deve cair reativamente. Abra duas sessões
da conta individual, revogue uma e confirme que somente ela é encerrada.

### Link de uso único

Copie o link para uma janela privada, defina a senha e volte ao URL original.
O replay deve falhar e nenhum token pode permanecer na URL, histórico,
screenshot ou trace.

### Retenção e Presentes

Confirme o cleanup controlado e o limite de 120 dias. Entre como Vanessa:

1. A entrada deve ir direto a Presentes.
2. Nenhuma informação de Visão geral, Convidados ou Moderação pode aparecer.
3. Confirme uma compra com nome e observação; o catálogo público mostra
   “Já escolhido com carinho” sem revelar o presenteador.
4. Edite nome/observação sem reabrir e depois teste “tornar disponível”.

### Acessibilidade

Rode axe e navegue por teclado em Login, Ativação, Gestores, Minha conta,
Presentes e Auditoria. Confira foco após redirects/dialogs, ausência de scroll
horizontal em 320 px e alvos de pelo menos 44 px.

## 5. Cleanup e rollback

Os probes removem suas fixtures em `finally`; podem ser repetidos. Se houver
falha, interrompa o rollout, desative contas de teste não iniciais e invalide
links pendentes. Antes da ativação do owner, reverta apenas o frontend/functions
compatíveis com o schema aditivo. Depois do cutoff, não reabilite a
senha-mestra como login cotidiano: use a recuperação isolada do proprietário.
Nunca reverta dados restaurando uma identidade compartilhada paralela.
