import { v } from 'convex/values'
import type { FunctionReference } from 'convex/server'
import { normalizePhone, type NormalizedPhone } from '../src/lib/phone'
import { api, internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import {
  internalAction,
  internalMutation,
  type MutationCtx,
} from './_generated/server'
import {
  CONTACT_MAX_LENGTH,
  demoFixtureLabelValidator,
  MAX_RSVP_GUESTS,
  RSVP_DEMO_FIXTURE_FLAG,
  RSVP_DEMO_SEED_MIN_BYTES,
  RSVP_DISPLAY_NAME_MAX_LENGTH,
  RSVP_GUEST_NAME_MAX_LENGTH,
  type Attendance,
  type DemoFixtureLabel,
} from './rsvpModel'
import {
  createRsvpSession,
  encodeOpaqueToken,
  hashOpaqueToken,
  normalizeRsvpGeneration,
  validateOpaqueToken,
} from './rsvpSecurity'

export const RSVP_SESSION_SWEEP_PAGE_SIZE = 50
export const RSVP_SESSION_PURGE_PAGE_SIZE = 50

export type RsvpSessionPurgeCommand =
  | {
      kind: 'olderThanGeneration'
      commandGeneration: number
    }
  | {
      kind: 'deleteAll'
    }

const continueExpiredRsvpSessionSweepRef = (internal as unknown as {
  rsvpInternal: {
    continueExpiredRsvpSessionSweep: FunctionReference<
      'mutation',
      'internal',
      { cursor: string; cutoff: number },
      unknown
    >
  }
}).rsvpInternal.continueExpiredRsvpSessionSweep

const purgeRsvpSessionsBatchRef = (internal as unknown as {
  rsvpInternal: {
    purgeRsvpSessionsBatch: FunctionReference<
      'mutation',
      'internal',
      {
        rsvpId: Id<'rsvps'>
        cursor?: string
        command: RsvpSessionPurgeCommand
      },
      unknown
    >
  }
}).rsvpInternal.purgeRsvpSessionsBatch

export async function expireRsvpSessionRecord(
  ctx: Pick<MutationCtx, 'db'>,
  {
    sessionId,
    expectedExpiresAt,
  }: {
    sessionId: Id<'rsvpSessions'>
    expectedExpiresAt: number
  },
) {
  const session = await ctx.db.get(sessionId)
  if (!session || session.expiresAt !== expectedExpiresAt) {
    return { kind: 'ignored' } as const
  }

  await ctx.db.delete(sessionId)
  return { kind: 'expired' } as const
}

export const expireRsvpSession = internalMutation({
  args: {
    sessionId: v.id('rsvpSessions'),
    expectedExpiresAt: v.number(),
  },
  returns: v.union(
    v.object({ kind: v.literal('expired') }),
    v.object({ kind: v.literal('ignored') }),
  ),
  handler: expireRsvpSessionRecord,
})

function assertSweepCutoff(cutoff: number, now: number) {
  if (
    !Number.isFinite(cutoff) ||
    !Number.isInteger(cutoff) ||
    cutoff < 0 ||
    cutoff > now
  ) {
    throw new Error('Invalid RSVP session sweep cutoff')
  }
}

function assertSweepCursor(cursor: string) {
  if (
    cursor.length === 0 ||
    cursor.length > 16_384 ||
    cursor.trim() !== cursor ||
    /[\u0000-\u001f\u007f]/.test(cursor)
  ) {
    throw new Error('Invalid RSVP session sweep cursor')
  }
}

function assertRsvpSessionPurgeCommand(
  command: unknown,
): asserts command is RsvpSessionPurgeCommand {
  if (!command || typeof command !== 'object' || Array.isArray(command)) {
    throw new Error('Invalid RSVP session purge command')
  }

  const record = command as Record<string, unknown>
  if (record.kind === 'deleteAll') {
    if (Object.keys(record).length !== 1) {
      throw new Error('Invalid RSVP session purge command')
    }
    return
  }

  if (
    record.kind !== 'olderThanGeneration' ||
    Object.keys(record).length !== 2 ||
    !Object.prototype.hasOwnProperty.call(record, 'commandGeneration') ||
    typeof record.commandGeneration !== 'number' ||
    !Number.isFinite(record.commandGeneration) ||
    !Number.isInteger(record.commandGeneration) ||
    record.commandGeneration < 0
  ) {
    throw new Error('Invalid RSVP session purge command')
  }
}

export async function purgeRsvpSessionsBatchHandler(
  ctx: MutationCtx,
  {
    rsvpId,
    cursor,
    command,
  }: {
    rsvpId: Id<'rsvps'>
    cursor: string | null
    command: unknown
  },
) {
  assertRsvpSessionPurgeCommand(command)
  if (cursor !== null) assertSweepCursor(cursor)

  const firstCandidate = await ctx.db
    .query('rsvpSessions')
    .withIndex('by_rsvp', (index) => index.eq('rsvpId', rsvpId))
    .order('asc')
    .first()
  if (!firstCandidate) {
    return {
      scanned: 0,
      deleted: 0,
      done: true,
    } as const
  }

  const page = await ctx.db
    .query('rsvpSessions')
    .withIndex('by_rsvp', (index) => index.eq('rsvpId', rsvpId))
    .order('asc')
    .paginate({
      cursor,
      numItems: RSVP_SESSION_PURGE_PAGE_SIZE,
    })

  let deleted = 0
  for (const candidate of page.page) {
    const current = await ctx.db.get(candidate._id)
    if (!current || current.rsvpId !== rsvpId) continue
    if (
      command.kind === 'deleteAll' ||
      normalizeRsvpGeneration(current.generation) < command.commandGeneration
    ) {
      await ctx.db.delete(current._id)
      deleted += 1
    }
  }

  if (!page.isDone) {
    await ctx.scheduler.runAfter(0, purgeRsvpSessionsBatchRef, {
      rsvpId,
      cursor: page.continueCursor,
      command,
    })
  }

  return {
    scanned: page.page.length,
    deleted,
    done: page.isDone,
    ...(page.isDone ? {} : { nextCursor: page.continueCursor }),
  }
}

const rsvpSessionPurgeCommandValidator = v.union(
  v.object({
    kind: v.literal('olderThanGeneration'),
    commandGeneration: v.number(),
  }),
  v.object({
    kind: v.literal('deleteAll'),
  }),
)

export const purgeRsvpSessionsBatch = internalMutation({
  args: {
    rsvpId: v.id('rsvps'),
    cursor: v.optional(v.string()),
    command: rsvpSessionPurgeCommandValidator,
  },
  returns: v.object({
    scanned: v.number(),
    deleted: v.number(),
    done: v.boolean(),
    nextCursor: v.optional(v.string()),
  }),
  handler: (ctx, args) =>
    purgeRsvpSessionsBatchHandler(ctx, {
      ...args,
      cursor: args.cursor ?? null,
    }),
})

async function sweepExpiredRsvpSessionPage(
  ctx: MutationCtx,
  {
    cursor,
    cutoff,
  }: {
    cursor: string | null
    cutoff: number
  },
) {
  const firstCandidate = await ctx.db
    .query('rsvpSessions')
    .withIndex('by_expires_at', (index) => index.lte('expiresAt', cutoff))
    .order('asc')
    .first()
  if (!firstCandidate) {
    return {
      scanned: 0,
      deleted: 0,
      done: true,
    } as const
  }

  const page = await ctx.db
    .query('rsvpSessions')
    .withIndex('by_expires_at', (index) => index.lte('expiresAt', cutoff))
    .order('asc')
    .paginate({
      cursor,
      numItems: RSVP_SESSION_SWEEP_PAGE_SIZE,
    })

  let deleted = 0
  for (const candidate of page.page) {
    const current = await ctx.db.get(candidate._id)
    if (current && current.expiresAt <= cutoff) {
      await ctx.db.delete(current._id)
      deleted += 1
    }
  }

  if (!page.isDone) {
    await ctx.scheduler.runAfter(
      0,
      continueExpiredRsvpSessionSweepRef,
      {
        cursor: page.continueCursor,
        cutoff,
      },
    )
  }

  return {
    scanned: page.page.length,
    deleted,
    done: page.isDone,
    ...(page.isDone ? {} : { nextCursor: page.continueCursor }),
  }
}

export async function startExpiredRsvpSessionSweepHandler(ctx: MutationCtx) {
  const cutoff = Date.now()
  assertSweepCutoff(cutoff, cutoff)
  return sweepExpiredRsvpSessionPage(ctx, { cursor: null, cutoff })
}

const sweepResultValidator = v.object({
  scanned: v.number(),
  deleted: v.number(),
  done: v.boolean(),
  nextCursor: v.optional(v.string()),
})

export const startExpiredRsvpSessionSweep = internalMutation({
  args: {},
  returns: sweepResultValidator,
  handler: startExpiredRsvpSessionSweepHandler,
})

export async function continueExpiredRsvpSessionSweepHandler(
  ctx: MutationCtx,
  {
    cursor,
    cutoff,
  }: {
    cursor: string
    cutoff: number
  },
) {
  assertSweepCursor(cursor)
  assertSweepCutoff(cutoff, Date.now())
  return sweepExpiredRsvpSessionPage(ctx, { cursor, cutoff })
}

export const continueExpiredRsvpSessionSweep = internalMutation({
  args: {
    cursor: v.string(),
    cutoff: v.number(),
  },
  returns: sweepResultValidator,
  handler: continueExpiredRsvpSessionSweepHandler,
})

declare const process: {
  env: Record<string, string | undefined>
}

type InvitationGuestInput = {
  name: string
  attendance: Attendance
}

export type InvitationInput = {
  phone: string
  displayName: string
  contact?: string
  guests: InvitationGuestInput[]
}

type InsertedInvitation = {
  rsvpId: Id<'rsvps'>
  guestIds: Id<'rsvpGuests'>[]
  phone: string
}

type DemoDefinition = {
  label: DemoFixtureLabel
  phone: string
  displayName: string
  guests: InvitationGuestInput[]
}

const encoder = new TextEncoder()

// A seleção continua derivada do seed; a lista contém somente DDDs, nunca telefones.
const DEMO_DDDS = ['11', '21', '31', '41', '51', '61', '71', '79', '81', '91']

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function sha256(value: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value))
  return new Uint8Array(digest)
}

