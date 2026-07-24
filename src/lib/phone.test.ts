import { describe, expect, it } from 'vitest'
import { normalizePhone, type NormalizedPhone } from './phone'

function expectCanonical(raw: unknown, phone: string): Extract<NormalizedPhone, { kind: 'canonical' }> {
  const result = normalizePhone(raw)
  expect(result).toEqual({
    kind: 'canonical',
    phone,
    lookupCandidates: [phone],
    normalizedKey: phone,
  })
  if (result.kind !== 'canonical') {
    throw new Error(`Esperava telefone canônico para ${String(raw)}`)
  }
  return result
}

function expectLegacy(
  raw: unknown,
  exact: string,
  current: string,
): Extract<NormalizedPhone, { kind: 'legacy-mobile' }> {
  const result = normalizePhone(raw)
  expect(result).toEqual({
    kind: 'legacy-mobile',
    phone: current,
    lookupCandidates: [exact, current],
    normalizedKey: current,
  })
  if (result.kind !== 'legacy-mobile') {
    throw new Error(`Esperava telefone móvel legado para ${String(raw)}`)
  }
  return result
}

function expectInvalid(raw: unknown) {
  expect(normalizePhone(raw)).toEqual({ kind: 'invalid' })
}

describe('normalizePhone — formatos brasileiros equivalentes', () => {
  const variants = [
    '(79) 99999-9999',
    '+55 (79) 99999-9999',
    '55 79 99999-9999',
    '0 79 99999-9999',
    '79.99999.9999',
  ]

  for (const raw of variants) {
    it(`normaliza ${raw} para o mesmo celular nacional`, () => {
      expectCanonical(raw, '79999999999')
    })
  }

  it('produz uma chave byte-idêntica para formatos equivalentes e para a forma móvel atual', () => {
    const keys = variants.map((raw) => normalizePhone(raw).normalizedKey)
    expect(new Set(keys)).toEqual(new Set(['79999999999']))
  })

  it('aceita somente espaço ASCII e NBSP como espaços de formatação', () => {
    expectCanonical(' \u00a0(79)\u00a099999-9999\u00a0 ', '79999999999')
  })
})

describe('normalizePhone — DDD 55 não é código do país', () => {
  it('preserva DDD 55 em celular nacional', () => {
    expectCanonical('(55) 99999-9999', '55999999999')
  })

  it('preserva DDD 55 em telefone fixo nacional', () => {
    expectCanonical('55 3222-2222', '5532222222')
  })

  it('remove somente o país quando há +55 seguido do DDD 55', () => {
    expectCanonical('+55 55 99999-9999', '55999999999')
  })

  it('remove o país sem + quando o comprimento total prova o prefixo internacional', () => {
    expectCanonical('55 55 3222-2222', '5532222222')
  })
})

describe('normalizePhone — limites de fixo e nono dígito', () => {
  it('mantém prefixo 2 como fixo', () => {
    expectCanonical('(79) 2222-2222', '7922222222')
  })

  it('mantém prefixo 3 como fixo', () => {
    expectCanonical('(79) 3222-2222', '7932222222')
  })

  it('mantém prefixo 4 como fixo', () => {
    expectCanonical('(79) 4222-2222', '7942222222')
  })

  it('mantém o limite superior prefixo 5 como fixo', () => {
    expectCanonical('(79) 5222-2222', '7952222222')
  })

  it('expõe candidatos exato e atual, nessa ordem, para prefixo legado 6', () => {
    expectLegacy('(79) 6222-2222', '7962222222', '79962222222')
  })

  it('expõe candidatos exato e atual, nessa ordem, para prefixo legado 7', () => {
    expectLegacy('(79) 7222-2222', '7972222222', '79972222222')
  })

  it('expõe candidatos exato e atual, nessa ordem, para prefixo legado 8', () => {
    expectLegacy('(79) 8222-2222', '7982222222', '79982222222')
  })

  it('expõe candidatos exato e atual, nessa ordem, para prefixo legado 9', () => {
    expectLegacy('(79) 9999-9999', '7999999999', '79999999999')
  })

  it('usa a mesma chave normalizada para a forma legada e sua forma atual', () => {
    const legacy = normalizePhone('(79) 9999-9999')
    const current = normalizePhone('(79) 99999-9999')
    expect(legacy.normalizedKey).toBe(current.normalizedKey)
  })

  it('rejeita prefixo de assinante 0', () => {
    expectInvalid('(79) 0222-2222')
  })

  it('rejeita prefixo de assinante 1', () => {
    expectInvalid('(79) 1222-2222')
  })

  it('rejeita celular de onze dígitos que não começa em 9', () => {
    expectInvalid('(79) 89999-9999')
  })
})

describe('normalizePhone — DDD e comprimento', () => {
  it.each(['00', '10', '20', '90'])('rejeita o DDD inexistente %s', (ddd) => {
    expectInvalid(`(${ddd}) 99999-9999`)
  })

  it.each([
    '',
    '   ',
    '\u00a0\u00a0',
    '999',
    '(79) 9999-999',
    '(79) 99999-99999',
    '123456789012345',
  ])('rejeita valor vazio ou com comprimento inválido: %j', (raw) => {
    expectInvalid(raw)
  })

  it('rejeita valores que não são strings', () => {
    expectInvalid(undefined)
    expectInvalid(null)
    expectInvalid(79_999_999_999)
  })
})

describe('normalizePhone — entrada insegura ou malformada', () => {
  it.each([
    'SOL-4A2F',
    '(79) 99999-ABCD',
    'telefone (79) 99999-9999',
    '55 +79 99999-9999',
    '+ 55 79 99999-9999',
    '++55 79 99999-9999',
    '(79) / 99999-9999',
  ])('rejeita letras, sinais de mais deslocados e pontuação não aprovada: %j', (raw) => {
    expectInvalid(raw)
  })

  it.each([
    '(79)\t99999-9999',
    '(79)\r99999-9999',
    '(79)\n99999-9999',
    `(79)\u000099999-9999`,
    `(79)\u001f99999-9999`,
    `(79)\u007f99999-9999`,
    `(79)\u008599999-9999`,
  ])('rejeita controles C0/C1 antes de remover formatação: %j', (raw) => {
    expectInvalid(raw)
  })
})
