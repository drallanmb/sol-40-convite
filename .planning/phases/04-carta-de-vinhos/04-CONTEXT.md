# Phase 4: Carta de Vinhos - Context

**Gathered:** 2026-07-24
**Status:** Revised — ready for Plan 04-05 execution

<domain>
## Phase Boundary

Entrega a Carta de Vinhos pública em uma rota dedicada, `/presentes`, com o catálogo de 37 rótulos persistido no Convex, seed reaproveitado do projeto anterior, estado reativo de disponibilidade e redirecionamento direto para o WhatsApp da vendedora Vanessa Alonso.

A fase também integra a Carta aos pontos públicos já existentes: link no header da home, uma prévia curada com três vinhos na home e um CTA exibido depois de qualquer salvamento bem-sucedido do RSVP.

Cobre GIFT-01 a GIFT-04.

**Fora do escopo desta fase:**
- Marcar, desfazer ou informar manualmente quem presenteou no dashboard → Phase 6 (`ADMIN-06`)
- Reserva temporária, expiração, checkout ou confirmação automática de compra → explicitamente fora do v1
- Teste final do `wa.me` em WebViews iOS/Android → Phase 7 (`LAUNCH-01`)
- Mural, upload de fotos e moderação → Phase 5

</domain>

<decisions>
## Implementation Decisions

### Destinos e pontos de entrada

- **D-01:** O catálogo completo vive em uma página dedicada, **`/presentes`**.
- **D-02:** O header da home ganha um link para `/presentes`.
- **D-03:** A home ganha uma dobra própria com **três rótulos intermediários, fixos e curados**, mais o CTA literal **“Ver a carta completa”**.
- **D-04:** Os três cards da home refletem o status real do Convex. Um card presenteado continua na amostra com esse estado; não é substituído automaticamente.
- **D-05:** Tocar em um card da amostra abre `/presentes` já posicionado ou destacado no rótulo correspondente, em vez de abrir o WhatsApp diretamente.
- **D-06:** Depois de **qualquer salvamento bem-sucedido do RSVP**, o convidado recebe um CTA para `/presentes`, mesmo quando todas as pessoas responderam “não vai”. O CTA aparece após o salvamento e não compete com o formulário antes da resposta.

### Organização e conteúdo do catálogo

- **D-07:** Manter as três faixas do catálogo anterior: **“Abaixo de R$ 200”**, **“De R$ 200 a R$ 350”** e **“De R$ 350 a R$ 500”**.
- **D-08:** As três faixas ficam abertas na mesma página. Atalhos no topo levam diretamente a cada faixa; não usar accordion.
- **D-09:** Dentro de cada faixa, ordenar por **preço crescente** e manter a posição estável quando o status de um vinho mudar.
- **D-10 (revisada em 2026-07-24):** Cada card mostra uma **representação autoral e neutra de garrafa**, nome, produtor, preço, descrição curta e código Mistral visível de forma discreta. A representação não é fotografia nem reprodução do rótulo.
- **D-11 (revisada em 2026-07-24):** Preservar integralmente os 37 registros comerciais do catálogo anterior — códigos, nomes, produtores, preços, categorias, tonalidades e descrições. `imageUrl`, manifest de fotos e arquivos de imagem deixam de ser requisito final e devem ser removidos do contrato público/infraestrutura quando for seguro.

### Direção visual

- **D-12:** `/presentes` reaproveita a identidade da adega anterior: fundo verde-escuro, cream, peach/coral e linguagem editorial, mas com **abertura compacta**, não um segundo hero alto.
- **D-13 (revisada em 2026-07-24):** Usar **uma única silhueta própria e neutra de garrafa**, baseada na direção visual aprovada, sem logos, tipografia de marca, rótulos copiados ou claims de fidelidade fotográfica. A mesma geometria é reutilizada nos 37 cards; somente a paleta decorativa muda.
- **D-14 (revisada em 2026-07-24):** Cada `productCode` recebe uma paleta própria de **dois hex muted**, aplicada como duas metades/áreas do halo e inspirada nas cores observadas em páginas oficiais ou fontes comerciais reputáveis do rótulo. Registrar a URL de referência e a data de consulta, mas nunca publicar, baixar, hotlinkar, scrapear ou copiar imagem, arte, logo ou composição do rótulo.
- **D-15 (revisada em 2026-07-24):** A grade do catálogo usa **1 coluna no mobile, 2 no tablet, 3 no desktop comum e 4 somente a partir de `1280px`**. A prévia fixa da home continua com no máximo três colunas porque contém exatamente três produtos.
- **D-16:** A prévia da home é um bloco verde-escuro completo, funcionando como porta de entrada visual para a adega e antecipando a linguagem de `/presentes`.

### WhatsApp e disponibilidade

