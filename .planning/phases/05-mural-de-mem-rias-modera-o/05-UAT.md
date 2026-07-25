---
status: testing
phase: 05-mural-de-mem-rias-modera-o
source: [05-VERIFICATION.md]
started: 2026-07-25T02:15:31Z
updated: 2026-07-25T02:15:31Z
---

## Current Test

number: 1
name: Carrossel populado — foco, swipe, movimento reduzido e zoom
expected: |
  Com uma, poucas e muitas memórias aprovadas, o carrossel permite foco por
  teclado, anterior/próximo e swipe; pausa e retoma corretamente; pausa em
  hover/foco; respeita prefers-reduced-motion; exibe todas as variantes de
  card; mantém visibilidade responsiva e funciona com zoom de 200%.
awaiting: user response

## Tests

### 1. Carrossel populado — foco, swipe, movimento reduzido e zoom

expected: Com uma, poucas e muitas memórias aprovadas, verificar teclado, controles, swipe, pausas, movimento reduzido, variantes, responsividade e zoom de 200%.
result: [pending]

### 2. Upload real JPEG/PNG/WebP com interrupção

expected: Anexar cada formato pelo seletor real do navegador, observar progresso, interromper a rede, tentar novamente, confirmar que o rascunho completo permanece, que exatamente um post pendente é criado e que o payload público não contém dados pendentes ou privados.
result: [pending]

### 3. Fallback HEIC no Safari iOS

expected: Em um iPhone real com Safari, selecionar HEIC/HEIF e confirmar conversão/upload ou fallback acionável, preservando autor e recado.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
