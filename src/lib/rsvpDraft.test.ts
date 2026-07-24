import { describe, expect, it } from 'vitest'
import {
  CONTACT_MAX_LENGTH,
  buildSparseCommand,
  countRsvpAttendance,
  createRsvpDraft,
  getRsvpSaveSuccessMessage,
  isRsvpDraftDirty,
  reduceRsvpDraft,
  validateRsvpContact,
  type RsvpFamilyView,
} from './rsvpDraft'

const LONG_NAME =
  'Maria das Dores do Nascimento Albuquerque e Silva que prefere o nome completo no convite'

function familyView(overrides: Partial<RsvpFamilyView> = {}): RsvpFamilyView {
  return {
    displayName: 'Convite da Sol',
    contact: 'sol@example.com',
    guests: [
      {
        guestRef: 'guest_11111111111111111111111111111111',
        name: 'Ana',
        attendance: 'pending',
      },
      {
        guestRef: 'guest_22222222222222222222222222222222',
        name: 'Beto',
        attendance: 'yes',
      },
      {
        guestRef: 'guest_33333333333333333333333333333333',
        name: LONG_NAME,
        attendance: 'no',
      },
    ],
    updatedAt: 1_784_921_600_000,
    ...overrides,
  }
}

describe('RSVP draft creation and dirty guest tracking', () => {
  it('keeps latest snapshot, local values, and dirty markers distinct', () => {
    const view = familyView()
    const state = createRsvpDraft(view)

    expect(state.latest).toEqual(view)
    expect(state.latest).not.toBe(view)
    expect(state.draft).toEqual({
      guestAttendance: {
        guest_11111111111111111111111111111111: 'pending',
        guest_22222222222222222222222222222222: 'yes',
        guest_33333333333333333333333333333333: 'no',
      },
      contact: 'sol@example.com',
    })
    expect(state.dirtyGuestRefs).toEqual(new Set())
    expect(state.contactDirty).toBe(false)
    expect(isRsvpDraftDirty(state)).toBe(false)
  })

  it('marks only the changed guest and becomes clean again when reverted', () => {
    const initial = createRsvpDraft(familyView())
    const changed = reduceRsvpDraft(initial, {
      type: 'guest_changed',
      guestRef: 'guest_11111111111111111111111111111111',
      attendance: 'yes',
    })

    expect(changed.dirtyGuestRefs).toEqual(
      new Set(['guest_11111111111111111111111111111111']),
    )
    expect(changed.latest.guests[0].attendance).toBe('pending')
    expect(changed.draft.guestAttendance.guest_11111111111111111111111111111111).toBe(
      'yes',
    )
    expect(isRsvpDraftDirty(changed)).toBe(true)

    const reverted = reduceRsvpDraft(changed, {
      type: 'guest_changed',
      guestRef: 'guest_11111111111111111111111111111111',
      attendance: 'pending',
    })

    expect(reverted.dirtyGuestRefs).toEqual(new Set())
    expect(isRsvpDraftDirty(reverted)).toBe(false)
  })

  it('ignores an unknown opaque guest reference instead of adding it to a command', () => {
    const initial = createRsvpDraft(familyView())
    const unchanged = reduceRsvpDraft(initial, {
      type: 'guest_changed',
      guestRef: 'guest_ffffffffffffffffffffffffffffffff',
      attendance: 'yes',
    })

    expect(unchanged).toBe(initial)
    expect(buildSparseCommand(unchanged).guestUpdates).toEqual([])
  })
})

describe('RSVP sparse command', () => {
  it('emits only the changed subset in server order and omits untouched people', () => {
    const firstChange = reduceRsvpDraft(createRsvpDraft(familyView()), {
      type: 'guest_changed',
      guestRef: 'guest_33333333333333333333333333333333',
      attendance: 'pending',
    })
    const secondChange = reduceRsvpDraft(firstChange, {
      type: 'guest_changed',
      guestRef: 'guest_11111111111111111111111111111111',
      attendance: 'yes',
    })

    expect(buildSparseCommand(secondChange)).toEqual({
      guestUpdates: [
        {
          guestRef: 'guest_11111111111111111111111111111111',
          attendance: 'yes',
        },
        {
          guestRef: 'guest_33333333333333333333333333333333',
          attendance: 'pending',
        },
      ],
      contact: { kind: 'unchanged' },
    })
  })

  it('preserves an explicit pending update', () => {
    const changed = reduceRsvpDraft(createRsvpDraft(familyView()), {
      type: 'guest_changed',
      guestRef: 'guest_22222222222222222222222222222222',
      attendance: 'pending',
    })

    expect(buildSparseCommand(changed).guestUpdates).toEqual([
      {
        guestRef: 'guest_22222222222222222222222222222222',
        attendance: 'pending',
      },
    ])
  })

  it('reconciles clean server changes without sending them in a stale full snapshot', () => {
    const locallyChanged = reduceRsvpDraft(createRsvpDraft(familyView()), {
      type: 'guest_changed',
      guestRef: 'guest_11111111111111111111111111111111',
      attendance: 'yes',
    })
    const serverChangedOtherGuest = familyView({
      guests: [
        familyView().guests[0],
        { ...familyView().guests[1], attendance: 'no' },
        familyView().guests[2],
      ],
      updatedAt: 1_784_921_600_500,
    })
    const reconciled = reduceRsvpDraft(locallyChanged, {
      type: 'server_reconciled',
      snapshot: serverChangedOtherGuest,
    })

    expect(reconciled.latest.guests[1].attendance).toBe('no')
    expect(reconciled.draft.guestAttendance.guest_22222222222222222222222222222222).toBe(
      'no',
    )
    expect(buildSparseCommand(reconciled).guestUpdates).toEqual([
      {
        guestRef: 'guest_11111111111111111111111111111111',
        attendance: 'yes',
      },
    ])
  })
})

