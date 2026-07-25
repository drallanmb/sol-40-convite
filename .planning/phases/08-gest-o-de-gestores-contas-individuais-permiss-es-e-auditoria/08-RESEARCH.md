# Phase 8: Gestão de Gestores — Research

**Researched:** 2026-07-25  
**Domain:** contas administrativas próprias, senha, ativação/redefinição por
capability, RBAC, sessões revogáveis, auditoria e migração sem downtime em
Convex  
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Contas usam e-mail; o proprietário cria gestores no `/admin` e compartilha
  manualmente links de ativação/redefinição de uso único com TTL de 72 horas.
- Há exatamente três papéis fixos: `owner`, `manager` e `seller`. Só existe um
  proprietário; a conta proprietária não pode ser desativada, excluída ou
  rebaixada.
- Proprietário acessa as quatro áreas, Gestores e Auditoria. Gestor acessa as
  quatro áreas operacionais. Vendedora acessa somente Presentes.
- Toda autorização é backend. Esconder navegação no React não autoriza nada.
- Sessão absoluta de sete dias, sem renovação. Múltiplos aparelhos são
  permitidos, identificados e revogáveis.
- Usuário vê/revoga as próprias sessões; proprietário vê/revoga todas. Troca
  voluntária de senha mantém só a sessão corrente; redefinição revoga todas.
- Desativar preserva conta/autoria, revoga sessões e links e bloqueia login.
  Reativar exige novo link.
- O bootstrap único usa a senha-mestra para criar/ativar Allan. Na ativação,
  todas as sessões compartilhadas são revogadas. Depois disso, a senha-mestra
  serve somente à recuperação isolada do proprietário.
- Vanessa confirma uma compra apenas depois do pagamento, informa
  presenteador e observação opcional, pode corrigir sem reabrir e pode desfazer
  quando a garrafa realmente voltar a ficar disponível.
- A projeção pública mantém “Já escolhido com carinho”, nunca expõe
  presenteador/observação e não ganha checkout, reserva ou dados de cobrança.
- Auditoria cobre alterações administrativas e eventos de segurança, guarda
  campos alterados antes/depois, omite segredos, é visível só ao proprietário
  e expira automaticamente após 120 dias.
- Proprietário/Gestores entram em Visão geral; Vendedora entra em Presentes.
  A navegação contém somente destinos permitidos. Minha conta reúne perfil,
  senha, sessões e logout.

### Deferred / Out of Scope

- Contas de convidados, OAuth, MFA e envio automático de e-mail/SMS/WhatsApp.
- Papéis personalizados, permissões individuais e segundo proprietário.
- Checkout, reserva, captura de pagamento, entrega ou sistema de pedidos.
- Telão, QR de mesas e Instagram/Apify.
</user_constraints>

<phase_requirements>
## Phase Requirements

A Phase 8 foi adicionada depois da matriz original de requisitos, portanto não
possui IDs novos em `REQUIREMENTS.md`. O plano deve derivar cobertura
verificável de D-01–D-38 de `08-CONTEXT.md`, sem reinterpretar os requisitos
validados ADMIN-01–ADMIN-06. A senha compartilhada deixa de ser o login normal,
mas privacidade pré-auth, quatro áreas operacionais, reatividade e invariantes
das fases 4/6 continuam contratos.
</phase_requirements>

## Summary

Esta fase deve evoluir a autenticação própria existente, não trocar toda a
aplicação para Convex Auth. Convex Auth é atualmente beta e introduziria outro
modelo de usuário/sessão, provider e provider React para uma equipe fixa de
quatro pessoas. A base já tem o núcleo adequado: capability aleatória de 32
bytes no cliente, apenas `SHA-256(token)` no banco, expiração absoluta,
revogação por deleção, gate fail-closed, limpeza cross-tab e autorização em
todas as portas Convex. O menor risco é associar a sessão a uma conta ativa e
fazer a guarda devolver o ator e papel.

A exceção é senha de usuário. O `SHA-256` constante usado hoje compara um
segredo forte guardado em environment e não é armazenamento de senha de
usuário. Senhas escolhidas por pessoas precisam de KDF lenta com salt. A
recomendação é `crypto.scrypt` do Node em actions `"use node"`, com salt
aleatório de pelo menos 16 bytes, formato versionado que inclui os parâmetros e
comparação com `timingSafeEqual`. Use inicialmente os parâmetros mínimos
OWASP (`N=2^17`, `r=8`, `p=1`) e calibre no deployment real; não reduza sem
evidência. Como actions não são transacionais e não acessam `ctx.db`, cada
fluxo de credencial deve fazer no máximo uma leitura interna agrupada e uma
mutation interna final que revalida versão/estado e grava tudo atomicamente.

O schema deve acrescentar contas, links one-time, configuração de bootstrap e
auditoria; `adminSessions.accountId` começa opcional para que linhas legadas
continuem válidas durante a implantação. A ativação do proprietário vira uma
barreira global: grava `legacyDisabledAt` e a guarda passa a negar qualquer
sessão sem `accountId` imediatamente, mesmo antes da limpeza física. Isso evita
depender de apagar um conjunto sem teto na transação crítica e permite rollout
aditivo sem downtime.

