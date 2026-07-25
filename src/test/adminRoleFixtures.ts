import type { Page } from '@playwright/test'
import {
  ADMIN_ROUTES,
  type AdminRole,
} from '../content/admin'

export const ADMIN_INITIAL_ACCOUNTS = [
  {
    displayName: 'Allan',
    email: 'allanmesquitab@gmail.com',
    role: 'owner',
  },
  {
    displayName: 'Soraya',
    email: 'sorayathorsjo@outlook.com',
    role: 'manager',
  },
  {
    displayName: 'Guga',
    email: 'gugart@hotmail.com',
    role: 'manager',
  },
  {
    displayName: 'Vanessa',
    email: 'vanessa.alonso@mistral.com.br',
    role: 'seller',
  },
] as const

type AdminRoleFixture = {
  role: AdminRole
  defaultRoute: string
  allowedRoutes: readonly string[]
  forbiddenRoutes: readonly string[]
  forbiddenFunctions: readonly string[]
}

export const ADMIN_ROLE_FIXTURES: readonly AdminRoleFixture[] = [
  {
    role: 'owner',
    defaultRoute: ADMIN_ROUTES.overview,
    allowedRoutes: [
      ADMIN_ROUTES.overview,
      ADMIN_ROUTES.guests,
      ADMIN_ROUTES.moderation,
      ADMIN_ROUTES.gifts,
      ADMIN_ROUTES.managers,
      ADMIN_ROUTES.audit,
    ],
    forbiddenRoutes: [],
    forbiddenFunctions: [],
  },
  {
    role: 'manager',
    defaultRoute: ADMIN_ROUTES.overview,
    allowedRoutes: [
      ADMIN_ROUTES.overview,
      ADMIN_ROUTES.guests,
      ADMIN_ROUTES.moderation,
      ADMIN_ROUTES.gifts,
    ],
    forbiddenRoutes: [ADMIN_ROUTES.managers, ADMIN_ROUTES.audit],
    forbiddenFunctions: [
      'adminAccounts.list',
      'adminAudit.list',
      'adminSessions.listAccountSessions',
    ],
  },
  {
    role: 'seller',
    defaultRoute: ADMIN_ROUTES.gifts,
    allowedRoutes: [ADMIN_ROUTES.gifts],
    forbiddenRoutes: [
      ADMIN_ROUTES.overview,
      ADMIN_ROUTES.guests,
      ADMIN_ROUTES.moderation,
      ADMIN_ROUTES.managers,
      ADMIN_ROUTES.audit,
    ],
    forbiddenFunctions: [
      'adminOverview.get',
      'adminRsvps.listFamilies',
      'adminPosts.listByStatus',
      'adminAccounts.list',
      'adminAudit.list',
      'adminSessions.listAccountSessions',
    ],
  },
] as const

export const DECISION_COVERAGE = {
  credentials: ['D-01', 'D-02', 'D-03', 'D-04', 'D-05', 'D-06'],
  rolesAndUx: [
    'D-07', 'D-08', 'D-09', 'D-10', 'D-11', 'D-12',
    'D-34', 'D-35', 'D-36', 'D-37', 'D-38',
  ],
  sessionsAndMigration: [
    'D-13', 'D-14', 'D-15', 'D-16', 'D-17', 'D-18',
    'D-19', 'D-20', 'D-21', 'D-22',
  ],
  gifts: ['D-23', 'D-24', 'D-25', 'D-26', 'D-27', 'D-28'],
  audit: ['D-29', 'D-30', 'D-31', 'D-32', 'D-33'],
} as const

export const AUDIT_SECRET_CANARY = 'phase8-secret-canary-never-log'

const SECRET_KEY_PATTERN =
  /password|secret|token|hash|activationurl|reseturl|accesslink/iu

export function sanitizeSmokeResult(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeSmokeResult)
  if (value === null || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [
      key,
      SECRET_KEY_PATTERN.test(key)
        ? '[redacted]'
        : sanitizeSmokeResult(nested),
    ]),
  )
}

export function expectNoAdminSecret(serialized: string) {
  if (
    serialized.includes(AUDIT_SECRET_CANARY) ||
    /[?&](?:token|password|secret)=/iu.test(serialized)
  ) {
    throw new Error('Administrative secret appeared in browser evidence.')
  }
}

declare global {
  interface Window {
    __phase8ConvexTraffic: string[]
  }
}

export async function installConvexTrafficObserver(page: Page) {
  await page.addInitScript(() => {
    const OriginalWebSocket = window.WebSocket
    window.__phase8ConvexTraffic = []

    class ObservedWebSocket extends OriginalWebSocket {
      override send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
        if (typeof data === 'string') {
          window.__phase8ConvexTraffic.push(data)
        }
        return super.send(
          data as string | ArrayBuffer | Blob | ArrayBufferView<ArrayBuffer>,
        )
      }
    }

    window.WebSocket = ObservedWebSocket
  })
}
