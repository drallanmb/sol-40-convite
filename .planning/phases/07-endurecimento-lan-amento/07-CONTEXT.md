# Phase 7: Endurecimento & Lançamento - Context

**Gathered:** 2026-07-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Entrega o lançamento do v1 em `https://www.sol40.com.br`: prepara a
configuração definitiva de Vercel, Convex e Cloudflare; fecha origem
canônica, senha e metadados de produção; acrescenta importação da lista real
de convidados por CSV; executa o gate técnico e os smokes no ambiente real; e
mantém uma matriz pós-lançamento para testes em dispositivos físicos.

A publicação não depende de aparelhos iOS/Android estarem disponíveis. O
site pode entrar no ar depois do gate técnico automatizado e do smoke de
produção, mas o link do convite só deve ser enviado depois que a lista real
for importada e revisada.

**Fora do escopo desta fase:**

- Telão, QR das mesas e Instagram/Apify, que continuam no milestone v2.
- Checkout ou confirmação automática de presentes.
- Contas individuais, novos papéis administrativos ou outro modelo de auth.
- Novas capacidades públicas além dos ajustes necessários para lançar e
  verificar o v1 existente.

</domain>

<decisions>
## Implementation Decisions

### Domínio, produção e divulgação

- **D-01:** O endereço canônico é **`https://www.sol40.com.br`**.
- **D-02:** A origem sem `www`, **`https://sol40.com.br`**, deve redirecionar
  permanentemente para a origem canônica, preservando caminho e query.
- **D-03:** O domínio já está delegado à Cloudflare pelos nameservers
  `ainsley.ns.cloudflare.com` e `cody.ns.cloudflare.com`; faltam os registros
  que conectam a zona ao projeto Vercel. Não planejar nova troca de
  nameservers.
- **D-04:** O projeto ainda não está vinculado localmente à Vercel. A fase
  inclui criar ou vincular o projeto Vercel, configurar o deployment Convex
  de produção e conectar os dois hostnames.
- **D-05:** Codex deve conduzir automaticamente Vercel e Cloudflare usando as
  sessões já autenticadas, interrompendo somente para login, confirmação de
  segurança ou escolha externa que dependa do dono.
- **D-06:** Assim que o gate técnico e o primeiro smoke passarem, o domínio
  pode ficar público. Não é necessário aguardar os testes em dispositivos
  físicos.
- **D-07:** O link do convite não deve ser enviado aos convidados até a lista
  real ter sido importada e revisada. Isso evita divulgar um RSVP que ainda
  responderia “convite não encontrado”.
- **D-08:** A origem canônica deve substituir as pendências de metadados e
  settings de produção, incluindo `og:url`, `og:image` absoluto e qualquer
  contrato equivalente de `PUBLIC_ORIGIN`. O planejamento deve usar apenas
  variáveis realmente consumidas pela stack atual.

### Testes reais pós-lançamento

- **D-09:** Antes dos aparelhos físicos, executar smoke técnico no site
  publicado. iPhones e Androids entram numa matriz viva conforme estiverem
  disponíveis.
- **D-10:** Cada execução real registra modelo do aparelho, sistema,
  navegador ou WebView, fluxos executados, resultado e correção necessária.
- **D-11:** A jornada pública desejada em cada plataforma abrange convite,
  countdown, RSVP, WhatsApp e envio de memória. O `/admin` deve ser validado
  em pelo menos um celular quando houver aparelho disponível.
- **D-12:** Testes em dispositivo físico são uma obrigação pós-lançamento,
  mas não são gate para apontar o domínio nem para manter o site publicado.
- **D-13:** Problemas de RSVP, WhatsApp, upload, login, disponibilidade ou
  exposição de dados recebem correção imediata em produção. Diferenças apenas
  visuais entram numa lista priorizada.
- **D-14:** Quando a disponibilidade permitir, a matriz deve cobrir Safari e
  WebView em iPhone, Chrome e WebView em Android, upload HEIC/HEIF no Safari e
  countdown com fuso do aparelho alterado.

### Lista real de convidados

- **D-15:** O `/admin` continua permitindo criar, editar e remover famílias
  individualmente. A fase acrescenta **upload de CSV com prévia** para entrada
  em massa.
- **D-16:** O formato mínimo usa uma pessoa por linha e as colunas
  `familia`, `telefone` e `convidado`. Linhas com a mesma família e o mesmo
  telefone são agrupadas no mesmo convite.
- **D-17:** Todas as pessoas importadas começam com presença **Pendente**; o
  CSV não define respostas.
- **D-18:** A prévia deve mostrar agrupamento, normalização e problemas antes
  da confirmação, mas a gravação é parcial: importa famílias/linhas válidas e
  ignora inválidas.
- **D-19:** O resultado da importação precisa informar famílias e pessoas
  criadas, linhas ignoradas, número de cada linha e motivo. Conflitos com
  famílias existentes não devem sobrescrever dados automaticamente.
- **D-20:** A lista ainda não está disponível. A funcionalidade deve oferecer
  um modelo de CSV para download e permanecer útil quando o dono montar a
  lista posteriormente.

### Gate, acompanhamento e contingência

- **D-21:** O gate mínimo antes de apontar ou liberar o domínio exige suíte
  automatizada e build verdes, HTTPS válido, frontend conectado ao Convex de
  produção, home/RSVP/login admin carregando e nenhuma consulta ou informação
  administrativa exposta sem sessão.
- **D-22:** Depois do deploy, executar um smoke imediatamente e outra
  conferência quando DNS, `www` e o redirecionamento do apex estiverem
  propagados e estáveis.
- **D-23:** Correções podem ser feitas com o site no ar. Se uma nova versão
  piorar produção e houver uma versão anterior saudável, fazer rollback
  imediato enquanto a correção é preparada.
- **D-24:** Antes da primeira importação real ou de alterações materiais em
  dados de produção, criar um ponto de recuperação ou exportação verificável.
- **D-25:** “Quebrar no ar” significa tratar como incidente e corrigir; não é
  razão para manter indefinidamente o lançamento bloqueado depois que o gate
  curto passou.

### Decisões herdadas

- **D-26:** Produção e preview permanecem em deployments Convex separados;
  `CONVEX_DEPLOY_KEY` é server/build-only e `ADMIN_PASSWORD` vive somente no
  ambiente Convex.
- **D-27:** A senha de produção deve ser forte, inédita e mantida fora do
  repositório e do bundle cliente.
- **D-28:** O countdown continua usando limites qualificados com `-03:00`; o
  prazo de 30/09 é informativo e não bloqueia edição posterior do RSVP.
- **D-29:** Os rate limits públicos e do login já existem. A fase os audita em
  condições de produção e só os altera quando houver evidência, mantendo
  feedback recuperável ao usuário.

### Claude's Discretion

- Estratégia técnica exata de vínculo Vercel/Cloudflare, registros DNS
  recomendados pela Vercel, SSL e implementação do redirect, desde que D-01 a
  D-05 sejam cumpridas.
- Parser CSV, encoding suportado, normalização de cabeçalhos, layout da prévia
  e do relatório, respeitando D-15 a D-20 e as proteções existentes de
  concorrência/autorização.
- Forma do registro da matriz de dispositivos e da evidência dos smokes.
- Valores finais de rate limit só podem mudar com justificativa e testes; não
  ampliar ou reduzir limites por preferência arbitrária.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Escopo e decisões do projeto

- `.planning/ROADMAP.md` § “Phase 7: Endurecimento & Lançamento” — objetivo,
  dependência, critérios de sucesso e decomposição inicial.
- `.planning/REQUIREMENTS.md` § “Endurecimento & Lançamento” — LAUNCH-01 a
  LAUNCH-04.
- `.planning/PROJECT.md` — core value, stack, fronteira do v1 e origem do
  checklist antigo.
- `.planning/STATE.md` — posição atual do milestone e pendências de domínio e
  lista.
- `.planning/phases/06-dashboard-interno-admin/06-CONTEXT.md` — invariantes
  do admin, sessão, CRUD de famílias e privacidade pré-auth.
- `.planning/phases/05-mural-de-mem-rias-modera-o/05-CONTEXT.md` — contrato
  do upload, HEIC/HEIF, preservação de rascunho e moderação.
- `.planning/phases/04-carta-de-vinhos/04-CONTEXT.md` — contrato do `wa.me` e
  teste em WebViews explicitamente transferido para esta fase.

### Deploy e produção atuais

- `DEPLOY.md` — pipeline Vercel + Convex, separação preview/produção e
  localização correta dos segredos.
- `vercel.json` — build encadeado com Convex, saída Vite e rewrite SPA.
- `.env.example` — contrato documentado de `VITE_CONVEX_URL`,
  `CONVEX_DEPLOY_KEY` e `ADMIN_PASSWORD`, sem valores reais.
