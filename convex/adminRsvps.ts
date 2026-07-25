import { v } from 'convex/values'
import { normalizePhone } from '../src/lib/phone'
import type { Doc, Id } from './_generated/dataModel'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import { requireAdminSession } from './adminSecurity'
import {
  createUniqueGuestPublicRef,
  findLogicalInvitation,
  insertInvitation,
} from './rsvpInternal'
import {
  attendanceValidator,
  CONTACT_MAX_LENGTH,
  MAX_RSVP_GUESTS,
  nextRsvpUpdatedAt,
  RSVP_DISPLAY_NAME_MAX_LENGTH,
  RSVP_GUEST_NAME_MAX_LENGTH,
} from './rsvpModel'

const MAX_CASCADE_SESSIONS = 128

const guestValidator = v.object({
  id: v.id('rsvpGuests'),
  publicRef: v.string(),
  name: v.string(),
  attendance: attendanceValidator,
  respondedAt: v.optional(v.number()),
  sortOrder: v.number(),
})

export const adminFamilyValidator = v.object({
  id: v.id('rsvps'),
  displayName: v.string(),
  phone: v.string(),
  contact: v.optional(v.string()),
  updatedAt: v.number(),
  guests: v.array(guestValidator),
})

const unauthorizedValidator = v.object({ kind: v.literal('unauthorized') })
const conflictValidator = v.object({
  kind: v.literal('conflict'),
  family: adminFamilyValidator,
})
const notFoundValidator = v.object({ kind: v.literal('not_found') })
const invalidValidator = v.object({
  kind: v.literal('invalid'),
  field: v.optional(v.string()),
  message: v.string(),
})
const savedValidator = v.object({
  kind: v.literal('saved'),
  family: adminFamilyValidator,
})
const mutationResultValidator = v.union(
  unauthorizedValidator,
  conflictValidator,
  notFoundValidator,
  invalidValidator,
  savedValidator,
)
const removedValidator = v.union(
  unauthorizedValidator,
  conflictValidator,
  notFoundValidator,
  invalidValidator,
  v.object({ kind: v.literal('removed') }),
)

type ReadCtx = Pick<QueryCtx, 'db'>

async function projectFamily(ctx: ReadCtx, family: Doc<'rsvps'>) {
  const guests = await ctx.db
    .query('rsvpGuests')
    .withIndex('by_rsvp_sort', (index) => index.eq('rsvpId', family._id))
    .collect()
  return {
    id: family._id,
    displayName: family.displayName,
    phone: family.phone,
    ...(family.contact === undefined ? {} : { contact: family.contact }),
    updatedAt: family.updatedAt,
    guests: guests.map((guest) => ({
      id: guest._id,
      publicRef: guest.publicRef,
      name: guest.name,
      attendance: guest.attendance,
      ...(guest.respondedAt === undefined ? {} : { respondedAt: guest.respondedAt }),
      sortOrder: guest.sortOrder,
    })),
  }
}

async function authorize(ctx: QueryCtx | MutationCtx, token: string) {
  return requireAdminSession(ctx, token)
}

async function readExpectedFamily(
  ctx: MutationCtx,
  familyId: Id<'rsvps'>,
  expectedUpdatedAt: number,
) {
  const family = await ctx.db.get(familyId)
  if (!family) return { kind: 'not_found' } as const
  if (family.updatedAt !== expectedUpdatedAt) {
    return {
      kind: 'conflict',
      family: await projectFamily(ctx, family),
    } as const
  }
  return { kind: 'ready', family } as const
}

function cleanFamilyPatch(patch: {
  displayName?: string
  phone?: string
  contact?: string | null
}) {
  const displayName = patch.displayName?.trim()
  if (
    patch.displayName !== undefined &&
    (!displayName || displayName.length > RSVP_DISPLAY_NAME_MAX_LENGTH)
  ) {
    return { kind: 'invalid', field: 'displayName', message: 'Nome da família inválido.' } as const
  }
  const contact = patch.contact?.trim()
  if (contact && contact.length > CONTACT_MAX_LENGTH) {
    return { kind: 'invalid', field: 'contact', message: 'Contato muito longo.' } as const
  }
  const normalizedPhone =
    patch.phone === undefined ? undefined : normalizePhone(patch.phone)
  if (normalizedPhone?.kind === 'invalid') {
    return { kind: 'invalid', field: 'phone', message: 'Telefone inválido.' } as const
  }
  return {
    kind: 'valid',
    displayName,
    contact: patch.contact === undefined ? undefined : contact || null,
    phone: normalizedPhone?.phone,
    normalizedPhone,
  } as const
}

export const listFamilies = query({
  args: { token: v.string() },
  returns: v.union(
    unauthorizedValidator,
    v.object({ kind: v.literal('ready'), families: v.array(adminFamilyValidator) }),
  ),
  handler: async (ctx, args) => {
    if ((await authorize(ctx, args.token)).kind !== 'authorized') {
      return { kind: 'unauthorized' } as const
    }
    const families = await ctx.db.query('rsvps').collect()
    const projected = await Promise.all(
      families
        .sort((a, b) => a.displayName.localeCompare(b.displayName, 'pt-BR'))
        .map((family) => projectFamily(ctx, family)),
    )
    return { kind: 'ready', families: projected } as const
  },
})

