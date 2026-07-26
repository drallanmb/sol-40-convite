# Phase 10: Abertura cinematográfica do pôr do sol - Context

**Gathered:** 2026-07-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Entrega uma abertura visual para entradas elegíveis na rota `/`: o céu do
hero ocupa a tela, o mesmo sol da composição final entra pela borda superior
e desce até a geometria real do sol renderizado. Quando os dois estados se
encaixam sem salto, mar, textos, ações e navegação do hero são revelados.

A abertura não é uma tela de loading, não adiciona controles próprios e não
cria uma segunda arte do hero. Links diretos para outras seções, rotas
secundárias e retornos ao hero por rolagem permanecem fora da sequência.

</domain>

<decisions>
## Implementation Decisions

### Cena, trajetória e ritmo

- **D-01:** O primeiro frame mostra imediatamente apenas o céu do próprio
  hero em tela cheia, com o gradiente final estável. Não pode haver flash do
  hero completo antes da abertura.
- **D-02:** O sol começa totalmente fora da tela, entra pela borda superior e
  desce pelo eixo central até a posição real medida do sol do hero.
- **D-03:** O disco mantém exatamente o tamanho final e a mesma intensidade de
  halo durante todo o percurso. Céu, tamanho e halo não mudam durante a
  descida.
- **D-04:** A descida dura aproximadamente **2 segundos** e usa movimento
  cinematográfico suave: começa devagar, ganha velocidade e desacelera ao
  encaixar.
- **D-05:** A abertura não apresenta spinner, progresso, copy de espera ou
  qualquer estado que pareça loading.
- **D-06:** Ao pousar, o sol permanece continuamente visível e passa a ser o
  sol real do hero sem piscar, desaparecer ou reduzir opacidade.
- **D-07:** Mar, textos, CTAs, metadados e navegação surgem juntos em um fade
  curto de **250–300 ms**. As animações escalonadas atuais do hero são
  substituídas por esse único reveal.

### Frequência e navegação

- **D-08:** A abertura roda sempre que a rota `/` é carregada ou acessada
  novamente pelo hero. Não existe persistência de “já viu” em storage,
  cookie, sessão ou perfil.
- **D-09:** Rolar para baixo e voltar ao hero na mesma montagem não repete a
  abertura.
- **D-10:** Tocar no símbolo da topbar enquanto a pessoa já está na página
  apenas volta a `#inicio`; não reinicia a cena.
- **D-11:** Se a pessoa sair durante a animação e depois retornar à rota `/`,
  a abertura recomeça desde o início.
- **D-12:** Links diretos para outra seção, como `/#programacao`, respeitam o
  fragmento e não executam a abertura.

### Interação e acessibilidade

- **D-13:** Não existe botão “Pular”, gesto próprio ou controle específico da
  abertura.
- **D-14:** A camada visual não captura clique, toque ou teclado. A página
  continua tecnicamente navegável e rolável durante os 2 segundos.
- **D-15:** Uma rolagem iniciada durante a descida conclui imediatamente a
  abertura e libera a página no ponto escolhido pela pessoa.
- **D-16:** O skip link existente permanece como primeiro elemento focável,
  aparece acima da abertura ao receber foco e continua funcional.
- **D-17:** `prefers-reduced-motion: reduce` recebe o hero final
  imediatamente, sem descida e sem fade.

### Revelação do hero

- **D-18:** Links e botões ficam interativos assim que o fade de revelação
  começa; não esperam os 250–300 ms terminarem.
- **D-19:** O sol não participa do fade. Somente mar, conteúdo e navegação
  ganham opacidade ao redor do disco já encaixado.
- **D-20:** O mar aparece já em movimento durante o fade, sem uma etapa
  estática posterior.
- **D-21:** A composição inicial usa a própria linguagem visual do hero;
  nenhuma tela neutra ou escura antecede o céu.

### Decisões herdadas

- **D-22:** O alvo é a geometria realmente renderizada em cada viewport, não
  coordenadas duplicadas ou breakpoints paralelos.
- **D-23:** Resize ou mudança de orientação antes do início precisa produzir o
  alvo correto para 320 px, tablet e desktop.
- **D-24:** A cena reutiliza a arte e os tokens atuais do hero e preserva
  contraste AA, desempenho mobile, foco e a navegação existente.

### Claude's Discretion

- Técnica exata de medição e transição shared-element, desde que exista um
  único sol visual no encaixe e nenhum salto perceptível.
- Curva de easing concreta que materializa o ritmo decidido.
- Valor final dentro da faixa de 250–300 ms e tolerância de arredondamento
  subpixel.
- Limiar mínimo de rolagem que encerra a abertura, evitando cancelamento por
  ruído sem atrasar uma intenção real de navegação.
- Organização dos estados e testes, sem introduzir uma biblioteca pesada de
  animação por necessidade presumida.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Escopo e requisitos

- `.planning/ROADMAP.md` § “Phase 10: Abertura cinematográfica do pôr do sol”
  — objetivo, dependência e critérios de sucesso.
- `.planning/REQUIREMENTS.md` § “Abertura Cinematográfica” — INTRO-01 e
  INTRO-02.
- `.planning/PROJECT.md` § “Constraints” e § “Key Decisions” — medição da
  geometria real, motion reduzido e transição shared-element.
- `.planning/phases/02-convite-p-blico/02-CONTEXT.md` § “Hero e arte” — arte
  canônica do hero e decisões originais de céu, sol, mar e motion.

### Sistema visual

- `DESIGN.md` — regras normativas de cor, tipografia, motion, profundidade e
  acessibilidade do convite.
- `src/index.css` — tokens do céu/sol/halo, animações atuais do hero e motion
  global que a fase deve substituir ou coordenar.

### Composição e acessibilidade atuais

- `src/components/invite/Hero.tsx` — sol real, gradiente, mar, conteúdo e
  geometria responsiva que formam o estado final.
- `src/components/invite/SeaWaves.tsx` — mar que deve aparecer já em movimento
  durante o reveal.
- `src/components/layout/Shell.tsx` — topbar, navegação, skip link, foco e
  countdown rail existentes.
- `src/routes/Home.tsx` — montagem da rota `/` e ordem das seções.
- `src/hooks/useReducedMotion.ts` — store reativo existente para
  `prefers-reduced-motion`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `Hero`: já contém o único sol canônico, com largura responsiva, posição por
  breakpoint, halo e gradiente final.
- `SeaWaves`: mantém as três bandas de onda e pode ser revelado já com a
  animação ativa.
- `useReducedMotion`: fornece a preferência do sistema sem criar outro
  listener de media query.
- `Shell`: já mantém o skip link acima do conteúdo, a topbar e o gerenciamento
  de foco/navegação móvel.

### Established Patterns

- Motion decorativo nunca é requisito para revelar ou operar conteúdo.
- CSS e React usam `prefers-reduced-motion`; conteúdo não parte de um estado
  inacessível quando a animação falha.
- O hero é mobile-first e sua geometria usa `clamp()` e breakpoints, portanto
  coordenadas hardcoded fora do elemento divergiriam.
- As ondas atuais são CSS/SVG, sem vídeo ou biblioteca de animação.
- Foco visível, alvos mínimos e contraste AA são invariantes do projeto.

### Integration Points

- A rota `src/routes/Home.tsx` decide se a entrada atual é elegível,
  especialmente diante de um fragmento diferente de `#inicio`.
- `src/components/invite/Hero.tsx` expõe o alvo mensurável do sol e os grupos
  visuais que ficam ocultos até o reveal.
- `src/components/layout/Shell.tsx` precisa coordenar a visibilidade da
  navegação sem cobrir o skip link ou tornar elementos invisíveis focáveis.
- `src/index.css` substitui a entrada escalonada atual por estados da nova
  sequência e mantém o fallback de reduced motion.
- Testes de componente/browser devem cobrir entrada, retorno de rota,
  fragmento direto, cancelamento por scroll, foco, reduced motion e viewports
  representativos.

</code_context>

<specifics>
## Specific Ideas

- A intenção é deliberadamente simples: “coisa de 2s”, sem transformar a
  abertura em loading.
- “Sempre ao entrar na hero” significa nova entrada da rota pelo início, não
  reentrada visual causada por rolagem.
- O momento-chave é o sol móvel tornar-se o sol existente do hero como uma
  única cena contínua.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 10-Abertura cinematográfica do pôr do sol*
*Context gathered: 2026-07-26*
