# Phase 8: Gestão de Gestores — Pattern Mapping

**Mapped:** 2026-07-25  
**Inputs:** `08-CONTEXT.md`, `08-RESEARCH.md` e código atual  
**Purpose:** indicar ao planner onde a fase toca o repositório e quais padrões
existentes devem ser preservados. Este documento não define tarefas nem
implementa a solução.

## 1. Mapa provável de arquivos

Os nomes de novos módulos são sugestões coerentes com o repositório; o planner
pode agrupá-los de outra forma. Arquivos em `convex/_generated/` são produtos
do codegen e não devem ser editados manualmente.

### Backend — modificações certas

| Arquivo | Mudança provável | Padrão/razão |
|---|---|---|
| `convex/schema.ts` | Adicionar `adminAccounts`, `adminAccessLinks`, `adminAuthConfig`, `adminAuditEvents`; estender `adminSessions` com `accountId`, `credentialVersion` e `deviceLabel`; estender `wines` com `giftNote` | O schema atual centraliza todas as tabelas e índices. Campos adicionados a documentos existentes devem começar opcionais para rollout aditivo. |
| `convex/adminModel.ts` | Validadores e tipos compartilhados de papel, conta, principal, sessão, resultados de auth e TTLs de 72h/120d | O arquivo já concentra `ADMIN_SESSION_TTL_MS` e validators discriminados de login/status/logout. |
| `convex/adminSecurity.ts` | Evoluir `requireAdminSession` para resolver sessão + conta ativa + versão; aceitar legado antes do cutoff; helpers de papel/self-or-owner | Toda API administrativa já converge aqui, então não deve surgir uma segunda guarda independente. |
| `convex/adminAuth.ts` | Substituir o login normal por e-mail/senha; enriquecer status com principal; manter logout; expor fluxos públicos de ativação/reset/bootstrap/recovery por actions ou fachadas | É a porta pública atual de autenticação e o `Admin.tsx` já depende dela. |
| `convex/adminInternal.ts` | Finalizers transacionais, snapshots internos, expiração/purge de sessões e possivelmente links; preservar expiry idempotente | Já contém a mutation idempotente de expiração de sessão. Actions Node precisam terminar em uma única mutation interna. |
| `convex/adminRateLimits.ts` | Acrescentar bucket por e-mail/conta e buckets para bootstrap/master recovery, mantendo resultado público genérico | Hoje existe apenas `loginGlobal` fixo de 10/15 min. |
| `convex/adminOverview.ts` | Exigir `owner \| manager`; retornar `forbidden` separadamente de sessão inválida | Hoje qualquer sessão válida recebe todos os agregados. |
| `convex/adminRsvps.ts` | Exigir `owner \| manager` em todas as queries/mutations e emitir auditoria atômica em todos os writers | Há uma função local `authorize` que delega para a guarda central e sete writers já identificáveis. |
| `convex/adminPosts.ts` | Exigir `owner \| manager`; auditar transição e undo na mesma mutation | O módulo já centraliza a alteração em `applyModerationTransition`. |
| `convex/adminWines.ts` | Permitir os três papéis; aceitar nota; criar edição `gifted -> gifted`; auditar confirmar/editar/reabrir | É o único domínio operacional permitido à Vendedora. |
| `convex/wineModel.ts` | Validar/tipar `giftNote` e limite; manter `publicWineValidator` sem campos privados | Já separa explicitamente estado operacional e DTO público. |
| `convex/wineOperations.ts` | Invariantes da nota, edição sem reabrir, limpeza conjunta no reopen e CAS por `expectedUpdatedAt` | Já é o único helper transacional de `available ↔ gifted`. |
| `convex/crons.ts` | Registrar sweep diário paginado de auditoria expirada e, se adotado, higiene de sessões/links antigos | O cron atual usa refs internas tipadas e horários diários separados. |
| `convex/admin.test.ts` | Expandir fixtures para conta/sessão por papel e testar auth, migração, matriz RBAC, sessões, links e auditoria | É hoje a suíte integrada do domínio administrativo com `convex-test`. |
| `convex/adminTest.ts` | Acrescentar smokes internos e autocontidos para KDF/action, migração, lifecycle e scheduler no deployment real | O arquivo já contém smokes internos que criam, verificam e limpam seus próprios registros. |
| `convex/wines.test.ts` | Cobrir nota, edição sem mudar status/data, autoria/auditoria e regressão da projeção pública | A suíte já prova invariantes de presente e ausência de campos privados no JSON público. |

