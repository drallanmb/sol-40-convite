# Phase 5: Mural de Memórias + Moderação - Context

**Gathered:** 2026-07-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Entrega uma dobra pública de memórias na home na qual convidados enviam uma foto, um recado ou ambos. Cada envio cria uma memória pendente; nada enviado pelo público aparece no álbum antes de aprovação. A mesma dobra exibe somente memórias aprovadas em um carrossel público.

Cobre WALL-01 a WALL-05: schema Convex `posts` preparado para o telão v2, upload em três passos com validação server-side e redução no cliente, recados, leitura pública restrita a aprovados e rate-limit do envio público.

**Fora do escopo desta fase:**
- Interface administrativa para aprovar ou ocultar memórias → Phase 6 (`ADMIN-05`)
- Autenticação dos donos e demais funções de `/admin` → Phase 6
- Telão/slideshow em tela cheia e QR das mesas → v2 (`LIVE-01`, `LIVE-02`)
- Ingestão de Instagram → v2 (`IG-01`, `IG-02`)

</domain>

<decisions>
## Implementation Decisions

### Forma de participação

- **D-01:** Cada memória aceita **foto sozinha, recado sozinho ou foto e recado juntos**. Pelo menos um dos dois conteúdos precisa existir.
- **D-02:** O autor é opcional. Quando omitido, a assinatura pública do card é **“De alguém que te ama”**.
- **D-03:** Cada submissão cria exatamente **um card/memória**. Não há seleção de várias fotos nem miniálbum em uma única submissão.
- **D-04:** Depois de um envio bem-sucedido, foto e recado são limpos, mas o nome do autor permanece preenchido para facilitar envios consecutivos.

### Experiência de envio

- **D-05:** O mural vive em uma **dobra da home depois do dress code e antes do rodapé**. Não ganha rota pública dedicada nesta fase.
- **D-06:** Dentro da dobra, o **carrossel de memórias aprovadas vem antes do formulário**.
- **D-07:** A prévia mostra a imagem inteira e permite **trocar ou remover** a foto. Não haverá editor de recorte/reposicionamento.
- **D-08:** Durante o processamento, a interface mostra progresso. Se upload ou submissão falhar, preserva foto, recado e nome e oferece **“Tentar novamente”**.
- **D-09:** Após sucesso, um estado de confirmação substitui temporariamente o formulário, explica que a memória **aguarda aprovação** e oferece **“Enviar outra memória”**. Essa ação reabre o formulário já limpo conforme D-04.

### Álbum público

- **D-10:** A leitura pública e o carrossel recebem **somente posts aprovados**; posts pendentes ou ocultos nunca entram no payload público.
- **D-11:** As memórias aprovadas são **embaralhadas uma vez ao abrir a página**. A sequência permanece estável durante aquela visita.
- **D-12:** O carrossel avança automaticamente em ritmo lento, possui setas e gesto de arrastar, pausa após interação e respeita `prefers-reduced-motion`.
- **D-13:** Os cards usam moldura/tamanho consistente. Quando há foto, ela aparece acima e o recado abaixo; recado sem foto ocupa a mesma moldura com composição tipográfica central.

### Limites e repetição

- **D-14:** Recados têm limite rígido de **280 caracteres**, com contador visível de caracteres restantes e bloqueio ao atingir o limite.
- **D-15:** JPEG, PNG e WebP são formatos obrigatórios. HEIC/HEIF de iPhone deve ser convertido quando o navegador permitir; quando não for possível, a interface apresenta orientação clara.
- **D-16:** Fotos grandes são reduzidas automaticamente no cliente antes do upload, preservando qualidade adequada ao mural. Tipo e tamanho reais continuam sendo validados no servidor após o upload; metadados declarados pelo cliente não bastam.
- **D-17:** Não há teto de produto para quantas memórias uma pessoa ou dispositivo pode enviar. Os envios são feitos um por vez; o rate-limit existe apenas para conter rajadas e abuso.

### Claude's Discretion

- Copy exata de título, instruções, progresso, erros de formato/tamanho e estado vazio, mantendo o tom afetivo do convite.
- Tempo do autoplay, duração da pausa depois de interação, quantidade de cards visíveis por breakpoint e indicadores do carrossel, desde que D-12 e acessibilidade sejam preservados.
- Limites técnicos exatos de arquivo original/final, dimensões do downscale, qualidade de compressão e política de rate-limit, desde que fotos comuns de celular tenham bom caminho de sucesso e D-15–D-17 sejam respeitadas.
- Estratégia técnica de conversão HEIC/HEIF e fallback por navegador; orientação de fallback deve ajudar o convidado a enviar uma versão compatível sem perder o recado.
- Limites razoáveis para o nome opcional, sanitização de texto, fixtures e estratégia de testes.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Escopo e decisões do projeto atual

- `.planning/ROADMAP.md` § “Phase 5: Mural de Memórias + Moderação” — objetivo, dependência, critérios de sucesso e decomposição inicial da fase.
- `.planning/REQUIREMENTS.md` § “Mural de Memórias” — WALL-01 a WALL-05 e estados `pendente`/`aprovado`/`oculto`.
- `.planning/PROJECT.md` — stack, identidade visual, moderação obrigatória e funcionalidades explicitamente removidas do v1.
- `.planning/phases/02-convite-p-blico/02-CONTEXT.md` — composição e ordem atuais da home, design system e regra de a fase proprietária adicionar seu próprio conteúdo/navegação.
- `.planning/phases/03-rsvp/03-CONTEXT.md` — padrões atuais de operação pública, preservação de rascunho, rate-limit e feedback acessível.

