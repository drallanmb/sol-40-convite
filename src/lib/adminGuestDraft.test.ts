import { describe, expect, it } from 'vitest'
import {
  createAdminGuestDraft,
  reduceAdminGuestDraft,
  resetAdminGuestDrafts,
  type AdminFamilySnapshot,
} from './adminGuestDraft'

function family(overrides: Partial<AdminFamilySnapshot> = {}): AdminFamilySnapshot {
  return {
    id: 'family-a',
    displayName: 'Família A',
    phone: '79999999999',
    contact: 'Contato',
    updatedAt: 10,
    guests: [
      {
        id: 'guest-a',
        publicRef: 'guest_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        name: 'Ana',
        attendance: 'pending',
        sortOrder: 0,
      },
    ],
    ...overrides,
  }
}

describe('admin family draft reconciliation', () => {
  it('reconciles clean snapshots and preserves dirty fields with explicit conflict', () => {
    const clean = createAdminGuestDraft(family())
    const refreshed = reduceAdminGuestDraft(clean, {
      type: 'server-reconciled',
      snapshot: family({ displayName: 'Família atual', updatedAt: 11 }),
    })
    expect(refreshed.values.displayName).toBe('Família atual')
    expect(refreshed.conflict).toBe(false)

    const dirty = reduceAdminGuestDraft(refreshed, {
      type: 'family-field-changed',
      field: 'displayName',
      value: 'Minha edição',
    })
    const conflicted = reduceAdminGuestDraft(dirty, {
      type: 'server-reconciled',
      snapshot: family({ displayName: 'Edição da Soraya', updatedAt: 12 }),
    })
    expect(conflicted.values.displayName).toBe('Minha edição')
    expect(conflicted.conflict).toBe(true)
    expect(conflicted.expectedUpdatedAt).toBe(11)
    expect(conflicted.server.updatedAt).toBe(12)
  })

  it('retains drafts after errors, ignores stale success and accepts authoritative success', () => {
    const dirty = reduceAdminGuestDraft(createAdminGuestDraft(family()), {
      type: 'family-field-changed',
      field: 'contact',
      value: 'Novo contato',
    })
    const failed = reduceAdminGuestDraft(dirty, {
      type: 'save-failed',
      message: 'Falhou',
    })
    expect(failed.values.contact).toBe('Novo contato')
    expect(failed.error).toBe('Falhou')

    const stale = reduceAdminGuestDraft(failed, {
      type: 'save-succeeded',
      expectedUpdatedAt: 9,
      snapshot: family({ updatedAt: 11, contact: 'Resposta antiga' }),
    })
    expect(stale.values.contact).toBe('Novo contato')
    expect(stale.conflict).toBe(true)

    const saved = reduceAdminGuestDraft(failed, {
      type: 'save-succeeded',
      expectedUpdatedAt: 10,
      snapshot: family({ updatedAt: 11, contact: 'Novo contato' }),
    })
    expect(saved.values.contact).toBe('Novo contato')
    expect(saved.dirtyFields.size).toBe(0)
  })

  it('handles zero people, remote removal and phone warning intent', () => {
    const empty = createAdminGuestDraft(family({ guests: [] }))
    expect(empty.guestValues).toEqual({})

    const phone = reduceAdminGuestDraft(empty, {
      type: 'family-field-changed',
      field: 'phone',
      value: '(79) 98888-7777',
    })
    expect(phone.phoneChangeWarning).toBe(true)

    const removed = reduceAdminGuestDraft(
      reduceAdminGuestDraft(createAdminGuestDraft(family()), {
        type: 'guest-field-changed',
        guestId: 'guest-a',
        field: 'name',
        value: 'Ana editada',
      }),
      {
        type: 'server-reconciled',
        snapshot: family({ guests: [], updatedAt: 11 }),
      },
    )
    expect(removed.conflict).toBe(true)
    expect(removed.removedGuestIds).toEqual(new Set(['guest-a']))
  })

  it('clears every editor on logout or expiry', () => {
    const drafts = new Map([
      ['a', createAdminGuestDraft(family())],
      ['b', createAdminGuestDraft(family({ id: 'b', guests: [] }))],
    ])
    expect(resetAdminGuestDrafts(drafts).size).toBe(0)
  })
})
