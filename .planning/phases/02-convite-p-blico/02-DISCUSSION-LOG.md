# Phase 2: Convite Público - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-23
**Phase:** 2-Convite Público
**Areas discussed:** Fidelidade ao convite antigo, Arte do hero + countdown, Mapa e guia de Aracaju

---

## Seleção das áreas

| Option | Description | Selected |
|--------|-------------|----------|
| Fidelidade ao convite antigo | Reproduzir 1:1 o conteúdo do EventSite antigo ou revisar/atualizar | ✓ |
| Arte do hero + countdown | Portar a arte CSS pura ou simplificar; trilho no topbar; estado ao zerar | ✓ |
| Mapa e guia de Aracaju | iframe do Google vs estático; guia Tripadvisor; hotéis | ✓ |
| Navegação e seções futuras | Topbar com hambúrguer/âncoras; links de RSVP/presentes/mural | |

**User's choice:** as três primeiras, mais uma resposta livre.
**Notes:** o dono acrescentou de imediato, em texto livre: *"Seguir projeto, fazer agora o que tem que ser feito agora; Reproduz o conteúdo do site antigo, mas tente melhorar o que é visível pra melhora; arte da hero, se puder, manter, se conseguir fazer animação no mar legal, countdond quando chegar ao zero, no dia é É HOJE; um dia depois contagem crescente até o infinito com 'JÁ QUE VOCÊ NÃO FOI, PERDEU!'"*. Isso pré-decidiu escopo, fidelidade de conteúdo, manutenção da arte do hero e os estados do countdown antes das perguntas.

---

## Fidelidade ao convite antigo

### Programação

| Option | Description | Selected |
|--------|-------------|----------|
| Confirmada — portar igual | Os 7 blocos exatos, em arquivo de conteúdo separado editável sem mexer no layout | ✓ |
| Portar, mas marcar provisória | Mesmo conteúdo com nota "sujeita a ajustes" caso banda/horário mudem até outubro | |
| Tenho mudanças | Dono passa a programação atualizada agora | |

**User's choice:** Confirmada — portar igual.
**Notes:** fecha a dúvida de dado do mundo real — as atrações (Banda Nona, Alma Gêmea, Latino) e horários estão fechados.

### Grafia do local

| Option | Description | Selected |
|--------|-------------|----------|
| Matapuã em tudo | Nome e endereço com "u" | ✓ |
| Manter como no antigo | Nome "Matapuã", rua "Matapoã" — poderiam ser grafias diferentes (casa x logradouro) | |
| Confirmo depois | Portar como está e registrar como pendência da Phase 7 | |

**User's choice:** Matapuã em tudo.
**Notes:** resolve a inconsistência do site antigo e fecha a pendência "grafia Matapuã" que constava no checklist dos donos.

### Fotos do dress code

| Option | Description | Selected |
|--------|-------------|----------|
| Portar as mesmas | Copiar dress-code-men.jpg e dress-code-women.jpg para public/, com as legendas | ✓ |
| Só texto, sem foto | Seção de traje só com regras e tratamento do design system | |
| Vou mandar fotos novas | Espaço pronto, imagens depois | |

**User's choice:** Portar as mesmas.

### Ordem das seções

| Option | Description | Selected |
|--------|-------------|----------|
| Hero → countdown → programa → traje → local | Ordem do antigo, menos as seções futuras | |
| Local logo após o countdown | Quem vem de fora vê local, mapa e guia cedo | ✓ |
| Você decide | A critério do planejamento/UI | |

**User's choice:** Local logo após o countdown.
**Notes:** ordem final — hero → countdown → local/Aracaju → programa → traje → footer.

---

## Arte do hero + countdown

### Palmeiras

| Option | Description | Selected |
|--------|-------------|----------|
| Refazer em SVG | Mesma silhueta e posição, desenho de verdade (folhas com nervura, variação entre os lados), inline e leve | ✓ |
| Portar igual em CSS | Fidelidade máxima; as mesmas seis pás girando em torno do tronco | |
| Sem palmeiras | Hero só com céu, sol e mar | |

**User's choice:** Refazer em SVG.
**Notes:** primeiro exemplo concreto do "melhorar o que é visível" que o dono pediu.

### Animação no mar

| Option | Description | Selected |
|--------|-------------|----------|
| Caminho de luz cintilando | Faixa dourada do sol até a borda, brilho tremulando devagar | |
| Ondas suaves | Linhas de onda deslizando na horizontal sob o horizonte | |
| Os dois juntos | Caminho de luz sobre ondas lentas, 100% CSS/SVG | |
| Você decide o efeito | A critério do time, sem pesar no celular | ✓ |