**Primary recommendation:** planejar em seis cortes verificáveis: (1) modelo,
KDF e guarda RBAC; (2) contas/links/bootstrap e migração; (3) login individual,
Minha conta e sessões; (4) navegação por papel e autorização completa das APIs;
(5) operação de Presentes com autoria; (6) auditoria, retenção e validação
integrada. O bootstrap/recuperação mestra deve continuar uma superfície
separada das rotas e queries operacionais.

## Current Codebase Findings

### Reuse directly

- `adminSessions` já persiste apenas `tokenHash`, `createdAt`, `expiresAt` e
  possui índices por hash/expiração.
- `adminSecurity.ts` valida a capability canônica de 32 bytes, faz hash com
  Web Crypto e resolve exatamente uma sessão ativa. Estenda essa guarda; não
  crie guardas concorrentes por domínio.
- `adminAuth.ts` já implementa rate-limit, collision check, TTL de sete dias,
  agendamento de expiração e logout idempotente.
- `Admin.tsx` + `adminSession.ts` já formam uma máquina fail-closed, revalidam
  no servidor, ignoram expiry local como autorização, limpam estado sensível e
  coordenam abas por `storage`.
- `AdminShell.tsx` só monta dados depois do gate e possui rotas/bottom nav,
  foco pós-navegação e tratamento central de `unauthorized`.
- Todas as APIs operacionais (`adminOverview`, `adminRsvps`, `adminPosts`,
  `adminWines`) passam por `requireAdminSession`.
- `adminWines`/`wineOperations` já oferecem CAS por `expectedUpdatedAt`,
  transição atômica `available ↔ gifted` e projeção pública sem `giftedBy`.
- `convex-test`, Vitest e Playwright já estão instalados. A suíte atual tem
  matrizes de sessão inválida, concorrência ABA, reatividade pública e limpeza
  de dados sensíveis que devem ser preservadas.
- O projeto já usa internal mutations paginadas/agendadas e cron diário como
  fallback de lifecycle; a auditoria pode seguir o mesmo padrão.

### Gaps and coupling to account for

- `adminSessions` não identifica conta, aparelho, papel nem versão de
  credencial.
- `adminAuth.login` é mutation síncrona de senha-mestra e o rate-limit atual é
  somente global (`10/15 min`). Login por e-mail requer também bucket por
  conta/e-mail normalizado, sem revelar se a conta existe.
- `getSessionStatus` retorna somente expiry; o shell precisa de uma projeção
  mínima do ator (`id`, nome, papel) para roteamento e identidade.
- O shell sempre executa `adminOverview.get`. Isso vazaria/negaria a Vanessa e
  deve virar bootstrap de sessão/perfil neutro; a query de overview só pode
  montar para owner/manager.
- Itens e ícones de navegação são hoje uma lista global de quatro destinos.
  Gestores/Auditoria/Minha conta exigem rotas canônicas e seleção por papel,
  sem apertar seis itens na bottom bar.
- Todos os writers administrativos existentes precisam emitir auditoria na
  mesma transação do write. Acrescentar auditoria apenas nas novas telas
  deixaria RSVP/moderação/presentes incompletos.
- `wines` não possui `giftNote`; `markGifted` não recebe observação e não existe
  edição de atribuição sem transição de status.
- O storage key é `sol40:admin-session:v1`. A forma persistida pode continuar
  token + hint de expiração; identidade/papel devem continuar autoritativos no
  servidor, não ser confiados ao localStorage.

## Standard Stack

| Library/API | Version/status | Use |
|---|---:|---|
| Convex | 1.42.3 instalada | schema, índices, queries reativas, mutations atômicas, actions Node e scheduler |
| Node `crypto` | runtime Node 20+ suportado pelo Convex | `scrypt`, `randomBytes`, `timingSafeEqual` em arquivo `"use node"` |
| `@convex-dev/rate-limiter` | 0.3.2 instalada | buckets global e por conta para login/recuperação |
| React / React Router | 19.2.8 / 7.18.1 | gate, rotas por papel, Minha conta, gestores e auditoria |
| Vitest / convex-test | 4.1.10 / 0.0.54 | modelo, guards, mutations e fluxos |
| Playwright + axe | 1.62.0 / 4.12.1 | navegação, privacidade, foco, responsividade e acessibilidade |

**New production dependencies:** nenhuma obrigatória. O `crypto.scrypt` nativo
evita adotar uma biblioteca de KDF não testada no runtime Convex.

### Why not Convex Auth in this phase

- A documentação oficial marca Convex Auth como beta.
- A aplicação já possui sessão opaca compatível com os contratos fechados de
  sete dias, revogação individual e limpeza cross-tab.
- Não há signup público, e-mail automático, social login ou MFA para justificar
  a migração.
- Uma troca de provider alteraria simultaneamente provider React, schema,
  sessão, autorização e recuperação, ampliando o blast radius sem benefício
  de produto.

Reavaliar um provedor gerenciado apenas se MFA/passkeys ou envio autônomo de
recuperação entrarem em escopo futuro.

## Recommended Data Model

Os nomes são sugestões; as invariantes são obrigatórias.