export const createFamily = mutation({
  args: {
    token: v.string(),
    displayName: v.string(),
    phone: v.string(),
    contact: v.optional(v.string()),
    guests: v.array(v.object({ name: v.string(), attendance: attendanceValidator })),
  },
  returns: v.union(unauthorizedValidator, invalidValidator, savedValidator),
  handler: async (ctx, args) => {
    if ((await authorize(ctx, args.token)).kind !== 'authorized') {
      return { kind: 'unauthorized' } as const
    }
    try {
      const inserted = await insertInvitation(ctx, {
        displayName: args.displayName,
        phone: args.phone,
        ...(args.contact === undefined ? {} : { contact: args.contact }),
        guests: args.guests,
      })
      const family = await ctx.db.get(inserted.rsvpId)
      if (!family) throw new Error('Família recém-criada não encontrada.')
      return { kind: 'saved', family: await projectFamily(ctx, family) } as const
    } catch (error) {
      return {
        kind: 'invalid',
        field: error instanceof Error && /telefone|phone/i.test(error.message) ? 'phone' : undefined,
        message: error instanceof Error ? error.message : 'Não foi possível criar a família.',
      } as const
    }
  },
})

export const updateFamily = mutation({
  args: {
    token: v.string(),
    familyId: v.id('rsvps'),
    expectedUpdatedAt: v.number(),
    patch: v.object({
      displayName: v.optional(v.string()),
      phone: v.optional(v.string()),
      contact: v.optional(v.union(v.string(), v.null())),
    }),
  },
  returns: mutationResultValidator,
  handler: async (ctx, args) => {
    if ((await authorize(ctx, args.token)).kind !== 'authorized') return { kind: 'unauthorized' } as const
    const expected = await readExpectedFamily(ctx, args.familyId, args.expectedUpdatedAt)
    if (expected.kind !== 'ready') return expected
    const clean = cleanFamilyPatch(args.patch)
    if (clean.kind !== 'valid') return clean

    const currentPhone = normalizePhone(expected.family.phone)
    const phoneChanged =
      clean.normalizedPhone !== undefined &&
      (currentPhone.kind === 'invalid'
        ? clean.phone !== expected.family.phone
        : clean.normalizedPhone.normalizedKey !== currentPhone.normalizedKey)
    if (phoneChanged && clean.normalizedPhone) {
      const existing = await findLogicalInvitation(ctx, clean.normalizedPhone)
      if (existing && existing._id !== expected.family._id) {
        return { kind: 'invalid', field: 'phone', message: 'Este telefone já pertence a outra família.' } as const
      }
      const sessions = await ctx.db
        .query('rsvpSessions')
        .withIndex('by_rsvp', (index) => index.eq('rsvpId', expected.family._id))
        .take(MAX_CASCADE_SESSIONS + 1)
      if (sessions.length > MAX_CASCADE_SESSIONS) {
        return { kind: 'invalid', message: 'Há acessos demais para concluir com segurança.' } as const
      }
      for (const session of sessions) await ctx.db.delete(session._id)
    }

    const nextUpdatedAt = nextRsvpUpdatedAt(expected.family.updatedAt, Date.now())
    await ctx.db.patch(expected.family._id, {
      ...(clean.displayName === undefined ? {} : { displayName: clean.displayName }),
      ...(clean.phone === undefined ? {} : { phone: clean.phone }),
      ...(clean.contact === undefined ? {} : { contact: clean.contact ?? undefined }),
      updatedAt: nextUpdatedAt,
    })
    const family = await ctx.db.get(expected.family._id)
    if (!family) throw new Error('Família desapareceu durante a atualização.')
    return { kind: 'saved', family: await projectFamily(ctx, family) } as const
  },
})

export const addGuest = mutation({
  args: {
    token: v.string(),
    familyId: v.id('rsvps'),
    expectedUpdatedAt: v.number(),
    name: v.string(),
    attendance: attendanceValidator,
  },
  returns: mutationResultValidator,
  handler: async (ctx, args) => {
    if ((await authorize(ctx, args.token)).kind !== 'authorized') return { kind: 'unauthorized' } as const
    const expected = await readExpectedFamily(ctx, args.familyId, args.expectedUpdatedAt)
    if (expected.kind !== 'ready') return expected
    const name = args.name.trim()
    if (!name || name.length > RSVP_GUEST_NAME_MAX_LENGTH) {
      return { kind: 'invalid', field: 'name', message: 'Nome de pessoa inválido.' } as const
    }
    const guests = await ctx.db
      .query('rsvpGuests')
      .withIndex('by_rsvp_sort', (index) => index.eq('rsvpId', expected.family._id))
      .collect()
    if (guests.length >= MAX_RSVP_GUESTS) {
      return { kind: 'invalid', message: `O convite aceita até ${MAX_RSVP_GUESTS} pessoas.` } as const
    }
    const now = Date.now()
    await ctx.db.insert('rsvpGuests', {
      rsvpId: expected.family._id,
      publicRef: await createUniqueGuestPublicRef(ctx, expected.family._id),
      name,
      attendance: args.attendance,
      sortOrder: guests.reduce((maximum, guest) => Math.max(maximum, guest.sortOrder), -1) + 1,
      ...(args.attendance === 'pending' ? {} : { respondedAt: now }),
    })
    await ctx.db.patch(expected.family._id, {
      updatedAt: nextRsvpUpdatedAt(expected.family.updatedAt, now),
    })
    const family = await ctx.db.get(expected.family._id)
    if (!family) throw new Error('Família não encontrada após adicionar pessoa.')
    return { kind: 'saved', family: await projectFamily(ctx, family) } as const
  },
})

