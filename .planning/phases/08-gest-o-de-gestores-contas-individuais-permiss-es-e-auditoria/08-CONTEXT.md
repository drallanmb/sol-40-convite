# Phase 8: Gestão de Gestores - Context

**Gathered:** 2026-07-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Substitui o uso cotidiano da senha administrativa compartilhada por contas
individuais no `/admin`. A fase entrega ativação e redefinição por links
temporários, três papéis fixos, sessões identificadas e revogáveis, gestão de
contas pelo proprietário e auditoria das alterações administrativas.

Também permite que Vanessa, como vendedora, opere exclusivamente Presentes e
marque uma garrafa depois da confirmação do pagamento. Isso reutiliza o fluxo
de presente já existente; não cria checkout, reserva, cobrança, entrega nem um
sistema geral de pedidos.

**Fora do escopo desta fase:**

- Login ou contas para convidados.
- Envio automático de e-mail, SMS ou WhatsApp para ativação e recuperação.
- Checkout, captura de pagamento, reserva temporária ou gestão de entrega.
- Papéis personalizados, permissões por usuário ou promoção de outro
  proprietário.
- Telão, QR das mesas e Instagram/Apify.

</domain>

<decisions>
## Implementation Decisions

### Criação, ativação e recuperação

- **D-01:** Contas individuais usam e-mail como identificador de login.
- **D-02:** O proprietário cria gestores dentro do `/admin`; o painel gera um
  link de ativação para a própria pessoa definir a senha.
- **D-03:** Links de ativação e redefinição são de uso único, expiram em
  **72 horas** e podem ser invalidados e regenerados pelo proprietário.
- **D-04:** Recuperação de gestor não envia e-mail automaticamente. O
  proprietário gera e compartilha o link de redefinição pelo canal que
  escolher.
- **D-05:** Uma redefinição iniciada pelo proprietário encerra todas as
  sessões existentes da conta.
- **D-06:** Contas iniciais:
  - Allan — `allanmesquitab@gmail.com` — Proprietário.
  - Soraya — `sorayathorsjo@outlook.com` — Gestora.
  - Guga — `gugart@hotmail.com` — Gestor.
  - Vanessa — `vanessa.alonso@mistral.com.br` — Vendedora.

### Papéis e autorização

- **D-07:** Há exatamente três papéis fixos: **Proprietário**, **Gestor** e
  **Vendedora**. Não existem permissões individuais ou exceções por conta.
- **D-08:** Existe um único Proprietário. Allan usa sua conta individual no
  cotidiano e é o único que cria, ativa, desativa e reativa contas, gera
  redefinições, revoga acessos e consulta a auditoria.
- **D-09:** Gestores operam Visão geral, Convidados, Moderação e Presentes,
  mas não acessam gestão de contas, redefinições de terceiros, revogação
  global ou auditoria.
- **D-10:** A Vendedora acessa exclusivamente Presentes. Pode visualizar
  disponíveis e compras confirmadas, marcar, corrigir e desfazer compras.
- **D-11:** Toda autorização é aplicada no backend. Ocultar uma seção no
  React não é considerado proteção.
- **D-12:** A conta proprietária não pode ser desativada, excluída nem mudar
  de papel. Allan pode alterar o próprio e-mail somente autenticado e após
  confirmar a senha atual.

### Sessões e revogação

- **D-13:** Mantém-se a expiração absoluta de **sete dias**, sem renovação
  deslizante, definida na Phase 6.
- **D-14:** Uma conta pode ter várias sessões simultâneas. Cada aparelho
  aparece como uma sessão identificada e revogável separadamente.
- **D-15:** Cada pessoa visualiza e encerra as próprias sessões; o
  Proprietário visualiza e encerra qualquer sessão.
- **D-16:** Quando a pessoa troca a própria senha já autenticada, a sessão
  atual permanece e todas as outras são encerradas.
- **D-17:** Quando o Proprietário inicia uma redefinição, todas as sessões da
  conta são encerradas.
- **D-18:** Revogar uma conta significa desativá-la sem apagar: encerrar
  sessões, invalidar links pendentes e bloquear login, preservando sua
  identidade no histórico. A reativação exige um novo link.

### Transição da senha compartilhada

- **D-19:** A primeira conta proprietária nasce em uma configuração única no
  `/admin`: Allan autentica com a senha-mestra, confirma
  `allanmesquitab@gmail.com` e recebe o link de ativação de 72 horas.
- **D-20:** As sessões legadas da senha compartilhada continuam válidas
  apenas até Allan ativar a nova conta. A ativação revoga todas elas de uma
  vez.
- **D-21:** Depois da ativação, a senha-mestra desaparece do login normal e
  fica reservada a uma superfície separada de recuperação.
- **D-22:** A recuperação mestra pode somente encerrar as sessões do
  Proprietário e gerar um link de redefinição para o e-mail proprietário
  atual. Não abre dados da festa nem administra contas de terceiros.

### Operação de Presentes pela Vanessa

- **D-23:** Um vinho sai de Disponível somente quando Vanessa confirma o
  pagamento. Conversa ou pedido no WhatsApp não bloqueia a garrafa.
- **D-24:** Ao confirmar, Vanessa informa o nome do presenteador e pode
  acrescentar uma observação. Data, hora e autora da ação são automáticas.
- **D-25:** Telefone, valor, meio de pagamento e outros dados de cobrança não
  são armazenados.
- **D-26:** O catálogo público preserva a copy aprovada **“Já escolhido com
  carinho”**. O card continua visível e suavizado, sem ação para WhatsApp e
  sem expor o nome do presenteador.
- **D-27:** No painel, o estado pode usar a linguagem operacional **“Compra
  confirmada”**.
- **D-28:** Vanessa pode corrigir nome e observação sem tornar o vinho
  disponível. A auditoria registra antes e depois. Desfazer continua reservado
  ao caso em que a garrafa realmente deve voltar ao catálogo.

### Auditoria

- **D-29:** A auditoria registra eventos de login e segurança, ativação,
  troca e redefinição de senha, sessões e revogações, gestão de contas e todas
  as alterações em convidados, moderação e presentes.
- **D-30:** Visualizações de páginas, consultas e buscas comuns não são
  auditadas.
- **D-31:** Alterações guardam os campos modificados com valores anteriores e
  novos. Senhas, tokens e links secretos nunca são persistidos; informações
  sensíveis são omitidas ou mascaradas.
- **D-32:** Registros expiram automaticamente depois de **120 dias**.
- **D-33:** Somente o Proprietário acessa a página **Auditoria** no `/admin`,
  ordenada do evento mais recente ao mais antigo, com filtros por pessoa,
  área, tipo de ação e período e detalhes expansíveis.

### Experiência por papel

- **D-34:** Proprietário e Gestores entram na Visão geral; Vanessa entra
  diretamente em Presentes. Depois de reautenticar, destinos e filtros ainda
  válidos são restaurados.
- **D-35:** A navegação mostra somente seções permitidas. Uma URL sem
  permissão também é negada no servidor e redireciona ao primeiro destino
  válido daquele papel.
- **D-36:** O Proprietário vê as quatro áreas operacionais mais **Gestores** e
  **Auditoria**; Gestores veem as quatro áreas atuais; Vanessa vê somente
  **Presentes**.
- **D-37:** **Minha conta**, no menu do usuário, reúne nome, e-mail, papel,
  troca de senha, aparelhos conectados e logout sem ocupar a navegação
  principal.
- **D-38:** O shell mostra nome e papel, por exemplo
  **“Vanessa · Vendedora”**. O e-mail aparece somente em Minha conta.

### Claude's Discretion

- Hash e política técnica de senha, formato dos tokens, identificação segura
  de aparelho e estratégia de migração do schema, respeitando as decisões de
  sessão, privacidade e revogação acima.
- Layout e microcopy exatos das telas de Gestores, Minha conta, recuperação e
  Auditoria.
- Schema, paginação, índices e rotina de expiração da auditoria.
- Quais metadados não sensíveis de login/sessão ajudam a identificar um
  aparelho sem criar rastreamento desnecessário.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Escopo e decisões

- `.planning/ROADMAP.md` § “Phase 8: Gestão de gestores — contas individuais,
  permissões e auditoria” — objetivo e dependência da fase.
- `.planning/PROJECT.md` — contas individuais como evolução da senha
  compartilhada, core value e fronteiras do produto.
- `.planning/REQUIREMENTS.md` — contratos validados do dashboard e itens
  explicitamente fora do escopo.
