"use node"

import { v } from 'convex/values'
import { internalAction } from './_generated/server'
import { decodeImageBuffer } from './postImageDecoderLib'

const errorCodeValidator = v.union(
  v.literal('missing_storage'),
  v.literal('too_large'),
  v.literal('unsupported_metadata'),
  v.literal('empty'),
  v.literal('unsupported_type'),
  v.literal('mime_mismatch'),
  v.literal('heic_requires_conversion'),
)

export const decodeStoredImage = internalAction({
  args: {
    storageId: v.id('_storage'),
  },
  returns: v.union(
    v.object({
      kind: v.literal('accepted'),
      mediaType: v.union(
        v.literal('image/jpeg'),
        v.literal('image/png'),
        v.literal('image/webp'),
      ),
      mediaSize: v.number(),
      width: v.number(),
      height: v.number(),
    }),
    v.object({
      kind: v.literal('rejected'),
      code: errorCodeValidator,
    }),
  ),
  handler: async (ctx, args) => {
    const blob = await ctx.storage.get(args.storageId)
    if (blob === null) {
      return { kind: 'rejected', code: 'missing_storage' } as const
    }
    return decodeImageBuffer({
      bytes: new Uint8Array(await blob.arrayBuffer()),
      declaredMime: blob.type,
    })
  },
})
