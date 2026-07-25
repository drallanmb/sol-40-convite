import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import { requireOperational } from './adminAccountModel'
import { appendAuditEvent, buildAuditChanges } from './adminAuditModel'
import { postStatusValidator, type PostStatus } from './postModel'
import { requireAdminSession } from './adminSecurity'

const unauthorizedValidator = v.object({ kind: v.literal('unauthorized') })
const forbiddenValidator = v.object({ kind: v.literal('forbidden') })
const moderationPostValidator = v.object({
  id: v.id('posts'),
  author: v.string(),
  message: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  status: postStatusValidator,
  createdAt: v.number(),
  moderatedAt: v.optional(v.number()),
  approvedAt: v.optional(v.number()),
  moderationRevision: v.number(),
})

const mutationResultValidator = v.union(
  unauthorizedValidator,
  forbiddenValidator,
  v.object({ kind: v.literal('not_found') }),
  v.object({
    kind: v.literal('conflict'),
    post: moderationPostValidator,
  }),
  v.object({
    kind: v.literal('updated'),
    post: moderationPostValidator,
    previousStatus: postStatusValidator,
  }),
)

const LEGAL_TRANSITIONS: Readonly<Record<PostStatus, readonly PostStatus[]>> = {
  pendente: ['aprovado', 'oculto'],
  aprovado: ['oculto'],
  oculto: ['aprovado'],
}

type ReadCtx = Pick<QueryCtx, 'db' | 'storage'>

export function isLegalModerationTransition(
  current: PostStatus,
  target: PostStatus,
) {
  return LEGAL_TRANSITIONS[current].includes(target)
}

function revisionOf(post: Doc<'posts'>) {
  return post.moderationRevision ?? 0
}

async function projectPost(ctx: ReadCtx, post: Doc<'posts'>) {
  const imageUrl =
    post.storageId === undefined ? undefined : await ctx.storage.getUrl(post.storageId)
  return {
    id: post._id,
    author: post.author ?? 'De alguém que te ama',
    ...(post.message === undefined ? {} : { message: post.message }),
    ...(imageUrl === null ? {} : { imageUrl }),
    status: post.status,
    createdAt: post.createdAt,
    ...(post.moderatedAt === undefined ? {} : { moderatedAt: post.moderatedAt }),
    ...(post.approvedAt === undefined ? {} : { approvedAt: post.approvedAt }),
    moderationRevision: revisionOf(post),
  }
}

function comparePosts(status: PostStatus) {
  return (left: Doc<'posts'>, right: Doc<'posts'>) => {
    const primary =
      status === 'pendente'
        ? left.createdAt - right.createdAt
        : (right.moderatedAt ?? right.createdAt) -
          (left.moderatedAt ?? left.createdAt)
    return primary || left._creationTime - right._creationTime ||
      String(left._id).localeCompare(String(right._id))
  }
}

async function authorize(ctx: QueryCtx | MutationCtx, token: string) {
  const authorization = await requireAdminSession(ctx, token)
  if (authorization.kind === 'unauthorized') return authorization
  return requireOperational(authorization.principal)
    ? ({ kind: 'authorized', principal: authorization.principal } as const)
    : ({ kind: 'forbidden' } as const)
}

export const listByStatus = query({
  args: { token: v.string(), status: postStatusValidator },
  returns: v.union(
    unauthorizedValidator,
    forbiddenValidator,
    v.object({
      kind: v.literal('ready'),
      posts: v.array(moderationPostValidator),
    }),
  ),
  handler: async (ctx, args) => {
    const authorization = await authorize(ctx, args.token)
    if (authorization.kind !== 'authorized') return authorization
    const rows = await ctx.db
      .query('posts')
      .withIndex('by_status', (index) => index.eq('status', args.status))
      .collect()
    rows.sort(comparePosts(args.status))
    return {
      kind: 'ready',
      posts: await Promise.all(rows.map((post) => projectPost(ctx, post))),
    } as const
  },
})

