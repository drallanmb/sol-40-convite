import type { AdminPresence } from './adminSearch'

export type AdminGuestSnapshot = {
  id: string
  publicRef: string
  name: string
  attendance: AdminPresence
  respondedAt?: number
  sortOrder: number
}

export type AdminFamilySnapshot = {
  id: string
  displayName: string
  phone: string
  contact?: string
  updatedAt: number
  guests: readonly AdminGuestSnapshot[]
}

type FamilyField = 'displayName' | 'phone' | 'contact'
type GuestField = 'name' | 'attendance'

export type AdminGuestDraftState = {
  server: AdminFamilySnapshot
  expectedUpdatedAt: number
  values: { displayName: string; phone: string; contact: string }
  guestValues: Record<string, { name: string; attendance: AdminPresence }>
  dirtyFields: ReadonlySet<FamilyField>
  dirtyGuestFields: ReadonlyMap<string, ReadonlySet<GuestField>>
  removedGuestIds: ReadonlySet<string>
  conflict: boolean
  phoneChangeWarning: boolean
  error: string | null
}

export type AdminGuestDraftAction =
  | { type: 'family-field-changed'; field: FamilyField; value: string }
  | {
      type: 'guest-field-changed'
      guestId: string
      field: GuestField
      value: string
    }
  | { type: 'server-reconciled'; snapshot: AdminFamilySnapshot }
  | { type: 'save-failed'; message: string }
  | {
      type: 'save-succeeded'
      expectedUpdatedAt: number
      snapshot: AdminFamilySnapshot
    }
  | { type: 'reload-current' }

function cloneSnapshot(snapshot: AdminFamilySnapshot): AdminFamilySnapshot {
  return { ...snapshot, guests: snapshot.guests.map((guest) => ({ ...guest })) }
}

export function createAdminGuestDraft(
  snapshot: AdminFamilySnapshot,
): AdminGuestDraftState {
  const server = cloneSnapshot(snapshot)
  return {
    server,
    expectedUpdatedAt: server.updatedAt,
    values: {
      displayName: server.displayName,
      phone: server.phone,
      contact: server.contact ?? '',
    },
    guestValues: Object.fromEntries(
      server.guests.map((guest) => [
        guest.id,
        { name: guest.name, attendance: guest.attendance },
      ]),
    ),
    dirtyFields: new Set(),
    dirtyGuestFields: new Map(),
    removedGuestIds: new Set(),
    conflict: false,
    phoneChangeWarning: false,
    error: null,
  }
}

function hasDirty(state: AdminGuestDraftState) {
  return state.dirtyFields.size > 0 || state.dirtyGuestFields.size > 0
}

function reconcile(
  state: AdminGuestDraftState,
  snapshot: AdminFamilySnapshot,
): AdminGuestDraftState {
  const server = cloneSnapshot(snapshot)
  if (!hasDirty(state)) return createAdminGuestDraft(server)

  const guestValues = { ...state.guestValues }
  const removedGuestIds = new Set<string>()
  const serverGuestIds = new Set(server.guests.map((guest) => guest.id))
  for (const guestId of state.dirtyGuestFields.keys()) {
    if (!serverGuestIds.has(guestId)) removedGuestIds.add(guestId)
  }
  for (const guest of server.guests) {
    if (!state.dirtyGuestFields.has(guest.id)) {
      guestValues[guest.id] = {
        name: guest.name,
        attendance: guest.attendance,
      }
    }
  }
  return {
    ...state,
    server,
    guestValues,
    removedGuestIds,
    conflict: server.updatedAt !== state.expectedUpdatedAt,
    error: null,
  }
}

export function reduceAdminGuestDraft(
  state: AdminGuestDraftState,
  action: AdminGuestDraftAction,
): AdminGuestDraftState {
  switch (action.type) {
    case 'family-field-changed': {
      const saved = action.field === 'contact'
        ? state.server.contact ?? ''
        : state.server[action.field]
      const dirtyFields = new Set(state.dirtyFields)
      if (action.value === saved) dirtyFields.delete(action.field)
      else dirtyFields.add(action.field)
      return {
        ...state,
        values: { ...state.values, [action.field]: action.value },
        dirtyFields,
        phoneChangeWarning:
          action.field === 'phone'
            ? action.value !== state.server.phone
            : state.phoneChangeWarning,
        error: null,
      }
    }
    case 'guest-field-changed': {
      const saved = state.server.guests.find((guest) => guest.id === action.guestId)
      if (!saved) return state
      const current = state.guestValues[action.guestId]
      const next = { ...current, [action.field]: action.value } as {
        name: string
        attendance: AdminPresence
      }
      const fields = new Set(state.dirtyGuestFields.get(action.guestId) ?? [])
      if (next[action.field] === saved[action.field]) fields.delete(action.field)
      else fields.add(action.field)
      const dirtyGuestFields = new Map(state.dirtyGuestFields)
      if (fields.size === 0) dirtyGuestFields.delete(action.guestId)
      else dirtyGuestFields.set(action.guestId, fields)
      return {
        ...state,
        guestValues: { ...state.guestValues, [action.guestId]: next },
        dirtyGuestFields,
        error: null,
      }
    }
    case 'server-reconciled':
      return reconcile(state, action.snapshot)
    case 'save-failed':
      return { ...state, error: action.message }
    case 'save-succeeded':
      return action.expectedUpdatedAt === state.expectedUpdatedAt
        ? createAdminGuestDraft(action.snapshot)
        : { ...state, server: cloneSnapshot(action.snapshot), conflict: true }
    case 'reload-current':
      return createAdminGuestDraft(state.server)
  }
}

export function resetAdminGuestDrafts(
  _drafts: ReadonlyMap<string, AdminGuestDraftState>,
) {
  return new Map<string, AdminGuestDraftState>()
}
