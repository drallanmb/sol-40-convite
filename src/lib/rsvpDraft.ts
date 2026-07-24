import { RSVP_COPY } from '../content/event'

export const CONTACT_MAX_LENGTH = 120

export type RsvpAttendance = 'pending' | 'yes' | 'no'

export type RsvpGuestView = {
  guestRef: string
  name: string
  attendance: RsvpAttendance
}

export type RsvpFamilyView = {
  displayName: string
  contact?: string
  guests: RsvpGuestView[]
  updatedAt: number
}

export type RsvpDraftValues = {
  guestAttendance: Record<string, RsvpAttendance>
  contact: string
}

export type RsvpDraftState = {
  latest: RsvpFamilyView
  draft: RsvpDraftValues
  dirtyGuestRefs: ReadonlySet<string>
  contactDirty: boolean
}

export type RsvpDraftAction =
  | {
      type: 'guest_changed'
      guestRef: string
      attendance: RsvpAttendance
    }
  | {
      type: 'contact_changed'
      value: string
    }
  | {
      type: 'server_reconciled'
      snapshot: RsvpFamilyView
    }

export type RsvpSparseCommand = {
  guestUpdates: Array<{
    guestRef: string
    attendance: RsvpAttendance
  }>
  contact:
    | { kind: 'unchanged' }
    | { kind: 'set'; value: string }
    | { kind: 'clear' }
}

export type RsvpAttendanceCounts = {
  total: number
  yes: number
  pending: number
  no: number
}

function cloneFamilyView(view: RsvpFamilyView): RsvpFamilyView {
  return {
    ...view,
    guests: view.guests.map((guest) => ({ ...guest })),
  }
}

function normalizedContact(value: string | undefined) {
  const normalized = value?.trim() ?? ''
  return normalized || undefined
}

function draftValuesFromSnapshot(snapshot: RsvpFamilyView): RsvpDraftValues {
  return {
    guestAttendance: Object.fromEntries(
      snapshot.guests.map((guest) => [guest.guestRef, guest.attendance]),
    ),
    contact: snapshot.contact ?? '',
  }
}

export function createRsvpDraft(snapshot: RsvpFamilyView): RsvpDraftState {
  const latest = cloneFamilyView(snapshot)

  return {
    latest,
    draft: draftValuesFromSnapshot(latest),
    dirtyGuestRefs: new Set(),
    contactDirty: false,
  }
}

function changeGuest(
  state: RsvpDraftState,
  guestRef: string,
  attendance: RsvpAttendance,
): RsvpDraftState {
  const savedGuest = state.latest.guests.find((guest) => guest.guestRef === guestRef)
  if (!savedGuest) return state

  const dirtyGuestRefs = new Set(state.dirtyGuestRefs)
  if (savedGuest.attendance === attendance) {
    dirtyGuestRefs.delete(guestRef)
  } else {
    dirtyGuestRefs.add(guestRef)
  }

  return {
    ...state,
    draft: {
      ...state.draft,
      guestAttendance: {
        ...state.draft.guestAttendance,
        [guestRef]: attendance,
      },
    },
    dirtyGuestRefs,
  }
}

function changeContact(state: RsvpDraftState, value: string): RsvpDraftState {
  return {
    ...state,
    draft: {
      ...state.draft,
      contact: value,
    },
    contactDirty: normalizedContact(value) !== normalizedContact(state.latest.contact),
  }
}

function reconcileServer(
  state: RsvpDraftState,
  snapshot: RsvpFamilyView,
): RsvpDraftState {
  const latest = cloneFamilyView(snapshot)
  const guestAttendance: Record<string, RsvpAttendance> = {}
  const dirtyGuestRefs = new Set<string>()

  for (const guest of latest.guests) {
    const localValue = state.draft.guestAttendance[guest.guestRef]
    const draftValue =
      state.dirtyGuestRefs.has(guest.guestRef) && localValue !== undefined
        ? localValue
        : guest.attendance

    guestAttendance[guest.guestRef] = draftValue
    if (draftValue !== guest.attendance) {
      dirtyGuestRefs.add(guest.guestRef)
    }
  }

  const contact = state.contactDirty ? state.draft.contact : (latest.contact ?? '')

  return {
    latest,
    draft: {
      guestAttendance,
      contact,
    },
    dirtyGuestRefs,
    contactDirty: normalizedContact(contact) !== normalizedContact(latest.contact),
  }
}

export function reduceRsvpDraft(
  state: RsvpDraftState,
  action: RsvpDraftAction,
): RsvpDraftState {
  switch (action.type) {
    case 'guest_changed':
      return changeGuest(state, action.guestRef, action.attendance)
    case 'contact_changed':
      return changeContact(state, action.value)
    case 'server_reconciled':
      return reconcileServer(state, action.snapshot)
  }
}

export function buildSparseCommand(state: RsvpDraftState): RsvpSparseCommand {
  const guestUpdates = state.latest.guests.flatMap((guest) => {
    if (!state.dirtyGuestRefs.has(guest.guestRef)) return []

    const attendance = state.draft.guestAttendance[guest.guestRef]
    return attendance === undefined
      ? []
      : [
          {
            guestRef: guest.guestRef,
            attendance,
          },
        ]
  })

  let contact: RsvpSparseCommand['contact'] = { kind: 'unchanged' }
  if (state.contactDirty) {
    const value = normalizedContact(state.draft.contact)
    contact = value === undefined ? { kind: 'clear' } : { kind: 'set', value }
  }

  return {
    guestUpdates,
    contact,
  }
}

export function isRsvpDraftDirty(state: RsvpDraftState) {
  return state.dirtyGuestRefs.size > 0 || state.contactDirty
}

export function validateRsvpContact(value: string) {
  const length = value.trim().length

  return {
    length,
    maxLength: CONTACT_MAX_LENGTH,
    valid: length <= CONTACT_MAX_LENGTH,
  }
}

export function countRsvpAttendance(
  guests: ReadonlyArray<Pick<RsvpGuestView, 'attendance'>>,
): RsvpAttendanceCounts {
  return guests.reduce<RsvpAttendanceCounts>(
    (counts, guest) => {
      counts.total += 1
      counts[guest.attendance] += 1
      return counts
    },
    {
      total: 0,
      yes: 0,
      pending: 0,
      no: 0,
    },
  )
}

export function getRsvpSaveSuccessMessage(view: RsvpFamilyView) {
  const counts = countRsvpAttendance(view.guests)

  if (counts.pending > 0) {
    return RSVP_COPY.save.partial.replace('{pending}', String(counts.pending))
  }
  if (counts.yes > 0) {
    return RSVP_COPY.save.completeAttending
  }
  return RSVP_COPY.save.completeNotAttending
}