### Backend — novos módulos prováveis

| Arquivo sugerido | Responsabilidade provável | Análogo existente |
|---|---|---|
| `convex/adminPassword.ts` | Política/parser puros e tipos do envelope, sem `"use node"` | Pode ser importado com segurança por código Web-runtime e testes. |
| `convex/adminPasswordActions.ts` | Módulo `"use node"` exclusivo de action/internalAction com `scrypt`, salt e `timingSafeEqual` | Não há KDF humana hoje; `postImageDecoder.ts` demonstra a separação de runtime Node em action. |
| `convex/adminAccounts.ts` | API owner-only de listar/criar/desativar/reativar contas e gerar/regenerar links | `adminRsvps.ts` é o análogo de CRUD protegido com validators e respostas discriminadas. |
| `convex/adminAuthActions.ts` e `convex/adminAccessLinkActions.ts` | Módulos `"use node"` exclusivos de action/internalAction para login, ativação, reset, troca de senha e recuperação mestra; snapshots/finalizers ficam em módulos Web-runtime | `postInternal.validatePhoto` demonstra action orquestrando leitura e mutation final; a pesquisa exige reduzir writes de credencial a uma mutation final atômica. |
| `convex/adminAuditModel.ts` | Desde a Wave 1: vocabulário, redaction/diff e `appendAuditEvent`; `convex/adminAudit.ts` acrescenta query owner-only/filtros na Wave 6 | Writers novos nunca podem anteceder a primitiva atômica; paginação segue `rsvpInternal.ts`. |
| `convex/adminAuditInternal.ts` | Expiração idempotente e sweep paginado por `expiresAt` | `adminInternal.expireAdminSessionRecord` e `rsvpInternal` são os análogos diretos. |

Separar `adminAccounts`, actions Node exclusivas e auditoria evita transformar
`adminAuth.ts` em módulo `"use node"` incompatível com suas queries/mutations.
Finalizers e helpers importados por mutations permanecem sempre Web-runtime.

### Frontend — modificações certas

| Arquivo | Mudança provável | Padrão/razão |
|---|---|---|
| `src/routes/Admin.tsx` | Orquestrar login por e-mail/senha, status com principal, superfícies públicas token-scoped, bootstrap e recuperação mestra; continuar fail-closed | É a máquina de gate atual e só monta `AdminShell` após autenticação. |
| `src/lib/adminSession.ts` | Acrescentar principal/status à máquina, distinguir `forbidden` de `unauthorized`, manter sequência anti-resposta-tardia, storage e limpeza cross-tab | O reducer atual já é a fonte de verdade do lifecycle no navegador. |
| `src/lib/adminSession.test.ts` | Cobrir principal, destinos por papel, troca/reset/revogação e respostas tardias | A suíte já prova malformed storage, deadline, revogação e que login tardio não ressuscita sessão. |
| `src/components/admin/AdminLogin.tsx` | Adicionar e-mail, preservar `autocomplete`, foco de erro, copy genérica e estados busy | O formulário atual usa `Field`, `Card`, `Button`, `useId` e foco/select no erro. |
| `src/components/admin/AdminShell.tsx` | Consumir principal neutro; filtrar navegação/rotas por papel; não consultar overview para seller; identidade e menu Minha conta; fallback por papel | Hoje monta sempre `adminOverview.get` e quatro itens globais, que é o acoplamento principal a remover. |
| `src/content/admin.ts` | Novas rotas, papéis, metadados de navegação, canonicalização por papel, copy de contas/auditoria/minha conta | Hoje centraliza rotas, itens, filtros permitidos e destino canônico. |
| `src/content/admin.test.ts` | Atualizar contrato de rotas/nav e testar destinos/filtros por papel, incluindo seller → Presentes | A suíte hoje fixa exatamente quatro destinos e overview como fallback universal. |
| `src/components/admin/AdminGifts.tsx` | Nota opcional, estado “Compra confirmada”, diálogo de edição sem reopen, manter CAS/review/feedback | Já contém o fluxo completo de query reativa, pending por ID, modal, conflito e desfazer. |
| `src/lib/adminOperations.ts` | Possível extensão do reducer de diálogo de presente para nota/edição; reutilizar `usePendingOperations` nas telas novas | Já implementa exclusão mútua por alvo e proteção `isCurrent`/`isLatest`. |
| `src/components/admin/adminPendingOperations.test.ts` | Ajustar testes do diálogo/concorrência de presentes se o reducer for ampliado | A suíte atual cobre limpeza por `admin-sensitive-state-clear` e operações tardias. |
| `tests/release.spec.ts` | Atualizar headings/rotas anônimas e acrescentar privacidade, papel, deep link, mobile e axe dos novos fluxos | Já intercepta tráfego Convex e prova que anônimo não monta DOM/query protegida. |

