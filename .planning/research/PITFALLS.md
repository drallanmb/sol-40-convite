# Pitfalls Research

**Domain:** Site de convite público (RSVP sem login, upload de foto moderado, redirect WhatsApp) sobre Convex + React/Tailwind + Vercel
**Researched:** 2026-07-23
**Confidence:** MEDIUM (Convex via docs oficiais/Context7; wa.me e normalização BR via web search cruzado; herança do projeto Cloudflare anterior reclassificada por relevância)

Este documento parte de duas fontes: (1) pesquisa desta stack (Convex, wa.me, telefone BR, Vercel) e (2) o `design.md` do projeto anterior (Cloudflare/D1/R2), do qual só as lições **conceituais** (não as específicas de Workers/D1/R2) foram herdadas — marcadas como **[herdado]** abaixo.

---

## Critical Pitfalls

### Pitfall 1: Upload URL do Convex não valida nada — moderação vira responsabilidade 100% da aplicação

**What goes wrong:**
`ctx.storage.generateUploadUrl()` gera uma URL de POST de curta duração que aceita **qualquer arquivo, de qualquer tamanho, de qualquer tipo**, sem checagem do lado do Convex. Um dev assume (por analogia com serviços tipo S3 presigned-post com policy) que dá para restringir tipo/tamanho na própria URL. Não dá. Se a validação não for feita explicitamente depois do upload, qualquer visitante pode enviar arquivos gigantes ou de tipo arbitrário e eles chegam à tabela `_storage` como se fossem legítimos.

**Why it happens:**
O fluxo de 3 passos do Convex (mutation gera URL → client faz POST direto → segunda mutation salva o `storageId`) é desenhado para permitir upload de arquivos grandes sem passar pelo limite de payload das funções — mas isso significa que o passo 2 (o POST em si) **não passa por nenhuma function do Convex**, logo nenhuma validação de argumento (`v.*`) roda nele.

**How to avoid:**
- Validar client-side (tipo/tamanho) **antes** de pedir a upload URL — é UX, não segurança.
- Depois do upload, na mutation que salva o `storageId`, chamar `ctx.storage.getMetadata(storageId)` e checar `size` e `contentType`; se fora do esperado, apagar (`ctx.storage.delete`) e rejeitar.
- Nunca marcar o registro como `status: publicado` na mesma mutation que recebe o `storageId` — sempre nascer como `pendente` e só publicar após moderação (ver Pitfall 3).

**Warning signs:**
- Código que confia em `selectedImage.type` do `<input>` do client como única validação.
- Ausência de qualquer chamada a `ctx.storage.getMetadata` no backend.

**Phase to address:** Fase de upload/mural (schema + mutations de foto), antes de expor o formulário publicamente.

---

### Pitfall 2: Mutation tentando chamar API externa de moderação (ou WhatsApp) diretamente

**What goes wrong:**
Mutations no Convex são deterministas e **não podem fazer `fetch`**. Um dev que tenta chamar uma API de moderação de imagem (ex.: Rekognition/Imagga) ou qualquer serviço externo dentro da mutation que salva a foto vai bater num erro de runtime ou, pior, será silenciosamente ignorado dependendo de como o código foi estruturado.

**Why it happens:**
Vem de hábito de outros backends (Node/Express) onde a mesma função handler faz tudo. No Convex, IO externo é privilégio de **actions**.

**How to avoid:**
Padrão recomendado: a mutation grava o registro `pendente` e agenda uma **action** via `ctx.scheduler.runAfter(0, internal.moderation.checar, {...})`; a action chama o serviço externo (ou apenas prepara para moderação humana) e depois roda outra mutation para atualizar o status. Isso também vale para qualquer futura integração (ex.: notificação via WhatsApp Business API).

**Warning signs:**
Erro `fetch is not defined` (ou similar) só em produção/mutation, nunca visto localmente em testes que chamam a action diretamente.

**Phase to address:** Fase de moderação (schema `posts`/`fotos` + fila de moderação no dashboard).

---

