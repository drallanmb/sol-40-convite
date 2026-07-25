import { v } from 'convex/values'
import type { FunctionReference } from 'convex/server'
import { normalizePhone } from '../src/lib/phone'
import { internal } from './_generated/api'
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
import {
  normalizeRsvpGeneration,
} from './rsvpSecurity'

type SessionPurgeCommand =
  | { kind: 'olderThanGeneration'; commandGeneration: number }
  | { kind: 'deleteAll' }

const purgeRsvpSessionsBatchRef = (internal as unknown as {
  rsvpInternal: {
    purgeRsvpSessionsBatch: FunctionReference<
      'mutation',
      'internal',
      {
        rsvpId: Id<'rsvps'>
        command: SessionPurgeCommand
      },
      unknown
    >
  }
}).rsvpInternal.purgeRsvpSessionsBatch

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

const importIgnoredCodeValidator = v.union(
  v.literal('invalid_family'),
  v.literal('invalid_phone'),
  v.literal('invalid_guest'),
  v.literal('phone_family_conflict'),
  v.literal('existing_phone'),
)

const importFamilyGroupValidator = v.object({
  sourceRows: v.array(v.number()),
  displayName: v.string(),
  phone: v.string(),
  guests: v.array(
    v.object({
      sourceRow: v.number(),
      name: v.string(),
    }),
  ),
})

const importFamiliesResultValidator = v.union(
  unauthorizedValidator,
  v.object({
    kind: v.literal('ready'),
    created: v.array(
      v.object({
        sourceRows: v.array(v.number()),
        familyId: v.id('rsvps'),
        displayName: v.string(),
        people: v.number(),
      }),
    ),
    ignored: v.array(
      v.object({
        sourceRows: v.array(v.number()),
        code: importIgnoredCodeValidator,
        message: v.string(),
      }),
    ),
  }),
)

const IMPORT_MAX_FAMILIES = 25
const IMPORT_MAX_PEOPLE = 100

function isPositiveInteger(value: number) {
  return Number.isSafeInteger(value) && value > 0
}

function collapseWhitespace(value: string) {
  return value.trim().replace(/\s+/gu, ' ')
}

function importIdentity(value: string) {
  return collapseWhitespace(value)
    .normalize('NFKC')
    .toLocaleLowerCase('pt-BR')
}

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

