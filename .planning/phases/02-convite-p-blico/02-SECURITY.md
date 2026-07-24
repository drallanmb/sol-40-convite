---
phase: 02
slug: convite-p-blico
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-07-24
---

# Phase 02 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Registro STRIDE derivado dos blocos `<threat_model>` dos 7 planos (register_authored_at_plan_time: true).
> Auditoria L1 (grep-depth) via short-circuit — nenhuma ameaça aberta no threshold `high`.
> Página pública estática, sem backend, sem entrada de usuário nesta fase.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| npm registry → devDependencies | `vitest` entra na toolchain de build/test | código/deps de terceiros (supply chain) |
| filesystem do projeto antigo → `public/` | assets binários copiados de fora do repo e servidos a todo convidado | imagens estáticas (possível EXIF) |
| módulo de conteúdo → DOM renderizado | strings de `src/content/event.ts` renderizadas em JSX | conteúdo autorado (sem input do usuário) |
| relógio do dispositivo → countdown | clock do convidado alimenta `getEventState` | único input não-confiável (cosmético) |
| preferências de acessibilidade → movimento | `prefers-reduced-motion` do SO altera comportamento | sinal do SO |
| browser do convidado → embed Google Maps | única origem terceira contatada, e só após clique explícito (D-12) | request de mapa sob opt-in |
| browser do convidado → destinos externos | 7 links (Tripadvisor ×4, hotéis ×3, rota Maps) abertos em nova aba | navegação de saída fora do controle do projeto |
| `index.html` head → scrapers de link-preview | metadados OG lidos por WhatsApp/iMessage/crawlers | metadados (sem input do atacante) |

---

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Status | Evidence (L1) |
|-----------|----------|-----------|----------|-------------|--------|---------------|
| T-02-SC | Tampering | `npm install vitest@4.1.10` | high | mitigate | CLOSED | `vitest` fixado exato (`4.1.10`, sem `^`) em package.json/lock; RESEARCH § Package Legitimacy = OK (first-party) |
| T-02-06-A | Tampering | anchors `target="_blank"` (rota, 4 guias, 3 hotéis) | high | mitigate | CLOSED | paridade `target=_blank`==`rel=noreferrer` (3:3 no source); browser confirmou os 8 anchors externos renderizados todos com `rel="noreferrer"` (implica `noopener`) |
| T-02-02-C | Tampering | recursos externos no `index.html` | medium | mitigate | CLOSED | `grep -cE 'https?://' index.html` = 0 (zero origens externas) |
| T-02-03-A | DoS (a11y) | animações contínuas do `SeaWaves` | medium | mitigate | CLOSED | bloco `@media (prefers-reduced-motion: reduce)` presente; browser confirmou `animation-name: none` nas 4 classes com elementos ainda visíveis; anima só transform/opacity |
| T-02-03-C | Tampering | bloco `@theme` em `src/index.css` | medium | mitigate | CLOSED | edição append-only; `@theme` e tokens da Fase 1 preservados (build verde, todos os componentes renderizam) |
| T-02-05-A | Info Disclosure | fotos de pessoas reais (dress-code) | medium | mitigate | CLOSED | re-encode via `sips` remove EXIF/GPS; mesmo escopo/distribuição do site anterior |
| T-02-06-B | Info Disclosure | referrer vazado ao Google pelo iframe | medium | mitigate | CLOSED | `referrerPolicy="no-referrer-when-downgrade"` no iframe + click-to-load (D-12): request só sob opt-in |
| T-02-06-C | Info Disclosure/Privacy | cookies de terceiros do embed Maps | medium | mitigate | CLOSED | iframe só existe no ramo revelado do condicional; 0 iframes no load (verificado no browser); sem preconnect/prefetch |
| T-02-06-D | Spoofing | URL typo-squatted/deriva | medium | mitigate | CLOSED | P-04 (só fontes verificadas), URLs centralizadas em `event.ts`; hotéis curl 200/308; Tripadvisor = walk humano (403 p/ bots) |
| T-02-07-A | DoS (a11y) | scroll listener no `Shell` | medium | mitigate | CLOSED | 1 `addEventListener('scroll'` + 1 `removeEventListener` + `requestAnimationFrame` + `passive` (grep confirmado) |
| T-02-07-B | Spoofing/Repudiation | nav para capacidade inexistente | medium | mitigate | CLOSED | nav de literal único de 3 entradas; browser confirmou 0 strings rsvp/presente/mural na página |
| T-02-07-D | Tampering | footer da Fase 1 + rota `NotFound` | medium | mitigate | CLOSED | props novas opcionais c/ default; `git diff --quiet NotFound.tsx`; linha de footer exata preservada |
| T-02-01-A | Tampering/Injection | strings de `event.ts` em JSX | low | accept | CLOSED | JSX auto-escapa; `grep dangerouslySetInnerHTML src/` = 0 |
| T-02-01-B | Info Disclosure | URLs externas autoradas | low | mitigate | CLOSED | consumidas em 02-06 com `rel=noreferrer`; só fontes verificadas |
| T-02-02-A | Info Disclosure | EXIF de imagens portadas | low | mitigate | CLOSED | `sips` re-encode remove bloco EXIF (confirmado pela redução de tamanho) |
| T-02-02-B | Spoofing | `og:image` relativo sem `og:url` | low | accept | CLOSED | comportamento desejado até a Fase 7 definir o domínio de produção; sem input do atacante |
| T-02-03-B | Info Disclosure | requests externos do hero | low | accept | CLOSED | hero não faz nenhum request; arte inline SVG/CSS |
| T-02-04-A | Tampering | relógio do sistema → countdown | low | accept | CLOSED | consequência cosmética; data impressa em texto plano no hero/footer/title |
| T-02-04-B | DoS | `setInterval` em `useCountdown` | low | mitigate | CLOSED | WR-01 consolidou para uma fonte de tick única em nível de módulo (`useSyncExternalStore`) — um único timer lógico; 31 testes + browser confirmam relógios sincronizados; cleanup presente |
| T-02-04-C | Info Disclosure | requests externos do countdown | low | accept | CLOSED | sem chamada de rede; matemática local |
| T-02-05-B | Tampering/Injection | strings de conteúdo em JSX | low | accept | CLOSED | literais hardcoded; JSX escapa; sem `dangerouslySetInnerHTML` |
| T-02-05-C | DoS | peso de imagem em conexão móvel | low | mitigate | CLOSED | lazy-load, <250KB por asset, width/height reservam aspect-ratio (sem CLS) |
| T-02-07-C | Info Disclosure | requests externos do shell | low | accept | CLOSED | shell não contata origem; wordmark é asset same-origin |

