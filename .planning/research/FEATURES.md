# Feature Research

**Domínio:** Site de convite + RSVP de evento (aniversário de 40 anos, no molde de site de casamento — referências: casei, The Knot, Zola, Joy, WedSites, RSVPify, digital guestbooks de casamento)
**Pesquisado:** 2026-07-23
**Confiança:** MEDIUM-HIGH (múltiplas fontes de vendors do setor de casamento convergem nos mesmos padrões; nenhuma fonte acadêmica/dados de uso real de produto, mas o consenso entre concorrentes independentes é forte)

## Feature Landscape

### Table Stakes (o convidado espera isto)

Funcionalidades que, se faltarem, fazem o site parecer quebrado ou amador — independente do evento ser casamento ou aniversário.

| Feature | Por que é esperado | Complexidade | Notas |
|---------|--------------|------------|-------|
| RSVP sem login, por nome/telefone | Padrão universal do setor: convidado abre um link, digita nome/telefone e confirma — nenhuma plataforma (Zola, Joy, WedSites, RSVPify) exige conta de convidado | MEDIUM | Precisa de lógica de "match" (achar convidado existente por telefone) e permitir múltiplas pessoas por convite/família no mesmo envio |
| Confirmar "vai/não vai" em 1 ação | Toda referência trata isso como o núcleo do formulário; taxa de conclusão cai se o formulário for longo | LOW | Já no escopo v1 |
| Editar/atualizar resposta já enviada | Zola/RSVPify e o próprio WordPress "Wedding Party RSVP" citam edição pós-envio como esperado — convidado muda de ideia ou digitou errado | MEDIUM | Requer buscar registro existente por telefone antes de criar um novo (evita duplicidade de RSVP) |
| Mobile-first / carregamento rápido | "Muitos convidados acessam pelo celular" é citado em toda fonte pesquisada; RSVP mal otimizado para mobile é o erro nº1 apontado | LOW | Já é requisito do projeto (Tailwind responsivo) |
| Formulário curto (poucos campos) | Fonte cita: quanto mais curto o formulário, maior a taxa de conclusão; limitar perguntas extras a no máximo 2 | LOW | Reforça a decisão do projeto de manter o RSVP simples (nome/telefone + vai/não vai, sem infinitas perguntas extras) |
| Lista de presentes com indicador de "já escolhido" | Todo guia de registry (Zola, MyRegistry) trata isso como básico — evita presente duplicado | LOW–MEDIUM | No v1 o "já escolhido" é manual (dono marca no dashboard), não automático — ver seção de presentes abaixo |
| Mural com moderação antes de publicar | Guestbooks digitais modernos (GuestCam, Wedibox, Kululu) todos oferecem fila de aprovação antes de exibir — é considerado padrão mínimo, não diferencial | MEDIUM | Sem isso, conteúdo indevido pode ir ao ar sem controle |
| Dashboard com contagem/lista ao vivo | "Guest dashboard" com respostas em tempo real substituindo planilha é citado como a razão de existir dessas plataformas | MEDIUM–HIGH | Convex resolve isso nativamente via reatividade — vantagem de stack |
| Detalhes estáticos do evento (mapa, dress code, programa) | Presente em 100% das referências analisadas | LOW | Já no escopo v1 |

### Diferenciais (vantagem competitiva para este projeto)

Não são esperados por padrão de mercado, mas alinhados ao Core Value do projeto (zero atrito para o convidado, zero trabalho manual pros donos).

