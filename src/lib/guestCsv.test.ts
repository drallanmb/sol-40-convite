import { describe, expect, it } from 'vitest'
import { buildGuestImportPreview, parseGuestCsv } from './guestCsv'

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