- **D-17:** O botão literal **“Presentear pelo WhatsApp”** abre imediatamente o WhatsApp em nova aba ou no app, sem formulário ou confirmação intermediária.
- **D-18:** O destino canônico é Vanessa Alonso: **`wa.me/5511993709046`**.
- **D-19:** Mensagem pronta, com interpolação dos dados do card: **“Olá, Vanessa! Vim pelo convite da festa Sol faz 40 e gostaria de presentear a Sol com o vinho {nome} — cód. {código}, no valor de {preço}. Pode me orientar sobre o pagamento e a entrega?”**
- **D-20:** Clicar no WhatsApp **não reserva nem altera o vinho**. A introdução do catálogo explica brevemente que Vanessa confirma pagamento e entrega na conversa e que o status público muda depois da confirmação manual pelos donos.
- **D-21:** Um vinho marcado como presenteado permanece na posição original, com visual suavizado, selo literal **“Já escolhido com carinho”** e sem ação para o WhatsApp.
- **D-22:** O catálogo público reage às mudanças de status no Convex para reduzir repetição assim que os donos atualizarem o rótulo no dashboard.

### Claude's Discretion

- Escolha exata dos três rótulos intermediários da prévia, respeitando a seleção fixa/curada e usando produtos da faixa `200-350`.
- Copy complementar da abertura compacta e da nota operacional, mantendo o tom acolhedor e sem sugerir reserva.
- Dimensões exatas dos cards, halos e silhueta; transições sutis e estados de loading/erro, respeitando `prefers-reduced-motion` e acessibilidade AA.
- Estratégia técnica de deep link/destaque do vinho vindo da home, desde que use URL compartilhável e mantenha o rótulo acessível.
- Schema exato, seed idempotente e separação entre conteúdo comercial e estado mutável.
- Forma vetorial/CSS exata da silhueta neutra, desde que seja original, consistente com a referência aprovada e não contenha identidade visual de terceiros.
- Seleção exata dos dois hex muted de cada produto, desde que toda paleta tenha fonte URL registrada e passe os validadores definidos no plano.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Escopo e requisitos atuais

- `.planning/ROADMAP.md` § “Phase 4: Carta de Vinhos” — goal, dependência, requisitos e critérios de sucesso.
- `.planning/REQUIREMENTS.md` § “Presentes (Carta de Vinhos)” — GIFT-01 a GIFT-04 e fronteiras do v1.
- `.planning/PROJECT.md` — core value, stack, identidade visual, redirect para a Mistral e decisão de marcação manual.
- `.planning/STATE.md` — posição atual do milestone e decisões acumuladas.
- `.planning/phases/02-convite-p-blico/02-CONTEXT.md` — navegação pública e decisão de adicionar Presentes somente quando a seção existir.
- `.planning/phases/03-rsvp/03-CONTEXT.md` — fluxo `/confirmar`, salvamento parcial e pontos de integração seguros com o sucesso do RSVP.

### Fonte canônica do catálogo e da adega anterior

- `/Users/allanmesquitabrito/Documents/Site Sol 40 anos/sol-40-integrado/lib/wines.ts` — os 37 registros comerciais canônicos, três categorias, preços, códigos, descrições e tonalidades. Os caminhos históricos de imagem não são mais contrato final.
- `/Users/allanmesquitabrito/Documents/Site Sol 40 anos/sol-40-integrado/app/convite/EventSite.tsx` — `wineCategories`, estrutura anterior do catálogo e copy `GiftMessage`; usar como referência visual/conceitual sem ressuscitar reserva.
- `/Users/allanmesquitabrito/Documents/Site Sol 40 anos/sol-40-integrado/app/globals.css` §§ `.wine-*` e `.cellar-*` — grade, halos por tonalidade e identidade verde-escura da adega.
- `/Users/allanmesquitabrito/Documents/Site Sol 40 anos/sol-40-integrado/app/adega/page.tsx` — rota dedicada anterior, apenas como referência de composição.

### Projeto atual

- `convex/schema.ts` — schema atual de RSVP; ponto onde a tabela `wines` será adicionada sem alterar as invariantes existentes.
- `src/App.tsx` — roteamento React Router; ponto de integração de `/presentes`.
- `src/routes/Home.tsx` — composição atual da home; local da nova dobra, sem alterar a ordem das seções existentes além da inclusão acordada.
- `src/routes/Confirmar.tsx` — rota do RSVP; integração do CTA pós-salvamento.
- `src/components/rsvp/FamilyForm.tsx` — estados de sucesso/salvamento onde o CTA de presentes deve aparecer sem competir com o formulário.
- `src/components/layout/Shell.tsx` — navegação desktop/mobile compartilhada e suporte a links de rota.
- `src/content/event.ts` — fonte canônica atual de `NAV_LINKS`, `RSVP_NAV_LINKS` e copy pública.
- `src/components/ui/Button.tsx` — estilos e semântica de CTA reutilizáveis.
- `src/components/ui/Card.tsx` — primitivo de superfície; pode informar a estrutura, embora os cards da adega tenham linguagem própria.
- `src/index.css` — tokens pôr do sol, cores `sea`/`plum`/`cream` e contratos de acessibilidade.