| Feature | Proposta de valor | Complexidade | Notas |
|---------|-------------------|------------|-------|
| Presente = redirect para WhatsApp (`wa.me` com mensagem pronta por vinho) | Nenhum site de casamento pesquisado faz isso — todos usam checkout próprio ou registry universal com sync de 24-48h. Redirecionar para o vendedor real elimina processamento de pagamento, taxas, PCI, e ainda funciona perfeitamente para o caso "presente é vinho de uma vinícola/vendedor específico" | LOW–MEDIUM | Depende só do catálogo de vinhos (`lib/wines.ts`) já existente + template de mensagem por vinho |
| Dashboard reativo sem refresh (Convex) | Fontes de mercado descrevem dashboards que "atualizam" mas em polling/refresh manual; ter contagem/mural/presentes atualizando ao vivo sem F5 é acima do padrão observado | MEDIUM | Vantagem direta da escolha de stack (Convex), não exige esforço extra de UX |
| Identidade visual autoral ("hora dourada / pôr do sol") | Diferenciação citada nas fontes como onde vale investir — evitar "parecer template genérico" é apontado repetidamente como erro a evitar, logo ter uma identidade forte é o oposto (diferencial) | LOW (já pronta, herdada do projeto anterior) | Não é feature de código, é decisão de design já tomada |
| Toggle manual simples de "presenteado" (sem reserva/expiração) | Resolve o mesmo problema que os grandes registries resolvem com timers de 24-48h e sincronização complexa — mas numa escala de dezenas/poucas centenas de convidados, um toggle manual no dashboard é suficiente e muito mais simples de construir e operar | LOW | Ver Anti-Features: por que não replicar o modelo de reserva com expiração |

### Anti-Features (parecem boas ideias, mas geram complexidade desnecessária)

| Feature | Por que parece atraente | Por que é problemática | Alternativa |
|---------|---------------|-----------------|-------------|
| Telão / slideshow ao vivo no dia do evento | Guestbooks digitais premium (Wedibox, GuestSnap) anunciam isso como o "uau" da experiência | Fontes confirmam que exige: laptop/tablet + tela conectada, Wi-Fi ou sinal celular forte confirmado previamente no local, e ainda depende de fluxo "app-first" que cria fricção para convidados mais velhos ou com dados limitados. É ponto único de falha no dia do evento — se a internet do salão falhar, quebra na frente de todo mundo | Manter mural assíncrono com moderação (já no v1); telão fica pra v2 com teste de conectividade do local antes |
| Integração automática com Instagram (Apify/hashtag) | Capturar posts com a hashtag do evento parece "grátis" e viral | Não permite pré-moderação antes de aparecer (ou exige camada extra de aprovação), depende de scraping de terceiro sujeito a custo e quebra de API, e teria que rodar em paralelo à moderação do mural — duplica a lógica de aprovação sem necessidade no v1 | Mural próprio com upload direto + moderação (já decidido); Instagram fica de fato para v2 |
| Reserva de presente com expiração de 48h + teto anônimo | Espelha o padrão dos grandes registries universais (Zola, MyRegistry), que sofrem com sync de 24-48h e "double gifting" em escala de centenas de convidados de múltiplas fontes | Para este projeto a "compra" nem acontece no site — é 100% externa via WhatsApp com o vendedor. Um sistema de reserva com expiração resolveria um problema de concorrência que não existe aqui (não há checkout, não há dois convidados clicando "comprar" ao mesmo tempo no mesmo servidor) | Toggle manual "presenteado" no dashboard, atualizado pelos donos quando o vendedor confirma a venda — mesmo padrão que os próprios registries recomendam como fallback ("peça ao convidado pra marcar como comprado") |
| Login individual de convidado com sessão nomeada | Parece "mais seguro" ou "mais profissional" | Toda fonte de UX de RSVP do setor reforça o oposto: pedir conta/login é o principal ponto de fricção citado, reduzindo taxa de conclusão — especialmente para convidados menos tecnológicos. Nenhuma plataforma de casamento pesquisada exige login de convidado | RSVP público por nome/telefone, sem conta — já decidido no projeto |
| Auth de dois níveis (dono + moderadora, senha + código colável) | Faz sentido em plataformas SaaS que atendem múltiplos casais/eventos simultâneos com equipes | Para 2 donos gerenciando 1 evento único, isso é overhead de modelagem de permissões sem ganho real — nenhuma fonte de "site de casamento pessoal" (como oposto a SaaS B2B) usa múltiplos níveis de auth | Senha única compartilhada entre os 2 donos (já decidido) |
| QR code nas mesas linkando para upload ao vivo | Citado nas fontes como forma de aumentar participação no telão | Depende inteiramente do telão existir (ver acima) — sem slideshow ao vivo, o QR nas mesas perde a maior parte do valor (só serviria como atalho pro mural, que já é acessível pelo link principal) | Adiar para v2 junto com o telão |
| Checkout/pagamento de vinho no próprio site | Pareceria "mais completo" e reduziria um passo do convidado | Complexidade de conformidade (PCI/pagamentos), responsabilidade legal sobre a venda e sobre estoque não fazem sentido quando a venda já é de um vendedor terceiro ("Mistral") que tem seu próprio canal — o site não é loja | Botão de redirect para WhatsApp com mensagem pronta (já decidido) |
| Perguntas extras no RSVP (restrição alimentar, comentários livres, categorias de convidado, etc. além do essencial) | Parece útil "já que estamos construindo o formulário" | Fonte do setor é explícita: mais de 2 perguntas extras derruba a taxa de conclusão do formulário | Manter RSVP mínimo: nome(s) + telefone + vai/não vai. Qualquer campo extra deve ter justificativa forte antes de entrar no v1 |

