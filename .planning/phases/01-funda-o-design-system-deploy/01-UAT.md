---
status: complete
phase: 01-funda-o-design-system-deploy
source: [01-VERIFICATION.md]
started: 2026-07-23T18:07:43Z
updated: 2026-07-23T21:21:59Z
---

## Current Test

[testing complete]

## Tests

### 1. Deploy real na Vercel
expected: Build conclui e o site fica no ar; a home carrega com a identidade pôr do sol.
result: pass
source: browser-verified (Claude) — https://sol-40-convite.vercel.app/
notes: |
  Produção no ar em https://sol-40-convite.vercel.app/ (importado na Vercel a partir de drallanmb/sol-40-convite). Home renderiza: fundo cream rgb(255,243,223)=#fff3df, títulos em Alegreya Variable, 7 headings, 4 botões, "DESIGN SYSTEM PREVIEW / Paleta pôr do sol". Crucialmente, o React MONTOU — logo o build da Vercel injetou VITE_CONVEX_URL via `npx convex deploy --cmd 'npm run build'` (senão o guard WR-01 lançaria erro e a página ficaria em branco). Isso prova o pipeline de deploy Convex+Vite ponta a ponta.

### 2. Hard-refresh em `/admin` em produção
expected: Após o deploy, navegar até `/admin` e dar hard-refresh (Cmd+Shift+R) carrega a página normalmente via fallback SPA — NÃO pode retornar 404.
result: pass
source: browser-verified (Claude) — GET https://sol-40-convite.vercel.app/admin
notes: |
  Navegação direta a https://sol-40-convite.vercel.app/admin (equivalente a hard-refresh): resposta HTTP 200 (não 404), documento serve index.html, React Router resolve /admin client-side e renderiza o placeholder "Admin — área dos donos (em breve)". O rewrite de SPA do vercel.json (source /(.*) -> /index.html) está sendo respeitado em produção pela Vercel.

### 3. Backends Convex separados (preview vs. produção)
expected: Gerar Production e Preview Deploy Keys no Convex Dashboard, colar em `CONVEX_DEPLOY_KEY` nos escopos corretos da Vercel, disparar builds de produção e de preview (PR) e comparar os deployments — dois deployments Convex distintos aparecem no dashboard, confirmando isolamento de dados.
result: pass
source: browser-verified (Claude) — comparação dos bundles prod vs preview
notes: |
  Aberto PR #1 (branch chore/preview-smoke-test) → disparou build de preview na Vercel. GitHub deployment statuses confirmam 2 ambientes distintos: Production (ref main 0d068ed) e Preview (ref fff034a). Extraí as URLs Convex injetadas em cada bundle e elas DIFEREM: produção usa https://rugged-hippopotamus-117.convex.cloud e o preview usa https://neat-snake-930.convex.cloud (a URL comum happy-otter-123 é placeholder interno da lib convex). Backends Convex distintos por ambiente = isolamento de dados prod/preview confirmado. Preview deployment é auth-protected (proteção padrão da Vercel); acesso via link de share temporário. PR de teste fechado e branch removida após verificação.

### 4. Renderização visual real de `/` (preview do design system)
expected: Rodar `npm run dev` e abrir `/` em viewport mobile (~375px) e desktop — (1) fundo cream #fff3df e títulos em Alegreya; (2) swatches coral/orange/plum/wine/sea corretos; (3) Button/Field/Card/Toast com a identidade pôr do sol; (4) layout empilha bem no mobile.
result: pass
source: browser-verified (Claude, in-app browser)
notes: |
  Verificado no navegador em 375px (mobile) e desktop. Confirmado: (1) fundo cream rgb(255,243,223)=#fff3df, títulos em Alegreya Variable (serif), corpo em Gabarito Variable; (2) 9 swatches corretos (cream/sand/peach/coral/orange/plum/wine/ink/sea); (3) os 4 primitivos renderizam com a identidade pôr do sol — Button (primary "CONFIRMAR PRESENÇA", quiet "VER PROGRAMA", disabled "ENVIANDO…"), Field (input NOME + hint via aria-describedby, textarea RECADO), Card ("Card de exemplo" com sombra offset), Toast (dispara "Presença confirmada! Obrigado ✨"); (4) empilhamento mobile OK; Shell com topbar sticky + footer plum (data 17/10/2026 · Matapuã Eventos · Aracaju/SE). Sem erros de console.
  PRÉ-REQUISITO: `npm run dev` exige `VITE_CONVEX_URL` no ambiente/.env.local — sem ela o fix WR-01 lança erro claro e a página fica em branco (comportamento intencional). Verificação feita com URL placeholder; a home é preview estático (sem queries Convex ao vivo).

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
