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
| Deployment Vercel Production | `dpl_55PBruCBvfwrpN7y6WdGk2JpHKnY` — candidato; Gate C pendente |
| Deployment Convex Preview | `wooden-hound-372` |
| Deployment Convex Production | `necessary-coyote-763` |
| URL `.vercel.app` saudável | Preview `sol-40-convite-a22ao6yc7-allans-projects-78f12069.vercel.app`; Production candidata `sol-40-convite-fnrrv3vbd-allans-projects-78f12069.vercel.app` |
| Alvo saudável para rollback | Preview confirmado; Production candidata até concluir Gate C |
| Domínio público | pending — não equivale a convite divulgado |
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
| C | Production `.vercel.app`: commit esperado, Convex production, login e logs | pending | pending | pending · live/emulated | Codex + dono | pending |
| D | `www` público, HTTPS, apex permanente preservando path/query e smoke pós-propagação | pending | pending | pending · live | Codex + dono | pending |
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

- [ ] Deployment Vercel corresponde ao commit candidato.
- [ ] Frontend abre WebSocket contra Convex Production.
- [ ] `npx convex env list --names-only --prod` contém
  `ADMIN_PASSWORD`, sem imprimir o valor.
- [ ] Login real funciona sem segredo em log, trace ou screenshot.
- [ ] Logs Vercel/Convex sanitizados não mostram erro inesperado.
- [ ] URL `.vercel.app` e commit saudável foram registrados para rollback.

### Gate D — domínio

- [ ] `https://www.sol40.com.br` retorna 2xx com certificado válido.
- [ ] `https://sol40.com.br/<path>?<query>` retorna 301/308 e preserva
  caminho/query ao redirecionar para `www`.
- [ ] Canonical, `og:url` e `og:image` usam somente `www`.
- [ ] Smoke imediato e smoke pós-propagação estão registrados.
- [ ] Domínio pode ficar público mesmo com LAUNCH-01 físico pendente.

### Gate E — divulgação

- [ ] Backup/export de produção foi concluído, baixado fora do repositório e
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
- LAUNCH-04 exige deploy e smoke ao vivo, não apenas build local.
