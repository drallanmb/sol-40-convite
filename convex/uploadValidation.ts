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

function readUint16BigEndian(bytes: Uint8Array, offset: number) {
  return (bytes[offset] << 8) | bytes[offset + 1]
}

function readUint24LittleEndian(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16)
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

function hasValidJpegStructure(bytes: Uint8Array) {
  if (
    bytes.byteLength < 15 ||
    bytes[0] !== 0xff ||
    bytes[1] !== 0xd8 ||
    bytes[bytes.byteLength - 2] !== 0xff ||
    bytes[bytes.byteLength - 1] !== 0xd9
  ) {
    return false
  }

  let offset = 2
  let hasFrame = false
  while (offset < bytes.byteLength - 2) {
    if (bytes[offset] !== 0xff) {
      return false
    }
    while (offset < bytes.byteLength && bytes[offset] === 0xff) {
      offset += 1
    }
    if (offset >= bytes.byteLength) {
      return false
    }

    const marker = bytes[offset]
    offset += 1
    if (marker === 0x00 || marker === 0xd9) {
      return false
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue
    }
    if (offset + 2 > bytes.byteLength) {
      return false
    }
    const segmentLength = readUint16BigEndian(bytes, offset)
    if (
      segmentLength < 2 ||
      offset + segmentLength > bytes.byteLength
    ) {
      return false
    }

    const isStartOfFrame =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    if (isStartOfFrame) {
      if (segmentLength < 11) {
        return false
      }
      const height = readUint16BigEndian(bytes, offset + 3)
      const width = readUint16BigEndian(bytes, offset + 5)
      const components = bytes[offset + 7]
      if (
        !hasSaneDimensions(width, height) ||
        components === 0 ||
        segmentLength !== 8 + 3 * components
      ) {
        return false
      }
      hasFrame = true
    }

    if (marker === 0xda) {
      const scanStart = offset + segmentLength
      return hasFrame && scanStart < bytes.byteLength - 2
    }
    offset += segmentLength
  }
  return false
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
  if (colorType === 0) return [1, 2, 4, 8, 16].includes(bitDepth)
  if (colorType === 2 || colorType === 4 || colorType === 6) {
    return [8, 16].includes(bitDepth)
  }
  if (colorType === 3) return [1, 2, 4, 8].includes(bitDepth)
  return false
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
      const colorType = bytes[dataOffset + 9]
      if (
        !hasSaneDimensions(width, height) ||
        !validPngColorMode(bitDepth, colorType) ||
        bytes[dataOffset + 10] !== 0 ||
        bytes[dataOffset + 11] !== 0 ||
        (bytes[dataOffset + 12] !== 0 && bytes[dataOffset + 12] !== 1)
      ) {
        return false
      }
    } else if (type === 'IHDR') {
      return false
    }

    if (type === 'IDAT') {
      if (length === 0 || idatEnded) {
        return false
      }
      hasIdat = true
    } else if (hasIdat && type !== 'IEND') {
      idatEnded = true
    }

    const nextOffset = crcOffset + 4
    if (type === 'IEND') {
      return length === 0 && hasIdat && nextOffset === bytes.byteLength
    }
    offset = nextOffset
    chunkIndex += 1
  }
  return false
}

function parseWebpDimensions(
  bytes: Uint8Array,
  type: string,
  dataOffset: number,
  length: number,
) {
  if (type === 'VP8X') {
    if (
      length !== 10 ||
      bytes[dataOffset + 1] !== 0 ||
      bytes[dataOffset + 2] !== 0 ||
      bytes[dataOffset + 3] !== 0
    ) {
      return null
    }
    return {
      width: readUint24LittleEndian(bytes, dataOffset + 4) + 1,
      height: readUint24LittleEndian(bytes, dataOffset + 7) + 1,
    }
  }
  if (type === 'VP8 ') {
    if (
      length < 10 ||
      bytes[dataOffset + 3] !== 0x9d ||
      bytes[dataOffset + 4] !== 0x01 ||
      bytes[dataOffset + 5] !== 0x2a
    ) {
      return null
    }
    return {
      width: readUint16BigEndian(
        new Uint8Array([bytes[dataOffset + 7], bytes[dataOffset + 6]]),
        0,
      ) & 0x3fff,
      height: readUint16BigEndian(
        new Uint8Array([bytes[dataOffset + 9], bytes[dataOffset + 8]]),
        0,
      ) & 0x3fff,
    }
  }
  if (type === 'VP8L') {
    if (length < 5 || bytes[dataOffset] !== 0x2f) {
      return null
    }
    const packed = readUint32LittleEndian(bytes, dataOffset + 1)
    return {
      width: (packed & 0x3fff) + 1,
      height: ((packed >>> 14) & 0x3fff) + 1,
    }
  }
  return undefined
}

function hasValidWebpStructure(bytes: Uint8Array) {
  if (
    bytes.byteLength < 25 ||
    ascii(bytes, 0, 4) !== 'RIFF' ||
    ascii(bytes, 8, 12) !== 'WEBP' ||
    readUint32LittleEndian(bytes, 4) + 8 !== bytes.byteLength
  ) {
    return false
  }

  let offset = 12
  let dimensions: { width: number; height: number } | undefined
  while (offset < bytes.byteLength) {
    if (offset + 8 > bytes.byteLength) {
      return false
    }
    const type = ascii(bytes, offset, offset + 4)
    const length = readUint32LittleEndian(bytes, offset + 4)
    const dataOffset = offset + 8
    const paddedLength = length + (length % 2)
    if (paddedLength > bytes.byteLength - dataOffset) {
      return false
    }
    if (length % 2 === 1 && bytes[dataOffset + length] !== 0) {
      return false
    }

    const parsed = parseWebpDimensions(bytes, type, dataOffset, length)
    if (parsed === null) {
      return false
    }
    if (parsed !== undefined) {
      if (dimensions !== undefined || !hasSaneDimensions(parsed.width, parsed.height)) {
        return false
      }
      dimensions = parsed
    }
    offset = dataOffset + paddedLength
  }
  return offset === bytes.byteLength && dimensions !== undefined
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
      ? hasValidJpegStructure(bytes)
      : detected === 'image/png'
        ? hasValidPngStructure(bytes)
        : hasValidWebpStructure(bytes)
  if (!structurallyValid) {
    return { kind: 'rejected', code: 'unsupported_type' }
  }

  return {
    kind: 'accepted',
    mediaType: detected,
    mediaSize: bytes.byteLength,
  }
}
