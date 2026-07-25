import { v } from 'convex/values'

export const postStatusValidator = v.union(
  v.literal('pendente'),
  v.literal('aprovado'),
  v.literal('oculto'),
)

export const uploadStateValidator = v.union(
  v.literal('awaiting_upload'),
  v.literal('processing'),
  v.literal('accepted'),
  v.literal('rejected'),
  v.literal('expired'),
)

export const mediaTypeValidator = v.union(
  v.literal('image/jpeg'),
  v.literal('image/png'),
  v.literal('image/webp'),
)

export type PostStatus = 'pendente' | 'aprovado' | 'oculto'
export type UploadState =
  | 'awaiting_upload'
  | 'processing'
  | 'accepted'
  | 'rejected'
  | 'expired'
export type PostMediaType = 'image/jpeg' | 'image/png' | 'image/webp'

export const MESSAGE_MAX_LENGTH = 280
export const AUTHOR_MAX_LENGTH = 60
export const MAX_FINAL_IMAGE_BYTES = 5 * 1024 * 1024
export const UPLOAD_RESERVATION_TTL_MS = 24 * 60 * 60 * 1_000
export const VALIDATION_RETRY_MS = 15 * 1_000

const DISALLOWED_MEMORY_CONTROLS =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/u

export function countUnicodeCodePoints(value: string) {
  return [...value].length
}

function normalizeOptionalText(value: string | undefined) {
  if (value === undefined) {
    return undefined
  }

  const normalized = value.replace(/\r\n?/gu, '\n').trim()
  return normalized.length === 0 ? undefined : normalized
}

export type NormalizedMemoryText =
  | {
      kind: 'valid'
      author?: string
      message?: string
    }
  | {
      kind:
        | 'invalid_content'
        | 'invalid_author'
        | 'invalid_message'
        | 'invalid_control'
    }

/**
 * Normaliza o comando textual antes de qualquer writer. `hasStorageId` indica
 * que a foto futura já satisfaz a regra de pelo menos um conteúdo.
 */
export function normalizeMemoryText({
  author: rawAuthor,
  message: rawMessage,
  hasStorageId = false,
}: {
  author?: string
  message?: string
  hasStorageId?: boolean
}): NormalizedMemoryText {
  const author = normalizeOptionalText(rawAuthor)
  const message = normalizeOptionalText(rawMessage)

  if (
    (author !== undefined && DISALLOWED_MEMORY_CONTROLS.test(author)) ||
    (message !== undefined && DISALLOWED_MEMORY_CONTROLS.test(message))
  ) {
    return { kind: 'invalid_control' }
  }
  if (author !== undefined && countUnicodeCodePoints(author) > AUTHOR_MAX_LENGTH) {
    return { kind: 'invalid_author' }
  }
  if (message !== undefined && countUnicodeCodePoints(message) > MESSAGE_MAX_LENGTH) {
    return { kind: 'invalid_message' }
  }
  if (message === undefined && !hasStorageId) {
    return { kind: 'invalid_content' }
  }

  return {
    kind: 'valid',
    ...(author === undefined ? {} : { author }),
    ...(message === undefined ? {} : { message }),
  }
}
