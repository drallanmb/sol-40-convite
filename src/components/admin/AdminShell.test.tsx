// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminShell } from './AdminShell'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true

const convexMocks = vi.hoisted(() => ({
  overview: vi.fn((_args: unknown) => ({ status: 'pending' as const })),
}))

vi.mock('convex/react', () => ({
  useConvexConnectionState: () => ({
    hasEverConnected: true,
    isWebSocketConnected: true,
  }),
  useQuery_experimental: ({ args }: { args: unknown }) =>
    convexMocks.overview(args),
}))

vi.mock('./AdminOverview', () => ({
  default: () => createElement('div', null, 'overview-mounted'),
}))
vi.mock('./AdminGuests', () => ({
  default: () => createElement('div', null, 'guests-mounted'),
}))
vi.mock('./AdminModeration', () => ({
  default: () => createElement('div', null, 'moderation-mounted'),
}))
vi.mock('./AdminGifts', () => ({
  default: () => createElement('div', null, 'gifts-mounted'),
}))
vi.mock('./AdminManagers', () => ({
  default: () => createElement('div', null, 'managers-mounted'),
}))
vi.mock('./AdminMyAccount', () => ({
  default: () => createElement('div', null, 'account-mounted'),
}))

let root: Root | null = null
let container: HTMLDivElement | null = null

afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  root = null
  container?.remove()
  container = null
  convexMocks.overview.mockClear()
})

describe('AdminShell role-aware queries', () => {
  it('redirects seller to gifts without requesting overview or mounting forbidden areas', async () => {
    vi.stubGlobal('scrollTo', vi.fn())
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(async () => {
      root?.render(
        createElement(
          MemoryRouter,
          { initialEntries: ['/admin/visao'] },
          createElement(
            Routes,
            null,
            createElement(Route, {
              path: '/admin/*',
              element: createElement(AdminShell, {
                loggingOut: false,
                onLogout: async () => undefined,
                onUnauthorized: vi.fn(),
                token: 'A'.repeat(43),
                principal: {
                  id: 'seller',
                  displayName: 'Vanessa',
                  role: 'seller',
                },
              }),
            }),
          ),
        ),
      )
    })

    expect(convexMocks.overview).toHaveBeenCalledWith('skip')
    expect(container.textContent).toContain('gifts-mounted')
    expect(container.textContent).not.toContain('overview-mounted')
    expect(container.textContent).not.toContain('guests-mounted')
    expect(container.textContent).not.toContain('moderation-mounted')
    expect(container.textContent).toContain('Vanessa · Vendedora')
  })
})