### Frontend — novos módulos prováveis

| Arquivo sugerido | Responsabilidade provável | Análogo existente |
|---|---|---|
| `src/components/admin/AdminManagers.tsx` | Lista/CRUD de contas, links one-time mostrados somente na resposta da geração, desativação/reativação | `AdminGuests.tsx` combina lista reativa, formulários, concorrência, confirmação destrutiva e Toast. |
| `src/components/admin/AdminAudit.tsx` | Lista paginada newest-first, filtros, detalhes expansíveis | Filtros URL-canônicos de `AdminGuests`, `AdminModeration` e `AdminGifts`; cards e estados loading/error existentes. |
| `src/components/admin/AdminMyAccount.tsx` | Nome/e-mail/papel, troca de senha e sessões próprias | Reutiliza `Field`, `Button`, `AdminConfirmDialog`, `Toast` e o padrão de query protegida. |
| `src/components/admin/AdminActivation.tsx` | Consumir token em memória, definir/confirmar senha e sanitizar URL | Visualmente análogo a `AdminLogin`; semanticamente uma superfície pública token-scoped. |
| `src/components/admin/AdminPasswordReset.tsx` | Mesmo shell/form de ativação, purpose distinto | Compartilhável com ativação se os estados/copy permanecerem explícitos. |
| `src/components/admin/AdminBootstrap.tsx` | Configuração única autenticada pela senha-mestra antes do owner existir | Superfície isolada; não deve importar ou montar `AdminShell`. |
| `src/components/admin/AdminOwnerRecovery.tsx` | Recuperação mestra pós-bootstrap sem acesso a dados operacionais | Superfície isolada; mesma família visual do login, não uma seção administrativa. |
| `src/lib/adminRoutes.ts` ou extensão em `src/content/admin.ts` | Helpers puros de papel → rotas permitidas/destino padrão/canonicalização | `canonicalAdminDestination` atual já é puro e extensivamente testado. |

Componentes pequenos de formulário podem ser compartilhados entre ativação e
reset, mas as rotas e `purpose` não devem ser inferidos do cliente. O backend
valida o propósito do link.

## 2. Padrões concretos encontrados

### 2.1 Capability e sessão administrativa

O cliente gera uma capability de 32 bytes com
`crypto.getRandomValues`, codifica base64url sem padding e guarda somente:

```ts
{
  version: 1,
  token,
  expiresAt,
}
```

Referências:

- `src/lib/adminSession.ts:1-5, 97-118, 127-183`
- `convex/adminSecurity.ts:8-40`
- `convex/adminAuth.ts:69-94`

O banco persiste apenas `tokenHash`, `createdAt` e `expiresAt`
(`convex/schema.ts:47-53`). `hashAdminToken` usa SHA-256, apropriado porque o
token é aleatório forte. Esse mesmo helper não é apropriado para senha humana.

O boundary é absoluto:

```ts
export function isAdminSessionActive(expiresAt: number, now: number) {
  return now < expiresAt
}
```

(`convex/adminModel.ts:32-34`). Nenhuma query renova `expiresAt`. O login
agenda `expireAdminSession` exatamente em `expiresAt`, passando
`expectedExpiresAt` (`convex/adminAuth.ts:82-92`). A mutation de expiry relê a
linha e ignora retry/stale schedule (`convex/adminInternal.ts:5-33`).

**Implicação de padrão:** conta individual acrescenta identidade e versão à
sessão, mas preserva token opaco, TTL de sete dias, index por hash, expiry
agendada e resposta idempotente de logout.

### 2.2 Gate fail-closed no navegador

`Admin.tsx`:

1. lê o token local e começa em `checking`;
2. só chama `getSessionStatus` quando há token;
3. só monta `AdminShell` em `authenticated`/`logging-out`;
4. ao receber status inválido, deadline, logout ou evento cross-tab, dispara
   `admin-sensitive-state-clear` e remove o storage;
