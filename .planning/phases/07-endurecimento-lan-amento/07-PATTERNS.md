# Phase 7 — Pattern Mapping

**Mapped:** 2026-07-25  
**Scope:** importação CSV, metadados e gate de qualidade, produção
Vercel/Convex, domínio Cloudflare e operação pós-lançamento  
**Sources:** `07-CONTEXT.md`, `07-RESEARCH.md`, codebase atual

## Mapping Principles

- A importação é uma nova entrada para o domínio RSVP existente, não um
  segundo modelo de convidados. O parser cliente prepara uma prévia; o
  backend repete validação, autorização e unicidade antes de escrever.
- `src/lib/phone.ts` e `src/lib/phone.test.ts` têm alterações do usuário.
  Consumir o contrato atual de `normalizePhone`; não editar, reverter nem
  absorver esses diffs na fase.
- Dados administrativos continuam abaixo do gate de sessão. O estado do CSV
  (arquivo, prévia, fila e relatório) também é sensível e deve reagir ao
  evento `admin-sensitive-state-clear`.
- “Sucesso parcial” acontece por grupo: linhas inválidas são excluídas na
  prévia, e grupos que conflitem com produção são ignorados pelo writer. Uma
  falha inesperada de transporte interrompe a fila e preserva o relatório já
  confirmado; não é tratada como linha inválida.
- Não introduzir `PUBLIC_ORIGIN`: a origem é fixa e a stack não consome essa
  variável. Canonical e Open Graph ficam absolutos em `index.html`.
- O rollback é composto: Vercel reverte o frontend; Convex exige redeploy do
  commit saudável; dados só voltam por restore quando houve corrupção e há
  backup validado.
- Artefatos de evidência não recebem senha, deploy key, token de sessão,
  dados reais de convidados, conteúdo do backup ou screenshots com segredos.
- Testes de browser/emulação são gate; a matriz física permanece marcada
  como pós-lançamento e não pode ser declarada executada por automação.

## Importação CSV — arquivos de aplicação

### `package.json` e `package-lock.json` — modify

**Role:** fixar o parser CSV e a infraestrutura de gate de browser/
acessibilidade, além de expor comandos não interativos de release.

**Data flow:** `AdminGuestImport` entrega um `File` ao Papa Parse no
navegador; Playwright inicia/visita o build servido e axe inspeciona cada
rota/estado.

**Closest analog:** as dependências têm versões exatas para código de
produção (`convex`, `react`, `jpeg-js`) e o script atual de teste é
deliberadamente não-watch:

```json
"scripts": {
  "build": "tsc -b && vite build",
  "test": "vitest run"
}
```

Padrão a seguir:

- `papaparse` em `dependencies` e os tipos correspondentes conforme a
  integração TypeScript escolhida; preservar pin exato como as dependências
  atuais.
- `@playwright/test` e `@axe-core/playwright` em `devDependencies`.
- adicionar `test:browser` e `test:release`; `test:release` encadeia suíte
  unitária, build e browser smoke sem watch.
- deixar o lockfile ser atualizado pelo gerenciador; não editar entradas à
  mão.

### `src/lib/guestCsv.ts` — create

**Role:** parser/normalizador puro, contrato da prévia e geração segura do
modelo baixável.

**Data flow:**

```text
File UTF-8/BOM
  -> Papa.parse (strings, header, delimiter autodetect)
  -> cabeçalhos/linhas com número de origem
  -> trim + whitespace collapse + normalizePhone
  -> conflitos e duplicatas
  -> ImportPreview { groups, ignored, totals }
  -> lotes normalizados para adminRsvps.importFamilies
```

**Closest analogs:**

- `src/lib/phone.ts`: união discriminada com resultado explícito
  `canonical | legacy-mobile | invalid`; usar `normalizedKey` para identidade
  e `phone` para persistência.
- `src/lib/adminSearch.ts`: transformação pura de coleções e tipos exportados
  fora de JSX.
