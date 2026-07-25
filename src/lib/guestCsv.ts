import Papa from 'papaparse'
import {
  MAX_RSVP_GUESTS,
  RSVP_DISPLAY_NAME_MAX_LENGTH,
  RSVP_GUEST_NAME_MAX_LENGTH,
} from '../../convex/rsvpModel'
import { normalizePhone } from './phone'

export const GUEST_CSV_MAX_BYTES = 1024 * 1024
export const GUEST_CSV_MAX_ROWS = 2_000
export const GUEST_IMPORT_MAX_FAMILIES = 25
export const GUEST_IMPORT_MAX_PEOPLE = 100

const GUEST_CSV_HEADERS = ['familia', 'telefone', 'convidado'] as const

export type GuestImportIssueCode =
  | 'invalid_header'
  | 'file_too_large'
  | 'too_many_rows'
  | 'invalid_family'
  | 'invalid_phone'
  | 'invalid_guest'
  | 'duplicate_guest'
  | 'phone_family_conflict'

export type GuestImportIssue = {
  row: number
  code: GuestImportIssueCode
  detail: string
}

export type ParsedGuestCsvRow = {
  sourceRow: number
  familia: string
  telefone: string
  convidado: string
}

export type ParsedGuestCsv =
  | {
      kind: 'ready'
      rows: ParsedGuestCsvRow[]
    }
  | {
      kind: 'invalid'
      sourceRows: number
      issues: GuestImportIssue[]
    }

export type ValidFamilyGroup = {
  sourceRows: number[]
  displayName: string
  phone: string
  normalizedKey: string
  guests: Array<{ sourceRow: number; name: string }>
}

export type GuestImportPreview = {
  groups: ValidFamilyGroup[]
  ignored: GuestImportIssue[]
  totals: {
    sourceRows: number
    validRows: number
    ignoredRows: number
    families: number
    people: number
  }
}

function normalizedHeader(value: string) {
  return value.replace(/^\uFEFF/u, '').trim().toLocaleLowerCase('pt-BR')
}

function normalizedText(value: string) {
  return value.trim().replace(/\s+/gu, ' ')
}

function familyIdentity(value: string) {
  return normalizedText(value).normalize('NFKC').toLocaleLowerCase('pt-BR')
}

function headerIssue(detail: string): ParsedGuestCsv {
  return {
    kind: 'invalid',
    sourceRows: 0,
    issues: [{ row: 1, code: 'invalid_header', detail }],
  }
}

export async function parseGuestCsv(source: Blob | string): Promise<ParsedGuestCsv> {
  if (typeof source !== 'string' && source.size > GUEST_CSV_MAX_BYTES) {
    return {
      kind: 'invalid',
      sourceRows: 0,
      issues: [
        {
          row: 1,
          code: 'file_too_large',
          detail: 'O arquivo deve ter no máximo 1 MiB.',
        },
      ],
    }
  }

  const contents = typeof source === 'string' ? source : await source.text()
  if (new TextEncoder().encode(contents).byteLength > GUEST_CSV_MAX_BYTES) {
    return {
      kind: 'invalid',
      sourceRows: 0,
      issues: [
        {
          row: 1,
          code: 'file_too_large',
          detail: 'O arquivo deve ter no máximo 1 MiB.',
        },
      ],
    }
  }

  const parsed = Papa.parse<Record<string, string>>(contents, {
    header: true,
    delimiter: '',
    dynamicTyping: false,
    skipEmptyLines: 'greedy',
    transformHeader: normalizedHeader,
  })
  const fields = parsed.meta.fields ?? []
  if (
    fields.length !== GUEST_CSV_HEADERS.length ||
    new Set(fields).size !== fields.length ||
    !GUEST_CSV_HEADERS.every((header) => fields.includes(header))
  ) {
    return headerIssue(
      'Use somente os cabeçalhos familia, telefone e convidado, em qualquer ordem.',
    )
  }

  if (parsed.errors.some((error) => error.type === 'Delimiter' || error.type === 'Quotes')) {
    return headerIssue('O arquivo CSV está malformado e não pôde ser lido.')
  }
  if (parsed.data.length > GUEST_CSV_MAX_ROWS) {
    return {
      kind: 'invalid',
      sourceRows: parsed.data.length,
      issues: [
        {
          row: GUEST_CSV_MAX_ROWS + 2,
          code: 'too_many_rows',
          detail: `O arquivo deve ter no máximo ${GUEST_CSV_MAX_ROWS} registros.`,
        },
      ],
    }
  }

  return {
    kind: 'ready',
    rows: parsed.data.map((row, index) => ({
      sourceRow: index + 2,
      familia: String(row.familia ?? ''),
      telefone: String(row.telefone ?? ''),
      convidado: String(row.convidado ?? ''),
    })),
  }
}

