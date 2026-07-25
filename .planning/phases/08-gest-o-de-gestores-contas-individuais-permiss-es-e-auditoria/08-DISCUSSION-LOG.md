# Phase 8: Gestão de Gestores - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-25
**Phase:** 08-Gestão de Gestores
**Areas discussed:** Criação e recuperação de contas, Papéis e permissões,
Sessões e revogação, Auditoria administrativa, Transição da senha
compartilhada, Operação de vendas da Vanessa, Experiência do painel por papel

---

## Criação e recuperação de contas

| Decisão | Alternativas consideradas | Escolha |
|---------|----------------------------|---------|
| Primeiro acesso | Link temporário; senha temporária; senha definida pelo proprietário | Link temporário de ativação ✓ |
| Identificador | E-mail; nome de usuário; ambos | E-mail ✓ |
| Validade do link | 72 horas; 24 horas; 7 dias | 72 horas ✓ |
| Senha esquecida | Link gerado pelo proprietário; envio automático; senha temporária | Link de redefinição gerado no `/admin` ✓ |
| Vanessa no sistema | Conta restrita a Presentes; marcação somente pelos donos | Conta própria de Vendedora ✓ |

**User's choice:** O proprietário cria a conta no `/admin` e compartilha um
link de uso único de 72 horas para a pessoa definir a senha. Recuperação usa
outro link de 72 horas e invalida as sessões existentes.

**Notes:** E-mails iniciais fornecidos pelo usuário:
`allanmesquitab@gmail.com`, `sorayathorsjo@outlook.com`,
`gugart@hotmail.com` e `vanessa.alonso@mistral.com.br`.

---

## Papéis e permissões

| Decisão | Alternativas consideradas | Escolha |
|---------|----------------------------|---------|
| Modelo de autorização | Papéis fixos; permissões individuais; papéis ajustáveis | Papéis fixos ✓ |
| Gestor | Quatro áreas operacionais; sem Presentes; quase proprietário | Quatro áreas operacionais ✓ |
| Vendedora | Operar Presentes; somente marcar; Presentes + Visão geral | Operar toda a área de Presentes ✓ |
| Proprietário | Único com conta individual; vários; senha-mestra como identidade | Único Proprietário com conta individual ✓ |

**User's choice:** Proprietário, Gestor e Vendedora são papéis fechados. Allan
é o único Proprietário; Soraya e Guga são Gestores; Vanessa é Vendedora.

**Notes:** Gestores operam a festa sem administrar acessos. Vanessa vê e
altera somente Presentes. A senha-mestra não representa uma pessoa no uso
cotidiano.

---

## Sessões e revogação

| Decisão | Alternativas consideradas | Escolha |
|---------|----------------------------|---------|
| Aparelhos simultâneos | Múltiplos; um; limite de três | Múltiplas sessões identificadas ✓ |
| Efeito da troca de senha | Regra contextual; encerrar tudo; manter tudo | Manter a atual na troca voluntária e encerrar todas na redefinição ✓ |
| Controle de sessões | Próprias + proprietário vê todas; só proprietário; somente próprias | Próprias + controle global do proprietário ✓ |
| Revogação de conta | Desativar; excluir; apenas desconectar | Desativar sem apagar ✓ |

**User's choice:** Cada aparelho tem sessão própria. Cada pessoa encerra as
suas e Allan pode encerrar qualquer uma. A revogação desativa a conta,
preserva autoria e permite reativação futura.

**Notes:** A expiração absoluta de sete dias definida na Phase 6 foi mantida.

---

## Auditoria administrativa

| Decisão | Alternativas consideradas | Escolha |
|---------|----------------------------|---------|
| Cobertura | Alterações + segurança; só ações críticas; incluir leituras | Alterações e eventos de segurança ✓ |
| Detalhe | Campos antes/depois; resumo; cópia completa | Campos alterados antes/depois ✓ |
| Retenção | 12 meses; sem prazo; 90 dias; prazo livre | 120 dias ✓ |
| Consulta | Página filtrável; feed na Visão; lista simples | Página Auditoria no `/admin` ✓ |

