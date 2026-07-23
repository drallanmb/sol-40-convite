# Phase 2: Convite Público - Context

**Gathered:** 2026-07-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Entrega a **página pública do convite** (rota `/`), completa e responsiva, **sem nenhuma interação de backend**: hero com sol + contagem regressiva, local/mapa de Aracaju + guia da cidade e hotéis, programação, dress code, topbar e footer.

Cobre INVITE-01 a INVITE-04.

**Fora do escopo desta fase** (não adicionar, nem como placeholder):
- Formulário de RSVP e qualquer mutation Convex → Phase 3
- Carta de vinhos / presentes → Phase 4
- Mural de memórias, upload de fotos, galeria → Phase 5
- Auth do dono e `/admin` → Phase 6
- Rate-limit, testes em dispositivo real, checklist dos donos → Phase 7

A rota `/` hoje contém o andaime de verificação do design system (`src/routes/Home.tsx`, Phase 1). Esta fase **substitui** esse andaime pela página real do convite.

</domain>

<decisions>
## Implementation Decisions

### Conteúdo e fidelidade ao convite antigo

- **D-01:** O conteúdo do convite é **portado do site antigo** (`sol-40-integrado/app/convite/EventSite.tsx`), melhorando o que for visivelmente melhorável. O texto antigo é a fonte canônica de copy — não reescrever do zero.
- **D-02:** A **programação está confirmada** e vai igual ao antigo, nos 7 blocos: `16:00` Chegadas & abraços · `17:00` Banda Nona · `17:45` O brinde da Sol · `19:00` Jantar sob as luzes · `20:30` Dança com Alma Gêmea · `00:30` A festa não para: Latino! · `03:00` Tudo que é bom tem que acabar 🥺. Sem nota de "provisória".
- **D-03:** Conteúdo do evento (data, local, endereço, programação, regras de traje, guia, hotéis) vive em um **arquivo de conteúdo separado** — `src/content/event.ts` — para os donos editarem horário/atração sem tocar no layout. Inclui `EVENT_DATE = "2026-10-17T16:00:00-03:00"` e `EVENT_END = "2026-10-18T05:00:00-03:00"` (portados de `lib/event.ts` do antigo).
- **D-04:** Grafia do local: **"Matapuã" em tudo** — `Matapuã Eventos · Estrada Matapuã, 1213 · Mosqueiro · Aracaju/SE`. Corrige a inconsistência do antigo (título "Matapuã", endereço "Matapoã") e fecha a pendência de grafia do checklist dos donos.
- **D-05:** **Ordem das seções:** hero → countdown → **local/Aracaju (mapa + guia + hotéis)** → programa → dress code → footer. Quem vem de fora vê local e hospedagem cedo. Sem buracos nem placeholders das seções das fases 3–5.

### Hero e arte

- **D-06:** **Manter a arte do hero** do antigo — céu em gradiente de pôr do sol, sol central com halo, linha do horizonte. Referência exata: `.hero`, `.hero-sky`, `.hero-sun`, `.hero-horizon` em `globals.css` (linhas ~187–207).
- **D-07:** **Palmeiras refeitas em SVG**, não portadas em CSS. Mesma silhueta e posicionamento do antigo (`.palm`, esquerda e direita, sangrando na base), mas desenho de verdade: folhas com nervura e variação entre os dois lados. Inline, sem arquivo de imagem.
- **D-08:** **Animação no mar** — o dono pediu explicitamente "se conseguir fazer animação no mar legal". Efeito à escolha do time (ver Claude's Discretion). Restrição: **sem vídeo e sem biblioteca de animação** — CSS/SVG puro.
- **D-09:** Assets do antigo a portar para `public/` (hoje vazio): `dress-code-men.jpg`, `dress-code-women.jpg` (galeria de referência de traje, com as legendas originais), `sol-symbol.png` (wordmark da topbar), `og.png` e favicon.

### Countdown

- **D-10:** **Quatro estados**, calculados sempre contra o offset `-03:00` explícito (correto em qualquer fuso — INVITE-01):
  1. **Antes** — contagem regressiva até `2026-10-17T00:00:00-03:00`
  2. **É HOJE** — das `00:00` às `16:00` de 17/10
  3. **É AGORA / TÁ ROLANDO** — das `16:00` de 17/10 até `05:00` de 18/10 (`EVENT_END`)
  4. **Depois** — contagem **crescente, sem teto**, com a copy **"JÁ QUE VOCÊ NÃO FOI, PERDEU!"**
- **D-11:** **Manter o trilho de countdown compacto no topbar**, que aparece ao rolar a página (comportamento e visual de `.countdown-rail` / `.countdown-compact` no `globals.css` antigo, linhas ~169–186).

### Local, mapa e guia de Aracaju

- **D-12:** **Mapa carregado sob clique.** Por padrão aparece o card do local (nome, endereço, botão "Abrir rota" que abre Google Maps/Waze). O iframe do Google Maps só é montado quando a pessoa toca em "ver mapa" — mantém a página leve e não injeta cookie de terceiro em quem não pediu.
- **D-13:** **Guia da cidade:** manter os 3 lugares do antigo (Museu da Gente Sergipana, Passarela do Caranguejo, Orla de Atalaia — com distância aproximada da festa e link do Tripadvisor) **e ampliar com os mais bem avaliados de Aracaju no Tripadvisor**. A pesquisa da fase deve levantar os candidatos.
- **D-14:** **Hotéis: incluir agora.** Os três indicados pelos donos são **Arauanã, Quality e Celi**. Nome oficial completo, link e distância aproximada da festa precisam ser confirmados na pesquisa — **não inventar URL**.

### Claude's Discretion

- **Efeito do mar (D-08):** o dono respondeu "você decide o efeito". Recomendação registrada na discussão: caminho de luz dourado descendo do sol até a borda, cintilando devagar, sobre ondas lentas na horizontal — 100% CSS/SVG. Deve respeitar `prefers-reduced-motion` (o projeto mira AA — LAUNCH-02).
- **Topbar e navegação:** o dono optou por não discutir e deixou a critério do planejamento/UI. Regra que se segue do escopo: a topbar lista **apenas** o que a Phase 2 entrega (contagem, local, programa, traje) — nada de âncora quebrada ou "em breve" apontando para RSVP/presentes/memórias. O menu hambúrguer no celular é o padrão do antigo (`.menu-toggle` / `.topbar-links`).
- **Tradução do CSS antigo para Tailwind v4:** quanto vira utilitária e quanto precisa de CSS custom (gradientes do céu, keyframes do mar, silhueta das palmeiras) é decisão técnica do planner.
- **`index.html`:** título, meta description, favicon e tags OG não existem ainda — cabe nesta fase por ser a página pública.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Fonte da verdade do projeto antigo (conteúdo e arte a portar)

- `/Users/allanmesquitabrito/Documents/Site Sol 40 anos/sol-40-integrado/design.md` — documento canônico do projeto anterior; §1 (dados do evento), §6 (funcionalidades), §8 (o que foi removido e não deve ressuscitar)
- `/Users/allanmesquitabrito/Documents/Site Sol 40 anos/sol-40-integrado/app/convite/EventSite.tsx` — **copy canônica do convite**. Linhas 398–415: hero + seção de countdown. Linhas 473–476: programação (7 blocos). Linhas 478–493: dress code + galeria. Linhas 495–503: mapa Matapuã + guia da cidade. Linha 389: menu da topbar. Linha 504: footer
- `/Users/allanmesquitabrito/Documents/Site Sol 40 anos/sol-40-integrado/app/globals.css` — **arte canônica**. Linhas 149–186: topbar + trilho de countdown. Linhas 187–219: hero, céu, sol, horizonte, palmeiras. Linha 220+: seção de countdown, programa, traje, Aracaju, footer
- `/Users/allanmesquitabrito/Documents/Site Sol 40 anos/sol-40-integrado/lib/event.ts` — `EVENT_DATE` / `EVENT_END` com offset `-03:00` e a lógica de fase do evento (antes/durante/depois)
- `/Users/allanmesquitabrito/Documents/Site Sol 40 anos/sol-40-integrado/public/` — assets a copiar: `dress-code-men.jpg`, `dress-code-women.jpg`, `sol-symbol.png`, `og.png`, `favicon.png`

### Planejamento do projeto atual

- `.planning/ROADMAP.md` § "Phase 2: Convite Público" — goal e os 3 critérios de sucesso
- `.planning/REQUIREMENTS.md` § "Convite Público" — INVITE-01 a INVITE-04
- `.planning/PROJECT.md` § Context e § Constraints — o que foi aproveitado e descartado do projeto antigo; identidade "hora dourada / pôr do sol"

### Design system entregue na Phase 1 (base obrigatória)

- `src/index.css` — tokens `@theme`: paleta pôr do sol, `--font-serif`/`--font-sans`, escala `--text-display/heading/subheading/lead/body/small/caption`, `--tracking-*`, `--duration-*`, `--ease-out`, `--space-*`, `--z-*`
- `src/components/layout/Shell.tsx` — topbar sticky com slot `nav`, `main`, footer plum
- `src/components/ui/Button.tsx`, `Card.tsx`, `Field.tsx`, `Toast.tsx` — primitivos
- `.planning/phases/01-funda-o-design-system-deploy/01-REVIEW.md` — achados da Phase 1; inclui a armadilha de sintaxe `duration-(--var)` / `z-(--var)` no Tailwind v4

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`src/index.css`** — o design system inteiro já está em `@theme`. Toda a paleta usada pelo hero antigo (`peach`, `coral`, `orange`, `plum`, `cream`, `sand`, `sea`) e a escala tipográfica (`text-display` para "Sol", `text-heading` para títulos de seção) existem como utilitárias. Nada de cor ou fonte precisa ser criado.
- **`src/components/layout/Shell.tsx`** — já tem topbar sticky com `z-(--z-sticky)`, `backdrop-blur` e um slot `nav`; o footer plum já traz "17 de outubro de 2026 · Matapuã Eventos · Aracaju/SE". Falta o comportamento de scroll (topbar condensada + trilho de countdown) e o menu hambúrguer — ambos são desta fase.
- **`src/components/ui/Button.tsx`** — variantes `primary` e `quiet` correspondem exatamente aos dois CTAs do hero antigo (`.button-primary` "Confirmar presença" e `.button-link` "Ver programação ↓").
- **`src/components/ui/Card.tsx`** — superfície cream com sombra offset; base natural para os cards do guia da cidade, dos hotéis e do card do local.

### Established Patterns

- **Tailwind v4 utility-first, sem folha de estilo por componente.** O projeto antigo era 940 linhas de CSS escrito à mão com classes nomeadas (`.hero`, `.palm`, `.countdown-rail`). Portar significa **traduzir para utilitárias**, com CSS custom só onde utilitária não alcança (gradientes multicamada do céu, `@keyframes` do mar, silhueta das palmeiras).
- **Mobile-first**, `bg-cream text-ink`, `font-serif` para display e `font-sans` para corpo.
- **Armadilha da Phase 1:** `duration-*` e `z-*` não têm namespace `@theme` oficial no Tailwind v4 — usar a sintaxe de parênteses (`duration-(--duration-medium)`, `z-(--z-sticky)`), nunca a utilitária nomeada.
- **Acessibilidade** já embutida na base: `:focus-visible` com outline coral e `::selection`. O antigo tinha skip link (`.skip-link`) — vale portar.

### Integration Points

- **`src/routes/Home.tsx`** — é o andaime de verificação do DS e será **substituído** pela página do convite.
- **`src/App.tsx`** — rota `/` já aponta para `Home`; não precisa mexer no roteamento.
- **`src/components/layout/Shell.tsx`** — recebe o `nav` da topbar e precisa evoluir para suportar o estado de scroll e o trilho de countdown.
- **`public/`** — **está vazio**; nenhum asset do projeto antigo foi portado ainda.
- **`index.html`** — só tem `<title>Sol faz 40</title>`; sem meta description, favicon ou OG.
- **`convex/schema.ts`** — **não é tocado nesta fase**. O convite é estático.

</code_context>

<specifics>
## Specific Ideas

- **"JÁ QUE VOCÊ NÃO FOI, PERDEU!"** — copy literal, pedida pelo dono, para o estado pós-festa do countdown, com a contagem crescendo "até o infinito". É uma piada intencional: manter o tom, não amenizar.
- **"É HOJE"** — copy literal para o dia do evento antes de a festa começar.
- **"animação no mar legal"** — o pedido veio com essa palavra: o mar precisa ter movimento que valha a pena, não um efeito discreto demais para se notar.
- **"melhorar o que é visível pra melhora"** — a instrução do dono foi reproduzir o antigo *e* melhorar onde der. As palmeiras em SVG (D-07) foram o primeiro exemplo escolhido por ele.
- O hero antigo tem duas linhas de meta na base (`MATAPUÃ EVENTOS` / `ARACAJU · SERGIPE`) e um eyebrow `17 OUT · 16H · ARACAJU` — detalhes pequenos que dão o tom, vale portar.
- Kickers de seção em caixa alta com `tracking-label` (`ATÉ A GENTE SE ENCONTRAR`, `TRAJE OBRIGATÓRIO`, `PRA QUEM VEM DE FORA`, `O ENCONTRO`) são assinatura visual do antigo.

</specifics>

<deferred>
## Deferred Ideas

- **Links de navegação para RSVP, Presentes e Memórias** — as seções nascem nas fases 3, 4 e 5; cada fase acrescenta o próprio link na topbar. Nada de âncora quebrada ou "em breve" agora.
- **Hospedagem além dos 3 hotéis** (bloco de descontos/parceria) — se os donos fecharem indicação, entra na Phase 7 junto com o checklist.
- **Álbum público / telão** — já registrado como v2 no PROJECT.md.

</deferred>

---

*Phase: 2-Convite Público*
*Context gathered: 2026-07-23*
