import { describe, expect, it, vi } from 'vitest'
import {
  MAX_FINAL_IMAGE_BYTES,
  MAX_ORIGINAL_IMAGE_BYTES,
  calculateTargetDimensions,
  processMemoryImage,
  selectEncodingAttempt,
  type ImageProcessingAdapters,
} from './imageProcessing'

function imageFile(
  size: number,
  type = 'image/jpeg',
  name = 'memory.jpg',
) {
  return new File([new Uint8Array(size)], name, { type })
}

function adapters(
  encodedSizes: number[],
  dimensions = { width: 4000, height: 3000 },
) {
  const close = vi.fn()
  const decode = vi.fn().mockResolvedValue({
    ...dimensions,
    source: {},
    close,
  })
  const encodeJpeg = vi.fn().mockImplementation(async () => {
    const size = encodedSizes.shift() ?? 1
    return new Blob([new Uint8Array(size)], { type: 'image/jpeg' })
  })

  return {
    value: { decode, encodeJpeg } satisfies ImageProcessingAdapters,
    decode,
    encodeJpeg,
    close,
  }
}

describe('calculateTargetDimensions', () => {
  it.each([
    [1200, 800, 2560, 1200, 800],
    [4000, 3000, 2560, 2560, 1920],
    [3000, 4000, 2560, 1920, 2560],
    [1, 9000, 2560, 1, 2560],
  ])(
    'maps %ix%i at max %i to %ix%i without upscaling',
    (width, height, maxEdge, expectedWidth, expectedHeight) => {
      expect(calculateTargetDimensions(width, height, maxEdge)).toEqual({
        width: expectedWidth,
        height: expectedHeight,
      })
    },
  )

  it('rejects invalid source dimensions', () => {
    expect(() => calculateTargetDimensions(0, 200, 2560)).toThrow()
    expect(() => calculateTargetDimensions(200, Number.NaN, 2560)).toThrow()
  })
})

describe('selectEncodingAttempt', () => {
  it('uses the exact quality and edge policy', () => {
    expect(Array.from({ length: 7 }, (_, index) => selectEncodingAttempt(index))).toEqual([
      { maxEdge: 2560, quality: 0.85 },
      { maxEdge: 2560, quality: 0.75 },
      { maxEdge: 2048, quality: 0.75 },
      { maxEdge: 1600, quality: 0.75 },
      { maxEdge: 1280, quality: 0.75 },
      { maxEdge: 1024, quality: 0.75 },
      null,
    ])
  })
})

describe('processMemoryImage', () => {
  it.each([
    ['image/jpeg', 'memory.jpg'],
    ['image/png', 'memory.png'],
    ['image/webp', 'memory.webp'],
  ])('decodes and canonicalizes %s', async (type, name) => {
    const harness = adapters([2_000])

    const result = await processMemoryImage(
      imageFile(3_000, type, name),
      harness.value,
    )

    expect(result.kind).toBe('processed')
    if (result.kind === 'processed') {
      expect(result.blob.type).toBe('image/jpeg')
      expect(result.width).toBe(2560)
      expect(result.height).toBe(1920)
    }
    expect(harness.decode).toHaveBeenCalledTimes(1)
    expect(harness.close).toHaveBeenCalledTimes(1)
  })

  it('rejects originals above 30 MiB before decode', async () => {
    const harness = adapters([1])

    await expect(
      processMemoryImage(
        imageFile(MAX_ORIGINAL_IMAGE_BYTES + 1),
        harness.value,
      ),
    ).resolves.toEqual({ kind: 'error', code: 'original_too_large' })
    expect(harness.decode).not.toHaveBeenCalled()
  })

  it('accepts an original exactly at the limit', async () => {
    const harness = adapters([1])
    const result = await processMemoryImage(
      imageFile(MAX_ORIGINAL_IMAGE_BYTES),
      harness.value,
    )

    expect(result.kind).toBe('processed')
  })

  it('retries quality and dimensions until the final JPEG is at most 5 MiB', async () => {
    const harness = adapters([
      MAX_FINAL_IMAGE_BYTES + 1,
      MAX_FINAL_IMAGE_BYTES + 1,
      MAX_FINAL_IMAGE_BYTES,
    ])

    const result = await processMemoryImage(imageFile(100), harness.value)

    expect(result.kind).toBe('processed')
    expect(harness.encodeJpeg.mock.calls.map(([, dimensions, quality]) => ({
      dimensions,
      quality,
    }))).toEqual([
      { dimensions: { width: 2560, height: 1920 }, quality: 0.85 },
      { dimensions: { width: 2560, height: 1920 }, quality: 0.75 },
      { dimensions: { width: 2048, height: 1536 }, quality: 0.75 },
    ])
    expect(harness.close).toHaveBeenCalledTimes(1)
  })

  it('returns a typed error when all bounded attempts remain too large', async () => {
    const harness = adapters(
      Array.from({ length: 6 }, () => MAX_FINAL_IMAGE_BYTES + 1),
    )

    await expect(
      processMemoryImage(imageFile(100), harness.value),
    ).resolves.toEqual({ kind: 'error', code: 'processed_too_large' })
    expect(harness.close).toHaveBeenCalledTimes(1)
  })

  it('maps an unsupported HEIC decoder without encoding or upload-ready output', async () => {
    const harness = adapters([1])
    harness.decode.mockRejectedValue(
      Object.assign(new Error('unsupported'), { name: 'EncodingError' }),
    )

    await expect(
      processMemoryImage(
        imageFile(100, 'image/heic', 'iphone.heic'),
        harness.value,
      ),
    ).resolves.toEqual({ kind: 'error', code: 'heic_unsupported' })
    expect(harness.encodeJpeg).not.toHaveBeenCalled()
    expect(harness.close).not.toHaveBeenCalled()
  })

  it('always closes a decoded bitmap when canvas encoding fails', async () => {
    const harness = adapters([1])
    harness.encodeJpeg.mockRejectedValue(new Error('canvas failed'))

    await expect(
      processMemoryImage(imageFile(100), harness.value),
    ).resolves.toEqual({ kind: 'error', code: 'processing_failed' })
    expect(harness.close).toHaveBeenCalledTimes(1)
  })
})
