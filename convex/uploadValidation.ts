import {
  MAX_FINAL_IMAGE_BYTES,
  type PostMediaType,
} from './postModel'

export type DetectedImageType = PostMediaType | 'image/heic' | 'image/heif'

const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'heim', 'heis', 'hevm', 'hevs'])
const HEIF_BRANDS = new Set(['mif1', 'msf1'])
const MAX_IMAGE_DIMENSION = 16_384
const PNG_SIGNATURE = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
])

function ascii(bytes: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...bytes.subarray(start, end))
}

function readUint32BigEndian(bytes: Uint8Array, offset: number) {
  return (
    bytes[offset] * 0x1000000 +
    (bytes[offset + 1] << 16) +
    (bytes[offset + 2] << 8) +
    bytes[offset + 3]
  )
}

function readUint32LittleEndian(bytes: Uint8Array, offset: number) {
  return (
    bytes[offset] +
    (bytes[offset + 1] << 8) +
    (bytes[offset + 2] << 16) +
    bytes[offset + 3] * 0x1000000
  )
}

function hasSaneDimensions(width: number, height: number) {
  return (
    width > 0 &&
    height > 0 &&
    width <= MAX_IMAGE_DIMENSION &&
    height <= MAX_IMAGE_DIMENSION
  )
}

function crc32(bytes: Uint8Array, start: number, end: number) {
  let crc = 0xffffffff
  for (let index = start; index < end; index += 1) {
    crc ^= bytes[index]
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function validPngColorMode(bitDepth: number, colorType: number) {
  return bitDepth === 8 && [0, 2, 3, 4, 6].includes(colorType)
}

function hasValidPngStructure(bytes: Uint8Array) {
  if (
    bytes.byteLength < 57 ||
    !PNG_SIGNATURE.every((byte, index) => bytes[index] === byte)
  ) {
    return false
  }

  let offset = PNG_SIGNATURE.byteLength
  let chunkIndex = 0
  let hasIdat = false
  let idatEnded = false
  let colorType = 0
  let hasPalette = false
  let idatLength = 0
  while (offset < bytes.byteLength) {
    if (offset + 12 > bytes.byteLength) {
      return false
    }
    const length = readUint32BigEndian(bytes, offset)
    const typeOffset = offset + 4
    const dataOffset = offset + 8
    const crcOffset = dataOffset + length
    if (length > bytes.byteLength - dataOffset - 4) {
      return false
    }
    const type = ascii(bytes, typeOffset, dataOffset)
    if (
      readUint32BigEndian(bytes, crcOffset) !==
      crc32(bytes, typeOffset, crcOffset)
    ) {
      return false
    }

    if (chunkIndex === 0) {
      if (type !== 'IHDR' || length !== 13) {
        return false
      }
      const width = readUint32BigEndian(bytes, dataOffset)
      const height = readUint32BigEndian(bytes, dataOffset + 4)
      const bitDepth = bytes[dataOffset + 8]
      colorType = bytes[dataOffset + 9]
      if (
        !hasSaneDimensions(width, height) ||
        !validPngColorMode(bitDepth, colorType) ||
        bytes[dataOffset + 10] !== 0 ||
        bytes[dataOffset + 11] !== 0 ||
        bytes[dataOffset + 12] !== 0
      ) {
        return false
      }
    } else if (type === 'IHDR') {
      return false
    }

    if (type === 'PLTE') {
      if (
        hasPalette ||
        hasIdat ||
        length < 3 ||
        length > 768 ||
        length % 3 !== 0 ||
        colorType === 0 ||
        colorType === 4
      ) {
        return false
      }
      hasPalette = true
    } else if (type === 'IDAT') {
      if (
        length === 0 ||
        idatEnded ||
        (colorType === 3 && !hasPalette)
      ) {
        return false
      }
      hasIdat = true
      idatLength += length
      if (idatLength > MAX_FINAL_IMAGE_BYTES) return false
    } else if (hasIdat && type !== 'IEND') {
      idatEnded = true
    }

    const nextOffset = crcOffset + 4
    if (type === 'IEND') {
      return (
        length === 0 &&
        hasIdat &&
        nextOffset === bytes.byteLength
      )
    }
    offset = nextOffset
    chunkIndex += 1
  }
  return false
}

function hasJpegEnvelope(bytes: Uint8Array) {
  return (
    bytes.byteLength >= 4 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[bytes.byteLength - 2] === 0xff &&
    bytes[bytes.byteLength - 1] === 0xd9
  )
}

function hasWebpEnvelope(bytes: Uint8Array) {
  if (
    bytes.byteLength < 25 ||
    ascii(bytes, 0, 4) !== 'RIFF' ||
    ascii(bytes, 8, 12) !== 'WEBP' ||
    readUint32LittleEndian(bytes, 4) + 8 !== bytes.byteLength
  ) {
    return false
  }

  let offset = 12
  let hasImageChunk = false
  while (offset < bytes.byteLength) {
    if (offset + 8 > bytes.byteLength) return false
    const type = ascii(bytes, offset, offset + 4)
    const length = readUint32LittleEndian(bytes, offset + 4)
    const dataOffset = offset + 8
    const paddedLength = length + (length % 2)
    if (paddedLength > bytes.byteLength - dataOffset) return false
    if (type === 'VP8 ' || type === 'VP8L') {
      if (hasImageChunk || length === 0) return false
      hasImageChunk = true
    }
    offset = dataOffset + paddedLength
  }
  return offset === bytes.byteLength && hasImageChunk
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
    bytes.length >= PNG_SIGNATURE.byteLength &&
    PNG_SIGNATURE.every((byte, index) => bytes[index] === byte)
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

  const structurallyValid =
    detected === 'image/jpeg'
      ? hasJpegEnvelope(bytes)
      : detected === 'image/png'
        ? hasValidPngStructure(bytes)
        : hasWebpEnvelope(bytes)
  if (!structurallyValid) {
    return { kind: 'rejected', code: 'unsupported_type' }
  }

  return {
    kind: 'accepted',
    mediaType: detected,
    mediaSize: bytes.byteLength,
  }
}
