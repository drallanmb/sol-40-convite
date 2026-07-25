---
status: testing
phase: 04-carta-de-vinhos
source: [04-VERIFICATION.md]
started: 2026-07-25T02:00:00Z
updated: 2026-07-25T02:00:00Z
---

## Current Test

number: 1
name: Aceite visual final da adega
expected: |
  Em `/presentes`, aproximadamente a 375px e 1280px, a página segue a direção editorial verde-escura aprovada. Todos os cards usam a mesma garrafa neutra sem marca e com rótulo abstrato vazio; as paletas variam sem imitar a arte dos rótulos reais; o texto permanece legível; o catálogo tem uma coluna no mobile e quatro somente a partir de 1280px.
awaiting: user response

## Tests

### 1. Aceite visual final da adega
expected: Em `/presentes`, a 375px e 1280px, o conjunto segue a direção aprovada, mantém garrafa neutra e legibilidade, usa uma coluna no mobile e quatro somente a partir de 1280px.
result: [pending]

### 2. Ciclo do CTA pós-RSVP
expected: Em `/confirmar`, “Escolher um presente” não aparece antes do primeiro salvamento bem-sucedido; aparece após respostas parciais, mistas ou todas “não vai”; persiste ao editar e após falha transitória posterior na mesma sessão montada; em nova sessão, volta a ficar ausente até o primeiro sucesso.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
