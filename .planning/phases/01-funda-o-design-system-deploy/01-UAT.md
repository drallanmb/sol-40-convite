---
status: testing
phase: 01-funda-o-design-system-deploy
source: [01-VERIFICATION.md]
started: 2026-07-23T18:07:43Z
updated: 2026-07-23T18:07:43Z
---

## Current Test

number: 1
name: Deploy real na Vercel do projeto (branch main) usando o vercel.json existente
expected: |
  Build conclui (`npx convex deploy --cmd 'npm run build'` roda sem erro), o site fica no ar
  e a home carrega com a identidade visual pôr do sol.
awaiting: user response

## Tests

### 1. Deploy real na Vercel
expected: Build conclui e o site fica no ar; a home carrega com a identidade pôr do sol.
result: [pending]

### 2. Hard-refresh em `/admin` em produção
expected: Após o deploy, navegar até `/admin` e dar hard-refresh (Cmd+Shift+R) carrega a página normalmente via fallback SPA — NÃO pode retornar 404.
result: [pending]

### 3. Backends Convex separados (preview vs. produção)
expected: Gerar Production e Preview Deploy Keys no Convex Dashboard, colar em `CONVEX_DEPLOY_KEY` nos escopos corretos da Vercel, disparar builds de produção e de preview (PR) e comparar os deployments — dois deployments Convex distintos aparecem no dashboard, confirmando isolamento de dados.
result: [pending]

### 4. Renderização visual real de `/` (preview do design system)
expected: Rodar `npm run dev` e abrir `/` em viewport mobile (~375px) e desktop — (1) fundo cream #fff3df e títulos em Alegreya; (2) swatches coral/orange/plum/wine/sea corretos; (3) Button/Field/Card/Toast com a identidade pôr do sol; (4) layout empilha bem no mobile.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
