# Phase 10: Abertura cinematográfica do pôr do sol — Research

**Researched:** 2026-07-26
**Domain:** direção de arte responsiva em CSS/SVG, React, Web Animations API,
continuidade perceptual, acessibilidade e validação visual
**Research type:** re-pesquisa completa após rejeição da direção anterior
**Confidence:** HIGH para a arquitetura e os pontos de integração do projeto;
MEDIUM para a qualidade artística até o checkpoint humano de keyframes

<research_revision>
## Revision Boundary

Esta pesquisa **substitui integralmente** a pesquisa anterior da Fase 10.

A tentativa “céu vazio + sol em queda vertical + mar/copy ocultos + fade
conjunto” foi rejeitada pelo usuário como seca, abrupta e com aparência de
protótipo. Ela não deve ser preservada como base estética, nem tratada como uma
implementação quase pronta que precise apenas de polimento.

Partes técnicas da tentativa anterior que continuam úteis:

- política de elegibilidade por montagem e fragmento;
- uso do sol canônico do hero em vez de clone;
- alvo final derivado da geometria realmente renderizada;
- skip link fora de qualquer região `inert`;
- matriz Playwright em Chromium/WebKit e mobile/desktop;
- dívida já identificada de conclusão **fail-open** quando WAAPI lança.

Partes que precisam ser substituídas:

- primeiro frame composto apenas pelo céu;
- trajetória vertical central;
- duração de 2000 ms;
- fases `descending → revealing` como modelo conceitual;
- ocultação total do mar, paisagem e conteúdo por `[data-intro-reveal]`;
- reveal único de 260 ms;
- testes que canonizam esses comportamentos rejeitados.
</research_revision>

<user_constraints>
## User Constraints (from revised CONTEXT.md)

### Locked Decisions

#### Direção visual e atmosfera

- A abertura é um plano-sequência atmosférico. Céu, horizonte, mar e
  silhuetas pertencem à mesma paisagem desde o primeiro frame.
- Não existe troca de fundo, tela vazia ou estado formado apenas pelo
  gradiente do céu.
- A luz do sol desperta a paisagem: horizonte aquece, mar recebe reflexos,
  ondas ganham brilho e silhuetas adquirem contraste.
- O acabamento é uma ilustração editorial cinematográfica com nuvens suaves,
  névoa luminosa, profundidade em camadas, reflexo no mar e textura sutil.
- Gradiente seco, fundo plano e fade genérico não satisfazem a direção.

#### Trajetória, câmera e encaixe

- O sol percorre arco diagonal amplo e natural e desacelera ao se aproximar
  da posição final; queda vertical é proibida.
- Há recuo sutil de câmera e parallax mínimo entre nuvens, horizonte, mar e
  palmeiras.
- A câmera termina exatamente no enquadramento real do hero, sem parecer zoom
  de interface.
- O encaixe é absorvido pela conexão do halo com o horizonte e pela formação
  do reflexo no mar.
- Quando o sol para, a paisagem já é o hero final: sem corte, swap, troca de
  background ou fade-cortina.
- A coreografia completa dura aproximadamente 3 segundos.

#### Conteúdo

- Conteúdo entra em hierarquia curta, não em fade conjunto.
- Primeiro entram “Sol faz 40” e data; depois convite e CTAs.
- A sequência tipográfica ocupa aproximadamente 500–700 ms quando a paisagem
  já está quase formada.
- Visibilidade e interatividade precisam permanecer coordenadas; controles
  não ficam presos esperando ornamentação.

#### Responsividade, movimento e lifecycle

- Mobile recebe composição vertical própria: arco mais alto/compacto,
  horizonte mais baixo, reflexo vertical e palmeiras como moldura.
- Resize/orientação durante a abertura preserva progresso e reenquadra
  suavemente, sem reiniciar nem saltar.
- `prefers-reduced-motion: reduce` mostra imediatamente a cena final completa,
  sem arco, zoom, parallax ou fade.
- Alvo solar final continua vindo da geometria real do hero.
- Entradas elegíveis são `/` e `/#inicio`; fragmentos de outras seções pulam a
  abertura; mesma montagem não repete ao voltar ao topo.
- Não há storage de “já viu”, loading ou botão próprio de pular.
- Intenção de navegação acelera a conclusão para aproximadamente 150–200 ms,
  sem bloquear scroll, teclado, toque ou navegação.
- Nova montagem elegível reinicia. Restauração real por bfcache limpa handles
  e listeners antes de criar uma nova execução.
- Camadas decorativas nunca capturam pointer/teclado; skip link continua
  primeiro foco e acima da composição.
- Qualquer falha visual/WAAPI é fail-open: hero final e controles aparecem
  imediatamente e permanecem operáveis.
- Contraste AA, ausência de overflow horizontal e desempenho mobile são
  invariantes.

### Claude's Discretion

- lado de origem do arco em cada composição;
- desenho e quantidade de nuvens, névoa, reflexo, textura e silhuetas;
- curvas e microtiming dentro do ritmo aprovado;
- técnica de composição, desde que leve, contínua e responsiva;
- microtiming dos dois grupos tipográficos.

### Deferred Ideas

None.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Requirement | Research support |
|---|---|---|
| INTRO-01 | O sol se põe e termina exatamente na geometria responsiva do sol real, sem salto visual | Manter um único disco solar dentro do wrapper final; calcular o arco a partir do `DOMRect` do palco e do alvo; terminar em `transform: none`; usar um shell separado para FLIP de resize, sem clone ou troca de nó. |
| INTRO-02 | Preservar interação, desempenho mobile e acessibilidade, inclusive `prefers-reduced-motion` | Cena decorativa pointer-transparent, estado final síncrono em reduced motion, timeline nativa limitada a `transform`/`opacity`, aceleração sem `preventDefault`, conclusão fail-open e testes cross-browser. |
</phase_requirements>

