import { describe, expect, it } from 'vitest'
import { productCodeFromWineHash, wineDomId } from './wineDeepLink'

describe('wineDomId', () => {
  it('preserva zero inicial no identificador', () => {
    expect(wineDomId('0699230')).toBe('vinho-0699230')
  })

  it.each(['', '12a', '12 34', '12#34', '<img>', '1] article'])(
    'rejeita código não canônico: %j',
    (productCode) => {
      expect(() => wineDomId(productCode)).toThrow()
    },
  )
})

describe('productCodeFromWineHash', () => {
  it('faz round-trip sem converter o código para número', () => {
    const productCode = '0699230'

    expect(productCodeFromWineHash(`#${wineDomId(productCode)}`)).toBe(
      productCode,
    )
  })

  it.each([
    '',
    '#',
    '#vinho-',
    '#vinho-12a',
    '#vinho-12%2034',
    '#vinho-12%5D%20article',
    '#vinho-12<script>',
    '#vinho-123-sufixo',
    '#outro-123',
    'vinho-123',
  ])('rejeita fragmento vazio, hostil ou com sufixo: %j', (hash) => {
    expect(productCodeFromWineHash(hash)).toBeNull()
  })
})
