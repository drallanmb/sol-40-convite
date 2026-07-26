---
phase: 10-abertura-cinematogr-fica-do-p-r-do-sol
plan: "03"
status: pending-real-hardware
updated: 2026-07-26
requirements: [INTRO-01, INTRO-02]
---

# Phase 10 — UAT em hardware real

Este documento é o registro obrigatório do checkpoint 10-03-03. Emulação,
screenshots e `pageshow.persisted` sintético não aprovam percepção, admissão
real no bfcache nem fluidez de GPU. Enquanto qualquer linha aplicável estiver
`PENDENTE` ou `FALHOU`, a Fase 10 permanece aberta.

## Direção aprovada e invariantes

- Existe um único sol canônico; não pode haver blink, swap, clone ou salto no
  assentamento.
- **Nuvens, reflexo/brilho/glitter na água e coqueiros/palmeiras devem
  permanecer totalmente ausentes** em desktop e mobile.
- O brilho ambiental do fundo permanece ausente durante todo o percurso do
  sol. O sol assenta no alvo real em **82%**; o brilho só começa em **83%** e
  ganha leitura depois da chegada.
- O recuo afeta a paisagem, não a escala da interface ou da tipografia.
- A duração natural é próxima de 3 segundos; intenção de navegação acelera a
  conclusão sem cancelar a ação original.
- Em reduced motion, a primeira pintura já é o hero final: sem arco, câmera,
  parallax, fade ou loop das ondas.

## Build sob teste

| Campo | Valor |
|---|---|
| URL / origem | PENDENTE |
| Commit | PENDENTE |
| Data e hora | PENDENTE |
| Responsável | PENDENTE |

Todos os aparelhos devem abrir exatamente o mesmo build registrado acima.

## Evidência automatizada

| Evidência | Ambiente | Resultado | Observação |
|---|---|---|---|
| Lifecycle/focus/falhas WAAPI focado | Chromium desktop emulado | PASS — 10/10 | Inclui remount, same-mount, bfcache sintético, `pause`, `finish` ausente e `cancel` lançando |
| Baselines 0/70/100 desktop/mobile + namespace test-only | Chromium desktop estável | PASS — 3/3 | PNGs em `tests/cinematic-intro.snapshots/`; ondas infinitas congeladas somente durante captura |
| Axe com tags WCAG A/AA sem filtro por impacto | Chromium desktop emulado | PASS — 6/6 | `result.violations` precisa ser vazio |
| Matriz comportamental da intro nos quatro projetos | Chromium/WebKit desktop/mobile emulados | PASS — 68/68 | `emulated-chromium-desktop`, `emulated-chromium-mobile-320px-2x`, `emulated-webkit-desktop` e `emulated-webkit-mobile-320px-2x` |
| Release completo | Vitest + build + quatro projetos Playwright | PASS | 671/671 testes Vitest em 36 arquivos; build de produção concluído; 190 Playwright passaram e 6 baselines de pixel foram ignorados fora do Chromium desktop conforme o contrato |

## Registro de aparelhos e navegadores

Preencha uma linha por ambiente realmente usado. Versões aproximadas ou apenas
“Chrome/Safari” não bastam.

| ID | Aparelho | OS e versão | Navegador e versão | Viewport/orientação | URL/build | Evidência |
|---|---|---|---|---|---|---|
| ENV-01 | PENDENTE — desktop real | PENDENTE | Chrome PENDENTE | PENDENTE | PENDENTE | PENDENTE |
| ENV-02 | PENDENTE — Mac real | PENDENTE | Safari PENDENTE | PENDENTE | PENDENTE | PENDENTE |
| ENV-03 | PENDENTE — iPhone/320px-class | iOS PENDENTE | Safari PENDENTE | Retrato + paisagem | PENDENTE | PENDENTE |
| ENV-04 | PENDENTE — Android intermediário/baixo | Android PENDENTE | Chrome PENDENTE | Retrato + paisagem | PENDENTE | PENDENTE |

Evidência aceitável: gravação de tela, vídeo em câmera lenta, foto do aparelho
com URL/build identificável ou anotação reproduzível com timestamps. Não
registre em nenhum arquivo senhas, cookies, tokens ou dados privados.

## Matriz de UAT

