import { describe, expect, it } from 'vitest'
import {
  GUEST_CSV_MAX_BYTES,
  GUEST_CSV_MAX_ROWS,
  buildGuestImportPreview,
  chunkGuestImportGroups,
  createGuestCsvTemplate,
  parseGuestCsv,
  type ValidFamilyGroup,
} from './guestCsv'

async function preview(csv: string) {
  return buildGuestImportPreview(await parseGuestCsv(csv))
}

describe('csv guest import tracer', () => {
  it('previews one fictitious family with two people from a UTF-8 file', async () => {
    const file = new File(
      [
        [
          'familia,telefone,convidado',
          'Família Horizonte,(79) 99999-4101,Ana Horizonte',
          'Família Horizonte,(79) 99999-4101,Beto Horizonte',
        ].join('\n'),
      ],
      'convidados-ficticios.csv',
      { type: 'text/csv;charset=utf-8' },
    )

    const parsed = await parseGuestCsv(file)
    const preview = buildGuestImportPreview(parsed)

    expect(preview.ignored).toEqual([])
    expect(preview.totals).toEqual({
      sourceRows: 2,
      validRows: 2,
      ignoredRows: 0,
      families: 1,
      people: 2,
    })
    expect(preview.groups).toEqual([
      {
        sourceRows: [2, 3],
        displayName: 'Família Horizonte',
        phone: '79999994101',
        normalizedKey: '79999994101',
        guests: [
          { sourceRow: 2, name: 'Ana Horizonte' },
          { sourceRow: 3, name: 'Beto Horizonte' },
        ],
      },
    ])
  })
})

describe('csv parser formats and boundaries', () => {
  it('accepts BOM, CRLF, semicolon delimiter and headers in any order', async () => {
    const result = await preview(
      '\uFEFFconvidado; telefone ; FAMILIA\r\n' +
        'Pessoa Fictícia;(79) 99999-4201;Família Aurora\r\n',
    )

    expect(result.ignored).toEqual([])
    expect(result.groups[0]).toMatchObject({
      displayName: 'Família Aurora',
      phone: '79999994201',
      guests: [{ sourceRow: 2, name: 'Pessoa Fictícia' }],
    })
  })

  it('keeps quoted commas and newlines inside one source record', async () => {
    const result = await preview(
      [
        'familia,telefone,convidado',
        '"Família, Mar","(79) 99999-4202","Pessoa',
        'com nome longo"',
        'Família Sol,(79) 99999-4203,Outra Pessoa',
      ].join('\n'),
    )

    expect(result.groups).toHaveLength(2)
    expect(result.groups[0]).toMatchObject({
      displayName: 'Família, Mar',
      guests: [{ sourceRow: 2, name: 'Pessoa com nome longo' }],
    })
    expect(result.groups[1].guests[0].sourceRow).toBe(3)
  })

  it.each([
    ['missing', 'familia,telefone\nFamília A,(79) 99999-4204'],
    [
      'repeated',
      'familia,telefone,convidado,convidado\nFamília A,(79) 99999-4204,Ana,Ana',
    ],
    [
      'extra',
      'familia,telefone,convidado,presenca\nFamília A,(79) 99999-4204,Ana,sim',
    ],
    [
      'attendance',
      'familia,telefone,convidado,attendance\nFamília A,(79) 99999-4204,Ana,yes',
    ],
  ])('rejects %s headers without creating groups', async (_case, csv) => {
    const result = await preview(csv)
    expect(result.groups).toEqual([])
    expect(result.ignored).toEqual([
      expect.objectContaining({ row: 1, code: 'invalid_header' }),
    ])
  })

  it('rejects files above 1 MiB before producing rows', async () => {
    const parsed = await parseGuestCsv(
      new File(['x'.repeat(GUEST_CSV_MAX_BYTES + 1)], 'muito-grande.csv'),
    )
    expect(parsed).toMatchObject({
      kind: 'invalid',
      issues: [{ row: 1, code: 'file_too_large' }],
    })
  })

  it('rejects more than 2,000 CSV records', async () => {
    const rows = Array.from(
      { length: GUEST_CSV_MAX_ROWS + 1 },
      (_, index) => `Família ${index},(79) 99999-4205,Pessoa ${index}`,
    )
    const parsed = await parseGuestCsv(
      ['familia,telefone,convidado', ...rows].join('\n'),
    )
    expect(parsed).toMatchObject({
      kind: 'invalid',
      sourceRows: GUEST_CSV_MAX_ROWS + 1,
      issues: [
        {
          row: GUEST_CSV_MAX_ROWS + 2,
          code: 'too_many_rows',
          detail: expect.any(String),
        },
      ],
    })
  })
})

