const PRODUCT_CODE_PATTERN = /^\d{1,32}$/u
const WINE_HASH_PATTERN = /^#vinho-(\d{1,32})$/u
const WINE_BAND_IDS = new Set([
  'faixa-ate-200',
  'faixa-200-350',
  'faixa-350-500',
])

export type WineCatalogHashTarget =
  | { kind: 'band'; id: string }
  | { kind: 'wine'; id: string; productCode: string }

export function wineDomId(productCode: string): string {
  if (!PRODUCT_CODE_PATTERN.test(productCode)) {
    throw new TypeError('Código de produto inválido para deep link de vinho.')
  }

  return `vinho-${productCode}`
}

export function productCodeFromWineHash(hash: string): string | null {
  const match = WINE_HASH_PATTERN.exec(hash)
  return match?.[1] ?? null
}

export function catalogTargetFromWineHash(
  hash: string,
): WineCatalogHashTarget | null {
  const productCode = productCodeFromWineHash(hash)
  if (productCode) {
    return {
      kind: 'wine',
      id: wineDomId(productCode),
      productCode,
    }
  }

  if (!hash.startsWith('#')) return null
  const id = hash.slice(1)
  return WINE_BAND_IDS.has(id) ? { kind: 'band', id } : null
}
