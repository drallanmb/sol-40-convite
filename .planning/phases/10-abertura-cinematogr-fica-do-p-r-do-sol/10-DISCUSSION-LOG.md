# Phase 10: Abertura cinematográfica do pôr do sol - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-26
**Phase:** 10-Abertura cinematográfica do pôr do sol
**Areas discussed:** Trajetória e ritmo, Primeira visita e repetição, Pular e
interagir, Revelação do convite

---

## Trajetória e ritmo

| Pergunta | Opções consideradas | Escolha |
|----------|---------------------|---------|
| Composição inicial | Céu sem conteúdo / céu e mar / fundo neutro | Céu do hero em tela cheia, sem mar ou conteúdo |
| Origem do sol | Fora da tela / visível no topo / brilho pequeno | Totalmente fora da tela, entrando pela borda superior |
| Reveal final | Fade conjunto / imediato / sequência | Fade conjunto de 250–300 ms |
| Ritmo | Cinematográfico suave / constante / queda dramática | Cinematográfico suave |
| Tamanho | Tamanho final / cresce / diminui | Mesmo tamanho final durante todo o percurso |
| Céu | Gradiente estável / aquece / escurece | Gradiente final estável |
| Halo | Constante / surge no fim / pulsa | Constante e igual ao hero |
| Motion atual | Substituir / combinar / rodar depois | Substituir pelo novo reveal |

**User's choice:** Sol vindo de cima até a posição real do hero, em cerca de
2 segundos, seguido por revelação curta e conjunta.

**Notes:** O usuário pediu uma sequência simples, sem complexidade que pareça
loading. Depois de quatro perguntas iniciais, escolheu aprofundar a área e
removeu variações de tamanho, cor, halo e uma segunda coreografia.

---

## Primeira visita e repetição

| Pergunta | Opções consideradas | Escolha |
|----------|---------------------|---------|
| Frequência | Nova entrada na rota / reentrada no viewport / só reload | Toda nova entrada elegível na rota `/` |
| Símbolo da topbar | Só rolar / repetir / não agir | Só rolar para o hero |
| Retorno após interrupção | Recomeçar / retomar / revelar direto | Recomeçar |
| Fragmento direto | Ir direto / animar e depois rolar / ignorar fragmento | Ir direto sem abertura |

**User's choice:** “Aparece sempre ao entrar na hero.”

**Notes:** “Entrar” foi concretizado como uma nova montagem/acesso da rota
pelo início. A mesma montagem não repete por rolagem ou pelo link `#inicio`.

---

## Pular e interagir

| Pergunta | Opções consideradas | Escolha |
|----------|---------------------|---------|
| Captura de entrada | Não capturar / travar scroll / interação encerra | Não capturar clique, toque ou teclado |
| Skip link | Acima da cena / só depois / atrás da cena | Disponível e visível ao foco |
| Scroll durante a cena | Encerrar / continuar fixa / acompanhar hero | Encerrar imediatamente |
| Reduced motion | Hero imediato / só fade / movimento mínimo | Hero final imediato |

**User's choice:** Sem botão “Pular” e sem interação própria porque a cena é
curta.

**Notes:** A ausência de controle não bloqueia os mecanismos normais da
página. Scroll conclui a cena; foco e skip link permanecem operáveis.

---

## Revelação do convite

| Pergunta | Opções consideradas | Escolha |
|----------|---------------------|---------|
| Ativação dos links | Início do fade / fim / após pausa | Início do fade |
| Primeiro frame | Só céu / cream / flash do hero | Só céu |
| Handoff do sol | Contínuo / participa do fade / some e volta | Contínuo, sem piscar |
| Entrada do mar | Já em movimento / move após fade / pausa estática | Já em movimento |

**User's choice:** O hero aparece depois da animação, com reveal suave e
rápido.

**Notes:** O sol fica fora do fade; os demais elementos aparecem ao redor
dele em 250–300 ms.

---

## Claude's Discretion

- Técnica de medição/shared-element e organização interna dos estados.
- Curva exata de easing dentro do ritmo aprovado.
- Valor exato do reveal entre 250 e 300 ms.
- Limiar técnico que diferencia ruído de uma intenção real de scroll.
- Estratégia de testes e necessidade de dependência de animação, com
  preferência por manter a solução leve.

## Deferred Ideas

None.