- `src/lib/adminGuestDraft.ts`: reducer/DTO puro que preserva estado local
  diante de snapshots reativos.
- limites de `convex/rsvpModel.ts`: `RSVP_DISPLAY_NAME_MAX_LENGTH`,
  `RSVP_GUEST_NAME_MAX_LENGTH` e `MAX_RSVP_GUESTS`. Como `src/` já importa
  módulos puros de domínio compartilhado e `convex/adminRsvps.ts` importa
  `src/lib/phone`, manter uma única definição dos limites; não copiar números
  mágicos.

Contrato recomendado:

```ts
export type GuestImportIssue = {
  row: number
  code:
    | 'invalid_family'
    | 'invalid_phone'
    | 'invalid_guest'
    | 'duplicate_guest'
    | 'phone_family_conflict'
  detail: string
}

export type ValidFamilyGroup = {
  sourceRows: number[]
  displayName: string
  phone: string
  normalizedKey: string
  guests: Array<{ sourceRow: number; name: string }>
}

export type GuestImportPreview = {
  groups: ValidFamilyGroup[]
  ignored: GuestImportIssue[]
  totals: {
    sourceRows: number
    validRows: number
    ignoredRows: number
    families: number
    people: number
  }
}
```

Padrões concretos:

- Papa Parse com `header: true`, `delimiter: ''`,
  `skipEmptyLines: 'greedy'`, sem `dynamicTyping`.
- normalizar cabeçalhos apenas com BOM removido, `trim()` e lowercase; depois
  exigir exatamente `familia`, `telefone`, `convidado`, sem repetidos nem
  extras.
- contar o cabeçalho como linha 1 e usar o índice do registro, não quebras
  físicas dentro de campo quoted, para o relatório.
- limitar antes de parsear (1 MiB) e depois do parse (2.000 registros).
- agrupar por `normalizedKey + nome familiar normalizado`; preservar a
  primeira grafia válida para exibição.
- se um telefone lógico tiver nomes familiares incompatíveis, rejeitar os
  grupos desse telefone por inteiro.
- deduplicar pessoa dentro do grupo pela forma textual normalizada; a
  primeira linha vence e as demais entram em `ignored`.
- toda pessoa de saída é implicitamente `pending`; não aceitar coluna de
  presença nem produzir `respondedAt`.
- o modelo CSV usa BOM + cabeçalho para abrir corretamente no Excel, mas não
  contém registros que possam ser importados por engano.

### `src/lib/guestCsv.test.ts` — create

**Role:** fechar o contrato do arquivo antes de envolver React ou Convex.

**Data flow:** strings/arquivos sintéticos entram no parser e a asserção
observa grupos, linha original, códigos de erro e totais.

**Closest analog:** `src/lib/phone.test.ts`, que usa tabelas `it.each`,
helpers `expectCanonical`/`expectInvalid` e compara a união completa:

```ts
expect(normalizePhone(raw)).toEqual({ kind: 'invalid' })
```

Cobrir:

- BOM, CRLF, vírgula, ponto e vírgula, quotes e quebra dentro de célula;
- cabeçalho ausente, repetido, extra e ordem diferente;
- whitespace, tamanhos máximos e telefone legado/canônico com a mesma chave;
- agrupamento, duplicata de pessoa e conflito de nome familiar por telefone;
- linha parcialmente inválida sem perder outras pessoas válidas;
- números de linha e consistência dos totais;
- limite de arquivo/linhas e modelo baixável.

Não alterar os testes de telefone para acomodar o CSV; o importador deve
obedecer ao contrato que eles já protegem.

### `src/components/admin/AdminGuestImport.tsx` — create

**Role:** fluxo acessível selecionar → prévia → confirmação → importação em
lotes → relatório.

**Data flow:** `File` local → `guestCsv` → estado React de prévia → grupos em
lotes para `api.adminRsvps.importFamilies` → acumulação de resultados por
linha → relatório; `unauthorized` chama `onUnauthorized`.

