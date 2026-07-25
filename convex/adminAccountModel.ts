import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'

export const adminRoleValidator = v.union(
  v.literal('owner'),
  v.literal('manager'),
  v.literal('seller'),
)

export const adminAccountStateValidator = v.union(
  v.literal('pending'),
  v.literal('active'),
  v.literal('disabled'),
)

export type AdminRole = 'owner' | 'manager' | 'seller'
export type AdminAccountState = 'pending' | 'active' | 'disabled'

export type AdminCapability =
  | 'overview'
  | 'rsvps'
  | 'moderation'
  | 'gifts'
  | 'self'
  | 'accounts'
  | 'sessions_all'
  | 'audit'

const ROLE_CAPABILITIES = {
  owner: [
    'overview',
    'rsvps',
    'moderation',
    'gifts',
    'self',
    'accounts',
    'sessions_all',
    'audit',
  ],
  manager: ['overview', 'rsvps', 'moderation', 'gifts', 'self'],
  seller: ['gifts', 'self'],
} as const satisfies Record<AdminRole, readonly AdminCapability[]>

export type AdminAccountPrincipal = {
  kind: 'account'
  account: Pick<
    Doc<'adminAccounts'>,
    '_id' | 'displayName' | 'email' | 'role'
  >
}

export type LegacyAdminPrincipal = {
  kind: 'legacy'
}

export type AdminPrincipal = AdminAccountPrincipal | LegacyAdminPrincipal

export function normalizeAdminEmail(email: string) {
  return email.normalize('NFC').trim().toLocaleLowerCase('en-US')
}

export function hasAdminCapability(
  role: AdminRole,
  capability: AdminCapability,
) {
  return (ROLE_CAPABILITIES[role] as readonly AdminCapability[]).includes(
    capability,
  )
}

export function requireAnyAdmin(_principal: AdminPrincipal) {
  return true
}

export function requireOperational(principal: AdminPrincipal) {
  return (
    principal.kind === 'legacy' ||
    hasAdminCapability(principal.account.role, 'overview')
  )
}

export function requireOwner(principal: AdminPrincipal) {
  return principal.kind === 'account' && principal.account.role === 'owner'
}

export function requireSelfOrOwner(
  principal: AdminPrincipal,
  accountId: Id<'adminAccounts'>,
) {
  return (
    principal.kind === 'account' &&
    (principal.account._id === accountId ||
      principal.account.role === 'owner')
  )
}