### Pitfall 3: Nunca torne "moderação" opcional — sem ela, uma foto imprópria fica pública instantaneamente [herdado, generalizado]

**What goes wrong:**
Sem login, qualquer pessoa com o link pode enviar qualquer imagem. Se o fluxo publica automaticamente (ou se o toggle "auto-publish" fica ligado por padrão), uma foto ofensiva/spam fica visível no mural/álbum público até alguém notar e remover manualmente.

**Why it happens:**
Moderação automática (com API de IA) parece "resolver" o problema, mas nenhum serviço automatizado é 100% confiável — o projeto antigo já reconhecia isso: menções públicas (equivalente a "conteúdo de fonte não confiável") **sempre** caíam em fila de moderação, mesmo com automação para o conteúdo confiável (feed próprio).

**How to avoid:**
- Todo conteúdo enviado por convidado nasce com `status: pendente`.
- Nenhum toggle de "publicar automaticamente" para conteúdo de convidado no v1 (mesmo que exista para outras fontes no futuro).
- Dashboard precisa ter fila de moderação como página central, não um extra.

**Warning signs:**
Qualquer especificação que diga "foto aparece no mural assim que enviada".

**Phase to address:** Fase de mural/upload — moderação é requisito de v1, não polimento.

---

### Pitfall 4: RSVP sem login permite duplicidade e "personificação" — não existe verdade única sem reconciliação manual

**What goes wrong:**
Como não há autenticação, qualquer pessoa pode digitar qualquer telefone/nome e confirmar (ou desconfirmar) presença "por" outra pessoa. Além disso, o mesmo convidado pode confirmar duas vezes com o telefone formatado de dois jeitos diferentes (com/sem `+55`, com/sem o nono dígito), gerando duas linhas em vez de uma atualização.

**Why it happens:**
RSVP público por natureza não tem verificação de identidade; e telefone brasileiro tem múltiplas representações válidas (ver Pitfall 5) que, se não normalizadas antes de gravar, quebram qualquer tentativa de "upsert por telefone".

**How to avoid:**
- Definir **uma função de normalização canônica** de telefone (ver Pitfall 5) e usá-la **sempre** antes de gravar ou consultar — nunca comparar strings brutas.
- Usar essa forma canônica como chave de índice único (`by_phone`) para fazer upsert (Convex não tem `UNIQUE` de schema como SQL — a unicidade tem que ser garantida na lógica da mutation: `query().withIndex("by_phone", q => q.eq("phone", canon)).unique()` antes de inserir).
- Aceitar que a confiabilidade final depende do dashboard: os donos precisam poder editar/mesclar/corrigir RSVPs manualmente — é a rede de segurança, não a exceção.

**Warning signs:**
Lista de convidados com o "mesmo" nome aparecendo duas vezes com telefones visualmente parecidos.

**Phase to address:** Fase de schema/RSVP (definir a função de normalização antes de escrever a mutation de RSVP) + Fase de dashboard (edição/merge manual).

---

### Pitfall 5: Normalização de telefone brasileiro é mais complicada do que parece (nono dígito inconsistente)

**What goes wrong:**
Números móveis brasileiros usam `+55` + DDD (2 dígitos) + 9 dígitos (desde a inclusão do "nono dígito" em 2010). Mas o WhatsApp historicamente registrou IDs de contato com o formato **antigo de 8 dígitos** para DDDs que já tinham conta antes da mudança (principalmente 11-19 SP, 21/22/24 RJ, 27/28 ES), enquanto outros DDDs já usam consistentemente 9 dígitos. Se a normalização assumir "sempre adicionar o 9", vai gerar um número que não bate com o WhatsApp real de parte dos convidados desses DDDs — o link `wa.me` (se algum dia usado com o telefone do convidado, não só do vendedor) ou a conferência de duplicidade falha silenciosamente.

**Why it happens:**
Confiança "regra simples de país" (E.164 genérico) sem tratar a exceção real do mercado brasileiro/WhatsApp.