**Closest analogs:**

- `CreateFamilyDialog` dentro de `AdminGuests.tsx`: `<dialog>`,
  `showModal()`, foco via `requestAnimationFrame`, bloqueio de Escape quando
  busy e reset ao fechar.
- `AdminConfirmDialog.tsx`: `aria-labelledby`, `aria-describedby`, foco
  inicial seguro, botões em grid mobile-first e `aria-busy`.
- `AdminGuests.tsx`: `useMutation`, `usePendingOperations`, branches
  discriminados (`unauthorized`, `saved`, `invalid`) e feedback recuperável.
- `Toast.tsx`: `role="status"` por padrão e `role="alert"` para erro.
- `Field.tsx`: label real, `aria-describedby` composto e altura mínima de
  44px.

Padrões concretos:

```tsx
<input
  id={inputId}
  type="file"
  accept=".csv,text/csv"
  aria-describedby={hintId}
/>
```

- manter ação secundária “Baixar modelo” disponível antes da seleção;
- usar um único diálogo/painel com máquina de estados discriminada, não
  vários booleans incompatíveis;
- prévia mostra resumo e grupos em cards empilháveis; erros usam lista ou
  tabela sem exigir scroll horizontal para entender linha e motivo;
- “Importar válidos” só habilita com ao menos um grupo e abre confirmação
  com contagens explícitas;
- enviar sequencialmente lotes de no máximo 25 famílias/100 pessoas;
- bloquear seleção, fechamento e duplo submit durante a fila;
- manter resultados concluídos se um lote falhar, mostrar erro de rede e
  permitir reconciliar/recomeçar sem reenviar silenciosamente;
- mover foco para o título do resultado e anunciar o resumo em
  `aria-live="polite" aria-atomic="true"`;
- ouvir `admin-sensitive-state-clear` e apagar `File`, prévia e relatório da
  memória.

### `src/components/admin/AdminGuests.tsx` — modify

**Role:** ponto de integração do importador no CRUD existente.

**Data flow:** recebe `token` e `onUnauthorized` do gate em `Admin.tsx`,
entrega-os ao importador e continua consumindo `listFamilies` reativamente;
famílias recém-criadas aparecem pela query existente.

**Closest pattern:** o cabeçalho atual tem a ação primária única:

```tsx
<Button
  variant="adminPrimary"
  onClick={() => {
    setCreateError(null)
    setCreateOpen(true)
  }}
>
  Adicionar família
</Button>
```

Adicionar “Importar CSV” como ação secundária ao lado de “Adicionar família”,
sem criar nova rota/nav. No estado vazio, oferecer as duas entradas. Não
misturar o relatório do importador com `drafts`, `expanded` ou
`pendingFamilies` por família; ele tem ciclo próprio e a lista reativa segue
como fonte de verdade.

### `src/components/admin/AdminGuestImport.test.tsx` — create

**Role:** teste DOM do fluxo e das proteções de concorrência/auth.

**Data flow:** mock de `convex/react` + arquivo sintético → eventos no input e
diálogo → mutation diferida → DOM/foco/anúncios.

**Closest analog:**
`src/components/admin/adminPendingOperations.test.ts`, que:

- declara `// @vitest-environment jsdom`;
- usa `createRoot`, `act`, `MemoryRouter` e mocks hoisted de Convex;
- polyfilla `HTMLDialogElement.showModal/close`;
- usa promises diferidas para provar bloqueios e respostas fora de ordem.

Cobrir seleção/prévia/confirmação/resultado, download do modelo, duplo submit,
lotes sequenciais, conflito retornado pelo servidor, falha no segundo lote,
`unauthorized`, evento de limpeza sensível, foco do resultado e `aria-live`.

### `convex/adminRsvps.ts` — modify

**Role:** adicionar a única mutation pública de importação, protegida e
transacional por lote.

