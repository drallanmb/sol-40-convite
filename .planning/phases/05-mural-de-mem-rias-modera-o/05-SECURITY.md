---
phase: 05
slug: mural-de-mem-rias-modera-o
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-25
---

# Phase 05 — Security

> Verificação ASVS L1 do registro de ameaças definido nos planos 05-01 a 05-05.

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Navegador anônimo → Convex | Texto, chave de dispositivo, capability e comandos de envio | Dados não confiáveis e identificadores efêmeros |
| Navegador → Storage | Upload público com URL curta | Bytes e MIME controlados pelo cliente |
| Storage → decoder interno | Blob armazenado submetido à validação real | Imagem potencialmente malformada |
| Convex → álbum público | Projeção de memórias moderadas | Autor, recado, imagem e data aprovados |
| Estado mutável → claim | Rascunho editável convertido em submissão idempotente | Snapshot normalizado e fingerprint |
| Cron → reservas/storage | Expiração e retenção destrutiva | Estado terminal, ownership e blobs |
| Checkout Fase 4 → arquivos compartilhados | Schema, cron, dependências e tipos gerados | Alterações concorrentes legítimas |

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-05-01-A | Denial of Service | Reserva pública | high | mitigate | Limites device/global antes de URL ou insert; testes N±1 e concorrência | closed |
| T-05-01-B | Tampering | Validação de mídia | high | mitigate | Limite de 5 MiB, MIME/formato e decode real limitado no servidor | closed |
| T-05-01-C | Spoofing/Tampering | Capability e ownership | high | mitigate | Capability hash, estados explícitos e finalização idempotente | closed |
| T-05-01-D | Denial of Service | Cleanup de storage | high | mitigate | Expiração, ownership revalidado e sweeps paginados | closed |
| T-05-01-E | Information Disclosure | Álbum público | high | mitigate | Índice approved-only e projeção mínima com allowlist | closed |
| T-05-01-F | Tampering | Recado | high | mitigate | Texto simples normalizado; nenhuma API de HTML bruto | closed |
| T-05-01-G | Spoofing | Chave de dispositivo | high | mitigate | Chave usada só para fairness; breaker global permanece | closed |
| T-05-01-H | Tampering | Checkout compartilhado | high | mitigate | Patches aditivos, codegen e diffs direcionados preservaram Fase 4 | closed |
| T-05-02-A | Denial of Service | URL de upload | high | mitigate | Consumo atômico dos dois buckets antes de gerar URL | closed |
| T-05-02-B | Tampering | Pipeline de imagem | high | mitigate | Metadata, blob real e decoder interno antes de criar post | closed |
| T-05-02-C | Tampering | Retry/finalização | high | mitigate | Ownership único, cooldown e transação idempotente | closed |
| T-05-02-D | Denial of Service | Órfãos | high | mitigate | Delete em rejeição/expiração e varredura bounded ownership-aware | closed |
| T-05-02-E | Information Disclosure | Queries públicas/status | high | mitigate | Validadores de retorno, escopo por capability e chaves proibidas testadas | closed |
| T-05-02-F | Tampering | Renderização | high | mitigate | JSX trata conteúdo como texto e projeção exclui metadata privada | closed |
| T-05-02-G | Denial of Service | Rate limit | high | mitigate | Ceiling de retry e check-all-before-consume transacional | closed |
| T-05-02-H | Elevation of Privilege | Funções internas | high | mitigate | Cleanup, decoder e finalização permanecem internal-only | closed |
| T-05-03-A | Denial of Service | Processamento cliente | high | mitigate | Precheck 30 MiB, uma imagem por vez e cleanup de bitmap/URL | closed |
| T-05-03-B | Tampering | Autoridade de MIME | high | mitigate | Cliente é otimização; servidor sempre valida bytes reais | closed |
| T-05-03-C | Tampering | Estado de retry | high | mitigate | Reducer por camadas, busy guard, transporte novo e backend idempotente | closed |
| T-05-03-D | Information Disclosure | Capability/device key | high | mitigate | Capability só em memória; sem URL, DOM público ou logging | closed |
| T-05-03-E | Tampering | Confirmação | high | mitigate | Sucesso somente após status accepted | closed |
| T-05-03-F | Tampering | Texto Unicode | high | mitigate | Limite 280 code points no cliente e servidor; sem truncamento silencioso | closed |
| T-05-03-G | Denial of Service | Paralelismo cliente | high | mitigate | Busy ref e inteiro de retry autoritativo do servidor | closed |
| T-05-03-H | Information Disclosure | Preview | high | mitigate | Preview local; status não retorna bearer URL pendente | closed |
| T-05-04-A | Information Disclosure | Carrossel | high | mitigate | Consome somente `listApproved` e tipo público mínimo | closed |
| T-05-04-B | Tampering/Disclosure | Card público | high | mitigate | Texto JSX, alt genérico e ausência de filename/metadata | closed |
| T-05-04-C | Denial of Service | Acessibilidade/movimento | high | mitigate | Controles, pausas e reduced-motion; UAT aprovado | closed |
| T-05-04-D | Tampering | Integração final | high | mitigate | Suíte backend, build e Convex runtime verdes | closed |
| T-05-04-E | Tampering | Checkout Fase 4 | high | mitigate | Commits direcionados e integração aditiva | closed |
| T-05-04-F | Information Disclosure | Copy de rate limit | high | mitigate | Mensagem genérica sem contador vitalício ou identidade | closed |
| T-05-04-G | Tampering | HEIC | high | mitigate | Conversão quando suportada e fallback preservando rascunho; UAT aprovado | closed |
| T-05-04-H | Elevation of Privilege | Escopo adiado | high | mitigate | Nenhuma rota/API para admin, telão, QR ou Instagram | closed |
| T-05-05-A | Denial of Service | Lookup de capability | high | mitigate | `by_token_hash.take(1)` e retenção terminal bounded | closed |
| T-05-05-B | Tampering | Retenção terminal | high | mitigate | Cursor monotônico, migração separada, re-read e ownership | closed |
| T-05-05-C | Tampering/DoS | Decoder de imagem | high | mitigate | Sharp/libvips, jpeg-js e zlib com limites pré-alocação; bypasses rejeitados | closed |
| T-05-05-D | Tampering | URL curta de retry | high | mitigate | Toda falha invalida transporte; retry pede nova reserva | closed |
| T-05-05-E | Tampering | Claim ambíguo | high | mitigate | Snapshot/fingerprint imutável; aceitação A preserva edição B | closed |
| T-05-05-F | Information Disclosure | Confirmação/logs | high | mitigate | UI mostra só conteúdo humano aceito; scans sem secrets | closed |
| T-05-05-G | Tampering | Integração paralela | high | mitigate | Stage explícito e trabalho da Fase 4 preservado | closed |

*Status: open · closed · open — below high threshold (non-blocking)*

## Accepted Risks Log

No accepted risks.

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-25 | 39 | 39 | 0 | Codex / ASVS L1 artifact verification |

Evidence: `05-REVIEW.md` passed with zero critical/warning findings;
`05-VERIFICATION.md` satisfied WALL-01–WALL-05; `05-UAT.md` recorded 3/3
manual checks passed; 393 automated tests, production build, Convex typecheck,
deployment preparation and invalid-image cloud smoke passed.

## Sign-Off

- [x] All threats have a disposition
- [x] Accepted risks documented
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-25
