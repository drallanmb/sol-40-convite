import { mkdir, readdir, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const distDirectory = new URL('../dist/', import.meta.url)
const clientDirectory = new URL('../dist/client/', import.meta.url)
const serverDirectory = new URL('../dist/server/', import.meta.url)

await mkdir(clientDirectory, { recursive: true })

for (const entry of await readdir(distDirectory)) {
  if (entry === 'client' || entry === 'server') continue
  await rename(
    join(distDirectory.pathname, entry),
    join(clientDirectory.pathname, entry),
  )
}

await mkdir(serverDirectory, { recursive: true })
await writeFile(
  new URL('index.js', serverDirectory),
  `export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request)
    if (
      response.status !== 404 ||
      request.method !== 'GET' ||
      !request.headers.get('accept')?.includes('text/html')
    ) {
      return response
    }

    // The Sites asset binding canonicalizes `/index.html` to `/`, which would
    // leak a redirect to the browser and discard the original SPA route.
    // Fetching the root asset internally returns the same document with 200,
    // while the visitor keeps `/presentes`, `/admin`, etc. in the address bar.
    const fallbackUrl = new URL('/', request.url)
    return env.ASSETS.fetch(new Request(fallbackUrl, request))
  },
}
`,
)