export const importFamilies = mutation({
  args: {
    token: v.string(),
    groups: v.array(importFamilyGroupValidator),
  },
  returns: importFamiliesResultValidator,
  handler: async (ctx, args) => {
    if ((await authorize(ctx, args.token)).kind !== 'authorized') {
      return { kind: 'unauthorized' } as const
    }

    if (args.groups.length > IMPORT_MAX_FAMILIES) {
      throw new Error(`Cada lote aceita no máximo ${IMPORT_MAX_FAMILIES} famílias.`)
    }
    const people = args.groups.reduce(
      (total, group) => total + group.guests.length,
      0,
    )
    if (people > IMPORT_MAX_PEOPLE) {
      throw new Error(`Cada lote aceita no máximo ${IMPORT_MAX_PEOPLE} pessoas.`)
    }

    const created: Array<{
      sourceRows: number[]
      familyId: Id<'rsvps'>
      displayName: string
      people: number
    }> = []
    const ignored: Array<{
      sourceRows: number[]
      code:
        | 'invalid_family'
        | 'invalid_phone'
        | 'invalid_guest'
        | 'phone_family_conflict'
        | 'existing_phone'
      message: string
    }> = []

    const validGroups: Array<{
      sourceRows: number[]
      displayName: string
      normalizedPhone: Exclude<ReturnType<typeof normalizePhone>, { kind: 'invalid' }>
      guests: Array<{ sourceRow: number; name: string }>
    }> = []

    for (const group of args.groups) {
      const sourceRows = [...new Set(group.sourceRows)]
      const displayName = collapseWhitespace(group.displayName)
      if (
        sourceRows.length === 0 ||
        sourceRows.some((row) => !isPositiveInteger(row)) ||
        !displayName ||
        displayName.length > RSVP_DISPLAY_NAME_MAX_LENGTH
      ) {
        ignored.push({
          sourceRows,
          code: 'invalid_family',
          message: 'Nome ou linhas da família inválidos.',
        })
        continue
      }

      const normalizedPhone = normalizePhone(group.phone)
      if (normalizedPhone.kind === 'invalid') {
        ignored.push({
          sourceRows,
          code: 'invalid_phone',
          message: 'Telefone brasileiro inválido.',
        })
        continue
      }

      const guests = group.guests.map((guest) => ({
        sourceRow: guest.sourceRow,
        name: collapseWhitespace(guest.name),
      }))
      const guestIdentities = guests.map((guest) => importIdentity(guest.name))
      if (
        guests.length === 0 ||
        guests.length > MAX_RSVP_GUESTS ||
        new Set(guestIdentities).size !== guestIdentities.length ||
        guests.some(
          (guest) =>
            !isPositiveInteger(guest.sourceRow) ||
            !sourceRows.includes(guest.sourceRow) ||
            !guest.name ||
            guest.name.length > RSVP_GUEST_NAME_MAX_LENGTH,
        )
      ) {
        ignored.push({
          sourceRows,
          code: 'invalid_guest',
          message: 'Uma ou mais pessoas têm dados inválidos.',
        })
        continue
      }

      validGroups.push({
        sourceRows,
        displayName,
        normalizedPhone,
        guests,
      })
    }

    const familyNamesByPhone = new Map<string, Set<string>>()
    for (const group of validGroups) {
      const familyNames =
        familyNamesByPhone.get(group.normalizedPhone.normalizedKey) ??
        new Set<string>()
      familyNames.add(importIdentity(group.displayName))
      familyNamesByPhone.set(group.normalizedPhone.normalizedKey, familyNames)
    }

    for (const group of validGroups) {
      const {
        sourceRows,
        displayName,
        normalizedPhone,
        guests,
      } = group
      if (
        (familyNamesByPhone.get(normalizedPhone.normalizedKey)?.size ?? 0) > 1
      ) {
        ignored.push({
          sourceRows,
          code: 'phone_family_conflict',
          message: 'O mesmo telefone foi associado a famílias diferentes.',
        })
        continue
      }

      if (await findLogicalInvitation(ctx, normalizedPhone)) {
        ignored.push({
          sourceRows,
          code: 'existing_phone',
          message: 'Este telefone já pertence a uma família cadastrada.',
        })
        continue
      }

      const inserted = await insertInvitation(ctx, {
        displayName,
        phone: normalizedPhone.phone,
        guests: guests.map((guest) => ({
          name: guest.name,
          attendance: 'pending' as const,
        })),
      })
      created.push({
        sourceRows,
        familyId: inserted.rsvpId,
        displayName,
        people: guests.length,
      })
    }

    return { kind: 'ready', created, ignored } as const
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
    }

    const nextUpdatedAt = nextRsvpUpdatedAt(expected.family.updatedAt, Date.now())
    const commandGeneration = phoneChanged
      ? normalizeRsvpGeneration(expected.family.generation) + 1
      : undefined
    await ctx.db.patch(expected.family._id, {
      ...(clean.displayName === undefined ? {} : { displayName: clean.displayName }),
      ...(clean.phone === undefined ? {} : { phone: clean.phone }),
      ...(clean.contact === undefined ? {} : { contact: clean.contact ?? undefined }),
      ...(commandGeneration === undefined ? {} : { generation: commandGeneration }),
      updatedAt: nextUpdatedAt,
    })
    if (commandGeneration !== undefined) {
      await ctx.scheduler.runAfter(0, purgeRsvpSessionsBatchRef, {
        rsvpId: expected.family._id,
        command: {
          kind: 'olderThanGeneration',
          commandGeneration,
        },
      })
    }
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
    if (guests.length > MAX_RSVP_GUESTS) {
      return { kind: 'invalid', message: 'A família excede o limite seguro de remoção.' } as const
    }
    for (const guest of guests) await ctx.db.delete(guest._id)
    await ctx.db.delete(expected.family._id)
    await ctx.scheduler.runAfter(0, purgeRsvpSessionsBatchRef, {
      rsvpId: expected.family._id,
      command: { kind: 'deleteAll' },
    })
    return { kind: 'removed' } as const
  },
})
