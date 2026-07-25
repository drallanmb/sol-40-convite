import { zlibSync } from 'fflate'
import {
  ENCODED_JPEG_BASE64,
  ENCODED_WEBP_LOSSLESS_BASE64,
  decodeFixtureBase64,
} from './imageFixtures'

const encoder = new TextEncoder()

function concat(...parts: Uint8Array[]) {
  const result = new Uint8Array(
    parts.reduce((total, part) => total + part.byteLength, 0),
  )
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.byteLength
  }
  return result
}

function uint32(value: number) {
  const bytes = new Uint8Array(4)
  new DataView(bytes.buffer).setUint32(0, value)
  return bytes
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type: string, data = new Uint8Array()) {
  const typed = concat(encoder.encode(type), data)
  return concat(uint32(data.byteLength), typed, uint32(crc32(typed)))
}

export function pngFixture({
  width,
  height,
  colorType,
  inflated,
}: {
  width: number
  height: number
  colorType: 2 | 3
  inflated: Uint8Array
}) {
  return concat(
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk(
      'IHDR',
      concat(
        uint32(width),
        uint32(height),
        new Uint8Array([8, colorType, 0, 0, 0]),
      ),
    ),
    pngChunk('IDAT', zlibSync(inflated)),
    pngChunk('IEND'),
  )
}

export function corruptJpegWithOneEntropyByte() {
  const bytes = decodeFixtureBase64(ENCODED_JPEG_BASE64)
  const sos = bytes.findIndex(
    (byte, index) => byte === 0xff && bytes[index + 1] === 0xda,
  )
  const scanStart = sos + 2 + ((bytes[sos + 2] << 8) | bytes[sos + 3])
  return concat(
    bytes.slice(0, scanStart),
    new Uint8Array([0]),
    new Uint8Array([0xff, 0xd9]),
  )
}

export function corruptWebpWithZeroedPayload() {
  const bytes = decodeFixtureBase64(ENCODED_WEBP_LOSSLESS_BASE64)
  bytes.fill(0, 25, bytes.byteLength)
  return bytes
}

export function indexedPngWithoutPalette() {
  return pngFixture({
    width: 1,
    height: 1,
    colorType: 3,
    inflated: new Uint8Array([0, 0]),
  })
}

export function compactPngInflateBomb() {
  return pngFixture({
    width: 1,
    height: 1,
    colorType: 2,
    inflated: new Uint8Array(8 * 1024 * 1024),
  })
}