```ts
adminAccounts: {
  email: string,             // canônico: trim + lower case
  displayName: string,
  role: "owner" | "manager" | "seller",
  state: "pending" | "active" | "disabled",
  passwordHash?: string,     // envelope scrypt versionado; nunca retorna
  credentialVersion: number,
  createdAt: number,
  updatedAt: number,
  activatedAt?: number,
  disabledAt?: number,
}
  .index("by_email", ["email"])
  .index("by_role", ["role"])

adminAccessLinks: {
  accountId: Id<"adminAccounts">,
  purpose: "activation" | "reset",
  tokenHash: string,
  createdAt: number,
  expiresAt: number,
  consumedAt?: number,
  revokedAt?: number,
}
  .index("by_token_hash", ["tokenHash"])
  .index("by_account", ["accountId"])
  .index("by_expires_at", ["expiresAt"])

adminAuthConfig: {
  key: "primary",
  ownerAccountId?: Id<"adminAccounts">,
  legacyDisabledAt?: number,
  bootstrapCompletedAt?: number,
}
  .index("by_key", ["key"])

adminSessions: {
  tokenHash: string,
  accountId?: Id<"adminAccounts">, // ausente = sessão legada
  credentialVersion?: number,
  deviceLabel?: string,
  createdAt: number,
  expiresAt: number,
}
  .index("by_token_hash", ["tokenHash"])
  .index("by_account", ["accountId"])
  .index("by_expires_at", ["expiresAt"])

adminAuditEvents: {
  actorKind: "account" | "legacy" | "system" | "anonymous",
  actorAccountId?: Id<"adminAccounts">,
  actorName?: string,        // snapshot preserva autoria após rename/e-mail
  actorRole?: "owner" | "manager" | "seller",
  subjectAccountId?: Id<"adminAccounts">,
  area: "auth" | "accounts" | "sessions" | "rsvps" | "moderation" | "gifts",
  action: string,            // vocabulário fechado no modelo
  targetType?: string,
  targetId?: string,
  targetLabel?: string,
  changes: Array<{ field: string, before?: AuditValue, after?: AuditValue }>,
  occurredAt: number,
  expiresAt: number,         // occurredAt + 120 dias
}
  .index("by_occurred_at", ["occurredAt"])
  .index("by_actor_occurred_at", ["actorAccountId", "occurredAt"])
  .index("by_area_occurred_at", ["area", "occurredAt"])
  .index("by_action_occurred_at", ["action", "occurredAt"])
  .index("by_expires_at", ["expiresAt"])
```

Use `v.optional` no primeiro deploy para campos adicionados a tabelas
existentes. Convex valida também documentos já gravados; a orientação oficial
para produção é adicionar opcional, fazer backfill/migração e só então tornar
obrigatório. `accountId` pode permanecer opcional enquanto sessões legadas
existirem.

### Account invariants

- `email` normalizado é único; use `.unique()`/`.take(2)` e retorne conflito
  explícito. Preserve o casing apenas se houver necessidade visual; login usa o
  valor canônico.
- `pending` e `disabled` não têm sessão válida. `active` exige
  `passwordHash`.
- Só uma mutation de bootstrap pode criar `role:"owner"`. Todas as demais
  mutations rejeitam criar/promover/rebaixar/desativar/excluir owner.
- Alterar o e-mail owner é self-service, exige sessão owner + verificação da
  senha atual e CAS de `credentialVersion`.
- Desativação é um único commit: muda state/version, revoga todos os links,
  invalida sessões logicamente e grava auditoria. A autoria histórica nunca
  depende de join obrigatório com uma conta ativa.

### Link invariants

- Token opaco aleatório de 32 bytes, base64url sem padding, só hash no banco.
- Um token resolve exatamente um registro, uma conta e um purpose.
- Validade é `now < expiresAt`; boundary `now === expiresAt` falha.
- Regenerar revoga todos os links pendentes daquela conta/purpose antes de
  inserir o novo.
- Consumir, definir a senha, ativar/redefinir a conta, revogar sessões e
  registrar auditoria acontecem na mesma mutation final com precondições.
- A página pode consultar apenas um envelope mínimo
  `valid/invalid/expired/used`; não retorna e-mail, estado ou papel antes de um
  token válido.
- Nunca persistir URL completa ou token em auditoria, logs, analytics,
  localStorage ou referrer. A página de ativação deve usar HTTPS e
  `Referrer-Policy: no-referrer`.

## Password and Credential Architecture

### Password policy

- Mínimo de 15 caracteres por ser autenticação de fator único; máximo de pelo
  menos 64 (recomendado 128 para limitar custo/DoS).
- Aceitar espaços e Unicode, aplicar NFC antes do hash e contar code points;
  nunca truncar silenciosamente.
- Não exigir maiúscula/número/símbolo e não forçar troca periódica.
- Bloquear uma lista local curta de senhas comuns/contextuais
  (`sol40`, e-mail/nome, sequências conhecidas). Consulta externa de breach não
  é requisito desta fase.
- Confirmar a nova senha na UI, permitir colar e oferecer
  `autocomplete="new-password"`/`current-password"`.

### Hash format

Use um envelope autoexplicativo, por exemplo:

