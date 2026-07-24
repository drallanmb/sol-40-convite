# Phase 4: Carta de Vinhos - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-24
**Phase:** 4-Carta de Vinhos
**Areas discussed:** Onde vive a Carta, Organização dos 37 vinhos, Experiência visual, WhatsApp e estado já escolhido

---

## Onde vive a Carta

| Decision | Options considered | Selected |
|----------|--------------------|----------|
| Destino principal | Seção completa na home; página dedicada; amostra na home + página completa | `/presentes`, com amostra na home ✓ |
| CTA após RSVP | Após qualquer save; só quando alguém vai; sempre na tela | Após qualquer save ✓ |
| Amostra da home | Fixa/curada; disponíveis automáticos; um por faixa | Três intermediários fixos/curados ✓ |
| Clique no card da home | Deep link para o vinho; topo do catálogo; WhatsApp direto | Deep link para o vinho ✓ |

**User's choice:** Página dedicada `/presentes`, link no header, três opções intermediárias fixas na home e CTA após qualquer salvamento do RSVP.
**Notes:** A amostra mantém o card presenteado em vez de trocá-lo e inclui o CTA “Ver a carta completa”.

---

## Organização dos 37 vinhos

| Decision | Options considered | Selected |
|----------|--------------------|----------|
| Conteúdo do card | Sem código; com código visível; versão mínima | Foto, nome, produtor, preço, descrição e código ✓ |
| Ordenação | Preço crescente; curadoria; disponíveis primeiro | Preço crescente e posição estável ✓ |
| Navegação por faixas | Todas abertas com atalhos; accordion; abertas sem atalhos | Todas abertas com atalhos ✓ |
| Fonte do conteúdo | Reaproveitar integralmente; revisar descrições; só dados comerciais | Reaproveitar integralmente ✓ |

**User's choice:** Manter as três faixas, mostrar informações básicas com código Mistral e reaproveitar integralmente o catálogo anterior.
**Notes:** Os vinhos não mudam de posição quando se tornam presenteados.

---

## Experiência visual

| Decision | Options considered | Selected |
|----------|--------------------|----------|
| Abertura de `/presentes` | Hero completo; abertura compacta; catálogo imediato | Abertura compacta ✓ |
| Tratamento das garrafas | Halos coloridos; fundo verde puro; base clara | Fotos reais transparentes sobre halos ✓ |
| Grade | 3/2/1; 4/2/1; 2/1 | 3/2/1 ✓ |
| Prévia da home | Bloco verde; fundo claro; transição gradual | Bloco verde-escuro ✓ |

**User's choice:** Preservar a adega verde-escura anterior, com abertura compacta, fotos reais transparentes, halos por tonalidade e grade 3/2/1.
**Notes:** A prévia da home funciona como porta visual para `/presentes`.

---

## WhatsApp e estado já escolhido

| Decision | Options considered | Selected |
|----------|--------------------|----------|
| Mensagem | Completa; sem preço; curta | Evento + vinho + código + preço ✓ |
| Vinho presenteado | Visível e suavizado; normal com selo; removido | Visível, suavizado e sem botão ✓ |
| Clique no CTA | WhatsApp imediato; confirmação; copiar mensagem | WhatsApp imediato ✓ |
| Explicação da ausência de reserva | Nota na introdução; aviso por card; sem aviso | Nota na introdução ✓ |

**User's choice:** Abrir diretamente o WhatsApp de Vanessa Alonso com mensagem completa; manter presenteados visíveis com o selo “Já escolhido com carinho”.
**Notes:** Destino normalizado: `wa.me/5511993709046`. O clique não cria reserva nem altera o banco.

---

## Claude's Discretion

- Seleção exata dos três vinhos intermediários fixos.
- Copy complementar e detalhes de layout/movimento.
- Estratégia técnica do deep link e do seed idempotente.
- Estados de loading/erro e fallback temporário para imagem ausente.

## Deferred Ideas

- Administração do status e autoria do presente → Phase 6.
- Testes reais de WebView/WhatsApp → Phase 7.
- Reserva, checkout ou automação com a Mistral → fora do v1.
