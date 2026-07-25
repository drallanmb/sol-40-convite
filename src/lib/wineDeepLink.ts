const PRODUCT_CODE_PATTERN = /^\d{1,32}$/u
const WINE_HASH_PATTERN = /^#vinho-(\d{1,32})$/u

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
