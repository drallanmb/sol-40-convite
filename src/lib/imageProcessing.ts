export const MAX_ORIGINAL_IMAGE_BYTES = 30 * 1024 * 1024
export const MAX_FINAL_IMAGE_BYTES = 5 * 1024 * 1024
export const MAX_MEMORY_IMAGE_EDGE = 2560

const COMMON_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])

const HEIC_IMAGE_TYPES = new Set([
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
])

const ENCODING_ATTEMPTS = [
  { maxEdge: 2560, quality: 0.85 },
  { maxEdge: 2560, quality: 0.75 },
  { maxEdge: 2048, quality: 0.75 },
  { maxEdge: 1600, quality: 0.75 },
  { maxEdge: 1280, quality: 0.75 },
  { maxEdge: 1024, quality: 0.75 },
] as const

export type MemoryImageErrorCode =
  | 'unsupported_format'
  | 'heic_unsupported'
  | 'original_too_large'
  | 'processed_too_large'
  | 'processing_failed'

export type MemoryImageError = {
  kind: 'error'
  code: MemoryImageErrorCode
}

export type ProcessedMemoryImage = {
  kind: 'processed'
  blob: Blob
  width: number
  height: number
}

export type DecodedMemoryImage = {
  width: number
  height: number
  source: CanvasImageSource
  close: () => void
}

export type ImageProcessingAdapters = {
  decode: (file: File) => Promise<DecodedMemoryImage>
  encodeJpeg: (
    source: CanvasImageSource,
    dimensions: { width: number; height: number },
    quality: number,
  ) => Promise<Blob>
}

export function calculateTargetDimensions(
  sourceWidth: number,
  sourceHeight: number,
  maxEdge = MAX_MEMORY_IMAGE_EDGE,
) {
  if (
    !Number.isFinite(sourceWidth) ||
    !Number.isFinite(sourceHeight) ||
    !Number.isFinite(maxEdge) ||
    sourceWidth <= 0 ||
    sourceHeight <= 0 ||
    maxEdge <= 0
  ) {
    throw new Error('Invalid image dimensions')
  }

  const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight))
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
  }
}

export function selectEncodingAttempt(index: number) {
  return ENCODING_ATTEMPTS[index] ?? null
}

function isHeic(file: File) {
  return (
    HEIC_IMAGE_TYPES.has(file.type.toLowerCase()) ||
    /\.(?:heic|heif)$/iu.test(file.name)
  )
}

function isSupportedSelection(file: File) {
  return COMMON_IMAGE_TYPES.has(file.type.toLowerCase()) || isHeic(file)
}

async function decodeWithImageElement(file: File) {
  const objectUrl = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.decoding = 'async'
    image.src = objectUrl
    await image.decode()
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      source: image,
      close: () => undefined,
    } satisfies DecodedMemoryImage
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

async function decodeMemoryImage(file: File): Promise<DecodedMemoryImage> {
  if (typeof globalThis.createImageBitmap === 'function') {
    try {
      const bitmap = await globalThis.createImageBitmap(file, {
        imageOrientation: 'from-image',
      })
      return {
        width: bitmap.width,
        height: bitmap.height,
        source: bitmap,
        close: () => bitmap.close(),
      }
    } catch {
      // Some browsers decode a format through <img> but not createImageBitmap.
    }
  }

  return decodeWithImageElement(file)
}

function encodeJpeg(
  source: CanvasImageSource,
  dimensions: { width: number; height: number },
  quality: number,
) {
  const canvas = document.createElement('canvas')
  canvas.width = dimensions.width
  canvas.height = dimensions.height
  const context = canvas.getContext('2d')
  if (!context) {
    return Promise.reject(new Error('Canvas 2D is unavailable'))
  }
  context.drawImage(source, 0, 0, dimensions.width, dimensions.height)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('JPEG encoding failed'))
      },
      'image/jpeg',
      quality,
    )
  })
}

const browserImageAdapters: ImageProcessingAdapters = {
  decode: decodeMemoryImage,
  encodeJpeg,
}

export async function processMemoryImage(
  file: File,
  adapters: ImageProcessingAdapters = browserImageAdapters,
): Promise<ProcessedMemoryImage | MemoryImageError> {
  if (file.size > MAX_ORIGINAL_IMAGE_BYTES) {
    return { kind: 'error', code: 'original_too_large' }
  }
  if (!isSupportedSelection(file)) {
    return { kind: 'error', code: 'unsupported_format' }
  }

  let decoded: DecodedMemoryImage
  try {
    decoded = await adapters.decode(file)
  } catch {
    return {
      kind: 'error',
      code: isHeic(file) ? 'heic_unsupported' : 'processing_failed',
    }
  }

  try {
    for (let index = 0; ; index += 1) {
      const attempt = selectEncodingAttempt(index)
      if (!attempt) break
      const dimensions = calculateTargetDimensions(
        decoded.width,
        decoded.height,
        attempt.maxEdge,
      )
      const blob = await adapters.encodeJpeg(
        decoded.source,
        dimensions,
        attempt.quality,
      )
      if (blob.size <= MAX_FINAL_IMAGE_BYTES) {
        return {
          kind: 'processed',
          blob:
            blob.type === 'image/jpeg'
              ? blob
              : new Blob([blob], { type: 'image/jpeg' }),
          ...dimensions,
        }
      }
    }
    return { kind: 'error', code: 'processed_too_large' }
  } catch {
    return { kind: 'error', code: 'processing_failed' }
  } finally {
    decoded.close()
  }
}
