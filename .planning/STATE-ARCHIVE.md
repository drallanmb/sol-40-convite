# STATE Archive

Pruned entries from STATE.md. Recoverable but no longer loaded into agent context.

## Pruned 2026-07-25 (phases 1-4, kept recent 3)

### Decisions

- [Phase 03]: convex-test 0.0.54 exige apenas Convex como peer; @edge-runtime/vm não foi adicionado sem necessidade.
- [Phase 03]: Telefone móvel legado expõe candidatos exato/atual; normalizedKey usa a forma atual e inserts verificam também a inversa legada.
- [Phase 03]: Fixtures RSVP são internalMutation dev-only, derivadas por HMAC de seed server-only e idempotentes em quatro formatos.
- [Phase 03]: Harness Convex recebe dependências de teste por injeção de *.test.ts para não levar import.meta ao deploy.
- [Phase 03]: Telefone libera apenas uma capability RSVP de 8 horas; não cria conta, login persistente ou acesso ao admin. — Separar a chave leve de busca da autorização pós-desbloqueio limita enumeração e mantém o escopo em uma família.
- [Phase 03]: Save verifica o limite global primeiro; sessões inválidas consomem só global e sessões válidas consomem global mais sessão de forma coerente. — O circuito global não pode ser contornado por rotação de tokens e nenhum bucket aplicável deve ser consumido parcialmente.
- [Phase 03]: 30 de setembro permanece informativo e não participa da autorização backend de RSVP. — A edição continua disponível antes, no dia e depois do prazo conforme a decisão de produto D-11.
- [Phase 03]: RSVP route copy, entry labels, absolute navigation, and the explicit -03:00 boundary share one source in event.ts. — Keeps Hero, Shell, and the future /confirmar route aligned to the approved UI contract.
- [Phase 03]: Latest server snapshot, local draft, and dirty guest/contact intent remain distinct. — Reconciliation can preserve local edits while sparse commands never overwrite omitted people.
- [Phase 03]: Client capabilities must be canonical 32-byte unpadded base64url, live under one session key, and retry token_conflict once with a distinct token. — Matches the backend validator and keeps phone/contact data outside browser persistence.
- [Phase 03]: Deadline state is presentation-only and the browser override is gated directly by import.meta.env.DEV. — Production never reads debug time and post-deadline editing remains available.
- [Phase 03]: RSVP focus longhands are important because the unlayered global shorthand wins over Tailwind utilities; placeholders use solid wine. — This preserves the ordinary coral focus rule while delivering the contracted 3px sea ring and AA placeholder contrast.
- [Phase 03]: A restauração de /confirmar usa consulta Convex capturável e nunca exibe dados familiares obsoletos. — Distingue falha de rede de sessão expirada e mantém dados escopados fora do DOM até uma leitura válida.
- [Phase 03]: Troca de telefone com rascunho sujo falha fechada até o diálogo final de 03-05. — Evita perda silenciosa de respostas; troca limpa já remove capability e DOM escopado.
- [Phase 03]: Troca de telefone suja usa dialog nativo com foco inicial seguro; descarte só ocorre por ação destrutiva explícita. — Evita perda silenciosa, preserva Escape/retorno de foco e mantém a troca limpa imediata.
- [Phase 04]: Presentes usam 37 registros canônicos em três faixas, com o WhatsApp da Vanessa como handoff externo e sem reserva/checkout.
- [Phase 04]: Uma silhueta vetorial neutra compartilhada e duas cores auditáveis por vinho substituem fotos licenciadas; proveniência permanece privada.
- [Phase 04]: Gift state é reativo e separado da reconciliação comercial; `gifted` mantém o card e remove a ação.

### Performance Metrics

| 1 | 3 | - | - |
| 02 | 8 | - | - |
| 3 | 5 | - | - |
| 4 | 5 | - | - |

## Pruned 2026-07-25 (phases 1-6, kept recent 1)

### Decisions

- [Phase 06]: Sessões administrativas usam uma capability opaca por navegador, armazenada apenas por hash no servidor. — Mantém a senha compartilhada como credencial única sem criar identidades, papéis ou credenciais reutilizáveis.
- [Phase 06]: A sessão administrativa expira absolutamente após sete dias e nunca renova por leitura. — Evita acesso indefinido e mantém o limite simples, revogável e verificável no servidor.
- [Phase 06]: O cliente preserva somente o destino na URL e limpa dados protegidos em expiração, revogação, logout e remoção cross-tab. — Impede remontagem por respostas assíncronas antigas e vazamento de rascunhos ou DTOs no armazenamento.
- [Phase 06]: Consultas protegidas do admin só montam abaixo do gate de sessão; adminOverview retorna unauthorized sem DTO. — Mantém o invariante de nenhuma consulta de domínio pré-auth e desmonta dados no mesmo render da perda de autorização.
- [Phase 06]: familyCount vem diretamente de rsvps e permanece independente da soma de presenças. — Distingue zero famílias de uma família válida com zero pessoas e impede copy operacional falsa.
- [Phase 06]: O foco admin mantém coral e usa anel externo plum nas superfícies claras. — Preserva a identidade existente e garante uma borda perceptível acima de 3:1.
- [Phase 06]: Revogação RSVP é lógica e imediata por geração; limpeza física usa comandos internos tipados e páginas limitadas.
- [Phase 06]: Operações de convidados, moderação e presentes possuem ownership por registro para impedir duplicação e conclusões stale.

### Performance Metrics

| 5 | 5 | - | - |
| 6 | 7 | - | - |