## Feature Dependencies

```
RSVP público (nome/telefone, vai/não vai)
    └──requires──> Modelo de dados "convidado/família" com busca por telefone
                       └──requires──> Lógica de "encontrar registro existente" (evita duplicar RSVP ao reabrir o link)
                       └──enables──> Lista de RSVP no dashboard + contagem ao vivo

Carta de vinhos + botão "Presentear pelo WhatsApp"
    └──requires──> Catálogo de vinhos (lib/wines.ts, já existe)
    └──requires──> Template de mensagem wa.me por vinho
    └──enables──> Toggle "presenteado" no dashboard
                       └──requires──> Auth do dashboard (senha única dos donos)

Mural de memórias (foto + recado)
    └──requires──> Upload de arquivo (Convex file storage)
    └──requires──> Fila de moderação no dashboard
                       └──requires──> Auth do dashboard
    └──enables──> Galeria pública (só itens aprovados)

Dashboard interno (contagem ao vivo, RSVP, moderação, presentes)
    └──requires──> Auth do dashboard (senha única)
    └──requires──> Reatividade do Convex (contagem/lista atualizam sem refresh)

Telão / slideshow ao vivo (v2, fora do escopo v1)
    └──requires──> Mural + moderação (v1) já funcionando
    └──requires──> Teste de conectividade Wi-Fi/4G do local do evento
    └──conflicts com──> Simplicidade do v1 (ponto único de falha no dia do evento)

Integração Instagram/Apify (v2, fora do escopo v1)
    └──requires──> Camada extra de moderação paralela ao mural
    └──conflicts com──> Fluxo único de moderação já decidido para o mural
```

### Notas de dependência

- **RSVP requer modelo de "convidado/família" com busca por telefone:** sem isso, reabrir o link de RSVP sempre criaria um registro novo em vez de permitir edição — quebra a expectativa (table stakes) de "editar resposta já enviada".
- **Toggle "presenteado" requer auth do dashboard:** é ação exclusiva dos donos (baseada na confirmação externa do vendedor via WhatsApp), não algo que o convidado ou o sistema resolve sozinho — por isso não precisa (e não deve) de lógica de reserva/expiração.
- **Mural requer fila de moderação antes de galeria pública:** a exibição pública só deve renderizar itens com status "aprovado"; isso é dependência direta, não opcional, dado o requisito de moderação do projeto.
- **Telão (v2) requer que o mural (v1) já esteja maduro:** o schema de fotos/recados do v1 deve ser desenhado pensando em ser consumido por um slideshow futuro (conforme já decidido no PROJECT.md), mas a funcionalidade de exibição ao vivo em si só deve entrar depois de validar conectividade do local — não é algo para resolver no v1.
- **QR das mesas conflita com adiamento do telão:** construir QR sem o telão perde a maior parte do valor: adiar os dois juntos é consistente.

## MVP Definition

### Lançar com isto (v1 — já validado pelo escopo do PROJECT.md)

- [ ] Convite público (hero, countdown, programa, dress code, mapa, guia) — essencial para dar contexto e reduzir dúvidas por WhatsApp
- [ ] RSVP público por telefone/nome, vai/não vai, sem login — essencial: é o core value do projeto ("uma confirmação sempre chega ao dashboard")
- [ ] Carta de vinhos com botão "Presentear pelo WhatsApp" + toggle manual "presenteado" no dashboard — essencial: resolve duplicidade sem exigir checkout
- [ ] Mural com upload de foto+recado e moderação antes de publicar — essencial: proteção de conteúdo é inegociável para um mural público
- [ ] Dashboard com contagem ao vivo, lista de RSVP, fila de moderação, controle de presentes — essencial: é onde o valor de "consolidado e ao vivo, sem trabalho manual" se realiza

