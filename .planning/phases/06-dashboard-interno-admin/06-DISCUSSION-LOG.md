# Phase 6: Dashboard Interno (/admin) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-25
**Phase:** 6-Dashboard Interno (/admin)
**Areas discussed:** Acesso e sessão, Visão geral e navegação, Operação de convidados, Moderação e presentes

---

## Acesso e sessão

### Persistência após o login

| Option | Description | Selected |
|--------|-------------|----------|
| 24 horas, mesmo fechando o navegador | Evita login repetido no mesmo dia, mas limita uma sessão esquecida. | |
| Até fechar o navegador | Mais restritivo; exige novo login depois de encerrar a sessão do navegador. | |
| 7 dias | Mais cômodo para uso recorrente nos aparelhos dos donos. | ✓ |
| Você decide | Delegar a duração ao planejamento. | |

**User's choice:** 7 dias.
**Notes:** A sessão deve sobreviver ao fechamento e reabertura do navegador.

### Regra de renovação

| Option | Description | Selected |
|--------|-------------|----------|
| Sete dias fixos desde o login | A senha volta a ser solicitada após um prazo absoluto. | |
| Renovar por sete dias a cada uso | Mantém o aparelho conectado enquanto houver uso recorrente. | |
| Renovar somente após nova confirmação | Exige senha perto do vencimento para estender o acesso. | |
| Você decide | Priorizar segurança e simplicidade no planejamento. | ✓ |

**User's choice:** Você decide.
**Notes:** O contexto resolve a discricionariedade como sete dias absolutos,
sem renovação deslizante.

### Sessão expirada durante o uso

| Option | Description | Selected |
|--------|-------------|----------|
| Tela de login e retorno ao mesmo lugar | Remove dados protegidos, pede a senha e restaura a seção pretendida. | ✓ |
| Voltar sempre à Visão geral | Simplifica o fluxo, mas perde o contexto da tarefa. | |
| Avisar antes de expirar | Mostra alerta prévio e reautentica antes de continuar. | |
| Você decide | Delegar o comportamento ao planejamento. | |

**User's choice:** Tela de login e retorno ao mesmo lugar.
**Notes:** Dados administrativos não permanecem visíveis durante o gate.

### Local da ação Sair

| Option | Description | Selected |
|--------|-------------|----------|
| Rodapé da sidebar e menu do cabeçalho móvel | Acessível sem consumir um destino da barra inferior. | ✓ |
| Cabeçalho em todas as telas | Mais visível, mas compete com títulos e ações operacionais. | |
| Dentro da Visão geral | Interface mais limpa, porém menos fácil de encontrar. | |
| Você decide | Delegar a posição ao planejamento. | |

**User's choice:** Rodapé da sidebar no desktop e menu do cabeçalho no celular.
**Notes:** Logout deve encerrar a sessão no servidor.

---

## Visão geral e navegação

| Decision | Options considered | Selected |
|----------|--------------------|----------|
| Conteúdo inicial | Resumo completo; RSVP protagonista; somente pendências; Claude decide | Resumo completo com pendências priorizadas |
| Indicadores | Badges na navegação e cards; só cards; só Moderação; Claude decide | Badges em Convidados e Moderação |
| Barra móvel | Quatro destinos; três + Mais; barra rolável; Claude decide | Quatro destinos fixos |
| Destino dos cards | Card inteiro; botão interno; apenas informativo; Claude decide | Card inteiro clicável com filtro |

**User's choice:** Delegou as três primeiras decisões e escolheu card inteiro
clicável para a quarta.
**Notes:** Claude resolveu as delegações pelo resumo operacional completo,
badges somente para trabalho pendente e quatro destinos móveis fixos.

---

## Operação de convidados

| Decision | Options considered | Selected |
|----------|--------------------|----------|
| Organização | Família expansível; pessoa; cards sempre abertos; Claude decide | Família expansível |
| Busca | Família+pessoa+telefone; família+telefone; somente nomes; Claude decide | Família, pessoa e telefone |
| Filtros mistos | Família completa; só pessoas correspondentes; sem filtros; Claude decide | Família completa |
| Edição e remoção | Painel+confirmações graduais; modais; remoção com Desfazer; Claude decide | Painel expandido e confirmações graduais |

**User's choice:** Selecionou a primeira opção nas quatro decisões.
**Notes:** A revisão de coerência acrescentou contagem por pessoa, revogação de
sessões em mudança de telefone/remoção e criação manual; importação em massa
permanece em LAUNCH-03.

---

## Moderação e presentes

| Decision | Options considered | Selected |
|----------|--------------------|----------|
| Fila pendente | Cronológica antiga primeiro; grade recente; uma por vez; Claude decide | Cronológica, antiga primeiro |
| Pós-moderação | Abas + Desfazer; remover sem Desfazer; manter no lugar; Claude decide | Abas + Desfazer |
| Dados do presente | Nome obrigatório; nome opcional; só status; Claude decide | Nome obrigatório + timestamp |
| Organização dos vinhos | Duas abas + busca; catálogo com toggles; tabela sem faixas; Claude decide | Duas abas + busca |

**User's choice:** Selecionou a primeira opção nas quatro decisões.
**Notes:** A revisão de coerência explicitou a matriz de estados, proteção
contra Desfazer concorrente e limpeza conjunta da autoria ao desmarcar.

---

## Claude's Discretion

- Fixar a validade da sessão em sete dias absolutos, sem renovação deslizante.
- Definir composição, microcopy e estados auxiliares da tela de login,
  respeitando as decisões acima e as invariantes de segurança.
- Escolher o resumo operacional completo, os badges de pendência e a barra
  móvel com quatro destinos.
- Adotar criação manual de convidados na Phase 6 e manter importação em massa
  na Phase 7, conforme a recomendação apresentada antes do comando de
  planejamento automático.

## Deferred Ideas

- Contas individuais, moderadora e códigos de equipe.
- Instagram, telão e QR das mesas.
