const CATALOG_KEY_PATTERN = /^\d{1,32}(?:-\d{1,8})?$/u
const WINE_HASH_PATTERN = /^#vinho-(\d{1,32}(?:-\d{1,8})?)$/u
const WINE_BAND_IDS = new Set([
  'faixa-ate-200',
  'faixa-200-350',
  'faixa-350-500',
])

export type WineCatalogHashTarget =
  | { kind: 'band'; id: string }
  | { kind: 'wine'; id: string; catalogKey: string }

export function wineDomId(catalogKey: string): string {
  if (!CATALOG_KEY_PATTERN.test(catalogKey)) {
    throw new TypeError('Identidade de catálogo inválida para deep link de vinho.')
  }

  return `vinho-${catalogKey}`
}

export function catalogKeyFromWineHash(hash: string): string | null {
  const match = WINE_HASH_PATTERN.exec(hash)
  return match?.[1] ?? null
}

export function catalogTargetFromWineHash(
  hash: string,
): WineCatalogHashTarget | null {
  const catalogKey = catalogKeyFromWineHash(hash)
  if (catalogKey) {
    return {
      kind: 'wine',
      id: wineDomId(catalogKey),
      catalogKey,
    }
  }

  if (!hash.startsWith('#')) return null
  const id = hash.slice(1)
  return WINE_BAND_IDS.has(id) ? { kind: 'band', id } : null
}