## Executive Summary

O hero existente não precisa de um overlay ou vídeo separado; ele precisa ser
reconstruído internamente como **uma única cena estratificada**, sempre montada
e visível. A diferença entre o primeiro frame e o último não deve ser
“elementos escondidos que aparecem”, mas a evolução de luz, profundidade,
enquadramento e hierarquia.

A melhor solução no stack atual é:

1. manter o hero real como palco e o único sol visual dentro de seu wrapper
   responsivo final;
2. transformar céu, nuvens, névoa, halo, horizonte, reflexão, mar, ondas e
   silhuetas em camadas semânticas CSS/SVG;
3. dar a todas as animações finitas a mesma timeline WAAPI de 3000 ms, usando
   offsets diferentes para coreografar arco, luz, câmera, reflexo e texto;
4. manter o estado CSS de repouso igual ao frame final e usar a WAAPI apenas
   como efeito transitório, de modo que cancelar depois de concluir não mude a
   imagem;
5. usar transformações e opacidades de overlays já pintados, evitando animar
   gradientes, blur, `top`, `left`, largura ou altura a cada frame;
6. fazer resize por re-resolução de geometria + correção FLIP em wrappers
   separados, mantendo `currentTime` e dissolvendo a correção em ~180 ms;
7. acelerar todas as animações existentes por `updatePlaybackRate()` quando
   houver intenção de navegação, sem impedir a ação original;
8. cercar **todas** as chamadas WAAPI por uma fronteira idempotente fail-open;
9. aprovar keyframes estáticos em desktop e mobile **antes** de investir na
   timeline, lifecycle e matriz completa.

Não há evidência de que GSAP, Framer Motion, vídeo ou canvas sejam necessários.
WAAPI oferece reprodução, seek e mudança suave de velocidade; CSS/SVG já é a
linguagem ilustrativa do projeto. A dificuldade principal agora não é a
interpolação, mas direção de arte, separação correta das camadas e lifecycle
seguro.

## Critical Documentation Conflict

O `10-CONTEXT.md` revisado é a decisão mais recente do usuário e deve prevalecer,
mas o `DESIGN.md` ainda contém regras incompatíveis:

| `DESIGN.md` atual | Nova decisão canônica |
|---|---|
| Hero tem somente céu, disco e três faixas do mar | Cena ganha nuvens, névoa, profundidade e silhuetas |
| Coqueiros/silhuetas laterais são proibidos | Mobile usa palmeiras como moldura lateral |
| Reflexo/caminho de luz não existe | Reflexo solar no mar é a ponte do encaixe |
| Signature entrance de 900 ms + cinco entradas de 680 ms | Timeline contínua ~3000 ms e hierarquia final de 500–700 ms |

O plano deve reservar uma atualização normativa de `DESIGN.md` **depois do
checkpoint visual aprovado**. Atualizar antes da aprovação congelaria uma
direção ainda não validada; deixar sem atualização depois criaria duas fontes
de verdade concorrentes.

## Existing Code Reality

### Reusable

- `Hero.tsx` já possui o wrapper responsivo do alvo solar e o único disco
  visual. A separação wrapper/alvo deve continuar.
- `SeaWaves.tsx` já oferece três bandas SVG com velocidades diferentes. Os
  paths podem ser preservados, mas precisam participar de iluminação e
  profundidade desde o primeiro frame.
- `Home.tsx` já resolve elegibilidade inicial, reduced motion, fragmento e
  `pageshow.persisted`.
- `useReducedMotion` é reativo, usa `useSyncExternalStore` e deve ser
  reutilizado.
- `Shell.tsx` já mantém skip link antes do header/main e limita `inert` ao
  chrome.
- `cinematicIntro.ts` contém política útil de hash e scroll.
- Playwright já está configurado em Chromium/WebKit, 1280×800 e 320×760@2x.

### Must Be Reworked

- `[data-intro-reveal]` atualmente esconde mar, copy e metadados por completo;
  isso contradiz a paisagem presente no primeiro frame.
- O CSS de produção depende de `data-testid="hero-sun-visual"`. Trocar para um
  atributo semântico, como `data-intro-sun`, e deixar `data-testid` apenas para
  testes.
- `Hero.tsx` cria uma única animação vertical de 2000 ms e não protege
  `animate()`, `finish()` nem `cancel()` contra exceções.
- `Home.tsx` modela `descending → revealing → complete`, incluindo timeout fixo
  de 260 ms. A nova timeline deve ser tratada como uma cena única, não como
  “movimento e depois reveal”.
- Os testes atuais afirmam “somente céu no primeiro frame”, queda vertical,
  2000 ms e reveal 260 ms. Eles precisam ser substituídos onde codificam o
  conceito rejeitado, mantendo apenas política, geometria, foco e lifecycle
  úteis.

## Standard Stack

Nenhuma dependência nova é recomendada.

| Tecnologia | Versão local / origem | Papel |
|---|---|---|
| React | 19.2.8 | estado mount-scoped, refs, efeitos e cleanup |
| React Router | 7.18.1 | rota, fragmento e nova montagem |
| Tailwind/CSS | 4.3.3 + CSS nativo | layout responsivo, tokens e estados estáticos |
| SVG inline | navegador | nuvens, silhuetas, ondas, máscaras e reflexo vetorial |
| Web Animations API | navegador | timeline finita, seek, finish/cancel e aceleração |
| ResizeObserver | navegador | detectar mudança real do palco/alvo durante a execução |
| Playwright | 1.62.0 | geometria, timeline, screenshots e cross-browser |
| Vitest | 4.1.10 | política pura e matemática da timeline |

### Why not a new animation library

