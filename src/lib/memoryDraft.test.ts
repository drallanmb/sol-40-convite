import { describe, expect, it } from 'vitest'
import {
  AUTHOR_MAX_LENGTH,
  MESSAGE_MAX_LENGTH,
  canBeginMemorySubmission,
  countMemoryCodePoints,
  createMemoryState,
  memoryReducer,
  remainingMessageCharacters,
  tickMemoryRetrySeconds,
  toMemoryRetrySeconds,
  validateMemoryDraft,
  type MemoryPhoto,
  type MemoryState,
  type MemoryTransport,
} from './memoryDraft'

function photo(previewUrl = 'blob:one'): MemoryPhoto {
  return {
    file: new File(['photo'], 'photo.jpg', { type: 'image/jpeg' }),
    previewUrl,
  }
}

function processedPhoto(previewUrl = 'blob:one'): MemoryPhoto {
  return {
    ...photo(previewUrl),
    processed: new Blob(['jpeg'], { type: 'image/jpeg' }),
  }
}

const reserved: MemoryTransport = {
  kind: 'reserved',
  reservationId: 'reservation-1',
  capability: 'capability-1',
  uploadUrl: 'https://upload.example.test',
}

const uploaded: MemoryTransport = {
  kind: 'uploaded',
  reservationId: 'reservation-1',
  capability: 'capability-1',
  storageId: 'storage-1',
}

function withDraft(
  overrides: Partial<MemoryState['draft']> = {},
): MemoryState {
  return {
    ...createMemoryState(),
    draft: {
      author: 'Sol',
      message: 'Com carinho',
      photo: processedPhoto(),
      ...overrides,
    },
  }
}

describe('memory draft validation and Unicode limits', () => {
  it.each([
    [{ message: 'Oi', photo: null }, true],
    [{ message: '', photo: photo() }, true],
    [{ message: 'Oi', photo: photo() }, true],
    [{ message: '   ', photo: null }, false],
  ])('validates the three content shapes without truncation', (draft, valid) => {
    expect(
      validateMemoryDraft({
        author: '',
        ...draft,
      }).valid,
    ).toBe(valid)
  })

  it('counts Unicode code points exactly like the server', () => {
    expect(countMemoryCodePoints('💛')).toBe(1)
    expect(countMemoryCodePoints('a'.repeat(MESSAGE_MAX_LENGTH))).toBe(280)
    expect(remainingMessageCharacters('a'.repeat(281))).toBe(-1)
    expect(
      validateMemoryDraft({
        author: 'a'.repeat(AUTHOR_MAX_LENGTH + 1),
        message: 'Oi',
        photo: null,
      }),
    ).toEqual({
      valid: false,
      authorLength: 61,
      messageLength: 2,
      error: 'invalid_author',
    })
  })

  it.each([
    ['', false, 'empty_content'],
    ['a', true, undefined],
    ['a'.repeat(280), true, undefined],
    ['a'.repeat(281), false, 'invalid_message'],
    ['💛'.repeat(280), true, undefined],
    ['oi\u0000', false, 'invalid_control'],
  ])(
    'matches the server boundary for a %i-code-point message',
    (message, valid, error) => {
      expect(
        validateMemoryDraft({
          author: '',
          message,
          photo: null,
        }),
      ).toMatchObject({ valid, ...(error ? { error } : {}) })
    },
  )

  it('uses the server countdown as positive whole seconds and re-enables at zero', () => {
    expect(toMemoryRetrySeconds(0)).toBe(1)
    expect(toMemoryRetrySeconds(1.1)).toBe(2)
    expect(tickMemoryRetrySeconds(1)).toBe(0)
    expect(tickMemoryRetrySeconds(0)).toBe(0)
  })
})

