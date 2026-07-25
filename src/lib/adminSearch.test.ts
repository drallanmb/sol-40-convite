import { describe, expect, it } from 'vitest'
import {
  filterAdminWines,
  filterFamilies,
  foldAdminSearchText,
  groupAdminWinesByBand,
  guestResultCount,
  type AdminFamilySearchRecord,
} from './adminSearch'

const families: AdminFamilySearchRecord[] = [
  {
    id: 'a',
    displayName: 'Família João',
    phone: '(79) 99999-1234',
    guests: [
      { id: 'a1', name: 'Ágata', attendance: 'pending' },
      { id: 'a2', name: 'Beto', attendance: 'yes' },
    ],
  },
  {
    id: 'b',
    displayName: 'Convidados da Sol',
    phone: '(11) 3222-4567',
    guests: [{ id: 'b1', name: 'Carla', attendance: 'no' }],
  },
  {
    id: 'c',
    displayName: 'Família vazia',
    phone: '(71) 99999-0000',
    guests: [],
  },
]

describe('admin family search', () => {
  it('folds accents/case and matches partial names or phone digits', () => {
    expect(foldAdminSearchText(' JOÃO ')).toBe('joao')
    expect(filterFamilies(families, { query: 'joao', presence: 'all' })).toEqual([
      families[0],
    ])
    expect(filterFamilies(families, { query: 'AGAt', presence: 'all' })).toEqual([
      families[0],
    ])
    expect(filterFamilies(families, { query: '999123', presence: 'all' })).toEqual([
      families[0],
    ])
  })

  it('returns the full mixed family when any child matches presence', () => {
    const result = filterFamilies(families, {
      query: '',
      presence: 'pending',
    })
    expect(result).toEqual([families[0]])
    expect(result[0].guests).toHaveLength(2)
    expect(result[0].guests.map((guest) => guest.attendance)).toEqual([
      'pending',
      'yes',
    ])
  })

  it('keeps zero-person families in all and never mutates the reactive DTO', () => {
    const before = structuredClone(families)
    const result = filterFamilies(families, { query: '', presence: 'all' })
    expect(result).toEqual(families)
    expect(result).not.toBe(families)
    expect(result[2]).toBe(families[2])
    expect(families).toEqual(before)
    expect(guestResultCount(result)).toBe(3)
  })
})

describe('admin wine search and canonical bands', () => {
  const wines = [
    {
      id: '1',
      name: 'Château Sol',
      productCode: '0699230',
      category: 'ate-200' as const,
      status: 'gifted' as const,
      giftedBy: 'Ágata',
    },
    {
      id: '2',
      name: 'Vinho Lua',
      productCode: '39778',
      category: '350-500' as const,
      status: 'available' as const,
    },
  ]

  it('matches wine, Mistral code and presenter with accent/case folding', () => {
    expect(filterAdminWines(wines, { query: 'CHATEAU', status: 'gifted' })).toEqual([
      wines[0],
    ])
    expect(filterAdminWines(wines, { query: '69923', status: 'gifted' })).toEqual([
      wines[0],
    ])
    expect(filterAdminWines(wines, { query: 'agata', status: 'gifted' })).toEqual([
      wines[0],
    ])
  })

  it('keeps canonical band order and omits empty bands', () => {
    expect(groupAdminWinesByBand(wines).map((group) => group.category)).toEqual([
      'ate-200',
      '350-500',
    ])
  })
})