**How to avoid:**
- Para RSVP (não precisa necessariamente abrir wa.me com o telefone do convidado — o wa.me deste projeto é para o **vendedor de vinho**, não para o convidado), a normalização só precisa ser **estável e determinística**, não perfeitamente "correta" pro WhatsApp: escolher uma forma canônica (ex.: sempre `+55DDD` + 9 dígitos, preenchendo o 9 quando ausente e o número tiver 8 dígitos) e aplicá-la de forma consistente na entrada.
- Validar client-side com `inputmode="tel"` + máscara (DDD + 8 ou 9 dígitos), mas normalizar no backend antes de persistir — nunca confiar só na máscara do client.
- Documentar a regra escolhida no código (um único módulo `normalizePhone`), porque é o tipo de lógica que se reimplementada em dois lugares diverge silenciosamente.

**Warning signs:**
Qualquer lugar do código que faça `phone.replace(/\D/g, "")` sem mais nada e trate isso como chave única.

**Phase to address:** Fase de schema/RSVP — implementar e testar `normalizePhone` antes de qualquer mutation que dependa dele.

---

### Pitfall 6: Convite com múltiplas pessoas tratado como uma linha só (perde granularidade do RSVP por pessoa) [herdado]

**What goes wrong:**
Um "convite" no contexto desta festa frequentemente representa uma família/casal (2-4 pessoas). Se o schema modelar isso como uma única linha "confirmado: sim/não" por telefone, perde-se a capacidade de "3 de 4 confirmaram" — informação que o dashboard precisa mostrar e que os donos claramente querem (o projeto anterior já tinha `invite_guests` como entidade separada com confirmação por pessoa).

**Why it happens:**
Parece mais simples achatar em uma tabela `rsvps` (telefone → sim/não), mas isso não sobrevive ao caso comum "vou eu e meu marido, mas meu filho não vai".

**How to avoid:**
Modelar como duas tabelas relacionadas: `convites` (o "grupo"/família, identificado por telefone principal) e `convidados` (pessoas dentro do convite, cada uma com seu próprio status de confirmação) — mesmo sem login, mesmo sem sessão. É puramente modelagem de dados, não depende de autenticação.

**Warning signs:**
Formulário de RSVP que só pergunta "nome" (singular) e "vai/não vai" (singular) quando o convite é claramente familiar.

**Phase to address:** Fase de schema (design do modelo de dados) — decisão estrutural cara de reverter depois.

---

### Pitfall 7: Deploy do frontend na Vercel sem deploy do backend Convex correspondente

**What goes wrong:**
`npx convex deploy` e o deploy do Next/Vite na Vercel são **duas operações separadas**. É comum alterar uma mutation/schema, testar localmente (que aponta pro dev deployment), dar `git push`, ver o build da Vercel passar (porque o build do frontend não valida contra o schema do Convex de produção) — e a produção continuar rodando as **functions antigas**, causando bugs sutis (campo novo não existe, validação antiga rejeita o payload novo) só em produção.

**Why it happens:**
O build da Vercel compila o frontend; ele não necessariamente dispara o deploy do Convex a menos que o **build command** esteja configurado para isso (`npx convex deploy --cmd 'next build'` ou equivalente), e isso é fácil de esquecer de configurar desde o início.

**How to avoid:**
- Instalar a integração oficial Convex↔Vercel (sincroniza `CONVEX_DEPLOY_KEY` automaticamente para Production e Preview).
- Configurar o **Build Command** da Vercel para envolver `npx convex deploy` (que builda as functions Convex e só então builda o frontend), não deixar como duas pipelines desconectadas.
- Nunca setar manualmente `NEXT_PUBLIC_CONVEX_URL`/`VITE_CONVEX_URL` no painel da Vercel — o `convex deploy` seta isso automaticamente durante o build; setar manualmente é uma fonte clássica de "aponta pro deployment errado".

**Warning signs:**
Bug que só acontece em produção, nunca em dev, relacionado a um campo/mutation alterado recentemente.

**Phase to address:** Fase de setup/deploy (primeira fase, antes de qualquer feature) — configurar a pipeline correta uma vez, não descobrir isso na véspera do evento.