WAAPI já suporta controle de tempo, `currentTime`, `finish()`, `cancel()`,
`updatePlaybackRate()` e keyframes com offsets. A especificação inclusive usa
seek para testar animações sem aguardar o tempo real. Uma biblioteca adicionaria
bundle, outra semântica de cleanup e risco de composição de transforms sem
resolver a parte difícil: a direção de arte.

Fontes:

- Web Animations Level 1: https://www.w3.org/TR/web-animations-1/
- React `useLayoutEffect`: https://react.dev/reference/react/useLayoutEffect
- React Strict Mode: https://react.dev/reference/react/StrictMode
- Resize Observer: https://www.w3.org/TR/resize-observer/
- Performance de animações: https://web.dev/articles/animations-guide

## Recommended Scene Model

O hero deve expor camadas estáveis e nomeadas. Nenhuma camada decorativa pode
ser um overlay alternativo ao hero.

```text
Hero (layout, final responsive framing)
├── scene-viewport            overflow clip; pointer-events none
│   └── scene-camera          recuo global sutil, termina em transform:none
│       ├── sky-base          gradiente final estático
│       ├── sky-cool-veil     overlay inicial que perde opacidade
│       ├── cloud-far         SVG/gradientes, parallax mínimo
│       ├── cloud-near        SVG/gradientes, parallax um pouco maior
│       ├── haze-horizon      faixa luminosa larga e suave
│       ├── sun-target        wrapper na geometria final real
│       │   └── sun-retarget  correção FLIP de resize
│       │       └── sun       único disco/halo; arco termina em transform:none
│       ├── horizon-depth     massa distante/silhueta
│       ├── reflection        SVG ou elemento mascarado sob o sol
│       ├── sea               plano e três wave bands existentes
│       └── palms             moldura/silhuetas, especialmente no mobile
├── copy-primary              marca/título/data
├── copy-secondary            convite/CTAs
└── metadata
```

`scene-camera`, `sun-retarget` e `sun` precisam ser wrappers distintos porque
cada um resolve uma transformação diferente:

- câmera: enquadramento global;
- retarget: correção transitória de resize;
- sol: trajetória artística.

Misturar os três no mesmo `transform` cria composição frágil e torna impossível
corrigir resize sem quebrar o arco.

### Layer responsibilities

| Layer | Initial frame | Final frame | Animate |
|---|---|---|---|
| sky-base | visível | igual | nunca |
| cool veil | opacidade moderada | opacidade 0 | opacity |
| warm horizon | sutil | mais presente | opacity/scaleX |
| clouds | visíveis e suaves | redistribuídas pelo recuo | transform/opacity |
| haze | baixa intensidade | conecta halo/horizonte | opacity/scale |
| sun | alto e lateral | wrapper final | transform |
| reflection | estreito/fraco | faixa alinhada ao sol | opacity/scaleY |
| sea/waves | sempre visíveis | mais luminosos/definidos | overlay opacity + wave motion existente |
| silhouettes | legíveis, pouco contrastadas | contraste final | opacity de camada tonal |
| copy primary | ausente visualmente | visível | transform/opacity |
| copy secondary | ausente visualmente | visível | transform/opacity |

O primeiro frame precisa ser uma composição intencional por si só. “Baixo
contraste” não significa esconder a paisagem; horizonte, mar e profundidade
devem continuar reconhecíveis.

## Building the Editorial Atmosphere

### 1. Sky without animating gradients

Use um gradiente final estático como base e dois overlays:

- véu frio/escuro inicial, cuja opacidade diminui;
- halo quente amplo no horizonte, cuja opacidade e escala horizontal aumentam.

Isso produz mudança cromática sem recalcular stops de um gradiente full-screen
em todo frame. `opacity` e `transform` são as propriedades mais previsíveis
para composição; `will-change` deve ser aplicado somente às poucas camadas
realmente animadas e removido ao terminar.

### 2. Clouds and haze

Nuvens devem ser formas SVG de baixa complexidade ou grupos de gradientes
radiais, nunca dezenas de DOM nodes. Use duas profundidades:

- nuvem distante: menor deslocamento, menor contraste;
- nuvem próxima: deslocamento um pouco maior e bordas mais suaves.

Não anime `filter: blur()` continuamente. Pré-renderize a suavidade por
gradiente ou filtro SVG estático e anime apenas o grupo. A névoa do horizonte
pode ser um elemento largo com gradiente radial/linear e opacidade baixa.

### 3. Reflection as the landing bridge

O reflexo deve começar a ganhar leitura antes do sol atingir o horizonte e
chegar ao máximo junto com a desaceleração final. A solução leve:

- um SVG ou `div` vertical alinhado ao centro final do sol;
- preenchimento em gradiente quente;
- `mask-image: linear-gradient(...)` mais uma forma irregular SVG/polygonal;
- `transform-origin: top center`;
- animação somente de `opacity`, `scaleY` e pequena `scaleX`.

CSS Masking permite usar gradientes ou `<mask>` SVG para revelar parcialmente
uma camada; a própria especificação alerta que clipping básico tende a ser mais
barato que máscaras complexas. Portanto, manter uma máscara simples e sem
animação de `mask-image`.

Fonte: https://www.w3.org/TR/css-masking-1/

### 4. Waves and light

As três bandas existentes podem continuar em loop, mas a luz não deve exigir
alterar seus `fill` a cada frame. Recomenda-se:

- preservar os fills base;
- adicionar uma camada de “rim light”/espuma sobre um ou dois paths;
- animar a opacidade dessa camada durante a abertura;
- manter o `wave-scroll` independente e muito lento;
- em reduced motion, desativar tanto a timeline finita quanto os loops.

### 5. Silhouettes and palms