async function readExpected(
  ctx: MutationCtx,
  postId: Id<'posts'>,
  expectedStatus: PostStatus,
  expectedRevision: number,
) {
  const post = await ctx.db.get(postId)
  if (!post) return { kind: 'not_found' } as const
  if (
    post.status !== expectedStatus ||
    revisionOf(post) !== expectedRevision
  ) {
    return {
      kind: 'conflict',
      post: await projectPost(ctx, post),
    } as const
  }
  return { kind: 'ready', post } as const
}

export async function applyModerationTransition(
  ctx: MutationCtx,
  {
    post,
    targetStatus,
    now,
  }: {
    post: Doc<'posts'>
    targetStatus: PostStatus
    now: number
  },
) {
  const nextRevision = revisionOf(post) + 1
  await ctx.db.patch(post._id, {
    status: targetStatus,
    moderatedAt: now,
    approvedAt: targetStatus === 'aprovado' ? now : undefined,
    moderationRevision: nextRevision,
  })
  const updated = await ctx.db.get(post._id)
  if (!updated) throw new Error('Memória desapareceu durante a moderação.')
  return updated
}

export const transitionPost = mutation({
  args: {
    token: v.string(),
    postId: v.id('posts'),
    expectedStatus: postStatusValidator,
    expectedRevision: v.number(),
    targetStatus: postStatusValidator,
  },
  returns: v.union(
    mutationResultValidator,
    v.object({ kind: v.literal('invalid_transition') }),
  ),
  handler: async (ctx, args) => {
    const authorization = await authorize(ctx, args.token)
    if (authorization.kind !== 'authorized') return authorization
    if (!isLegalModerationTransition(args.expectedStatus, args.targetStatus)) {
      return { kind: 'invalid_transition' } as const
    }
    const expected = await readExpected(
      ctx,
      args.postId,
      args.expectedStatus,
      args.expectedRevision,
    )
    if (expected.kind !== 'ready') return expected
    const updated = await applyModerationTransition(ctx, {
      post: expected.post,
      targetStatus: args.targetStatus,
      now: Date.now(),
    })
    await appendAuditEvent(ctx, {
      principal: authorization.principal,
      area: 'moderation',
      action: 'moderation_transitioned',
      targetType: 'post',
      targetId: updated._id,
      targetLabel: updated.author ?? 'Memória sem autoria',
      changes: buildAuditChanges({
        before: { status: expected.post.status },
        after: { status: updated.status },
        allowedFields: ['status'],
      }),
    })
    return {
      kind: 'updated',
      post: await projectPost(ctx, updated),
      previousStatus: expected.post.status,
    } as const
  },
})

export const undoPost = mutation({
  args: {
    token: v.string(),
    postId: v.id('posts'),
    priorStatus: postStatusValidator,
    expectedStatus: postStatusValidator,
    expectedRevision: v.number(),
  },
  returns: v.union(
    mutationResultValidator,
    v.object({ kind: v.literal('invalid_transition') }),
  ),
  handler: async (ctx, args) => {
    const authorization = await authorize(ctx, args.token)
    if (authorization.kind !== 'authorized') return authorization
    // Undo is legal only when it is the exact inverse of a legal owner action.
    if (!isLegalModerationTransition(args.priorStatus, args.expectedStatus)) {
      return { kind: 'invalid_transition' } as const
    }
    const expected = await readExpected(
      ctx,
      args.postId,
      args.expectedStatus,
      args.expectedRevision,
    )
    if (expected.kind !== 'ready') return expected
    const updated = await applyModerationTransition(ctx, {
      post: expected.post,
      targetStatus: args.priorStatus,
      now: Date.now(),
    })
    await appendAuditEvent(ctx, {
      principal: authorization.principal,
      area: 'moderation',
      action: 'moderation_undone',
      targetType: 'post',
      targetId: updated._id,
      targetLabel: updated.author ?? 'Memória sem autoria',
      changes: buildAuditChanges({
        before: { status: expected.post.status },
        after: { status: updated.status },
        allowedFields: ['status'],
      }),
    })
    return {
      kind: 'updated',
      post: await projectPost(ctx, updated),
      previousStatus: expected.post.status,
    } as const
  },
})
