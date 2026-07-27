---
name: "Sol faz 40"
description: "Pôr-do-sol-se: um convite editorial, solar e sergipano para celebrar os 40 anos da Sol."
colors:
  cream: "#FFF3DF"
  card: "#FFFAF1"
  sand: "#F6DFC3"
  peach: "#F3A271"
  coral: "#EE6A50"
  orange: "#D94F29"
  plum: "#35192A"
  wine: "#6D253A"
  ink: "#2B1822"
  sea: "#1F4650"
  cellar: "#263F3E"
  gifted: "#B3C8B0"
  sun: "#FFB55D"
  sky-dusk: "#CF755F"
  sky-coral: "#ED684A"
typography:
  display:
    fontFamily: "Alegreya Variable, Georgia, Times New Roman, serif"
    fontSize: "clamp(5rem, 9vw, 7.25rem)"
    fontWeight: 400
    lineHeight: 0.9
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Alegreya Variable, Georgia, Times New Roman, serif"
    fontSize: "clamp(3rem, 5.25vw, 4.875rem)"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Alegreya Variable, Georgia, Times New Roman, serif"
    fontSize: "clamp(1.5rem, 1.35rem + 0.4vw, 1.75rem)"
    fontWeight: 600
    lineHeight: 1.2
  routeTitle:
    fontFamily: "Alegreya Variable, Georgia, Times New Roman, serif"
    fontSize: "3rem"
    fontWeight: 400
    lineHeight: 0.95
  adminTitle:
    fontFamily: "Alegreya Variable, Georgia, Times New Roman, serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.08
  body:
    fontFamily: "Gabarito Variable, Arial, Helvetica, sans-serif"
    fontSize: "clamp(1rem, 0.96rem + 0.18vw, 1.125rem)"
    fontWeight: 400
    lineHeight: 1.62
  label:
    fontFamily: "Gabarito Variable, Arial, Helvetica, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.1em"
rounded:
  none: "0px"
  operational: "8px"
  surface: "12px"
  pill: "100px"
  circle: "9999px"
spacing:
  2xs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.orange}"
    textColor: "{colors.cream}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "16px 24px"
    height: "44px"
  button-quiet:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.plum}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "16px 24px"
    height: "44px"
  button-hero-secondary:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.plum}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "16px 24px"
    height: "44px"
  card-public:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "24px"
  field-outline:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.operational}"
    padding: "12px"
    height: "44px"
  venue-card:
    backgroundColor: "{colors.plum}"
    textColor: "{colors.cream}"
    rounded: "{rounded.none}"
    padding: "16px"
---

# Design System: Sol faz 40

## 1. Overview

**Creative North Star: "Pôr-do-sol-se"**

“Pôr-do-sol-se” é um convite para entrar no clima antes mesmo da festa. A experiência combina o calor cromático do entardecer sergipano com a disciplina de um cartaz editorial: grandes massas de cor, serifas expressivas, rótulos precisos e ritmo generoso. O resultado deve parecer autoral, celebratório e íntimo — nunca uma landing page genérica.

A interface pública privilegia narrativa, emoção e movimento lento. A área administrativa reutiliza a mesma identidade, mas reduz ornamento, arredondamento e escala para favorecer operação. Em ambos os registros, contraste, foco visível, alvos mínimos de 44px e comportamento responsivo são requisitos de produto.

**Key Characteristics:**

- Pôr do sol como material visual, não como ilustração decorativa isolada.
- Alegreya para emoção e Gabarito para clareza operacional.
- Plum, coral, laranja e amarelo-sol como assinatura; cream como campo de leitura.
- Composições planas com sombras estruturais raras e deliberadas.
- Movimento lento no cenário e rápido nas respostas de interface.
- Mobile-first, sem overflow e sem esconder conteúdo atrás do chrome fixo.

**The Two Registers Rule.** Convite público é editorial e expressivo; administração é compacta e operacional. A marca permanece, mas a densidade muda.

**The Sunset Material Rule.** Céu, sol, mar e horizonte usam tokens semânticos. Cores literais novas são proibidas dentro de SVGs ou componentes ilustrados.

## 2. Colors

A paleta parte do vinho profundo e atravessa coral, damasco e amarelo-sol, equilibrada por cream e pelo verde-mar de contraste.

### Primary

- **Vinho Noturno** (`plum`): fundo de alto impacto, navegação de contraste, footer, countdown e ações RSVP.
- **Laranja Solar** (`orange`): ação primária e energia de conversão.
- **Coral do Horizonte** (`coral`): foco, seleção, ênfase tipográfica e estados interativos.