describe('RSVP shared contact tri-state', () => {
  it('treats surrounding whitespace around the saved value as unchanged', () => {
    const changed = reduceRsvpDraft(createRsvpDraft(familyView()), {
      type: 'contact_changed',
      value: '  sol@example.com  ',
    })

    expect(changed.contactDirty).toBe(false)
    expect(buildSparseCommand(changed).contact).toEqual({ kind: 'unchanged' })
  })

  it('emits a trimmed set command for a new or changed contact', () => {
    const changed = reduceRsvpDraft(
      createRsvpDraft(familyView({ contact: undefined })),
      {
        type: 'contact_changed',
        value: '  (79) 99999-9999  ',
      },
    )

    expect(changed.contactDirty).toBe(true)
    expect(buildSparseCommand(changed).contact).toEqual({
      kind: 'set',
      value: '(79) 99999-9999',
    })
  })

  it('distinguishes intentional clear from untouched empty contact', () => {
    const cleared = reduceRsvpDraft(createRsvpDraft(familyView()), {
      type: 'contact_changed',
      value: '   ',
    })
    const untouchedEmpty = createRsvpDraft(familyView({ contact: undefined }))

    expect(buildSparseCommand(cleared).contact).toEqual({ kind: 'clear' })
    expect(buildSparseCommand(untouchedEmpty).contact).toEqual({
      kind: 'unchanged',
    })
  })

  it('provides exact 120/121-character client guidance', () => {
    expect(CONTACT_MAX_LENGTH).toBe(120)
    expect(validateRsvpContact('a'.repeat(120))).toEqual({
      length: 120,
      maxLength: 120,
      valid: true,
    })
    expect(validateRsvpContact('a'.repeat(121))).toEqual({
      length: 121,
      maxLength: 120,
      valid: false,
    })
  })
})

describe('RSVP counts and saved summaries', () => {
  it.each([
    {
      label: 'zero',
      guests: [],
      expected: { total: 0, yes: 0, pending: 0, no: 0 },
    },
    {
      label: 'one',
      guests: [familyView().guests[0]],
      expected: { total: 1, yes: 0, pending: 1, no: 0 },
    },
    {
      label: 'many',
      guests: familyView().guests,
      expected: { total: 3, yes: 1, pending: 1, no: 1 },
    },
  ])('counts $label guest collections without inference', ({ guests, expected }) => {
    expect(countRsvpAttendance(guests)).toEqual(expected)
  })

  it('keeps long names unchanged and out of the sparse command', () => {
    const initial = createRsvpDraft(familyView())
    const reconciled = reduceRsvpDraft(initial, {
      type: 'server_reconciled',
      snapshot: familyView({ updatedAt: initial.latest.updatedAt + 1 }),
    })

    expect(reconciled.latest.guests[2].name).toBe(LONG_NAME)
    expect(JSON.stringify(buildSparseCommand(reconciled))).not.toContain(LONG_NAME)
  })

  it('uses the exact neutral partial success copy while pending remains valid', () => {
    const partial = familyView({
      guests: [
        { ...familyView().guests[0], attendance: 'pending' },
        { ...familyView().guests[1], attendance: 'pending' },
        { ...familyView().guests[2], attendance: 'no' },
      ],
    })

    expect(getRsvpSaveSuccessMessage(partial)).toBe(
      'Respostas salvas. Ainda há 2 pessoa(s) pendente(s) — você pode voltar e completar depois.',
    )
  })

  it('uses the exact complete-attending success copy', () => {
    const complete = familyView({
      guests: familyView().guests.map((guest, index) => ({
        ...guest,
        attendance: index === 0 ? 'yes' : 'no',
      })),
    })

    expect(getRsvpSaveSuccessMessage(complete)).toBe(
      'Presenças salvas. Que alegria ter vocês com a Sol!',
    )
  })

  it('uses the exact warm all-no success copy', () => {
    const allNo = familyView({
      guests: familyView().guests.map((guest) => ({
        ...guest,
        attendance: 'no',
      })),
    })

    expect(getRsvpSaveSuccessMessage(allNo)).toBe(
      'Respostas salvas. Obrigada por avisar com carinho.',
    )
  })
})
