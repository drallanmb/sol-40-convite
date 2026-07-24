# Phase 3: RSVP - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-24
**Phase:** 03-RSVP
**Areas discussed:** Destino e entrada do RSVP, Resposta da família, Busca e edição por telefone, Mensagens e prazo

---

## Destino e entrada do RSVP

| Option | Description | Selected |
|--------|-------------|----------|
| Seção dentro de `/` | Formulário aberto como mais uma seção da home | |
| Rota própria `/confirmar` | Fluxo dedicado, acessado a partir da home | ✓ |
| Fluxo híbrido | Entrada curta na home e formulário completo separado | |

**User's choice:** `/confirmar`.
**Notes:** Para os pontos de entrada, o usuário autorizou seguir a recomendação do projeto; ficou definido botão no hero e link “Confirmar presença” no menu.

---

## Resposta da família

| Option | Description | Selected |
|--------|-------------|----------|
| Exigir todas as respostas | Bloquear salvamento enquanto alguém estiver pendente | |
| Permitir salvar parcialmente | Persistir escolhas feitas e manter as demais pendentes | ✓ |

**User's choice:** “permitir salvar parcialmente, incluir contato opcional”.
**Notes:** O contato é único e opcional para o convite; não haverá um contato por pessoa.

---

## Busca e edição por telefone

| Option | Description | Selected |
|--------|-------------|----------|
| Telefone libera a família em `/confirmar` | Chave de acesso leve para consultar e editar o próprio convite | ✓ |
| Edição exclusiva dos donos em `/admin` | Convidado não conseguiria cumprir RSVP-04 diretamente | |

**User's choice:** Telefone em um formulário identifica e libera o convite “como login”.
**Notes:** Foi esclarecido que não é uma conta nem acesso administrativo. O convite permanece liberado somente durante a sessão do navegador. A edição global no `/admin` fica na Phase 6.

---

## Mensagens e prazo

| Option | Description | Selected |
|--------|-------------|----------|
| Prazo bloqueante | Impedir novas respostas e edições após 30 de setembro | |
| Prazo informativo | Mostrar 30 de setembro, mas continuar aceitando alterações | ✓ |
| Sem data | Adiar a copy até definição operacional posterior | |

**User's choice:** Manter “30 de setembro” como prazo informativo.
**Notes:** O sistema não bloqueia confirmações tardias.

---

## Claude's Discretion

- Botão no hero e link no menu como entradas para `/confirmar`.
- Layout detalhado da rota, copy de feedback e número não encontrado.
- Implementação técnica da sessão do navegador e parâmetros exatos do rate-limit.
- Fixtures de desenvolvimento e estratégia de testes.

## Deferred Ideas

- Busca e edição administrativa de qualquer RSVP no `/admin` — Phase 6.
- Importação da lista real — Phase 6/7.
