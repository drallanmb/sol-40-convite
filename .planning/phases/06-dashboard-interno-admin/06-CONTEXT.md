# Phase 6: Dashboard Interno (/admin) - Context

**Gathered:** 2026-07-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Entrega um painel `/admin` protegido por senha compartilhada para Allan e
Soraya operarem o evento. O painel possui Visão geral com contagens reativas,
Convidados com busca/edição/remoção de RSVPs, fila de Moderação para
aprovar/ocultar memórias e Presentes para marcar ou desfazer vinhos
presenteados.

A autenticação deve ser verificada no servidor e nenhuma consulta ou dado
administrativo pode ser exposto antes de uma sessão válida. O shell mantém a
estrutura já decidida de sidebar no desktop e barra inferior no celular.

**Fora do escopo desta fase:**
- Contas individuais, papéis de moderadora ou código compartilhável de equipe.
- Instagram, telão, QR das mesas e ajustes operacionais dessas funções.
- Checkout, reserva temporária ou confirmação automática de presentes.
- Novas capacidades públicas de RSVP, mural ou catálogo.

</domain>

<decisions>
## Implementation Decisions

### Acesso e sessão

- **D-01:** Uma autenticação bem-sucedida mantém o painel conectado por até
  **sete dias**, inclusive depois de fechar e reabrir o navegador.
- **D-02:** A sessão administrativa deve ter **prazo absoluto de sete dias a
  partir do login**, sem renovação deslizante. Essa escolha concretiza a
  discricionariedade delegada pelo usuário com a opção mais simples e segura:
  uso diário não transforma uma sessão em acesso indefinido.
- **D-03:** Ao expirar ou se tornar inválida durante o uso, a interface remove
  imediatamente os dados protegidos, apresenta o login e preserva somente o
  destino administrativo pretendido. Depois de autenticar novamente, retorna
  à mesma seção; rascunhos ou dados sensíveis não devem sobreviver ao gate.
- **D-04:** A ação explícita **“Sair”** fica no rodapé da sidebar no desktop e
  no menu do cabeçalho no celular. Ela encerra a sessão no servidor antes de
  voltar ao login.

### Decisões herdadas

- **D-05:** O v1 usa uma única senha compartilhada dos donos, verificada no
  servidor; telefone de convidado e capability de RSVP nunca autenticam o
  painel.
- **D-06:** O shell possui quatro áreas de produto: **Visão geral,
  Convidados, Moderação e Presentes**, com sidebar no desktop e barra inferior
  no celular.
- **D-07:** A Visão geral precisa mostrar a contagem de confirmações por query
  reativa; alterações administrativas que afetam o site público também devem
  refletir via dados reativos do Convex.
- **D-08:** A operação de convidados respeita o modelo existente de convite/
  família com respostas individuais; a moderação usa os estados `pendente`,
  `aprovado` e `oculto`; presentes usam `available` e `gifted`.

### Claude's Discretion

- Detalhes visuais e operacionais não discutidos — composição da tela de
  login, métricas complementares da Visão geral, apresentação da busca e das
  filas, confirmações destrutivas, estados vazios/loading/erro e microcopy —
  ficam a critério do planejamento, respeitando os requisitos ADMIN-01 a
  ADMIN-06, o layout sobrevivente do dashboard anterior e as invariantes já
  existentes no código.
- A duração da sessão foi delegada parcialmente: o prazo de sete dias é fixo
  por D-01, e o planejamento deve usar expiração absoluta conforme D-02.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Escopo e decisões do projeto

- `.planning/ROADMAP.md` § “Phase 6: Dashboard Interno (/admin)” — objetivo,
  dependências, critérios de sucesso e decomposição inicial.
- `.planning/REQUIREMENTS.md` § “Dashboard Interno (/admin)” — ADMIN-01 a
  ADMIN-06.
- `.planning/PROJECT.md` — core value, senha compartilhada, stack e
  capacidades explicitamente removidas do v1.
- `.planning/STATE.md` — decisões acumuladas e preocupações de autenticação.
- `.planning/phases/03-rsvp/03-CONTEXT.md` — modelo de convite/família,
  respostas individuais e separação entre capability pública e admin.
- `.planning/phases/04-carta-de-vinhos/04-CONTEXT.md` — marcação manual,
  desfazer presente e registro de quem presenteou.
- `.planning/phases/05-mural-de-mem-rias-modera-o/05-CONTEXT.md` — estados e
  invariantes da fila de moderação.

### Referência do dashboard anterior

- `/Users/allanmesquitabrito/Documents/Site Sol 40 anos/sol-40-integrado/design.md`
  §§ 3, 6, 7 e 8 — layout sobrevivente do dashboard, fronteiras de acesso e
  funcionalidades antigas que não devem ser ressuscitadas.
- `/Users/allanmesquitabrito/Documents/Site Sol 40 anos/sol-40-integrado/app/admin/AdminShell.tsx`
  — referência de sidebar desktop e navegação móvel.
