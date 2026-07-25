import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import decodePng, {
  init as initPngDecode,
} from '@jsquash/png/decode.js'
import decodeWebp, {
  init as initWebpDecode,
} from '@jsquash/webp/decode.js'
import jpeg from 'jpeg-js'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  ENCODED_JPEG_BASE64,
  ENCODED_PNG_BASE64,
  ENCODED_WEBP_LOSSLESS_BASE64,
  ENCODED_WEBP_LOSSY_BASE64,
  decodeFixtureBase64,
  padEncodedJpeg,
  padEncodedPng,
  padEncodedWebp,
} from '../src/test/imageFixtures'
import { MAX_FINAL_IMAGE_BYTES } from './postModel'
import {
  detectImageType,
  validateImageBytes,
  type DetectedImageType,
} from './uploadValidation'

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

function u32be(value: number) {
  return new Uint8Array([
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ])
}

function u32le(value: number) {
  return new Uint8Array([
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  ])
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
  return concat(u32be(data.byteLength), typed, u32be(crc32(typed)))
}

function validJpeg({
  width = 2,
  height = 2,
  totalSize,
}: {
  width?: number
  height?: number
  totalSize?: number
} = {}) {
  const beforeScan = new Uint8Array([
    0xff, 0xd8,
    0xff, 0xe0, 0x00, 0x02,
    0xff, 0xc0, 0x00, 0x0b, 0x08,
    (height >>> 8) & 0xff, height & 0xff,
    (width >>> 8) & 0xff, width & 0xff,
    0x01, 0x01, 0x11, 0x00,
    0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00,
  ])
  const scanSize = (totalSize ?? beforeScan.byteLength + 3) -
    beforeScan.byteLength - 2
  return concat(
    beforeScan,
    new Uint8Array(Math.max(1, scanSize)),
    new Uint8Array([0xff, 0xd9]),
  )
}

function validPng({
  width = 2,
  height = 2,
  totalSize,
}: {
  width?: number
  height?: number
  totalSize?: number
} = {}) {
  const signature = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ])
  const ihdrData = concat(
    u32be(width),
    u32be(height),
    new Uint8Array([8, 2, 0, 0, 0]),
  )
  const fixedSize =
    signature.byteLength +
    pngChunk('IHDR', ihdrData).byteLength +
    pngChunk('IDAT').byteLength +
    pngChunk('IEND').byteLength
  const idatSize = Math.max(1, (totalSize ?? fixedSize + 1) - fixedSize)
  return concat(
    signature,
    pngChunk('IHDR', ihdrData),
    pngChunk('IDAT', new Uint8Array(idatSize)),
    pngChunk('IEND'),
  )
}

function validWebp({
  width = 2,
  height = 2,
  totalSize,
}: {
  width?: number
  height?: number
  totalSize?: number
} = {}) {
  const vp8x = new Uint8Array([
    0, 0, 0, 0,
    (width - 1) & 0xff,
    ((width - 1) >>> 8) & 0xff,
    ((width - 1) >>> 16) & 0xff,
    (height - 1) & 0xff,
    ((height - 1) >>> 8) & 0xff,
    ((height - 1) >>> 16) & 0xff,
  ])
  const vp8xChunk = concat(encoder.encode('VP8X'), u32le(10), vp8x)
  const requestedSize = totalSize ?? 30
  const extraSize = requestedSize - 30
  const extra =
    extraSize >= 8
      ? concat(
          encoder.encode('JUNK'),
          u32le(extraSize - 8),
          new Uint8Array(extraSize - 8),
        )
      : new Uint8Array()
  const body = concat(encoder.encode('WEBP'), vp8xChunk, extra)
  return concat(encoder.encode('RIFF'), u32le(body.byteLength), body)
}

function heifFixture(brand: 'heic' | 'mif1') {
  return concat(
    new Uint8Array([0, 0, 0, 0x18]),
    encoder.encode(`ftyp${brand}`),
    new Uint8Array(12),
  )
}

const validImages = {
  'image/jpeg': decodeFixtureBase64(ENCODED_JPEG_BASE64),
  'image/png': decodeFixtureBase64(ENCODED_PNG_BASE64),
  'image/webp': decodeFixtureBase64(ENCODED_WEBP_LOSSLESS_BASE64),
} as const

const signatures: Record<DetectedImageType, Uint8Array> = {
  ...validImages,
  'image/heic': heifFixture('heic'),
  'image/heif': heifFixture('mif1'),
}

describe('image magic-byte detection', () => {
  it.each(Object.entries(signatures))('detects %s from real bytes', (type, bytes) => {
    expect(detectImageType(bytes)).toBe(type)
  })

  it('rejects HTML, PDF, empty, and truncated signatures', () => {
    expect(detectImageType(encoder.encode('<script>alert(1)</script>'))).toBeNull()
    expect(detectImageType(new Uint8Array([0x25, 0x50, 0x44, 0x46]))).toBeNull()
    expect(detectImageType(new Uint8Array())).toBeNull()
    expect(detectImageType(new Uint8Array([0xff, 0xd8, 0xff]))).toBeNull()
    expect(detectImageType(encoder.encode('RIFF'))).toBeNull()
  })
})

describe('bounded structural image validation', () => {
  beforeAll(async () => {
    const pngWasm = await readFile(
      join(
        process.cwd(),
        'node_modules/@jsquash/png/codec/pkg/squoosh_png_bg.wasm',
      ),
    )
    await initPngDecode(pngWasm)
    const webpWasm = await WebAssembly.compile(
      await readFile(
        join(
          process.cwd(),
          'node_modules/@jsquash/webp/codec/dec/webp_dec.wasm',
        ),
      ),
    )
    initWebpDecode(webpWasm)
  })

  it('uses real encoder fixtures decodable by independent JPEG, PNG, and WebP decoders', async () => {
    const decodedJpeg = jpeg.decode(validImages['image/jpeg'], {
      useTArray: true,
    })
    const decodedPng = await decodePng(
      validImages['image/png'].slice().buffer,
    )
    const decodedWebpLossless = await decodeWebp(
      validImages['image/webp'].slice().buffer,
    )
    const lossyWebp = decodeFixtureBase64(
      ENCODED_WEBP_LOSSY_BASE64,
    )
    const decodedWebpLossy = await decodeWebp(lossyWebp.slice().buffer)

    expect(decodedJpeg).toMatchObject({ width: 2, height: 2 })
    expect(decodedPng).toMatchObject({ width: 2, height: 2 })
    expect(decodedWebpLossless).toMatchObject({ width: 2, height: 2 })
    expect(decodedWebpLossy).toMatchObject({ width: 2, height: 2 })
    expect(
      validateImageBytes({
        bytes: lossyWebp,
        declaredMime: 'image/webp',
      }),
    ).toMatchObject({ kind: 'accepted', mediaType: 'image/webp' })
  })

  it.each(Object.entries(validImages))(
    'accepts independently decodable %s at small and exact 5 MiB sizes',
    async (type, bytes) => {
      const exactLimit =
        type === 'image/jpeg'
          ? padEncodedJpeg(bytes, MAX_FINAL_IMAGE_BYTES)
          : type === 'image/png'
            ? padEncodedPng(bytes, MAX_FINAL_IMAGE_BYTES)
            : padEncodedWebp(bytes, MAX_FINAL_IMAGE_BYTES)

      expect(validateImageBytes({ bytes, declaredMime: type })).toEqual({
        kind: 'accepted',
        mediaType: type,
        mediaSize: bytes.byteLength,
      })
      expect(exactLimit).toHaveLength(MAX_FINAL_IMAGE_BYTES)
      expect(validateImageBytes({ bytes: exactLimit, declaredMime: type })).toEqual({
        kind: 'accepted',
        mediaType: type,
        mediaSize: MAX_FINAL_IMAGE_BYTES,
      })
      if (type === 'image/jpeg') {
        expect(jpeg.decode(exactLimit, { useTArray: true })).toMatchObject({
          width: 2,
          height: 2,
        })
      } else if (type === 'image/png') {
        await expect(decodePng(exactLimit.slice().buffer)).resolves.toMatchObject({
          width: 2,
          height: 2,
        })
      } else {
        await expect(decodeWebp(exactLimit.slice().buffer)).resolves.toMatchObject({
          width: 2,
          height: 2,
        })
      }
    },
  )

  it.each([
    ['truncated segment', new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 10])],
    ['missing SOF', new Uint8Array([
      0xff, 0xd8, 0xff, 0xda, 0, 8, 1, 1, 0, 0, 0x3f, 0, 1, 0xff, 0xd9,
    ])],
    ['zero dimensions', validJpeg({ width: 0 })],
    ['missing scan payload', validJpeg().slice(0, -3)],
    ['missing EOI', validJpeg().slice(0, -2)],
    ['zero-filled fake entropy stream', validJpeg()],
    ['SOS component not declared by SOF', (() => {
      const bytes = validImages['image/jpeg'].slice()
      const sos = bytes.findIndex(
        (byte, index) => byte === 0xff && bytes[index + 1] === 0xda,
      )
      bytes[sos + 5] = 0x7f
      return bytes
    })()],
    ['unescaped marker inside entropy stream', (() => {
      const bytes = validImages['image/jpeg'].slice()
      const sos = bytes.findIndex(
        (byte, index) => byte === 0xff && bytes[index + 1] === 0xda,
      )
      const scanStart = sos + 2 + ((bytes[sos + 2] << 8) | bytes[sos + 3])
      bytes[scanStart] = 0xff
      bytes[scanStart + 1] = 0xe1
      return bytes
    })()],
  ])('rejects structurally invalid JPEG: %s', (_name, bytes) => {
    expect(validateImageBytes({ bytes, declaredMime: 'image/jpeg' })).toEqual({
      kind: 'rejected',
      code: 'unsupported_type',
    })
  })

  it.each([
    ['zero dimensions', validPng({ height: 0 })],
    ['truncated IHDR', validPng().slice(0, 24)],
    ['missing IDAT', concat(validPng().slice(0, 33), pngChunk('IEND'))],
    ['missing IEND', validPng().slice(0, -12)],
    ['trailing bytes', concat(validPng(), new Uint8Array([1]))],
    ['inconsistent chunk length', (() => {
      const bytes = validPng()
      bytes.set(u32be(0x7fffffff), 33)
      return bytes
    })()],
    ['CRC-valid but invalid IDAT zlib stream', validPng()],
  ])('rejects structurally invalid PNG: %s', (_name, bytes) => {
    expect(validateImageBytes({ bytes, declaredMime: 'image/png' })).toEqual({
      kind: 'rejected',
      code: 'unsupported_type',
    })
  })

  it.each([
    ['zero dimensions', validWebp({ width: 0 })],
    ['truncated chunk', validWebp().slice(0, -1)],
    ['inconsistent RIFF length', (() => {
      const bytes = validWebp()
      bytes.set(u32le(bytes.byteLength), 4)
      return bytes
    })()],
    ['invalid primary chunk', (() => {
      const bytes = validWebp()
      bytes.set(encoder.encode('NOPE'), 12)
      return bytes
    })()],
    ['missing odd-byte padding', concat(
      encoder.encode('RIFF'),
      u32le(17),
      encoder.encode('WEBPVP8L'),
      u32le(5),
      new Uint8Array([0x2f, 0, 0, 0, 0]),
    )],
    ['VP8X metadata without VP8 image data', validWebp()],
    ['truncated VP8L bitstream', (() => {
      const vp8l = concat(
        encoder.encode('VP8L'),
        u32le(9),
        validImages['image/webp'].slice(20, 29),
        new Uint8Array([0]),
      )
      const body = concat(encoder.encode('WEBP'), vp8l)
      return concat(encoder.encode('RIFF'), u32le(body.byteLength), body)
    })()],
  ])('rejects structurally invalid WebP: %s', (_name, bytes) => {
    expect(validateImageBytes({ bytes, declaredMime: 'image/webp' })).toEqual({
      kind: 'rejected',
      code: 'unsupported_type',
    })
  })

  it('rejects oversized, spoofed, mismatched, empty, and truncated content', () => {
    expect(
      validateImageBytes({
        bytes: new Uint8Array(MAX_FINAL_IMAGE_BYTES + 1),
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
        bytes: validImages['image/png'],
        declaredMime: 'image/jpeg',
      }),
    ).toEqual({ kind: 'rejected', code: 'mime_mismatch' })
    expect(
      validateImageBytes({
        bytes: new Uint8Array(),
        declaredMime: 'image/jpeg',
      }),
    ).toEqual({ kind: 'rejected', code: 'empty' })
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
