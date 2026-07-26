# Phase 10: Abertura cinematográfica do pôr do sol - Context

**Gathered:** 2026-07-26
**Status:** Ready for replanning

<domain>
## Phase Boundary

Entrega uma abertura visual para entradas elegíveis na rota `/`: uma paisagem
editorial contínua já existe no primeiro frame, o sol percorre um arco natural
enquanto sua luz desperta céu, horizonte, mar e silhuetas, e a câmera recua
discretamente até formar o enquadramento real do hero.

A cena termina no próprio hero, sem troca de fundo ou handoff perceptível. A
abertura não é loading, não adiciona controles próprios e não bloqueia
navegação. Links diretos para outras seções e rotas secundárias continuam fora
da sequência.

**Este contexto substitui integralmente a direção visual anterior.** O conceito
“céu vazio + sol em queda vertical + fade conjunto do hero” foi implementado,
avaliado pelo usuário como seco, abrupto e com aparência de protótipo, e NÃO
deve ser preservado por compatibilidade com os planos ou testes anteriores.

</domain>

<decisions>
## Implementation Decisions

### Direção visual e atmosfera

- **D-01:** A abertura é um **plano-sequência atmosférico**. Céu, horizonte,
  mar e silhuetas já pertencem à mesma paisagem desde o primeiro frame.
- **D-02:** Não existe troca de fundo, tela vazia ou estado composto somente
  pelo gradiente do céu. A continuidade ambiental é o fundamento da cena.
- **D-03:** A revelação é conduzida pela **luz do sol**: o horizonte aquece, o
  mar recebe reflexos, as ondas ganham brilho e as silhuetas adquirem contraste
  conforme o sol percorre a cena.
- **D-04:** O acabamento é de **ilustração editorial cinematográfica**,
  enriquecendo a identidade atual com nuvens suaves, névoa luminosa,
  profundidade em camadas, reflexo solar no mar e textura sutil.
- **D-05:** O resultado deve parecer uma direção de arte finalizada, não uma
  demonstração técnica de elementos DOM animados. Gradientes secos, fundos
  planos e fades genéricos são insuficientes.

### Trajetória, câmera e encaixe

- **D-06:** O sol percorre um **arco diagonal amplo e natural**, não uma queda
  vertical. Ele começa alto e deslocado e desacelera ao se aproximar do
  horizonte/posição final.
- **D-07:** O enquadramento faz um recuo sutil de câmera durante a sequência.
  Nuvens, horizonte, mar e palmeiras respondem com parallax mínimo.
- **D-08:** O recuo termina exatamente no enquadramento responsivo real do hero;
  a sensação deve ser de câmera, nunca de zoom evidente da interface.
- **D-09:** O instante final não parece um objeto encaixando numa coordenada.
  Nos últimos momentos, o halo se conecta ao horizonte e cria/reforça o reflexo
  no mar enquanto o sol desacelera.
- **D-10:** Quando o sol para, a paisagem já é o hero final. Não há corte,
  substituição de elemento, troca de background ou fade usado como cortina para
  esconder o encaixe.
- **D-11:** A coreografia completa dura aproximadamente **3 segundos**,
  permitindo que arco, transformação de luz, recuo de câmera e reflexo tenham
  respiração sem parecer loading.

### Revelação do conteúdo

- **D-12:** O conteúdo não aparece todo junto num fade genérico. A entrada usa
  uma hierarquia cinematográfica curta.
- **D-13:** Primeiro surgem “Sol faz 40” e a data; em seguida entram convite e
  CTAs, com movimento mínimo e foco progressivo.
- **D-14:** A entrada tipográfica completa ocupa aproximadamente **500–700 ms**
  e acontece quando a paisagem já está quase formada.
- **D-15:** A navegação e os controles tornam-se operáveis sem esperar uma
  animação decorativa terminar; visibilidade e interatividade permanecem
  coordenadas.

### Mobile, resize e movimento reduzido

- **D-16:** Mobile recebe direção de arte própria, não um recorte automático do
  desktop: arco mais alto e compacto, horizonte mais baixo, reflexo em faixa
  vertical e palmeiras como moldura lateral.
- **D-17:** Resize ou mudança de orientação durante a abertura preserva o
  progresso e reenquadra suavemente a composição, sem reiniciar e sem salto.
- **D-18:** `prefers-reduced-motion: reduce` recebe imediatamente a cena final
  completa, sem arco, zoom, parallax ou fade.
- **D-19:** A geometria final continua derivada do hero realmente renderizado
  em cada viewport, não de coordenadas duplicadas.

### Frequência, navegação e interrupção

- **D-20:** A abertura roda em cada nova entrada elegível na rota `/` ou
  `/#inicio`; não existe persistência de “já viu” em storage, cookie ou perfil.
- **D-21:** Rolar para baixo e voltar ao hero ou tocar no wordmark `#inicio` na
  mesma montagem não reinicia a cena.
- **D-22:** Links diretos para seções conhecidas, como `/#programacao`, pulam a
  abertura e respeitam o fragmento.
- **D-23:** Não existe botão exclusivo “Pular”. Skip link, teclado, toque,
  scroll e navegação normal permanecem funcionais.
- **D-24:** Uma intenção de navegação durante a abertura acelera sol, luz,
  câmera e conteúdo para o estado final em aproximadamente **150–200 ms**.
  Não há corte seco nem espera forçada.
