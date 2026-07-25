import { describe, expect, it } from 'vitest'
import {
  giftDialogReducer,
  MODERATION_UNDO_MS,
  moderationTargets,
  moderationUndoReducer,
  parseGiftTab,
  parseModerationTab,
} from './adminOperations'

describe('admin moderation operations', () => {
  it('canonicalizes URL tabs and exposes only D-20 actions', () => {
    expect(parseModerationTab(null)).toBe('pendente')
    expect(parseModerationTab('garbage')).toBe('pendente')
    expect(parseModerationTab('aprovado')).toBe('aprovado')
    expect(moderationTargets('pendente')).toEqual(['aprovado', 'oculto'])
    expect(moderationTargets('aprovado')).toEqual(['oculto'])
    expect(moderationTargets('oculto')).toEqual(['aprovado'])
  })

  it('keeps only one bounded revision command and expires after eight seconds', () => {
    const first = moderationUndoReducer(
      { kind: 'idle' },
      {
        type: 'offer',
        now: 1_000,
        command: {
          postId: 'post-a',
          priorStatus: 'pendente',
          expectedStatus: 'aprovado',
          expectedRevision: 3,
        },
      },
    )
    expect(first).toEqual({
      kind: 'available',
      command: {
        postId: 'post-a',
        priorStatus: 'pendente',
        expectedStatus: 'aprovado',
        expectedRevision: 3,
        expiresAt: 1_000 + MODERATION_UNDO_MS,
      },
    })
    expect(
      moderationUndoReducer(first, { type: 'expire', now: 8_999 }),
    ).toBe(first)
    expect(
      moderationUndoReducer(first, { type: 'expire', now: 9_000 }),
    ).toEqual({ kind: 'idle' })
  })

  it('fails closed on auth loss and reports success/conflict without a shadow list', () => {
    const offered = moderationUndoReducer(
      { kind: 'idle' },
      {
        type: 'offer',
        now: 0,
        command: {
          postId: 'post',
          priorStatus: 'oculto',
          expectedStatus: 'aprovado',
          expectedRevision: 8,
        },
      },
    )
    expect(moderationUndoReducer(offered, { type: 'submit', now: 100 }).kind).toBe(
      'submitting',
    )
    expect(moderationUndoReducer(offered, { type: 'success' })).toEqual({
      kind: 'undone',
    })
    expect(moderationUndoReducer(offered, { type: 'conflict' })).toEqual({
      kind: 'conflict',
    })
    expect(moderationUndoReducer(offered, { type: 'auth_lost' })).toEqual({
      kind: 'idle',
    })
  })
})

describe('admin gift operations', () => {
  it('canonicalizes available and gifted URL tabs', () => {
    expect(parseGiftTab(null)).toBe('available')
    expect(parseGiftTab('unknown')).toBe('available')
    expect(parseGiftTab('gifted')).toBe('gifted')
  })

  it('retains the presenter on retry and requires review after a remote revision', () => {
    const opened = giftDialogReducer(
      { kind: 'closed' },
      { type: 'open', wineId: 'wine', updatedAt: 10 },
    )
    const edited = giftDialogReducer(opened, {
      type: 'change_presenter',
      value: '  Ágata  ',
    })
    const submitting = giftDialogReducer(edited, { type: 'submit' })
    expect(giftDialogReducer(submitting, { type: 'retry' })).toMatchObject({
      kind: 'editing',
      presenter: '  Ágata  ',
    })
    expect(
      giftDialogReducer(edited, { type: 'remote_changed', updatedAt: 11 }),
    ).toMatchObject({
      kind: 'review',
      presenter: '  Ágata  ',
      expectedUpdatedAt: 10,
    })
  })
})