### Direção visual aprovada

- `/Users/allanmesquitabrito/.codex/generated_images/019f9644-e00b-7f73-85a6-5f70928442f4/call_M6hysFZ2GBdBeROsuWq63oMA.png` — referência aprovada para a composição: garrafa neutra escura, área de rótulo sem marca e halo bipartido. É direção visual, não asset para publicação nem fonte de cores dos 37 produtos.

**Observação para execução:** o antigo manifest `public/wines/manifest.json`, `scripts/audit-wine-assets.mjs`, `imageUrl` público e estados de falha de imagem são infraestrutura obsoleta após esta revisão. A remoção precisa ser feita por diff direcionado, preservando todo código da Fase 5. Como já existem documentos `wines`, a migração dos quatro campos de paleta/provenance será feita em dois pushes: schema opcional de transição, backfill 37/37 com limpeza de `imageUrl`, e só então schema final obrigatório.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `Shell` e `NavigationAnchor`: já tratam rotas internas com React Router e renderizam a mesma navegação no desktop/mobile.
- `Button`/`buttonClassName`: cobrem CTAs sem duplicar estados de foco e toque.
- `Toast`: pode comunicar falhas de carregamento sem criar outro padrão de feedback.
- `FamilyForm`: já separa snapshot do servidor, rascunho e resultado do save; o CTA de presentes deve reagir ao sucesso real do backend.
- `ConvexProvider`: já envolve a aplicação inteira, então home e `/presentes` podem consumir a mesma query reativa.

### Established Patterns

- Conteúdo público e links ficam centralizados em `src/content/event.ts`; componentes não devem espalhar copy ou URLs.
- Rotas são declaradas em `src/App.tsx`; fragmentos da home usam IDs canônicos.
- Tailwind v4 mobile-first, com CSS custom apenas para arte/efeitos que utilitárias não representam bem.
- Funções Convex públicas e modelos auxiliares ficam separados; seeds de desenvolvimento anteriores são internal mutations idempotentes.
- Foco visível, alvos mínimos de 44px, contraste AA e `prefers-reduced-motion` são invariantes do projeto.

### Integration Points

- Adicionar a tabela `wines`, query pública e seed do catálogo ao backend Convex.
- Adicionar `/presentes` ao router e uma composição de rota própria.
- Acrescentar `/presentes` aos links apropriados da home e do RSVP.
- Inserir a prévia verde-escura na home sem duplicar os dados do catálogo no frontend.
- Expor um alvo estável por vinho para o deep link vindo da home.
- Preparar campos de status e autoria para o controle administrativo da Phase 6 sem construir o dashboard agora.

### Creative Options

- O campo `tone` pode permanecer como classificação comercial/fallback, mas a apresentação final usa a paleta de dois hex específica por `productCode`.
- A paleta deve viver na fonte canônica/Convex para que home e catálogo consumam exatamente as mesmas cores reativas, sem um segundo mapa frontend.
- Queries reativas do Convex permitem que home e catálogo mudem o selo imediatamente após a ação administrativa futura.
- O código Mistral fornece chave estável para seed idempotente, deep links e mensagem do WhatsApp.

</code_context>

<specifics>
## Specific Ideas

- A home deve parecer abrir uma porta para outra atmosfera: o convite claro dá lugar a uma adega verde-escura.
- Uma única silhueta autoral neutra ocupa o stage de todos os cards; cada produto se diferencia pelo halo de duas cores muted com provenance URL.
- A composição aprovada usa garrafa escura, rótulo abstrato sem texto/marca e círculo bipartido; não promete reproduzir formato, vidro ou rótulo reais.
- “Ver a carta completa”, “Presentear pelo WhatsApp” e “Já escolhido com carinho” são textos aprovados.
- A jornada pretendida é direta: escolher um rótulo, abrir a conversa com Vanessa e combinar pagamento/entrega.
- O número público aprovado da vendedora é `(11) 99370-9046`, normalizado no link como `5511993709046`.

</specifics>

<deferred>
## Deferred Ideas

- Controle administrativo de presentes — marcar/desfazer “presenteado” e registrar quem escolheu → Phase 6 (`ADMIN-06`).
- Testes reais de `wa.me` em Safari/Chrome e WebViews de Instagram/Facebook → Phase 7 (`LAUNCH-01`).
- Atualização automática por webhook da Mistral ou reserva temporária → fora do v1; somente reconsiderar em milestone futuro.

</deferred>

---

*Phase: 4-Carta de Vinhos*
*Context gathered: 2026-07-24*