**Data flow:** token + grupos normalizados + linhas-fonte → guard →
revalidação → lookup lógico → `insertInvitation` → resultado criado/ignorado
por grupo.

**Closest patterns:**

```ts
if ((await authorize(ctx, args.token)).kind !== 'authorized') {
  return { kind: 'unauthorized' } as const
}
```

```ts
const inserted = await insertInvitation(ctx, {
  displayName: args.displayName,
  phone: args.phone,
  guests: args.guests,
})
```

`createFamily` já prova a costura correta. `updateFamily` mostra como usar
`normalizePhone` + `findLogicalInvitation` para impedir equivalentes. A nova
mutation deve manter `args` e `returns` validados por `v`, com união
discriminada.

Contrato aproximado:

```ts
args: {
  token: v.string(),
  groups: v.array(v.object({
    sourceRows: v.array(v.number()),
    displayName: v.string(),
    phone: v.string(),
    guests: v.array(v.object({
      sourceRow: v.number(),
      name: v.string(),
    })),
  })),
}
```

Retornar `unauthorized` ou `ready` com:

- `created`: linhas, id/nome da família e quantidade de pessoas;
- `ignored`: linhas, código (`existing_phone` ou `invalid`) e mensagem
  pública segura.

Padrões obrigatórios:

- autorizar antes de qualquer leitura;
- rejeitar payload acima de 25 famílias/100 pessoas;
- revalidar inteiros positivos de `sourceRows`, nomes, telefone e limites;
- converter convidados para `{ name, attendance: 'pending' }`;
- checar conflito lógico e nunca fazer patch de família existente;
- processar cada grupo com resultado próprio. Como toda mutation Convex é
  transacional, não deixar uma exceção de domínio abortar grupos válidos:
  validar e classificar antes de inserir; exceção inesperada continua sendo
  falha do lote.
- usar `insertInvitation`; não chamar `createFamily` de outra mutation e não
  escrever diretamente nas tabelas duplicando `publicRef`/ordenação.

### `convex/rsvpInternal.ts` — preserve; modify only if extraction is required

**Role:** costura canônica de criação e unicidade.

**Data flow:** input já validado → `normalizeInvitationInput` →
`findLogicalInvitation` → `rsvps` + `rsvpGuests`.

**Closest concrete pattern:** o comentário já reserva a função para este caso:

```ts
/**
 * Única costura de criação desta fase. É uma função interna de módulo, não uma
 * função Convex pública; importadores administrativos futuros devem reutilizá-la.
 */
export async function insertInvitation(...)
```

`findLogicalInvitation` e `insertInvitation` já são exportados, portanto a
implementação normal não precisa mudar este arquivo. Se o relatório exigir
um helper puro de validação, extrair esse helper sem alterar semântica de
fixtures, RSVP público ou referências existentes.

### `convex/admin.test.ts` — modify

**Role:** integração do writer com schema real, auth real e equivalência de
telefone.

**Data flow:** `makeAdminTest` registra módulos/componentes → insere sessão
ativa → chama `api.adminRsvps.importFamilies` → inspeciona DTO e tabelas.

**Closest analogs:**

- `insertActiveAdminSession()` cria a sessão hash-only sem expor token em
  documento.
- suites atuais verificam a mesma resposta `unauthorized` para tokens
  malformados, expirados e revogados.
- testes de CRUD existentes usam `insertInvitation` e leem tabelas para
  provar cascata/ownership.

Acrescentar:

- auth obrigatória antes de qualquer resultado;
- lote válido cria pessoas apenas `pending`, sem `respondedAt`;
- payload inválido/over-limit é recusado de modo tipado;
- família existente por grafia de telefone legado/atual vira
  `existing_phone` e não sofre overwrite;
- mistura válido/conflitante retorna sucesso parcial e persiste só o válido;
- duas importações concorrentes não criam telefone lógico duplicado;
- DTO não reflete token nem campos internos/segredos.