5. usa `sequence` para impedir que resultado async antigo restaure uma sessão.

Referências: `src/routes/Admin.tsx:21-101, 103-127, 129-189, 192-229` e
`src/lib/adminSession.ts:197-318`.

As telas operacionais escutam `admin-sensitive-state-clear` e limpam busca,
rascunhos, dialogs, feedback e comandos pendentes. Exemplo em
`AdminGifts.tsx:182-194`; o mesmo padrão aparece em Convidados, Importação e
Moderação.

**Implicação de padrão:** o principal retornado pelo status pode viver no
estado React autenticado, mas não deve ser persistido como autoridade. Toda
perda de autorização continua desmontando o shell e limpando estado sensível.

### 2.3 Respostas discriminadas e falha sem exceção para estados esperados

APIs administrativas retornam unions como:

```ts
{ kind: 'unauthorized' }
{ kind: 'not_found' }
{ kind: 'invalid', message }
{ kind: 'conflict', ...snapshotAtual }
{ kind: 'updated' | 'saved', ...resultado }
```

Referências:

- `convex/adminRsvps.ts:61-89`
- `convex/adminPosts.ts:7-31`
- `convex/adminWines.ts:16-41`
- `convex/adminModel.ts:6-30`

Erros de rede/exceções inesperadas são tratados no cliente; conflito,
credencial inválida, rate-limit, forbidden e not-found devem continuar como
resultados explícitos. A Phase 8 precisa acrescentar `forbidden` sem
confundi-lo com `unauthorized`: o primeiro redireciona uma sessão válida; o
segundo desmonta e limpa tudo.

### 2.4 Autorização hoje converge numa única guarda

Todos os módulos administrativos chamam `requireAdminSession` antes de ler ou
escrever:

- Overview: `convex/adminOverview.ts:20-31`
- RSVP: `convex/adminRsvps.ts:174-176`
- Moderação: `convex/adminPosts.ts:81-83`
- Presentes: `convex/adminWines.ts:68-70`

A guarda valida formato, busca no índice `by_token_hash` com `.take(2)`, exige
exatamente uma sessão e checa expiry (`convex/adminSecurity.ts:77-100`).

**Implicação de padrão:** evoluir a mesma guarda para devolver principal e
aplicar helpers `owner`, `operational`, `anyAdmin`, `selfOrOwner`. Não criar
uma autorização paralela nas novas APIs. Cada função pública antiga também
precisa trocar explicitamente a exigência genérica pela capacidade correta.

### 2.5 Rate-limit

`convex/adminRateLimits.ts` declara configuração pura exportada e instancia um
único `RateLimiter`. `adminAuth.login` consome o bucket antes de comparar a
senha e converte milissegundos em segundos inteiros para UI
(`convex/adminAuth.ts:41-67`).

**Implicação de padrão:** manter configuração testável e resultado público
uniforme, mas acrescentar bucket global + chave por e-mail normalizado. E-mail
inexistente, inativo e senha errada percorrem custo equivalente e retornam
`invalid_credentials`.

### 2.6 Action externa + finalizer transacional

Não há KDF Node hoje. O análogo de orquestração é
`postInternal.validatePhoto`:

```text
internalAction
  -> runQuery(snapshot)
  -> runAction(trabalho fora da transação)
  -> runMutation(finalizer)
```

Referência: `convex/postInternal.ts:129-189`. Os finalizers relêem a reserva e
confirmam estado/IDs antes de gravar (`convex/postInternal.ts:192-255`).

**Diferença obrigatória para credenciais:** `scrypt` roda em action
`"use node"`, mas consumo de link, hash novo, versão, sessões/links e auditoria
devem acontecer juntos em uma única mutation final. Essa mutation compara
`credentialVersion`, conta, link/purpose e snapshot esperados.

### 2.7 Concorrência otimista e feedback recuperável

Presentes usa:

```ts
expectedUpdatedAt
expectedStatus
```

e devolve o snapshot atual em conflito
(`convex/wineOperations.ts:49-84`, `convex/adminWines.ts:88-143`). Moderação
usa `expectedStatus + expectedRevision`; RSVP usa `expectedUpdatedAt`.

No frontend, `usePendingOperations`:

- bloqueia duas operações simultâneas no mesmo ID;
- oferece `isCurrent()` para ignorar efeitos após clear/logout;
- oferece `isLatest()` para impedir que uma resposta mais antiga substitua o
  feedback mais novo.

