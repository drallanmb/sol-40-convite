# Phase 07 — Checklist de lançamento

Este registro separa código pronto, ambientes publicados, domínio público e
divulgação do convite. Nenhum campo `pending` representa aprovação. Evidência
não pode conter senha, deploy key, capability, telefone, nome de convidado,
CSV real, conteúdo de backup ou foto privada.

## Identificação do release

| Campo | Valor |
|---|---|
| Commit candidato | `3d7aa1c` |
| Deployment Vercel Preview | `dpl_ESX56bbFXwVLAF6KonicutRm3rzB` |
| Deployment Vercel Production | `dpl_EqoaJyVxbBrcmWHmHegcYRAGFqDS` — release pretendido após drill; no-op compatível do commit saudável |
| Deployment Convex Preview | `wooden-hound-372` |
| Deployment Convex Production | `necessary-coyote-763` |
| URL `.vercel.app` saudável | Preview `sol-40-convite-a22ao6yc7-allans-projects-78f12069.vercel.app`; Production atual `sol-40-convite-8hddb4smi-allans-projects-78f12069.vercel.app` |
| Alvo saudável para rollback | Frontend atual `dpl_EqoaJyVxbBrcmWHmHegcYRAGFqDS` e anterior `dpl_55PBruCBvfwrpN7y6WdGk2JpHKnY`, ambos no commit `3d7aa1c`; Convex `necessary-coyote-763`; backup `20260725T122803Z` |
| Domínio público | `https://www.sol40.com.br` — publicado; não equivale a convite divulgado |
| Link enviado aos convidados | pending — proibido antes do Gate E |

## Classes de evidência

- **repository:** suíte, build, inspeção estática e artefato versionado.
- **emulated:** Playwright Chromium/WebKit e viewport/escala simulados; nunca
  conta como iPhone, Android, WebView, HEIC real ou fuso físico.
- **live:** alvo publicado, DNS, TLS, logs sanitizados ou login funcional.
- **physical:** aparelho e contexto reais, registrados somente em
  `07-DEVICE-MATRIX.md`.

## Gates A–E

| Gate | Escopo | Estado | Executado em | Evidência/identificador | Responsável | Sign-off |
|---|---|---|---|---|---|---|
| A | Repositório: unitários, build, browser/axe, privacidade e `git diff --check` | passou | 2026-07-25 09:17 -03:00 | checkout limpo do commit `3d7aa1c`: 525/525 unitários + 40/40 browser; build e `git diff --check` verdes · repository/emulated | Codex | Codex |
| B | Preview isolado: frontend, Convex distinto, rotas profundas e dados fictícios | passou | 2026-07-25 09:39 -03:00 | Vercel `dpl_ESX56bbFXwVLAF6KonicutRm3rzB`; Convex `wooden-hound-372`; 40/40 browser · live/emulated | Codex + dono | Codex; autorização prévia do dono |
| C | Production `.vercel.app`: commit esperado, Convex production, login e logs | passou | 2026-07-25 09:54 -03:00 | Vercel `dpl_55PBruCBvfwrpN7y6WdGk2JpHKnY`; Convex `necessary-coyote-763`; 40/40 browser + login/logout real + logs sanitizados · live/emulated | Codex + dono | Codex; autorização explícita do dono para uso único do segredo no Chaveiro |
| D | `www` público, HTTPS, apex permanente preservando path/query e smoke pós-propagação | passou | 2026-07-25 10:14 -03:00 | dois resolvedores; TLS autorizado; `www` 200; apex 308; rollback/restore Vercel; 40/40 browser + 528/528 unitários · live/emulated/repository | Codex + dono | Codex; drill restaurado ao release pretendido |
| E | Backup validado, lista real importada/revisada, amostragem RSVP e autorização para divulgar | pending | pending | pending · live/manual | Donos | pending |

## Critérios por gate

### Gate A — repositório

- [x] `npm run test:release` verde no checkout limpo do candidato.
- [x] Nenhuma violação axe A/AA séria ou crítica sem justificativa estreita.
- [x] `/`, `/confirmar`, `/presentes`, `/admin`, `/admin/convidados` e 404
  carregam e sobrevivem a refresh em Chromium e WebKit emulados.
- [x] Pré-auth não monta navegação/DTO protegido nem função de domínio admin.
- [ ] Backstops humanos de teclado, zoom 200%, contraste, conteúdo longo e
  dispositivo permanecem honestamente pendentes quando não executados.

### Gate B — preview

- [x] Preview Vercel aponta para `wooden-hound-372`, distinto de
  desenvolvimento (`judicious-pigeon-504`) e produção
  (`necessary-coyote-763`).