**Total:** 23 threats · **high:** 2 (ambos CLOSED) · **medium:** 10 (CLOSED) · **low:** 11 (CLOSED) · **threats_open (≥high): 0**

---

## Accepted Risks

Riscos aceitos explicitamente para esta fase (estáticos, sem backend), a re-avaliar em fases futuras:

- **T-02-01-A / T-02-05-B** — conteúdo é literal do desenvolvedor + auto-escape do JSX; sem `dangerouslySetInnerHTML`. Re-avaliar quando qualquer conteúdo virar editável pelo dono (fase de admin/RSVP).
- **T-02-02-B** — `og:image` relativo é intencional até a Fase 7 fixar o domínio canônico de produção (`og:url` absoluto).
- **T-02-04-A** — relógio do dispositivo não é server-anchored; efeito é cosmético (data também em texto plano). Um clock de servidor seria desproporcional para um convite de festa.
- **T-02-03-B / T-02-04-C / T-02-07-C** — componentes sem request de rede próprio; aceite reforçado pela constraint de fase (zero origens externas em `index.html`, grep-enforced).

---

## Audit Trail

### Security Audit 2026-07-24

| Metric | Count |
|--------|-------|
| Threats found | 23 |
| Closed | 23 |
| Open (≥ high) | 0 |

- **Modo:** State B (SECURITY.md criado a partir dos artefatos). `register_authored_at_plan_time: true` (7/7 planos com `<threat_model>`). ASVS L1, block_on `high`.
- **Método:** short-circuit — verificação de mitigações em profundidade L1 (grep) contra a implementação; sem spawn do auditor (regra: threats_open 0 + register at plan time + asvs 1).
- **Cross-check:** code review (`02-REVIEW.md`) achou 0 problema de segurança crítico; UAT no browser (`02-UAT.md`) confirmou gating de rede do mapa (0 iframes no load), `rel=noreferrer` em todos os links externos, e ausência de superfícies deferidas (RSVP/presentes/mural).
- **Veredito:** THREAT-SECURE — nenhuma ameaça aberta no threshold de bloqueio.