export const updateGuest = mutation({
  args: {
    token: v.string(),
    familyId: v.id('rsvps'),
    guestId: v.id('rsvpGuests'),
    expectedUpdatedAt: v.number(),
    patch: v.object({
      name: v.optional(v.string()),
      attendance: v.optional(attendanceValidator),
    }),
  },
  returns: mutationResultValidator,
  handler: async (ctx, args) => {
    if ((await authorize(ctx, args.token)).kind !== 'authorized') return { kind: 'unauthorized' } as const
    const expected = await readExpectedFamily(ctx, args.familyId, args.expectedUpdatedAt)
    if (expected.kind !== 'ready') return expected
    const guest = await ctx.db.get(args.guestId)
    if (!guest || guest.rsvpId !== expected.family._id) return { kind: 'not_found' } as const
    const name = args.patch.name?.trim()
    if (args.patch.name !== undefined && (!name || name.length > RSVP_GUEST_NAME_MAX_LENGTH)) {
      return { kind: 'invalid', field: 'name', message: 'Nome de pessoa inválido.' } as const
    }
    const now = Date.now()
    const attendance = args.patch.attendance ?? guest.attendance
    await ctx.db.patch(guest._id, {
      ...(name === undefined ? {} : { name }),
      ...(args.patch.attendance === undefined ? {} : { attendance }),
      ...(args.patch.attendance === undefined
        ? {}
        : { respondedAt: attendance === 'pending' ? undefined : now }),
    })
    await ctx.db.patch(expected.family._id, {
      updatedAt: nextRsvpUpdatedAt(expected.family.updatedAt, now),
    })
    const family = await ctx.db.get(expected.family._id)
    if (!family) throw new Error('Família não encontrada após editar pessoa.')
    return { kind: 'saved', family: await projectFamily(ctx, family) } as const
  },
})

export const removeGuest = mutation({
  args: {
    token: v.string(),
    familyId: v.id('rsvps'),
    guestId: v.id('rsvpGuests'),
    expectedUpdatedAt: v.number(),
  },
  returns: mutationResultValidator,
  handler: async (ctx, args) => {
    if ((await authorize(ctx, args.token)).kind !== 'authorized') return { kind: 'unauthorized' } as const
    const expected = await readExpectedFamily(ctx, args.familyId, args.expectedUpdatedAt)
    if (expected.kind !== 'ready') return expected
    const guest = await ctx.db.get(args.guestId)
    if (!guest || guest.rsvpId !== expected.family._id) return { kind: 'not_found' } as const
    await ctx.db.delete(guest._id)
    await ctx.db.patch(expected.family._id, {
      updatedAt: nextRsvpUpdatedAt(expected.family.updatedAt, Date.now()),
    })
    const family = await ctx.db.get(expected.family._id)
    if (!family) throw new Error('Família não encontrada após remover pessoa.')
    return { kind: 'saved', family: await projectFamily(ctx, family) } as const
  },
})

export const removeFamily = mutation({
  args: {
    token: v.string(),
    familyId: v.id('rsvps'),
    expectedUpdatedAt: v.number(),
  },
  returns: removedValidator,
  handler: async (ctx, args) => {
    if ((await authorize(ctx, args.token)).kind !== 'authorized') return { kind: 'unauthorized' } as const
    const expected = await readExpectedFamily(ctx, args.familyId, args.expectedUpdatedAt)
    if (expected.kind !== 'ready') return expected
    const guests = await ctx.db
      .query('rsvpGuests')
      .withIndex('by_rsvp', (index) => index.eq('rsvpId', expected.family._id))
      .take(MAX_RSVP_GUESTS + 1)
    const sessions = await ctx.db
      .query('rsvpSessions')
      .withIndex('by_rsvp', (index) => index.eq('rsvpId', expected.family._id))
      .take(MAX_CASCADE_SESSIONS + 1)
    if (guests.length > MAX_RSVP_GUESTS || sessions.length > MAX_CASCADE_SESSIONS) {
      return { kind: 'invalid', message: 'A família excede o limite seguro de remoção.' } as const
    }
    for (const guest of guests) await ctx.db.delete(guest._id)
    for (const session of sessions) await ctx.db.delete(session._id)
    await ctx.db.delete(expected.family._id)
    return { kind: 'removed' } as const
  },
})