- `index.html` — metadados sociais ainda relativos e comentário que transfere
  a origem absoluta para a fase 7.
- `src/content/event.ts` — datas canônicas, offset `-03:00`, prazo informativo
  e URLs/copy públicas.

### Importação e operação

- `src/components/admin/AdminGuests.tsx` — interface atual de famílias e ponto
  de integração da importação CSV.
- `convex/adminRsvps.ts` — mutations protegidas existentes para famílias,
  pessoas, unicidade, concorrência e revogação RSVP.
- `src/lib/adminGuestDraft.ts` — reconciliação e proteção de rascunhos no
  admin.
- `src/lib/phone.ts` — normalização canônica de telefones brasileiros.
- `convex/rsvpRateLimits.ts` — limites atuais do RSVP.
- `convex/postRateLimits.ts` — limites atuais de memórias/upload.
- `convex/adminRateLimits.ts` — limite atual do login administrativo.

### Upload e testes reais

- `src/lib/imageProcessing.ts` — seleção, decode/downscale e fallback atual de
  HEIC/HEIF.
- `src/components/memories/PhotoPicker.tsx` — formatos aceitos e copy pública.
- `convex/uploadValidation.ts` — validação server-side e rejeição de HEIC não
  convertido.
- `src/lib/wineWhatsApp.ts` — composição do destino `wa.me`.

### Referência operacional anterior

- `/Users/allanmesquitabrito/Documents/Site Sol 40 anos/sol-40-integrado/docs/checklist-donos.md`
  — base histórica do checklist; usar apenas itens ainda pertencentes ao v1
  atual. Ignorar moderadora, Apify, Instagram, QR e telão.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `AdminGuests`: já oferece operação família por família; a importação deve
  complementar essa tela, não criar outro painel.
- `adminRsvps`: concentra autorização e invariantes de família/pessoa; o CSV
  deve usar um writer protegido com semântica equivalente.
- `normalizePhone`: evita que formatos diferentes de telefone criem famílias
  duplicadas.
- `Toast`, `Card`, `Button`, `Field` e `AdminConfirmDialog`: cobrem prévia,
  confirmação, progresso e relatório sem um novo kit visual.
- A suíte Vitest/convex-test existente cobre backend, reducers e contratos
  públicos; o gate de lançamento pode estendê-la.

### Established Patterns

- Deploy de produção usa `npx convex deploy --cmd 'npm run build'`; a URL
  Convex do cliente é injetada pelo build.
- Queries administrativas só montam abaixo do gate de sessão e falham
  fechadas.
- Mutations de convidados usam revisões/ownership por registro; importação não
  pode contornar essas garantias.
- Fluxos públicos preservam rascunho em falhas e retornam estados de rate
  limit recuperáveis.
- Tailwind v4 mobile-first, alvos mínimos de 44px, foco visível,
  `prefers-reduced-motion` e contraste AA são invariantes.

### Integration Points

- Acrescentar importação CSV à área Convidados em
  `src/components/admin/AdminGuests.tsx`.
- Criar parser/validador puro e testável em `src/lib/`, separado do writer
  Convex protegido.
- Acrescentar mutation protegida e limitada para importação parcial em
  `convex/adminRsvps.ts` ou módulo administrativo dedicado.
- Atualizar `index.html` e settings de produção com
  `https://www.sol40.com.br`.
- Vincular GitHub/Vercel, Convex de produção e Cloudflare sem alterar a
  separação de ambientes.
- Produzir evidência de gate, smoke, DNS, rollback e matriz pós-lançamento na
  documentação da fase.

</code_context>

<specifics>
## Specific Ideas

- O usuário quer que a configuração de Cloudflare e Vercel seja executada
  automaticamente pelas sessões autenticadas, não apenas descrita num guia.
- O site pode ser público antes da lista, mas sua divulgação aos convidados
  espera a importação e a revisão.
- A lista será montada mais tarde; por isso o importador precisa de template
  claro e a entrada manual família por família deve continuar disponível.
- O lançamento privilegia continuidade: corrigir no ar e usar rollback para
  manter uma versão saudável acessível.

</specifics>

<deferred>
## Deferred Ideas

- Telão/slideshow, QR das mesas e Instagram/Apify permanecem no milestone v2.

</deferred>

---

*Phase: 7-Endurecimento & Lançamento*
*Context gathered: 2026-07-25*
