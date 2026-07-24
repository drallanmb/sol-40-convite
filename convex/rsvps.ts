import { v } from 'convex/values'
import { normalizePhone, type NormalizedPhone } from '../src/lib/phone'
import type { Doc } from './_generated/dataModel'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import { attendanceValidator } from './rsvpModel'
import { rsvpRateLimiter } from './rsvpRateLimits'
import {
  createRsvpSession,
  hashLimiterKey,
  resolveActiveRsvpSession,
  toRetryAfterSeconds,
  validateOpaqueToken,
} from './rsvpSecurity'

const GLOBAL_LOOKUP_KEY = undefined

const rateLimitedValidator = v.object({
  kind: v.literal('rate_limited'),
  retryAfterSeconds: v.number(),
})

const unlockResultValidator = v.union(
  v.object({ kind: v.literal('unlocked') }),
  v.object({ kind: v.literal('not_found') }),
  v.object({ kind: v.literal('token_conflict') }),
  rateLimitedValidator,
)

const guestViewValidator = v.object({
  guestRef: v.string(),
  name: v.string(),
  attendance: attendanceValidator,
})

export const familyViewValidator = v.object({
  displayName: v.string(),
  contact: v.optional(v.string()),
  guests: v.array(guestViewValidator),
  updatedAt: v.number(),
})

type ReadContext = Pick<QueryCtx, 'db'>

function lookupCandidates(normalized: Exclude<NormalizedPhone, { kind: 'invalid' }>) {
  const candidates = new Set(normalized.lookupCandidates)

  if (normalized.kind === 'canonical' && normalized.phone.length === 11) {
    candidates.add(`${normalized.phone.slice(0, 2)}${normalized.phone.slice(3)}`)
  }

  return [...candidates]
}

async function findInvitation(
  ctx: Pick<MutationCtx, 'db'>,
  normalized: Exclude<NormalizedPhone, { kind: 'invalid' }>,
) {
  const matches = new Map<string, Awaited<ReturnType<typeof ctx.db.get<'rsvps'>>>>()

  for (const candidate of lookupCandidates(normalized)) {
    const candidateMatches = await ctx.db
      .query('rsvps')
      .withIndex('by_phone', (index) => index.eq('phone', candidate))
      .collect()

    if (candidateMatches.length > 1) {
      return null
    }

    for (const match of candidateMatches) {
      matches.set(String(match._id), match)
    }
  }

  return matches.size === 1 ? [...matches.values()][0] : null
}

function retrySeconds(...retryAfterValues: Array<number | undefined>) {
  return toRetryAfterSeconds(
    retryAfterValues.reduce<number>(
      (maximum, retryAfter) => Math.max(maximum, retryAfter ?? 0),
      0,
    ),
  )
}

async function consumeLookupLimits(
  ctx: MutationCtx,
  normalized: NormalizedPhone,
) {
  const globalStatus = await rsvpRateLimiter.check(ctx, 'lookupGlobal', {
    key: GLOBAL_LOOKUP_KEY,
  })

  if (!globalStatus.ok) {
    return {
      kind: 'rate_limited',
      retryAfterSeconds: retrySeconds(globalStatus.retryAfter),
    } as const
  }

  const phoneKey =
    normalized.kind === 'invalid'
      ? null
      : await hashLimiterKey('lookup-phone', normalized.normalizedKey)
  const phoneStatus = phoneKey
    ? await rsvpRateLimiter.check(ctx, 'lookupByPhone', { key: phoneKey })
    : null

  if (phoneStatus && !phoneStatus.ok) {
    return {
      kind: 'rate_limited',
      retryAfterSeconds: retrySeconds(phoneStatus.retryAfter),
    } as const
  }

  const globalConsumption = await rsvpRateLimiter.limit(ctx, 'lookupGlobal', {
    key: GLOBAL_LOOKUP_KEY,
  })
  const phoneConsumption = phoneKey
    ? await rsvpRateLimiter.limit(ctx, 'lookupByPhone', { key: phoneKey })
    : null

  if (!globalConsumption.ok || (phoneConsumption && !phoneConsumption.ok)) {
    throw new Error('RSVP lookup limiter invariant failed')
  }

  return { kind: 'consumed' } as const
}

export async function buildFamilyView(ctx: ReadContext, rsvp: Doc<'rsvps'>) {
  const guests = await ctx.db
    .query('rsvpGuests')
    .withIndex('by_rsvp_sort', (index) => index.eq('rsvpId', rsvp._id))
    .collect()

  return {
    displayName: rsvp.displayName,
    ...(rsvp.contact === undefined ? {} : { contact: rsvp.contact }),
    guests: guests.map((guest) => ({
      guestRef: guest.publicRef,
      name: guest.name,
      attendance: guest.attendance,
    })),
    updatedAt: rsvp.updatedAt,
  }
}

export const unlockByPhone = mutation({
  args: {
    phone: v.string(),
    token: v.string(),
  },
  returns: unlockResultValidator,
  handler: async (ctx, args) => {
    const normalized = normalizePhone(args.phone)
    const limiterResult = await consumeLookupLimits(ctx, normalized)
    if (limiterResult.kind === 'rate_limited') {
      return limiterResult
    }

    if (normalized.kind === 'invalid' || !validateOpaqueToken(args.token)) {
      return { kind: 'not_found' } as const
    }

    const invitation = await findInvitation(ctx, normalized)
    if (!invitation) {
      return { kind: 'not_found' } as const
    }

    const session = await createRsvpSession(ctx, {
      rsvpId: invitation._id,
      token: args.token,
    })

    if (session.kind === 'token_conflict') {
      return { kind: 'token_conflict' } as const
    }
    if (session.kind !== 'created') {
      return { kind: 'not_found' } as const
    }

    return { kind: 'unlocked' } as const
  },
})

export const getCurrent = query({
  args: {
    token: v.string(),
  },
  returns: v.union(v.null(), familyViewValidator),
  handler: async (ctx, args) => {
    const scoped = await resolveActiveRsvpSession(ctx, args.token)
    if (!scoped) {
      return null
    }

    return buildFamilyView(ctx, scoped.rsvp)
  },
})