### Secondary

- **Pêssego de Luz** (`peach`): rótulos sobre fundos escuros e detalhes de aproximação.
- **Mar de Aracaju** (`sea`): contraste frio, confirmação e foco reforçado.
- **Vinho de Resposta** (`wine`): recusas, erros e ações destrutivas.

### Tertiary

- **Sol Cheio** (`sun`): disco solar do footer e materiais ilustrados.
- **Céu de Duna** (`sky-dusk`) e **Céu Coral** (`sky-coral`): gradientes atmosféricos de hero e footer.
- **Adega Profunda** (`cellar`): universo dedicado à carta de vinhos.

### Neutral

- **Cream Luminoso** (`cream`): fundo principal e texto reverso.
- **Cartão Claro** (`card`): formulários, cartões e superfícies de leitura.
- **Areia Estrutural** (`sand`): sombra deslocada e separação tonal.
- **Tinta Ameixa** (`ink`): texto principal sobre superfícies claras.

**The Plum Anchor Rule.** Toda tela pública precisa de um ponto de ancoragem plum; ele organiza a paleta e impede que coral e laranja virem ruído.

**The Semantic State Rule.** Confirmação usa sea, pendência usa marrom dedicado e recusa/erro usa wine. Verde genérico não representa RSVP.

## 3. Typography

**Display Font:** Alegreya Variable (Georgia, Times New Roman, serif)
**Body Font:** Gabarito Variable (Arial, Helvetica, sans-serif)
**Label Font:** Gabarito Variable

**Character:** Alegreya carrega a voz humana, festiva e editorial; Gabarito mantém navegação, dados e formulários legíveis. O contraste entre famílias é parte essencial da identidade.

### Hierarchy

- **Display** (400, `clamp(5rem, 9vw, 7.25rem)`, 0.9): nome “Sol” e momentos de marca de escala máxima.
- **Headline** (400, `clamp(3rem, 5.25vw, 4.875rem)`, 1.02): títulos principais das seções.
- **Title** (600, `clamp(1.5rem, 1.35rem + 0.4vw, 1.75rem)`, 1.2): cartões editoriais, programação e títulos operacionais importantes.
- **Route title** (400, `3rem`, 0.95): abertura das rotas públicas secundárias.
- **Admin title** (700, `2rem`, 1.08): título fixo e consistente de todas as áreas operacionais.
- **Body** (400, `clamp(1rem, 0.96rem + 0.18vw, 1.125rem)`, 1.62): texto corrido, limitado a aproximadamente 65–75 caracteres por linha.
- **Label** (700, `0.8125rem`, `0.1em`, uppercase): navegação, kickers, unidades e ações curtas.

**The Serif Leads Rule.** Alegreya conduz títulos, números celebratórios e frases emocionais; Gabarito conduz instrução, navegação, status e entrada de dados.

**The Display Restraint Rule.** Letter-spacing de display nunca ultrapassa `-0.025em`; títulos devem equilibrar linha antes de ganhar tamanho.

## 4. Elevation

O sistema é plano por padrão. Profundidade vem da alternância de massas cromáticas, sobreposição do sol e sombra deslocada sólida. Sombras difusas aparecem apenas no chrome fixo e em estados que realmente flutuam.

### Shadow Vocabulary

- **Sombra Editorial** (`14px 14px 0 var(--color-sand)`): cartões públicos e login; comunica impressão deslocada, não elevação física.
- **Chrome Fixo** (`0 4px 8px rgba(53,25,42,0.10–0.12)`): topbar e countdown rail quando estão sobre conteúdo.
- **Sem Sombra** (`none`): cartões operacionais, feedbacks, campos e card do local sobre o mapa.

**The Flat-by-Default Rule.** Bordas e cor devem resolver a hierarquia antes de qualquer sombra.

**The One Shadow Language Rule.** Nunca combinar borda fina com sombra difusa larga. Cartões públicos usam sombra deslocada sólida; chrome usa no máximo 8px de blur.

## 5. Components

### Buttons

- **Shape:** pílula completa (`100px`) no convite; cantos operacionais (`8px`) no admin.
- **Primary:** laranja sobre cream, `24px × 16px`, texto Gabarito bold uppercase.
- **Hover / Focus:** plum no hover, compressão `0.98` no active, foco coral global; RSVP usa outline sea de 3px.
- **Quiet:** transparente com borda plum de 1px; não recebe sombra.
- **Hero secondary:** “Ver programação” usa fundo cream, texto e borda plum para permanecer legível sobre céu, horizonte ou mar.
- **Minimum target:** `44px` em qualquer variante.