Silhuetas precisam ser SVG inline com `currentColor` ou tokens semânticos, sem
hex literals. No desktop podem ficar quase fora de quadro ou muito discretas;
no mobile funcionam como moldura lateral, conforme D-16. Elas não devem cobrir
CTAs, foco ou metadados.

### 6. Texture

Textura sutil deve ser uma única camada estática (pattern SVG minúsculo,
repeating radial gradient ou asset local muito leve), com baixa opacidade e
`mix-blend-mode: soft-light`. Não animá-la; o movimento das outras camadas já
fornece vida suficiente.

## Choreography Recommendation

Todos os efeitos finitos devem compartilhar duração nominal de **3000 ms**. Os
offsets abaixo são ponto de partida para prototipagem, não números a congelar
antes da aprovação visual.

| Progresso | Tempo | Cena |
|---:|---:|---|
| 0.00 | 0 ms | paisagem completa e reconhecível; sol alto/deslocado; céu menos quente; reflexão quase ausente; copy não visível |
| 0.15 | 450 ms | arco já legível; recuo de câmera começa; nuvens próximas respondem |
| 0.45 | 1350 ms | luz alcança horizonte; mar ganha separação de planos; arco no trecho de maior velocidade |
| 0.68 | 2040 ms | câmera perto do enquadramento final; reflexão começa a se conectar ao halo |
| 0.76 | 2280 ms | desaceleração solar; título/data começam entrada |
| 0.82 | 2460 ms | horizonte e reflexo formam ponte visual; controles podem sair de `inert` junto com visibilidade |
| 0.88 | 2640 ms | convite/CTAs iniciam entrada, poucos pixels de deslocamento |
| 1.00 | 3000 ms | sol em `transform:none`, câmera em `transform:none`, base CSS final idêntica ao hero |

### Arc construction

Não use `offset-path` como fundamento, porque um path fixo seria outra fonte de
coordenadas responsivas e complicaria o retarget. Calcule keyframes de
`transform` relativos ao centro do wrapper final:

```ts
type Point = { x: number; y: number }

type IntroGeometry = {
  stage: DOMRect
  target: DOMRect
  start: Point
  bend: Point
  approach: Point
}
```

O resolver escolhe pontos normalizados do palco para desktop e mobile e os
converte em deltas relativos ao centro real do alvo. Três ou quatro keyframes
com easing por segmento aproximam um arco amplo:

- início: alto e lateral;
- bend: maior componente horizontal, aceleração;
- approach: próximo ao horizonte, menor delta;
- fim: `translate3d(0,0,0)`.

O lado exato do arco deve ser decidido no checkpoint visual. Mobile deve usar
valores próprios, não apenas cortar o desktop.

### Camera and parallax

O recuo precisa ser pequeno. Ponto inicial recomendado para experimento:

- `scene-camera`: escala em torno de `1.035–1.055`, leve `translateY`;
- nuvem distante: 20–30% do delta da câmera;
- nuvem próxima/palmas: 50–70%;
- horizonte/mar: 10–20%.

O final de todos é `transform:none`. Se o usuário percebe “zoom”, a amplitude
está alta; o objetivo é profundidade, não movimento explícito de interface.

### Copy hierarchy

Dividir em dois grupos semânticos:

1. marca/título/data;
2. frase, CTAs e conteúdo complementar.

Usar deslocamento de poucos pixels, opacidade que não começa necessariamente
em zero absoluto se a composição pedir integração com a luz, e intervalo curto
entre grupos. A janela total deve permanecer 500–700 ms. Os botões só saem de
`inert` quando sua visibilidade começa; nunca deixar um controle invisível
focável.

## Timeline Architecture

### One clock, many effects

Crie todas as animações com duração total de 3000 ms e offsets internos. Isso
permite:

- seek determinístico para screenshots;
- aceleração uniforme;
- uma única leitura de progresso;
- conclusão coordenada;
- testes sem sleeps reais.

Uma pequena camada local pode retornar um controller:

```ts
type CinematicIntroController = {
  animations: Animation[]
  getProgress(): number
  seek(progress: number): void
  accelerate(maxRemainingMs?: number): void
  finishOpen(): void
  dispose(): void
}
```

Isso não deve virar framework genérico. Deve conhecer as camadas da Fase 10 e
viver próximo do hero, com matemática pura extraída para
`src/lib/cinematicIntro.ts` apenas onde for testável.

### Semantic selectors

Produção deve usar atributos como:

- `data-intro-scene`;
- `data-intro-layer="cloud-far"`;
- `data-intro-sun`;
- `data-intro-copy="primary"`;
- `data-intro-state="playing|complete"`.

`data-testid` pode coexistir para Playwright, mas não deve controlar CSS nem
lógica de produção.

### Initial and final CSS invariants

- Estado `complete` e ausência de atributos de intro mostram o hero final.
- Reduced motion começa em `complete` na primeira renderização.
- Estado `playing` já mostra todas as camadas ambientais em sua composição
  inicial; não usa `visibility:hidden` no mar ou no fundo.
- Keyframe final é idêntico ao estilo base.
- Ao finalizar, primeiro promover o DOM para `complete`, depois cancelar/remover
  efeitos; assim o cancelamento não produz flash.

## Responsive Reframing During Playback

Resize é uma exigência explícita e não deve ser reduzido a “medir antes de
começar”. A solução recomendada combina `ResizeObserver`, progresso preservado
e FLIP em wrappers separados.

### Algorithm

1. Guardar último `DOMRect` válido do palco e do alvo.
2. Observar `scene-viewport` e `sun-target` enquanto a timeline estiver ativa.
3. Ao receber nova geometria:
   - ler e guardar `currentTime`/progresso;
   - capturar o retângulo visual atual do sol;
   - pausar as animações dentro de fronteira segura;
   - reconstruir keyframes de arco/parallax para a nova composição;
   - aplicar os novos keyframes e restaurar o mesmo `currentTime`;
   - medir o retângulo recalculado;
   - aplicar no wrapper `sun-retarget` uma transformação inversa que o mantenha
     no retângulo visual anterior;
   - animar essa correção até identidade em aproximadamente 180 ms;
   - retomar a timeline sem mudar a geração.