- [x] Nenhum dado foi escrito no smoke: nenhuma lista real foi importada e não
  há fixture fictícia para limpar ou procurar em produção.
- [x] Rotas e refresh carregam no alvo live; RSVP, catálogo/`wa.me`, memória e
  login pré-auth passaram pelos testes live-safe/emulados e unitários, sem
  submissão persistente.
- [x] Resultado, escopo e ausência de correções estão registrados em
  `07-SMOKE.md`.

### Tracer Vercel/Convex do Gate B

- Projeto Vercel: time `allans-projects-78f12069`, projeto
  `prj_YfSVxLCFrUeAm4SNIISwAtMRiXPa`, branch de produção `main`.
- Build: `vercel.json` executou
  `npx convex deploy --cmd 'npm run build'`, publicou `dist` e manteve o
  rewrite SPA. O log sanitizado confirmou injeção de `VITE_CONVEX_URL` pelo
  Convex; não existe valor manual dessa variável no Vercel.
- Ambientes: existem entradas sensíveis manuais chamadas
  `CONVEX_DEPLOY_KEY`, uma somente para Preview e outra somente para
  Production; nenhum valor foi exibido ou registrado. O Preview foi
  reconstruído depois da correção e o log confirmou
  `wooden-hound-372` no projeto Convex correto.
- A autenticação Vercel do projeto foi desativada com confirmação explícita
  para tornar o Preview acessível ao smoke público. A alteração é reversível.
- O Preview anterior `dpl_A1D9bmdwHbQxNAd6v7r25mSpms2X` /
  `prestigious-roadrunner-782` e o primeiro Production
  `dpl_8KU4YX7BFRCeVKg236WjFk1uSsGf` foram rejeitados como não candidatos:
  os logs mostraram o projeto Convex incorreto `convex-crimson-cloud`.
  As entradas Production/Preview incorretas foram removidas antes dos novos
  deployments.

### Backup anterior à primeira mutação em produção

- Export Convex Production `necessary-coyote-763`, incluindo file storage,
  concluído em `2026-07-25 09:28:03 -03:00`.
- Artefato armazenado fora do workspace/repositório; tamanho `3897` bytes.
- SHA-256:
  `65ec820bbd06fcb213cb80784719b76994fb081b0aa87480b5de4fb112d89af1`.
- Conteúdo do ZIP não foi aberto nem copiado para evidência. A primeira
  mutação posterior foi a reconciliação do catálogo público canônico:
  `37` criados, `37` totais e nenhum código inesperado. A repetição
  idempotente retornou `0` criados, `0` atualizados e `37` inalterados;
  `wines:listFeatured` e `wines:listCatalog` passaram em seguida.

### Gate C — produção antes do domínio

- [x] Deployment Vercel corresponde ao commit candidato `3d7aa1c`.
- [x] Bundle do frontend contém somente o alvo público
  `necessary-coyote-763.convex.cloud`, sem alvo Preview.
- [x] `npx convex env list --names-only --prod` contém
  `ADMIN_PASSWORD`, sem imprimir o valor.
- [x] Login e logout reais funcionaram; o segredo foi lido uma única vez do
  Chaveiro e consumido no mesmo processo efêmero, sem argumento, `.env`,
  trace, screenshot, arquivo, Markdown ou saída.
- [x] Logs sanitizados: Vercel sem evento `error`; Convex com login,
  overview, status e logout concluídos. Três falhas anteriores de
  `wines:listFeatured`, ocorridas antes da reconciliação do catálogo, foram
  sucedidas por `listFeatured` e `listCatalog` sem erro; nenhuma falha atual
  de alta severidade ficou aberta.
- [x] URL `.vercel.app`, commit e alvos compostos foram registrados em
  `07-ROLLBACK.md`.

O gate de produção executou 40/40 casos Playwright em Chromium/WebKit
desktop/mobile emulados, 528/528 testes unitários, build, dry-run Convex,
seis rotas HTTP e inspeção estática do bundle. O smoke não realizou escrita.
Os limites permanecem inalterados: login real consumiu somente uma tentativa
válida; RSVP e memória/upload foram auditados pelos contratos recuperáveis
`rate_limited`/`retryAfterSeconds`, sem provocar carga artificial em produção.

### Gate D — domínio

- [x] `https://www.sol40.com.br` retorna 2xx com certificado válido.
- [x] `https://sol40.com.br/<path>?<query>` retorna 301/308 e preserva
  caminho/query ao redirecionar para `www`.
- [x] Canonical, `og:url` e `og:image` usam somente `www`.
- [x] Smoke imediato e smoke pós-propagação estão registrados.
- [x] Domínio pode ficar público mesmo com LAUNCH-01 físico pendente.

