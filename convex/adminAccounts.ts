import { v } from 'convex/values'
import { makeFunctionReference } from 'convex/server'
import type { Id } from './_generated/dataModel'
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from './_generated/server'
import {
  adminAccountStateValidator,
  adminRoleValidator,
  normalizeAdminEmail,
  requireOwner,
} from './adminAccountModel'
import {
  appendAuditEvent,
  buildAuditChanges,
} from './adminAuditModel'
import { ADMIN_SESSION_TTL_MS } from './adminModel'
import { adminRateLimiter } from './adminRateLimits'
import {
  hashAdminToken,
  requireAdminSession,
  validateAdminToken,
} from './adminSecurity'
import { ADMIN_ACCESS_LINK_TTL_MS } from './adminAccessLinks'

const DUMMY_PASSWORD_ENVELOPE =
  '$scrypt$v=1$ln=17,r=8,p=1$c29sNDAtZHVtbXktc2FsdC12MQ$yqumS5Mk1kDVII_FwzUTp7AD6tcYOeDuXStq-me6o0k'
const expireAdminSession = makeFunctionReference<
  'mutation',
  {
    sessionId: Id<'adminSessions'>
    expectedExpiresAt: number
  },
  unknown
>('adminInternal:expireAdminSession')

function retryAfterSeconds(retryAfterMs: number | undefined) {
  return Math.max(1, Math.ceil((retryAfterMs ?? 0) / 1_000))
}

function normalizeDeviceLabel(value: string) {
  const normalized = value.normalize('NFC').trim().replace(/\s+/gu, ' ')
  return normalized.slice(0, 120) || 'Aparelho sem nome'
}

const managedAccountValidator = v.object({
  id: v.id('adminAccounts'),
  displayName: v.string(),
  email: v.string(),
  role: adminRoleValidator,
  state: adminAccountStateValidator,
  createdAt: v.number(),
  updatedAt: v.number(),
  activatedAt: v.optional(v.number()),
  disabledAt: v.optional(v.number()),
})

const managedAccountFailureValidator = v.union(
  v.object({ kind: v.literal('unauthorized') }),
  v.object({ kind: v.literal('forbidden') }),
  v.object({ kind: v.literal('not_found') }),
  v.object({ kind: v.literal('conflict') }),
  v.object({ kind: v.literal('invalid'), message: v.string() }),
  v.object({ kind: v.literal('email_taken') }),
  v.object({ kind: v.literal('owner_protected') }),
)

function projectManagedAccount(account: {
  _id: Id<'adminAccounts'>
  displayName: string
  email: string
  role: 'owner' | 'manager' | 'seller'
  state: 'pending' | 'active' | 'disabled'
  createdAt: number
  updatedAt: number
  activatedAt?: number
  disabledAt?: number
}) {
  return {
    id: account._id,
    displayName: account.displayName,
    email: account.email,
    role: account.role,
    state: account.state,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    ...(account.activatedAt === undefined
      ? {}
      : { activatedAt: account.activatedAt }),
    ...(account.disabledAt === undefined
      ? {}
      : { disabledAt: account.disabledAt }),
  }
}

function nextAccountUpdatedAt(current: number, now = Date.now()) {
  return Math.max(now, current + 1)
}

async function authorizeOwner(
  ctx: Parameters<typeof requireAdminSession>[0],
  token: string,
) {
  const authorization = await requireAdminSession(ctx, token)
  if (authorization.kind === 'unauthorized') return authorization
  if (!requireOwner(authorization.principal)) {
    return { kind: 'forbidden' } as const
  }
  return authorization
}

async function revokePendingLinks(
  ctx: MutationCtx,
  accountId: Id<'adminAccounts'>,
  now: number,
  purpose?: 'activation' | 'reset',
) {
  const links = purpose
    ? await ctx.db
        .query('adminAccessLinks')
        .withIndex('by_account_purpose', (index) =>
          index.eq('accountId', accountId).eq('purpose', purpose),
        )
        .collect()
    : await ctx.db
        .query('adminAccessLinks')
        .withIndex('by_account', (index) => index.eq('accountId', accountId))
        .collect()
  for (const link of links) {
    if (link.consumedAt === undefined && link.revokedAt === undefined) {
      await ctx.db.patch(link._id, { revokedAt: now })
    }
  }
}