- `.planning/STATE.md` — posição do milestone e todo pendente da Phase 8.
- `.planning/phases/06-dashboard-interno-admin/06-CONTEXT.md` — sessão
  absoluta de sete dias, privacidade pré-auth, shell e quatro áreas
  operacionais.
- `.planning/phases/07-endurecimento-lan-amento/07-CONTEXT.md` — senha de
  produção, isolamento de ambientes e situação pós-lançamento.
- `.planning/phases/04-carta-de-vinhos/04-CONTEXT.md` — contrato canônico de
  Presentes e copy “Já escolhido com carinho”.

### Autenticação e painel atuais

- `convex/schema.ts` — tabela atual `adminSessions` e tabelas operacionais.
- `convex/adminAuth.ts` — login pela senha-mestra, criação, status e logout
  da sessão compartilhada.
- `convex/adminSecurity.ts` — hashing de capabilities e guarda
  `requireAdminSession`.
- `convex/adminModel.ts` — TTL absoluto atual e validadores do ciclo de
  sessão.
- `src/routes/Admin.tsx` — máquina de estado cliente, persistência local,
  revalidação, expiração e logout.
- `src/components/admin/AdminShell.tsx` — shell responsivo, navegação e
  integração das quatro áreas protegidas.
- `src/content/admin.ts` — rotas, itens de navegação, destinos canônicos e
  copy administrativa.

### Presentes

- `src/content/gifts.ts` — copy pública implementada, incluindo “Já escolhido
  com carinho”.
- `src/components/admin/AdminGifts.tsx` — operação atual de marcar/desfazer e
  ponto de integração da Vendedora.
- `convex/adminWines.ts` — mutations protegidas atuais de Presentes.
- `convex/wineModel.ts` — estados `available` e `gifted`.
- `convex/wineOperations.ts` — invariantes entre status, presenteador e data.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `adminSessions`, `adminAuth` e `adminSecurity`: já oferecem capabilities
  opacas, hash server-side, expiração absoluta, logout e falha fechada.
- `Admin.tsx`: já limpa dados sensíveis em expiração/revogação e reage a
  logout em outra aba.
- `AdminShell`: já resolve desktop/mobile, restaura destino e consulta dados
  somente depois do gate.
- `AdminGifts` e `adminWines`: já possuem marcação, desfazer, concorrência e
  atualização reativa do catálogo público.
- `Button`, `Field`, `Card`, `Toast` e `AdminConfirmDialog`: cobrem as novas
  telas e confirmações sem outro kit visual.

### Established Patterns

- Toda porta administrativa recebe uma capability e valida autorização no
  Convex antes de ler ou escrever.
- O cliente guarda apenas o token opaco; o banco guarda somente seu hash.
- Sessões têm expiração absoluta de sete dias e limpeza agendada.
- Alterações administrativas são reativas e usam respostas discriminadas,
  proteção de concorrência e feedback recuperável.
- Tailwind v4 mobile-first, foco visível, alvos de toque de 44px, contraste AA
  e `prefers-reduced-motion` permanecem invariantes.

### Integration Points

- Associar `adminSessions` a contas e metadados de sessão; a guarda
  compartilhada precisa devolver ator e papel para todas as funções.
- Acrescentar contas, links de ativação/redefinição e eventos de auditoria ao
  schema com índices para login, revogação, filtros e expiração.
- Adaptar `Admin.tsx` para login por e-mail/senha, bootstrap único e
  recuperação mestra isolada.
- Tornar rotas, navegação e queries do `AdminShell` conscientes do papel,
  mantendo autorização duplicada no backend.
- Adicionar Gestores, Auditoria e Minha conta sem ocupar os quatro destinos
  móveis operacionais dos Gestores.
- Estender Presentes com observação e edição sem transição de status; manter
  a projeção pública sem identidade do presenteador.

</code_context>

<specifics>
## Specific Ideas

- O cadastro de gestores e a geração dos links devem acontecer visualmente no
  próprio `/admin`.
- Vanessa deve trabalhar numa experiência estreita: entra diretamente em
  Presentes e vê no shell **“Vanessa · Vendedora”**.
- A linguagem pública afetiva **“Já escolhido com carinho”** é canônica e não
  deve ser substituída pela linguagem comercial interna.
- A senha-mestra é uma chave de recuperação do único proprietário, não uma
  identidade administrativa paralela.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 08-Gestão de Gestores*
*Context gathered: 2026-07-25*