---

### Pitfall 8: Preview deployments do Convex por branch — confundir dado de preview com dado de produção

**What goes wrong:**
Cada branch/PR na Vercel, com a integração Convex, pode gerar seu **próprio deployment Convex** (inferido do nome da branch). Isso é ótimo para testar sem tocar em produção, mas significa que dados de teste digitados num preview **não aparecem** no dashboard de produção — e o inverso: alguém pode achar que está testando "seguro" num preview e na verdade está mexendo no deployment de produção se a env var não foi configurada corretamente.

**Why it happens:**
Convex + Vercel Preview é relativamente novo e a config (`CONVEX_DEPLOY_KEY` de preview vs produção, ambiente "Preview" habilitado com "Custom Prefix" vazio) é fácil de configurar errado uma vez e nunca mais revisitar.

**How to avoid:**
Checar explicitamente, ao configurar a integração, que "Production" e "Preview" estão marcados e o campo de prefixo customizado está vazio. Testar deliberadamente: fazer uma alteração de teste num PR de preview e confirmar que ela aparece no dashboard do Convex de **preview**, não no de produção.

**Warning signs:**
"Sumiu" um RSVP de teste, ou apareceu um RSVP de teste na lista real de convidados perto do evento.

**Phase to address:** Fase de setup/deploy.

---

### Pitfall 9: Deletar um convite/registro no Convex não limpa arquivos de storage (sem cascade) [herdado, adaptado]

**What goes wrong:**
Diferente de SQL com `ON DELETE CASCADE`, o Convex não tem integridade referencial automática nem cascade entre uma linha de tabela e um arquivo em `_storage`. Se um dono apagar um convidado/RSVP no dashboard e a foto associada a ele não for explicitamente apagada com `ctx.storage.delete(storageId)`, o arquivo fica **órfão para sempre** (ocupando storage, sem nenhuma linha apontando pra ele) — o mesmo problema que o projeto Cloudflare já tinha descoberto com R2 (`PHOTOS.delete` inexistente na lógica).

**Why it happens:**
Fácil esquecer que apagar o "dono" de um recurso não apaga o recurso em si — é responsabilidade explícita do código.

**How to avoid:**
Toda mutation de "apagar convite/foto" precisa, explicitamente, buscar os `storageId`s associados e chamar `ctx.storage.delete()` para cada um antes/durante o delete do registro. Nunca assumir cascade implícito.

**Warning signs:**
Uso de storage do Convex crescendo sem explicação aparente enquanto o número de fotos "visíveis" permanece estável ou cai.