async function insertManagedAccessLink(
  ctx: MutationCtx,
  account: {
    _id: Id<'adminAccounts'>
    credentialVersion: number
  },
  purpose: 'activation' | 'reset',
  accessToken: string,
  now: number,
) {
  if (!validateAdminToken(accessToken)) return false
  const tokenHash = await hashAdminToken(accessToken)
  const collision = await ctx.db
    .query('adminAccessLinks')
    .withIndex('by_token_hash', (index) => index.eq('tokenHash', tokenHash))
    .first()
  if (collision) return false
  await revokePendingLinks(ctx, account._id, now, purpose)
  await ctx.db.insert('adminAccessLinks', {
    accountId: account._id,
    purpose,
    tokenHash,
    credentialVersion: account.credentialVersion,
    createdAt: now,
    expiresAt: now + ADMIN_ACCESS_LINK_TTL_MS,
  })
  return true
}

export const listManagedAccounts = query({
  args: { token: v.string() },
  returns: v.union(
    v.object({ kind: v.literal('unauthorized') }),
    v.object({ kind: v.literal('forbidden') }),
    v.object({
      kind: v.literal('ready'),
      accounts: v.array(managedAccountValidator),
    }),
  ),
  handler: async (ctx, args) => {
    const authorization = await authorizeOwner(ctx, args.token)
    if (authorization.kind !== 'authorized') return authorization
    const accounts = await ctx.db.query('adminAccounts').collect()
    accounts.sort(
      (left, right) =>
        (left.role === 'owner' ? -1 : right.role === 'owner' ? 1 : 0) ||
        left.displayName.localeCompare(right.displayName, 'pt-BR'),
    )
    return {
      kind: 'ready',
      accounts: accounts.map(projectManagedAccount),
    } as const
  },
})