describe('memory submission preservation', () => {
  it.each([
    ['processing', { kind: 'none' }],
    ['uploading', reserved],
    ['claiming', uploaded],
    ['validating', uploaded],
  ] as const)('preserves the entire draft and safe transport when %s fails', (stage, transport) => {
    const initial = withDraft()
    const atStage = { ...initial, transport } as MemoryState
    const staged =
      stage === 'uploading'
        ? memoryReducer(atStage, { type: 'upload_progress', percent: 42 }).state
        : memoryReducer(atStage, { type: 'submission_stage', stage }).state
    const failed = memoryReducer(staged, {
      type: 'submission_failed',
      code: 'network_error',
    }).state

    expect(failed.draft).toEqual(initial.draft)
    expect(failed.transport).toEqual(transport)
    expect(failed.submission).toEqual({
      kind: 'failed',
      code: 'network_error',
    })
  })

  it('retains safe reservation and uploaded storage across retryable failures', () => {
    const initial = { ...withDraft(), transport: uploaded }
    const failed = memoryReducer(initial, {
      type: 'submission_failed',
      code: 'network_error',
    }).state
    const retrying = memoryReducer(failed, {
      type: 'submission_stage',
      stage: 'claiming',
    }).state

    expect(retrying.transport).toEqual(uploaded)
    expect(retrying.draft).toEqual(initial.draft)
  })

  it('clears only unsafe transport when a reservation expires', () => {
    const initial = { ...withDraft(), transport: reserved }
    const result = memoryReducer(initial, {
      type: 'transport_invalidated',
      code: 'expired_reservation',
    }).state

    expect(result.transport).toEqual({ kind: 'none' })
    expect(result.draft).toEqual(initial.draft)
    expect(result.submission.kind).toBe('failed')
  })

  it('permits one fresh reservation after a token conflict and no third token', () => {
    const initial = { ...withDraft(), transport: reserved }
    const first = memoryReducer(initial, { type: 'token_conflict' }).state
    const second = memoryReducer(
      { ...first, transport: reserved },
      { type: 'token_conflict' },
    ).state

    expect(first.reservationConflictRetries).toBe(1)
    expect(first.transport).toEqual({ kind: 'none' })
    expect(first.submission).toEqual({ kind: 'processing' })
    expect(second.reservationConflictRetries).toBe(1)
    expect(second.submission).toEqual({
      kind: 'failed',
      code: 'token_conflict',
    })
  })

  it('exposes a deterministic busy guard contract', () => {
    const idle = withDraft()
    expect(canBeginMemorySubmission(idle, false)).toBe(true)
    expect(canBeginMemorySubmission(idle, true)).toBe(false)
    expect(
      canBeginMemorySubmission(
        {
          ...idle,
          submission: { kind: 'uploading', percent: 20 },
        },
        false,
      ),
    ).toBe(false)
  })
})

describe('memory preview cleanup and accepted-only reset', () => {
  it('returns the old object URL when replacing and removing a photo', () => {
    const initial = withDraft()
    const replaced = memoryReducer(initial, {
      type: 'photo_selected',
      photo: photo('blob:two'),
    })
    const removed = memoryReducer(replaced.state, { type: 'photo_removed' })

    expect(replaced.effects).toEqual({
      previewUrlToRevoke: 'blob:one',
    })
    expect(replaced.state.draft.photo?.previewUrl).toBe('blob:two')
    expect(removed.effects).toEqual({
      previewUrlToRevoke: 'blob:two',
    })
    expect(removed.state.draft.photo).toBeNull()
  })

  it('does not clear any field during processing or validation', () => {
    const initial = { ...withDraft(), transport: uploaded }
    const processing = memoryReducer(initial, {
      type: 'submission_stage',
      stage: 'processing',
    }).state
    const validating = memoryReducer(processing, {
      type: 'submission_stage',
      stage: 'validating',
    }).state

    expect(processing.draft).toEqual(initial.draft)
    expect(validating.draft).toEqual(initial.draft)
    expect(validating.transport).toEqual(uploaded)
  })

  it('clears message, photo and transport only after accepted while preserving author', () => {
    const initial = { ...withDraft(), transport: uploaded }
    const accepted = memoryReducer(initial, { type: 'accepted' })

    expect(accepted.state).toEqual({
      draft: { author: 'Sol', message: '', photo: null },
      submission: { kind: 'success' },
      transport: { kind: 'none' },
      reservationConflictRetries: 0,
    })
    expect(accepted.effects).toEqual({
      previewUrlToRevoke: 'blob:one',
    })
  })

  it('reopens a clean form after success without changing the author', () => {
    const accepted = memoryReducer(
      { ...withDraft(), transport: uploaded },
      { type: 'accepted' },
    ).state
    const next = memoryReducer(accepted, { type: 'send_another' }).state

    expect(next.draft).toEqual({
      author: 'Sol',
      message: '',
      photo: null,
    })
    expect(next.submission).toEqual({ kind: 'idle' })
  })
})
