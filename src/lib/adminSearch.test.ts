import { describe, expect, it } from 'vitest'
import {
  filterFamilies,
  foldAdminSearchText,
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
