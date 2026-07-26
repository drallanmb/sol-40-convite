---
phase: 08-gest-o-de-gestores-contas-individuais-permiss-es-e-auditoria
plan: "09"
status: human_validation_pending
completed: 2026-07-26
gap_closure: true
---

# Plano 08-09 — Jornada mobile dos links administrativos

## Resultado

Os sete gaps de UI e cobertura foram implementados:

- o formato canônico é clicável e usa
  `/admin/ativar#token=…` ou `/admin/redefinir#token=…`;
- o parser aceita query string somente como entrada legada e remove fragmento
  ou query da barra imediatamente;
- o cartão associa link, conta e finalidade, acompanha o status remoto e some
  quando o link deixa de ser válido;
- cópia e invalidação têm estado ocupado, resultado assíncrono real e
  tratamento de erro;
- setup usa o clipboard seguro e oferece uma âncora sem overflow;
- consumo mostra verificação, offline, inválido, rate limit e conclusão, limpa
  senha nos estados terminais e oferece CTA para `/admin`;
- três suítes de componente cobrem as transições antes ausentes.

## Evidência

- 18 testes novos de componente: 5 de gestores, 5 de setup e 8 de consumo
- suíte focada integrada: 6 arquivos e 137 testes aprovados
- suíte completa: 36 arquivos e 637 testes aprovados
- browser focado: 12/12 jornadas aprovadas
- browser completo: 120/120 jornadas aprovadas em Chromium/WebKit, desktop e
  viewport mobile de 320 px
- build TypeScript/Vite aprovado

O browser confirma que o fragmento não entra na requisição inicial nem no
`Referer` e que a rota mantém reflow em 320 px.

## Verificação humana restante

A automação reproduz navegadores móveis, mas não substitui o WebView real do
WhatsApp. Depois do deploy, abrir um link novo em aparelho real, concluir o
fluxo e confirmar que replay e link invalidado falham sem expor a capability.