```text
$scrypt$v=1$ln=17,r=8,p=1$<salt-base64url>$<hash-base64url>
```

Regras:

- salt aleatório único de pelo menos 16 bytes;
- derived key de 32 bytes;
- `N=131072`, `r=8`, `p=1`, `maxmem` explicitamente acima de
  `128*N*r` (por exemplo 256 MiB) dentro do limite de 512 MiB da action Node;
- parser estrito com allowlist de versão/parâmetros para evitar hashes
  maliciosos que provoquem custo descontrolado;
- `timingSafeEqual` apenas depois de confirmar buffers do mesmo tamanho;
- função `needsRehash` para atualização futura de parâmetros no próximo login.

Calibre o tempo em Preview/Production e registre a evidência. `convex-test` não
reproduz limites/runtime reais, portanto um smoke real da action é obrigatório.

### Node action + transactional finalizer

Actions Node são necessárias para `crypto.scrypt`, mas não são atômicas. Use o
seguinte padrão:

```text
public action
  -> uma internal mutation/query agrupada lê snapshot e consome rate-limit
  -> scrypt/compare no Node (dummy hash se conta inexiste/inativa)
  -> uma internal mutation final:
       relê conta/sessão/link
       verifica state + credentialVersion + expected ids/hashes
       aplica todos os writes/revogações/auditoria atomicamente
```

Não faça uma sequência de várias `runMutation` independentes para escrever
senha, consumir link e revogar sessões. Convex documenta que cada chamada é
uma transação separada. A mutation final deve aceitar e comparar uma versão
esperada; nunca confiar somente no snapshot lido antes do KDF.

Para login:

1. normalizar e-mail e validar shapes antes do KDF;
2. consumir dois buckets independentes: global e por e-mail canônico;
3. retornar hash real somente à action interna ou hash dummy equivalente;
4. executar sempre um scrypt, inclusive para e-mail ausente/inativo;
5. `finishLogin` revalida conta ativa e `credentialVersion`, insere a sessão,
   agenda expiry e grava `login_succeeded`; em falha, grava evento genérico
   sem revelar existência;
6. resposta pública única `invalid_credentials` para e-mail/senha/conta
   desativada; `rate_limited` não identifica bucket.

O token de sessão continua gerado por CSPRNG no navegador, como hoje, e a
mutation verifica formato/collision. Alternativamente a action Node pode
gerá-lo e devolvê-lo uma vez, mas isso aumenta o tratamento de retry/orphan sem
ganho relevante.

## Authorization Architecture

### Central guard

Evolua `requireAdminSession` para retornar:

```ts
type AdminPrincipal = {
  session: Doc<"adminSessions">
  account: Pick<Doc<"adminAccounts">, "_id" | "displayName" | "email" | "role">
}
```

Para sessão individual, a guarda:

1. valida/hash token e exige uma única sessão;
2. checa boundary absoluto;
3. busca conta associada;
4. exige `state === "active"`;
5. exige `session.credentialVersion === account.credentialVersion`.

Essa versão dá revogação O(1): aumentar `credentialVersion` invalida todas as
sessões imediatamente, mesmo se a limpeza física for paginada. Revogação de
uma sessão continua deletando só sua linha.

Durante a transição, sessão sem `accountId` só autoriza se
`legacyDisabledAt` estiver ausente. Ela recebe ator sintético `legacy`, nunca
papel owner persistido. Depois da ativação, a mesma guarda falha antes de ler
dados operacionais.

Sobre a guarda, exponha helpers explícitos:

```ts
requireAnyAdmin(principal)       // gifts
requireOperational(principal)   // owner | manager
requireOwner(principal)         // accounts | audit | global sessions
requireSelfOrOwner(principal, accountId)
```

### Permission matrix

| Capability | Owner | Manager | Seller |
|---|:---:|:---:|:---:|
| Overview | ✓ | ✓ | — |
| Guests/RSVP | ✓ | ✓ | — |
| Moderation | ✓ | ✓ | — |
| Gifts list/mark/edit/unmark | ✓ | ✓ | ✓ |
| Own profile/password/sessions | ✓ | ✓ | ✓ |
| Accounts, reset/reactivate/disable | ✓ | — | — |
| All sessions | ✓ | — | — |
| Audit | ✓ | — | — |
| Master recovery | separate secret surface, owner recovery only |

Teste a matriz em **cada função pública**, não só nos helpers. O risco principal
é uma função antiga continuar usando “qualquer sessão” quando deveria exigir
owner/manager.

## Session and Revocation Design

- Mantenha capability aleatória de 32 bytes e expiry agendada atual.
- `deviceLabel` é apresentação, não fator de segurança. Aceite texto curto
  derivado no cliente de browser/OS (“Safari em iPhone”), saneado e limitado.
  Não crie fingerprint, não guarde IP e não atualize `lastSeenAt` em toda
  query.
- A lista de sessões retorna ID, label, createdAt, expiresAt e `isCurrent`;
  nunca retorna token/hash. `isCurrent` é calculado no backend comparando a
  sessão resolvida.
- Revogar uma sessão exige self-or-owner e impede confundir IDs de outra
  conta. Revogar a sessão atual produz imediatamente `unauthorized` no gate.
- Troca voluntária: action verifica senha atual; finalizer aumenta
  `credentialVersion`, grava novo hash e **patcha a sessão atual** com a nova
  versão; todas as demais falham imediatamente e são apagadas em lote.
- Reset/disable: aumenta `credentialVersion`, não preserva sessão alguma.
- Reativação: mantém autoria/ID, muda para `pending`, invalida material antigo
  e cria novo link de ativação; só volta a `active` no consumo.
- Logout continua idempotente. Expiry física continua por scheduled mutation
  com `expectedExpiresAt`.

Não interprete user-agent como aparelho único: dois logins do mesmo celular
são duas sessões, que é a semântica revogável correta.

## Safe Migration from Shared Password

### Rollout sequence

1. **Deploy aditivo:** novas tabelas, campos opcionais e guarda dual. Login
   legado e sessões existentes continuam funcionando. Nenhuma rota antiga
   começa a depender de conta ainda inexistente.
2. **Publicar bootstrap isolado:** autenticado pela senha-mestra, cria
   `adminAuthConfig` + owner `pending` + link de 72h idempotentemente. Não cria
   Soraya/Guga/Vanessa ainda e não expõe dados operacionais nessa superfície.
3. **Ativar Allan:** finalizer consome o link, grava scrypt, ativa owner,
   incrementa versão e grava `legacyDisabledAt`/`bootstrapCompletedAt` no mesmo
   commit. A partir desse commit toda sessão legada falha na guarda.
4. **Limpar legado:** apagar sessões sem conta em lotes; a segurança não
   depende desse sweep. O login normal já mostra e-mail/senha e a senha-mestra
   só aparece na URL/superfície de recuperação.
5. **Criar contas iniciais:** owner cria Soraya/Guga/Vanessa pelo painel e
   compartilha os links. Não seedar hashes/senhas.
6. **Endurecer schema posteriormente:** somente depois que não existirem
   sessões legadas, tornar campos obrigatórios se trouxer benefício. Não é
   necessário para concluir a fase.

### Bootstrap idempotency and races

- `adminAuthConfig.by_key("primary").unique()` é a fonte de verdade.
- Se duas abas chamarem bootstrap, uma única mutation transacional cria owner;
  a outra recebe o mesmo estado, nunca um segundo owner.
- Regenerar link retorna apenas o novo segredo daquela chamada e revoga o
  anterior; não há endpoint que recupere token já gerado.
- Depois de `bootstrapCompletedAt`, senha-mestra jamais chama login normal nem
  qualquer query operacional.

### Master recovery

Uma rota separada (por exemplo `/admin/recuperar-proprietario`) aceita somente
a senha-mestra e um token aleatório novo. A mutation/action:

- rate-limita globalmente;
- resolve owner por `adminAuthConfig.ownerAccountId`, nunca por e-mail enviado;
- aumenta `credentialVersion`, revoga links anteriores, cria link reset de
  72h e grava auditoria `master_recovery_started`;
- não emite sessão, não retorna dados da festa e não aceita accountId alvo.

Assim o e-mail owner pode mudar sem quebrar recuperação e a senha-mestra não
vira uma identidade paralela.

## Gifts Operation and Public Privacy

Acrescente `giftNote?: string` à tabela `wines` e à projeção administrativa,
nunca a `publicWineValidator`.

Transições:

- `available -> gifted`: exige `giftedBy`, aceita `giftNote`, grava
  `giftedAt=Date.now()` e autor via audit.
- `gifted -> gifted`: endpoint de edição separado, altera somente
  `giftedBy/giftNote/updatedAt`; preserva `giftedAt` e status.
- `gifted -> available`: limpa `giftedBy`, `giftNote` e `giftedAt` juntos.

Todos usam `expectedUpdatedAt`; auditoria e patch acontecem na mesma mutation.
O helper `readWineGiftState` precisa aceitar/validar a observação sem tornar
obrigatória. Defina limite curto (por exemplo 500 caracteres) e trate como
texto, sem dados de cobrança. O conteúdo público continua baseado apenas em
`status`; testes devem provar que nome, nota, ator e horário não aparecem em
`listCatalog/listFeatured`.

## Audit Architecture

### Write path

Crie um helper `appendAuditEvent(ctx, principal, event)` usado dentro da mesma
mutation do domínio. Ele:

- deriva ator da guarda, nunca de args do cliente;
- aplica allowlist de `area/action/fields`;
- tira snapshots mínimos de nome/papel para preservar legibilidade;
- serializa apenas valores escalares limitados;
- omite `password`, `passwordHash`, `token`, `tokenHash`, URL de ativação,
  headers e dados de pagamento;
- mascara campos classificados como sensíveis quando aparecerem (por exemplo,
  e-mail/telefone em eventos que não precisam do valor completo);
- grava `expiresAt = occurredAt + 120 dias` e agenda deleção idempotente no
  mesmo commit.

Para create/delete, represente cada campo permitido como
`undefined/null -> valor` ou `valor -> undefined/null`. Para eventos sem diff
(`login_succeeded`, logout, sessão revogada), `changes` pode ser vazio e
`targetLabel` dá contexto.

