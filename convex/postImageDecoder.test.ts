import { describe, expect, it } from 'vitest'
import {
  compactPngInflateBomb,
  corruptJpegWithOneEntropyByte,
  corruptWebpWithZeroedPayload,
  indexedPngWithoutPalette,
  pngFixture,
} from '../src/test/adversarialImageFixtures'
import {
  ENCODED_JPEG_BASE64,
  ENCODED_PNG_BASE64,
  ENCODED_WEBP_LOSSLESS_BASE64,
  decodeFixtureBase64,
  padEncodedJpeg,
  padEncodedPng,
  padEncodedWebp,
} from '../src/test/imageFixtures'
import { MAX_FINAL_IMAGE_BYTES } from './postModel'
import { decodeImageBuffer } from './postImageDecoderLib'

describe('production image decoder', () => {
  const realImages = {
    'image/jpeg': decodeFixtureBase64(ENCODED_JPEG_BASE64),
    'image/png': decodeFixtureBase64(ENCODED_PNG_BASE64),
    'image/webp': decodeFixtureBase64(ENCODED_WEBP_LOSSLESS_BASE64),
  } as const

  it.each(Object.entries(realImages))(
    'decodes real %s pixels at small and exact 5 MiB sizes',
    async (declaredMime, bytes) => {
      const exact =
        declaredMime === 'image/jpeg'
          ? padEncodedJpeg(bytes, MAX_FINAL_IMAGE_BYTES)
          : declaredMime === 'image/png'
            ? padEncodedPng(bytes, MAX_FINAL_IMAGE_BYTES)
            : padEncodedWebp(bytes, MAX_FINAL_IMAGE_BYTES)

      await expect(
        decodeImageBuffer({ bytes, declaredMime }),
      ).resolves.toMatchObject({
        kind: 'accepted',
        mediaType: declaredMime,
        width: 2,
        height: 2,
      })
      await expect(
        decodeImageBuffer({ bytes: exact, declaredMime }),
      ).resolves.toMatchObject({
        kind: 'accepted',
        mediaType: declaredMime,
        mediaSize: MAX_FINAL_IMAGE_BYTES,
        width: 2,
        height: 2,
      })
    },
  )

  it.each([
    ['one-byte JPEG entropy', 'image/jpeg', corruptJpegWithOneEntropyByte()],
    ['zeroed VP8L payload', 'image/webp', corruptWebpWithZeroedPayload()],
    ['indexed PNG without PLTE', 'image/png', indexedPngWithoutPalette()],
    ['PNG inflate bomb', 'image/png', compactPngInflateBomb()],
  ])('rejects review bypass: %s', async (_label, declaredMime, bytes) => {
    await expect(
      decodeImageBuffer({ bytes, declaredMime }),
    ).resolves.toEqual({
      kind: 'rejected',
      code: 'unsupported_type',
    })
  })

  it('rejects an otherwise valid image wider than the 2560px client output', async () => {
    const row = new Uint8Array(1 + 2561 * 3)
    await expect(
      decodeImageBuffer({
        bytes: pngFixture({
          width: 2561,
          height: 1,
          colorType: 2,
          inflated: row,
        }),
        declaredMime: 'image/png',
      }),
    ).resolves.toEqual({
      kind: 'rejected',
      code: 'unsupported_type',
    })
  })
})