- **D-25:** Sair durante a abertura e retornar por uma nova montagem elegível
  reinicia a cena; uma restauração real por bfcache deve limpar handles e
  listeners anteriores.

### Acessibilidade e segurança

- **D-26:** Nenhuma camada decorativa captura pointer, toque ou teclado; a cena
  nunca funciona como modal ou overlay bloqueante.
- **D-27:** O skip link existente continua sendo o primeiro foco, aparece acima
  da composição e permanece funcional.
- **D-28:** Falhas da Web Animations API ou de qualquer etapa visual são
  **fail-open**: o hero final e todos os controles ficam imediatamente visíveis
  e operáveis.
- **D-29:** Contraste AA, ausência de overflow horizontal e desempenho mobile
  permanecem invariantes da fase.

### Claude's Discretion

- Lado exato de origem do arco, escolhido a partir da composição final e da
  leitura visual em cada formato.
- Quantidade, desenho e distribuição de nuvens, névoa, reflexos e textura,
  desde que permaneçam editoriais e coerentes com a identidade existente.
- Curvas de easing e proporção exata do recuo/parallax dentro do ritmo aprovado.
- Técnica de composição/máscaras/camadas que mantenha uma cena contínua e
  responsiva sem transformar a abertura em vídeo pesado ou loading.
- Microtiming da hierarquia tipográfica dentro da faixa de 500–700 ms.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Escopo e requisitos

- `.planning/ROADMAP.md` § “Phase 10: Abertura cinematográfica do pôr do sol”
  — objetivo e critérios de sucesso.
- `.planning/REQUIREMENTS.md` § “Abertura Cinematográfica” — INTRO-01 e
  INTRO-02.
- `.planning/PROJECT.md` § “Constraints” e § “Key Decisions” — identidade,
  geometria real, movimento reduzido e acessibilidade.
- `.planning/phases/02-convite-p-blico/02-CONTEXT.md` § “Hero e arte” —
  composição canônica da paisagem e decisões originais do convite.

### Sistema visual e composição

- `DESIGN.md` — regras normativas de cor, tipografia, profundidade, motion e
  acessibilidade.
- `src/index.css` — tokens e implementação visual atual; a direção seca da
  primeira tentativa deve ser substituída, não refinada superficialmente.
- `src/components/invite/Hero.tsx` — composição, geometria e sol canônico do
  hero final.
- `src/components/invite/SeaWaves.tsx` — camadas de mar/ondas que participam da
  iluminação e profundidade.
- `src/components/layout/Shell.tsx` — topbar, skip link e navegação.
- `src/routes/Home.tsx` — elegibilidade e coordenação da rota.
- `src/hooks/useReducedMotion.ts` — preferência reativa de movimento.

### Evidência da tentativa rejeitada

- `.planning/phases/10-abertura-cinematogr-fica-do-p-r-do-sol/10-REVIEW.md` —
  achados técnicos úteis, especialmente o requisito fail-open.
- `.planning/phases/10-abertura-cinematogr-fica-do-p-r-do-sol/10-VERIFICATION.md`
  — testes existentes e gap WAAPI; não usar seu conceito visual como referência.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `Hero`: contém a geometria final responsiva e o sol canônico; deve continuar
  sendo o destino real da cena.
- `SeaWaves`: fornece as bandas marítimas existentes e pode receber iluminação,
  profundidade e reflexo sem criar uma segunda paisagem.
- `useReducedMotion`: fornece o fallback imediato já integrado à aplicação.
- `Shell`: preserva skip link, topbar e comportamento de foco.
- `cinematicIntro.ts`: reúne políticas úteis de elegibilidade, fase, fragmento
  e scroll, embora durações e coreografia precisem ser revistas.

### Established Patterns

- A arte é construída em CSS/SVG e deve permanecer leve; nenhuma camada visual
  pode ser condição para acessar conteúdo.
- O hero é mobile-first e usa geometria fluida; a nova direção precisa modelar
  composições desktop e vertical sem coordenadas paralelas frágeis.
- Testes Playwright existentes já cobrem identidade do sol, viewports,
  fragmentos, foco, reduced motion e release; devem ser reescritos onde
  codificam a estética rejeitada.

### Integration Points

- `Home.tsx` continua responsável por elegibilidade, lifecycle e aceleração da
  conclusão por intenção de navegação.
- `Hero.tsx` deve coordenar arco, luz, câmera, parallax, reflexo e conteúdo como
  uma única timeline visual.
- `index.css` precisa deixar de tratar o background como gradiente estático e o
  hero como grupos ocultos por opacity.
- Testes precisam validar continuidade objetiva sem congelar a direção de arte
  em seletores ou snapshots frágeis.

</code_context>

<specifics>
## Specific Ideas

- Diagnóstico do usuário sobre a primeira tentativa: “parece seco, protótipo,
  ficou ruim”, principalmente no fundo e no encaixe/reveal.
- A nova cena deve ser percebida como paisagem viva e dirigida, não como uma
  sequência de estados de interface.
- O reflexo no mar e a propagação da luz são a ponte visual entre movimento do
  sol e hero final.
- Mobile merece composição vertical desenhada, não compressão da versão ampla.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 10-Abertura cinematográfica do pôr do sol*
*Context gathered: 2026-07-26*
