export const MESSAGE_MAX_LENGTH = 280
export const AUTHOR_MAX_LENGTH = 60

const DISALLOWED_MEMORY_CONTROLS =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/u

export type MemoryPhoto = {
  file: File
  previewUrl: string
  processed?: Blob
}

export type MemoryDraft = {
  author: string
  message: string
  photo: MemoryPhoto | null
}

export type MemoryTransport =
  | { kind: 'none' }
  | {
      kind: 'reserved'
      reservationId: string
      capability: string
      uploadUrl: string
    }
  | {
      kind: 'uploaded'
      reservationId: string
      capability: string
      storageId: string
    }

export type MemoryErrorCode =
  | 'empty_content'
  | 'invalid_author'
  | 'invalid_message'
  | 'invalid_control'
  | 'unsupported_format'
  | 'heic_unsupported'
  | 'original_too_large'
  | 'processed_too_large'
  | 'processing_failed'
  | 'network_error'
  | 'upload_error'
  | 'validation_rejected'
  | 'rate_limited'
  | 'expired_reservation'
  | 'storage_conflict'
  | 'token_conflict'
  | 'invalid_capability'

export type MemorySubmissionState =
  | { kind: 'idle' }
  | { kind: 'processing' }
  | { kind: 'uploading'; percent: number }
  | { kind: 'claiming' }
  | { kind: 'validating' }
  | {
      kind: 'failed'
      code: MemoryErrorCode
      retryAfterSeconds?: number
    }
  | { kind: 'success' }

export type MemoryState = {
  draft: MemoryDraft
  submission: MemorySubmissionState
  transport: MemoryTransport
  reservationConflictRetries: 0 | 1
}

export type MemoryAction =
  | { type: 'author_changed'; value: string }
  | { type: 'message_changed'; value: string }
  | { type: 'photo_selected'; photo: MemoryPhoto }
  | { type: 'photo_processed'; blob: Blob }
  | { type: 'photo_removed' }
  | {
      type: 'submission_stage'
      stage: 'processing' | 'claiming' | 'validating'
    }
  | { type: 'upload_progress'; percent: number }
  | {
      type: 'reservation_created'
      reservationId: string
      capability: string
      uploadUrl: string
    }
  | { type: 'upload_completed'; storageId: string }
  | {
      type: 'submission_failed'
      code: MemoryErrorCode
      retryAfterSeconds?: number
    }
  | { type: 'transport_invalidated'; code: MemoryErrorCode }
  | { type: 'token_conflict' }
  | { type: 'accepted' }
  | { type: 'send_another' }

export type MemoryCleanupEffects = {
  previewUrlToRevoke?: string
}

export type MemoryReduction = {
  state: MemoryState
  effects: MemoryCleanupEffects
}

export type MemoryDraftValidation = {
  valid: boolean
  authorLength: number
  messageLength: number
  error?:
    | 'empty_content'
    | 'invalid_author'
    | 'invalid_message'
    | 'invalid_control'
}

export function countMemoryCodePoints(value: string) {
  return [...value].length
}

export function remainingMessageCharacters(value: string) {
  return MESSAGE_MAX_LENGTH - countMemoryCodePoints(value)
}

export function validateMemoryDraft(
  draft: MemoryDraft,
): MemoryDraftValidation {
  const authorLength = countMemoryCodePoints(draft.author)
  const messageLength = countMemoryCodePoints(draft.message)
  const base = { authorLength, messageLength }

  if (
    DISALLOWED_MEMORY_CONTROLS.test(draft.author) ||
    DISALLOWED_MEMORY_CONTROLS.test(draft.message)
  ) {
    return { valid: false, ...base, error: 'invalid_control' }
  }
  if (authorLength > AUTHOR_MAX_LENGTH) {
    return { valid: false, ...base, error: 'invalid_author' }
  }
  if (messageLength > MESSAGE_MAX_LENGTH) {
    return { valid: false, ...base, error: 'invalid_message' }
  }
  if (draft.message.trim().length === 0 && draft.photo === null) {
    return { valid: false, ...base, error: 'empty_content' }
  }
  return { valid: true, ...base }
}

export function createMemoryState(author = ''): MemoryState {
  return {
    draft: {
      author,
      message: '',
      photo: null,
    },
    submission: { kind: 'idle' },
    transport: { kind: 'none' },
    reservationConflictRetries: 0,
  }
}

function clearFailure(submission: MemorySubmissionState) {
  return submission.kind === 'failed' ? ({ kind: 'idle' } as const) : submission
}

