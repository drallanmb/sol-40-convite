import { describe, expect, it } from 'vitest'
import { MAX_FINAL_IMAGE_BYTES } from './postModel'
import {
  detectImageType,
  validateImageBytes,
  type DetectedImageType,
} from './uploadValidation'

const encoder = new TextEncoder()

function fixture(header: number[] | Uint8Array, size = 32) {
  const bytes = new Uint8Array(size)
  bytes.set(header)
  return bytes
}

const signatures: Record<DetectedImageType, Uint8Array> = {
  'image/jpeg': fixture([0xff, 0xd8, 0xff, 0xe0]),
  'image/png': fixture([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  'image/webp': fixture([
    ...encoder.encode('RIFF'),
    0,
    0,
    0,
    0,
    ...encoder.encode('WEBP'),
  ]),
  'image/heic': fixture([0, 0, 0, 0x18, ...encoder.encode('ftypheic')]),
  'image/heif': fixture([0, 0, 0, 0x18, ...encoder.encode('ftypmif1')]),
}

describe('image magic-byte detection', () => {
  it.each(Object.entries(signatures))('detects %s from real bytes', (type, bytes) => {
    expect(detectImageType(bytes)).toBe(type)
  })

  it('rejects HTML, PDF, empty, and truncated signatures', () => {
    expect(detectImageType(encoder.encode('<script>alert(1)</script>'))).toBeNull()
    expect(detectImageType(fixture([0x25, 0x50, 0x44, 0x46]))).toBeNull()
    expect(detectImageType(new Uint8Array())).toBeNull()
    expect(detectImageType(new Uint8Array([0xff, 0xd8, 0xff]))).toBeNull()
    expect(detectImageType(encoder.encode('RIFF'))).toBeNull()
  })
})

describe('final image validation', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'] as const)(
    'accepts %s when declared MIME agrees, including the exact size limit',
    (type) => {
      const exactLimit = fixture(signatures[type].slice(0, 12), MAX_FINAL_IMAGE_BYTES)

      expect(validateImageBytes({ bytes: signatures[type], declaredMime: type })).toEqual({
        kind: 'accepted',
        mediaType: type,
        mediaSize: signatures[type].byteLength,
      })
      expect(validateImageBytes({ bytes: exactLimit, declaredMime: type })).toEqual({
        kind: 'accepted',
        mediaType: type,
        mediaSize: MAX_FINAL_IMAGE_BYTES,
      })
    },
  )

  it('rejects oversized, spoofed, mismatched, and truncated content', () => {
    expect(
      validateImageBytes({
        bytes: fixture([0xff, 0xd8, 0xff, 0xe0], MAX_FINAL_IMAGE_BYTES + 1),
        declaredMime: 'image/jpeg',
      }),
    ).toEqual({ kind: 'rejected', code: 'too_large' })
    expect(
      validateImageBytes({
        bytes: encoder.encode('<html>not an image</html>'),
        declaredMime: 'image/jpeg',
      }),
    ).toEqual({ kind: 'rejected', code: 'unsupported_type' })
    expect(
      validateImageBytes({
        bytes: signatures['image/png'],
        declaredMime: 'image/jpeg',
      }),
    ).toEqual({ kind: 'rejected', code: 'mime_mismatch' })
    expect(
      validateImageBytes({
        bytes: new Uint8Array([0xff, 0xd8, 0xff]),
        declaredMime: 'image/jpeg',
      }),
    ).toEqual({ kind: 'rejected', code: 'unsupported_type' })
  })

  it.each(['image/heic', 'image/heif'] as const)(
    'recognizes raw %s for a conversion-specific rejection',
    (type) => {
      expect(validateImageBytes({ bytes: signatures[type], declaredMime: type })).toEqual({
        kind: 'rejected',
        code: 'heic_requires_conversion',
      })
    },
  )
})