**User's choice:** Você decide o efeito.
**Notes:** a restrição do dono foi qualitativa — "animação no mar legal", ou seja, movimento que se note. Registrado em CONTEXT.md como discrição do Claude, com recomendação (caminho de luz sobre ondas lentas) e o requisito de `prefers-reduced-motion`.

### Trilho de countdown no topbar

| Option | Description | Selected |
|--------|-------------|----------|
| Manter o trilho | Aparece ao rolar, igual ao antigo; mantém a urgência presente | ✓ |
| Só a seção dedicada | Topbar limpa, uma coisa a menos competindo no celular | |
| Trilho só no desktop | Desktop ganha o trilho; celular fica limpo | |

**User's choice:** Manter o trilho.

### Estados do countdown

| Option | Description | Selected |
|--------|-------------|----------|
| É HOJE até o fim da festa | "É HOJE" de 00h de 17/10 até 05h de 18/10; depois, crescente | |
| É HOJE só no dia 17 | "É HOJE" das 00h às 23h59; a partir de 18/10 00h já vira o crescente | |
| É HOJE até começar, depois "TÁ ROLANDO" | Três estados: "É HOJE" até as 16h, "É AGORA / TÁ ROLANDO" durante a festa, crescente depois das 05h | ✓ |

**User's choice:** É HOJE até começar, depois "TÁ ROLANDO".
**Notes:** com a regressiva, são quatro estados no total. A copy literal "JÁ QUE VOCÊ NÃO FOI, PERDEU!" e "É HOJE" veio do dono e deve ser preservada como está.

---

## Mapa e guia de Aracaju

### Mapa

| Option | Description | Selected |
|--------|-------------|----------|
| Card + iframe sob clique | Card com endereço e "Abrir rota"; iframe do Google só ao tocar em "ver mapa" | ✓ |
| iframe direto, como no antigo | Mapa embutido e visível desde o carregamento | |
| Só card + "Abrir rota" | Sem mapa embutido; abre Maps/Waze no app do celular | |

**User's choice:** Card + iframe sob clique.

### Guia da cidade

| Option | Description | Selected |
|--------|-------------|----------|
| Manter os 3 | Museu da Gente Sergipana, Passarela do Caranguejo, Orla de Atalaia | |
| Manter os 3 e ampliar | Somar mais lugares indicados | ✓ |
| Vou revisar a lista | Layout pronto, seleção final depois | |

**User's choice:** *"Manter os 3 e usar melhores do tripadvisor"* (resposta livre).
**Notes:** ampliação fica a cargo da pesquisa da fase — levantar os mais bem avaliados de Aracaju no Tripadvisor.

### Hotéis

| Option | Description | Selected |
|--------|-------------|----------|
| Sem hotéis por enquanto | Hospedagem vira pendência dos donos na Phase 7 | |
| Incluir hotéis agora | Dono passa 2–4 hotéis com nome, link e distância | ✓ |
| Bloco pronto, conteúdo depois | Seção montada com placeholder "em breve" | |

**User's choice:** *"Escolha dos hotéis, vc pega: Arauanã, Quality, Celi"* (resposta livre).
**Notes:** o requisito INVITE-03 cita hotéis, mas o site antigo não tinha nenhum — este é conteúdo novo. Nome oficial completo, link e distância precisam ser confirmados na pesquisa; URLs não podem ser inventadas.

---

## Encerramento

| Option | Description | Selected |
|--------|-------------|----------|
| Decidir a topbar agora | Mais 2 perguntas sobre hambúrguer/âncoras e links de seções futuras | |
| Só o que existe hoje | Topbar lista apenas o que a Phase 2 entrega | |
| Pronto, escreve o contexto | Topbar a critério do planejamento/UI; gerar o CONTEXT.md | ✓ |

**User's choice:** Pronto, escreve o contexto.

## Claude's Discretion

- **Efeito da animação do mar** — dono respondeu explicitamente "você decide o efeito"
- **Topbar e navegação** — área não selecionada e encerrada sem discussão; fica a critério do planejamento/UI, dentro da regra de escopo (só links do que a Phase 2 entrega)
- **Tradução do CSS antigo para Tailwind v4** — quanto vira utilitária e quanto exige CSS custom
- **`index.html`** — meta description, favicon e tags OG, ausentes desde a Phase 1

## Deferred Ideas

- **Links de navegação para RSVP, Presentes e Memórias** — nascem nas fases 3, 4 e 5; cada fase acrescenta o próprio link
- **Hospedagem além dos 3 hotéis** (descontos/parceria) — Phase 7, junto com o checklist dos donos
- **Álbum público / telão** — já registrado como v2 no PROJECT.md