export function buildGuestImportPreview(parsed: ParsedGuestCsv): GuestImportPreview {
  if (parsed.kind === 'invalid') {
    return {
      groups: [],
      ignored: parsed.issues,
      totals: {
        sourceRows: parsed.sourceRows,
        validRows: 0,
        ignoredRows: parsed.sourceRows,
        families: 0,
        people: 0,
      },
    }
  }

  const ignored: GuestImportIssue[] = []
  const groups = new Map<string, ValidFamilyGroup>()

  for (const row of parsed.rows) {
    const displayName = normalizedText(row.familia)
    if (!displayName || displayName.length > RSVP_DISPLAY_NAME_MAX_LENGTH) {
      ignored.push({
        row: row.sourceRow,
        code: 'invalid_family',
        detail: 'Informe um nome de família válido.',
      })
      continue
    }
    const normalizedPhone = normalizePhone(row.telefone)
    if (normalizedPhone.kind === 'invalid') {
      ignored.push({
        row: row.sourceRow,
        code: 'invalid_phone',
        detail: 'Informe um telefone brasileiro válido.',
      })
      continue
    }
    const guestName = normalizedText(row.convidado)
    if (!guestName || guestName.length > RSVP_GUEST_NAME_MAX_LENGTH) {
      ignored.push({
        row: row.sourceRow,
        code: 'invalid_guest',
        detail: 'Informe um nome de convidado válido.',
      })
      continue
    }

    const key = `${normalizedPhone.normalizedKey}\u0000${familyIdentity(displayName)}`
    const existing = groups.get(key)
    if (existing) {
      if (existing.guests.length >= MAX_RSVP_GUESTS) {
        ignored.push({
          row: row.sourceRow,
          code: 'invalid_guest',
          detail: `Uma família pode ter no máximo ${MAX_RSVP_GUESTS} pessoas.`,
        })
        continue
      }
      existing.sourceRows.push(row.sourceRow)
      existing.guests.push({ sourceRow: row.sourceRow, name: guestName })
    } else {
      groups.set(key, {
        sourceRows: [row.sourceRow],
        displayName,
        phone: normalizedPhone.phone,
        normalizedKey: normalizedPhone.normalizedKey,
        guests: [{ sourceRow: row.sourceRow, name: guestName }],
      })
    }
  }

  const validGroups = [...groups.values()]
  const people = validGroups.reduce((total, group) => total + group.guests.length, 0)
  return {
    groups: validGroups,
    ignored,
    totals: {
      sourceRows: parsed.rows.length,
      validRows: people,
      ignoredRows: ignored.length,
      families: validGroups.length,
      people,
    },
  }
}

export function createGuestCsvTemplate() {
  return `\uFEFF${GUEST_CSV_HEADERS.join(',')}\r\n`
}

export function chunkGuestImportGroups(groups: ValidFamilyGroup[]) {
  const batches: ValidFamilyGroup[][] = []
  let current: ValidFamilyGroup[] = []
  let people = 0

  for (const group of groups) {
    if (
      current.length > 0 &&
      (current.length >= GUEST_IMPORT_MAX_FAMILIES ||
        people + group.guests.length > GUEST_IMPORT_MAX_PEOPLE)
    ) {
      batches.push(current)
      current = []
      people = 0
    }
    current.push(group)
    people += group.guests.length
  }
  if (current.length > 0) batches.push(current)
  return batches
}