Referência: `src/lib/adminOperations.ts:3-87`.

**Implicação de padrão:** CRUD de gestores, sessões, links e edição de vinho
devem carregar uma versão/`updatedAt` e retornar conflito explícito. Fluxos de
credencial usam `credentialVersion` como CAS.

### 2.8 Escritas multi-documento são atômicas no handler

Exemplos:

- RSVP adiciona/remove pessoa e atualiza a família na mesma mutation
  (`convex/adminRsvps.ts:500-625`);
- moderação faz patch, relê e retorna o snapshot na mesma mutation
  (`convex/adminPosts.ts:130-151`);
- presente faz transição e relê em `transitionWineGiftState`
  (`convex/wineOperations.ts:65-84`).

**Implicação de padrão:** `appendAuditEvent` é chamado dentro do mesmo handler
de domínio. Não deve haver uma segunda mutation do cliente “para auditar”.

### 2.9 Sweep paginado, agendado e idempotente

`rsvpInternal.ts` oferece o padrão mais próximo para retenção:

1. query por índice e cutoff;
2. `.order('asc').paginate({ cursor, numItems: 50 })`;
3. relê cada candidato antes de apagar;
4. agenda a próxima página com `runAfter(0, ref, { cursor, cutoff })`;
5. retorna `scanned`, `deleted`, `done` e `nextCursor`;
6. cron diário dispara a primeira página.

Referências: `convex/rsvpInternal.ts:244-300` e `convex/crons.ts:40-79`.

**Implicação de padrão:** auditoria deve ter exclusão individual agendada com
`expectedExpiresAt`, leitura que já exclui `expiresAt <= now`, e sweep diário
bounded como recuperação. A segurança/visibilidade não depende de a deleção
física ocorrer pontualmente.

### 2.10 Projeções explícitas protegem dados privados

`convex/wines.ts` constrói manualmente o DTO público:

```ts
return {
  productCode,
  name,
  producer,
  description,
  tone,
  priceCents,
  category,
  palettePrimary,
  paletteSecondary,
  status,
}
```

Referências: `convex/wines.ts:13-31` e
`convex/wineModel.ts:32-43`. A suíte pública rejeita `_id`, `giftedBy`,
`giftedAt`, `updatedAt`, URLs internas e outros campos
(`convex/wines.test.ts`, bloco “wine public queries”).

**Implicação de padrão:** `giftNote`, autor da marcação e audit metadata entram
somente no DTO admin. `listCatalog`/`listFeatured` continuam baseados apenas no
status para exibir “Já escolhido com carinho”.

### 2.11 Layout, forms e dialogs administrativos

Convenções existentes:

- Tailwind mobile-first, painel em `bg-cream`, cards em `bg-card`, ação
  primária `plum`;
- `Field`, `Button`, `Card`, `Feedback` e `Toast` são o kit comum;
- formulários usam `useId`, `aria-describedby`, `aria-invalid`,
  `aria-busy`, autocomplete correto e foco no erro;
- dialogs usam `<dialog>.showModal()`, interceptam `cancel`, focam a ação
  segura e restauram foco;
- ação destrutiva importante pode exigir checkbox de confirmação em
  `AdminConfirmDialog`.

Referências:

- `src/components/admin/AdminLogin.tsx:19-97`
- `src/components/admin/AdminConfirmDialog.tsx:17-103`
- `src/components/admin/AdminGifts.tsx:51-135`

**Implicação de padrão:** Gestores, Minha conta, ativação/reset e auditoria
devem reutilizar o kit; desativar conta/revogar sessão usam confirmação
explícita. Links secretos precisam de UI de “copiar agora” e não podem ser
reconsultados depois.

### 2.12 Rotas e filtros canônicos

`src/content/admin.ts` é a fonte única para:

- paths;
- itens de navegação;
- labels/ícones/badges;
- allowlist de query params;
- canonicalização e fallback.

`AdminShell` usa `Routes`, `Navigate`, `Link` e foca
`#admin-page-title` após navegação (`AdminShell.tsx:109-136, 278-317`).

**Implicação de padrão:** declarar roles nos itens e funções puras de
`allowedNavItems`, `defaultDestination` e `canonicalDestination` por papel.
Seller não monta overview para conseguir badges. Rotas utilitárias
Gestores/Auditoria/Minha conta ficam no menu, preservando as quatro áreas na
bottom nav de owner/manager.