async function hmacSha256(seed: string, value: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(seed),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value))
  return new Uint8Array(signature)
}

async function derivePublicRef(
  canonicalPhone: string,
  sortOrder: number,
  guestName: string,
): Promise<string> {
  const digest = await sha256(`${canonicalPhone}\u0000${sortOrder}\u0000${guestName}`)
  return `guest_${bytesToHex(digest.slice(0, 16))}`
}

export function normalizedLookupCandidates(normalized: Exclude<NormalizedPhone, { kind: 'invalid' }>) {
  const candidates = new Set(normalized.lookupCandidates)

  // Dados importados antigos podem ter guardado a forma de oito dígitos.
  // A forma atual também consulta essa inversa para impedir uma segunda família.
  if (normalized.kind === 'canonical' && normalized.phone.length === 11) {
    candidates.add(`${normalized.phone.slice(0, 2)}${normalized.phone.slice(3)}`)
  }

  return [...candidates]
}

export async function findLogicalInvitation(
  ctx: MutationCtx,
  normalized: Exclude<NormalizedPhone, { kind: 'invalid' }>,
) {
  const matches = new Map<string, Awaited<ReturnType<typeof ctx.db.get<'rsvps'>>>>()

  for (const candidate of normalizedLookupCandidates(normalized)) {
    const candidateMatches = await ctx.db
      .query('rsvps')
      .withIndex('by_phone', (query) => query.eq('phone', candidate))
      .collect()

    if (candidateMatches.length > 1) {
      throw new Error('Invariante violada: telefone duplicado no RSVP.')
    }

    for (const match of candidateMatches) {
      matches.set(String(match._id), match)
    }
  }

  if (matches.size > 1) {
    throw new Error('Invariante violada: candidatos equivalentes apontam para convites distintos.')
  }

  return [...matches.values()][0] ?? null
}