### Cards / Containers

- **Corner Style:** superfícies públicas são retas; admin pode usar `8px`.
- **Background:** card sobre cream; plum sobre mapa e em áreas de contraste.
- **Shadow Strategy:** sombra editorial deslocada apenas em cartões públicos selecionados.
- **Border:** linha plum com 18% de opacidade quando necessária.
- **Internal Padding:** `24px` mobile e `32px` em telas maiores; operacional usa `16–24px`.

### Inputs / Fields

- **Style:** underline transparente no convite ou outline de `8px` em contextos operacionais.
- **Focus:** borda coral e outline global de 2px com offset de 3px.
- **Placeholder:** wine com contraste legível; hints usam caption sem tracking.
- **Textarea:** mínimo de `110px`, redimensionamento vertical.
- **Paired action:** quando um campo divide a linha com um botão, remove apenas a margem externa do container; controle e ação alinham pela base com alvo mínimo de `44px`.

### Feedback

- **Style:** borda completa de 1px e fundo tonal discreto; nunca faixa lateral.
- **State:** neutral usa plum, success usa sea, warning usa marrom de pendência e error usa wine.
- **Shape:** reto no convite, acompanhando a geometria editorial.

### Navigation

- **Topbar:** 72px, wordmark à esquerda e links centralizados a partir de 1024px.
- **Mobile / Tablet:** menu hambúrguer até 1023px, com foco transferido ao primeiro link e retorno ao botão via Escape.
- **Countdown rail:** 56px, largura de conteúdo máxima de 768px, leitura contínua com divisores sutis e números tabulares.
- **Anchors:** seções públicas usam `scroll-margin-top: 128px`, compensando topbar e rail.

### Admin Dashboard

- **Information order:** resumo da festa, distribuição das confirmações, prioridades e progresso dos presentes.
- **Summary strip:** quatro métricas compactas — famílias, pessoas, respostas e taxa de resposta — em uma única superfície.
- **RSVP distribution:** barra empilhada e lista textual usam `sea`, `wine` e `rsvp-pendente`; números e rótulos garantem que cor nunca seja o único indicador.
- **Priorities:** respostas e memórias pendentes recebem estado “Ação necessária”; contagem zero muda explicitamente para “Tudo em dia”.
- **Navigation:** cada leitura operacional conduz diretamente ao filtro correspondente de convidados, moderação ou presentes.
- **Responsive:** o resumo passa de uma para duas e quatro colunas; painéis operacionais empilham antes de 1280px.

### Hero Sunset

- **Composition:** céu, horizonte, relevo distante, sol canônico e três faixas do mar formam uma única paisagem contínua desde o primeiro frame; não existe backdrop alternativo, corte ou troca de hero.
- **Approved restraint:** nuvens, coqueiros/palmeiras e reflexo ou glitter na água não pertencem à composição aprovada e não devem ser reintroduzidos.
- **Depth:** o recuo discreto da câmera separa céu, horizonte e mar apenas por `transform` e `opacity`; a leitura deve ser de enquadramento, nunca de zoom da interface.
- **Canonical sun:** um único disco percorre arco diagonal derivado do palco e termina em `transform: none` dentro do alvo responsivo realmente renderizado.
- **Light bridge:** o sol percorre todo o arco em velocidade espacial aparente constante de `0–3000ms` e chega exatamente ao alvo em `3000ms`; warm horizon e haze permanecem em opacidade zero inclusive no frame de chegada e só começam a aparecer depois, a partir de `3060ms`.
- **Responsive:** desktop e mobile têm trajetórias e enquadramentos próprios; mobile é uma composição vertical dirigida, não um recorte automático do desktop.
- **Stacking:** o hero isolado usa planos irmãos permanentes — cena `0`, metadata `1` e conteúdo `2`; a cena cria seu próprio stacking context e aprisiona todo `z-index` decorativo, enquanto o grupo CTA ocupa o subplano frontal do conteúdo em desktop e mobile. Toda arte continua com `pointer-events: none`; somente topbar e skip link permanecem acima do hero na escala global.

### Venue Map

- **Map:** iframe sempre montado, interativo e com filtro `sepia(0.18) saturate(0.78) contrast(0.94)`.
- **Venue card:** plum, reto, no canto inferior esquerdo, acima dos controles nativos; `292px` mobile e `320px` em telas maiores.
- **Attribution:** logo, créditos e controles do Google Maps devem permanecer visíveis e desobstruídos.
- **Action:** “Abrir rota” é link externo com alvo mínimo de 44px.

