# Phase 5: Mural de Memórias + Moderação - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-24
**Phase:** 5-Mural de Memórias + Moderação
**Areas discussed:** Forma de participação, Experiência de envio, Visual do álbum público, Limites e repetição

---

## Forma de participação

### Conteúdo aceito

| Option | Description | Selected |
|--------|-------------|----------|
| Recado obrigatório | Toda foto exige um recado | |
| Recado opcional | Aceita foto, recado ou ambos | ✓ |
| Legenda obrigatória | Foto exige ao menos uma legenda curta | |

### Autor omitido

| Option | Description | Selected |
|--------|-------------|----------|
| De alguém que te ama | Assinatura afetiva padrão | ✓ |
| Anônimo | Identificação explícita como anônimo | |
| Sem assinatura | Não renderiza linha de autor | |

### Próximo envio

| Option | Description | Selected |
|--------|-------------|----------|
| Continuar preenchido | Preserva o nome e limpa foto/recado | ✓ |
| Apagar tudo | Reinicia todos os campos | |
| Perguntar se deseja reutilizar | Insere uma confirmação intermediária | |

### Várias memórias

| Option | Description | Selected |
|--------|-------------|----------|
| Uma memória por envio | Cada envio gera um card independente | ✓ |
| Várias fotos de uma vez | Compartilha autor e recado entre fotos | |
| Miniálbum | Várias fotos formam um único card | |

**User's choice:** Foto e recado podem vir juntos ou separados; autor opcional; preservar nome; uma memória por submissão.
**Notes:** O fluxo deve facilitar vários envios consecutivos sem criar lote ou álbum.

---

## Experiência de envio

### Posição na home

| Option | Description | Selected |
|--------|-------------|----------|
| Depois do dress code | Última dobra antes do rodapé | ✓ |
| Depois da programação | Antes das informações de traje | |
| Depois do local/guia | Antes de programação e traje | |

### Prévia da foto

| Option | Description | Selected |
|--------|-------------|----------|
| Ver, trocar ou remover | Prévia simples sem editor | ✓ |
| Recortar e reposicionar | Editor de enquadramento | |
| Apenas confirmar | Miniatura sem controles de substituição | |

### Recuperação de falha

| Option | Description | Selected |
|--------|-------------|----------|
| Preservar tudo e tentar novamente | Mantém foto, recado e nome | ✓ |
| Preservar somente texto | Exige selecionar a foto outra vez | |
| Limpar e reiniciar | Descarta o rascunho | |

### Confirmação

| Option | Description | Selected |
|--------|-------------|----------|
| Sucesso inline | Substitui o formulário e oferece novo envio | ✓ |
| Mensagem sobre formulário limpo | Formulário reaparece imediatamente | |
| Toast temporário | Confirmação passageira | |

**User's choice:** Dobra após o dress code; prévia simples; retry sem perda; sucesso inline com “aguarda aprovação” e novo envio.
**Notes:** A confirmação deve deixar explícito que a memória ainda não está pública.

---

## Visual do álbum público

### Ordem interna

| Option | Description | Selected |
|--------|-------------|----------|
| Carrossel primeiro | Memórias aprovadas antes do formulário | ✓ |
| Formulário primeiro | Prioriza a submissão | |
| Lado a lado | Divide o espaço no desktop | |

### Aleatoriedade

| Option | Description | Selected |
|--------|-------------|----------|
| Embaralhar uma vez | Sequência aleatória estável por visita | ✓ |
| Reembaralhar a cada volta | Nova ordem após um ciclo | |
| Sortear a cada avanço | Próximo card sem sequência estável | |

### Movimento

| Option | Description | Selected |
|--------|-------------|----------|
| Automático com controles | Autoplay, setas, arrastar e pausa | ✓ |
| Somente manual | Nenhuma troca automática | |
| Automático sem controles | Movimento contemplativo sem navegação explícita | |

### Mistura de conteúdo

| Option | Description | Selected |
|--------|-------------|----------|
| Moldura consistente | Foto acima/recado abaixo; texto central sem foto | ✓ |
| Altura livre | Card cresce conforme o conteúdo | |
| Tipos separados | Foto e recado usam formatos distintos | |

**User's choice:** Carrossel antes do formulário, aleatório por visita, automático com controle e cards consistentes.
**Notes:** Pausar após interação e respeitar `prefers-reduced-motion`.

---

## Limites e repetição

### Recado

| Option | Description | Selected |
|--------|-------------|----------|
| Contador e bloqueio | Exibe restantes e bloqueia em 280 | ✓ |
| Cortar ao enviar | Permite exceder e trunca depois | |
| Erro ao enviar | Exige correção após submissão | |

### Foto grande

| Option | Description | Selected |
|--------|-------------|----------|
| Reduzir automaticamente | Downscale antes do upload | ✓ |
| Pedir foto menor | Rejeita o arquivo original | |
| Pedir confirmação | Oferece redução em etapa extra | |

### HEIC/HEIF

| Option | Description | Selected |
|--------|-------------|----------|
| Converter quando possível | Compatibilidade de iPhone com fallback orientado | ✓ |
| Não aceitar | Somente JPEG, PNG e WebP | |
| Decidir na pesquisa | Deixar contrato em aberto | |

### Quantidade de envios

| Option | Description | Selected |
|--------|-------------|----------|
| Sem teto de produto | Rate-limit contém somente abuso | ✓ |
| Até 10 por visita | Teto intermediário | |
| Até 5 por visita | Teto rígido | |

**User's choice:** 280 caracteres; downscale automático; JPEG/PNG/WebP e tentativa de HEIC/HEIF; envios ilimitados com rate-limit.
**Notes:** Cada memória continua sendo enviada individualmente.

---

## Claude's Discretion

- Copy exata fora das frases específicas aprovadas.
- Valores técnicos de tamanho, dimensão, compressão e rate-limit.
- Ritmo e detalhes responsivos/acessíveis do carrossel.
- Implementação e fallback da conversão HEIC/HEIF.
- Limite do nome opcional, sanitização, fixtures e testes.

## Deferred Ideas

- Fila administrativa para aprovar/ocultar → Phase 6.
- Telão, QR das mesas e Instagram → v2.