export async function createUniqueGuestPublicRef(
  ctx: Pick<MutationCtx, 'db'>,
  rsvpId: Id<'rsvps'>,
) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    const publicRef = `guest_${bytesToHex(bytes)}`
    const collision = await ctx.db
      .query('rsvpGuests')
      .withIndex('by_rsvp_public_ref', (query) =>
        query.eq('rsvpId', rsvpId).eq('publicRef', publicRef),
      )
      .first()
    if (!collision) return publicRef
  }
  throw new Error('Não foi possível gerar uma referência pública única.')
}

function normalizeInvitationInput(input: InvitationInput) {
  const normalizedPhone = normalizePhone(input.phone)
  if (normalizedPhone.kind === 'invalid') {
    throw new Error('Telefone inválido para o convite.')
  }

  const displayName = input.displayName.trim()
  if (!displayName || displayName.length > RSVP_DISPLAY_NAME_MAX_LENGTH) {
    throw new Error('Nome do convite inválido.')
  }

  if (input.guests.length > MAX_RSVP_GUESTS) {
    throw new Error(`O convite excede o limite de ${MAX_RSVP_GUESTS} pessoas.`)
  }

  const guests = input.guests.map((guest) => {
    const name = guest.name.trim()
    if (!name || name.length > RSVP_GUEST_NAME_MAX_LENGTH) {
      throw new Error('Nome de pessoa inválido.')
    }
    if (
      guest.attendance !== 'pending' &&
      guest.attendance !== 'yes' &&
      guest.attendance !== 'no'
    ) {
      throw new Error('Resposta de presença inválida.')
    }
    return { name, attendance: guest.attendance }
  })

  const contact = input.contact?.trim()
  if (contact && contact.length > CONTACT_MAX_LENGTH) {
    throw new Error(`Contato excede ${CONTACT_MAX_LENGTH} caracteres.`)
  }

  return {
    normalizedPhone,
    displayName,
    contact: contact || undefined,
    guests,
  }
}