### Sunset Footer

- **Composition:** céu em gradiente, disco solar central e faixa plum inferior.
- **Scale:** disco de até `19rem` no mobile e `24rem` em telas maiores.
- **Left metadata:** “Feito com 🧠 + 🫀 + 🤖 por anamnesis.MD”, com autoria clicável.
- **Right metadata:** data, espaço e cidade; em telas menores os blocos empilham.

### Motion

- **Interface:** `180ms` para estados simples e `260ms` para transições compostas, com `cubic-bezier(.22,1,.36,1)`.
- **Hero:** ondas contínuas em 22s, 30s e 38s permanecem independentes; a abertura finita dura `3700ms`, dividida entre `3000ms` de percurso solar e um beat pós-chegada separado de `700ms`.
- **Signature entrance:** o sol percorre o arco sem ease, hold, settle ou desaceleração; depois da chegada, o glow começa em `3060ms`, título/data em `3100ms`, convite em `3400ms`, CTAs em `3460ms` e o hero termina aberto em `3700ms`.
- **Intent:** scroll, skip, foco ou navegação aceleram o tempo restante para `150–200ms` sem consumir a ação original nem cortar diretamente para o fim.
- **Retarget:** resize/orientação preserva geração e progresso e converge à nova composição por correção FLIP de aproximadamente `180ms`.
- **Performance:** camadas grandes da paisagem animam somente `transform` e `opacity`; copy usa apenas recorte e deslocamento, e os CTAs preservam suas cores finais de fundo, borda e texto durante todo o reveal. `will-change` existe apenas durante `playing` e é removido em `complete`.
- **Program sequence:** o sol da data e os sete horários entram uma única vez via `IntersectionObserver`, com stagger de `45ms` limitado aos seis primeiros intervalos.
- **Public routes:** confirmação troca painéis em `520ms`; a carta aquece a superfície em `720ms` e escalona somente os rótulos de cada faixa, limitando o atraso acumulado.
- **Admin states:** transições de rota, menus, diálogos, feedbacks e carregamento de dados usam `180–280ms`; movimento comunica mudança de estado e nunca cria uma coreografia de entrada no painel.
- **Progress:** barras administrativas crescem a partir da origem esquerda quando dados atualizados substituem o skeleton.
- **Navigation:** menu móvel preserva a saída antes de aplicar `visibility`; links recebem sublinhado direcional e botões elevam `2px` apenas em dispositivos com movimento permitido.
- **Reduced motion:** mostra imediatamente o frame final completo, desliga a timeline e os loops contínuos e nunca esconde arte, conteúdo ou controles.

## 6. Do's and Don'ts

### Do:

- **Do** usar os tokens de `src/index.css` como fonte normativa da implementação.
- **Do** manter Alegreya em títulos e Gabarito em navegação, texto e formulários.
- **Do** preservar contraste WCAG AA, foco visível e alvos mínimos de 44px.
- **Do** validar 320px, tablet e desktop sem overflow horizontal.
- **Do** manter o countdown compacto centralizado e ocultá-lo quando o menu móvel estiver aberto.
- **Do** manter o sol atrás do mar, parcialmente encoberto pela linha d’água.
- **Do** manter a atribuição e os controles do Google Maps totalmente visíveis.
- **Do** usar feedback com borda completa e fundo tonal.
- **Do** carregar rotas secundárias sob demanda com fallback visual da marca.

### Don't:

- **Don't** cobrir, remover ou disfarçar a atribuição do Google Maps.
- **Don't** usar faixas laterais coloridas em alertas, cartões ou feedbacks.
- **Don't** usar texto em gradiente, glassmorphism decorativo ou fundos de grade.
- **Don't** criar grids repetitivos de cartões idênticos quando uma composição editorial resolve melhor.
- **Don't** recolocar coqueiros ou silhuetas laterais no hero.
- **Don't** usar sombras difusas largas em elementos com borda de 1px.
- **Don't** ultrapassar `16px` de raio em cartões; pílulas são reservadas para ações.
- **Don't** inserir cores hexadecimais novas diretamente em SVGs; crie ou reutilize tokens semânticos.
- **Don't** deixar títulos, menu, countdown ou footer criarem overflow em 320px.
- **Don't** bloquear conteúdo por animação; o estado inicial deve permanecer legível.