- `/Users/allanmesquitabrito/Documents/Site Sol 40 anos/sol-40-integrado/app/admin/AdminLogin.tsx`
  — referência visual/conceitual do gate anterior, sem portar a infraestrutura
  Cloudflare.
- `/Users/allanmesquitabrito/Documents/Site Sol 40 anos/sol-40-integrado/app/admin/OverviewTab.tsx`
  — referência da composição de visão geral.
- `/Users/allanmesquitabrito/Documents/Site Sol 40 anos/sol-40-integrado/app/admin/GuestsTab.tsx`
  — referência da operação de convidados.
- `/Users/allanmesquitabrito/Documents/Site Sol 40 anos/sol-40-integrado/app/admin/ModerationTab.tsx`
  — referência da fila de moderação.
- `/Users/allanmesquitabrito/Documents/Site Sol 40 anos/sol-40-integrado/app/admin/GiftsTab.tsx`
  — referência do controle de presentes.

### Projeto atual

- `src/routes/Admin.tsx` — placeholder deliberadamente sem auth nem dados;
  ponto de substituição da fase.
- `src/App.tsx` — roteamento atual de `/admin`.
- `src/main.tsx` — `ConvexProvider` atual e fronteira documentada para a auth
  dos donos.
- `src/components/ui/Button.tsx` — ações e estados de foco reutilizáveis.
- `src/components/ui/Card.tsx` — superfície base do design system.
- `src/components/ui/Field.tsx` — campo base da senha e edições.
- `src/components/ui/Toast.tsx` — feedback acessível compartilhado.
- `src/index.css` — tokens pôr do sol, contraste AA, foco e linguagem visual.
- `convex/schema.ts` — tabelas e índices atuais de RSVP, posts e vinhos; ponto
  de integração da sessão administrativa.
- `convex/rsvps.ts` e `convex/rsvpModel.ts` — projeção atual por família e
  estados de presença.
- `convex/posts.ts` e `convex/postModel.ts` — API pública atual e estados
  `pendente`/`aprovado`/`oculto`; funções administrativas ainda não existem.
- `convex/wines.ts`, `convex/wineModel.ts` e `convex/wineInternal.ts` — catálogo
  público, estado operacional completo e invariantes de presente.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `Button`, `Card`, `Field` e `Toast`: cobrem ações, superfícies, senha,
  edições e feedback sem introduzir um segundo kit de UI.
- `ConvexProvider`: já envolve toda a aplicação e permite queries reativas no
  painel.
- `buildFamilyView` e os modelos RSVP: fornecem a base de família/pessoas,
  embora o admin precise de projeções próprias protegidas.
- Modelos `postStatusValidator` e `wineGiftStateValidator`: já definem os
  estados que as mutations administrativas precisam preservar.

### Established Patterns

- Toda autorização sensível é validada no backend; esconder UI no React nunca
  é considerado proteção.
- Capabilities são opacas, armazenadas no servidor por hash e removidas do
  cliente quando inválidas.
- Queries públicas retornam projeções mínimas. Dados administrativos exigem
  funções separadas protegidas e não devem ampliar payloads públicos.
- Tailwind v4 mobile-first, foco visível, alvos mínimos de 44px, contraste AA e
  `prefers-reduced-motion` são invariantes.
- Testes Convex usam `convex-test` e helpers injetados; a fase deve cobrir
  autorização e isolamento de todas as portas administrativas.

### Integration Points

- Substituir o placeholder em `src/routes/Admin.tsx` por gate e shell, sem
  consultar dados enquanto a sessão não estiver validada.
- Expandir `convex/schema.ts` com sessões administrativas e índices apenas
  quando exigidos pelas consultas protegidas.
- Criar uma guarda de servidor compartilhada por todas as queries e mutations
  administrativas.
- Adicionar projeções/mutations administrativas próprias para RSVPs, posts e
  vinhos, preservando as APIs públicas existentes.
- Usar rotas ou estado de navegação estável para restaurar a seção pretendida
  após reautenticação.

</code_context>

<specifics>
## Specific Ideas

- O painel deve continuar confortável para uso recorrente nos dias anteriores
  à festa: uma autenticação vale sete dias no mesmo navegador.
- Expiração não deve “jogar” o dono de volta à Visão geral; reautenticar
  continua a tarefa no ponto em que estava.
- No celular, logout não ocupa um dos quatro destinos da barra inferior.

</specifics>

<deferred>
## Deferred Ideas

- Contas nomeadas, moderadora e códigos de equipe continuam fora do v1.
- Instagram, telão e QR das mesas continuam no backlog de v2.
- Importação em massa da lista real e ajustes de lançamento permanecem para
  decisão específica da Phase 7 caso não sejam necessários ao CRUD já
  contratado.

</deferred>

---

*Phase: 6-Dashboard Interno (/admin)*
*Context gathered: 2026-07-25*
