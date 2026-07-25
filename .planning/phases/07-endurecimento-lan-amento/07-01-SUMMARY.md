---
phase: 07-endurecimento-lan-amento
plan: 01
subsystem: admin-rsvp-import
tags: [csv, papaparse, convex, react, accessibility, partial-success]

requires:
  - phase: 06-dashboard-interno-admin
    provides: Sessão administrativa protegida, CRUD manual de famílias, lista reativa e operações concorrentes por registro
  - phase: 03-rsvp
    provides: Normalização brasileira de telefone, unicidade lógica e criação canônica de convites
provides:
  - Parser CSV local limitado com modelo BOM e prévia por família/linha
  - Mutation administrativa protegida, pending-only e sem overwrite
  - Lotes sequenciais com sucesso parcial e relatório reconciliável
  - Fluxo acessível de seleção, prévia, confirmação, progresso e resultado
affects: [07-02, 07-03, 07-05, launch-gate, admin-guests]

tech-stack:
  added: [papaparse 5.5.4, "@types/papaparse 5.5.2"]
  patterns:
    - Arquivo bruto permanece no navegador; somente grupos normalizados chegam ao Convex
    - Prévia cliente e writer servidor repetem limites, nomes, telefone e atribuição de linhas
    - Lotes de até 25 famílias e 100 pessoas são enviados estritamente em sequência
    - Geração de estado invalida respostas tardias depois de logout ou limpeza sensível

key-files:
  created:
    - src/lib/guestCsv.ts
    - src/lib/guestCsv.test.ts
    - src/components/admin/AdminGuestImport.tsx
    - src/components/admin/AdminGuestImport.test.tsx
  modified:
    - package.json
    - package-lock.json
    - convex/adminRsvps.ts
    - convex/admin.test.ts
    - src/components/admin/AdminGuests.tsx
    - vite.config.ts

key-decisions:
  - "O CSV aceita UTF-8/BOM, vírgula ou ponto e vírgula, mas exige exatamente familia, telefone e convidado."
  - "Conflitos de telefone, dados inválidos e replays são ignorados com linhas-fonte; nenhuma família existente é alterada."
  - "Falha de transporte encerra a fila, mantém resultados confirmados e exige reconciliação explícita antes de uma nova seleção."
  - "Atribuição de linhas no servidor é bijetiva por grupo: cada pessoa corresponde a uma linha-fonte positiva e única."

patterns-established:
  - "Importação protegida: autorizar → limitar/revalidar → classificar conflitos → findLogicalInvitation → insertInvitation pending-only."
  - "Importador sensível: estado discriminado + trava síncrona + geração de comando + limpeza em admin-sensitive-state-clear."

requirements-completed: []

coverage:
  - id: D1
    description: "Parser local aceita os formatos contratados, limita arquivo/linhas, agrupa por família/telefone e gera modelo BOM sem registros."
    requirement: LAUNCH-03
    verification:
      - kind: unit
        ref: "src/lib/guestCsv.test.ts#csv parser formats and boundaries + csv preview normalization and partial issues + csv template and deterministic batches"
        status: pass
    human_judgment: false
  - id: D2
    description: "Writer Convex exige sessão válida, revalida lotes/linhas, cria apenas pending e nunca sobrescreve telefone lógico existente."
    requirement: LAUNCH-03
    verification:
      - kind: integration
        ref: "convex/admin.test.ts#admin csv import tracer"
        status: pass
    human_judgment: false
  - id: D3
    description: "Fluxo administrativo oferece prévia empilhada, confirmação exata, lotes sequenciais, relatório por linha e limpeza segura."
    requirement: LAUNCH-03
    verification:
      - kind: automated_ui
        ref: "src/components/admin/AdminGuestImport.test.tsx#admin guest csv importer"
        status: pass
    human_judgment: false
  - id: D4
    description: "Importação CSV permanece ao lado da criação manual de famílias, sem remover ou degradar o CRUD existente."
    requirement: LAUNCH-03
    verification:
      - kind: automated_ui
        ref: "src/components/admin/AdminGuestImport.test.tsx#keeps manual family creation rendered and operational beside csv import"
        status: pass
    human_judgment: false

duration: 2h 21m
completed: 2026-07-25
status: complete
---

# Phase 7 Plan 1: Protected Guest CSV Import Summary

**Importador CSV protegido com prévia local, gravação Convex pending-only em lotes, sucesso parcial auditável e preservação integral do CRUD manual**

## Performance

- **Duration:** 2h 21m
- **Started:** 2026-07-25T09:05:01Z
- **Completed:** 2026-07-25T11:26:06Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- Entregou parser Papa Parse limitado a 1 MiB/2.000 registros, cabeçalhos exatos em qualquer ordem, BOM, delimitadores vírgula/ponto e vírgula, quotes/CRLF, agrupamento lógico e modelo apenas com cabeçalho.
- Adicionou `importFamilies` com autorização anterior a qualquer leitura, lotes de 25 famílias/100 pessoas, revalidação server-side, criação `pending` via `insertInvitation` e conflitos sem overwrite.
- Implementou fluxo acessível selecionar → prévia → confirmar → importar → resultado, com linhas/motivos visíveis, `aria-live`, foco do resultado, Escape/retorno de foco e ações de 44px.
- Serializou lotes com trava síncrona contra duplo submit, retenção de resultados confirmados, parada na primeira falha de transporte e reconciliação explícita sem reenvio automático.
- Manteve “Adicionar família” e todas as operações família por família operacionais ao lado do novo ponto de entrada.

## Task Commits