**Phase to address:** Fase de dashboard (ações de apagar convite/foto).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|-----------------|-----------------|
| Publicar foto assim que enviada, sem fila de moderação | Menos telas pra construir, feedback imediato pro convidado | Conteúdo impróprio fica público até denúncia manual | Nunca — é requisito de v1, não corte de escopo |
| Guardar telefone "cru" sem normalização e comparar com `===` | Rápido de escrever | Duplicidade de RSVP silenciosa (nono dígito, +55) | Nunca em produção; aceitável só num protótipo descartável |
| Rodar `npx convex deploy` manualmente do laptop em vez de integrar no pipeline da Vercel | Evita configurar a integração agora | Alguém esquece de rodar antes do evento, produção fica desatualizada | Só na fase de setup inicial, antes do primeiro deploy real |
| Downscale de imagem só no servidor (nunca no client) | Um lugar só de lógica | Upload de foto de 8-12MB de celular em rede de evento (3G/4G fraco) trava/demora | Aceitável se o público-alvo tiver Wi-Fi garantido; não é o caso aqui (evento presencial, rede variável) |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|-----------------|-------------------|
| Convex file storage | Tratar `generateUploadUrl()` como se validasse tipo/tamanho | Validar client-side (UX) + `ctx.storage.getMetadata()` pós-upload (segurança real) |
| Convex actions/mutations | Chamar `fetch` dentro de uma mutation (ex.: API de moderação) | Mutation grava `pendente` + `ctx.scheduler.runAfter` agenda uma action pra IO externo |
| WhatsApp `wa.me` | Colocar `+`, espaços, hífens ou zero à esquerda no número | Só dígitos, formato internacional puro: `55DDDNNNNNNNNN` |
| WhatsApp `wa.me` | Não fazer URL-encode da mensagem pré-preenchida (`?text=`) | `encodeURIComponent` na mensagem; espaço=`%20`, quebra de linha=`%0A` |
| Vercel + Convex | Setar `NEXT_PUBLIC_CONVEX_URL` manualmente no painel da Vercel | Deixar a integração oficial e o `convex deploy` setarem automaticamente |
| Vercel + Convex | Rodar só `next build`/`vite build` no Build Command, sem `convex deploy` | Build Command envolvendo `npx convex deploy --cmd '<build do frontend>'` |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|-----------------|
| `.collect()` sem índice numa tabela de posts/fotos crescente | Query de listagem do mural fica mais lenta a cada dia que passa perto do evento | Sempre `.withIndex()` + `.take(n)`/`.paginate()`, nunca `.collect()` sem filtro de índice | Perceptível já com poucas centenas de linhas (a escala típica desta festa, então é um risco real, não hipotético) |
| Dashboard assinando uma `useQuery` por convidado individual (loop de subscriptions) em vez de uma query só retornando a lista | Muitas subscriptions ativas, dashboard "pesado"/lento ao vivo | Uma única query indexada retornando todos os convidados/RSVPs de uma vez; filtrar/agrupar no client | Com dezenas de convidados já é perceptível; nunca é "baixo risco" aqui |
| Galeria pública carregando imagens em resolução original (foto de celular = 3-4MB, 4000x3000px) | Página do mural lenta/pesada no 4G do celular do convidado | Downscale no client antes do upload (canvas resize, ex.: max 1600px de lado) +, se possível, gerar/servir uma versão menor pra grade da galeria | Perceptível já a partir de ~20-30 fotos carregadas na mesma tela |
| Foto HEIC (padrão do iPhone) enviada sem conversão | Foto "quebrada" (não renderiza) em navegadores/dispositivos que não suportam HEIC nativamente | Converter para JPEG/WebP no client antes do upload (a maioria dos browsers em iOS já entrega JPEG via `<input type=file accept="image/*">`, mas não é garantido em 100% dos fluxos — testar explicitamente no Safari iOS) | Acontece já no primeiro convidado que usa um fluxo de compartilhamento que preserva o HEIC original |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Confiar em `Content-Type`/extensão declarados pelo client como validação de tipo de arquivo | Upload de arquivo malicioso disfarçado de imagem | Checar magic bytes / `contentType` retornado por `ctx.storage.getMetadata()` no backend; restringir a tipos raster (jpeg/png/webp), nunca aceitar SVG de usuário público (SVG pode conter script embutido) |
| RSVP e upload sem nenhum rate limit (sem login = sem fricção natural contra bots/spam) | Flood de RSVPs falsos ou fotos-spam derruba a curadoria manual e polui o dashboard | Usar o componente oficial `@convex-dev/rate-limiter` (fixed window/token bucket) por IP/telefone nas mutations públicas de RSVP e upload |
| Senha única dos donos comparada com `===` simples em vez de comparação segura, ou exposta em algum retorno de query pública | Vazamento/leak acidental da senha em payload de resposta | Senha só como env var/secret do Convex (`npx convex env set`), nunca em tabela; nunca retornar o valor em nenhuma query — só um booleano de "está setada" se precisar mostrar algo no admin |
| Link `wa.me` construído com nome/telefone do convidado interpolado sem sanitização na URL | Baixo risco de injeção prática (WhatsApp não executa HTML), mas pode quebrar o link se o texto tiver caracteres especiais não escapados | Sempre `encodeURIComponent` no parâmetro `?text=`, mesmo que o texto seja "fixo" hoje |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-------------------|
| Upload mostra "enviado!" imediatamente após o POST, sem deixar claro que ainda depende de moderação | Convidado acha que a foto já está publicada e fica confuso ao não vê-la no álbum | Mensagem explícita: "recebemos sua foto, ela aparece no álbum após aprovação" |
| Botão "Presentear pelo WhatsApp" testado só no desktop Chrome | Quebra silenciosamente quando o convidado abre o link de dentro do WebView do Instagram/Facebook (comum se o link circular por bio/stories) | Testar explicitamente em: Safari iOS, Chrome Android, e dentro de um WebView embutido (abrir o link a partir de um app tipo Instagram); usar `<a href>` simples, não navegação interceptada por JS |
| Countdown calculado com `new Date("2026-10-17T16:00:00")` sem offset de fuso | Convidado fora de Aracaju/SE (fuso diferente do navegador) vê contagem errada, pois o JS interpreta a string sem `Z`/offset como horário **local do navegador**, não America/Sao_Paulo | Sempre construir a data do evento com offset explícito (`2026-10-17T16:00:00-03:00`) ou usar uma lib de timezone (date-fns-tz/Luxon) — a data do evento é fixa em America/Sao_Paulo independente de onde o convidado está lendo |
| Formulário de telefone sem `inputmode="tel"`/máscara | Teclado numérico não aparece automaticamente no celular, digitação lenta e sujeita a erro | `inputmode="tel"` + máscara visual (DDD) + normalização no submit, não só na exibição |
| Interações que dependem de `:hover` (tooltip, preview) | Maioria dos convidados está no celular — hover não existe em touch | Desenhar toda interação crítica para tap, não hover; hover é enhancement opcional pra desktop |

## "Looks Done But Isn't" Checklist

- [ ] **RSVP:** Parece completo, mas verificar se telefone é normalizado (DDD + nono dígito) *antes* de checar duplicidade — testar enviando o mesmo convidado duas vezes com formatos diferentes (`5579999999999` vs `557999999999` vs `(79) 99999-9999`).
- [ ] **Upload de foto:** Parece completo, mas verificar se existe checagem pós-upload de tipo/tamanho (`ctx.storage.getMetadata`) e se arquivos rejeitados/apagados de convites removidos são de fato deletados do storage (`ctx.storage.delete`), não só desvinculados.
- [ ] **Botão "Presentear pelo WhatsApp":** Parece completo, mas verificar se o texto pré-preenchido está com `encodeURIComponent` e se o link foi testado dentro de um WebView (Instagram/Facebook in-app browser), não só no navegador padrão.
- [ ] **Countdown/data do evento:** Parece completo, mas verificar se a data é construída com offset de fuso explícito (`-03:00`), testando com o relógio do dispositivo de teste em outro fuso.
- [ ] **Deploy Vercel + Convex:** Parece completo após o primeiro `git push` funcionar, mas verificar se o Build Command da Vercel realmente inclui `npx convex deploy` (não só o build do frontend) e se as env vars de Preview vs Production estão corretamente separadas.
- [ ] **Moderação:** Parece completo com a fila existindo, mas verificar se não há nenhum caminho (toggle, default de schema) que publique conteúdo de convidado automaticamente sem passar pela fila.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|-----------------|
| RSVP duplicado por telefone mal normalizado | LOW | Rodar a normalização canônica sobre os dados existentes, mesclar linhas duplicadas manualmente via dashboard (poucas dezenas de convidados, viável à mão) |
| Arquivo órfão em storage (convite apagado sem apagar foto) | LOW | Convex dashboard permite listar arquivos de storage; script pontual de limpeza comparando `_storage` com IDs ainda referenciados |
| Deploy do frontend sem deploy do backend (schema dessincronizado) | MEDIUM | Rodar `npx convex deploy` manualmente assim que percebido; adicionar o passo ao Build Command pra não repetir |
| wa.me quebrando em WebView específico | LOW | Trocar o elemento por um `<a>` puro sem interceptação JS; adicionar fallback textual "copie o número: +55..." caso o link falhe |
| Conteúdo impróprio publicado por falha de moderação | MEDIUM | Dashboard precisa permitir despublicar (`status: escondido`) instantaneamente — recovery rápido depende de essa ação já existir antes do evento, não ser correção emergencial |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|-------------------|----------------|
| Upload sem validação pós-POST (Pitfall 1) | Fase de schema + mutations de foto | Testar upload de arquivo grande/tipo errado e confirmar rejeição/limpeza |
| Mutation chamando IO externo diretamente (Pitfall 2) | Fase de moderação (fila + integração externa, se houver) | Revisão de código: nenhuma mutation pública faz `fetch` |
| Moderação opcional/auto-publish (Pitfall 3) | Fase de mural/upload | Confirmar que todo post de convidado nasce `pendente` no schema |
| RSVP duplicado/personificação (Pitfall 4) | Fase de schema/RSVP | Teste manual: mesmo convidado, dois formatos de telefone, upsert correto |
| Normalização de telefone BR (Pitfall 5) | Fase de schema/RSVP (antes de qualquer mutation depender disso) | Unit test do módulo `normalizePhone` com casos de DDD com/sem nono dígito |
| Convite multi-pessoa achatado (Pitfall 6) | Fase de schema (design do modelo de dados) | Revisão de schema: existe entidade separada convite↔convidados |
| Deploy Vercel sem deploy Convex (Pitfall 7) | Fase de setup/deploy (primeira fase) | Build Command inclui `npx convex deploy`; testar com uma mudança de schema real |
| Preview vs produção Convex confundidos (Pitfall 8) | Fase de setup/deploy | Confirmar dado de teste em PR aparece só no Convex de preview, nunca em produção |
| Arquivo órfão sem cascade (Pitfall 9) | Fase de dashboard (ações de apagar) | Toda mutation de delete de convite/foto chama `ctx.storage.delete` explicitamente |

