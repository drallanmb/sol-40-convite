# Phase 6: Dashboard Interno (/admin) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-25
**Phase:** 6-Dashboard Interno (/admin)
**Areas discussed:** Acesso e sessão

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

## Claude's Discretion

- Fixar a validade da sessão em sete dias absolutos, sem renovação deslizante.
- Definir composição, microcopy e estados auxiliares da tela de login,
  respeitando as decisões acima e as invariantes de segurança.
- Definir os detalhes não discutidos das outras três áreas do dashboard a
  partir dos requisitos, contexto herdado e referência visual anterior.

## Deferred Ideas

- Contas individuais, moderadora e códigos de equipe.
- Instagram, telão e QR das mesas.
