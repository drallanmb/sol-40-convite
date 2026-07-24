---
status: complete
phase: 03-rsvp
source:
  - 03-01-SUMMARY.md
  - 03-02-SUMMARY.md
  - 03-03-SUMMARY.md
  - 03-04-SUMMARY.md
  - 03-05-SUMMARY.md
started: 2026-07-24T18:21:16-03:00
updated: 2026-07-24T18:42:31-03:00
---

## Current Test

[testing complete]

## Tests

### 1. Infraestrutura Convex e rate limiter
expected: O harness encontra testes frontend/backend e registra o componente oficial de rate limit.
result: pass
source: automated
coverage_id: 03-01-D1

### 2. Normalização brasileira de telefone
expected: Formatos equivalentes, DDD 55 e limites do nono dígito são tratados de modo determinístico.
result: pass
source: automated
coverage_id: 03-01-D2

### 3. Schema RSVP
expected: RSVP, convidados e sessões têm validadores, índices e unicidade lógica.
result: pass
source: automated
coverage_id: 03-01-D3

### 4. Fixtures protegidas e idempotentes
expected: As quatro famílias sintéticas são reproduzíveis sem duplicação ou endpoint público.
result: pass
source: automated
coverage_id: 03-01-D4

### 5. Capability e expiração do servidor
expected: Tokens têm hash SHA-256, validade de oito horas e limites precisos.
result: pass
source: automated
coverage_id: 03-02-D1

### 6. Desbloqueio e leitura escopada
expected: O telefone libera somente a família correspondente e nenhuma informação sensível vaza.
result: pass
source: automated
coverage_id: 03-02-D2

### 7. Salvamento parcial e idempotente
expected: Somente respostas alteradas são gravadas; omitidos e contato inalterado são preservados.
result: pass
source: automated
coverage_id: 03-02-D3

### 8. Limites N-1, N e N+1
expected: Limites globais e por telefone/sessão respeitam exatamente suas fronteiras.
result: pass
source: automated
coverage_id: 03-02-D4

### 9. Copy e entradas para confirmar
expected: Copy aprovada, prazo informativo e os dois links para `/confirmar` usam uma fonte canônica.
result: pass
source: automated
coverage_id: 03-03-D1

### 10. Modelo de rascunho sparse
expected: Pendentes, contato opcional e reconciliação preservam apenas a intenção alterada.
result: pass
source: automated
coverage_id: 03-03-D3

### 11. Sessão limitada à aba
expected: A capability válida usa somente a chave versionada de `sessionStorage` e retry limitado.
result: pass
source: automated
coverage_id: 03-03-D4

### 12. Relógio de prazo
expected: A data muda somente a apresentação e o override DEV é ignorado em produção.
result: pass
source: automated
coverage_id: 03-03-D5

### 13. Restauração e limpeza de sessão
expected: A rota restaura a mesma aba, isola nova sessão e limpa dados escopados ao trocar.
result: pass
source: automated_ui
coverage_id: 03-04-D1

### 14. Segurança de request e retenção de rascunho
expected: Duplicações são bloqueadas e erros recuperáveis preservam entrada e rascunho.
result: pass
source: automated
coverage_id: 03-04-D3

### 15. Diálogo de descarte
expected: Rascunho sujo exige confirmação nativa com foco seguro, Escape e retorno de foco.
result: pass
source: automated_ui
coverage_id: 03-05-D1

### 16. Entradas, espaçamento e foco visível
expected: Hero/menu abrem `/confirmar`; botão e campos mantêm foco visível e continuidade visual.
result: pass
source: automated_ui
coverage_id: 03-03-D2

### 17. Formulário familiar e resposta parcial
expected: Cada pessoa tem grupo Vai/Pendente/Não vai, contato opcional e salvamento parcial reutilizável.
result: pass
source: automated_ui
coverage_id: 03-04-D2

### 18. Formas de dados e breakpoints
expected: Zero, um e muitos convidados com nomes longos funcionam de 320 a 1440px sem scroll aninhado.
result: pass
source: automated_ui
coverage_id: 03-05-D2-observed

### 19. Tom, privacidade e hierarquia
expected: Respostas pendentes ou negativas recebem tom neutro; contato e dados ficam escopados à família.
result: pass
source: automated_ui
coverage_id: 03-05-D3

### 20. Zoom de 200% e movimento reduzido
expected: Em 200% não há scroll horizontal/cortes; com movimento reduzido, conteúdo, foco e controles permanecem funcionais sem depender de animação.
result: pass
coverage_id: 03-05-D2-manual

### 21. Falha de rede preserva o rascunho
expected: Com o navegador offline durante o salvamento, escolhas e contato continuam visíveis, uma mensagem recuperável aparece e o usuário pode tentar novamente.
result: pass
coverage_id: 03-05-D4-offline

### 22. Sessão expirada limpa dados
expected: Uma capability expirada mostra o aviso aprovado, remove imediatamente família/contato do DOM e devolve o foco à entrada por telefone.
result: pass
coverage_id: 03-05-D4-expired

### 23. Pós-prazo continua editável
expected: Depois de 30 de setembro, a ajuda muda para o estado tardio, mas respostas e contato continuam editáveis e salváveis.
result: pass
coverage_id: 03-05-D4-deadline

### 24. 31º salvamento preserva alterações
expected: A 31ª chamada mostra limite e retry positivo derivados do servidor, mantendo rádio/contato alterados e o estado “Alterações ainda não salvas”.
result: pass
coverage_id: 03-05-D4-throttle

## Summary

total: 24
passed: 24
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