4. Desconectar observer e cancelar correções no complete/unmount.

ResizeObserver notifica mudança de tamanho do elemento e não é disparado por
transformações CSS; isso evita loop causado pelo próprio arco.

Fonte: https://www.w3.org/TR/resize-observer/

### Why not merely call `setKeyframes`

Trocar keyframes preservando `currentTime` preserva o progresso lógico, mas
pode mudar instantaneamente a posição amostrada. A camada FLIP é o que absorve
essa diferença perceptual. O keyframe effect e a correção precisam estar em
wrappers diferentes para não disputar `transform`.

### Failure behavior

Se qualquer etapa de retarget falhar, concluir para o hero final. Um resize
jamais justifica prender o usuário ou reiniciar os 3 segundos.

## Navigation Intent and 150–200 ms Completion

Interrupção não deve chamar `finish()` imediatamente, pois isso criaria o corte
seco rejeitado. Use aceleração:

1. calcular tempo local restante da timeline;
2. escolher playback rate suficiente para consumir o restante em no máximo
   180 ms;
3. chamar `updatePlaybackRate()` em todas as animações;
4. não chamar `preventDefault()` no evento que revelou a intenção;
5. manter scroll/toque/foco/navegação ocorrendo normalmente.

Eventos relevantes, todos temporários e passivos quando aplicável:

- scroll real acima do limiar já existente;
- `pointerdown`/click em navegação ou CTA;
- foco/ativação do skip link;
- navegação de rota/unmount: cleanup sem state update.

WAAPI define `updatePlaybackRate()` como atualização suave da velocidade,
diferente de sobrescrever `playbackRate` de modo abrupto.

Fonte: https://www.w3.org/TR/web-animations-1/#seamlessly-update-the-playback-rate-of-an-animation

Se aceleração lançar, a fronteira fail-open mostra o frame final
imediatamente. A ação do usuário continua soberana.

## Fail-Open Lifecycle

Este é gap bloqueante comprovado pela verificação anterior. A nova arquitetura
tem mais animações, portanto não pode repetir chamadas WAAPI sem proteção.

### Required properties

- conclusão idempotente;
- callback de complete executado no máximo uma vez;
- exceção em qualquer `animate`, `pause`, `setKeyframes`,
  `updatePlaybackRate`, `finish` ou `cancel` termina em hero final;
- cleanup de unmount não chama state setter;
- listeners, observers, RAFs e animations pertencem a uma geração;
- Strict Mode setup → cleanup → setup não deixa handles obsoletos;
- `animation.finished` sempre recebe rejeição tratada, ou não é usado como
  único mecanismo de conclusão.

### Recommended boundary

```ts
function commitFinal(reason: IntroCompletionReason) {
  if (completed || disposed) return
  completed = true

  try {
    promoteDomToFinalState()
  } finally {
    try {
      for (const animation of animations) {
        animation.onfinish = null
        animation.cancel()
      }
    } catch {
      // final DOM state is already authoritative
    } finally {
      onComplete(reason)
    }
  }
}
```

Na prática, cada operação em um array também deve ser isolada para que uma
animação defeituosa não impeça cleanup das demais. `AbortController` pode
agrupar listeners, mas RAF, ResizeObserver e Animation ainda exigem cleanup
próprio.

React Strict Mode executa um ciclo extra de setup/cleanup em desenvolvimento;
isso deve ser usado como teste de simetria, não contornado.

Fonte: https://react.dev/reference/react/StrictMode

## Accessibility and Interaction

### Reduced motion

Para `reduce`, a primeira renderização deve ser `complete`; não iniciar WAAPI,
não usar fade curto e desligar loops de ondas. Se a preferência mudar para
`reduce` durante a cena, concluir imediatamente no frame final. Se voltar para
`no-preference`, não reiniciar na mesma montagem.

### Focus and inert

- Skip link continua primeiro no DOM e fora de `inert`.
- Camadas ambientais têm `aria-hidden="true"` e `pointer-events:none`.
- Conteúdo semântico pode permanecer no DOM; apenas grupos visualmente
  indisponíveis ficam `inert`.
- Remover `inert` no mesmo momento em que a opacidade do grupo começa a dar
  leitura suficiente; não apenas no final dos 3 segundos.
- Topbar não deve ficar invisível e inoperável por toda a abertura. O plano
  visual deve decidir se ela está presente desde o primeiro frame ou entra
  cedo, mas qualquer intenção de foco/navegação acelera a cena.
- Nunca usar `aria-hidden` em ancestral que contenha o elemento focado.

O atributo `inert` remove descendentes do clique, foco, tab order e accessibility
tree, portanto deve corresponder ao estado visível e não ser usado como lock
global.

Fontes:

- HTML Standard: https://html.spec.whatwg.org/multipage/interaction.html#inert
- MDN inert: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inert

### Contrast

O contraste precisa ser verificado nos keyframes intermediários, não apenas no
hero final. Texto não deve aparecer enquanto o fundo ainda atravessa uma
combinação que reprove AA. Uma solução segura é colocar a copy sobre uma região
de plum/cream estável ou usar uma sombra/placa editorial prevista no design,
sem glassmorphism.

## Early Visual Approval Gate

Qualidade subjetiva foi o motivo da rejeição anterior. O plano deve colocar um
checkpoint humano **antes** da implementação completa de lifecycle e testes.

### Deliverable

Construir a cena estratificada e um seek determinístico inteiramente externo ao
bundle. O visual spec deve abrir o preview normal de produção e usar
`page.addInitScript()` antes da navegação para envolver
`Element.prototype.animate` no page world. O wrapper sempre delega ao método
original, pausa/registra somente os handles finitos cujos elementos owners
possuem atributos semânticos `data-intro-*`, e deixa animações não pertencentes
à intro seguirem sem alteração. A namespace que guarda handles e aplica
`currentTime` é criada exclusivamente pelo init script; uma execução separada
sem injeção deve provar que ela não existe no preview normal. Produzir
keyframes em:

- desktop 1280×800;
- mobile 320×760.

Frames mínimos:

1. `0%` — primeiro frame completo;
2. `35–45%` — arco e profundidade em movimento;
3. `68–75%` — halo/reflexo começando o encaixe;
4. `85–90%` — paisagem formada + primeira hierarquia tipográfica;
5. `100%` — hero final.

Entregar como duas contact sheets ou dez imagens lado a lado, com nomes de
progresso. Não pedir aprovação com a animação já inteira e todos os testes
feitos.

### Approval questions

- A paisagem do frame 0 parece uma cena finalizada ou ainda um fundo de
  protótipo?
- O arco é natural e diagonal?
- O recuo parece câmera ou zoom de interface?
- Halo e reflexo absorvem o pouso?
- Desktop e mobile parecem composições dirigidas, não crops?
- O frame 100% ainda é claramente o hero do convite?

### Blocking rule

Se o visual não for aprovado, revisar as camadas e keyframes sem avançar para
resize, bfcache e matriz de release. Após aprovação, atualizar `DESIGN.md` com a
nova regra normativa.

Playwright pode seekar animações por `currentTime`, e seus screenshots podem
desabilitar animações. Para este checkpoint, o init script deve aguardar todas
as tracks semânticas coordenadas, pausar seus handles, aplicar o mesmo progresso
normalizado a todas e então aguardar paints antes de capturar o frame estável.
Isso evita qualquer API compilada no app e continua exercitando o build servido
por `npm run preview`.

Fontes:

- Web Animations — testing animations:
  https://www.w3.org/TR/web-animations-1/#testing-animations
- Playwright visual comparisons:
  https://playwright.dev/docs/test-snapshots

## Testing Strategy

### Pure/unit tests

Extrair e testar:

- elegibilidade de hash;
- resolução da fase inicial por reduced motion;
- normalização `progress = currentTime / duration`;
- cálculo de playback rate para terminar em 150–200 ms;
- pontos normalizados desktop/mobile e conversão para deltas do alvo;
- limiar de scroll;
- idempotência do completion reason, se modelada de forma pura.

Não testar layout, transforms computados ou `DOMRect` em jsdom.

### Browser contract tests

Reescrever o spec atual em torno de comportamento novo:

- primeiro frame contém sky + horizon + sea + silhouette layers visíveis;
- existe exatamente um `[data-intro-sun]`;
- arco tem deslocamento X e Y e termina no target real com tolerância de
  subpixel;
- scene camera termina em `transform:none`;
- reflection aumenta antes da chegada e termina alinhada ao sol;
- primary copy precede secondary copy e a janela total fica em 500–700 ms;
- duração nominal ~3000 ms;
- intenção de navegação conclui em 150–200 ms sem perder scroll/foco/click;
- reduced motion monta frame final sem nenhuma animação finita;
- resize mantém a mesma geração/progresso e não produz salto grande entre dois
  frames consecutivos;
- fragmentos pulam intro e chegam à seção;
- remount e `pageshow.persisted` reiniciam exatamente uma geração;
- produção não usa `data-testid` como seletor;
- preview de produção sem `addInitScript` não expõe namespace/bridge de seek;
- wrapper injetado delega animações não-intro e registra somente owners
  semânticos `data-intro-*`;
- todas as layers decorativas são pointer-transparent.

### Forced failure matrix

Monkeypatch de browser para lançar em:

- `Element.prototype.animate`;
- `Animation.prototype.updatePlaybackRate`;
- `Animation.prototype.finish`;
- `Animation.prototype.cancel`;
- `KeyframeEffect.prototype.setKeyframes`, se retarget usar essa API.

Em cada caso provar:

- estado final;
- header e CTA visíveis;
- `inert` removido;
- skip funcional;
- nenhuma exceção não tratada;
- scroll/navegação preservados.

### Visual tests

Screenshots não devem congelar cada pixel animado da timeline como gate
permanente antes da aprovação. Depois de aprovada a direção:

- manter snapshots somente dos keyframes canônicos 0%, ~70% e 100%;
- gerar em ambiente estável;
- separar snapshot artístico (Chromium) da matriz comportamental cross-browser;
- continuar backstop humano em Safari/iPhone reais para halo, mask e
  rasterização.

### Accessibility and release

- Corrigir o helper Axe atual: se o teste se chama “AA”, não descartar
  violações `moderate/minor` apenas pelo impact.
- Verificar tab order antes, durante e depois.
- Verificar que texto não está disponível ao foco enquanto visualmente
  oculto.
- Verificar 320px sem overflow.
- Testar `forcedColors` se a arte interfere em controles; a cena pode degradar,
  mas o conteúdo não.

## Validation Architecture

Esta seção deve alimentar diretamente `10-VALIDATION.md`.

### Validation layers

| Layer | Tool | What it proves | When |
|---|---|---|---|
| Static/type | TypeScript + build | props, controller, refs e imports válidos | toda task |
| Unit policy | Vitest | hash, reduced motion, progress, rate e geometry math | toda task lógica |
| Visual checkpoint | Playwright `addInitScript` + WAAPI seek + screenshots no preview de produção | direção de arte em frames desktop/mobile sem API de teste no bundle | **antes do lifecycle completo** |
| Focused browser | Playwright `cinematic-intro.spec.ts` | timeline, geometria, resize, intent, failure, focus | por plan |
| Cross-browser | projetos Chromium/WebKit | composição e lifecycle em desktop/mobile | após aprovação visual |
| Release regression | `npm run test:release` | convite e rotas existentes não regrediram | último plan |
| Human hardware | Chrome/Safari reais | percepção sem blink, performance, bfcache real | fase/UAT |