/**
 * Única costura de criação desta fase. É uma função interna de módulo, não uma
 * função Convex pública; importadores administrativos futuros devem reutilizá-la.
 */
export async function insertInvitation(
  ctx: MutationCtx,
  input: InvitationInput,
): Promise<InsertedInvitation> {
  const normalized = normalizeInvitationInput(input)
  const existing = await findLogicalInvitation(ctx, normalized.normalizedPhone)
  if (existing) {
    throw new Error('Já existe um convite para um telefone equivalente.')
  }

  const now = Date.now()
  const rsvpId = await ctx.db.insert('rsvps', {
    phone: normalized.normalizedPhone.phone,
    displayName: normalized.displayName,
    ...(normalized.contact ? { contact: normalized.contact } : {}),
    updatedAt: now,
  })

  const guestIds: Id<'rsvpGuests'>[] = []
  const publicRefs = new Set<string>()

  for (const [sortOrder, guest] of normalized.guests.entries()) {
    const publicRef = await derivePublicRef(
      normalized.normalizedPhone.phone,
      sortOrder,
      guest.name,
    )
    if (publicRefs.has(publicRef)) {
      throw new Error('Invariante violada: referência pública de pessoa duplicada.')
    }
    publicRefs.add(publicRef)

    const guestId = await ctx.db.insert('rsvpGuests', {
      rsvpId,
      publicRef,
      name: guest.name,
      attendance: guest.attendance,
      sortOrder,
      ...(guest.attendance === 'pending' ? {} : { respondedAt: now }),
    })
    guestIds.push(guestId)
  }

  return {
    rsvpId,
    guestIds,
    phone: normalized.normalizedPhone.phone,
  }
}

