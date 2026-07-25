import {
  MAX_FINAL_IMAGE_BYTES,
  type PostMediaType,
} from './postModel'

export type DetectedImageType = PostMediaType | 'image/heic' | 'image/heif'

const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'heim', 'heis', 'hevm', 'hevs'])
const HEIF_BRANDS = new Set(['mif1', 'msf1'])

function ascii(bytes: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...bytes.subarray(start, end))
}

export function detectImageType(bytes: Uint8Array): DetectedImageType | null {
  if (
    bytes.length >= 4 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return 'image/jpeg'
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png'
  }

  if (
    bytes.length >= 12 &&
    ascii(bytes, 0, 4) === 'RIFF' &&
    ascii(bytes, 8, 12) === 'WEBP'
  ) {
    return 'image/webp'
  }

  if (bytes.length >= 12 && ascii(bytes, 4, 8) === 'ftyp') {
    const brand = ascii(bytes, 8, 12).toLowerCase()
    if (HEIC_BRANDS.has(brand)) {
      return 'image/heic'
    }
    if (HEIF_BRANDS.has(brand)) {
      return 'image/heif'
    }
  }

  return null
}

export type ImageValidationResult =
  | {
      kind: 'accepted'
      mediaType: PostMediaType
      mediaSize: number
    }
  | {
      kind: 'rejected'
      code:
        | 'empty'
        | 'too_large'
        | 'unsupported_type'
        | 'mime_mismatch'
        | 'heic_requires_conversion'
    }

export function validateImageBytes({
  bytes,
  declaredMime,
}: {
  bytes: Uint8Array
  declaredMime: string
}): ImageValidationResult {
  if (bytes.byteLength === 0) {
    return { kind: 'rejected', code: 'empty' }
  }
  if (bytes.byteLength > MAX_FINAL_IMAGE_BYTES) {
    return { kind: 'rejected', code: 'too_large' }
  }

  const detected = detectImageType(bytes)
  if (detected === null) {
    return { kind: 'rejected', code: 'unsupported_type' }
  }
  if (detected !== declaredMime) {
    return { kind: 'rejected', code: 'mime_mismatch' }
  }
  if (detected === 'image/heic' || detected === 'image/heif') {
    return { kind: 'rejected', code: 'heic_requires_conversion' }
  }

  return {
    kind: 'accepted',
    mediaType: detected,
    mediaSize: bytes.byteLength,
  }
}