describe('csv preview normalization and partial issues', () => {
  it('collapses whitespace and groups legacy/current phones by one logical key', async () => {
    const result = await preview(
      [
        'familia,telefone,convidado',
        '  Família   Brisa  ,(79) 9999-4206,  Ana   Brisa ',
        'família brisa,(79) 99999-4206,Beto Brisa',
      ].join('\n'),
    )
    expect(result.ignored).toEqual([])
    expect(result.groups).toEqual([
      expect.objectContaining({
        sourceRows: [2, 3],
        displayName: 'Família Brisa',
        phone: '79999994206',
        normalizedKey: '79999994206',
        guests: [
          { sourceRow: 2, name: 'Ana Brisa' },
          { sourceRow: 3, name: 'Beto Brisa' },
        ],
      }),
    ])
  })

  it('keeps the first duplicate guest and reports later source rows', async () => {
    const result = await preview(
      [
        'familia,telefone,convidado',
        'Família Lua,(79) 99999-4207,Ana Lua',
        'família lua,(79) 99999-4207,  ana   lua ',
        'Família Lua,(79) 99999-4207,Beto Lua',
      ].join('\n'),
    )
    expect(result.groups[0].guests).toEqual([
      { sourceRow: 2, name: 'Ana Lua' },
      { sourceRow: 4, name: 'Beto Lua' },
    ])
    expect(result.ignored).toEqual([
      expect.objectContaining({ row: 3, code: 'duplicate_guest' }),
    ])
    expect(result.totals).toEqual({
      sourceRows: 3,
      validRows: 2,
      ignoredRows: 1,
      families: 1,
      people: 2,
    })
  })

  it('rejects every incompatible family for one logical phone but keeps unrelated rows', async () => {
    const result = await preview(
      [
        'familia,telefone,convidado',
        'Família Norte,(79) 9999-4208,Ana Norte',
        'Família Sul,(79) 99999-4208,Beto Sul',
        'Família Leste,(79) 99999-4209,Cris Leste',
      ].join('\n'),
    )
    expect(result.groups).toEqual([
      expect.objectContaining({
        displayName: 'Família Leste',
        sourceRows: [4],
      }),
    ])
    expect(result.ignored).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ row: 2, code: 'phone_family_conflict' }),
        expect.objectContaining({ row: 3, code: 'phone_family_conflict' }),
      ]),
    )
  })

  it('reports family, phone and guest errors without losing a valid group', async () => {
    const result = await preview(
      [
        'familia,telefone,convidado',
        ',(79) 99999-4210,Pessoa sem família',
        'Família Inválida,telefone,Pessoa sem telefone',
        'Família Vazia,(79) 99999-4211,',
        'Família Válida,(79) 99999-4212,Pessoa Válida',
      ].join('\n'),
    )
    expect(result.groups).toHaveLength(1)
    expect(result.groups[0].sourceRows).toEqual([5])
    expect(result.ignored.map((issue) => [issue.row, issue.code])).toEqual([
      [2, 'invalid_family'],
      [3, 'invalid_phone'],
      [4, 'invalid_guest'],
    ])
  })
})

describe('csv template and deterministic batches', () => {
  it('creates only a BOM and the three approved headers', () => {
    expect(createGuestCsvTemplate()).toBe(
      '\uFEFFfamilia,telefone,convidado\r\n',
    )
  })

  it('never emits a batch above 25 families or 100 people', () => {
    const group = (
      familyIndex: number,
      people: number,
    ): ValidFamilyGroup => ({
      sourceRows: Array.from({ length: people }, (_, index) => familyIndex * 100 + index + 2),
      displayName: `Família ${familyIndex}`,
      phone: `7999999${String(familyIndex).padStart(4, '0')}`,
      normalizedKey: `7999999${String(familyIndex).padStart(4, '0')}`,
      guests: Array.from({ length: people }, (_, index) => ({
        sourceRow: familyIndex * 100 + index + 2,
        name: `Pessoa ${familyIndex}-${index}`,
      })),
    })
    const batches = chunkGuestImportGroups([
      group(0, 40),
      group(1, 40),
      group(2, 40),
      ...Array.from({ length: 26 }, (_, index) => group(index + 3, 1)),
    ])
    for (const batch of batches) {
      expect(batch.length).toBeLessThanOrEqual(25)
      expect(
        batch.reduce((total, family) => total + family.guests.length, 0),
      ).toBeLessThanOrEqual(100)
    }
    expect(batches.flat()).toHaveLength(29)
  })
})
