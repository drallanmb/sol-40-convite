# Phase 5: Mural de Memórias + Moderação — Research

**Researched:** 2026-07-24  
**Domain:** upload público moderado com Convex Storage, processamento de imagens no navegador e carrossel acessível  
**Confidence:** HIGH para Convex/schema/segurança/testes; MEDIUM para compatibilidade HEIC por navegador

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

### Forma de participação

- **D-01:** Cada memória aceita **foto sozinha, recado sozinho ou foto e recado juntos**. Pelo menos um dos dois conteúdos precisa existir.
- **D-02:** O autor é opcional. Quando omitido, a assinatura pública do card é **“De alguém que te ama”**.
- **D-03:** Cada submissão cria exatamente **um card/memória**. Não há seleção de várias fotos nem miniálbum em uma única submissão.
- **D-04:** Depois de um envio bem-sucedido, foto e recado são limpos, mas o nome do autor permanece preenchido para facilitar envios consecutivos.

### Experiência de envio

- **D-05:** O mural vive em uma **dobra da home depois do dress code e antes do rodapé**. Não ganha rota pública dedicada nesta fase.
- **D-06:** Dentro da dobra, o **carrossel de memórias aprovadas vem antes do formulário**.
- **D-07:** A prévia mostra a imagem inteira e permite **trocar ou remover** a foto. Não haverá editor de recorte/reposicionamento.
- **D-08:** Durante o processamento, a interface mostra progresso. Se upload ou submissão falhar, preserva foto, recado e nome e oferece **“Tentar novamente”**.
- **D-09:** Após sucesso, um estado de confirmação substitui temporariamente o formulário, explica que a memória **aguarda aprovação** e oferece **“Enviar outra memória”**. Essa ação reabre o formulário já limpo conforme D-04.

### Álbum público

- **D-10:** A leitura pública e o carrossel recebem **somente posts aprovados**; posts pendentes ou ocultos nunca entram no payload público.
- **D-11:** As memórias aprovadas são **embaralhadas uma vez ao abrir a página**. A sequência permanece estável durante aquela visita.
- **D-12:** O carrossel avança automaticamente em ritmo lento, possui setas e gesto de arrastar, pausa após interação e respeita `prefers-reduced-motion`.
- **D-13:** Os cards usam moldura/tamanho consistente. Quando há foto, ela aparece acima e o recado abaixo; recado sem foto ocupa a mesma moldura com composição tipográfica central.

### Limites e repetição

- **D-14:** Recados têm limite rígido de **280 caracteres**, com contador visível de caracteres restantes e bloqueio ao atingir o limite.
- **D-15:** JPEG, PNG e WebP são formatos obrigatórios. HEIC/HEIF de iPhone deve ser convertido quando o navegador permitir; quando não for possível, a interface apresenta orientação clara.
- **D-16:** Fotos grandes são reduzidas automaticamente no cliente antes do upload, preservando qualidade adequada ao mural. Tipo e tamanho reais continuam sendo validados no servidor após o upload; metadados declarados pelo cliente não bastam.
- **D-17:** Não há teto de produto para quantas memórias uma pessoa ou dispositivo pode enviar. Os envios são feitos um por vez; o rate-limit existe apenas para conter rajadas e abuso.

### Claude's Discretion

- Copy exata de título, instruções, progresso, erros de formato/tamanho e estado vazio, mantendo o tom afetivo do convite.
- Tempo do autoplay, duração da pausa depois de interação, quantidade de cards visíveis por breakpoint e indicadores do carrossel, desde que D-12 e acessibilidade sejam preservadas.
- Limites técnicos exatos de arquivo original/final, dimensões do downscale, qualidade de compressão e política de rate-limit, desde que fotos comuns de celular tenham bom caminho de sucesso e D-15–D-17 sejam respeitadas.
- Estratégia técnica de conversão HEIC/HEIF e fallback por navegador; orientação de fallback deve ajudar o convidado a enviar uma versão compatível sem perder o recado.
- Limites razoáveis para o nome opcional, sanitização de texto, fixtures e estratégia de testes.

### Deferred Ideas

- Aprovar e ocultar posts na fila de moderação de `/admin` → Phase 6 (`ADMIN-05`).
- Telão/slideshow de fotos e recados aprovados → v2 (`LIVE-01`).
- QR das mesas apontando para upload de fotos → v2 (`LIVE-02`).
- Instagram e menções passando pela moderação → v2 (`IG-01`, `IG-02`).
</user_constraints>

## Summary

