---
status: human_needed
phase: 08-gest-o-de-gestores-contas-individuais-permiss-es-e-auditoria
source: [08-VERIFICATION.md]
started: 2026-07-25T18:12:28Z
updated: 2026-07-26T14:36:13Z
---

## Current Test

[testing complete]

## Tests

### 1. Scrypt real no Preview
expected: O smoke confirmado mede p50/p95 de senha correta e incorreta sem expor segredos, com latência utilizável na interface.
result: pass

### 2. Cutoff legado e sessões
expected: Em dois navegadores, a ativação derruba a sessão legada sem refresh e a revogação de um aparelho individual não encerra os demais.
result: pass

### 3. Link one-time
expected: O link funciona por copy/paste em janela privada, o token desaparece da URL e uma segunda tentativa de uso é rejeitada.
result: pass

### 4. Retenção de auditoria
expected: O handler e o scheduler reais respeitam a fronteira de 120 dias e executam cleanup idempotente.
result: pass

### 5. Contas iniciais
expected: Soraya, Guga e Vanessa são criadas e ativadas com os e-mails e papéis definidos, sem criar outro proprietário.
result: pass

### 6. Jornada da Vanessa
expected: Vanessa entra diretamente em Presentes, confirma, edita e reabre uma garrafa; o catálogo público reflete o estado sem revelar dados privados.
result: pass

### 7. Acessibilidade autenticada
expected: Login, Ativação, Gestores, Minha conta, Presentes e Auditoria funcionam com teclado e axe em desktop e 320 px, com foco e alvos de toque adequados.
result: pass

## Summary

total: 7
passed: 7
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

Os sete cenários originais permanecem aprovados. O incidente de link mobile
reabriu uma integração específica que não era demonstrada pela UAT anterior.

## Reteste do incidente de links mobile — 2026-07-26

| Cenário | Estado | Evidência/ação |
|---|---|---|
| Link novo usa `#token=`, é uma âncora real e não transborda em 320 px | pass | Testes de componente e Playwright em Chromium/WebKit mobile |
| Capability não aparece na requisição inicial nem no `Referer` | pass | Interceptação Playwright e política estática no HTML |
| Link revogado, regenerado, desativado ou expirado deixa de ser oferecido | pass | Validação reativa, expiração agendada e regressões de componente/backend |
| Cópia pendente não confirma um link que já mudou | pass | Regressões de revisão assíncrona em Gestores e Setup |
| Header `Referrer-Policy: no-referrer` está ativo em produção | pending | Confirmar por inspeção HTTP após o deploy |
| Link novo abre no WebView real do WhatsApp, conclui e recusa replay | pending | Executar em aparelho real sem registrar nem fotografar a capability |

O status permanece `human_needed` até o último cenário ser confirmado pelo
usuário. Links compartilhados antes do deploy devem ser invalidados e
regenerados; aceitar query string legada não revoga uma capability existente.