## Sources

- Convex — Production > State > Limits (execução, agendamento): https://docs.convex.dev/production/state/limits (via Context7, MEDIUM)
- Convex — Argument validation, file storage upload/delete, schema/index best practices: https://docs.convex.dev/file-storage/upload-files, https://docs.convex.dev/file-storage/delete-files, https://docs.convex.dev/understanding/best-practices, https://docs.convex.dev/using/indexes (via Context7, MEDIUM)
- Convex — Rate Limiter component e padrão mutation→scheduler→action para IO externo: https://docs.convex.dev/agents/rate-limiting, https://convex.dev/components/retrier (via Context7, MEDIUM)
- Convex + Vercel — deploy keys, preview deployments, env vars: https://docs.convex.dev/production/hosting/vercel, https://docs.convex.dev/production/hosting/preview-deployments, https://docs.convex.dev/cli/deploy-key-types (via web search, MEDIUM)
- wa.me — formato de número e encoding de texto: mssg.to/blog/wa-me-link-format, qualimero.com/en/blog/whatsapp-link (via web search, MEDIUM)
- wa.me em WebView (Android 11/12, in-app browsers): github.com/react-native-webview/react-native-webview issue #2453, faq.whatsapp.com (via web search, MEDIUM)
- Normalização de telefone brasileiro / nono dígito / inconsistência WhatsApp: support.gupshup.io artigo sobre dígito '9', wassenger.com/blog (via web search, MEDIUM)
- Boas práticas de moderação de upload público: guias.codepath.com/websecurity/File-Upload-Abuse, evolink.ai/blog/image-moderation-api-guide (via web search, MEDIUM)
- `/Users/allanmesquitabrito/Documents/Site Sol 40 anos/sol-40-integrado/design.md` — projeto anterior (Cloudflare); lições conceituais herdadas: necessidade de moderação obrigatória para conteúdo de fonte não confiável, invariante de não deletar em cascata destruindo conteúdo já publicado/arquivo de storage, segredos só em ambiente nunca em tabela (HIGH, fonte primária do próprio projeto)

---
*Pitfalls research for: Convex + React/Tailwind + Vercel — site de convite/RSVP/mural/presente para evento único*
*Researched: 2026-07-23*