**User's choice:** Registrar segurança e todas as mudanças administrativas,
sem registrar navegação ou buscas. Manter por 120 dias e permitir investigação
numa página exclusiva do Proprietário.

**Notes:** Senhas, tokens e links secretos nunca entram no histórico.

---

## Transição da senha compartilhada

| Decisão | Alternativas consideradas | Escolha |
|---------|----------------------------|---------|
| Primeiro Proprietário | Setup único no `/admin`; seed técnico; manter login compartilhado | Setup único no `/admin` ✓ |
| Sessões legadas | Revogar na ativação; no deploy; deixar expirar | Revogar na ativação de Allan ✓ |
| Poder da senha-mestra | Só recuperação do Proprietário; gerir contas; dashboard completo | Só recuperação do Proprietário ✓ |
| Proteção do único dono | Conta protegida; permitir mudanças críticas; conta totalmente imutável | Conta protegida com e-mail alterável pelo próprio ✓ |

**User's choice:** Allan usa a senha-mestra uma última vez para criar e ativar
sua conta. Só depois da ativação as sessões compartilhadas são revogadas. A
senha-mestra passa a recuperar apenas Allan.

**Notes:** A conta proprietária não pode ser desativada, apagada ou rebaixada.
O próprio Allan pode alterar o e-mail após confirmar a senha.

---

## Operação de vendas da Vanessa

| Decisão | Alternativas consideradas | Escolha |
|---------|----------------------------|---------|
| Momento de indisponibilidade | Pagamento; pedido no WhatsApp; entrega | Após confirmar pagamento ✓ |
| Dados da compra | Nome + observação; só nome; nome + telefone + valor | Nome + observação opcional ✓ |
| Copy pública | “Já escolhido com carinho”; “Já foi comprado”; “Indisponível” | Preservar “Já escolhido com carinho” ✓ |
| Correção | Editar sem reabrir; desfazer e remarcar; somente proprietário | Editar sem reabrir ✓ |

**User's choice:** Vanessa confirma a compra apenas após o pagamento, informa
o presenteador e pode incluir observação. Pode corrigir os dados mantendo o
vinho indisponível.

**Notes:** O usuário pediu para procurar a copy anterior. A busca confirmou
**“Já escolhido com carinho”** como texto canônico em
`.planning/phases/04-carta-de-vinhos/04-CONTEXT.md` e `src/content/gifts.ts`.
Telefone e dados de pagamento não serão armazenados.

---

## Experiência do painel por papel

| Decisão | Alternativas consideradas | Escolha |
|---------|----------------------------|---------|
| Destino inicial | Por papel; última seção; Visão geral para todos | Destino por papel ✓ |
| Áreas proibidas | Ocultar; mostrar desabilitadas; explicar após abrir | Mostrar somente áreas permitidas ✓ |
| Perfil e sessões | Minha conta; item fixo; controles espalhados | Minha conta no menu ✓ |
| Identidade no shell | Nome + papel; só nome; apenas no menu | Nome + papel ✓ |

**User's choice:** Allan, Soraya e Guga usam as entradas operacionais
compatíveis com seus papéis; Vanessa entra diretamente em Presentes. O shell
mostra nome e papel e o menu contém Minha conta.

**Notes:** Proprietário vê também Gestores e Auditoria. URLs sem permissão
devem ser negadas no backend, não apenas escondidas.

---

## Claude's Discretion

- Implementação de hash e política técnica de senha.
- Formato seguro de tokens e identificação não invasiva dos aparelhos.
- Layout e microcopy finais de Gestores, Minha conta, recuperação e Auditoria.
- Schema, índices, paginação e expiração física do histórico.

## Deferred Ideas

None — discussion stayed within phase scope.