## Metadados, settings e gate automatizado

### `index.html` — modify

**Role:** declarar uma única origem pública para mecanismos de busca e cards
sociais.

**Data flow:** documento estático do build → crawler/WhatsApp → canonical e
imagem absoluta no host `www`.

**Closest pattern:** os títulos, descrição, locale e asset já vivem neste
arquivo. Substituir o comentário de pendência e `/og.jpg` por:

```html
<link rel="canonical" href="https://www.sol40.com.br/" />
<meta property="og:url" content="https://www.sol40.com.br/" />
<meta property="og:image" content="https://www.sol40.com.br/og.jpg" />
<meta name="twitter:card" content="summary_large_image" />
```

Não parametrizar por `.vercel.app`, env Vite ou `PUBLIC_ORIGIN`.

### `src/lib/productionMetadata.test.ts` — create

**Role:** regressão estrutural dos settings públicos sem precisar de browser.

**Data flow:** lê `index.html` no teste Node → extrai tags → compara origem e
asset.

**Closest analog:** `src/content/event.test.ts` testa contratos canônicos de
conteúdo e datas, não detalhes de render React.

Provar canonical único/absoluto, `og:url` idêntico, `og:image` absoluto,
existência de `public/og.jpg`, ausência de `.vercel.app` e ausência de
`PUBLIC_ORIGIN` em arquivos de contrato (`index.html`, `.env.example`,
`DEPLOY.md`). Não usar snapshot amplo.

### `convex/convex.config.ts` — modify

**Role:** declarar `ADMIN_PASSWORD` como configuração obrigatória do app no
deploy.

**Data flow:** ambiente do deployment Convex → validação de configuração →
`adminAuth.login`; nunca passa pelo Vite.

**Closest pattern:** o app atual registra o componente rate limiter antes do
export:

```ts
const app = defineApp()
app.use(rateLimiter)
export default app
```

Usar a API de env exigida pela versão Convex fixada no projeto, mantendo
`adminAuth.ts` como único consumidor em runtime. Não mover leitura para
`src/`, não criar `VITE_ADMIN_PASSWORD` e não incluir valor default.

### `.env.example` — modify

**Role:** documentar apenas nomes, escopos e comandos seguros.

**Data flow:** operador lê o contrato; nenhum valor do arquivo deve ser usado
como segredo real.

**Closest pattern:** as três seções atuais já distinguem
`VITE_CONVEX_URL`, `CONVEX_DEPLOY_KEY` e `ADMIN_PASSWORD`.

Correções:

- produção sempre usa `npx convex env set --prod ADMIN_PASSWORD`;
- verificação usa `npx convex env list --names-only --prod`;
- não mostrar senha inline em comando (evita histórico do shell);
- manter deploy key somente em Vercel Production/Preview e senha somente no
  Convex correspondente;
- remover qualquer sugestão de `PUBLIC_ORIGIN`.

### `DEPLOY.md` — modify

**Role:** runbook canônico de provisionamento, smoke e separação de
ambientes.

**Data flow:** commit → Vercel build → deploy Convex indicado pela deploy key
→ `VITE_CONVEX_URL` injetada → `dist`; operador valida pelo domínio e
dashboards.

**Closest concrete pattern:** preservar a explicação do comando existente:

```json
"buildCommand": "npx convex deploy --cmd 'npm run build'"
```

Corrigir a afirmação de que `convex env set` usa produção por padrão.
Documentar `--prod`, escopos Preview/Production, senha por entrada
interativa/stdin, smoke `.vercel.app` antes do DNS, DNS-only na Cloudflare,
redirect Vercel e a diferença entre rollback Vercel/Convex/dados. Não
hardcode alvos A/CNAME; registrar “copiar o valor exibido pela Vercel”.

### `playwright.config.ts` — create

**Role:** configurar um gate repetível sobre o build/preview local.