### Tracer DNS/Vercel do Gate D imediato

- Inventário anterior sanitizado: `3` registros — apex `MX`, apex `TXT` e
  `_dmarc` `TXT`, todos DNS-only. Não existiam registros web no apex ou
  `www`. Nameservers públicos: somente `ainsley.ns.cloudflare.com` e
  `cody.ns.cloudflare.com`.
- A Vercel adicionou `www.sol40.com.br` à Production e
  `sol40.com.br` como redirect `308` para `www`. A tela autenticada exibiu,
  para ambos, o mesmo CNAME específico do projeto
  `8850c6bbc9daf305.vercel-dns-017.com`, com proxy `Disabled`.
- A Cloudflare recebeu somente dois registros web CNAME: apex e `www`, ambos
  para o alvo exibido e ambos `Somente DNS`. Os três registros anteriores
  permaneceram inalterados por nome/tipo/proxy; nenhum redirect da Cloudflare
  foi criado.
- A Vercel terminou com `Valid Configuration` nos dois hosts. O CNAME do
  apex é achatado pela Cloudflare em respostas A; por isso o verificador
  registra `cloudflare-flattened-cname`, exige respostas A não vazias e
  mantém a igualdade exata do CNAME de `www` com o valor capturado.
- Em `2026-07-25 10:04 -03:00`, o tracer confirmou TLS autorizado em ambos,
  `www` HTTP 200 e apex HTTP 308 para
  `https://www.sol40.com.br/confirmar?origem=smoke`, em um salto, preservando
  caminho e query. Cinco rotas profundas retornaram 200, metadados apontaram
  somente para `www` e 40/40 casos live/emulados passaram, incluindo
  privacidade administrativa pré-auth.

### Pós-propagação e drill do Gate D

- Em `2026-07-25 10:13 -03:00`, os resolvedores `1.1.1.1` e `8.8.8.8`
  retornaram exatamente os nameservers esperados e o CNAME de `www` capturado
  da Vercel. O apex achatado respondeu A não vazio; TLS foi autorizado nos
  dois hosts; `/presentes?origem=rollback` fez um único 308 para `www`,
  preservou caminho/query e terminou em 200.
- Como não havia um segundo frontend Production compatível, a Vercel criou
  antes do drill um redeploy no-op do release saudável:
  `dpl_EqoaJyVxbBrcmWHmHegcYRAGFqDS`, mesmo commit `3d7aa1c` e mesmo Convex
  `necessary-coyote-763`. O candidato passou quatro rotas, inspeção do bundle
  e 40/40 casos live/emulados antes de receber os domínios.
- O Instant Rollback moveu os domínios somente para o release anterior
  `dpl_55PBruCBvfwrpN7y6WdGk2JpHKnY`; as rotas públicas/admin responderam 200.
  `Undo Rollback` promoveu novamente
  `dpl_EqoaJyVxbBrcmWHmHegcYRAGFqDS`, restaurou a atribuição automática e o
  painel confirmou esse deployment como Production.
- Após a restauração, home, RSVP em leitura, 37 links `wa.me` com texto
  preenchido, limite do formulário de memória, privacidade pré-auth e
  login/logout real passaram sem escrita. A execução final fechou com 40/40
  browser, 528/528 unitários, build e `git diff --check`.
- O drill de alias não alterou o deployment Convex, functions/schema, env,
  scheduled work, storage ou linhas. A disponibilidade do commit saudável,
  do nome `ADMIN_PASSWORD` em Production e do backup com checksum foi
  revalidada separadamente; nenhum restore de dados foi executado.

### Gate E — divulgação

- [x] Backup/export de produção foi concluído, baixado fora do repositório e
  revalidado por timestamp/checksum.
- [ ] Lista real foi importada depois do backup.
- [ ] Linhas ignoradas e conflitos foram revisados/corrigidos.
- [ ] Amostragem de famílias, telefones e pessoas foi conferida no `/admin`.
- [ ] Busca e edição RSVP de uma família autorizada funcionaram.
- [ ] Não existe dado de exemplo em produção.
- [ ] Donos guardaram a senha e autorizaram o envio do link.

**Regra de divulgação:** `Domínio público = sim` não altera
`Link enviado = pending`. O convite só pode ser divulgado após Gate E
assinado.

## Fechamento de requisitos

- LAUNCH-01 permanece pendente até evidência física independente.
- LAUNCH-02 combina automação com os backstops humanos ainda pendentes.
- LAUNCH-03 exige domínio/senha/lista real, não apenas o importador pronto.
- LAUNCH-04 passou com domínio, smoke ao vivo, segundo resolvedor e drill
  composto; isso não autoriza a divulgação enquanto o Gate E estiver pending.
