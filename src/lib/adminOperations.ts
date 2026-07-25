export type ModerationStatus = 'pendente' | 'aprovado' | 'oculto'
export type ModerationTab = ModerationStatus

const MODERATION_TABS = new Set<ModerationTab>([
  'pendente',
  'aprovado',
  'oculto',
])

const MODERATION_TARGETS: Record<
  ModerationStatus,
  readonly ModerationStatus[]
> = {
  pendente: ['aprovado', 'oculto'],
  aprovado: ['oculto'],
  oculto: ['aprovado'],
}

export function parseModerationTab(value: string | null): ModerationTab {
  return value && MODERATION_TABS.has(value as ModerationTab)
    ? (value as ModerationTab)
    : 'pendente'
}

export function moderationTargets(status: ModerationStatus) {
  return MODERATION_TARGETS[status]
}

export type ModerationUndoCommand = {
  postId: string
  priorStatus: ModerationStatus
  expectedStatus: ModerationStatus
  expectedRevision: number
  expiresAt: number
}

export type ModerationUndoState =
  | { kind: 'idle' }
  | { kind: 'available'; command: ModerationUndoCommand }
  | { kind: 'submitting'; command: ModerationUndoCommand }
  | { kind: 'conflict' }
  | { kind: 'undone' }

export type ModerationUndoAction =
  | { type: 'offer'; command: Omit<ModerationUndoCommand, 'expiresAt'>; now: number }
  | { type: 'expire'; now: number }
  | { type: 'submit'; now: number }
  | { type: 'success' }
  | { type: 'conflict' }
  | { type: 'auth_lost' }
  | { type: 'dismiss' }

export const MODERATION_UNDO_MS = 8_000

export function moderationUndoReducer(
  state: ModerationUndoState,
  action: ModerationUndoAction,
): ModerationUndoState {
  if (action.type === 'offer') {
    return {
      kind: 'available',
      command: {
        ...action.command,
        expiresAt: action.now + MODERATION_UNDO_MS,
      },
    }
  }
  if (action.type === 'auth_lost' || action.type === 'dismiss') return { kind: 'idle' }
  if (action.type === 'success') return { kind: 'undone' }
  if (action.type === 'conflict') return { kind: 'conflict' }
  if (state.kind !== 'available') return state
  if (action.type === 'expire') {
    return action.now >= state.command.expiresAt ? { kind: 'idle' } : state
  }
  if (action.type === 'submit') {
    return action.now >= state.command.expiresAt
      ? { kind: 'idle' }
      : { kind: 'submitting', command: state.command }
  }
  return state
}