function readDemoSeed(): string {
  if (process.env.RSVP_ENABLE_DEMO_FIXTURES !== RSVP_DEMO_FIXTURE_FLAG) {
    throw new Error('Fixtures de RSVP estão desabilitadas.')
  }

  const seed = process.env.RSVP_DEMO_SEED
  if (!seed || encoder.encode(seed).byteLength < RSVP_DEMO_SEED_MIN_BYTES) {
    throw new Error(`RSVP_DEMO_SEED deve ter ao menos ${RSVP_DEMO_SEED_MIN_BYTES} bytes.`)
  }

  return seed
}

async function deriveDemoPhones(seed: string, labels: DemoFixtureLabel[]) {
  const used = new Set<string>()
  const phones = new Map<DemoFixtureLabel, string>()

  for (const label of labels) {
    let attempt = 0
    while (true) {
      const digest = await hmacSha256(seed, `rsvp-demo:${label}:${attempt}`)
      const ddd = DEMO_DDDS[digest[0] % DEMO_DDDS.length]
      const subscriber = Array.from(digest.slice(1, 9), (byte) => String(byte % 10)).join('')
      const phone = `${ddd}9${subscriber}`

      if (!used.has(phone)) {
        used.add(phone)
        phones.set(label, phone)
        break
      }
      attempt += 1
    }
  }

  return phones
}

async function buildDemoDefinitions(seed: string): Promise<DemoDefinition[]> {
  const labels: DemoFixtureLabel[] = ['normal', 'zero', 'one', 'many-long']
  const phones = await deriveDemoPhones(seed, labels)
  const phoneFor = (label: DemoFixtureLabel) => {
    const phone = phones.get(label)
    if (!phone) {
      throw new Error(`Invariante violada: telefone demo ausente para ${label}.`)
    }
    return phone
  }

  return [
    {
      label: 'normal',
      phone: phoneFor('normal'),
      displayName: 'Convite Demo Normal',
      guests: [
        { name: 'Pessoa Demo Pendente', attendance: 'pending' },
        { name: 'Pessoa Demo Presente', attendance: 'yes' },
        { name: 'Pessoa Demo Ausente', attendance: 'no' },
      ],
    },
    {
      label: 'zero',
      phone: phoneFor('zero'),
      displayName: 'Convite Demo Sem Pessoas',
      guests: [],
    },
    {
      label: 'one',
      phone: phoneFor('one'),
      displayName: 'Convite Demo Individual',
      guests: [{ name: 'Pessoa Demo Única', attendance: 'pending' }],
    },
    {
      label: 'many-long',
      phone: phoneFor('many-long'),
      displayName:
        'Convite Demo para um Grupo Deliberadamente Numeroso com Nome Muito Longo de Validação',
      guests: Array.from({ length: 12 }, (_, index) => ({
        name:
          index === 7
            ? 'Pessoa Demo com um Nome Deliberadamente Muito Longo para Validar Quebras de Linha em Português'
            : `Pessoa Demo Numerosa ${index + 1}`,
        attendance: 'pending' as const,
      })),
    },
  ]
}