### Adicionar depois de validado (v1.x, ainda dentro do v1 se sobrar tempo antes do evento)

- [ ] Lembrete de prazo de RSVP (banner ou destaque visual conforme a data se aproxima) — gatilho: perto do prazo (~30/09), poucos RSVPs registrados
- [ ] Exportar/copiar lista de convidados do dashboard (CSV ou visualização para compartilhar com o buffet/salão) — gatilho: necessidade prática de repassar número final para o Matapuã Eventos

### Deixar para depois (v2+, já formalmente fora do escopo v1)

- [ ] Telão / slideshow ao vivo — depende de teste de conectividade do local; ponto único de falha no dia do evento
- [ ] Integração Instagram (Apify) — custo e complexidade externos não justificados ainda
- [ ] QR code nas mesas — só faz sentido junto com o telão
- [ ] Reserva de presente com expiração de 48h — resolve um problema de concorrência de checkout que não existe aqui (venda é externa)
- [ ] Login/conta individual de convidado — nenhuma referência do setor recomenda para evento de uma noite

## Feature Prioritization Matrix

| Feature | Valor p/ usuário | Custo de implementação | Prioridade |
|---------|------------|---------------------|----------|
| RSVP público (nome/telefone, vai/não vai) | HIGH | MEDIUM | P1 |
| Convite público (seções estáticas) | HIGH | LOW | P1 |
| Carta de vinhos + WhatsApp redirect | HIGH | LOW–MEDIUM | P1 |
| Toggle "presenteado" no dashboard | HIGH | LOW | P1 |
| Mural com upload + moderação | HIGH | MEDIUM | P1 |
| Dashboard (contagem, RSVP, moderação, presentes) | HIGH | MEDIUM–HIGH | P1 |
| Editar RSVP já enviado (buscar por telefone) | MEDIUM | MEDIUM | P1 (parte do RSVP, não opcional) |
| Lembrete de prazo de RSVP | MEDIUM | LOW | P2 |
| Exportar lista de convidados (CSV) | MEDIUM | LOW | P2 |
| Telão / slideshow ao vivo | MEDIUM (alto risco no dia) | HIGH | P3 (v2) |
| Integração Instagram/Apify | LOW–MEDIUM | HIGH | P3 (v2) |
| QR code nas mesas | LOW (sem telão) | LOW | P3 (v2) |
| Reserva de presente com expiração | LOW (resolve problema inexistente aqui) | HIGH | Não fazer |
| Checkout de vinho no site | LOW (fora do modelo de negócio) | HIGH | Não fazer |
| Login individual de convidado | LOW (fricção, sem benefício) | MEDIUM | Não fazer |

**Chave de prioridade:**
- P1: obrigatório para o v1 (evento em 17/10/2026)
- P2: desejável, adicionar se sobrar tempo antes do evento
- P3: v2, formalmente fora do escopo atual

## Competitor Feature Analysis

| Feature | Zola / Joy / The Knot (casamento, grande escala) | GuestCam / Wedibox / Kululu (guestbook digital) | Nossa abordagem (Sol 40) |
|---------|--------------|--------------|--------------|
| RSVP | Login opcional, múltiplos eventos, perguntas customizadas ilimitadas, integra com convite impresso via QR | N/A (foco só em fotos) | RSVP público mínimo — nome/telefone + vai/não vai, sem múltiplos eventos nem perguntas extras (escala de 1 festa, não casamento multi-dia) |
| Presentes | Registry universal com sync entre lojas a cada 24-48h, checkout próprio ou de parceiros | N/A | Sem registry — catálogo de vinhos fixo com redirect ao WhatsApp de um vendedor único; toggle manual substitui sync automático |
| Mural/fotos | Álbum simples, às vezes sem moderação obrigatória | Moderação + fila de aprovação + opção de slideshow ao vivo via QR nas mesas | Moderação obrigatória antes de publicar (igual ao padrão dos guestbooks dedicados), slideshow adiado para v2 |
| Dashboard | Painel robusto multi-evento, exportação, integração com fornecedores (buffet, catering) | Painel de aprovação de mídia + convidar colaboradores | Painel único (contagem ao vivo, RSVP, moderação, presentes) — mais enxuto que o de casamento porque é evento único, não plataforma multi-cliente |
| Auth | Conta de casal + equipe de colaboradores com permissões | Conta de host + convite de colaboradores | Senha única compartilhada entre os 2 donos — suficiente na escala de "2 pessoas, 1 evento" |