1. **Task 1 RED: especificar tracer vertical CSV** — `47f69c7` (test)
2. **Task 1 GREEN: entregar tracer protegido ponta a ponta** — `965586a` (feat)
3. **Task 2 RED: especificar sucesso parcial seguro** — `7e98601` (test)
4. **Task 2 GREEN: fechar parser/writer parcial e concorrente** — `1cd4a79` (feat)
5. **Task 3 RED: especificar workflow acessível em lotes** — `1da4168` (test)
6. **Task 3 GREEN: completar workflow e relatório reconciliável** — `5067f5f` (feat)
7. **Verification fix: vincular pessoas às linhas-fonte exatas** — `7b5a657` (fix)

## Files Created/Modified

- `src/lib/guestCsv.ts` — parser, normalização, agrupamento, template e batching determinístico.
- `src/lib/guestCsv.test.ts` — regressões de formato, limites, telefone, conflitos, linhas e lotes.
- `convex/adminRsvps.ts` — mutation protegida `importFamilies` com resultado parcial.
- `convex/admin.test.ts` — autorização, pending-only, limites, replay, concorrência e preservação de existentes.
- `src/components/admin/AdminGuestImport.tsx` — máquina de estados, diálogo, prévia, fila e relatório.
- `src/components/admin/AdminGuestImport.test.tsx` — jsdom do fluxo, interrupção, auth-loss, foco, Escape e CRUD manual.
- `src/components/admin/AdminGuests.tsx` — ação secundária do importador ao lado da criação manual.
- `package.json`, `package-lock.json` — pins exatos e integridades de Papa Parse.
- `vite.config.ts` — inclusão do novo teste DOM no ambiente jsdom.

## Decisions Made

- O modelo baixável contém somente BOM e cabeçalhos; não inclui pessoa de exemplo que pudesse ser importada por engano.
- Identidade de convite usa `normalizedKey` do telefone e nome familiar normalizado; a primeira grafia válida continua visível.
- O servidor não recebe `File`, CSV bruto, presença, token de resposta ou `respondedAt`; o writer produz somente `attendance: 'pending'`.
- O relatório separa linhas inválidas na prévia, conflitos detectados no servidor, lotes confirmados e lote de resultado desconhecido.
- `LAUNCH-03` permanece pendente: este plano entrega a capacidade protegida, mas a lista real e as configurações de produção serão concluídas nos Planos 07-03/07-05.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Exigir correspondência exata entre pessoas e linhas-fonte**

- **Found during:** verificação final do registro de sucesso parcial
- **Issue:** O writer validava linhas positivas e pertencentes ao grupo, mas um cliente adulterado ainda poderia repetir uma linha para duas pessoas e incluir outra linha sem pessoa correspondente.
- **Fix:** A mutation passou a exigir cardinalidade igual, linhas de pessoa únicas e igualdade efetiva entre os dois conjuntos.
- **Files modified:** `convex/adminRsvps.ts`, `convex/admin.test.ts`
- **Verification:** suite focada de importação, full suite e build passaram.
- **Committed in:** `7b5a657`

---

**Total deviations:** 1 auto-fixed (1 missing critical).
**Impact on plan:** A correção fecha a auditabilidade por linha exigida pelo threat model, sem alterar API, arquitetura ou escopo do produto.

## Issues Encountered

- A execução foi retomada com os commits RED/GREEN das Tarefas 1–2 e o RED da Tarefa 3 já presentes, mas sem SUMMARY. Os commits foram verificados antes da continuação e nenhum trabalho concluído foi repetido.
- O build mantém o aviso não bloqueante preexistente de chunk principal acima de 500 kB; não foi introduzida regressão de build.

## Package and Security Verification

- `papaparse@5.5.4` aponta para o repositório oficial `github.com/mholt/PapaParse`; versão e integridade SHA-512 do registry coincidem com o lockfile.
- `@types/papaparse@5.5.2` aponta para `DefinitelyTyped`; versão e integridade SHA-512 do registry coincidem com o lockfile.
- `npx convex codegen` regenerou bindings pelo fluxo normal e não produziu diff manual em `_generated`.
- Nenhum CSV real, telefone real, senha, token, hash de sessão, backup ou imagem privada foi adicionado aos artefatos.
- Os diffs preexistentes de `src/lib/phone.ts` e `src/lib/phone.test.ts` permaneceram byte-idênticos e fora de todos os commits do plano.

## Verification

- `src/lib/guestCsv.test.ts`: 16 testes passaram.
- `convex/admin.test.ts -t "csv|import|existing|pending|concurrent|limit|authorization"`: 19 testes passaram.
- `src/components/admin/AdminGuestImport.test.tsx`: 8 testes passaram.
- Full suite: 27 arquivos, 525 testes passaram.
- Production build: passou.
- `git diff --check`: passou.
- Pins, registry URLs e integridades do lockfile: passaram.
- Diff de telefone comparado com o baseline capturado: byte-idêntico.

## User Setup Required

None. A importação da lista real é uma etapa posterior protegida por backup e revisão no Plano 07-05.

## Next Phase Readiness

- O Plano 07-02 pode instalar o gate Playwright/axe e validar o novo diálogo junto com as demais rotas.
- Produção pode receber a API aditiva sem quebrar clientes anteriores; nenhuma lista real foi importada.
- `LAUNCH-03` não foi marcado concluído, pois domínio/senha/lista real continuam pendentes nos planos posteriores.

## Self-Check: PASSED

- Todos os arquivos-chave existem e os sete commits do plano estão acessíveis no histórico.
- Os quatro deliverables de coverage foram classificados com prova automatizada verde.
- Todos os critérios de aceitação e comandos de verificação do plano foram reexecutados.
- Nenhum diff de telefone foi alterado, revertido ou incluído nos commits.

---
*Phase: 07-endurecimento-lan-amento*
*Completed: 2026-07-25*
