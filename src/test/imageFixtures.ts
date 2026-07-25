export const ENCODED_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSgBBwcHCggKEwoKEygaFhooKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKP/AABEIAAIAAgMBEQACEQEDEQH/xAGiAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgsQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+gEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoLEQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8/T19vf4+fr/2gAMAwEAAhEDEQA/APdfhvo+mT/DvwtNPp1nJLJpVq7u8ClmYwqSSSOSa1zfLMHDH14xoxSU5fZX8z8jhlgMLiG61alGUpattJtt6tttXbb1bZ//2Q=='

export const ENCODED_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAHUlEQVR4AQESAO3/AP8AAP8A/wD/AAAA////////ScgJ962rVhsAAAAASUVORK5CYII='

export const ENCODED_WEBP_LOSSLESS_BASE64 =
  'UklGRiwAAABXRUJQVlA4TB8AAAAvAUAAAB8gEEjeHzqN+RcQFPwf3fxHZA/gBgwR/Q8BAA=='

export const ENCODED_WEBP_LOSSY_BASE64 =
  'UklGRjgAAABXRUJQVlA4ICwAAACQAQCdASoCAAIAAgA0JaQAAudPjMAA/vKT7Wdpsf+Gv/59wDDB/AGDhkgAAA=='

export function decodeFixtureBase64(value: string) {
  return Uint8Array.from(atob(value), (character) =>
    character.charCodeAt(0),
  )
}

function concat(...parts: Uint8Array[]) {
  const output = new Uint8Array(
    parts.reduce((total, part) => total + part.byteLength, 0),
  )
  let offset = 0
  for (const part of parts) {
    output.set(part, offset)
    offset += part.byteLength
  }
  return output
}

function uint32(value: number, littleEndian = false) {
  const bytes = new Uint8Array(4)
  new DataView(bytes.buffer).setUint32(0, value, littleEndian)
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

function pngChunk(type: string, data: Uint8Array) {
  const typed = concat(new TextEncoder().encode(type), data)
  return concat(
    uint32(data.byteLength),
    typed,
    uint32(crc32(typed)),
  )
}

export function padEncodedJpeg(
  bytes: Uint8Array,
  targetSize: number,
) {
  if (targetSize < bytes.byteLength) {
    throw new Error('JPEG target is smaller than fixture')
  }
  const sosOffset = bytes.findIndex(
    (byte, index) => byte === 0xff && bytes[index + 1] === 0xda,
  )
  if (sosOffset < 0) throw new Error('JPEG fixture has no SOS')

  let remaining = targetSize - bytes.byteLength
  const comments: Uint8Array[] = []
  while (remaining > 0) {
    let totalLength = Math.min(65_537, remaining)
    const leftover = remaining - totalLength
    if (leftover > 0 && leftover < 4) {
      totalLength -= 4 - leftover
    }
    if (totalLength < 4) {
      throw new Error('JPEG padding cannot encode target size')
    }
    const segmentLength = totalLength - 2
    comments.push(
      concat(
        new Uint8Array([
          0xff,
          0xfe,
          (segmentLength >>> 8) & 0xff,
          segmentLength & 0xff,
        ]),
        new Uint8Array(totalLength - 4),
      ),
    )
    remaining -= totalLength
  }
  return concat(
    bytes.slice(0, sosOffset),
    ...comments,
    bytes.slice(sosOffset),
  )
}

export function padEncodedPng(
  bytes: Uint8Array,
  targetSize: number,
) {
  const paddingSize = targetSize - bytes.byteLength - 12
  if (paddingSize < 0) {
    throw new Error('PNG target has no room for ancillary chunk')
  }
  return concat(
    bytes.slice(0, -12),
    pngChunk('ruSt', new Uint8Array(paddingSize)),
    bytes.slice(-12),
  )
}

export function padEncodedWebp(
  bytes: Uint8Array,
  targetSize: number,
) {
  const paddingSize = targetSize - bytes.byteLength - 8
  if (paddingSize < 0 || paddingSize % 2 !== 0) {
    throw new Error('WebP target has invalid JUNK padding size')
  }
  const padded = concat(
    bytes,
    new TextEncoder().encode('JUNK'),
    uint32(paddingSize, true),
    new Uint8Array(paddingSize),
  )
  padded.set(uint32(padded.byteLength - 8, true), 4)
  return padded
}