## Sources

- [RSVPify — Wedding RSVP Tips for the Tech-Challenged Guest](https://rsvpify.com/wedding-rsvp-tips-for-the-tech-challenged-guest/)
- [Joy — Free Online RSVP for Weddings](https://withjoy.com/online-rsvp/)
- [Bliss & Bone — Wedding Website RSVP: Setup, Etiquette & Tracking Guide](https://blissandbone.com/resources/rsvp-wedding-websites)
- [Hitchd — RSVP Website Free of Drama](https://www.hitchd.com/blog/rsvp-website-free)
- [WedSites — Online Wedding RSVPs](https://wedsites.com/online-rsvps)
- [WedSites — Features](https://wedsites.com/features)
- [They Said Yes — How to Manage Wedding RSVPs Online](https://theysaidyes.rsvp/blog/manage-wedding-rsvps-online-guide/)
- [Zola — I have an external gift that keeps getting purchased multiple times](https://www.zola.com/faq/i-have-an-external-gift-that-keeps-getting-purchased-multiple-times-by-my)
- [MyRegistry — A Guest's Guide to Wedding Registries](https://guides.myregistry.com/wedding/a-guests-guide-to-wedding-lists/)
- [MyRegistry Help — Opting Out of Gift Purchased Alerts](https://customercare.myregistry.com/en/support/solutions/articles/48000787674-i-do-not-want-to-know-which-of-my-gifts-were-purchased-what-can-i-do-)
- [ShunBridal — Purchasing Wedding Gifts: Marking Items As Bought](https://shunbridal.com/article/how-to-mark-something-purchased-on-a-wedding-registry)
- [The Knot Community — Deleting gifts from registry as they are purchased](https://forums.theknot.com/discussion/1036744/deleting-gifts-from-registry-as-they-are-purchased)
- [GuestCam — 7 Best Digital Wedding Guest Books](https://guestcam.co/blog/top-digital-wedding-guestbooks)
- [Wedibox — Digital Wedding Guestbook](https://www.wedibox.com/features/digital-guestbook)
- [Kululu — Best Digital Wedding Guest Books](https://www.kululu.com/blog/best-digital-wedding-guest-books)
- [GuestCam — 11 Best Wedding Photo Sharing Sites](https://guestcam.co/blog/best-wedding-photo-sharing-sites)
- [Zola — Best Online Wedding RSVP Tools: A Complete Comparison](https://www.zola.com/expert-advice/best-online-wedding-rsvp-tools)
- [GuestlistOnline — Wedding RSVP Website](https://www.guestlistonline.com/solutions/wedding-rsvp)
- [MySimpleRSVP — Features](https://mysimplersvp.com/features)
- [WedSites Blog — 10 Common Mistakes Couples Make on Their Wedding Website](https://blog.wedsites.com/10-common-mistakes-couples-make-on-their-wedding-website-and-how-to-avoid-them/)
- [Hitchd — Making a Wedding Website: The Biggest Mistakes to Avoid](https://www.hitchd.com/blog/making-a-wedding-website-biggest-mistakes)
- [WordPress — Wedding Party RSVP Plugin](https://wordpress.org/plugins/wedding-party-rsvp/)
- [The Knot — Free wedding guest list with RSVP tracking](https://www.theknot.com/gs/guest-list)
- [RSVPify — Event Guest List Management & Invitee Tracking](https://rsvpify.com/guest-list-management/)
- [WeddingSnap — Live Wedding Photo Slideshow](https://www.weddingsnap.io/blog/live-wedding-photo-slideshow)
- [LiveShareNow — How to Display a Live Guest Photo Slideshow at Your Reception](https://www.livesharenow.com/blog/live-photo-slideshow-reception)
- [Battle Abbey Weddings — The 12 Best Wedding Photo App Options for 2026](https://battleabbeyweddings.com/wedding-photo-app/)

---
*Feature research for: site de convite/RSVP de festa de aniversário (v1 enxuto, aprendendo com o padrão de sites de casamento)*
*Researched: 2026-07-23*