### Proposed commands

```bash
npm test -- src/lib/cinematicIntro.test.ts
npm run build
npx playwright test tests/cinematic-intro.spec.ts --project=emulated-chromium-desktop
npx playwright test tests/cinematic-intro.spec.ts
npm run test:release
```

### Nyquist mapping

| Risk | Cheapest reliable signal |
|---|---|
| estética ainda parece protótipo | checkpoint humano de keyframes |
| arco termina fora do sol final | DOMRect real antes/depois + identidade do nó |
| resize salta/reinicia | viewport mutation mid-timeline + generation/currentTime |
| interação cria corte seco | medir tempo entre intent e complete; observar frames intermediários |
| falha WAAPI prende UI | monkeypatch throwing + operabilidade |
| reduced motion anima | `emulateMedia` + `getAnimations()` |
| mobile é crop | screenshot 320×760 aprovado separadamente |
| regressão de foco | ordem Tab/skip/inert em Playwright |
| máscara difere em Safari | WebKit em CI + hardware real |
| bfcache deixa handles | evento sintético automatizado + back/forward real em UAT |

### Task-level feedback rule

Nenhuma task de código deve encerrar apenas com `npm run build`. Toda task de
motion/lifecycle precisa de pelo menos um teste focused que falhe antes e passe
depois. A task puramente artística encerra com artefatos de keyframes e
checkpoint humano, não com uma alegação automática de “cinematográfico”.

### Manual verification that remains legitimate

1. continuidade perceptual de halo/reflexo em Chrome e Safari reais;
2. sensação de câmera versus zoom;
3. qualidade editorial do primeiro frame;
4. bfcache real;
5. fluidez em aparelho mobile intermediário/baixo.

Esses itens não substituem os contratos automatizáveis; complementam-nos.

## Performance Budget and Techniques

- Animar somente `transform` e `opacity` nas camadas grandes.
- Não animar `filter`, gradiente, mask, `background-position`, `top`, `left`,
  largura ou altura durante os 3 segundos.
- No máximo duas nuvens agrupadas por profundidade, uma haze, uma reflection,
  três wave bands e duas silhuetas — evitar dezenas de compositing layers.
- Usar `will-change` apenas durante `playing`, removendo no complete.
- Textura estática e pequena.
- Nenhum vídeo, canvas full-screen ou imagem remota.
- SVGs devem ter paths simples e `viewBox` previsível.
- Não atualizar React state por frame; WAAPI controla frames e React recebe
  somente transições de lifecycle.
- Resize faz leituras/escritas agrupadas e raras, nunca loop permanente de
  layout.

O guia web.dev recomenda limitar animações, quando possível, a transform e
opacity e verificar o pipeline no profiler.

Fonte: https://web.dev/articles/animations-guide

## Anti-Patterns to Avoid

- **Polir a queda antiga:** alterar easing/cor sem reconstruir a paisagem
  contínua não atende a revisão.
- **Hero falso sobre hero real:** cria swap e duplica geometria.
- **Background A → background B:** viola o plano-sequência.
- **Fade geral no fim:** repete o reveal abrupto rejeitado.
- **Animar um gradiente full-screen:** gera paint e ainda tende a parecer
  protótipo.
- **Filtro blur animado em várias camadas:** caro no mobile.
- **Canvas ou vídeo:** dificulta responsive target, reduced motion, tokens,
  acessibilidade e peso.
- **Path solar com coordenadas fixas em pixels:** quebra mobile/resize.
- **Mesmo crop para desktop/mobile:** viola direção de arte própria.
- **`setTimeout(3000)` como fonte de verdade:** perde aceleração, seek e falhas.
- **`animation.finished` sem catch:** cancelamento rejeita a promise.
- **`finish()` direto em toda intenção:** cria o corte seco proibido.
- **`inert` no `<main>` ou no skip:** bloqueia navegação.
- **Opacidade zero sem `inert`:** deixa controles invisíveis focáveis.
- **CSS de produção baseado em `data-testid`:** acopla comportamento a teste.
- **Snapshots antes de aprovação humana:** cristaliza pixels ruins.
- **Aprovar somente o frame final:** o problema existe no primeiro frame e na
  ponte de encaixe.

## Common Pitfalls

### Pitfall 1: The landscape is technically present but still looks flat

**Cause:** todas as camadas compartilham contraste, velocidade e plano.
**Avoid:** pelo menos dois níveis de nuvem, haze de horizonte, plano distante,
reflexo e diferença de parallax. Validar frame 0 isoladamente.

### Pitfall 2: The arc reads as polyline

**Cause:** poucos keyframes lineares ou easings iguais em todos os segmentos.
**Avoid:** 3–4 keyframes com easing por trecho e desaceleração longa na
aproximação. Aprovar o frame intermediário e a animação em velocidade reduzida.

### Pitfall 3: Landing still looks like snapping

**Cause:** sol termina antes de halo/reflexo ou base CSS difere do keyframe
final.
**Avoid:** começar a conexão luminosa antes de 70%, terminar todos em base
styles idênticos e checar o frame anterior/posterior ao complete.

### Pitfall 4: Camera feels like UI zoom

**Cause:** escala inicial excessiva, texto dentro da câmera ou parallax amplo.
**Avoid:** câmera só na arte, não na copy; amplitude ~3.5–5.5%; texto entra
separadamente.

### Pitfall 5: Resize preserves time but visibly jumps

