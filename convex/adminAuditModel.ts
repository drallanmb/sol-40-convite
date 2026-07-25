import { v } from 'convex/values'
import { makeFunctionReference } from 'convex/server'
import type { Id } from './_generated/dataModel'
import type { MutationCtx } from './_generated/server'
import type { AdminPrincipal, AdminRole } from './adminAccountModel'

export const ADMIN_AUDIT_RETENTION_MS = 120 * 24 * 60 * 60 * 1_000
export const ADMIN_AUDIT_SCHEDULE_HOP_MS = 20 * 24 * 60 * 60 * 1_000

export const adminAuditActorKindValidator = v.union(
  v.literal('account'),
  v.literal('legacy'),
  v.literal('system'),
  v.literal('anonymous'),
)

export const adminAuditAreaValidator = v.union(
  v.literal('auth'),
  v.literal('accounts'),
  v.literal('sessions'),
  v.literal('rsvps'),
  v.literal('moderation'),
  v.literal('gifts'),
)

export const adminAuditActionValidator = v.union(
  v.literal('login_succeeded'),
  v.literal('login_failed'),
  v.literal('login_rate_limited'),
  v.literal('activation_completed'),
  v.literal('password_changed'),
  v.literal('password_reset'),
  v.literal('master_recovery_started'),
  v.literal('logout'),
  v.literal('session_revoked'),
  v.literal('sessions_revoked'),
  v.literal('account_created'),
  v.literal('account_updated'),
  v.literal('account_disabled'),
  v.literal('account_reactivated'),
  v.literal('access_link_generated'),
  v.literal('access_link_revoked'),
  v.literal('rsvp_created'),
  v.literal('rsvp_updated'),
  v.literal('rsvp_deleted'),
  v.literal('rsvp_imported'),
  v.literal('moderation_transitioned'),
  v.literal('moderation_undone'),
  v.literal('gift_confirmed'),
  v.literal('gift_updated'),
  v.literal('gift_reopened'),
)

export type AdminAuditArea =
  | 'auth'
  | 'accounts'
  | 'sessions'
  | 'rsvps'
  | 'moderation'
  | 'gifts'

export type AdminAuditAction =
  | 'login_succeeded'
  | 'login_failed'
  | 'login_rate_limited'
  | 'activation_completed'
  | 'password_changed'
  | 'password_reset'
  | 'master_recovery_started'
  | 'logout'
  | 'session_revoked'
  | 'sessions_revoked'
  | 'account_created'
  | 'account_updated'
  | 'account_disabled'
  | 'account_reactivated'
  | 'access_link_generated'
  | 'access_link_revoked'
  | 'rsvp_created'
  | 'rsvp_updated'
  | 'rsvp_deleted'
  | 'rsvp_imported'
  | 'moderation_transitioned'
  | 'moderation_undone'
  | 'gift_confirmed'
  | 'gift_updated'
  | 'gift_reopened'

export type AuditValue = string | number | boolean | null
export type AuditChange = {
  field: string
  before?: AuditValue
  after?: AuditValue
}

export const auditValueValidator = v.union(
  v.string(),
  v.number(),
  v.boolean(),
  v.null(),
)

export const auditChangeValidator = v.object({
  field: v.string(),
  before: v.optional(auditValueValidator),
  after: v.optional(auditValueValidator),
})

const SECRET_FIELD_PATTERN =
  /(?:password|passwd|secret|token|hash|link|url|header|authorization|cookie|payment|card|cvv)/iu
export const MAX_AUDIT_CHANGES = 20
const MAX_AUDIT_STRING_LENGTH = 500

function safeAuditValue(value: unknown): AuditValue | undefined {
  if (
    value === null ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value
  }
  if (typeof value === 'string') {
    return value.slice(0, MAX_AUDIT_STRING_LENGTH)
  }
  return undefined
}

export function buildAuditChanges(args: {
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  allowedFields: readonly string[]
}) {
  const changes: AuditChange[] = []
  for (const field of args.allowedFields) {
    if (
      changes.length >= MAX_AUDIT_CHANGES ||
      SECRET_FIELD_PATTERN.test(field)
    ) {
      continue
    }
    const before = safeAuditValue(args.before?.[field])
    const after = safeAuditValue(args.after?.[field])
    if (before === after || (before === undefined && after === undefined)) {
      continue
    }
    changes.push({
      field,
      ...(before === undefined ? {} : { before }),
      ...(after === undefined ? {} : { after }),
    })
  }
  return changes
}

function sanitizeAuditChanges(changes: readonly AuditChange[]) {
  return changes
    .filter((change) => !SECRET_FIELD_PATTERN.test(change.field))
    .map((change) => {
      const before = safeAuditValue(change.before)
      const after = safeAuditValue(change.after)
      return {
        field: change.field.slice(0, 80),
        ...(before === undefined ? {} : { before }),
        ...(after === undefined ? {} : { after }),
      }
    })
    .filter(
      (change) =>
        change.before !== undefined || change.after !== undefined,
    )
    .slice(0, MAX_AUDIT_CHANGES)
}

type AuditMutationContext = Pick<MutationCtx, 'db' | 'scheduler'>

const expireAuditEvent = makeFunctionReference<
  'mutation',
  {
    eventId: Id<'adminAuditEvents'>
    expectedExpiresAt: number
  },
  unknown
>('adminInternal:expireAuditEvent')

type AppendAuditEvent = {
  principal?: AdminPrincipal
  actorKind?: 'system' | 'anonymous'
  actorName?: string
  actorRole?: AdminRole
  subjectAccountId?: Id<'adminAccounts'>
  area: AdminAuditArea
  action: AdminAuditAction
  targetType?: string
  targetId?: string | Id<'adminAccounts'>
  targetLabel?: string
  changes?: AuditChange[]
  occurredAt?: number
}

export async function appendAuditEvent(
  ctx: AuditMutationContext,
  event: AppendAuditEvent,
) {
  const occurredAt = event.occurredAt ?? Date.now()
  const account =
    event.principal?.kind === 'account'
      ? event.principal.account
      : undefined
  const actorKind =
    account !== undefined
      ? 'account'
      : event.principal?.kind === 'legacy'
        ? 'legacy'
        : (event.actorKind ?? 'system')

  const expiresAt = occurredAt + ADMIN_AUDIT_RETENTION_MS
  const eventId = await ctx.db.insert('adminAuditEvents', {
    actorKind,
    ...(account ? { actorAccountId: account._id } : {}),
    actorName: account?.displayName ?? event.actorName,
    actorRole: account?.role ?? event.actorRole,
    subjectAccountId: event.subjectAccountId,
    area: event.area,
    action: event.action,
    targetType: event.targetType?.slice(0, 80),
    targetId:
      event.targetId === undefined
        ? undefined
        : String(event.targetId).slice(0, 160),
    targetLabel: event.targetLabel?.slice(0, 160),
    changes: sanitizeAuditChanges(event.changes ?? []),
    occurredAt,
    expiresAt,
  })
  await ctx.scheduler.runAt(
    Math.min(expiresAt, occurredAt + ADMIN_AUDIT_SCHEDULE_HOP_MS),
    expireAuditEvent,
    {
    eventId,
    expectedExpiresAt: expiresAt,
    },
  )
  return eventId
}
