import { describe, expect, it } from 'vitest'
import {
  catalogKeyFromWineHash,
  catalogTargetFromWineHash,
  wineDomId,
} from './wineDeepLink'

describe('wineDomId', () => {
  it('preserva zero inicial no identificador', () => {
    expect(wineDomId('0699230')).toBe('vinho-0699230')
  })

  it('aceita a identidade interna de uma segunda garrafa', () => {
    expect(wineDomId('38870-2')).toBe('vinho-38870-2')
  })

  it.each(['', '12a', '12 34', '12#34', '<img>', '1] article'])(
    'rejeita código não canônico: %j',
    (productCode) => {
      expect(() => wineDomId(productCode)).toThrow()
    },
  )
})

describe('catalogKeyFromWineHash', () => {
  it('faz round-trip sem converter o código para número', () => {
    const productCode = '0699230'

    expect(catalogKeyFromWineHash(`#${wineDomId(productCode)}`)).toBe(
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
    expect(catalogKeyFromWineHash(hash)).toBeNull()
  })
})

describe('catalogTargetFromWineHash', () => {
  it('leva o CTA pós-RSVP diretamente à primeira faixa da carta', () => {
    expect(catalogTargetFromWineHash('#faixa-ate-200')).toEqual({
      kind: 'band',
      id: 'faixa-ate-200',
    })
  })

  it('preserva o deep link de um rótulo específico', () => {
    expect(catalogTargetFromWineHash('#vinho-0699230')).toEqual({
      kind: 'wine',
      id: 'vinho-0699230',
      catalogKey: '0699230',
    })
  })

  it('distingue duas garrafas com o mesmo código comercial', () => {
    expect(catalogTargetFromWineHash('#vinho-38870-2')).toEqual({
      kind: 'wine',
      id: 'vinho-38870-2',
      catalogKey: '38870-2',
    })
  })

  it.each([
    '',
    '#faixa',
    '#faixa-ate-200-sufixo',
    '#faixa-200-500',
    '#faixa-<script>',
  ])('rejeita destino de catálogo desconhecido ou hostil: %j', (hash) => {
    expect(catalogTargetFromWineHash(hash)).toBeNull()
  })
})
