import { useCallback, useRef, useState } from 'react'

export type PendingIdsAction =
  | { type: 'begin'; id: string }
  | { type: 'settle'; id: string }
  | { type: 'clear' }

export function pendingIdsReducer(
  pendingIds: ReadonlySet<string>,
  action: PendingIdsAction,
): ReadonlySet<string> {
  if (action.type === 'clear') {
    return pendingIds.size === 0 ? pendingIds : new Set()
  }
  if (action.type === 'begin') {
    if (pendingIds.has(action.id)) return pendingIds
    return new Set(pendingIds).add(action.id)
  }
  if (!pendingIds.has(action.id)) return pendingIds
  const next = new Set(pendingIds)
  next.delete(action.id)
  return next
}

export type PendingOperationResult<T> =
  | { started: false }
  | { started: true; value: T }

export type PendingOperationScope = {
  isCurrent: () => boolean
  isLatest: () => boolean
}

export function usePendingOperations() {
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const tokensRef = useRef(new Map<string, symbol>())
  const latestTokenRef = useRef<symbol | null>(null)

  const run = useCallback(
    <T,>(
      id: string,
      operation: (scope: PendingOperationScope) => Promise<T>,
    ): Promise<PendingOperationResult<T>> => {
      if (tokensRef.current.has(id)) {
        return Promise.resolve({ started: false })
      }

      const token = Symbol(id)
      tokensRef.current.set(id, token)
      latestTokenRef.current = token
      setPendingIds((current) =>
        pendingIdsReducer(current, { type: 'begin', id }),
      )
      const scope: PendingOperationScope = {
        isCurrent: () => tokensRef.current.get(id) === token,
        isLatest: () => latestTokenRef.current === token,
      }

      return (async () => {
        try {
          return { started: true, value: await operation(scope) } as const
        } finally {
          if (tokensRef.current.get(id) === token) {
            tokensRef.current.delete(id)
            setPendingIds((current) =>
              pendingIdsReducer(current, { type: 'settle', id }),
            )
          }
          if (latestTokenRef.current === token) latestTokenRef.current = null
        }
      })()
    },
    [],
  )

  const clear = useCallback(() => {
    tokensRef.current.clear()
    latestTokenRef.current = null
    setPendingIds((current) => pendingIdsReducer(current, { type: 'clear' }))
  }, [])

  const has = useCallback((id: string) => pendingIds.has(id), [pendingIds])

  return { pendingIds, has, run, clear }
}

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

export type GiftTab = 'available' | 'gifted'

export function parseGiftTab(value: string | null): GiftTab {
  return value === 'gifted' ? 'gifted' : 'available'
}

export type GiftDialogState =
  | { kind: 'closed' }
  | {
      kind: 'editing' | 'submitting' | 'review'
      wineId: string
      expectedUpdatedAt: number
      presenter: string
    }

export type GiftDialogAction =
  | { type: 'open'; wineId: string; updatedAt: number }
  | { type: 'change_presenter'; value: string }
  | { type: 'submit' }
  | { type: 'retry' }
  | { type: 'remote_changed'; updatedAt: number }
  | { type: 'close' }

export function giftDialogReducer(
  state: GiftDialogState,
  action: GiftDialogAction,
): GiftDialogState {
  if (action.type === 'open') {
    return {
      kind: 'editing',
      wineId: action.wineId,
      expectedUpdatedAt: action.updatedAt,
      presenter: '',
    }
  }
  if (action.type === 'close') return { kind: 'closed' }
  if (state.kind === 'closed') return state
  if (action.type === 'change_presenter') {
    return { ...state, kind: 'editing', presenter: action.value }
  }
  if (action.type === 'submit') return { ...state, kind: 'submitting' }
  if (action.type === 'retry') return { ...state, kind: 'editing' }
  if (
    action.type === 'remote_changed' &&
    action.updatedAt !== state.expectedUpdatedAt
  ) {
    return { ...state, kind: 'review' }
  }
  return state
}
