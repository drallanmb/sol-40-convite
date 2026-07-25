# Phase 07 — Checklist de lançamento

Este registro separa código pronto, ambientes publicados, domínio público e
divulgação do convite. Nenhum campo `pending` representa aprovação. Evidência
não pode conter senha, deploy key, capability, telefone, nome de convidado,
CSV real, conteúdo de backup ou foto privada.

## Identificação do release

| Campo | Valor |
|---|---|
| Commit candidato | pending |
| Deployment Vercel Preview | pending |
| Deployment Vercel Production | pending |
| Deployment Convex Preview | pending |
| Deployment Convex Production | pending |
| URL `.vercel.app` saudável | pending |
| Alvo saudável para rollback | pending |
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
| A | Repositório: unitários, build, browser/axe, privacidade e `git diff --check` | pending | pending | pending · repository/emulated | Codex | pending |
| B | Preview isolado: frontend, Convex distinto, rotas profundas e dados fictícios | pending | pending | pending · live/emulated | Codex + dono | pending |
| C | Production `.vercel.app`: commit esperado, Convex production, login e logs | pending | pending | pending · live/emulated | Codex + dono | pending |
| D | `www` público, HTTPS, apex permanente preservando path/query e smoke pós-propagação | pending | pending | pending · live | Codex + dono | pending |
| E | Backup validado, lista real importada/revisada, amostragem RSVP e autorização para divulgar | pending | pending | pending · live/manual | Donos | pending |

## Critérios por gate

### Gate A — repositório

- [ ] `npm run test:release` verde.
- [ ] Nenhuma violação axe A/AA séria ou crítica sem justificativa estreita.
- [ ] `/`, `/confirmar`, `/presentes`, `/admin`, `/admin/convidados` e 404
  carregam e sobrevivem a refresh em Chromium e WebKit emulados.
- [ ] Pré-auth não monta navegação/DTO protegido nem função de domínio admin.
- [ ] Backstops humanos de teclado, zoom 200%, contraste, conteúdo longo e
  dispositivo permanecem honestamente pendentes quando não executados.

### Gate B — preview

- [ ] Preview Vercel aponta para deployment Convex de preview, distinto de
  desenvolvimento e produção.
- [ ] Somente dados fictícios são usados; nenhuma lista real é importada.
- [ ] Rotas, refresh, RSVP, catálogo/`wa.me`, memória e login carregam.
- [ ] Resultado e correções são registrados em `07-SMOKE.md`.

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

