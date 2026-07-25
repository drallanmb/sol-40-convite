# Phase 07 — Registro de smoke

Preencher uma linha por execução real. Não reutilizar resultado entre
ambientes e não converter emulação em evidência física. Use somente
identificadores sanitizados; dados pessoais, secrets, conteúdo de backup e
screenshots administrativos são proibidos.

## Identificação

| Execução | Ambiente/alvo | Commit/deployment | Data/hora `-03:00` | Classe | Operador | Resultado |
|---|---|---|---|---|---|---|
| Preview | `https://sol-40-convite-ao1ktwnbu-allans-projects-78f12069.vercel.app` | commit `3d7aa1c`; Vercel `dpl_A1D9bmdwHbQxNAd6v7r25mSpms2X`; Convex `prestigious-roadrunner-782` | 2026-07-25 08:59 | live + emulated | Codex | passou |
| Production `.vercel.app` | pending | pending | pending | live + emulated | pending | pending |
| Domínio imediato | `https://www.sol40.com.br` | pending | pending | live + emulated | pending | pending |
| Domínio pós-propagação | `https://www.sol40.com.br` | pending | pending | live + emulated | pending | pending |

## Casos por execução

Repita esta matriz para cada alvo acima; não agregue um passe enquanto
qualquer linha obrigatória do alvo estiver `pending`.

| Caso | Procedimento sem dados reais | Resultado | Evidência sanitizada | Severidade | Correção/reteste |
|---|---|---|---|---|---|
| Home + canonical | Abrir `/`; conferir 2xx, heading, canonical, `og:url` e `og:image` | pending | pending | pending | pending |
| Deep routes | Abrir e recarregar `/confirmar`, `/presentes`, `/admin` e uma 404 | pending | pending | pending | pending |
| RSVP | Abrir gate de telefone; em preview usar somente fixture fictícia autorizada | pending | pending | pending | pending |
| Catálogo + `wa.me` | Abrir `/presentes`; validar destino/encoding sem concluir compra | pending | pending | pending | pending |
| Memória pública | Abrir formulário; não enviar foto privada; JPEG/WebP fictício só em preview | pending | pending | pending | pending |
| Admin pré-auth | Confirmar somente login no DOM e nenhuma função/DTO protegido antes da sessão | pending | pending | pending | pending |
| Admin login | Autenticar funcionalmente sem registrar senha, trace ou screenshot protegido | pending | pending | pending | pending |
| TLS/redirect | Validar certificado; quando no domínio, apex 301/308 preserva path/query para `www` | pending | pending | pending | pending |
| Convex linkage | Confirmar deployment esperado e ausência de erro de conexão | pending | pending | pending | pending |
| Logs | Revisar Vercel/Convex sem expor valores ou PII; registrar apenas contagem/categoria | pending | pending | pending | pending |
| Rate limits | Confirmar feedback recuperável sem alterar valores sem reprodução | pending | pending | pending | pending |

## Execução Preview — Gate B

| Caso | Resultado | Evidência sanitizada | Severidade | Correção/reteste |
|---|---|---|---|---|
| Home + canonical | passou | alvo público respondeu 200; home incluída na suíte live-safe | nenhuma | não aplicável |
| Deep routes | passou | `/`, `/confirmar`, `/presentes`, `/admin`, `/admin/convidados` e 404 carregaram e sobreviveram a refresh em Chromium/WebKit, desktop/mobile emulados | nenhuma | não aplicável |
| RSVP | passou sem escrita | gate público e comportamento cobertos pela suíte; nenhuma família/fixture foi criada | nenhuma | não aplicável |
| Catálogo + `wa.me` | passou sem compra | superfície pública carregou; destino/encoding permanecem cobertos pelos unitários | nenhuma | não aplicável |
| Memória pública | passou sem upload | formulário carregou; nenhuma foto ou arquivo foi enviado | nenhuma | não aplicável |
| Admin pré-auth | passou | login foi o único conteúdo admin montado; nenhum DTO/função de domínio protegido foi consultado antes da sessão | nenhuma | não aplicável |
| Admin login | carregou | formulário pré-auth carregou; autenticação funcional fica para Gate C com `ADMIN_PASSWORD` de Production | nenhuma | Gate C |
| TLS/redirect | parcial esperado | HTTPS válido no `.vercel.app`; redirect apex/`www` pertence ao Gate D | nenhuma | Gate D |
| Convex linkage | passou | build Vercel resolveu `prestigious-roadrunner-782`, distinto de dev `judicious-pigeon-504` e prod `necessary-coyote-763` | nenhuma | não aplicável |
| Logs | passou | build terminou Ready e log sanitizado não mostrou erro inesperado; nenhum valor sensível foi registrado | nenhuma | não aplicável |
| Rate limits | passou em repository | contratos recuperáveis continuam cobertos por 528 testes; nenhum valor foi alterado e nenhuma reprodução live foi provocada | nenhuma | auditar novamente no Gate C |

O smoke não precisou de escrita. Portanto, não há dado fictício residual no
Preview nem possibilidade de contaminação de Production por esta execução.

## Resultado agregado

| Alvo | Estado | P0/P1 abertos | Pode avançar? | Motivo/ação |
|---|---|---|---|---|
| Preview | passou | 0 | sim | Gate B verde; avançar para senha segura e Gate C |
| Production `.vercel.app` | pending | pending | não | executar Gate C |
| Domínio imediato | pending | pending | não | executar primeiro Gate D |
| Domínio pós-propagação | pending | pending | não | repetir em outro resolvedor/rede |

## Regras de evidência

- Cada execução registra ambiente, alvo, commit/deployment, hora, resultado e
  correção. “Passou antes” não substitui reteste.
- P0/P1 exige resposta imediata e, havendo regressão, rollback para o alvo
  saudável de `07-ROLLBACK.md`.
- P2 tem workaround documentado e prioridade; P3 é diferença visual.
- HEIC, Safari iPhone, WebViews reais, fuso alterado no aparelho e teclado
  virtual pertencem a `07-DEVICE-MATRIX.md` e permanecem pending aqui.
- O prazo RSVP de 30/09 continua informativo; o smoke não deve esperar
  bloqueio de edição pós-prazo.
