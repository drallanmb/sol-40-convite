# Phase 7: Endurecimento & Lançamento — Research

**Researched:** 2026-07-25  
**Domain:** lançamento Vercel + Convex com DNS Cloudflare, importação CSV administrativa, gate de produção e validação móvel/acessível  
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- O endereço canônico é `https://www.sol40.com.br`; o apex
  `https://sol40.com.br` redireciona permanentemente para ele preservando
  caminho e query.
- Cloudflare continua autoritativo. Não trocar nameservers.
- Codex conduz Vercel e Cloudflare pelas sessões autenticadas e só pausa para
  login, confirmação de segurança ou decisão externa do dono.
- O domínio pode ficar público depois do gate técnico e do primeiro smoke.
  Testes físicos não bloqueiam o lançamento.
- O link só é enviado aos convidados depois que a lista real for importada e
  revisada.
- O `/admin` mantém o CRUD família por família e ganha upload CSV com prévia.
- O CSV mínimo tem `familia`, `telefone`, `convidado`, uma pessoa por linha.
  Linhas da mesma família e telefone formam um convite; todos começam
  `pending`.
- A gravação é parcial: entradas válidas entram, inválidas são ignoradas e
  relatadas por linha e motivo. Dados existentes nunca são sobrescritos
  automaticamente.
- O gate exige suíte e build verdes, HTTPS, frontend ligado ao Convex de
  produção, home/RSVP/login admin e privacidade pré-auth.
- Depois do deploy há smoke imediato e nova conferência pós-propagação.
- Um release ruim volta para a última versão saudável enquanto a correção é
  preparada.
- Antes da primeira importação ou mudança material de dados reais, criar um
  backup/export verificável.
- Produção e previews usam deployments Convex separados.
  `CONVEX_DEPLOY_KEY` é build-only; `ADMIN_PASSWORD` existe somente no
  deployment Convex.
- Countdown continua qualificado com `-03:00`; 30/09 é informativo.
- Rate limits só mudam com evidência.

### Deferred / Out of Scope

- Telão, QR das mesas e Instagram/Apify.
- Checkout, reserva ou confirmação automática de presentes.
- Contas individuais, novos papéis ou novo modelo de autenticação.
- Capacidades públicas novas que não sejam necessárias para lançar o v1.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Requirement | Research support |
|---|---|---|
| LAUNCH-01 | Testes reais de `wa.me`, fuso e HEIC/WebViews | Matriz física pós-lançamento, dados/artefatos de teste descartáveis e separação explícita entre emulação e aparelho real |
| LAUNCH-02 | Acessibilidade AA e revisão mobile-first | Gate WCAG 2.2 AA automatizado + teclado, zoom/reflow, contraste, viewport/teclado e backstops físicos |
| LAUNCH-03 | Domínio, origem canônica, senha forte e lista real | Metadados absolutos, configuração Vercel/Convex/Cloudflare, secret server-only, importador CSV e backup pré-dados |
| LAUNCH-04 | Deploy de produção verificado ao vivo | Gate em camadas, smoke da URL Vercel e domínio, DNS/TLS/redirect, evidência e runbook de rollback composto |
</phase_requirements>

## Summary

A fase deve ser planejada como quatro entregas ordenadas, e não como um único
“deploy”: (1) importador CSV e metadados de produção; (2) validação
automatizada/acessível e documentação operacional; (3) provisionamento
Vercel + Convex e smoke na URL de produção da Vercel; (4) ligação do domínio
na Cloudflare, redirect e smokes pós-propagação. A matriz física começa
depois do lançamento e permanece uma obrigação real de LAUNCH-01.

O caminho mais seguro para o domínio é deixar Cloudflare apenas como DNS:
adicionar **os dois hostnames** ao projeto Vercel, usar exatamente o A/CNAME
que a Vercel mostrar, ambos em **DNS-only**, e configurar o apex como redirect
para `www` na própria Vercel. Isso evita dois motores de redirect e deixa
certificado/TLS sob a Vercel. A Vercel recomenda `www` como primário e apex
redirecionado. Não hardcode `76.76.21.21` ou `cname.vercel-dns.com`: a UI pode
fornecer alvos específicos do projeto.

O rollback é composto. “Instant rollback” da Vercel só reassocia os domínios
a um frontend já servido e não reconstrói variáveis; ele **não reverte as
funções Convex nem dados**. Como o build executa `npx convex deploy` antes de
publicar o frontend, cada release deve manter APIs Convex compatíveis com o
cliente anterior. Em incidente de frontend, rollback Vercel é imediato; em
incidente de backend, redeploy do commit saudável para o mesmo deployment
Convex; restore de dados só se dados foram corrompidos e sempre a partir de
backup validado.

Para CSV, use parser maduro no navegador, valide e agrupe em função pura e
envie apenas grupos normalizados ao backend. O writer Convex deve repetir
todas as validações e autorização, usar índices de telefone e criar cada
família com pessoas pendentes. Processar lotes pequenos preserva limites e
permite acumular um relatório parcial. Conflito com família existente, mesmo
telefone em nomes familiares incompatíveis e linhas malformadas são
ignorados, nunca atualizados.

**Primary recommendation:** decompor em quatro planos: `07-01` importador CSV
seguro; `07-02` canonical/settings + acessibilidade/gate e artefatos
operacionais; `07-03` Vercel/Convex produção + backup + smoke em
`.vercel.app`; `07-04` Cloudflare/domínio + smokes/rollback + matriz física
pós-lançamento.

## Current Baseline Findings

### Estado verificável em 2026-07-25

- Branch local: `main`; remote:
  `https://github.com/drallanmb/sol-40-convite.git`.
- Não existe `.vercel/`: o diretório ainda não está vinculado a projeto
  Vercel.
- `.env.local` contém somente nomes de configuração de desenvolvimento
  (`CONVEX_DEPLOYMENT`, `VITE_CONVEX_URL`, `VITE_CONVEX_SITE_URL`); nenhum
  valor foi lido nesta pesquisa.
- Nameservers públicos já são
  `ainsley.ns.cloudflare.com` e `cody.ns.cloudflare.com`.
- O apex e `www` ainda não têm A/CNAME resolvendo; `www.sol40.com.br` não
  abre.
- A suíte atual passa: **25 arquivos / 494 testes**. `npm run build` também
  passa. Esse é o baseline, não a evidência final de lançamento.
- Há alterações do usuário em `src/lib/phone.ts` e
  `src/lib/phone.test.ts`; a fase deve preservá-las e integrar contra o
  contrato atual, sem revertê-las.
- `index.html` ainda usa `/og.jpg`, não possui `og:url` nem
  `<link rel="canonical">`.
- `vercel.json` já tem o build encadeado e rewrite SPA correto.
- `AdminGuests` já oferece CRUD manual e é o ponto certo para acrescentar o
  importador.
- `adminRsvps.ts` concentra autorização, unicidade lógica de telefone,
  criação transacional, revisão e revogação. O importador não deve criar uma
  segunda versão dessas regras.
- HEIC/HEIF já é selecionável no cliente, decodificado quando o navegador
  suporta e reencodado para JPEG. O backend rejeita HEIC cru.
- Datas canônicas já usam `-03:00`; o teste de fuso deve validar o código
  existente, não mudar a regra.

### Correção obrigatória no guia atual

`DEPLOY.md` afirma que `npx convex env set ADMIN_PASSWORD ...` aponta para
produção por padrão. A CLI oficial atual aponta para **dev por padrão**.
Produção exige:

```bash
npx convex env list --names-only --prod
npx convex env set --prod ADMIN_PASSWORD
```

O valor deve ser fornecido interativamente/stdin para não entrar no shell
history. A documentação e `.env.example` precisam ser corrigidas antes do
runbook ser usado.

Fontes:

- [Convex `env` CLI](https://docs.convex.dev/cli/reference/env)
- [Convex environment variables](https://docs.convex.dev/production/environment-variables)

## Recommended Architecture

### 1. Importação CSV no `/admin`

#### Parser e contrato

Recomenda-se `papaparse` no cliente, com versão exata pinada e tipos
correspondentes. Ele lê `File` localmente, trata campos quoted, CRLF, erros,
BOM e autodetecta delimitadores comuns, inclusive vírgula e ponto e vírgula.
Não enviar nem armazenar o arquivo bruto no Convex.

Configuração conceitual:

```ts
Papa.parse(file, {
  header: true,
  delimiter: '',
  skipEmptyLines: 'greedy',
  transformHeader: normalizeCsvHeader,
  complete: buildGuestImportPreview,
})
```

Fonte: [Papa Parse documentation](https://www.papaparse.com/docs).

Contrato recomendado:

- aceitar UTF-8, com ou sem BOM;
- autodetectar `,` ou `;`, pois CSV gerado por Excel em locale brasileiro
  costuma usar `;`;
- normalizar cabeçalhos com trim, lowercase e remoção do BOM, mas exigir
  exatamente `familia`, `telefone`, `convidado` depois disso;
- rejeitar cabeçalho ausente, repetido ou coluna extra não reconhecida;
- limitar tamanho/linhas no cliente antes da prévia (por exemplo 1 MiB e
  2.000 registros; muito acima da escala da festa);
- definir “linha” no relatório como número do registro CSV, contando o
  cabeçalho como linha 1. CSV quoted com quebra interna continua sendo um
  único registro;
- manter strings, sem `dynamicTyping`, para não mutilar telefone ou zeros;
- template baixável com BOM, cabeçalho e uma seção de exemplo claramente
  marcada na UI. Uma alternativa ainda mais segura é download só com
  cabeçalho e exemplo visual fora do arquivo.

#### Validação e agrupamento puros

Criar `src/lib/guestCsv.ts` e `src/lib/guestCsv.test.ts`. A saída da prévia
deve separar:

```ts
type ImportPreview = {
  groups: ValidFamilyGroup[]
  ignored: Array<{ row: number; reason: ImportIssueCode; detail: string }>
  totals: {
    sourceRows: number
    validRows: number
    ignoredRows: number
    families: number
    people: number
  }
}
```

Regras:

1. Trim e colapso de whitespace em família/convidado; manter a primeira
   grafia válida para exibição.
2. Validar tamanhos com as mesmas constantes de `rsvpModel`.
3. Normalizar telefone com `normalizePhone`; usar `normalizedKey` para
   identidade lógica.
4. Agrupar pela combinação `normalizedKey + nome familiar normalizado`.
5. Se o mesmo `normalizedKey` aparecer associado a dois nomes familiares
   incompatíveis no arquivo, ignorar todos esses grupos e explicar o
   conflito; o schema permite uma família por telefone.
6. Dentro do grupo, uma linha de pessoa vazia/inválida é ignorada sem
   invalidar outras pessoas válidas.
7. Duplicata exata da mesma pessoa dentro do grupo: primeira linha vence,
   duplicatas entram no relatório como ignoradas.
8. Toda pessoa enviada ao writer usa `attendance: 'pending'`; CSV nunca
   controla presença ou `respondedAt`.

A prévia deve mostrar famílias/pessoas normalizadas, telefone formatado,
contagens e problemas **antes** de habilitar “Importar válidos”.

#### Writer Convex

Adicionar uma mutation protegida em `adminRsvps.ts` ou módulo administrativo
dedicado, reutilizando helpers de `rsvpInternal` em vez de chamar mutations
públicas a partir de outra mutation.

Características obrigatórias:

- `args` e `returns` validados;
- `requireAdminSession` antes de qualquer leitura;
- revalidação server-side de nome, telefone, limites e pessoas;
- consulta por índice usando todos os `lookupCandidates`;
- conflito com família existente retorna `existing_phone`; nunca patch;
- criação via `insertInvitation` ou helper extraído equivalente;
- `attendance: pending`, sem `respondedAt`;
- resultado por grupo com linhas-fonte para montar o relatório final;
- lotes sequenciais pequenos (recomendação inicial: até 25 famílias e até
  100 pessoas por chamada), com botão bloqueado durante a fila;
- a UI acumula criados/ignorados e mantém o relatório após a query reativa
  atualizar a lista.

Mutations Convex são transacionais e os clientes as executam em fila
ordenada; limites de leitura/escrita justificam lotes. Conflitos concorrentes
são automaticamente reexecutados contra uma visão consistente. Fontes:

- [Convex mutations](https://docs.convex.dev/functions/mutation-functions)
- [Convex limits](https://docs.convex.dev/production/state/limits)
- [Convex error handling](https://docs.convex.dev/functions/error-handling/)

“Parcial” deve ser definido em duas camadas:

- linha inválida é removida na prévia;
- grupo válido ainda pode ser ignorado pelo servidor por conflito surgido
  depois da prévia;
- uma falha inesperada de transporte para um lote não autoriza seguir
  silenciosamente: mostrar erro, manter relatório já confirmado e permitir
  retomar/reconciliar pela lista reativa.

Não criar um importador via `npx convex import`: esse comando opera tabelas e
contorna as invariantes de domínio/UX desejadas. O backup CLI continua útil
para recuperação, não para a lista do dono.

#### UI e acessibilidade

- Integrar em `AdminGuests`, sem nova área administrativa.
- Ação secundária “Importar CSV” e “Baixar modelo”.
- `<input type=file accept=".csv,text/csv">` com label real.
- Dialog ou painel em três estados: selecionar → prévia → resultado.
- Resumo em `aria-live`, erros por linha em lista/tabela semanticamente
  navegável e foco movido para o título do resultado.
- No celular, cards/linhas empilhadas; nunca depender de tabela larga para
  entender o erro.
- Logout/auth loss limpa arquivo, prévia e relatório da memória.
- “Importar válidos” exige confirmação com contagens explícitas.

### 2. Origem canônica e metadados

Como a origem agora é fixa, não há motivo para introduzir uma variável
`PUBLIC_ORIGIN` que a stack atual não consome. Satisfaça o contrato diretamente
em `index.html`:

```html
<link rel="canonical" href="https://www.sol40.com.br/" />
<meta property="og:url" content="https://www.sol40.com.br/" />
<meta property="og:image" content="https://www.sol40.com.br/og.jpg" />
<meta name="twitter:card" content="summary_large_image" />
```

Adicionar teste que leia `index.html` e prove:

- um único canonical absoluto;
- `og:url` igual à origem canônica;
- `og:image` absoluto e apontando para o asset existente 1200×630;
- nenhuma origem `.vercel.app`;
- nenhum `PUBLIC_ORIGIN` morto/documentado como requisito de runtime.

URLs canônicas absolutas são a recomendação oficial e evitam consolidar apex,
`www` e URL Vercel como documentos diferentes.

Fonte: [Google Search — canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls).

### 3. Vercel + Convex de produção

Ordem segura:

1. Criar/vincular o projeto Vercel ao repositório e produção `main`.
2. Confirmar que a UI não sobrescreve `vercel.json`.
3. Confirmar/criar projeto e deployment **production** Convex.
4. Gerar Production Deploy Key com permissão `deployment:deploy`; cadastrar
   `CONVEX_DEPLOY_KEY` somente em Production na Vercel.
5. Gerar Preview Deploy Key e cadastrar a mesma chave nominal somente em
   Preview.
6. Declarar `ADMIN_PASSWORD` como env obrigatório em
   `convex/convex.config.ts` para validação de deploy, mantendo leitura
   server-only.
7. Gerar senha inédita de no mínimo 24 caracteres no gerenciador do dono e
   fornecê-la interativamente a `npx convex env set --prod ADMIN_PASSWORD`.
8. Verificar apenas o **nome** com
   `npx convex env list --names-only --prod`; nunca imprimir valor em
   evidência/log.
9. Fazer preview isolado e validar que seu URL Convex difere de produção.
10. Fazer primeiro deploy production e smoke na URL `.vercel.app` antes de
    mexer no DNS.

O build existente está alinhado à documentação:

```json
"buildCommand": "npx convex deploy --cmd 'npm run build'"
```

Esse comando injeta `VITE_CONVEX_URL` no build e publica funções/schema no
deployment indicado pela deploy key. Preview usa backend separado por branch.

Fontes:

- [Using Convex with Vercel](https://docs.convex.dev/production/hosting/vercel)
- [Convex multiple deployments](https://docs.convex.dev/production/multiple-deployments)
- [Convex deploy CLI](https://docs.convex.dev/cli/reference/deploy)
- [Vite env variables](https://vite.dev/guide/env-and-mode)

### 4. Cloudflare DNS, TLS e redirect

Recomendação concreta:

- adicionar `www.sol40.com.br` e `sol40.com.br` ao projeto Vercel;
- definir `www` como domínio primário e o apex como redirect para `www`;
- copiar **os valores exatos mostrados pela Vercel**:
  - `www`: CNAME específico da Vercel;
  - apex: A indicado pela Vercel;
- criar/alterar os dois registros no Cloudflare como **DNS-only**;
- não criar Redirect Rule concorrente no Cloudflare;
- aguardar Vercel mostrar domínio válido e certificado emitido;
- testar HTTP/HTTPS, apex/`www`, path e query.

A Cloudflare continuará servindo DNS autoritativo, mas não será proxy HTTP.
Portanto seu modo SSL não participa do tráfego normal; TLS termina na Vercel.
Se no futuro o proxy laranja for ativado, a decisão precisa ser reaberta e
usar Full (strict), nunca Flexible.

Não alterar registros MX/TXT/CAA não relacionados. Antes de escrever,
inventariar registros atuais e resolver alvos exatos de cada hostname.

Fontes:

- [Vercel deploying and redirecting domains](https://vercel.com/docs/domains/working-with-domains/deploying-and-redirecting)
- [Vercel custom domain setup](https://vercel.com/docs/domains/set-up-custom-domain)
- [Vercel verified proxy guidance](https://vercel.com/kb/guide/how-to-setup-verified-proxy)
- [Cloudflare root-to-www example](https://developers.cloudflare.com/rules/url-forwarding/examples/redirect-root-to-www/)

### 5. Backup, rollback e incidente

#### Ponto de recuperação

Antes da lista real:

1. No deployment production Convex, criar backup manual consistente.
2. Incluir file storage se já houver memórias/fotos.
3. Aguardar estado concluído e baixar o ZIP para local seguro.
4. Registrar timestamp, deployment e checksum do ZIP, sem versionar dados
   pessoais.
5. Verificar que o ZIP contém tabelas esperadas; não executar restore como
   “teste” contra produção.

Backups manuais ficam disponíveis no dashboard por sete dias e não incluem
código, environment variables nem funções agendadas. O runbook precisa de
inventário separado dos **nomes** de env vars e do commit saudável.

Fonte: [Convex Backup & Restore](https://docs.convex.dev/database/backup-restore).

#### Matriz de rollback

| Falha | Resposta inicial | Observação |
|---|---|---|
| Apenas frontend/layout/JS | `vercel rollback <deployment-saudável>` | Reassocia domínio sem rebuild |
| Função/schema Convex incompatível | Redeploy do commit saudável usando Production Deploy Key | Rollback Vercel sozinho não altera Convex |
| Env incorreta | Corrigir env no alvo correto e fazer novo deploy | Vercel env só vale em novos builds |
| Dados importados incorretamente, mas identificáveis | Correção administrativa direcionada/export primeiro | Evitar restore global |
| Corrupção material de dados | Backup adicional, avaliar impacto, restore do ZIP validado | Restore é última opção e pode substituir tabelas |

Vercel Instant Rollback não reconstrói env vars. Convex recomenda funções
backward-compatible porque clientes antigos podem continuar abertos. Logo,
todo código Convex desta fase deve ser aditivo e compatível com o frontend
anterior.

Fontes:

- [Vercel promoting/instant rollback](https://vercel.com/docs/deployments/promoting-a-deployment)
- [Vercel rollback CLI](https://vercel.com/docs/cli/rollback)
- [Convex safe production changes](https://docs.convex.dev/production/overview)

## Gate de Lançamento

### Gate A — repositório

```bash
npm test
npm run build
git diff --check
```

Além do baseline, exigir testes de parser/agrupar/relatório CSV, writer
Convex/autorização/conflitos, metadados absolutos e regressões de telefone.

### Gate B — preview isolado

- preview Vercel verde;
- backend Convex preview distinto de dev/prod;
- home, `/confirmar`, `/presentes`, `/admin` e refresh profundo retornam;
- nenhum dado administrativo aparece no DOM/network antes de auth;
- CSV usa somente dados fictícios no preview;
- axe/WCAG automatizado e viewport emulado sem violações bloqueantes;
- teste de upload usa fixture JPEG/WebP; HEIC físico fica pendente.

### Gate C — produção antes do domínio

Na URL production `.vercel.app`:

- deployment associado ao commit esperado;
- `VITE_CONVEX_URL` funcional contra o deployment production;
- catálogo, mural e RSVP carregam sem erro;
- login admin aceita a senha de produção sem registrar o valor;
- importação fictícia não deve sujar produção. Para provar escrita, usar
  fixture descartável explicitamente marcada e removida no mesmo roteiro, ou
  limitar o smoke a leitura/login até a lista real;
- hard refresh em `/admin`, `/confirmar` e `/presentes` retorna SPA;
- logs Convex sem erro inesperado;
- registrar deployment Vercel saudável e commit para rollback.

### Gate D — domínio

Verificações mínimas:

```bash
dig +short NS sol40.com.br
dig +short A sol40.com.br
dig +short CNAME www.sol40.com.br
curl -sSIL 'https://sol40.com.br/confirmar?origem=smoke'
curl -sSI 'https://www.sol40.com.br/'
curl -sS 'https://www.sol40.com.br/' | grep -E 'canonical|og:url|og:image'
```

Critérios:

- HTTPS válido nos dois hosts;
- apex devolve redirect permanente e destino final
  `https://www.sol40.com.br/confirmar?origem=smoke`;
- `www` devolve 200;
- refresh de todas as rotas SPA funciona;
- canonical/OG absolutos usam somente `www`;
- home, RSVP, WhatsApp, memória pública e login admin recebem smoke;
- nenhuma consulta administrativa protegida ocorre pré-auth;
- repetir de outro resolvedor/rede após propagação.

### Gate E — divulgação

Publicar domínio não significa divulgar convite. Antes de enviar o link:

- backup concluído e baixado;
- lista real importada;
- relatório de linhas ignoradas revisado/corrigido;
- amostragem de famílias/telefones/pessoas no `/admin`;
- busca RSVP testada com pelo menos uma família real, com autorização do dono;
- sem dados de exemplo;
- senha guardada pelos donos.

## Accessibility and Mobile Review

Alvo: WCAG 2.2 A/AA, preservando a regra interna mais forte de alvos de 44px.
O gate automatizado não substitui revisão manual.

Cobertura:

- contraste textual 4.5:1, texto grande 3:1;
- contraste não textual/foco 3:1;
- zoom 200%;
- reflow a 320 CSS px sem perda/scroll horizontal bidimensional;
- foco visível, ordem lógica, skip link e teclado completo;
- labels, nomes acessíveis, erros associados e `aria-live`;
- dialogs: foco inicial, trap, Escape e retorno;
- reduced motion;
- touch targets 44×44 conforme invariante do projeto;
- safe areas e teclado virtual no admin;
- conteúdo longo e orientação landscape.

Rotas/estados:

- `/`: home, countdown, mapa sob clique, mural vazio/com itens/formulário;
- `/confirmar`: telefone inválido, não encontrado, família aberta, dirty,
  save/rate-limit;
- `/presentes`: catálogo, item presenteado e link WhatsApp;
- `/admin`: login e, autenticado, quatro áreas + importador CSV;
- `404`.

Fonte: [W3C WCAG 2.2](https://www.w3.org/TR/wcag/).

## Matriz Física Pós-Lançamento

Criar `07-DEVICE-MATRIX.md`. Cada linha registra data, aparelho, OS,
navegador/app hospedeiro e versão, conexão, fluxo, resultado, evidência,
severidade e correção.

Mínimo desejado quando houver aparelhos:

| Plataforma | Contexto | Fluxos |
|---|---|---|
| iPhone | Safari | convite/countdown, RSVP save/edit, `wa.me`, memória HEIC, retorno |
| iPhone | WKWebView/Safari View Controller real de app disponível | link, `wa.me`, navegação/retorno, upload se picker disponível |
| Android | Chrome | convite/countdown, RSVP save/edit, `wa.me`, memória JPEG/WebP |
| Android | WebView/Custom Tab real de app disponível | link, `wa.me`, navegação/retorno, upload |
| Pelo menos um celular | `/admin` | login, CRUD/import preview, dialogs e teclado virtual |

HEIC:

- usar foto HEIC real criada no iPhone;
- confirmar preview/decode;
- confirmar que o cliente envia JPEG ≤5 MiB;
- confirmar post pendente e aprovação;
- se decode falhar, copy deve orientar exportar/compartilhar como JPEG e
  manter rascunho.

Safari 17 adicionou HEIC/HEIF a Safari, Safari View Controller e WKWebView,
mas suporte real depende de OS/arquivo; por isso o fallback continua
necessário.

Fontes:

- [WebKit — Safari 17 HEIC](https://webkit.org/blog/14445/webkit-features-in-safari-17-0/)
- [Apple Safari 17 release notes](https://developer.apple.com/documentation/safari-release-notes/safari-17-release-notes)

Fuso:

- trocar o aparelho para, por exemplo, `America/Los_Angeles` e depois
  `Asia/Tokyo`;
- comparar o countdown com o mesmo instante calculado para os limites
  `-03:00`;
- testar antes/na fronteira/depois de início do dia, 16h e encerramento em
  testes automatizados; no aparelho basta provar que mudar timezone não muda
  o instante-alvo.

Severidade:

- **P0:** exposição administrativa/dados, domínio indisponível, perda de
  dados — resposta imediata/rollback;
- **P1:** RSVP, login, WhatsApp ou upload impossível — correção imediata no ar;
- **P2:** fluxo degradado com workaround — priorizar;
- **P3:** diferença apenas visual — backlog.

Importante: emulação Playwright/WebKit/viewport melhora o gate, mas não
satisfaz LAUNCH-01. A fase pode lançar com a matriz pendente por decisão do
dono, porém LAUNCH-01 só muda para concluído depois da evidência física.

## Rate-Limit Audit

Os valores atuais são coerentes com a escala:

- RSVP lookup: 5/telefone/15 min + 120 global/15 min;
- RSVP save: 30/sessão/h + 300 global/h;
- upload: token bucket por device + limites globais;
- login admin: 10 global/15 min.

Não alterar por gosto. No preview/produção:

- testar feedback e `retryAfter`;
- confirmar que rascunhos permanecem;
- observar logs/usage durante smoke;
- alterar somente se convidados legítimos forem bloqueados ou abuso real
  atravessar o limite, com teste de regressão.

## Validation Architecture

### Test infrastructure

| Property | Value |
|---|---|
| Unit/integration | Vitest 4.1.10 + `convex-test` 0.0.54 |
| Current config | `vite.config.ts` |
| Current baseline | 25 files, 494 tests green |
| Build | `npm run build` |
| Browser preflight | Playwright Chromium/WebKit em desktop + viewports móveis; não conta como aparelho real |
| Accessibility | axe automatizado por rota/estado + checklist WCAG manual |
| Live network | `dig`, `curl`, Vercel domain status e Convex logs |
| Physical | matriz humana pós-lançamento |

Se Playwright/axe ainda não estiverem instalados, o plano de gate deve
adicioná-los com versões exatas e scripts sem watch:

```json
{
  "test:browser": "playwright test",
  "test:release": "npm test && npm run build && playwright test"
}
```

Não colocar senha de produção nem dados reais em fixtures/snapshots.

### Wave 0 / arquivos de teste

- `src/lib/guestCsv.test.ts`
  - BOM, vírgula/ponto e vírgula, quotes, CRLF, cabeçalhos;
  - agrupamento, nono dígito, DDD inválido, duplicatas, conflito de nomes;
  - partial rows e números/motivos do relatório.
- `convex/admin.test.ts`
  - import exige auth;
  - pending-only;
  - unicidade legado/atual;
  - conflito existente nunca sobrescreve;
  - lote parcial e concorrência;
  - limites e DTO sem segredo.
- teste de UI do importador
  - selecionar/prévia/confirmar/resultado;
  - double submit, falha de lote, auth loss, foco/aria-live.
- teste de metadados/settings
  - canonical, OG absolutos, asset e ausência de segredo/origem morta.
- Playwright release smoke
  - rotas/refesh, pre-auth privacy, viewport/reflow, axe.

### Sampling cadence

- Depois de cada tarefa de código: teste focado + `npm run build`.
- Depois de cada plano: `npm test && npm run build && git diff --check`.
- Antes de DNS: full release gate no preview e produção `.vercel.app`.
- Depois de DNS: smoke imediato e novamente após propagação.
- Depois de cada hotfix: focused regression + full build + smoke da jornada
  afetada.

### Per-plan validation map

| Plano recomendado | Automação | Manual/live |
|---|---|---|
| 07-01 CSV | `guestCsv.test.ts`, `convex/admin.test.ts`, UI jsdom, full build | preview com CSV válido/misto; verificar relatório e nenhum overwrite |
| 07-02 settings/a11y | metadata test, full suite/build, Playwright + axe | teclado, zoom 200%, 320px, contraste, dialogs, conteúdo longo |
| 07-03 Vercel/Convex | full release gate; `convex deploy --dry-run` quando aplicável | env names-only, preview/prod isolation, backup baixado, `.vercel.app` smoke |
| 07-04 domínio/operação | smoke HTTP automatizado | Cloudflare/Vercel status, TLS/redirect/path/query, logs, rollback drill e matriz física |

### Evidence artifacts

- `07-LAUNCH-CHECKLIST.md`: passos, timestamps, commit/deployments, sem
  segredos.
- `07-SMOKE.md`: casos e resultados de preview, `.vercel.app`, domínio
  imediato e pós-propagação.
- `07-DEVICE-MATRIX.md`: testes físicos ainda pendentes/executados.
- `07-ROLLBACK.md`: frontend/backend/env/dados e último alvo saudável.
- backup ZIP fora do git + checksum/timestamp registrado.

### Release sign-off invariants

- Nenhuma evidência automatizada marca aparelho físico como testado.
- Nenhum plano marca LAUNCH-01 completo enquanto a matriz real estiver vazia.
- Nenhum comando de produção omite `--prod` quando a CLI o exige.
- Nenhum secret aparece em comando versionado, log, screenshot ou Markdown.
- Rollback Vercel nunca é descrito como rollback de Convex.
- Importação real nunca acontece sem backup concluído.
- Divulgação nunca acontece antes da revisão da lista.

## Suggested Plan Breakdown

### 07-01 — Importação CSV protegida

- parser/testes/template;
- prévia/relatório acessíveis no `AdminGuests`;
- writer protegido em lotes;
- concorrência, partial success e auth-loss;
- preview com dados fictícios.

### 07-02 — Settings, metadados e gate de qualidade

- canonical/OG absolutos;
- corrigir `DEPLOY.md`/`.env.example`;
- declarar `ADMIN_PASSWORD` exigido pelo app Convex;
- Playwright/axe e revisão WCAG/mobile;
- criar checklist/smoke/device/rollback artifacts.

### 07-03 — Produção Vercel + Convex

- vincular projeto;
- separar deploy keys Preview/Production;
- configurar senha forte no Convex prod;
- preview isolado;
- deploy production na URL Vercel;
- backup/export e primeiro smoke;
- registrar alvos saudáveis.

### 07-04 — Domínio e acompanhamento

- adicionar ambos hostnames na Vercel;
- DNS-only exato na Cloudflare;
- redirect apex→www;
- TLS/SPA/metadados/jornadas;
- smoke imediato + pós-propagação;
- rollback drill sem corrupção;
- abrir/manter matriz física e só concluir LAUNCH-01 quando executada.

## Common Pitfalls

1. **Usar `convex env set` sem `--prod`.** Configura dev e deixa produção sem
   senha.
2. **Cloudflare proxy laranja + redirect Vercel.** Pode criar loop ou esconder
   diagnóstico. Use DNS-only no desenho escolhido.
3. **Hardcode de DNS Vercel antigo.** Copie os alvos que o projeto mostrar.
4. **Rollback só da Vercel.** Backend Convex novo continua ativo.
5. **Importar CSV diretamente na tabela.** Contorna normalização, conflitos,
   sessões e relatório.
6. **Confiar apenas na prévia cliente.** Backend deve revalidar tudo.
7. **Sobrescrever telefone já existente.** Decisão exige skip + relatório.
8. **Uma mutation gigante.** Pode atingir limites e deixar feedback ruim;
   usar lotes pequenos.
9. **Marcar emulação como aparelho real.** LAUNCH-01 exige hardware/contexto
   real.
10. **Divulgar domínio antes da lista.** Site público é permitido; envio do
    convite não.
11. **Backup sem download/checksum.** “Backup solicitado” não é ponto de
    recuperação verificável.
12. **Ler/mostrar secret para provar configuração.** Verificar apenas nome e
    login funcional.

## Sources

### Vercel

- [Deploying and redirecting domains](https://vercel.com/docs/domains/working-with-domains/deploying-and-redirecting)
- [Set up a custom domain](https://vercel.com/docs/domains/set-up-custom-domain)
- [Promoting deployments / Instant Rollback](https://vercel.com/docs/deployments/promoting-a-deployment)
- [Rollback CLI](https://vercel.com/docs/cli/rollback)
- [Environment variables](https://vercel.com/docs/environment-variables)
- [Verified proxy guidance](https://vercel.com/kb/guide/how-to-setup-verified-proxy)

### Convex

- [Using Convex with Vercel](https://docs.convex.dev/production/hosting/vercel)
- [Deploy CLI](https://docs.convex.dev/cli/reference/deploy)
- [Environment variables](https://docs.convex.dev/production/environment-variables)
- [`env` CLI](https://docs.convex.dev/cli/reference/env)
- [Safe production changes](https://docs.convex.dev/production/overview)
- [Mutations](https://docs.convex.dev/functions/mutation-functions)
- [Limits](https://docs.convex.dev/production/state/limits)
- [Backup & Restore](https://docs.convex.dev/database/backup-restore)
- [Data Import](https://docs.convex.dev/database/import-export/import)

### Cloudflare, web and standards

- [Cloudflare root-to-www redirect](https://developers.cloudflare.com/rules/url-forwarding/examples/redirect-root-to-www/)
- [Cloudflare Full (strict)](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/)
- [Papa Parse documentation](https://www.papaparse.com/docs)
- [W3C WCAG 2.2](https://www.w3.org/TR/wcag/)
- [WebKit Safari 17 HEIC support](https://webkit.org/blog/14445/webkit-features-in-safari-17-0/)
- [Google canonical URL guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)

---

*Phase: 7 — Endurecimento & Lançamento*  
*Research complete: 2026-07-25*