### Event vocabulary

- `auth`: login success/failure/rate-limited, activation, password
  change/reset, master recovery.
- `sessions`: logout, self revoke, owner revoke, account-wide revoke.
- `accounts`: create, link regenerate/revoke, disable, reactivate, email/name
  change.
- `rsvps`: family/guest create/update/delete/import.
- `moderation`: transition/undo.
- `gifts`: confirm/edit/reopen.

Leituras, busca, filtros e navegação não entram.

### Query and retention

Use paginação por cursor, mais recente primeiro, e limite de período. Para cada
filtro principal, selecione o índice adequado (`actor`, `area`, `action`); os
demais filtros podem ser aplicados dentro do intervalo já limitado. Não faça
`collect()` de todo o histórico.

Cada evento agenda `expireAuditEvent(id, expectedExpiresAt)`; scheduled
mutations são duráveis e exatamente-once segundo Convex. Adicione também cron
diário com sweep paginado por `by_expires_at` como recuperação de registros
históricos/órfãos. A guarda de leitura também deve excluir `expiresAt <= now`,
logo atraso de limpeza nunca prolonga visibilidade. Deletar auditoria por
retenção não gera outro evento.

## Frontend and Routing

Rotas sugeridas:

```text
/admin                         -> destino padrão por papel
/admin/visao
/admin/convidados
/admin/moderacao
/admin/presentes
/admin/gestores                owner
/admin/auditoria               owner
/admin/minha-conta             todos
/admin/ativar?token=...        pública, token-scoped
/admin/redefinir?token=...     pública, token-scoped
/admin/configurar              bootstrap master, antes da ativação
/admin/recuperar-proprietario  master recovery, depois da ativação
```

- A query neutra de sessão/perfil decide papel antes de montar o shell.
- `ADMIN_NAV_ITEMS` passa a declarar `roles`; o servidor continua a fonte de
  autorização.
- Seller não chama overview para obter badges. Seu destino/fallback é
  Presentes.
- URLs proibidas são redirecionadas para destino permitido, mas a chamada
  direta à função Convex também retorna `forbidden`/`unauthorized`.
- Diferencie `unauthorized` (sessão inválida: desmontar tudo) de `forbidden`
  (sessão válida, papel insuficiente: navegar para destino seguro).
- No mobile, preserve as quatro áreas operacionais para Gestores. Gestores,
  Auditoria e Minha conta ficam em menu utilitário; Vanessa tem uma barra
  estreita de Presentes, não quatro itens vazios.
- Nome/papel vêm do status backend e aparecem no shell; e-mail só em Minha
  conta.
- Tokens de ativação/reset não devem sobreviver em localStorage. Após ler,
  mantenha em memória e remova da URL com `history.replaceState` quando seguro.

## Common Pitfalls

### Using fast SHA-256 for user passwords

O helper atual é adequado para comparar `ADMIN_PASSWORD` vindo do environment,
não para hashes roubáveis do banco. Persistir `SHA-256(password)` tornaria
ataque offline barato.

### Trusting role cached in the session or browser

Se papel/estado mudar, sessões devem perder capacidade imediatamente. Leia a
conta ativa na guarda e compare versão; role no client serve só à apresentação.

### Splitting security writes across Node action calls

Consumir link, mudar hash, revogar sessões e auditar em mutations separadas
permite estados parciais/races. Uma única finalizer mutation revalida snapshot
e comita tudo.

### Physically deleting every session as the only revocation

Loops sem teto podem exceder limites. `credentialVersion` e
`legacyDisabledAt` dão revogação lógica instantânea; deleção em lote é higiene.

### Auditing outside the domain mutation

Uma segunda chamada pode falhar e deixar mudança sem evento, ou evento sem
mudança. Auditoria é parte da transação de negócio.

### Returning detailed login/link errors

“E-mail inexistente”, “conta desativada” e “link já usado” facilitam enumeração.
Use resposta pública genérica e detalhe apenas na auditoria owner.

### Treating device metadata as identity

User-Agent é controlável e muda; serve para label, não para bloquear sessão.
Evite fingerprint/IP persistente por privacidade.

### Breaking the public wine projection

Adicionar `giftNote`/ator ao documento não autoriza retorná-los. Mantenha
validators/projections públicas explícitas e testes negativos.

## Validation Architecture

### Test layers

| Layer | Tool | Purpose |
|---|---|---|
| Pure model | Vitest | e-mail/NFC, password policy, token/hash envelope, permission matrix, diffs/redaction, device labels |
| Convex backend | `convex-test` | schema, guards, state machines, CAS, revogação, auditoria atômica, privacy |
| Node crypto | Vitest Node + smoke deployment | scrypt vectors, parser, timing-safe compare, parâmetros e runtime/memory real |
| React/state | Vitest jsdom | reducer de sessão, destinos por papel, URL sanitization, cross-tab e limpeza |
| Browser | Playwright + axe | fluxos completos, deep links, forbidden redirects, mobile nav, foco e privacidade pré-auth |
| Deployment smoke | Preview Convex/Vercel | action Node real, scheduler, reatividade/revogação e bootstrap idempotente |