### Projeto atual

- `convex/schema.ts` — schema existente; a Phase 5 adiciona `posts` sem alterar as invariantes de RSVP.
- `convex/rsvpRateLimits.ts` — padrão instalado de rate-limit Convex com limites por porta e globais; reutilizar o padrão, não necessariamente os mesmos valores.
- `src/routes/Home.tsx` — composição na qual a dobra de memórias entra após `DressCodeSection`.
- `src/components/layout/Shell.tsx` — shell, navegação responsiva e padrões de foco/movimento da home.
- `src/content/event.ts` — fonte canônica dos IDs e links de navegação; ponto natural para acrescentar “Memórias”.
- `src/components/ui/Button.tsx` — ações de envio, nova tentativa e novo envio.
- `src/components/ui/Card.tsx` — superfície base para formulário e cards do carrossel.
- `src/components/ui/Field.tsx` — entrada do autor opcional e recado, adaptada ao contador de 280 caracteres.
- `src/components/ui/Toast.tsx` — feedback acessível auxiliar; o sucesso principal continua inline por D-09.
- `src/index.css` — tokens e regras globais de acessibilidade/movimento do design system pôr do sol.

### Referência do projeto anterior

- `/Users/allanmesquitabrito/Documents/Site Sol 40 anos/sol-40-integrado/design.md` §§ 4, 6, 7 e 8 — modelo anterior de posts, moderação e invariantes; usar como referência sem ressuscitar telão, QR, Instagram ou papéis removidos do v1.
- `/Users/allanmesquitabrito/Documents/Site Sol 40 anos/sol-40-integrado/lib/upload-core.mjs` — validação anterior por magic bytes, formatos JPEG/PNG/WebP/HEIC e limite histórico de 12 MB.
- `/Users/allanmesquitabrito/Documents/Site Sol 40 anos/sol-40-integrado/app/fotos/UploadForm.tsx` — experiência anterior de seleção/downscale de foto; adaptar às decisões atuais de prévia, retry e sucesso inline.
- `/Users/allanmesquitabrito/Documents/Site Sol 40 anos/sol-40-integrado/app/api/uploads/route.ts` — porta anterior de upload e defesa server-side; traduzir para o fluxo de storage do Convex, não portar a infraestrutura R2.
- `/Users/allanmesquitabrito/Documents/Site Sol 40 anos/sol-40-integrado/app/api/posts/route.ts` — criação e estados anteriores de post; adaptar ao schema e às fronteiras atuais.
- `/Users/allanmesquitabrito/Documents/Site Sol 40 anos/sol-40-integrado/tests/upload-core.test.mjs` — casos anteriores de formato, tamanho e sniffing que podem inspirar a matriz de testes atual.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `Button`, `Card`, `Field` e `Toast` cobrem ações, superfícies, campos e feedback auxiliar sem introduzir outro kit visual.
- `Shell` já implementa navegação desktop/mobile, foco e `prefers-reduced-motion` como preocupação do projeto.
- `ConvexProvider` já envolve o cliente inteiro em `src/main.tsx`; o carrossel pode consumir uma query reativa de aprovados e o formulário pode usar as mutations de upload/post.
- `@convex-dev/rate-limiter` já está instalado e usado no RSVP.

### Established Patterns

- React Router com a home composta em `src/routes/Home.tsx`; a dobra não exige nova rota.
- Conteúdo e links de navegação centralizados em `src/content/event.ts`.
- Componentes mobile-first, Tailwind v4, foco visível e alvos de toque de pelo menos 44px.
- Fluxos públicos preservam rascunho em falhas e distinguem sucesso, erro recuperável e rate-limit.
- Validações puras e transformações do cliente vivem em `src/lib/` com testes adjacentes; regras Convex são testadas com o harness já estabelecido na Phase 3.

### Integration Points

- Adicionar `MemoriesSection` depois de `DressCodeSection` em `Home.tsx` e o link correspondente a `NAV_LINKS`.
- Expandir `convex/schema.ts` com `posts` e índices que suportem leitura pública por status e fila administrativa futura.
- Criar o fluxo Convex de upload em três passos: gerar URL, enviar arquivo e finalizar/validar/criar post.
- A query pública deve aplicar o filtro de aprovado no backend, não depender de filtragem no React.
- A Phase 6 consumirá os mesmos posts pendentes/aprovados/ocultos para a fila de moderação; esta fase prepara a API/schema, mas não constrói a tela administrativa.

</code_context>

<specifics>
## Specific Ideas

- Assinatura literal para autor omitido: **“De alguém que te ama”**.
- Copy central do sucesso: a memória **“aguarda aprovação”** e ainda não aparece no mural.
- A ação após sucesso deve ser literalmente equivalente a **“Enviar outra memória”**.
- O mural deve parecer um álbum afetivo e vivo, não uma grade administrativa: cards consistentes, ordem surpreendente por visita e movimento gentil.
- Enviar várias memórias deve ser natural, mas sempre como envios individuais para cada uma poder ser moderada e exibida como card próprio.

</specifics>

<deferred>
## Deferred Ideas

- Aprovar e ocultar posts na fila de moderação de `/admin` → Phase 6 (`ADMIN-05`).
- Telão/slideshow de fotos e recados aprovados → v2 (`LIVE-01`).
- QR das mesas apontando para upload de fotos → v2 (`LIVE-02`).
- Instagram e menções passando pela moderação → v2 (`IG-01`, `IG-02`).

</deferred>

---

*Phase: 5-Mural de Memórias + Moderação*
*Context gathered: 2026-07-24*