async function reconcileFixture(ctx: MutationCtx, definition: DemoDefinition) {
  const normalized = normalizeInvitationInput(definition)
  const existing = await findLogicalInvitation(ctx, normalized.normalizedPhone)

  if (!existing) {
    const inserted = await insertInvitation(ctx, definition)
    return {
      label: definition.label,
      phone: inserted.phone,
      rsvpId: inserted.rsvpId,
      guestCount: inserted.guestIds.length,
      created: true,
    }
  }

  const existingGuests = await ctx.db
    .query('rsvpGuests')
    .withIndex('by_rsvp_sort', (query) => query.eq('rsvpId', existing._id))
    .collect()

  const bySortOrder = new Map<number, (typeof existingGuests)[number]>()
  for (const guest of existingGuests) {
    if (bySortOrder.has(guest.sortOrder)) {
      throw new Error('Invariante violada: duas pessoas têm a mesma ordem no convite.')
    }
    bySortOrder.set(guest.sortOrder, guest)
  }

  const now = Date.now()
  let changed = existing.phone !== normalized.normalizedPhone.phone ||
    existing.displayName !== normalized.displayName

  for (const [sortOrder, expected] of normalized.guests.entries()) {
    const stored = bySortOrder.get(sortOrder)
    if (!stored) {
      await ctx.db.insert('rsvpGuests', {
        rsvpId: existing._id,
        publicRef: await derivePublicRef(
          normalized.normalizedPhone.phone,
          sortOrder,
          expected.name,
        ),
        name: expected.name,
        attendance: expected.attendance,
        sortOrder,
        ...(expected.attendance === 'pending' ? {} : { respondedAt: now }),
      })
      changed = true
      continue
    }

    if (stored.name !== expected.name || stored.attendance !== expected.attendance) {
      await ctx.db.patch(stored._id, {
        name: expected.name,
        attendance: expected.attendance,
        ...(expected.attendance === 'pending'
          ? { respondedAt: undefined }
          : { respondedAt: now }),
      })
      changed = true
    }
  }

  for (const stored of existingGuests) {
    if (stored.sortOrder >= normalized.guests.length) {
      await ctx.db.delete(stored._id)
      changed = true
    }
  }

  if (changed) {
    await ctx.db.patch(existing._id, {
      phone: normalized.normalizedPhone.phone,
      displayName: normalized.displayName,
      updatedAt: now,
    })
  }

  return {
    label: definition.label,
    phone: normalized.normalizedPhone.phone,
    rsvpId: existing._id,
    guestCount: normalized.guests.length,
    created: false,
  }
}

const fixtureResultValidator = v.object({
  fixtures: v.array(
    v.object({
      label: demoFixtureLabelValidator,
      phone: v.string(),
      rsvpId: v.id('rsvps'),
      guestCount: v.number(),
      created: v.boolean(),
    }),
  ),
  totals: v.object({
    rsvps: v.number(),
    guests: v.number(),
  }),
})

export const ensureDemoFixtures = internalMutation({
  args: {},
  returns: fixtureResultValidator,
  handler: async (ctx) => {
    const definitions = await buildDemoDefinitions(readDemoSeed())
    const fixtures = []

    for (const definition of definitions) {
      fixtures.push(await reconcileFixture(ctx, definition))
    }

    return {
      fixtures,
      totals: {
        rsvps: fixtures.length,
        guests: fixtures.reduce((total, fixture) => total + fixture.guestCount, 0),
      },
    }
  },
})

const demoSessionStateValidator = v.union(
  v.literal('valid'),
  v.literal('expired'),
)

const demoSessionResultValidator = v.object({
  token: v.string(),
})

const demoSessionRevocationValidator = v.union(
  v.object({ kind: v.literal('deleted') }),
  v.object({ kind: v.literal('not_found') }),
)

async function findDemoInvitation(
  ctx: MutationCtx,
  seed: string,
  fixture: DemoFixtureLabel,
) {
  const definition = (await buildDemoDefinitions(seed)).find(
    (candidate) => candidate.label === fixture,
  )
  if (!definition) {
    return null
  }

  const normalized = normalizeInvitationInput(definition)
  return findLogicalInvitation(ctx, normalized.normalizedPhone)
}

async function deriveDemoSessionToken(
  seed: string,
  fixture: DemoFixtureLabel,
  now: number,
  sessionCount: number,
  attempt: number,
) {
  const bytes = await hmacSha256(
    seed,
    `rsvp-demo-session:${fixture}:${now}:${sessionCount}:${attempt}`,
  )
  return encodeOpaqueToken(bytes)
}

export const issueDemoSession = internalMutation({
  args: {
    fixture: demoFixtureLabelValidator,
    state: demoSessionStateValidator,
  },
  returns: demoSessionResultValidator,
  handler: async (ctx, args) => {
    const seed = readDemoSeed()
    const invitation = await findDemoInvitation(ctx, seed, args.fixture)
    if (!invitation) {
      throw new Error('Fixture demo indisponível.')
    }

    const now = Date.now()
    const sessionCount = (await ctx.db.query('rsvpSessions').collect()).length

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const token = await deriveDemoSessionToken(
        seed,
        args.fixture,
        now,
        sessionCount,
        attempt,
      )
      const created = await createRsvpSession(ctx, {
        rsvpId: invitation._id,
        token,
        now,
        ...(args.state === 'expired' ? { expiresAt: now - 1 } : {}),
      })

      if (created.kind === 'created') {
        return { token }
      }
    }

    throw new Error('Não foi possível emitir a capability demo.')
  },
})