A implementação deve manter o fluxo Convex de três requisições, mas não deve tratar a terceira requisição como uma simples mutation que confia em `contentType`. O desenho seguro é: uma mutation rate-limited cria uma reserva e uma URL curta; o navegador reduz/reencoda e envia o `Blob`; uma segunda mutation associa o `storageId`, valida os metadados da tabela de sistema `_storage` e agenda uma `internalAction`; essa action lê o `Blob` real, identifica sua assinatura binária e chama uma `internalMutation` idempotente que cria o `post` como `pendente`. A UI observa o estado da reserva e só mostra sucesso quando a validação terminou. [VERIFIED: codebase `node_modules/convex/src/server/storage.ts`; CITED: https://docs.convex.dev/file-storage/upload-files; CITED: https://docs.convex.dev/functions/actions]

Esse encadeamento resolve quatro riscos ao mesmo tempo: aplica rate-limit antes de gerar custo de storage, não confia em MIME/nome enviados pelo cliente, não publica antes da moderação e permite retry sem duplicar cards. Uma varredura interna de `_storage`, limitada a arquivos antigos e sem referência em `posts` ou reservas, remove órfãos deixados quando o POST termina mas o navegador fecha antes da terceira etapa. A tabela `_storage` é consultável por `ctx.db.system`, e mutations podem apagar storage; scheduled mutations são duráveis e transacionais. [CITED: https://docs.convex.dev/file-storage/file-metadata; CITED: https://docs.convex.dev/scheduling/scheduled-functions; VERIFIED: installed Convex 1.42.3 types]

No frontend, use Canvas APIs nativas para tentativa de decode/reencode, inclusive HEIC/HEIF quando o navegador realmente conseguir decodificar. O resultado canônico deve ser JPEG reduzido, sem EXIF, com limite final de 5 MB; se HEIC não puder ser decodificado, preserve nome/recado e explique como exportar/compartilhar a imagem como JPEG. Para o álbum, use Embla 8.6.0 + plugin oficial Autoplay 8.6.0 para drag/loop/autoplay e implemente a semântica WAI-ARIA ao redor: controle visível de pausar/retomar, pausa definitiva em foco/hover/interação e autoplay desligado sob `prefers-reduced-motion`. [CITED: https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap; CITED: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob; CITED: https://www.w3.org/WAI/ARIA/apg/patterns/carousel/; VERIFIED: npm registry + package-legitimacy gate]

**Primary recommendation:** planejar a fase em quatro cortes: (1) modelo/testes/limites, (2) pipeline de storage validado e limpeza, (3) processamento/formulário com retry, (4) query approved-only e carrossel acessível.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|---|---|---|---|
| Redução, rotação por EXIF suportada pelo decoder, reencode e prévia | Browser / Client | — | Reduz tráfego antes do upload e dá feedback imediato; nunca substitui validação backend. |
| Progresso real do POST | Browser / Client | Convex Storage | `XMLHttpRequest.upload` expõe `ProgressEvent`; a URL de destino vem do Convex. [CITED: https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/upload] |
| Rate-limit e emissão da upload URL | API / Backend (mutation) | Convex component | O custo deve ser limitado antes de `generateUploadUrl()`. |
| Metadados, claim idempotente e agendamento | API / Backend (mutation) | Database / Storage | Mutation lê `_storage`, valida a reserva e agenda a action atomicamente. |
| Sniffing do conteúdo real | API / Backend (internal action) | Convex Storage | `storage.get()` só existe em action/HTTP action, não em query/mutation. [CITED: https://docs.convex.dev/api/interfaces/server.StorageActionWriter] |
| Criação pendente / rejeição / dedupe | API / Backend (internal mutation) | Database / Storage | Invariantes e writes precisam de uma transação idempotente. |
| Limpeza de órfãos | API / Backend (internal mutation agendada) | Database / Storage | Examina `_storage` antigo e apaga somente IDs sem proprietário. |
| Leitura pública | API / Backend (query) | Database / Storage | O filtro `status === "aprovado"` deve ocorrer antes de produzir URLs. |
| Ordem aleatória por visita | Browser / Client | — | Um rank aleatório por `_id`, guardado em `useRef`, mantém ordem estável durante o mount. |
| Drag, snaps, autoplay e loop | Browser / Client | Embla | Mecânica de carrossel pronta e testada; React wrapper limpa a instância no unmount. [CITED: https://www.embla-carousel.com/docs/v8/get-started] |

## Standard Stack

### Core

| Library / API | Version | Purpose | Why Standard |
|---|---:|---|---|
| `convex` | 1.42.3 (installed) | schema, mutations, internal actions, storage e queries reativas | Stack canônica já instalada; seus tipos confirmam `_storage`, `generateUploadUrl`, `get`, `getUrl` e `delete`. [VERIFIED: codebase/package.json] |
| `@convex-dev/rate-limiter` | 0.3.2 (installed) | buckets globais e por dispositivo para URL/submit | Já registrado e testado na Phase 3; alterações são transacionais e falham fechadas. [VERIFIED: installed README/codebase] |
| `embla-carousel-react` | 8.6.0 | drag/swipe, snaps, loop e API de setas | Última versão estável; wrapper React oficial. [VERIFIED: official Embla docs + npm registry + legitimacy OK] |
| `embla-carousel-autoplay` | 8.6.0 | avanço lento e pausa por interação/foco/hover | Plugin oficial da mesma versão do core; expõe `stopOnInteraction`, `stopOnFocusIn` e `stopOnMouseEnter`. [VERIFIED: official Embla v8 docs + npm registry + legitimacy OK] |
| Canvas / File / XHR Web APIs | browser baseline | decode, downscale, JPEG e upload progress | Evita biblioteca pesada para o caminho comum e mede progresso real do POST. [CITED: MDN URLs em Sources] |

### Supporting

| Library | Version | Purpose | When to Use |
|---|---:|---|---|
| `convex-test` | 0.0.54 (installed) | testar schema, storage, actions agendadas, query e rate-limit | Reusar o harness de Phase 3 com injeção de módulos e registro do componente. [VERIFIED: codebase; CITED: https://docs.convex.dev/testing/convex-test] |
| Vitest | 4.1.10 (installed) | helpers puros de imagem, ordem estável, estado do rascunho e backend | Runner único já configurado para `src/**/*.test.ts` e `convex/**/*.test.ts`. [VERIFIED: package.json/vite.config.ts] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|---|---|---|
| Canvas nativo com capability probe | Conversor HEIC/WASM de terceiros | Aumentaria bundle/memória e adicionaria risco de supply chain. A decisão pede tentativa “quando o navegador permitir”, não conversão universal. |
| Embla estável + ARIA explícita | `embla-carousel-accessibility` 9 RC | O plugin acessível está em release candidate e não deve ser misturado ao core estável 8.6.0. [VERIFIED: npm registry] |
| Upload URL de 3 passos | HTTP action multipart | Contraria WALL-02/decisão de três passos e adiciona CORS próprio; HTTP actions têm limite de resposta/request documentado para esse caminho. [CITED: https://docs.convex.dev/file-storage/upload-files] |
| Public action síncrona | Mutation pública que agenda internal action + query reativa de status | O desenho recomendado captura intenção e invariantes em mutation, segue a recomendação Convex contra actions públicas diretas e permite retry idempotente. [CITED: https://docs.convex.dev/functions/actions] |

**Installation:**

```bash
npm install --save-exact embla-carousel-react@8.6.0 embla-carousel-autoplay@8.6.0
```

## Package Legitimacy Audit

| Package | Registry | Age / latest stable | Downloads | Source Repo | Postinstall | Verdict | Disposition |
|---|---|---:|---:|---|---|---|---|
| `embla-carousel-react` | npm | >1 ano / 8.6.0 | 34.7M/semana | `github.com/davidjerleke/embla-carousel` | nenhum | OK | Approved |
| `embla-carousel-autoplay` | npm | >1 ano / 8.6.0 | 2.7M/semana | `github.com/davidjerleke/embla-carousel` | nenhum | OK | Approved |

**Packages removed due to SLOP verdict:** none.  
**Packages flagged as suspicious SUS:** none.  
**Gate executed:** `gsd-tools query package-legitimacy check --ecosystem npm ...`, `npm view ... version/repository/scripts.postinstall`. [VERIFIED: npm registry/package-legitimacy output on 2026-07-24]

## Architecture Patterns

### System Architecture Diagram

```text
Convidado seleciona foto/recado
        |
        +-- recado sem foto ------------------------------+
        |                                                  |
        |                                          submitTextMemory mutation
        |                                          - valida texto
        |                                          - rate-limit
        |                                          - INSERT pendente
        |
        +-- foto --> decode/downscale/reencode JPEG
                     | falha HEIC -> orientação; rascunho preservado
                     v
              requestUpload mutation
              - rate-limit device + global
              - INSERT uploadReservation
              - agenda expiração
              - generateUploadUrl
                     |
                     v
              XHR POST Blob --> Convex Storage --> storageId
                     |
                     v
              submitPhotoMemory mutation
              - token/reserva/idempotência
              - metadata `_storage`: tamanho/MIME
              - associa storageId + texto
              - agenda internalAction
                     |
                     v
              validatePhoto internalAction
              - storage.get(storageId)
              - magic bytes / estrutura mínima
                     |
             +-------+--------+
             | válido         | inválido
             v                v
       accept internal   reject internal
       mutation          mutation
       - INSERT post     - delete storage
         pendente        - marca erro
       - marca accepted
             |
             v
      query status -> sucesso inline “aguarda aprovação”

Moderador Phase 6: pendente -> aprovado/oculto
             |
             v
listApproved query -- by_status eq("aprovado") --> getUrl apenas aqui
             |
             v
rank aleatório por visita -> Embla acessível -> cards públicos
```

### Recommended Project Structure

```text
convex/
├── postModel.ts              # validators, limites e tipos de resultado
├── postRateLimits.ts         # limites isolados do RSVP
├── postSecurity.ts           # token/hash/claim da reserva
├── uploadValidation.ts       # sniffing binário puro
├── posts.ts                  # API pública: request, submit, status, approved-only
├── postInternal.ts           # action de validação + mutations idempotentes/cleanup
├── postTest.ts               # harness no padrão Phase 3
├── posts.test.ts             # schema, pipeline, rate limit, approved-only, cleanup
└── crons.ts                  # sweep defensivo de órfãos antigos, se adotado
src/
├── components/memories/
│   ├── MemoriesSection.tsx
│   ├── MemoryCarousel.tsx
│   ├── MemoryCard.tsx
│   ├── MemoryForm.tsx
│   ├── PhotoPicker.tsx
│   └── SubmissionSuccess.tsx
├── lib/
│   ├── imageProcessing.ts
│   ├── imageProcessing.test.ts
│   ├── memoryDraft.ts
│   ├── memoryDraft.test.ts
│   ├── stableVisitOrder.ts
│   └── stableVisitOrder.test.ts
└── hooks/
    └── useReducedMotion.ts
```

### Pattern 1: Reserva + claim + processamento interno idempotente

**What:** a primeira mutation cria uma reserva com hash de capability, expiração e estado `awaiting_upload`. A terceira etapa troca atomicamente para `processing`, prende o `storageId`, salva o comando normalizado e agenda uma action interna. A mutation de aceitação só insere se a reserva ainda estiver `processing` com o mesmo `storageId`; retries retornam o mesmo `postId`.  
**When to use:** todo envio com foto.  
**Why:** actions não são transações e scheduled actions executam no máximo uma vez; a reserva é a fonte de verdade recuperável. [CITED: https://docs.convex.dev/functions/actions; CITED: https://docs.convex.dev/scheduling/scheduled-functions]

Estado recomendado:

```ts
type UploadState =
  | "awaiting_upload"
  | "processing"
  | "accepted"
  | "rejected"
  | "expired";
```

Permita que a mesma `submitPhotoMemory` reagende validação quando `processing` estiver parado por pelo menos 15 segundos. A action e a mutation final devem ser idempotentes; nunca crie um segundo post para a mesma reserva.

### Pattern 2: validação em duas camadas, sempre backend

**What:** na mutation da etapa 3, leia `ctx.db.system.get("_storage", storageId)` e limite `size`/`contentType`; na action, obtenha o `Blob` com `ctx.storage.get`, leia bytes e detecte JPEG/PNG/WebP por assinatura.  
**When to use:** antes de qualquer `posts.insert` com mídia.  
**Source:** metadata `_storage` é a API atual preferida; `getMetadata()` está deprecated nos tipos instalados. `storage.get()` é exclusivo de actions. [CITED: https://docs.convex.dev/file-storage/file-metadata; VERIFIED: installed Convex 1.42.3 types]

Regras prescritivas:

- máximo original no cliente: 30 MB, apenas para evitar decode destrutivo de memória;
- máximo final no servidor: 5 MB;
- maior aresta no cliente: 2560 px;
- JPEG quality inicial: 0.85; se exceder 5 MB, tente 0.75 e depois reduza a aresta;
- tipos finais aceitos no servidor: `image/jpeg`, `image/png`, `image/webp`;
- assinatura e MIME declarado precisam ser compatíveis;
- HEIC/HEIF cru deve ser reconhecido para devolver erro específico e apagado; não deve virar post;
- arquivo inválido, ausente ou grande é apagado e a reserva vira `rejected`.

Esses valores preservam fotos comuns e reduzem custo/rede; são uma recomendação de produto dentro de Claude's Discretion, não um limite imposto pelo Convex. [ASSUMED]

### Pattern 3: texto como plain text, não HTML

**What:** normalize CRLF para LF, `trim()`, rejeite controles não imprimíveis exceto newline/tab, conte Unicode por code points (`[...text].length`) e limite recado a 280 e autor a 60. Guarde autor omitido como `undefined`; aplique **“De alguém que te ama”** somente na view pública.  
**When to use:** mutation de texto e etapa 3 de foto.  
**Why:** mantém uma definição compartilhável entre cliente e servidor, evita persistir copy de apresentação e React escapa texto por padrão. [VERIFIED: React composition in codebase]

Não use `dangerouslySetInnerHTML` e não instale sanitizer para um campo que nunca aceita markup.

### Pattern 4: query approved-only produz view pública mínima

```ts
// Source: https://docs.convex.dev/database/reading-data/indexes/
const approved = await ctx.db
  .query("posts")
  .withIndex("by_status", (q) => q.eq("status", "aprovado"))
  .order("desc")
  .take(100);
```

Mapeie para `{ id, author, message?, imageUrl?, createdAt }`, gerando `imageUrl` somente para o subconjunto aprovado. Não retorne `storageId`, estado de moderação, hash, reserva ou documentos inteiros. URLs de storage são bearer URLs; depois de compartilhadas podem ser reutilizadas, então a fronteira crítica é nunca produzir URL de pendente/oculto. [CITED: https://docs.convex.dev/file-storage/serve-files]

### Pattern 5: embaralhamento estável por mount

**What:** mantenha `Map<postId, randomRank>` em `useRef`. Ao receber IDs novos da query reativa, atribua rank uma única vez usando `crypto.getRandomValues`; ordene uma cópia pelo rank.  
**When to use:** antes de passar slides ao Embla.  
**Why:** `sort(() => Math.random() - .5)` é enviesado e muda em render; Fisher-Yates em todo update também move cards existentes. Rank persistente preserva a ordem relativa durante a visita e incorpora aprovações reativas sem resetar o carrossel.

### Pattern 6: autoplay acessível

Use Embla com `loop: approved.length > visibleCount` e Autoplay com cerca de 7 segundos, `stopOnInteraction: true`, `stopOnFocusIn: true`, `stopOnMouseEnter: true`. Sob `prefers-reduced-motion: reduce`, inicialize parado. Inclua botão “Pausar memórias” / “Retomar memórias”, setas com nomes acessíveis, região `aria-roledescription="carrossel"` e slides `role="group"` com “Memória X de N”. Não anuncie cada avanço automático em live region. [CITED: https://www.w3.org/WAI/ARIA/apg/patterns/carousel/; CITED: https://www.embla-carousel.com/docs/v8/plugins/autoplay]

### Pattern 7: rascunho separado do estado da rede

Modele separadamente:

- `draft`: autor, recado, arquivo original, blob processado, preview URL;
- `submission`: idle / processing / uploading / validating / failed / success;
- `transport`: reservationId, capability, storageId, percent.

Falha altera somente `submission`; nunca apaga `draft`. “Enviar outra memória” revoga a preview URL, limpa foto/recado/transporte e preserva autor. Trocar/remover foto também revoga a URL anterior. [CITED: https://developer.mozilla.org/en-US/docs/Web/API/File_API/Using_files_from_web_applications]

### Anti-Patterns to Avoid

- **Criar post na mutation usando só `contentType`:** é controlado pelo cliente e não prova formato real.
- **Expor `validatePhoto` como public action sem reserva:** permite chamadas paralelas, dificulta dedupe e contraria o padrão Convex de capturar intenção em mutation.
- **Consumir rate-limit depois do POST:** o custo de storage já ocorreu.
- **Usar apenas bucket por `deviceId`:** atacante pode rotacioná-lo; mantenha disjuntor global.
- **Retornar URLs de pendentes para “preview”:** a URL é bearer e escapa da moderação.
- **Apagar qualquer `_storage` não referenciado imediatamente:** pode disputar com uma finalização em andamento; varra apenas arquivos >24h e registre todos os proprietários.
- **Fallback que envia HEIC cru “para tentar”:** o servidor desta fase não decodifica HEIC; isso gera custo e erro tardio. Oriente conversão sem perder o texto.
- **Resetar o formulário no início do submit:** viola D-08; reset só depois do estado `accepted`.
- **Autoplay sem botão de pausa:** viola o padrão WAI para carrossel auto-rotativo.
- **`sort(() => Math.random() - 0.5)`:** ordem instável e distribuição ruim.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| física de swipe/drag/snaps/loop | listeners pointer/touch + cálculo de snap próprios | Embla 8.6.0 | Drag, resize, reinit, loop e breakpoints têm muitos edge cases. |
| rate limiter distribuído | tabela de eventos/contadores próprios | componente já instalado | Transação, rollback e fail-closed já existem. |
| upload multipart/BFF | proxy Vercel ou HTTP action próprio | upload URL Convex | Upload vai direto ao storage e segue WALL-02. |
| parser/sanitizer HTML | permitir rich text e limpar depois | plain text React | Recado não requer markup. |
| conversor universal HEIC | decoder WASM novo sem necessidade | capability probe + Canvas + fallback orientado | Escopo exige tentativa quando suportado, não paridade universal. |

**Key insight:** hand-roll é apropriado apenas para a pequena regra pura de assinatura binária (já existe referência testada no projeto anterior); não para carrossel, rate-limit ou transporte de storage.

## Data Model Recommendation

```ts
posts: {
  author?: string,
  message?: string,
  storageId?: Id<"_storage">,
  mediaType?: "image/jpeg" | "image/png" | "image/webp",
  mediaSize?: number,
  status: "pendente" | "aprovado" | "oculto",
  source: "convidado",
  uploadReservationId?: Id<"postUploadReservations">,
  createdAt: number,
  moderatedAt?: number,
  approvedAt?: number,
}
  .index("by_status", ["status"])
  .index("by_storage_id", ["storageId"])
  .index("by_upload_reservation", ["uploadReservationId"])

postUploadReservations: {
  tokenHash: string,
  deviceKeyHash: string,
  state: UploadState,
  storageId?: Id<"_storage">,
  author?: string,
  message?: string,
  postId?: Id<"posts">,
  errorCode?: string,
  expiresAt: number,
  validationRequestedAt?: number,
  createdAt: number,
}
  .index("by_storage_id", ["storageId"])
  .index("by_expires_at", ["expiresAt"])
```

At least one of `message`/`storageId` is a business invariant enforced by writers; Convex schema validators cannot express cross-field “at least one” alone. Likewise, optional media fields must move together. Centralize both in helpers used only by internal/public writers. [VERIFIED: Convex validator model; CITED: https://docs.convex.dev/functions/validation]

For future Phase 6, `by_status` naturally yields the moderation queue ordered by `_creationTime`. For v2 telão, the same approved query and `source` field remain usable without introducing telão-specific columns now.

## Rate-Limit Policy

Reuse the Phase 3 sequence “check every applicable bucket, then consume all” to avoid partial consumption. [VERIFIED: `convex/rsvps.ts` and installed component README]

Recommended initial buckets:

| Port | Scope | Policy | Purpose |
|---|---|---|---|
| `requestUpload` | hashed device key | token bucket: 10 / 10 min, capacity 4 | permite pequena rajada legítima e depois desacelera |
| `requestUpload` | global | fixed window: 300 / hour | disjuntor de custo; não é identidade |
| `submitTextMemory` | hashed device key | token bucket: 20 / hour, capacity 5 | contém spam textual sem teto de produto |
| `submitTextMemory` | global | fixed window: 600 / hour | protege writes |
| retry de validação | reservation | 1 / 15 s | impede fan-out de scheduled actions |

Os valores são recomendação operacional [ASSUMED]. O cliente deve gerar uma chave aleatória de 32 bytes uma vez e mantê-la em `localStorage`; o servidor valida formato e armazena/usa apenas hash. Ela melhora justiça casual, mas não é autenticação nem defesa contra atacante dedicado. O bucket global é a defesa de custo, com risco consciente de DoS por esgotamento; alertas/usage caps da plataforma continuam sendo defesa operacional.

## Orphan Cleanup

Use dois mecanismos:

1. Ao criar uma reserva, agende uma internal mutation para depois de 24h. Se ainda não estiver `accepted`, apague seu `storageId` conhecido e marque `expired`.
2. Rode sweep interno diário sobre `_storage`, paginado. Para arquivos com `_creationTime < now - 24h`, preserve se houver `posts.by_storage_id` ou `postUploadReservations.by_storage_id`; apague somente quando ambos não existirem.

O segundo mecanismo cobre o único buraco inevitável do protocolo de três passos: POST concluído, `storageId` entregue ao browser e aba fechada antes da etapa 3. A janela de 24h evita corrida com validação normal. Se outra feature passar a usar Convex Storage, ela deve registrar ownership no sweep antes de ativá-lo. [CITED: https://docs.convex.dev/file-storage/file-metadata; CITED: https://docs.convex.dev/scheduling/cron-jobs]

## Common Pitfalls

### Pitfall 1: metadata não é conteúdo real
**What goes wrong:** PDF/script enviado com `Content-Type: image/jpeg` passa.  
**Why:** `_storage.contentType` registra o valor fornecido no upload.  
**Avoid:** limite metadata na mutation e confirme magic bytes na action antes do insert.  
**Warning sign:** teste “fake JPEG MIME + bytes `<script>`” cria post.

### Pitfall 2: sucesso otimista antes da action
**What goes wrong:** UI diz “aguarda aprovação”, mas action falhou e nenhum post existe.  
**Why:** scheduled actions são at-most-once e não fazem parte da transação original.  
**Avoid:** sucesso somente quando status query retorna `accepted`; `processing` é progresso, não sucesso.  
**Warning sign:** formulário limpa logo depois de `submitPhotoMemory`.

### Pitfall 3: órfão invisível
**What goes wrong:** storage cresce sem documentos correspondentes.  
**Why:** Convex upload cria o arquivo na etapa 2 antes do vínculo no banco.  
**Avoid:** reserva + expiração + sweep `_storage` antigo.  
**Warning sign:** dashboard de Files contém IDs sem `posts`.

### Pitfall 4: HEIC funciona no aparelho do dev, falha no convidado
**What goes wrong:** preview/downscale rejeita em Chromium/Android ou versões diferentes do Safari.  
**Why:** suporte ao container/codec de entrada varia; `createImageBitmap` ser “baseline” não garante todos os formatos.  
**Avoid:** capability probe real, fallback `<img>`, erro específico e UAT iPhone real em Phase 7.  
**Warning sign:** lógica decide suporte apenas por extensão/MIME.

### Pitfall 5: Canvas bloqueia a UI ou estoura memória
**What goes wrong:** aba trava ao decodificar imagem enorme.  
**Why:** pixels decodificados custam muito mais que bytes comprimidos.  
**Avoid:** rejeite original >30 MB, libere `ImageBitmap.close()`, revogue object URLs e processe um arquivo por vez.  
**Warning sign:** preview mantém múltiplos bitmaps/URLs após troca.

### Pitfall 6: contador cliente e servidor discordam
**What goes wrong:** UI mostra 280, mutation rejeita emoji/acentos.  
**Why:** uma camada usa UTF-16 `.length` e outra code points/graphemes.  
**Avoid:** helper compartilhado/testado para normalização e `[...value].length`.  
**Warning sign:** testes com emoji falham apenas no backend.

### Pitfall 7: autoplay acessível incompleto
**What goes wrong:** foco/leitor de tela muda de contexto sozinho.  
**Why:** só `prefers-reduced-motion` foi considerado.  
**Avoid:** pause control, stop em foco/hover/interação, sem live announcements automáticos.  
**Warning sign:** não existe botão de rotação.

### Pitfall 8: conflito com Phase 4 paralela
**What goes wrong:** `schema.ts`, `Home.tsx`, `event.ts`, `package.json` e lockfile recebem edições concorrentes.  
**Why:** ambas as fases integram schema/navegação/home/dependências.  
**Avoid:** planos devem isolar arquivos novos primeiro e deixar os quatro pontos compartilhados para uma task de integração curta, sempre relendo o worktree antes do patch.  
**Warning sign:** patch substitui o objeto/schema inteiro com snapshot anterior.

## Code Examples

### Metadata first, then scheduled real-content validation

```ts
// Sources:
// https://docs.convex.dev/file-storage/file-metadata
// https://docs.convex.dev/scheduling/scheduled-functions
const metadata = await ctx.db.system.get("_storage", args.storageId);
if (!metadata || metadata.size > MAX_FINAL_BYTES) {
  if (metadata) await ctx.storage.delete(args.storageId);
  return { kind: "invalid_photo" } as const;
}

await ctx.db.patch(reservation._id, {
  state: "processing",
  storageId: args.storageId,
  validationRequestedAt: Date.now(),
});
await ctx.scheduler.runAfter(0, internal.postInternal.validatePhoto, {
  reservationId: reservation._id,
});
return { kind: "processing" } as const;
```

### Real upload progress

```ts
// Source: https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/upload
function uploadBlob(url: string, blob: Blob, onProgress: (value: number) => void) {
  return new Promise<{ storageId: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    });
    xhr.addEventListener("load", () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error("upload_failed"));
        return;
      }
      resolve(JSON.parse(xhr.responseText));
    });
    xhr.addEventListener("error", () => reject(new Error("upload_failed")));
    xhr.open("POST", url);
    xhr.setRequestHeader("Content-Type", blob.type);
    xhr.send(blob);
  });
}
```

### Native HEIC attempt without pretending universal support

```ts
// Sources:
// https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap
// https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob
const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
try {
  const scale = Math.min(1, 2560 / Math.max(bitmap.width, bitmap.height));
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await canvasToBlob(canvas, "image/jpeg", 0.85);
  return blob;
} finally {
  bitmap.close();
}
```

### Approved-only output

```ts
// Sources:
// https://docs.convex.dev/database/reading-data/indexes/
// https://docs.convex.dev/file-storage/serve-files
const posts = await ctx.db
  .query("posts")
  .withIndex("by_status", (q) => q.eq("status", "aprovado"))
  .order("desc")
  .take(100);

return Promise.all(
  posts.map(async (post) => ({
    id: post._id,
    author: post.author ?? "De alguém que te ama",
    ...(post.message ? { message: post.message } : {}),
    ...(post.storageId
      ? { imageUrl: await ctx.storage.getUrl(post.storageId) }
      : {}),
    createdAt: post.createdAt,
  })),
);
```

## State of the Art

| Old Approach | Current Approach | Impact |
|---|---|---|
| `ctx.storage.getMetadata()` | `ctx.db.system.get("_storage", storageId)` em query/mutation | A API atual dá metadata pela system table; tipos 1.42.3 marcam `getMetadata` deprecated. [VERIFIED: installed types; CITED: Convex metadata docs] |
| API própria R2 + multipart do projeto antigo | upload URL Convex em 3 requests | Remove infraestrutura custom, mas exige cleanup explícito do intervalo entre POST e vínculo. |
| fila de múltiplas fotos | uma memória por envio | Estado/retry/moderação ficam unitários conforme D-03. |
| auto-publicação possível no projeto antigo | sempre `pendente` | Moderação passa a ser invariante, não configuração. |
| carrossel artesanal | Embla stable + ARIA WAI explícita | Menos bugs de drag/resize, mantendo acessibilidade sob controle da aplicação. |

**Deprecated/outdated:**

- `storage.getMetadata()` em código novo: usar `_storage` via `db.system` onde há db context.
- Plugin `embla-carousel-accessibility@9.0.0-rc01`: não misturar com core stable 8.6.0 nesta fase.
- Enviar original quando Canvas falha: aceitável no projeto antigo por seu servidor HEIC, mas não neste desenho sem decoder backend.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| A1 | 30 MB original, 5 MB final, 2560 px e JPEG 0.85 equilibram qualidade/custo para este evento. | Pattern 2 | Pode exigir ajuste após teste com fotos reais; não muda arquitetura. |
| A2 | Buckets 10/10min device, 300/h global e equivalentes de texto são adequados ao público. | Rate-Limit Policy | Limite pode ser apertado ou frouxo; deve ser calibrado com uso/telemetria. |
| A3 | 100 posts aprovados por payload é suficiente para o álbum v1. | Pattern 4 | Álbum muito maior precisaria paginação/limite diferente. |

## Open Questions

1. **Qual o volume real de fotos e o mix de aparelhos?**
   - What we know: não existe teto de produto; evento é uma festa privada.
   - What's unclear: pico por hora e proporção HEIC.
   - Recommendation: usar limites propostos, logar apenas códigos/contagens sem PII e validar com iPhone real na Phase 7.

2. **O álbum público precisa mostrar mais de 100 memórias simultaneamente?**
   - What we know: carrossel aleatório é a experiência v1.
   - What's unclear: volume final aprovado.
   - Recommendation: `take(100)` agora; telão/paginação ficam para v2 se o volume justificar.

3. **O sweep poderá assumir ownership exclusivo do storage?**
   - What we know: hoje não há outra tabela com `storageId`.
   - What's unclear: Phase 6/7 pode introduzir outro uso.
   - Recommendation: antes de ativar o cron, auditar todos os `storageId` do schema e centralizar a função `isStorageOwned`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|---|---|---:|---:|---|
| Node.js | build/test | ✓ | 24.18.0 | — |
| npm | packages/scripts | ✓ | 12.0.1 | — |
| Convex CLI | codegen/dev smoke | ✓ | 1.42.3 | `npm run build` não substitui smoke real |
| Convex deployment/env | upload/storage real | parcialmente | projeto já conectado; requer ambiente dev válido | `convex-test` cobre mock, mas não CORS/codec real |
| Vitest | automated tests | ✓ | 4.1.10 | — |
| `convex-test` | backend harness | ✓ | 0.0.54 | — |

**Missing dependencies with no fallback:** none for planning/implementation.  
**Runtime checks still mandatory:** `npx convex dev --once` and browser/device upload smoke, because `convex-test` is a mock and does not reproduce every runtime behavior. [CITED: https://docs.convex.dev/testing/convex-test]

## Validation Architecture

### Test Framework

| Property | Value |
|---|---|
| Framework | Vitest 4.1.10 + convex-test 0.0.54 |
| Config file | `vite.config.ts` |
| Quick run command | `npm test -- convex/posts.test.ts` |
| Client quick run | `npm test -- src/lib/imageProcessing.test.ts src/lib/stableVisitOrder.test.ts src/lib/memoryDraft.test.ts` |
| Full suite command | `npm test && npm run build` |
| Real backend gate | `npx convex dev --once` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|---|---|---|---|---|
| WALL-01 | schema aceita foto, texto ou ambos; rejeita status/campos inválidos; índices suportam status/storage/reserva | Convex integration | `npm test -- convex/posts.test.ts` | ❌ Wave 0 |
| WALL-02 | URL reservada; metadata limita 5 MB/MIME; bytes falsos rejeitados/apagados; JPEG/PNG/WebP reais aceitos; retry não duplica; órfão expira | Convex integration + pure unit | `npm test -- convex/posts.test.ts convex/uploadValidation.test.ts` | ❌ Wave 0 |
| WALL-02 | downscale/reencode mantém proporção, aplica limites e HEIC failure preserva draft | pure unit com adapters + manual codec | `npm test -- src/lib/imageProcessing.test.ts src/lib/memoryDraft.test.ts` | ❌ Wave 0 |
| WALL-03 | recado 1–280 code points, autor opcional ≤60, texto-only cria pendente | Convex integration + unit | `npm test -- convex/posts.test.ts src/lib/memoryDraft.test.ts` | ❌ Wave 0 |
| WALL-04 | query retorna somente `aprovado`, nunca URL/storage de pendente/oculto; fallback de autor correto | Convex integration | `npm test -- convex/posts.test.ts` | ❌ Wave 0 |
| WALL-05 | buckets por dispositivo/global limitam URL antes do storage e texto; retryAfter seguro | Convex integration | `npm test -- convex/posts.test.ts` | ❌ Wave 0 |
| D-11/D-12 | rank permanece estável quando rerender/query adiciona item; reduced motion desliga autoplay | unit + manual UI | `npm test -- src/lib/stableVisitOrder.test.ts` | ❌ Wave 0 |

### Test Architecture Details

- Reusar `makeRsvpTest` como modelo, criando `makePostTest` com `convexTest(schema, modules)` e `rateLimiterTest.register(t)`. Não importar `import.meta.glob` em módulo de deploy; a injeção fica no `*.test.ts`. [VERIFIED: `convex/rsvpTest.ts`, `convex/rsvps.test.ts`]
- `convex-test` 0.0.54 implementa `storage.store/get/delete` e permite inline actions; armazene `Blob`s de fixtures no teste e rode o pipeline real de internal action. [VERIFIED: installed `convex-test/dist/index.js`; CITED: official convex-test docs]
- Use `vi.useFakeTimers()` e `finishAllScheduledFunctions(vi.runAllTimers)` para validação/expiração agendadas. [CITED: https://docs.convex.dev/testing/convex-test]
- Fixtures binárias mínimas: JPEG, PNG, WebP, HEIC reconhecível, PDF, HTML e MIME falso; inclua arquivo exatamente no limite e +1 byte.
- Para Canvas, extraia cálculo de dimensões/qualidade e state transitions como funções puras; decode/codec real permanece smoke de navegador porque Node/Vitest não reproduz codecs do dispositivo.

### Sampling Rate

- **Per task commit:** o quick command do arquivo alterado.
- **Per wave merge:** `npm test && npm run build`.
- **Phase gate:** full suite green + `npx convex dev --once` + smoke de upload JPEG/PNG/WebP e HEIC em Safari iOS real ou explicitamente registrado para LAUNCH-01.

### Wave 0 Gaps

- [ ] `convex/postTest.ts` — harness Phase 5 com rate limiter.
- [ ] `convex/posts.test.ts` — schema, public surface, status, dedupe, cleanup e limits.
- [ ] `convex/uploadValidation.test.ts` — magic bytes/tamanho/MIME.
- [ ] `src/lib/imageProcessing.test.ts` — cálculo/downscale/fallback por adapters.
- [ ] `src/lib/memoryDraft.test.ts` — preservação em erro e reset parcial após sucesso.
- [ ] `src/lib/stableVisitOrder.test.ts` — estabilidade e inclusão de itens novos.

Nenhuma instalação de framework de teste é necessária.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---|---|---|
| V2 Authentication | no para envio público | Não transformar device key em autenticação; admin é Phase 6. |
| V3 Session Management | parcialmente | Capability curta por reserva, 32 bytes, hash at rest, expiração e uso único; não é sessão de usuário. |
| V4 Access Control | yes | Query pública filtra `aprovado` no backend; internal functions para validação/write-back/cleanup. |
| V5 Input Validation | yes | `args` + `returns`, normalização server-side, limites de texto, metadata + magic bytes. |
| V6 Cryptography | yes | Web Crypto SHA-256 e gerador já testado na Phase 3; não inventar PRNG/token. |
| V8 Data Protection | yes | Nunca retornar pendentes/storage IDs/hashes; Canvas reencode remove metadata EXIF do arquivo final. |
| V12 Files and Resources | yes | allowlist de tipo, tamanho, conteúdo real, nomes ignorados, storage fora de HTML, cleanup de órfãos. |
| V13 API | yes | public surface mínima, resultados discriminados, rate-limit e sem documents crus. |

### Known Threat Patterns for Convex + public upload

| Pattern | STRIDE | Standard Mitigation |
|---|---|---|
| MIME spoof / arquivo ativo | Tampering | metadata + magic bytes; servir apenas como imagem aprovada |
| Storage cost exhaustion | Denial of Service | rate-limit antes da URL, max final, bucket global, usage monitoring |
| Device-key rotation | Spoofing | tratar como fairness, não identidade; bucket global permanece |
| Replay/retry duplicando posts | Tampering | capability hashed, reserva state machine, internal mutation idempotente |
| Bypass da moderação | Information Disclosure | approved-only indexed query; nenhuma URL pendente no payload |
| Orphan accumulation | Denial of Service | expiry + sweep antigo e paginado |
| Texto ativo/XSS | Elevation of Privilege | plain text, React escaping, proibir `dangerouslySetInnerHTML` |
| Capability/log leakage | Information Disclosure | não colocar token em URL, logs, DOM ou error copy |
| Action fan-out | Denial of Service | action interna, requeue com cooldown, limite por reserva |

Todos os public queries/mutations e actions devem declarar `args` e `returns`; TypeScript sozinho não valida chamadas hostis em runtime. [CITED: https://docs.convex.dev/functions/validation]

## Project Integration Notes

- `Home.tsx`: inserir `MemoriesSection` depois de `DressCodeSection`.
- `event.ts`: acrescentar `SECTION_IDS.memories` e nav “Memórias” sem hardcode divergente.
- `schema.ts`: estender o objeto existente; nunca substituir/remover as tabelas RSVP.
- `convex.config.ts`: rate limiter já registrado; não registrar outra instância do componente.
- `rsvpSecurity.ts`: não ampliar tipos RSVP de forma acoplada. Extraia apenas um utilitário genérico de capability se isso puder ser feito sem mudar comportamento/testes; caso contrário, crie `postSecurity.ts`.
- `Field`: contador/error IDs precisam compor `aria-describedby`; pode ser extensão compatível ou wrapper local.
- `Card`, `Button`, `Toast`: reutilizar; sucesso principal é inline, Toast é só auxiliar.
- Phase 4 está em paralelo: releia `git diff` antes de tocar `schema.ts`, `Home.tsx`, `event.ts`, `package.json` e lockfile.

Não há `CLAUDE.md`, `.claude/CLAUDE.md`, `AGENTS.md` nem skills locais do projeto descobertos; portanto não existe seção adicional de restrições locais. [VERIFIED: filesystem scan]

## Sources

### Primary (HIGH confidence)

- Installed Convex 1.42.3 types: `node_modules/convex/src/server/storage.ts` — disponibilidade/deprecation de storage APIs.
- Installed `convex-test` 0.0.54 implementation — suporte mock a store/get/delete e actions.
- Existing Phase 3 code — harness, rate-limit, capability/hash e test conventions.
- Previous project `lib/upload-core.mjs` and tests — JPEG/PNG/WebP/HEIC signature reference and historical 12 MB rule.

### Official documentation (MEDIUM confidence)

- https://docs.convex.dev/file-storage/upload-files — fluxo de 3 requests e URL de 1 hora.
- https://docs.convex.dev/file-storage/file-metadata — `_storage` e metadata.
- https://docs.convex.dev/api/interfaces/server.StorageActionWriter — `storage.get()` somente em actions.
- https://docs.convex.dev/file-storage/serve-files — URLs bearer e `getUrl`.
- https://docs.convex.dev/functions/actions — intenção em mutation, internal action e não atomicidade.
- https://docs.convex.dev/scheduling/scheduled-functions — garantias de agendamento.
- https://docs.convex.dev/database/reading-data/indexes/ — approved-only via índice.
- https://docs.convex.dev/functions/validation — args/returns para segurança.
- https://docs.convex.dev/testing/convex-test — actions/scheduler e limites do mock.
- https://www.embla-carousel.com/docs/v8/get-started/react — wrapper React stable.
- https://www.embla-carousel.com/docs/v8/plugins/autoplay — pausa/interação/plugin.
- https://www.w3.org/WAI/ARIA/apg/patterns/carousel/ — controles e comportamento de rotação.
- https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap — decode browser.
- https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob — encode Canvas.
- https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/upload — progresso de upload.
- https://developer.mozilla.org/en-US/docs/Web/API/File_API/Using_files_from_web_applications — object URLs/revoke.
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion — motion preference.

### Tertiary (LOW confidence)

- None. Browser-specific HEIC support is intentionally capability-tested and left to real-device validation rather than asserted from compatibility tables.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — installed versions/types plus official package docs and legitimacy gate.
- Convex architecture: HIGH — official docs cross-checked against installed source types and Phase 3 patterns.
- Image limits/rate values: MEDIUM — recommendations explicitly marked assumed and tunable.
- HEIC behavior: MEDIUM — no universal support claim; capability probe + UAT required.
- Accessibility: HIGH — W3C APG plus official Embla controls.
- Test architecture: HIGH — existing harness and installed mock implementation inspected.

**Research date:** 2026-07-24  
**Valid until:** 2026-08-23 for Convex/Embla versions; product limits remain valid until real-device calibration.
