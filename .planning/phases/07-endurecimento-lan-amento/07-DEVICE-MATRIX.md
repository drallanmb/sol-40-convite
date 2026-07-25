# Phase 07 — Matriz de dispositivos físicos

Estado inicial: **pending — não bloqueia publicação**. Playwright, simulador,
desktop WebKit, viewport responsivo e screenshot não contam como aparelho
real. LAUNCH-01 só pode ser concluído quando todas as linhas obrigatórias
tiverem evidência física explícita.

## Linhas independentes

| ID | Data | Dispositivo | OS | Navegador/app/versão | Conexão | Fluxo | Resultado | Evidência sem PII | Severidade | Correção/reteste | Responsável |
|---|---|---|---|---|---|---|---|---|---|---|---|
| IOS-SAFARI | pending | iPhone real | pending | Safari pending | pending | convite/countdown; RSVP salvar/editar; `wa.me`; memória HEIC; retorno | pending | pending | pending | pending | unassigned |
| IOS-WEBVIEW | pending | iPhone real | pending | WebView/Safari View Controller real pending | pending | abrir link; navegar/retornar; `wa.me`; picker quando disponível | pending | pending | pending | pending | unassigned |
| ANDROID-CHROME | pending | Android real | pending | Chrome pending | pending | convite/countdown; RSVP salvar/editar; `wa.me`; memória JPEG/WebP | pending | pending | pending | pending | unassigned |
| ANDROID-WEBVIEW | pending | Android real | pending | WebView/Custom Tab real pending | pending | abrir link; navegar/retornar; `wa.me`; upload quando disponível | pending | pending | pending | pending | unassigned |
| MOBILE-ADMIN | pending | um telefone real | pending | navegador pending | pending | login; CRUD/import preview; dialogs; teclado virtual; logout | pending | pending | pending | pending | unassigned |

## Backstops físicos obrigatórios

- Safari iPhone: selecionar HEIC/HEIF real, confirmar preview/decode,
  reencode JPEG dentro do limite, post pendente e moderação; não guardar a
  foto como fixture/evidência.
- Fuso: alterar o aparelho para outro timezone, recarregar e confirmar que o
  countdown mantém os instantes qualificados por `-03:00`.
- WebViews: usar hospedeiro real disponível; browser emulado não substitui.
- `/admin`: validar foco, dialogs, retorno de foco, safe area e teclado
  virtual sem registrar tela com dados protegidos.
- LAUNCH-02 humano: teclado completo, zoom 200%, contraste, conteúdo longo,
  orientação e 320 CSS px/reflow devem ter evidência própria; axe não prova
  esses itens sozinho.

## Interrupção, paralelismo e ownership

- Cada linha tem um único responsável por execução; assuma a linha antes de
  começar e registre a data real somente ao concluir/reprovar.
- Execuções paralelas permanecem independentes. Um passe em Android não
  altera iOS; Safari não altera WebView.
- Se uma execução for interrompida, mantenha `Resultado = pending` e registre
  a última etapa segura em `Correção/reteste`. Outra pessoa pode assumir sem
  inferir resultados.
- O agregado só pode ser `pass` quando **todas** as cinco linhas obrigatórias
  tiverem resultado e evidência explícitos.
- Nenhuma linha pendente bloqueia apontar/manter o domínio público, mas P0/P1
  reproduzido exige correção imediata ou rollback.

## Severidade

- **P0:** exposição administrativa/PII, domínio indisponível ou perda de
  dados — resposta/rollback imediato.
- **P1:** RSVP, login, WhatsApp ou upload impossível — correção imediata no ar.
- **P2:** fluxo degradado com workaround — prioridade de correção.
- **P3:** diferença apenas visual — backlog priorizado.

## Estado dos requisitos

- LAUNCH-01: pending até que a matriz física completa tenha evidência.
- LAUNCH-02: automação emulada pode ficar verde, mas qualquer backstop humano
  não executado continua pending.
- Publicação: permitida após gate técnico/live, independentemente deste
  estado pending.