export const revokeDemoSession = internalMutation({
  args: {
    token: v.string(),
  },
  returns: demoSessionRevocationValidator,
  handler: async (ctx, args) => {
    const seed = readDemoSeed()
    if (!validateOpaqueToken(args.token)) {
      return { kind: 'not_found' } as const
    }

    const tokenHash = await hashOpaqueToken(args.token)
    const sessions = await ctx.db
      .query('rsvpSessions')
      .withIndex('by_token_hash', (query) => query.eq('tokenHash', tokenHash))
      .collect()
    if (sessions.length !== 1) {
      return { kind: 'not_found' } as const
    }

    const demoRsvpIds = new Set<string>()
    for (const definition of await buildDemoDefinitions(seed)) {
      const normalized = normalizeInvitationInput(definition)
      const invitation = await findLogicalInvitation(ctx, normalized.normalizedPhone)
      if (invitation) {
        demoRsvpIds.add(String(invitation._id))
      }
    }

    if (!demoRsvpIds.has(String(sessions[0].rsvpId))) {
      return { kind: 'not_found' } as const
    }

    await ctx.db.delete(sessions[0]._id)
    return { kind: 'deleted' } as const
  },
})

const throttleSessionResultValidator = v.union(
  v.object({ kind: v.literal('created') }),
  v.object({ kind: v.literal('token_conflict') }),
  v.object({ kind: v.literal('invalid_token') }),
  v.object({ kind: v.literal('fixture_unavailable') }),
)

export const createDemoThrottleSession = internalMutation({
  args: {
    fixture: v.literal('normal'),
    token: v.string(),
  },
  returns: throttleSessionResultValidator,
  handler: async (ctx, args) => {
    const seed = readDemoSeed()
    if (!validateOpaqueToken(args.token)) {
      return { kind: 'invalid_token' } as const
    }

    const invitation = await findDemoInvitation(ctx, seed, args.fixture)
    if (!invitation) {
      return { kind: 'fixture_unavailable' } as const
    }

    const result = await createRsvpSession(ctx, {
      rsvpId: invitation._id,
      token: args.token,
    })
    if (result.kind === 'created') {
      return { kind: 'created' } as const
    }
    if (result.kind === 'token_conflict') {
      return { kind: 'token_conflict' } as const
    }
    return { kind: 'invalid_token' } as const
  },
})

const throttlePreparationResultValidator = v.object({
  nMinusOne: v.number(),
  atLimit: v.number(),
  successfulCalls: v.number(),
  nextCallOrdinal: v.number(),
})

export const prepareSaveThrottleDemo = internalAction({
  args: {
    fixture: v.literal('normal'),
    token: v.string(),
  },
  returns: throttlePreparationResultValidator,
  handler: async (ctx, args) => {
    readDemoSeed()

    const session = await ctx.runMutation(
      internal.rsvpInternal.createDemoThrottleSession,
      args,
    )
    if (session.kind !== 'created') {
      throw new Error('Não foi possível preparar o limite demo.')
    }

    let successfulCalls = 0
    try {
      for (let ordinal = 1; ordinal <= 30; ordinal += 1) {
        const result = await ctx.runMutation(api.rsvps.saveResponses, {
          token: args.token,
          guestUpdates: [],
          contact: { kind: 'unchanged' },
        })
        if (result.kind !== 'saved') {
          throw new Error('Throttle preparation stopped')
        }
        successfulCalls = ordinal
      }
    } catch {
      await ctx.runMutation(internal.rsvpInternal.revokeDemoSession, {
        token: args.token,
      })
      throw new Error('Não foi possível preparar o limite demo.')
    }

    return {
      nMinusOne: 29,
      atLimit: 30,
      successfulCalls,
      nextCallOrdinal: 31,
    }
  },
})
