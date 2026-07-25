# Sol faz 40

Convite digital para a celebração dos 40 anos da Sol, em 17 de outubro de 2026, no Matapuã Eventos, em Aracaju/SE.

O projeto reúne convite, confirmação de presença, carta de presentes, memórias e uma área administrativa. A direção visual está documentada em [DESIGN.md](./DESIGN.md), sob a estrela norte **“Pôr-do-sol-se”**.

## Stack

- React 19 + TypeScript
- Vite 8
- React Router 7
- Tailwind CSS 4
- Convex
- Vitest
- Playwright + Axe

## Desenvolvimento local

Instale as dependências e inicie o Vite:

```bash
npm install
npm run dev
```

A aplicação fica disponível em `http://localhost:5173`.

## Comandos

| Comando | Função |
|---|---|
| `npm run dev` | Servidor local com HMR |
| `npm run build` | Type-check e build de produção |
| `npm run preview` | Visualização local do build |
| `npm test` | Testes unitários |
| `npm run test:browser` | Build + testes Playwright |
| `npm run test:release` | Suíte unitária e suíte completa de release |

## Rotas

| Rota | Uso |
|---|---|
| `/` | Convite público |
| `/confirmar` | Confirmação e edição de presença |
| `/presentes` | Carta de vinhos e presentes |
| `/admin/*` | Operação protegida |

As rotas secundárias são carregadas sob demanda. Durante a abertura de um chunk, o fallback usa o símbolo e a tipografia da marca.

## Fontes de verdade

- `src/content/event.ts`: textos, datas, URLs, navegação e conteúdo do evento.
- `src/index.css`: tokens cromáticos, tipográficos, espaciais, motion e materiais ilustrados.
- `DESIGN.md`: regras normativas de aplicação do sistema visual.
- `.impeccable/design.json`: extensões legíveis pelo painel Impeccable.
- `DEPLOY.md`: configuração e checklist de publicação.

Evite duplicar conteúdo do evento dentro dos componentes. Alterações de copy devem começar em `src/content/event.ts`.

## Decisões visuais atuais

### Hero

- A cena usa apenas céu, sol e mar; os coqueiros foram removidos.
- Uma linha de horizonte reta inicia o plano do mar e corta o disco solar.
- O disco fica atrás de todo o mar, nunca sobre a água.
- As três faixas do mar preservam o paralaxe lento.
- Não há feixe ou reflexo saindo do sol.
- “Ver programação” usa fundo cream para manter contraste ao tocar o horizonte.

### Navegação e countdown

- Topbar de 72px.
- Navegação completa a partir de 1024px; menu móvel/tablet abaixo disso.
- O menu move foco para o primeiro link, fecha com Escape e devolve foco ao botão.
- O countdown rail tem 56px, conteúdo centralizado e leitura contínua com números tabulares.
- O rail é ocultado enquanto o menu está aberto.
- Âncoras públicas compensam 128px de chrome fixo.

### Mapa

- O Google Maps permanece sempre montado e interativo.
- O mapa recebe filtro `sepia(0.18) saturate(0.78) contrast(0.94)`.
- O card do Matapuã fica no canto inferior esquerdo, acima dos controles.
- Logo, créditos e controles do Google não podem ser cobertos.
- A rota externa permanece disponível por “Abrir rota”.

### Footer

- Céu em gradiente, disco solar central e faixa plum inferior.
- Conteúdo principal: “Sol faz 40”.
- Esquerda: “Feito com 🧠 + 🫀 + 🤖 por anamnesis.MD”.
- Direita: data, Matapuã Eventos e Aracaju/SE.
- Metadados empilham em telas menores para evitar colisão.

### Componentes e acessibilidade

- Feedbacks usam borda completa e fundo tonal; faixas laterais são proibidas.
- Ilustrações usam tokens semânticos em vez de hexadecimais dispersos.
- Alvos interativos têm pelo menos 44px.
- Foco visível e contraste WCAG AA são obrigatórios.
- Motion respeita `prefers-reduced-motion` sem esconder conteúdo.
- A suíte de release cobre 320px, desktop, Chromium, WebKit, overflow, foco e Axe.

### Entrada de telefone

A máscara brasileira remove o zero de tronco doméstico quando a sequência restante representa um DDD válido, preservando o tratamento existente para o código do país `55`.

## Validação antes de publicar

Execute:

```bash
npm run test:release
```

Depois valide manualmente:

1. Home em 320px, tablet e desktop.
2. Menu móvel, Escape e retorno de foco.
3. Countdown ao passar da seção de contagem.
4. Mapa, pin, controles, atribuição e link de rota.
5. Footer em mobile e desktop.
6. Refresh direto em `/confirmar`, `/presentes` e `/admin`.

## Deploy

O projeto usa Vercel + Convex. Consulte [DEPLOY.md](./DEPLOY.md) antes de publicar.

O fluxo recomendado é:

1. Rodar `npm run test:release`.
2. Criar um deploy de preview com backend Convex isolado.
3. Fazer smoke test completo no preview.
4. Publicar em produção somente após aprovação visual e funcional.

Não publique chaves, senha administrativa ou valores sensíveis no repositório.