function unchanged(state: MemoryState): MemoryReduction {
  return { state, effects: {} }
}

export function memoryReducer(
  state: MemoryState,
  action: MemoryAction,
): MemoryReduction {
  switch (action.type) {
    case 'author_changed':
      return {
        state: {
          ...state,
          draft: { ...state.draft, author: action.value },
          submission: clearFailure(state.submission),
        },
        effects: {},
      }
    case 'message_changed':
      return {
        state: {
          ...state,
          draft: { ...state.draft, message: action.value },
          submission: clearFailure(state.submission),
        },
        effects: {},
      }
    case 'photo_selected':
      return {
        state: {
          ...state,
          draft: { ...state.draft, photo: action.photo },
          submission: { kind: 'idle' },
          transport: { kind: 'none' },
          reservationConflictRetries: 0,
        },
        effects: {
          ...(state.draft.photo === null
            ? {}
            : { previewUrlToRevoke: state.draft.photo.previewUrl }),
        },
      }
    case 'photo_processed':
      if (state.draft.photo === null) return unchanged(state)
      return {
        state: {
          ...state,
          draft: {
            ...state.draft,
            photo: { ...state.draft.photo, processed: action.blob },
          },
        },
        effects: {},
      }
    case 'photo_removed':
      return {
        state: {
          ...state,
          draft: { ...state.draft, photo: null },
          submission: { kind: 'idle' },
          transport: { kind: 'none' },
          reservationConflictRetries: 0,
        },
        effects: {
          ...(state.draft.photo === null
            ? {}
            : { previewUrlToRevoke: state.draft.photo.previewUrl }),
        },
      }
    case 'submission_stage':
      return {
        state: {
          ...state,
          submission: { kind: action.stage },
        },
        effects: {},
      }
    case 'upload_progress':
      return {
        state: {
          ...state,
          submission: {
            kind: 'uploading',
            percent: Math.max(0, Math.min(100, Math.round(action.percent))),
          },
        },
        effects: {},
      }
    case 'reservation_created':
      return {
        state: {
          ...state,
          transport: {
            kind: 'reserved',
            reservationId: action.reservationId,
            capability: action.capability,
            uploadUrl: action.uploadUrl,
          },
        },
        effects: {},
      }
    case 'upload_completed':
      if (state.transport.kind !== 'reserved') return unchanged(state)
      return {
        state: {
          ...state,
          transport: {
            kind: 'uploaded',
            reservationId: state.transport.reservationId,
            capability: state.transport.capability,
            storageId: action.storageId,
          },
        },
        effects: {},
      }
    case 'submission_failed':
      return {
        state: {
          ...state,
          submission: {
            kind: 'failed',
            code: action.code,
            ...(action.retryAfterSeconds === undefined
              ? {}
              : {
                  retryAfterSeconds: Math.max(
                    1,
                    Math.ceil(action.retryAfterSeconds),
                  ),
                }),
          },
        },
        effects: {},
      }
    case 'transport_invalidated':
      return {
        state: {
          ...state,
          submission: { kind: 'failed', code: action.code },
          transport: { kind: 'none' },
        },
        effects: {},
      }
    case 'token_conflict':
      if (state.reservationConflictRetries === 0) {
        return {
          state: {
            ...state,
            submission: { kind: 'processing' },
            transport: { kind: 'none' },
            reservationConflictRetries: 1,
          },
          effects: {},
        }
      }
      return {
        state: {
          ...state,
          submission: { kind: 'failed', code: 'token_conflict' },
          transport: { kind: 'none' },
        },
        effects: {},
      }
    case 'accepted':
      return {
        state: {
          draft: {
            author: state.draft.author,
            message: '',
            photo: null,
          },
          submission: { kind: 'success' },
          transport: { kind: 'none' },
          reservationConflictRetries: 0,
        },
        effects: {
          ...(state.draft.photo === null
            ? {}
            : { previewUrlToRevoke: state.draft.photo.previewUrl }),
        },
      }
    case 'send_another':
      return {
        state: {
          ...state,
          submission: { kind: 'idle' },
        },
        effects: {},
      }
  }
}

export function canBeginMemorySubmission(
  state: MemoryState,
  busy: boolean,
) {
  if (busy) return false
  if (
    state.submission.kind !== 'idle' &&
    state.submission.kind !== 'failed'
  ) {
    return false
  }
  return validateMemoryDraft(state.draft).valid
}