### 2.13 Testes como contrato

Padrões já estabelecidos:

- `convex-test(schema, import.meta.glob(...))` com registro do rate limiter;
- fixtures helpers para inserir sessão ativa e dados do domínio;
- limites exatos `N-1/N`;
- snapshots antes/depois para provar ausência de write em erro;
- concorrência e ABA;
- JSON negativo para provar que segredo não vazou;
- reducers puros em Vitest/jsdom;
- Playwright + axe + viewport 320px;
- interceptação de WebSocket no browser para provar ausência de query
  protegida antes da autenticação;
- smoke interno autocontido para diferenças do runtime real.

Referências:

- `convex/admin.test.ts:25-65, 94-225`
- `src/lib/adminSession.test.ts`
- `src/components/admin/adminPendingOperations.test.ts`
- `tests/release.spec.ts:31-123`
- `convex/adminTest.ts:31-153`

## 3. Mapeamento por papel

### Proprietário (`owner`)

**Fluxo desejado:** Visão geral + quatro áreas operacionais + Gestores +
Auditoria + Minha conta; gestão global de sessões; única conta protegida.

**Análogos:**

- acesso operacional atual equivale ao comportamento de qualquer sessão
  válida em `adminOverview`, `adminRsvps`, `adminPosts`, `adminWines`;
- CRUD de entidades com confirmação e CAS: `AdminGuests.tsx` +
  `adminRsvps.ts`;
- ação destrutiva protegida: `AdminConfirmDialog`;
- sessão atual/status/logout: `adminAuth.ts` + `Admin.tsx`.

**Novas invariantes sem análogo pronto:** owner singleton vem de
`adminAuthConfig`, nunca de contagem eventual; conta owner não aceita disable,
delete ou role change; master recovery resolve `ownerAccountId`, não um e-mail
fornecido pelo cliente.

### Gestor (`manager`)

**Fluxo desejado:** mesmo comportamento operacional atual, sem Gestores,
Auditoria ou sessões de terceiros.

**Análogos:**

- todos os quatro módulos operacionais e seus componentes;
- overview/badges atuais;
- logout e limpeza cross-tab atuais.

**Ponto de retrofit:** cada endpoint RSVP/moderação/overview deve exigir
`owner | manager`; Presentes exige `owner | manager | seller`. Esconder links
em `AdminShell` não substitui essa matriz.

### Vendedora (`seller`)

**Fluxo desejado:** login → `/admin/presentes`; apenas Presentes e Minha conta;
shell “Vanessa · Vendedora”; nenhuma query de overview/RSVP/moderação.

**Análogos:**

- `AdminGifts.tsx` é quase toda a experiência operacional;
- `adminWines.listAdmin`, `markGifted`, `makeAvailable` são as portas;
- `giftStatusFromSearch` e canonicalização preservam deep links válidos.

**Mudanças localizadas:** nota opcional, ação separada de edição
`gifted -> gifted`, copy interna “Compra confirmada”, auditoria derivando ator
da sessão. A UI pública permanece intocada além de testes de regressão.

## 4. Mapeamento por fluxo

### 4.1 Bootstrap único do proprietário

```text
/admin/configurar
  -> senha-mestra + e-mail fixado/confirmado pelo usuário
  -> rate-limit
  -> mutation singleton lê/cria adminAuthConfig("primary")
  -> cria owner pending se ainda não existe
  -> revoga link anterior e grava novo tokenHash/72h
  -> devolve o token/link uma única vez
  -> Allan abre /admin/ativar#token=...
  -> action scrypt + finalizer atômico
  -> owner active + link consumed + legacyDisabledAt/bootstrapCompletedAt
  -> sessões legadas falham imediatamente na guarda
```

Análogos: rate-limit/login atual, capability hash atual, singleton transacional
por índice e finalizer de `postInternal`. O cutoff lógico é novo; a limpeza
física em lotes segue `rsvpInternal`.

### 4.2 Login individual

```text
AdminLogin(email, password, token, deviceLabel)
  -> normaliza/valida e-mail
  -> buckets global + e-mail
  -> snapshot interno devolve hash real ou dummy + version
  -> um scrypt sempre
  -> finalizer relê conta/state/version
  -> insere sessão(accountId, credentialVersion, label, 7d)
  -> agenda expiry + audit login_succeeded
  -> cliente armazena somente token + expiresAt
  -> status neutro retorna principal mínimo
```