**Cause:** reconstruir keyframes sem compensar a amostra visual.
**Avoid:** wrapper FLIP separado, mesmo `currentTime`, correção ~180 ms.

### Pitfall 6: Acceleration becomes a cut

**Cause:** `finish()` imediato ou rate alto demais com menos de um frame útil.
**Avoid:** target de 180 ms, nunca desacelerar quando já falta menos, e manter
keyframe final contínuo.

### Pitfall 7: More animations multiply failure paths

**Cause:** controller conclui somente quando a última `onfinish` acontece.
**Avoid:** master completion idempotente, failures convergem a `commitFinal`,
operações isoladas por animation.

### Pitfall 8: Mobile is visually crowded

**Cause:** reaproveitar escala de nuvens, palms, reflection e copy do desktop.
**Avoid:** CSS variables e art-direction profile mobile; validar 320×760 antes
da timeline completa.

## Recommended Planning Decomposition

### Plan 10-01 — Art direction prototype and approval

- remover a lógica visual “céu-only/fade”;
- estruturar camadas reais do hero;
- desenhar sky overlays, clouds, haze, reflection, waves e silhouettes;
- manter um sol canônico;
- criar seek determinístico test-only por `page.addInitScript()` para
  0/40/70/88/100%, sem bridge no app;
- produzir contact sheets desktop/mobile;
- checkpoint humano obrigatório;
- após aprovação, atualizar `DESIGN.md`.

**Do not** implementar bfcache/resize/release completo antes deste gate.

### Plan 10-02 — Timeline, responsive geometry and fail-open

- implementar arco diagonal e câmera/parallax;
- timeline única de 3000 ms;
- hierarquia tipográfica 500–700 ms;
- retarget FLIP em resize/orientation;
- aceleração 150–200 ms por intenção;
- fronteira fail-open cobrindo todas as operações WAAPI;
- reduced motion final imediato;
- unit e browser contracts focados.

### Plan 10-03 — Lifecycle, accessibility and release matrix

- remount/hash/bfcache/cleanup;
- foco, skip, `inert` e pointer transparency;
- Chromium/WebKit desktop/mobile;
- failure matrix;
- snapshots aprovados;
- corrigir claim Axe AA;
- release regression e roteiro UAT real.

Essa decomposição mantém o risco maior — qualidade visual — antes do custo de
engenharia de lifecycle.

## Open Questions (RESOLVED)

Não há decisão de produto bloqueante pendente. Todas as escolhas abaixo estão
**RESOLVED por delegação** ao protótipo determinístico de 10-01 Task 2 e ao
checkpoint visual bloqueante de 10-01 Task 3, dentro de Claude's Discretion:

- **RESOLVED — origem do arco:** decidir esquerda/direita separadamente para
  desktop e mobile nos keyframes; a escolha só se torna normativa após o
  checkpoint aprovar naturalidade e composição.
- **RESOLVED — silhuetas:** decidir quantidade e desenho no protótipo,
  respeitando legibilidade, tokens e a moldura mobile; o checkpoint rejeita
  qualquer resultado plano, congestionado ou com aparência de crop.
- **RESOLVED — câmera/parallax:** calibrar amplitude nos frames e na prévia de
  3 s; o checkpoint aprova somente se a leitura for de câmera, não zoom de UI.
- **RESOLVED — reflexo:** definir forma, largura e progressão no protótipo; o
  checkpoint exige que halo, horizonte e reflexo formem uma ponte contínua.
- **RESOLVED — topbar:** testar visibilidade desde o frame 0 ou entrada
  antecipada no protótipo, preservando foco/interatividade; o checkpoint
  visual escolhe a alternativa e os contratos de acessibilidade a validam.

Essas resoluções não autorizam uma decisão apenas textual: 10-01 deve registrar
nos artefatos e no resumo a alternativa efetivamente aprovada antes de 10-02.

## Sources

### Project evidence

- `.planning/phases/10-abertura-cinematogr-fica-do-p-r-do-sol/10-CONTEXT.md`
- `.planning/phases/10-abertura-cinematogr-fica-do-p-r-do-sol/10-REVIEW.md`
- `.planning/phases/10-abertura-cinematogr-fica-do-p-r-do-sol/10-VERIFICATION.md`
- `.planning/REQUIREMENTS.md`
- `.planning/PROJECT.md`
- `.planning/phases/02-convite-p-blico/02-CONTEXT.md`
- `DESIGN.md`
- `src/components/invite/Hero.tsx`
- `src/components/invite/SeaWaves.tsx`
- `src/components/layout/Shell.tsx`
- `src/hooks/useReducedMotion.ts`
- `src/lib/cinematicIntro.ts`
- `src/routes/Home.tsx`
- `src/index.css`
- `package.json`
- `playwright.config.ts`
- `tests/cinematic-intro.spec.ts`

### Primary and official web references

- W3C Web Animations Level 1:
  https://www.w3.org/TR/web-animations-1/
- CSSWG Resize Observer:
  https://www.w3.org/TR/resize-observer/
- W3C CSS Masking Level 1:
  https://www.w3.org/TR/css-masking-1/
- WHATWG HTML inert:
  https://html.spec.whatwg.org/multipage/interaction.html#inert
- React `useLayoutEffect`:
  https://react.dev/reference/react/useLayoutEffect
- React Strict Mode:
  https://react.dev/reference/react/StrictMode
- Playwright visual comparisons:
  https://playwright.dev/docs/test-snapshots
- Playwright emulation:
  https://playwright.dev/docs/emulation
- web.dev animation performance:
  https://web.dev/articles/animations-guide
- web.dev bfcache:
  https://web.dev/articles/bfcache

---

*Phase: 10 — Abertura cinematográfica do pôr do sol*
*Research revised after visual rejection: 2026-07-26*