`convex-test` não implementa cron e não reproduz limites/built-ins do runtime
Convex. Chame internal cleanup manualmente nos testes e mantenha um smoke real
para scrypt/scheduler.

### Nyquist requirement-to-test map

Cada comportamento deve ter pelo menos uma verificação automatizada no mesmo
plano que o implementa; não concentrar toda validação no final.

| Contract | Minimum automated evidence |
|---|---|
| E-mail unique/canonical | variações de caixa/espaço colidem; erro não enumera |
| Password storage | hash contém salt/parâmetros, nunca plaintext; senha correta/incorreta; parser rejeita custo abusivo |
| Link 72h one-time | válido em `N-1`, inválido em `N`; replay falha; regeneração invalida anterior; token não aparece em rows/audit |
| Bootstrap singleton | duas chamadas concorrentes resultam em um owner/config; antes da ativação legado funciona |
| Legacy cutoff | no commit de ativação todas as sessões sem conta falham, mesmo ainda persistidas |
| Master isolation | recovery não retorna/consulta dados operacionais e só pode atingir `ownerAccountId` |
| Session 7d | boundary absoluto preservado; nenhuma consulta renova expiry |
| Multi-session | duas sessões coexistem/listam; self revoke e owner revoke atingem somente alvo |
| Password change/reset | self change preserva só atual; owner/master reset preserva zero; versões antigas falham |
| Disable/reactivate | disable bloqueia login e links/sessões; autoria permanece; reativação exige novo link |
| Owner invariant | delete/disable/re-role owner falham sem write/audit falso |
| RBAC | tabela de cada endpoint × owner/manager/seller/invalid; dados proibidos nunca aparecem |
| Route policy | seller inicia e retorna a Presentes; URL proibida redireciona sem montar query proibida |
| Gifts | confirm/edit/reopen mantêm CAS; edição preserva status/giftedAt; público omite nome/nota/ator |
| Audit atomicity | write válido e evento aparecem juntos; conflito/forbidden não cria evento de sucesso |
| Audit redaction | nenhum evento contém password/token/hash/link; before/after somente allowlist |
| Audit filters | ordem desc, paginação sem duplicata, pessoa/área/ação/período |
| Retention 120d | `N-1` visível, `N` invisível; delete idempotente; sweep bounded limpa órfãos |
| Fail-closed UI | revogação desmonta dados e limpa storage/rascunhos; resultado async tardio não restaura estado |

### Backend authorization matrix

Crie uma helper de teste que insere uma conta/sessão por papel e execute todas
as funções públicas:

```text
overview:       owner ✓ manager ✓ seller forbidden invalid unauthorized
rsvps:          owner ✓ manager ✓ seller forbidden invalid unauthorized
moderation:     owner ✓ manager ✓ seller forbidden invalid unauthorized
gifts:          owner ✓ manager ✓ seller ✓         invalid unauthorized
accounts/audit: owner ✓ manager forbidden seller forbidden invalid unauthorized
self account:   owner ✓ manager ✓ seller ✓ (somente próprio)
```

Para endpoints de leitura, sem autorização a resposta não pode conter contagem,
ID, e-mail, presenteador ou indicação de existência. Para writers, compare
snapshot de todas as tabelas relevantes antes/depois.

### Concurrency/adversarial cases

- Dois consumos simultâneos do mesmo link: exatamente um ativa/reseta.
- Login termina depois de disable/password change: finalizer rejeita versão
  velha e não emite sessão.
- Troca de senha em duas abas: só uma versão vence; nenhuma preserva sessão
  errada.
- Owner regenera link enquanto link antigo está aberto: submit antigo falha.
- Seller edita vinho que outra sessão reabriu: CAS retorna conflito e não
  sobrescreve/audita sucesso.
- Revogação da sessão atual enquanto query está em voo: reducer sequence impede
  restauração tardia.
- Cleanup agendado roda depois de deleção manual: idempotente.
- Evento de auditoria expira enquanto página está aberta: query reativa o
  remove.

### Manual/Preview checks

1. Medir p50/p95 de scrypt correto e incorreto no runtime Node do Preview e
   confirmar que o limite de login continua utilizável.
2. Executar bootstrap duas vezes e verificar que nunca cria segundo owner nem
   reexibe token antigo.
3. Abrir legado e conta nova em browsers distintos; ativar Allan e observar
   legado cair sem refresh manual.
4. Login Vanessa em viewport mobile: nenhuma chamada/dado de overview,
   convidados ou moderação; entrada direta em Presentes.
5. Compartilhar link por copy/paste, abrir em janela privada, definir senha,
   voltar ao URL e confirmar replay inválido/URL sanitizada.
6. Confirmar vinho como Vanessa e observar catálogo público mudar para “Já
   escolhido com carinho”; corrigir nota/nome sem reabrir.
7. Trocar senha e conferir lista de aparelhos; reset owner e conferir zero
   sessões.
8. Rodar axe nas telas Login, Ativação, Gestores, Minha conta, Presentes e
   Auditoria; validar foco de dialogs/redirects e targets de 44 px.

### Suggested verification commands

```bash
npm test
npm run build
npm run test:browser
npx convex dev --once
```

