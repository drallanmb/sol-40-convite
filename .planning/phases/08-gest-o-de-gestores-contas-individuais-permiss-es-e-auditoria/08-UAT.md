---
status: testing
phase: 08-gest-o-de-gestores-contas-individuais-permiss-es-e-auditoria
source: [08-VERIFICATION.md]
started: 2026-07-25T18:12:28Z
updated: 2026-07-25T18:12:28Z
---

## Current Test

number: 1
name: Scrypt real no Preview
expected: |
  O smoke confirmado no Preview mede p50/p95 de senha correta e incorreta,
  sem expor entradas, e a latência permanece utilizável na interface.
awaiting: user response

## Tests

### 1. Scrypt real no Preview
expected: O smoke confirmado mede p50/p95 de senha correta e incorreta sem expor segredos, com latência utilizável na interface.
result: [pending]

### 2. Cutoff legado e sessões
expected: Em dois navegadores, a ativação derruba a sessão legada sem refresh e a revogação de um aparelho individual não encerra os demais.
result: [pending]

### 3. Link one-time
expected: O link funciona por copy/paste em janela privada, o token desaparece da URL e uma segunda tentativa de uso é rejeitada.
result: [pending]

### 4. Retenção de auditoria
expected: O handler e o scheduler reais respeitam a fronteira de 120 dias e executam cleanup idempotente.
result: [pending]

### 5. Contas iniciais
expected: Soraya, Guga e Vanessa são criadas e ativadas com os e-mails e papéis definidos, sem criar outro proprietário.
result: [pending]

### 6. Jornada da Vanessa
expected: Vanessa entra diretamente em Presentes, confirma, edita e reabre uma garrafa; o catálogo público reflete o estado sem revelar dados privados.
result: [pending]

### 7. Acessibilidade autenticada
expected: Login, Ativação, Gestores, Minha conta, Presentes e Auditoria funcionam com teclado e axe em desktop e 320 px, com foco e alvos de toque adequados.
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps
