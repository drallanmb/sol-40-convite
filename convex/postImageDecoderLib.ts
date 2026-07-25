"use node"

import sharp from 'sharp'
import jpeg from 'jpeg-js'
import { inflateSync } from 'node:zlib'
import { MAX_FINAL_IMAGE_BYTES, type PostMediaType } from './postModel'
import { validateImageBytes } from './uploadValidation'

const MAX_IMAGE_DIMENSION = 2_560
const MAX_IMAGE_PIXELS = MAX_IMAGE_DIMENSION * MAX_IMAGE_DIMENSION
const FORMAT_TO_MIME = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
} as const

export type DecodedImageVerdict =
  | {
      kind: 'accepted'
      mediaType: PostMediaType
      mediaSize: number
      width: number
      height: number
    }
  | {
      kind: 'rejected'
      code:
        | 'too_large'
        | 'unsupported_metadata'
        | 'empty'
        | 'unsupported_type'
        | 'mime_mismatch'
        | 'heic_requires_conversion'
    }

sharp.cache({ memory: 0, files: 0, items: 0 })
sharp.concurrency(1)

function pngChannelCount(colorType: number) {
  if (colorType === 0 || colorType === 3) return 1
  if (colorType === 2) return 3
  if (colorType === 4) return 2
  if (colorType === 6) return 4
  return 0
}

function hasExactBoundedPngInflation(bytes: Uint8Array) {
  const view = new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  )
  const width = view.getUint32(16)
  const height = view.getUint32(20)
  const bitDepth = bytes[24]
  const channels = pngChannelCount(bytes[25])
  const rowBytes = Math.ceil(width * channels * bitDepth / 8)
  const expectedLength = height * (rowBytes + 1)
  if (
    channels === 0 ||
    !Number.isSafeInteger(expectedLength) ||
    expectedLength > MAX_IMAGE_PIXELS * 4 + MAX_IMAGE_DIMENSION
  ) {
    return false
  }

  const idatParts: Buffer[] = []
  let offset = 8
  while (offset < bytes.byteLength) {
    const length = view.getUint32(offset)
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8))
    if (type === 'IDAT') {
      idatParts.push(
        Buffer.from(
          bytes.buffer,
          bytes.byteOffset + offset + 8,
          length,
        ),
      )
    }
    offset += 12 + length
  }

  try {
    const decoded = inflateSync(Buffer.concat(idatParts), {
      maxOutputLength: expectedLength + 1,
    })
    if (decoded.byteLength !== expectedLength) return false
    for (let row = 0; row < height; row += 1) {
      if (decoded[row * (rowBytes + 1)] > 4) return false
    }
    return true
  } catch {
    return false
  }
}

export async function decodeImageBuffer({
  bytes,
  declaredMime,
}: {
  bytes: Uint8Array
  declaredMime: string
}): Promise<DecodedImageVerdict> {
  if (bytes.byteLength > MAX_FINAL_IMAGE_BYTES) {
    return { kind: 'rejected', code: 'too_large' }
  }

  const preflight = validateImageBytes({ bytes, declaredMime })
  if (preflight.kind === 'rejected') return preflight

  try {
    const input = Buffer.from(
      bytes.buffer,
      bytes.byteOffset,
      bytes.byteLength,
    )
    const image = sharp(input, {
      failOn: 'warning',
      limitInputPixels: MAX_IMAGE_PIXELS,
      limitInputChannels: 4,
      pages: 1,
      sequentialRead: true,
      unlimited: false,
    })
    const metadata = await image.metadata()
    const mediaType =
      metadata.format === undefined
        ? undefined
        : FORMAT_TO_MIME[
            metadata.format as keyof typeof FORMAT_TO_MIME
          ]
    if (
      mediaType === undefined ||
      mediaType !== preflight.mediaType ||
      metadata.width === undefined ||
      metadata.height === undefined ||
      metadata.width < 1 ||
      metadata.height < 1 ||
      metadata.width > MAX_IMAGE_DIMENSION ||
      metadata.height > MAX_IMAGE_DIMENSION ||
      (metadata.pages ?? 1) !== 1
    ) {
      return { kind: 'rejected', code: 'unsupported_type' }
    }

    if (mediaType === 'image/jpeg') {
      jpeg.decode(input, {
        useTArray: true,
        tolerantDecoding: false,
        formatAsRGBA: true,
        maxResolutionInMP: MAX_IMAGE_PIXELS / 1_000_000,
        maxMemoryUsageInMB: 32,
      })
    } else if (
      mediaType === 'image/png' &&
      !hasExactBoundedPngInflation(bytes)
    ) {
      return { kind: 'rejected', code: 'unsupported_type' }
    }

    const { data, info } = await image
      .clone()
      .timeout({ seconds: 5 })
      .raw()
      .toBuffer({ resolveWithObject: true })
    const decodedLength = info.width * info.height * info.channels
    if (
      info.width !== metadata.width ||
      info.height !== metadata.height ||
      info.channels < 1 ||
      info.channels > 4 ||
      decodedLength > MAX_IMAGE_PIXELS * 4 ||
      data.byteLength !== decodedLength
    ) {
      return { kind: 'rejected', code: 'unsupported_type' }
    }

    return {
      kind: 'accepted',
      mediaType,
      mediaSize: bytes.byteLength,
      width: info.width,
      height: info.height,
    }
  } catch {
    return { kind: 'rejected', code: 'unsupported_type' }
  }
}