Para o smoke real, use deployment de desenvolvimento/Preview, nunca Production
com contas reais. Não grave tokens, senhas ou links nos artefatos de teste.

## Planning Implications

### Recommended plan boundaries

1. **08-01 — Model, crypto and guards:** tabelas/validators, scrypt action
   helpers, conta/principal, role matrix e testes Wave 0.
2. **08-02 — Bootstrap, links and migration:** config singleton, activation/
   reset, legacy cutoff, master recovery e cleanup.
3. **08-03 — Individual login and account sessions:** new gate/login, status
   com principal, Minha conta, troca de senha e gerenciamento de sessões.
4. **08-04 — Role-aware operations and shell:** trocar guardas de todas as
   APIs, rotas/nav/destinos por papel, Gestores owner-only.
5. **08-05 — Seller gifts workflow:** observação, edição sem reopen, copy
   operacional e privacy regression.
6. **08-06 — Audit and retention:** helper atômico em todos os writers,
   página/filtros/paginação, scheduled expiry + cron sweep e testes integrados.
7. **08-07 — End-to-end hardening/gap closure if needed:** Playwright, axe,
   smoke real Node/scheduler e migração Preview.

O planner pode combinar cortes pequenos, mas não deve colocar hashing, migração
e retrofit de auditoria de todos os writers numa única tarefa.

### Ordering constraints

- Schema/guard/KDF precedem qualquer UI.
- Bootstrap deve ser seguro antes de remover o login compartilhado.
- Guardas RBAC devem estar completos antes de liberar a conta Vanessa.
- O schema/endpoint de Presentes deve existir antes da UI seller.
- O helper de auditoria deve ser integrado no mesmo plano de cada conjunto de
  writers ou num retrofit explícito com matriz completa.
- Retenção e paginação precisam nascer com auditoria, não como otimização
  posterior.

## Sources

### Primary / official

- [Convex Authentication overview](https://docs.convex.dev/auth/overview) —
  opções de auth e status beta de Convex Auth.
- [Convex runtimes](https://docs.convex.dev/functions/runtimes) — Web Crypto
  no runtime padrão e Node somente em actions.
- [Convex Actions](https://docs.convex.dev/functions/actions) — acesso indireto
  ao banco, transações separadas e recomendação de agrupar operações.
- [Convex Mutations](https://docs.convex.dev/functions/mutation-functions) —
  leitura consistente e commit atômico.
- [Convex Internal Functions](https://docs.convex.dev/functions/internal-functions)
  — superfície interna para finalizers chamados por actions.
- [Convex safe production changes](https://docs.convex.dev/production/overview)
  — adicionar campo opcional, migrar e depois tornar obrigatório.
- [Convex indexes](https://docs.convex.dev/database/reading-data/indexes/) —
  ranges, ordenação e necessidade de limitar scans.
- [Convex pagination](https://docs.convex.dev/database/pagination) — paginação
  reativa por cursor.
- [Convex scheduled functions](https://docs.convex.dev/scheduling/scheduled-functions)
  — agendamento atômico em mutations e execução exactly-once de mutations.
- [Convex convex-test](https://docs.convex.dev/testing/convex-test) — harness e
  limitações de runtime/crons.
- [Node.js Crypto](https://nodejs.org/api/crypto.html) — `scrypt`, salt,
  parâmetros, `randomBytes` e `timingSafeEqual`.
- [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html) —
  política de senha de fator único, Unicode/NFC, blocklist e throttling.
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
  — KDF lenta, salt e parâmetros mínimos de scrypt.
- [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
  — tokens aleatórios, ligados à conta, armazenados com segurança, one-time e
  expirados.
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
  — entropy, conteúdo opaco, invalidation server-side e timeout absoluto.
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
  — mensagens genéricas, password policy e throttling.
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
  — eventos de auth/sessão e exclusão de segredos dos logs.

## Confidence Assessment

| Area | Confidence | Reason |
|---|---|---|
| Existing code integration | HIGH | canonical refs e implementações/testes atuais inspecionados |
| Convex schema/migration/transactions | HIGH | documentação oficial e padrões já usados no projeto |
| Password hashing | HIGH | Node API + OWASP/NIST; parâmetros ainda exigem benchmark real |
| RBAC/session revocation | HIGH | modelo simples, fixed roles e guard central |
| Audit/retention | HIGH | scheduler/index/pagination oficiais; volume do evento é baixo |
| Exact UX composition | MEDIUM | copy/layout permanecem discricionários e serão definidos no plano |

## Open Questions for Planning (non-blocking)

- Escolher limites finais de `displayName`, `deviceLabel` e `giftNote` (sugestão:
  120/120/500).
- Definir pequeno blocklist local/contextual de senha e sua mensagem de erro.
- Confirmar em Preview o tempo de `scrypt N=2^17` e `maxmem`; o benchmark pode
  exigir ajuste para cima ou, com justificativa registrada, para configuração
  ainda compatível com a política adotada.
- Escolher se eventos de login inválido mostram e-mail totalmente mascarado ou
  apenas `targetAccountId` quando resolvido; nunca expor essa distinção ao
  chamador.

---

*Phase: 08-Gestão de Gestores*  
*Research completed: 2026-07-25*