**Data flow:** Playwright inicia servidor do artefato → projetos Chromium e
WebKit/viewports móveis → specs de release.

**Closest analog:** `vite.config.ts` centraliza configuração Vitest e mantém
o runner não interativo. A nova configuração fica separada para não ampliar
`test.include`.

Padrões:

- `webServer.command` serve o build, não o dev server;
- `reuseExistingServer` somente fora de CI;
- `baseURL` configurável para permitir o mesmo smoke contra preview/prod;
- trace/screenshot apenas em falha e nunca com sessão/senha real;
- Chromium + WebKit e viewports móveis são emulação, rotulados como tal.

### `tests/release.spec.ts` — create

**Role:** gate de rotas, refresh, privacidade pré-auth, reflow e axe.

**Data flow:** `baseURL` local/preview → navegação/refresh → DOM/network/axe
→ relatório Playwright.

**Closest analogs:**

- rotas reais em `src/App.tsx`: `/`, `/confirmar`, `/presentes`, `/admin/*`
  e 404;
- `Admin.tsx` só monta `AdminShell` após sessão autenticada;
- `AdminShell.tsx` já contém skip link, foco no `#admin-page-title`, safe
  area e navegação responsiva.

Cobrir rotas e hard refresh, ausência de conteúdo administrativo antes do
login, teclado/foco básico, 320 CSS px sem overflow bidimensional, zoom/reflow
e axe sem violações bloqueantes. Fixtures de escrita permanecem fictícias em
preview; o spec nunca recebe senha de produção.

### `src/index.css` e componentes públicos/admin — modify only from evidence

**Role:** aplicar correções AA/mobile encontradas pelo gate.

**Data flow:** achado específico de axe/teclado/reflow → ajuste no menor
componente/token responsável → regressão browser.

**Closest patterns already present:**

- `:focus-visible` global e reforço no `.admin-dashboard`;
- `@media (prefers-reduced-motion: reduce)`;
- `env(safe-area-inset-bottom)` em nav/main/toast;
- `Button` com `min-h-[44px]`;
- skip link em `AdminShell`.

Não planejar redesign geral. Modificar somente arquivos apontados por
violações reproduzíveis e manter o visual atual.

## Artefatos operacionais da fase

### `.planning/phases/07-endurecimento-lan-amento/07-LAUNCH-CHECKLIST.md` — create

**Role:** gate assinado e ordem segura do lançamento.

**Data flow:** comandos/resultados/timestamps → decisão de apontar domínio e,
separadamente, decisão de divulgar o convite.

**Closest analog:** `DEPLOY.md` é instrução durável; este arquivo é a
evidência específica da execução da fase.

Estruturar Gate A repositório, B preview, C produção `.vercel.app`, D domínio
e E divulgação. Registrar commit e IDs/URLs públicos de deployments, nunca
segredos. Gate E exige backup, importação/revisão e ausência de dados exemplo.

### `.planning/phases/07-endurecimento-lan-amento/07-SMOKE.md` — create

**Role:** casos e resultados reproduzíveis para preview, produção Vercel,
domínio imediato e pós-propagação.

**Data flow:** alvo + horário + caso → resultado/evidência → incidente ou
aprovação.

**Closest analog:** funções `smoke*` em `convex/adminTest.ts` são
internal-only, autocontidas e limpam seus dados; o documento deve distinguir
esses smokes backend dos fluxos HTTP/browser.

Incluir home, rotas profundas, RSVP, catálogo/`wa.me`, memória, login admin,
privacidade pré-auth, logs Convex, TLS e redirect preservando path/query.
Escrita de produção só com fixture explicitamente descartável e limpeza
verificada.

### `.planning/phases/07-endurecimento-lan-amento/07-ROLLBACK.md` — create

**Role:** matriz de incidente e último alvo saudável.

**Data flow:** sintoma → camada afetada → ação inicial → validação → alvo
saudável.

**Closest analog:** não há runbook equivalente no repo; usar a separação de
camadas documentada em `DEPLOY.md`.

