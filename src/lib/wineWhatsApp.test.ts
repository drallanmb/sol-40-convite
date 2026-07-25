import { describe, expect, it } from 'vitest'
import {
  buildWineWhatsAppMessage,
  buildWineWhatsAppUrl,
  formatBRL,
} from './wineWhatsApp'

const wine = {
  productCode: '0699230',
  name: 'Luca Pinot Noir 2023',
  priceCents: 35442,
}

describe('formatBRL', () => {
  it('formata centavos em pt-BR sem perder os centavos', () => {
    expect(formatBRL(35442)).toBe('R$ 354,42')
  })
})

describe('buildWineWhatsAppMessage', () => {
  it('produz a mensagem Unicode aprovada completa', () => {
    expect(buildWineWhatsAppMessage(wine)).toBe(
      'Olá, Vanessa! Vim pelo convite da festa Sol faz 40 e gostaria de presentear a Sol com o vinho Luca Pinot Noir 2023 — cód. 0699230, no valor de R$ 354,42. Pode me orientar sobre o pagamento e a entrega?',
    )
  })
})

describe('buildWineWhatsAppUrl', () => {
  it('usa o destino canônico e permite recuperar a mensagem completa', () => {
    const url = new URL(buildWineWhatsAppUrl(wine))

    expect(url.origin).toBe('https://wa.me')
    expect(url.pathname).toBe('/5511993709046')
    expect([...url.searchParams.keys()]).toEqual(['text'])
    expect(url.searchParams.get('text')).toBe(buildWineWhatsAppMessage(wine))
  })

  it('mantém acentos e delimitadores hostis dentro do único parâmetro text', () => {
    const hostileWine = {
      productCode: '12&x=1?#!',
      name: 'Cuvée & Rosé? #1!',
      priceCents: 20300,
    }
    const url = new URL(buildWineWhatsAppUrl(hostileWine))

    expect([...url.searchParams.entries()]).toEqual([
      ['text', buildWineWhatsAppMessage(hostileWine)],
    ])
    expect(url.searchParams.get('x')).toBeNull()
  })

  it('codifica a mensagem exatamente uma vez', () => {
    const url = buildWineWhatsAppUrl(wine)

    expect(url).toContain('%C3%A1')
    expect(url).not.toContain('%25C3%25A1')
  })
})
