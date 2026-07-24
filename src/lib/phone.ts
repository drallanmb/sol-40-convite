export type NormalizedPhone =
  | {
      kind: 'canonical'
      phone: string
      lookupCandidates: [string]
      normalizedKey: string
    }
  | {
      kind: 'legacy-mobile'
      phone: string
      lookupCandidates: [string, string]
      normalizedKey: string
    }
  | {
      kind: 'invalid'
      phone?: never
      lookupCandidates?: never
      normalizedKey?: never
    }

const INVALID_PHONE: NormalizedPhone = { kind: 'invalid' }

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/u
const ALLOWED_CHARACTERS = /^[0-9+() .\-\u00a0]+$/u
const EDGE_SPACES = /^[ \u00a0]+|[ \u00a0]+$/gu
const FORMATTING_CHARACTERS = /[ ()\-. \u00a0]/gu

// Códigos Nacionais publicados pela Anatel. Intervalos ausentes não são DDDs.
const BRAZILIAN_DDDS = new Set([
  '11',
  '12',
  '13',
  '14',
  '15',
  '16',
  '17',
  '18',
  '19',
  '21',
  '22',
  '24',
  '27',
  '28',
  '31',
  '32',
  '33',
  '34',
  '35',
  '37',
  '38',
  '41',
  '42',
  '43',
  '44',
  '45',
  '46',
  '47',
  '48',
  '49',
  '51',
  '53',
  '54',
  '55',
  '61',
  '62',
  '63',
  '64',
  '65',
  '66',
  '67',
  '68',
  '69',
  '71',
  '73',
  '74',
  '75',
  '77',
  '79',
  '81',
  '82',
  '83',
  '84',
  '85',
  '86',
  '87',
  '88',
  '89',
  '91',
  '92',
  '93',
  '94',
  '95',
  '96',
  '97',
  '98',
  '99',
])

/**
 * Aplica uma máscara nacional progressiva sem alterar o valor canônico usado
 * pelo backend. Colagens com +55 também são reduzidas para DDD + assinante.
 */
export function formatBrazilianPhoneInput(raw: string): string {
  let digits = raw.replace(/\D/gu, '')

  if (digits.length > 11 && digits.startsWith('55')) {
    digits = digits.slice(2)
  }

  digits = digits.slice(0, 11)

  if (!digits) return ''
  if (digits.length < 3) return `(${digits}`

  const ddd = digits.slice(0, 2)
  const subscriber = digits.slice(2)
  const prefixLength = digits.length === 11 ? 5 : 4
  const prefix = subscriber.slice(0, prefixLength)
  const suffix = subscriber.slice(prefixLength)

  return `(${ddd}) ${prefix}${suffix ? `-${suffix}` : ''}`
}

function canRemoveDomesticTrunk(digits: string): boolean {
  if (!digits.startsWith('0')) {
    return false
  }

  const withoutTrunk = digits.slice(1)
  const nationalLength = withoutTrunk.length === 10 || withoutTrunk.length === 11
  const countryAndNationalLength =
    (withoutTrunk.length === 12 || withoutTrunk.length === 13) &&
    withoutTrunk.startsWith('55')

  return nationalLength || countryAndNationalLength
}

/**
 * Normaliza uma entrada brasileira para DDD + assinante.
 *
 * O retorno mantém candidatos explícitos para números móveis de oito dígitos:
 * uma busca deve testar o valor exato e depois a forma atual com nono dígito.
 * `normalizedKey` sempre usa a forma atual, para que limites por telefone
 * tratem a grafia legada e a atual como a mesma identidade leve.
 */
export function normalizePhone(raw: unknown): NormalizedPhone {
  if (typeof raw !== 'string' || CONTROL_CHARACTERS.test(raw)) {
    return INVALID_PHONE
  }

  const input = raw.replace(EDGE_SPACES, '')
  if (!input || !ALLOWED_CHARACTERS.test(input)) {
    return INVALID_PHONE
  }

  const hasPlus = input.includes('+')
  const explicitCountryCode =
    input.startsWith('+55') && !input.slice(1).includes('+')

  if (hasPlus && !explicitCountryCode) {
    return INVALID_PHONE
  }

  let compact = input.replace(FORMATTING_CHARACTERS, '')
  if (explicitCountryCode) {
    compact = compact.slice(1)
  }

  if (!/^\d+$/u.test(compact)) {
    return INVALID_PHONE
  }

  let digits = compact

  if (!explicitCountryCode && canRemoveDomesticTrunk(digits)) {
    digits = digits.slice(1)
  }

  if (explicitCountryCode) {
    if (!digits.startsWith('55')) {
      return INVALID_PHONE
    }
    digits = digits.slice(2)
  } else if (digits.length > 11 && digits.startsWith('55')) {
    digits = digits.slice(2)
  }

  if (digits.length !== 10 && digits.length !== 11) {
    return INVALID_PHONE
  }

  const ddd = digits.slice(0, 2)
  if (!BRAZILIAN_DDDS.has(ddd)) {
    return INVALID_PHONE
  }

  const subscriber = digits.slice(2)

  if (digits.length === 11) {
    if (!subscriber.startsWith('9')) {
      return INVALID_PHONE
    }

    return {
      kind: 'canonical',
      phone: digits,
      lookupCandidates: [digits],
      normalizedKey: digits,
    }
  }

  const subscriberPrefix = subscriber[0]
  if (subscriberPrefix >= '2' && subscriberPrefix <= '5') {
    return {
      kind: 'canonical',
      phone: digits,
      lookupCandidates: [digits],
      normalizedKey: digits,
    }
  }

  if (subscriberPrefix >= '6' && subscriberPrefix <= '9') {
    const currentPhone = `${ddd}9${subscriber}`
    return {
      kind: 'legacy-mobile',
      phone: currentPhone,
      lookupCandidates: [digits, currentPhone],
      normalizedKey: currentPhone,
    }
  }

  return INVALID_PHONE
}