export const createManagedAccount = mutation({
  args: {
    token: v.string(),
    displayName: v.string(),
    email: v.string(),
    role: v.union(v.literal('manager'), v.literal('seller')),
    accessToken: v.string(),
  },
  returns: v.union(
    managedAccountFailureValidator,
    v.object({
      kind: v.literal('created'),
      account: managedAccountValidator,
      accessToken: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const authorization = await authorizeOwner(ctx, args.token)
    if (authorization.kind !== 'authorized') return authorization
    const displayName = args.displayName.normalize('NFC').trim()
    const email = normalizeAdminEmail(args.email)
    if (
      !displayName ||
      displayName.length > 120 ||
      !/^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(email) ||
      email.length > 254 ||
      !validateAdminToken(args.accessToken)
    ) {
      return { kind: 'invalid', message: 'Confira nome, e-mail e link.' } as const
    }
    const existing = await ctx.db
      .query('adminAccounts')
      .withIndex('by_email', (index) => index.eq('email', email))
      .take(2)
    if (existing.length > 0) return { kind: 'email_taken' } as const
    const now = Date.now()
    const accountId = await ctx.db.insert('adminAccounts', {
      displayName,
      email,
      role: args.role,
      state: 'pending',
      credentialVersion: 1,
      createdAt: now,
      updatedAt: now,
    })
    const account = await ctx.db.get(accountId)
    if (
      account === null ||
      !(await insertManagedAccessLink(
        ctx,
        account,
        'activation',
        args.accessToken,
        now,
      ))
    ) {
      throw new Error('Não foi possível criar o link de ativação.')
    }
    await appendAuditEvent(ctx, {
      principal: authorization.principal,
      subjectAccountId: account._id,
      area: 'accounts',
      action: 'account_created',
      targetType: 'adminAccount',
      targetId: account._id,
      targetLabel: account.displayName,
      changes: buildAuditChanges({
        before: {},
        after: {
          displayName: account.displayName,
          email: account.email,
          role: account.role,
          state: account.state,
        },
        allowedFields: ['displayName', 'email', 'role', 'state'],
      }),
      occurredAt: now,
    })
    await appendAuditEvent(ctx, {
      principal: authorization.principal,
      subjectAccountId: account._id,
      area: 'accounts',
      action: 'access_link_generated',
      targetType: 'adminAccount',
      targetId: account._id,
      targetLabel: account.displayName,
      occurredAt: now,
    })
    return {
      kind: 'created',
      account: projectManagedAccount(account),
      accessToken: args.accessToken,
    } as const
  },
})

export const generateManagedAccessLink = mutation({
  args: {
    token: v.string(),
    accountId: v.id('adminAccounts'),
    purpose: v.union(v.literal('activation'), v.literal('reset')),
    expectedUpdatedAt: v.number(),
    accessToken: v.string(),
  },
  returns: v.union(
    managedAccountFailureValidator,
    v.object({ kind: v.literal('created'), accessToken: v.string() }),
  ),
  handler: async (ctx, args) => {
    const authorization = await authorizeOwner(ctx, args.token)
    if (authorization.kind !== 'authorized') return authorization
    const account = await ctx.db.get(args.accountId)
    if (account === null) return { kind: 'not_found' } as const
    if (account.updatedAt !== args.expectedUpdatedAt) {
      return { kind: 'conflict' } as const
    }
    if (
      (args.purpose === 'activation' && account.state !== 'pending') ||
      (args.purpose === 'reset' && account.state !== 'active')
    ) {
      return { kind: 'invalid', message: 'Este link não serve para o estado atual.' } as const
    }
    const now = Date.now()
    let linkAccount = account
    if (args.purpose === 'reset') {
      const credentialVersion = account.credentialVersion + 1
      const updatedAt = nextAccountUpdatedAt(account.updatedAt, now)
      await ctx.db.patch(account._id, { credentialVersion, updatedAt })
      const sessions = await ctx.db
        .query('adminSessions')
        .withIndex('by_account', (index) =>
          index.eq('accountId', account._id),
        )
        .collect()
      for (const session of sessions) await ctx.db.delete(session._id)
      const updated = await ctx.db.get(account._id)
      if (!updated) throw new Error('Conta desapareceu durante a redefinição.')
      linkAccount = updated
    }
    if (
      !(await insertManagedAccessLink(
        ctx,
        linkAccount,
        args.purpose,
        args.accessToken,
        now,
      ))
    ) {
      return { kind: 'invalid', message: 'Não foi possível gerar o link.' } as const
    }
    await appendAuditEvent(ctx, {
      principal: authorization.principal,
      subjectAccountId: account._id,
      area: 'accounts',
      action: 'access_link_generated',
      targetType: 'adminAccount',
      targetId: account._id,
      targetLabel: account.displayName,
      occurredAt: now,
    })
    return { kind: 'created', accessToken: args.accessToken } as const
  },
})

export const revokeManagedAccessLinks = mutation({
  args: {
    token: v.string(),
    accountId: v.id('adminAccounts'),
  },
  returns: v.union(
    managedAccountFailureValidator,
    v.object({ kind: v.literal('revoked') }),
  ),
  handler: async (ctx, args) => {
    const authorization = await authorizeOwner(ctx, args.token)
    if (authorization.kind !== 'authorized') return authorization
    const account = await ctx.db.get(args.accountId)
    if (account === null) return { kind: 'not_found' } as const
    const now = Date.now()
    await revokePendingLinks(ctx, account._id, now)
    await appendAuditEvent(ctx, {
      principal: authorization.principal,
      subjectAccountId: account._id,
      area: 'accounts',
      action: 'access_link_revoked',
      targetType: 'adminAccount',
      targetId: account._id,
      targetLabel: account.displayName,
      occurredAt: now,
    })
    return { kind: 'revoked' } as const
  },
})

export const disableManagedAccount = mutation({
  args: {
    token: v.string(),
    accountId: v.id('adminAccounts'),
    expectedUpdatedAt: v.number(),
  },
  returns: v.union(
    managedAccountFailureValidator,
    v.object({ kind: v.literal('updated'), account: managedAccountValidator }),
  ),
  handler: async (ctx, args) => {
    const authorization = await authorizeOwner(ctx, args.token)
    if (authorization.kind !== 'authorized') return authorization
    const account = await ctx.db.get(args.accountId)
    if (account === null) return { kind: 'not_found' } as const
    if (account.role === 'owner') return { kind: 'owner_protected' } as const
    if (account.updatedAt !== args.expectedUpdatedAt) {
      return { kind: 'conflict' } as const
    }
    if (account.state === 'disabled') {
      return { kind: 'invalid', message: 'A conta já está desativada.' } as const
    }
    const now = nextAccountUpdatedAt(account.updatedAt)
    await ctx.db.patch(account._id, {
      state: 'disabled',
      credentialVersion: account.credentialVersion + 1,
      disabledAt: now,
      updatedAt: now,
    })
    await revokePendingLinks(ctx, account._id, now)
    const sessions = await ctx.db
      .query('adminSessions')
      .withIndex('by_account', (index) => index.eq('accountId', account._id))
      .collect()
    for (const session of sessions) await ctx.db.delete(session._id)
    await appendAuditEvent(ctx, {
      principal: authorization.principal,
      subjectAccountId: account._id,
      area: 'accounts',
      action: 'account_disabled',
      targetType: 'adminAccount',
      targetId: account._id,
      targetLabel: account.displayName,
      changes: buildAuditChanges({
        before: { state: account.state },
        after: { state: 'disabled' },
        allowedFields: ['state'],
      }),
      occurredAt: now,
    })
    const updated = await ctx.db.get(account._id)
    if (!updated) throw new Error('Conta desapareceu durante a desativação.')
    return { kind: 'updated', account: projectManagedAccount(updated) } as const
  },
})

export const reactivateManagedAccount = mutation({
  args: {
    token: v.string(),
    accountId: v.id('adminAccounts'),
    expectedUpdatedAt: v.number(),
    accessToken: v.string(),
  },
  returns: v.union(
    managedAccountFailureValidator,
    v.object({
      kind: v.literal('updated'),
      account: managedAccountValidator,
      accessToken: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const authorization = await authorizeOwner(ctx, args.token)
    if (authorization.kind !== 'authorized') return authorization
    const account = await ctx.db.get(args.accountId)
    if (account === null) return { kind: 'not_found' } as const
    if (account.role === 'owner') return { kind: 'owner_protected' } as const
    if (account.updatedAt !== args.expectedUpdatedAt) {
      return { kind: 'conflict' } as const
    }
    if (account.state !== 'disabled' || !validateAdminToken(args.accessToken)) {
      return { kind: 'invalid', message: 'A conta não pode ser reativada.' } as const
    }
    const now = nextAccountUpdatedAt(account.updatedAt)
    const credentialVersion = account.credentialVersion + 1
    await ctx.db.patch(account._id, {
      state: 'pending',
      passwordHash: undefined,
      credentialVersion,
      disabledAt: undefined,
      updatedAt: now,
    })
    const pending = await ctx.db.get(account._id)
    if (
      pending === null ||
      !(await insertManagedAccessLink(
        ctx,
        pending,
        'activation',
        args.accessToken,
        now,
      ))
    ) {
      throw new Error('Não foi possível criar o link de reativação.')
    }
    await appendAuditEvent(ctx, {
      principal: authorization.principal,
      subjectAccountId: account._id,
      area: 'accounts',
      action: 'account_reactivated',
      targetType: 'adminAccount',
      targetId: account._id,
      targetLabel: account.displayName,
      changes: buildAuditChanges({
        before: { state: account.state },
        after: { state: 'pending' },
        allowedFields: ['state'],
      }),
      occurredAt: now,
    })
    await appendAuditEvent(ctx, {
      principal: authorization.principal,
      subjectAccountId: account._id,
      area: 'accounts',
      action: 'access_link_generated',
      targetType: 'adminAccount',
      targetId: account._id,
      targetLabel: account.displayName,
      occurredAt: now,
    })
    return {
      kind: 'updated',
      account: projectManagedAccount(pending),
      accessToken: args.accessToken,
    } as const
  },
})

export const prepareIndividualLogin = internalMutation({
  args: { email: v.string() },
  returns: v.union(
    v.object({
      kind: v.literal('ready'),
      accountId: v.optional(v.id('adminAccounts')),
      credentialVersion: v.optional(v.number()),
      passwordHash: v.string(),
    }),
    v.object({
      kind: v.literal('rate_limited'),
      retryAfterSeconds: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const email = normalizeAdminEmail(args.email)
    const [globalLimit, emailLimit] = await Promise.all([
      adminRateLimiter.limit(ctx, 'loginGlobal', { key: 'individual-login' }),
      adminRateLimiter.limit(ctx, 'loginEmail', { key: email }),
    ])
    if (!globalLimit.ok || !emailLimit.ok) {
      const now = Date.now()
      await appendAuditEvent(ctx, {
        actorKind: 'anonymous',
        area: 'auth',
        action: 'login_rate_limited',
        targetType: 'adminAccount',
        occurredAt: now,
      })
      return {
        kind: 'rate_limited',
        retryAfterSeconds: Math.max(
          retryAfterSeconds(globalLimit.retryAfter),
          retryAfterSeconds(emailLimit.retryAfter),
        ),
      } as const
    }

    const accounts = await ctx.db
      .query('adminAccounts')
      .withIndex('by_email', (query) => query.eq('email', email))
      .take(2)
    const account = accounts.length === 1 ? accounts[0] : null
    if (
      account === null ||
      account.state !== 'active' ||
      account.passwordHash === undefined
    ) {
      return {
        kind: 'ready',
        passwordHash: DUMMY_PASSWORD_ENVELOPE,
      } as const
    }
    return {
      kind: 'ready',
      accountId: account._id,
      credentialVersion: account.credentialVersion,
      passwordHash: account.passwordHash,
    } as const
  },
})

export const finishIndividualLogin = internalMutation({
  args: {
    accountId: v.optional(v.id('adminAccounts')),
    expectedCredentialVersion: v.optional(v.number()),
    passwordValid: v.boolean(),
    tokenHash: v.string(),
    deviceLabel: v.string(),
    now: v.number(),
  },
  returns: v.union(
    v.object({
      kind: v.literal('authenticated'),
      sessionId: v.id('adminSessions'),
      expiresAt: v.number(),
      principal: v.object({
        id: v.id('adminAccounts'),
        displayName: v.string(),
        role: v.union(
          v.literal('owner'),
          v.literal('manager'),
          v.literal('seller'),
        ),
      }),
    }),
    v.object({ kind: v.literal('invalid_credentials') }),
    v.object({ kind: v.literal('token_conflict') }),
  ),
  handler: async (ctx, args) => {
    const account =
      args.accountId === undefined ? null : await ctx.db.get(args.accountId)
    if (
      !args.passwordValid ||
      account === null ||
      account.state !== 'active' ||
      account.passwordHash === undefined ||
      args.expectedCredentialVersion === undefined ||
      account.credentialVersion !== args.expectedCredentialVersion
    ) {
      await appendAuditEvent(ctx, {
        actorKind: 'anonymous',
        area: 'auth',
        action: 'login_failed',
        targetType: 'adminAccount',
        occurredAt: args.now,
      })
      return { kind: 'invalid_credentials' } as const
    }
    const collision = await ctx.db
      .query('adminSessions')
      .withIndex('by_token_hash', (query) =>
        query.eq('tokenHash', args.tokenHash),
      )
      .first()
    if (collision) return { kind: 'token_conflict' } as const

    const expiresAt = args.now + ADMIN_SESSION_TTL_MS
    const sessionId = await ctx.db.insert('adminSessions', {
      tokenHash: args.tokenHash,
      accountId: account._id,
      credentialVersion: account.credentialVersion,
      deviceLabel: normalizeDeviceLabel(args.deviceLabel),
      createdAt: args.now,
      expiresAt,
    })
    await ctx.scheduler.runAt(expiresAt, expireAdminSession, {
      sessionId,
      expectedExpiresAt: expiresAt,
    })
    await appendAuditEvent(ctx, {
      principal: {
        kind: 'account',
        account: {
          _id: account._id,
          displayName: account.displayName,
          email: account.email,
          role: account.role,
        },
      },
      area: 'auth',
      action: 'login_succeeded',
      targetType: 'adminSession',
      targetId: sessionId,
      targetLabel: normalizeDeviceLabel(args.deviceLabel),
      occurredAt: args.now,
    })
    return {
      kind: 'authenticated',
      sessionId,
      expiresAt,
      principal: {
        id: account._id,
        displayName: account.displayName,
        role: account.role,
      },
    } as const
  },
})

const credentialSnapshotValidator = v.union(
  v.object({ kind: v.literal('unauthorized') }),
  v.object({
    kind: v.literal('ready'),
    accountId: v.id('adminAccounts'),
    sessionId: v.id('adminSessions'),
    credentialVersion: v.number(),
    passwordHash: v.string(),
    email: v.string(),
    displayName: v.string(),
    role: v.union(
      v.literal('owner'),
      v.literal('manager'),
      v.literal('seller'),
    ),
  }),
)

export const readOwnCredentialSnapshot = internalQuery({
  args: { token: v.string() },
  returns: credentialSnapshotValidator,
  handler: async (ctx, args) => {
    const authorization = await requireAdminSession(ctx, args.token)
    if (
      authorization.kind === 'unauthorized' ||
      authorization.principal.kind !== 'account'
    ) {
      return { kind: 'unauthorized' } as const
    }
    const account = await ctx.db.get(authorization.principal.account._id)
    if (
      account === null ||
      account.state !== 'active' ||
      account.passwordHash === undefined
    ) {
      return { kind: 'unauthorized' } as const
    }
    return {
      kind: 'ready',
      accountId: account._id,
      sessionId: authorization.session._id,
      credentialVersion: account.credentialVersion,
      passwordHash: account.passwordHash,
      email: account.email,
      displayName: account.displayName,
      role: account.role,
    } as const
  },
})

export const getOwnProfile = query({
  args: { token: v.string() },
  returns: v.union(
    v.object({ kind: v.literal('unauthorized') }),
    v.object({
      kind: v.literal('ready'),
      profile: v.object({
        id: v.id('adminAccounts'),
        displayName: v.string(),
        email: v.string(),
        role: v.union(
          v.literal('owner'),
          v.literal('manager'),
          v.literal('seller'),
        ),
      }),
    }),
  ),
  handler: async (ctx, args) => {
    const authorization = await requireAdminSession(ctx, args.token)
    if (
      authorization.kind === 'unauthorized' ||
      authorization.principal.kind !== 'account'
    ) {
      return { kind: 'unauthorized' } as const
    }
    return {
      kind: 'ready',
      profile: {
        id: authorization.principal.account._id,
        displayName: authorization.principal.account.displayName,
        email: authorization.principal.account.email,
        role: authorization.principal.account.role,
      },
    } as const
  },
})

export const finishOwnPasswordChange = internalMutation({
  args: {
    token: v.string(),
    expectedAccountId: v.id('adminAccounts'),
    expectedSessionId: v.id('adminSessions'),
    expectedCredentialVersion: v.number(),
    passwordHash: v.string(),
    now: v.number(),
  },
  returns: v.union(
    v.object({ kind: v.literal('changed') }),
    v.object({ kind: v.literal('conflict') }),
    v.object({ kind: v.literal('unauthorized') }),
  ),
  handler: async (ctx, args) => {
    const authorization = await requireAdminSession(ctx, args.token)
    if (
      authorization.kind === 'unauthorized' ||
      authorization.principal.kind !== 'account'
    ) {
      return { kind: 'unauthorized' } as const
    }
    const account = await ctx.db.get(args.expectedAccountId)
    if (
      account === null ||
      account._id !== authorization.principal.account._id ||
      authorization.session._id !== args.expectedSessionId ||
      account.credentialVersion !== args.expectedCredentialVersion
    ) {
      return { kind: 'conflict' } as const
    }
    const nextVersion = account.credentialVersion + 1
    await ctx.db.patch(account._id, {
      passwordHash: args.passwordHash,
      credentialVersion: nextVersion,
      updatedAt: args.now,
    })
    const sessions = await ctx.db
      .query('adminSessions')
      .withIndex('by_account', (index) => index.eq('accountId', account._id))
      .collect()
    for (const session of sessions) {
      if (session._id === authorization.session._id) {
        await ctx.db.patch(session._id, { credentialVersion: nextVersion })
      } else {
        await ctx.db.delete(session._id)
      }
    }
    await appendAuditEvent(ctx, {
      principal: authorization.principal,
      subjectAccountId: account._id,
      area: 'auth',
      action: 'password_changed',
      targetType: 'adminAccount',
      targetId: account._id,
      targetLabel: account.displayName,
      occurredAt: args.now,
    })
    return { kind: 'changed' } as const
  },
})

export const finishOwnerEmailChange = internalMutation({
  args: {
    token: v.string(),
    expectedAccountId: v.id('adminAccounts'),
    expectedCredentialVersion: v.number(),
    email: v.string(),
    now: v.number(),
  },
  returns: v.union(
    v.object({ kind: v.literal('changed'), email: v.string() }),
    v.object({ kind: v.literal('conflict') }),
    v.object({ kind: v.literal('invalid_email') }),
    v.object({ kind: v.literal('email_taken') }),
    v.object({ kind: v.literal('unauthorized') }),
    v.object({ kind: v.literal('forbidden') }),
  ),
  handler: async (ctx, args) => {
    const authorization = await requireAdminSession(ctx, args.token)
    if (authorization.kind === 'unauthorized') {
      return { kind: 'unauthorized' } as const
    }
    if (
      authorization.principal.kind !== 'account' ||
      !requireOwner(authorization.principal)
    ) {
      return { kind: 'forbidden' } as const
    }
    const account = await ctx.db.get(args.expectedAccountId)
    if (
      account === null ||
      account._id !== authorization.principal.account._id ||
      account.role !== 'owner' ||
      account.state !== 'active' ||
      account.credentialVersion !== args.expectedCredentialVersion
    ) {
      return { kind: 'conflict' } as const
    }
    const email = normalizeAdminEmail(args.email)
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(email) || email.length > 254) {
      return { kind: 'invalid_email' } as const
    }
    const collisions = await ctx.db
      .query('adminAccounts')
      .withIndex('by_email', (index) => index.eq('email', email))
      .take(2)
    if (collisions.some((candidate) => candidate._id !== account._id)) {
      return { kind: 'email_taken' } as const
    }
    await ctx.db.patch(account._id, { email, updatedAt: args.now })
    await appendAuditEvent(ctx, {
      principal: authorization.principal,
      subjectAccountId: account._id,
      area: 'accounts',
      action: 'account_updated',
      targetType: 'adminAccount',
      targetId: account._id,
      targetLabel: account.displayName,
      changes: buildAuditChanges({
        before: { email: account.email },
        after: { email },
        allowedFields: ['email'],
      }),
      occurredAt: args.now,
    })
    return { kind: 'changed', email } as const
  },
})

export type IndividualLoginFinalizerResult =
  | {
      kind: 'authenticated'
      sessionId: Id<'adminSessions'>
      expiresAt: number
      principal: {
        id: Id<'adminAccounts'>
        displayName: string
        role: 'owner' | 'manager' | 'seller'
      }
    }
  | { kind: 'invalid_credentials' }
  | { kind: 'token_conflict' }