Registrar:

- frontend/JS: rollback Vercel para deployment saudável;
- função/schema: redeploy do commit saudável no mesmo Convex production;
- env: corrigir no alvo certo e fazer novo deploy;
- dado identificável: exportar e corrigir pontualmente;
- corrupção material: backup adicional + restore validado como último
  recurso.

Nunca descrever rollback Vercel como rollback de Convex.

### `.planning/phases/07-endurecimento-lan-amento/07-DEVICE-MATRIX.md` — create

**Role:** obrigação viva de LAUNCH-01 após o site já estar no ar.

**Data flow:** pessoa/aparelho executa fluxo real → registra ambiente,
resultado, evidência, severidade e correção.

**Closest analog:** nenhum teste automatizado substitui este artefato.

Criar linhas pendentes para iPhone Safari, iPhone WebView, Android Chrome,
Android WebView e `/admin` em ao menos um celular. Colunas: data, aparelho,
OS, navegador/app/versão, conexão, fluxo, resultado, evidência, severidade,
correção. Marcar explicitamente “pendente — não bloqueia lançamento”.

### Backup Convex ZIP — external artifact, do not create in repository

**Role:** ponto de recuperação antes da lista real ou alteração material.

**Data flow:** deployment production → backup consistente (incluindo storage
quando aplicável) → ZIP baixado fora do git → checksum/timestamp no checklist.

**Closest pattern:** `.gitignore` já protege ambientes/artefatos locais; PII e
backup não entram no repositório.

Validar conclusão e conteúdo esperado do ZIP sem fazer restore em produção.
Registrar somente deployment, timestamp, checksum e local seguro genérico.

## Provisionamento e domínio — external state, no source file

### Vercel project + Convex deployments

**Role:** ligar `main` a production e branches/PRs a previews isolados.

**Data flow:** Git push → Vercel scope escolhe `CONVEX_DEPLOY_KEY` → Convex
deploy correspondente → build recebe `VITE_CONVEX_URL`.

**Closest source contract:** `vercel.json` já contém build encadeado,
`outputDirectory: "dist"` e rewrite SPA. Não precisa mudar salvo evidência de
override/incompatibilidade.

Ordem: vincular projeto, conferir config, criar/chavear Preview e Production,
configurar `ADMIN_PASSWORD` somente no Convex production, provar isolamento,
deployar e fazer smoke `.vercel.app`.

### Cloudflare DNS + Vercel domains

**Role:** publicar `www.sol40.com.br` como canonical e apex como redirect
permanente.

**Data flow:** resolvedor consulta Cloudflare DNS-only → tráfego termina na
Vercel → apex redireciona preservando path/query → `www` serve SPA.

**Closest source contract:** canonical de `index.html` e rewrite de
`vercel.json`.

Inventariar DNS antes de escrever; não tocar MX/TXT/CAA não relacionados.
Adicionar ambos hosts na Vercel, definir `www` como primário e apex como
redirect. Copiar os A/CNAME exatos mostrados pela Vercel e usar nuvem cinza
DNS-only. Não criar redirect concorrente na Cloudflare.

## Recommended Implementation Order

1. `guestCsv.ts` + testes e dependência do parser.
2. Writer em `adminRsvps.ts` + integração Convex.
3. `AdminGuestImport.tsx`, integração em `AdminGuests` e teste DOM.
4. `index.html`, settings/docs e teste de metadados.
5. Playwright/axe e correções AA/mobile orientadas por evidência.
6. Criar checklist, smoke, rollback e matriz física.
7. Provisionar Vercel/Convex, provar preview/prod e criar backup.
8. Configurar Cloudflare/Vercel domains, smoke imediato e pós-propagação.

Essa ordem mantém a lista real fora de produção até o importador, o gate e o
ponto de recuperação estarem prontos, e preserva uma versão frontend/Convex
compatível para rollback.