| Caso | Ambientes mínimos | Procedimento | Resultado esperado | Resultado | Evidência / observações |
|---|---|---|---|---|---|
| HW-01 — playback natural desktop | ENV-01 e ENV-02 | Abrir uma nova montagem de `/` e assistir sem tocar na página. Cronometrar do primeiro frame ao hero final. | Aproximadamente 3 s; um único sol; sem corte, blink, swap ou salto. Sem nuvens, reflexo/glitter na água ou coqueiros. | PENDENTE | PENDENTE |
| HW-02 — câmera lenta desktop | ENV-01 e ENV-02 | Gravar a entrada em 60 fps ou slow motion e revisar quadro a quadro, sobretudo 70–100%. | Sol e halo contínuos. O sol assenta antes do brilho ambiental. A água não recebe reflexo/glitter em nenhum quadro. | PENDENTE | PENDENTE |
| HW-03 — câmera versus zoom | ENV-01, ENV-02 e ENV-03 | Observar bordas da paisagem, topbar, título e CTAs durante o recuo. | Movimento lê como câmera sutil na paisagem; texto e interface não escalam nem “respiram”. | PENDENTE | PENDENTE |
| HW-04 — composição vertical real | ENV-03 | Abrir `/` em retrato numa largura 320px-class e assistir uma entrada nova. | Arco vertical próprio, horizonte e copy sem crop acidental ou overflow. Sem palmeiras/coqueiros e sem faixa de reflexo na água. | PENDENTE | PENDENTE |
| HW-05 — fluidez Android intermediário/baixo | ENV-04 | Gravar uma entrada natural e repetir tocando/rolando durante o percurso. | Sem travamento, atraso evidente de controle ou sequência quebrada; a ação do usuário acontece. | PENDENTE | PENDENTE |
| HW-06 — rotação durante playback | ENV-03 e ENV-04 | Iniciar em retrato e girar para paisagem entre 35–60%; repetir no sentido inverso. | Preserva progresso, reenquadra sem reiniciar, sem segundo sol e sem salto perceptível. | PENDENTE | PENDENTE |
| HW-07 — reduced motion | ENV-02 ou ENV-03 e ENV-04 | Ativar “Reduzir movimento” no sistema, fechar a montagem anterior e abrir `/` novamente. | Hero final imediato; nenhuma trajetória, recuo, fade ou onda em loop; controles visíveis e operáveis. | PENDENTE | PENDENTE |
| HW-08 — skip, Tab e foco | ENV-01 e ENV-02 | Durante playback, pressionar Tab. Ativar “Pular para o conteúdo”; repetir usando navegação do topo e um CTA quando visível. | Skip é o primeiro foco e fica acima da arte. Nada invisível recebe foco. Navegação acelera suavemente e a ação original ocorre. | PENDENTE | PENDENTE |
| HW-09 — scroll e pointer/touch | ENV-01, ENV-03 e ENV-04 | Durante playback, rolar pelo menos 4 px e, em outra entrada, tocar/clicar num controle disponível. | Cena acelera para ~150–200 ms sem restaurar scroll, bloquear toque ou capturar pointer na decoração. | PENDENTE | PENDENTE |
| HW-10 — bfcache Chrome real | ENV-01 ou ENV-04 | Abrir `/`, navegar para `/confirmar` e usar Back. Confirmar no DevTools quando a volta foi admitida no bfcache; repetir se necessário. | Uma única execução elegível nova; sem animação, listener ou foco obsoleto. Se não admitido, registrar `NÃO ADMITIDO` e repetir em ambiente compatível. | PENDENTE | PENDENTE |
| HW-11 — bfcache Safari real | ENV-02 ou ENV-03 | Abrir `/`, navegar para `/confirmar` e usar Back. Repetir após uma entrada concluída e durante uma entrada em curso. | Quando admitido, uma única execução elegível nova; skip/foco corretos e nenhum handle antigo. | PENDENTE | PENDENTE |
| HW-12 — ausência dos elementos removidos | ENV-01 a ENV-04 | Revisar playback natural, slow motion e frame final. | Zero nuvens, zero reflexo/brilho/glitter na água e zero coqueiros/palmeiras em todos os formatos. | PENDENTE | PENDENTE |
| HW-13 — timing do brilho | ENV-01, ENV-02 e ENV-03 | Revisar slow motion em torno da chegada do sol. | Fundo não brilha durante o percurso; sol assenta primeiro (82%); brilho ambiental começa somente depois (83%). | PENDENTE | PENDENTE |

## Como registrar um resultado

Para cada caso, substitua `PENDENTE` por um destes valores:

- `PASSOU — ENV-xx` e um link/caminho ou descrição precisa da evidência;
- `FALHOU — ENV-xx`, com timestamp, comportamento observado e passos de
  reprodução;
- `NÃO ADMITIDO — ENV-xx` somente para bfcache, seguido de uma nova tentativa
  em navegador/ambiente compatível.

Um `approved` isolado, sem preencher ambiente, versão e evidência, não encerra
este checkpoint.

## Aprovação final

- Resultado geral: **PENDENTE**
- Aprovado por: **PENDENTE**
- Data/hora: **PENDENTE**
- Observações: **PENDENTE**