Análogos: `adminAuth.login`, `generateAdminCapability`, reducer de sessão e
status query. A senha-mestra deixa esse fluxo após bootstrap.

### 4.3 Ativação/redefinição por link

```text
owner gera capability 32 bytes
  -> banco recebe somente hash, purpose, conta, timestamps
  -> URL é exibida uma vez
  -> página lê fragmento em memória e remove fragmento/query legada
  -> status público mínimo valid/invalid
  -> password + confirmação
  -> scrypt action
  -> finalizer revalida token/purpose/TTL/state/version
  -> consume link + hash/version/state + revogação + audit, tudo atômico
```

O boundary segue `now < expiresAt`; `now === expiresAt` falha. Regenerar revoga
links pendentes do mesmo propósito antes de inserir o novo. Nenhuma resposta
reflete token, URL, hash ou existência de conta.

### 4.4 Minha conta, senha e sessões

```text
status/principal autenticado
  -> query own profile
  -> query sessions da própria conta, isCurrent calculado no backend
  -> revoke(sessionId): self-or-owner
  -> change password:
       verifica senha atual via action
       incrementa credentialVersion
       patcha sessão atual para a nova version
       demais sessões falham imediatamente
```

Lista retorna apenas ID, label, criação, expiry e `isCurrent`; nunca
token/hash. Owner pode usar a mesma projeção com target account nas telas de
Gestores, sob `requireOwner`.

### 4.5 Desativação e reativação

```text
owner disable manager/seller
  -> CAS da conta
  -> state disabled + credentialVersion++
  -> revoga links e invalida sessões logicamente
  -> audit no mesmo commit

owner reactivate
  -> state pending + version/material anterior inválido
  -> novo link de activation 72h
  -> só consumo volta a active
```

O registro nunca é apagado; snapshots de ator no audit preservam leitura
mesmo após rename/disable.

### 4.6 Presentes

```text
listAdmin(any active admin role)
  -> DTO inclui giftedBy/giftNote/giftedAt/updatedAt

confirm(available -> gifted)
  -> giftedBy obrigatório + giftNote opcional
  -> giftedAt/ator automáticos
  -> CAS + patch + audit no mesmo commit

edit(gifted -> gifted)
  -> altera giftedBy/giftNote/updatedAt
  -> preserva status e giftedAt
  -> CAS + audit before/after

reopen(gifted -> available)
  -> limpa giftedBy/giftNote/giftedAt juntos
  -> CAS + audit

public listCatalog/listFeatured
  -> retorna somente DTO explícito
  -> status gifted produz “Já escolhido com carinho”
```

### 4.7 Auditoria

```text
domain mutation
  -> guard devolve principal
  -> valida/CAS
  -> write de domínio
  -> appendAuditEvent(ctx, principal, allowlisted diff)
  -> agenda expireAuditEvent(expectedExpiresAt)
  -> commit único

owner query
  -> índice adequado + range de período + newest-first + paginate
  -> filtros secundários no intervalo limitado
  -> omite eventos expiresAt <= now
```

O ator vem sempre da guarda. Login inválido pode usar ator
`anonymous/system`, sem revelar ao cliente se o e-mail existe. Redaction
precisa bloquear por estrutura e allowlist, não somente por substring:
password, hash, token, link/URL, headers e dados de pagamento não entram.

## 5. Inventário de writers que precisam de auditoria/RBAC

O retrofit não está completo se algum writer abaixo continuar apenas com
“qualquer sessão”.

| Área | Arquivo | Writers existentes |
|---|---|---|
| RSVP | `convex/adminRsvps.ts` | `createFamily`, `importFamilies`, `updateFamily`, `addGuest`, `updateGuest`, `removeGuest`, `removeFamily` |
| Moderação | `convex/adminPosts.ts` | `transitionPost`, `undoPost` |
| Presentes | `convex/adminWines.ts` | `markGifted`, `makeAvailable`; acrescentar edição sem reopen |
| Auth/sessões | `convex/adminAuth.ts` e novos módulos | login/logout, activation/reset/password change, revoke session, bootstrap/master recovery |
| Contas | novo `convex/adminAccounts.ts` provável | create, link regenerate/revoke, disable/reactivate, owner email/name |

Queries que precisam matriz explícita:

| Função | Owner | Manager | Seller |
|---|:---:|:---:|:---:|
| `adminOverview.get` | sim | sim | forbidden |
| `adminRsvps.listFamilies` | sim | sim | forbidden |
| `adminPosts.listByStatus` | sim | sim | forbidden |
| `adminWines.listAdmin` | sim | sim | sim |
| contas/auditoria/todas sessões | sim | forbidden | forbidden |
| perfil/sessões próprias | próprio | próprio | próprio |

## 6. Convenções que não devem ser quebradas

- TypeScript ESM, aspas simples e sem ponto-e-vírgula.
- Validators `v.*` explícitos também em `returns`; não retornar documentos
  brutos quando houver dados privados.
- Timestamps em milissegundos; boundaries estritos (`now < expiresAt`).
- Índices nomeados `by_<campos>`; usar `.take(2)`/`.unique()` para invariantes
  de unicidade e `.paginate()` para coleções sem teto.
- `updatedAt` monotônico/CAS para entidades editáveis.
- Segredos entram como capability aleatória, persistem somente em hash e não
  aparecem em audit/log/storage além do token de sessão já autorizado.
- O papel/estado autoritativo é relido da conta no backend; não confiar em
  role do localStorage ou argumento do cliente.
- Toda resposta de auth pública evita enumeração.
- Toda ação sensível limpa estado em logout/revogação.
- Alvos de toque de pelo menos 44 px, foco visível, AA e
  `prefers-reduced-motion`.
- Mudanças geradas em `convex/_generated/*` vêm de `npx convex dev --once`,
  nunca de patch manual.

## 7. Hotspots e acoplamentos a considerar no planejamento

1. **`AdminShell` consulta overview incondicionalmente.** Seller não pode
   montar essa query nem receber seus badges; o gate precisa obter principal
   de uma query neutra.
2. **O status atual retorna só expiry.** Nome/papel para shell e roteamento
   precisam vir do backend sem colocar e-mail no shell.
3. **O login atual é uma mutation Web-runtime.** Senha humana exige action
   Node; preservar o token gerado pelo navegador reduz mudanças no storage.
4. **Sessões legadas não têm conta.** `accountId`/version começam opcionais e
   a guarda dual depende de `legacyDisabledAt`.
5. **Auditoria atravessa todos os writers.** Criar apenas a página/tabela não
   atende o contexto; o evento deve fazer parte de cada transação.
6. **Imports RSVP criam múltiplas famílias.** O diff/evento precisa ser
   bounded e resumido, sem explodir tamanho de documento.
7. **Owner singleton e recuperação mestra.** A fonte é
   `adminAuthConfig.ownerAccountId`; nunca selecionar “primeira conta owner”
   nem aceitar target do cliente.
8. **Token em URL.** Ativação/reset devem sanitizar a URL e não persistir token
   em localStorage, analytics, audit ou referrer.
9. **`giftNote` amplia documento, não projeção pública.** Testes negativos são
   obrigatórios para `listCatalog` e `listFeatured`.
10. **Retenção não pode depender do cron.** Queries escondem expirados no
    boundary e scheduled delete/cron fazem higiene.
11. **Mudanças locais alheias já existem.** Arquivos visuais do convite e
    `Button.tsx` estão modificados no worktree; alterações da Phase 8 devem
    evitar sobrescrever trabalho não relacionado e inspecionar diff antes de
    tocar em componentes compartilhados.

## 8. Arquivos que provavelmente não precisam mudar

- `src/content/gifts.ts`: a copy pública “Já escolhido com carinho” já é
  canônica; somente teste de regressão deve confirmar sua preservação.
- `src/components/gifts/*`: renderizam por `status`; nenhum nome, nota ou ator
  deve chegar a esses componentes.
- `src/routes/Presentes.tsx`: consulta o catálogo público explícito e deve
  continuar alheia a contas administrativas.
- `src/components/ui/*`: o kit já cobre forms, cards, feedback, toast e
  confirmações. Só tocar se uma necessidade real não puder ser composta; há
  mudança alheia atual em `Button.tsx`.
- `src/App.tsx`: o wildcard `/admin/*` já encaminha todas as subrotas ao gate.
  Rotas token-scoped podem permanecer dentro de `Admin.tsx`; só mudar `App.tsx`
  se a implementação deliberadamente separar esses bundles.

---

*Pattern mapping completed for Phase 8. No implementation or plan was
created.*
