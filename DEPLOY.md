# Deploy — Vercel + Convex

Guia de configuração do pipeline de deploy: Vercel hospeda o frontend (Vite/SPA) e o build da Vercel encadeia o deploy do backend Convex. Produção e preview usam **backends Convex separados**, autenticados por deploy keys distintas.

Este passo-a-passo é executado **uma vez** pelo dono do projeto (Allan/Soraya) para configurar o projeto na Vercel. Depois disso, cada `git push` para `main` (produção) ou para uma branch/PR (preview) dispara o build automaticamente — nada manual no dia a dia.

## Como funciona o build

O `vercel.json` (raiz do repo) define:

```json
{
  "buildCommand": "npx convex deploy --cmd 'npm run build'",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

- **`buildCommand`**: `npx convex deploy` primeiro empurra `convex/schema.ts` e as funções para o backend Convex correspondente, **injeta automaticamente `VITE_CONVEX_URL`** com a URL desse deployment, e só então roda `npm run build` (o `tsc -b && vite build` definido em `package.json`). Não é preciso setar `VITE_CONVEX_URL` manualmente na Vercel — o `--cmd` já cuida disso.
- **`outputDirectory`**: `dist` — pasta gerada pelo `vite build`.
- **`rewrites`**: fallback de SPA. Como não há framework SSR, qualquer rota (`/admin`, `/mural`, etc.) precisa cair em `index.html` para o React Router resolver a navegação no client. Sem isso, um refresh (F5) em `/admin` retornaria 404 direto do servidor da Vercel.

## Passo-a-passo

### 1. Importar o repositório na Vercel

- Vercel → **Add New → Project** → selecione o repositório `sol-40-convite`.
- Alternativa recomendada: usar a integração oficial **"Convex for Vercel"** no Vercel Marketplace — ela automatiza boa parte da configuração das deploy keys abaixo.
- Depois de importar, confirme em **Project → Settings → Build & Development** que o **Build Command** e o **Output Directory** estão vindo do `vercel.json` do repo (não sobrescritos manualmente na UI da Vercel).

### 2. Gerar as Deploy Keys no Convex Dashboard

No [Convex Dashboard](https://dashboard.convex.dev) → seu projeto → **Settings → Deploy Keys**:

- **Production Deploy Key**: clique em "Generate Production Deploy Key". Copie o valor (só é mostrado uma vez).
- **Preview Deploy Key**: clique em "Generate Preview Deploy Key". Copie o valor — é uma chave **diferente** da de produção.

Cada deploy key aponta para um backend Convex diferente: a Production Key sempre publica no deployment de produção; a Preview Key faz o Convex criar um **deployment efêmero por branch/PR**, isolado dos dados reais.

### 3. Colar as Deploy Keys na Vercel (escopos separados)

Em **Vercel → Project → Settings → Environment Variables**, adicione a variável `CONVEX_DEPLOY_KEY` **duas vezes**, com escopos diferentes:

| Variável | Valor | Escopo (Vercel) |
|---|---|---|
| `CONVEX_DEPLOY_KEY` | Production Deploy Key (passo 2) | **Production** |
| `CONVEX_DEPLOY_KEY` | Preview Deploy Key (passo 2) | **Preview** |

Importante:
- `CONVEX_DEPLOY_KEY` é **server-only / build-time**. Nunca prefixe com `VITE_` — isso a colocaria no bundle JS entregue ao navegador do convidado.
- Não é preciso configurar `VITE_CONVEX_URL` manualmente aqui — o `npx convex deploy --cmd` (passo anterior) já injeta a URL correta durante o build, para cada ambiente (produção ou preview).

### 4. Provisionar o `ADMIN_PASSWORD` no backend Convex

A senha única do dashboard dos donos (`/admin`) deve existir no deployment
Convex de produção. Confirme primeiro somente os nomes já configurados:

```bash
npx convex env list --names-only --prod
npx convex env set --prod ADMIN_PASSWORD
```

- O segundo comando, sem valor na linha de comando, lê a senha
  interativamente/stdin. Não passe o segredo como argumento, não o grave no
  histórico do shell e não copie seu valor para logs ou evidências.
- `ADMIN_PASSWORD` fica **só no ambiente do backend Convex** — nunca em `.env.local`, nunca em `.env.example` com valor real, nunca referenciado em código dentro de `src/`.
- Para um preview, use explicitamente
  `npx convex env set --deployment <deployment-preview> ADMIN_PASSWORD`; não
  reutilize a senha de produção.
- Esta versão do app Convex (`defineApp()` em `convex/convex.config.ts`) não
  oferece uma declaração geral de variável obrigatória para todas as
  functions. Não invente uma API de configuração: a ausência da senha falha
  fechada em `adminAuth`, e o gate de produção exige a verificação
  `--names-only --prod` mais o smoke real de login.

### 5. Preview por branch/PR — isolado da produção

Cada branch/PR criado na Vercel dispara um build que usa a `CONVEX_DEPLOY_KEY` do escopo **Preview**, que por sua vez faz o Convex criar (ou reusar) um **deployment efêmero** separado do de produção. Ou seja:

- Testar RSVP, upload de fotos no mural, ou qualquer fluxo de escrita num preview **não** polui os dados reais dos convidados.
- Cada preview tem seu próprio `VITE_CONVEX_URL`, injetado automaticamente pelo build — nenhuma configuração manual adicional é necessária por PR.

### 6. Teste final pós-deploy (obrigatório antes de divulgar o link)

Depois do primeiro deploy de produção bem-sucedido:

1. Abra a URL de produção da Vercel.
2. Navegue até `/admin` e dê um **hard-refresh** (Cmd+Shift+R / Ctrl+Shift+R).
3. **Resultado esperado:** a página carrega normalmente (o React Router resolve `/admin` client-side). **Não pode retornar 404** — se retornar, o rewrite de SPA em `vercel.json` não foi respeitado (confirme que a Vercel não está sobrescrevendo o `vercel.json` do repo nas configurações do projeto).
4. No [Convex Dashboard](https://dashboard.convex.dev), confirme que existem **dois deployments distintos** listados (produção e o(s) preview(s) gerado(s) pelos PRs abertos) — isso confirma que as deploy keys separadas estão funcionando.

## Segredos — onde cada um vive (e onde NUNCA deve estar)

| Variável | Onde vive | Nunca deve estar em |
|---|---|---|
| `VITE_CONVEX_URL` | Injetada automaticamente pelo `npx convex deploy --cmd` durante o build (produção e preview); localmente, em `.env.local` (via `npx convex dev`) | Não é segredo — pode aparecer no bundle do cliente, é a URL pública do backend reativo |
| `CONVEX_DEPLOY_KEY` | Vercel → Environment Variables, chaves distintas nos escopos Production e Preview correspondentes | `.env.example` (valor real), `.env.local`, qualquer arquivo versionado, qualquer código em `src/` |
| `ADMIN_PASSWORD` | Somente no deployment Convex correspondente; produção via `npx convex env set --prod ADMIN_PASSWORD` | Vercel, `.env.example` (valor real), `.env.local`, `vercel.json`, argumentos de shell, qualquer código em `src/` |

## Verificação segura de produção

Antes do smoke de login, verifique presença sem imprimir valores:

```bash
npx convex env list --names-only --prod
```

O resultado precisa conter `ADMIN_PASSWORD`. A chave
`CONVEX_DEPLOY_KEY` é verificada no escopo **Production** da Vercel; a
Preview Deploy Key fica apenas no escopo **Preview**. Nunca troque as chaves
entre esses escopos e nunca use uma chave de preview para publicar produção.

Ver `.env.example` para a documentação inline de cada variável com placeholders.
