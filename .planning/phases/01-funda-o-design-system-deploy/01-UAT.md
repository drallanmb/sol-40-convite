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
result: pass
source: browser-verified (Claude, in-app browser)
notes: |
  Verificado no navegador em 375px (mobile) e desktop. Confirmado: (1) fundo cream rgb(255,243,223)=#fff3df, títulos em Alegreya Variable (serif), corpo em Gabarito Variable; (2) 9 swatches corretos (cream/sand/peach/coral/orange/plum/wine/ink/sea); (3) os 4 primitivos renderizam com a identidade pôr do sol — Button (primary "CONFIRMAR PRESENÇA", quiet "VER PROGRAMA", disabled "ENVIANDO…"), Field (input NOME + hint via aria-describedby, textarea RECADO), Card ("Card de exemplo" com sombra offset), Toast (dispara "Presença confirmada! Obrigado ✨"); (4) empilhamento mobile OK; Shell com topbar sticky + footer plum (data 17/10/2026 · Matapuã Eventos · Aracaju/SE). Sem erros de console.
  PRÉ-REQUISITO: `npm run dev` exige `VITE_CONVEX_URL` no ambiente/.env.local — sem ela o fix WR-01 lança erro claro e a página fica em branco (comportamento intencional). Verificação feita com URL placeholder; a home é preview estático (sem queries Convex ao vivo).

## Summary

total: 4
passed: 1
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
