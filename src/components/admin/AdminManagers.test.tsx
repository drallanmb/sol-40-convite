// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { getFunctionName, type FunctionReference } from 'convex/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminManagers } from './AdminManagers'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true

const convexMocks = vi.hoisted(() => ({
  query: vi.fn((_reference: unknown, _args: unknown): unknown => undefined),
  mutation: vi.fn((_reference: unknown): unknown => undefined),
}))

const clipboardMocks = vi.hoisted(() => ({
  copy: vi.fn(async (_text: string) => true),
}))

vi.mock('convex/react', () => ({
  useQuery: (reference: unknown, args: unknown) =>
    convexMocks.query(reference, args),
  useMutation: (reference: unknown) => convexMocks.mutation(reference),
}))

vi.mock('../../lib/clipboard', () => ({
  copyTextToClipboard: (text: string) => clipboardMocks.copy(text),
}))

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function functionName(reference: unknown) {
  return getFunctionName(reference as FunctionReference<'query' | 'mutation'>)
}

function buttonWithText(scope: ParentNode, text: string) {
  const button = [...scope.querySelectorAll('button')].find(
    (candidate) => candidate.textContent?.trim() === text,
  )
  if (!button) throw new Error(`Button not found: ${text}`)
  return button as HTMLButtonElement
}

const ADMIN_TOKEN = 'B'.repeat(43)
const ACCOUNT = {
  id: 'manager-account',
  displayName: 'Gestora Fictícia',
  email: 'gestora@example.test',
  role: 'manager' as const,
  state: 'pending' as const,
  updatedAt: 1_721_500_000_000,
}

let root: Root | null = null
let container: HTMLDivElement | null = null
let accessLinkStatus: undefined | { kind: 'valid' } | { kind: 'invalid' }
let generateLinkMutation: ReturnType<typeof vi.fn>
let revokeLinksMutation: ReturnType<typeof vi.fn>

beforeEach(() => {
  accessLinkStatus = undefined
  generateLinkMutation = vi.fn(async (args: { accessToken: string }) => ({
    kind: 'created',
    accessToken: args.accessToken,
  }))
  revokeLinksMutation = vi.fn(async () => ({ kind: 'revoked' }))

  convexMocks.query.mockReset()
  convexMocks.query.mockImplementation((reference, args) => {
    switch (functionName(reference)) {
      case 'adminAccounts:listManagedAccounts':
        return { kind: 'ready', accounts: [ACCOUNT] }
      case 'adminAccessLinks:getStatus':
        return args === 'skip' ? undefined : accessLinkStatus
      case 'adminSessions:listAccountSessions':
        return { kind: 'ready', sessions: [] }
      default:
        throw new Error(`Unexpected query: ${functionName(reference)}`)
    }
  })

  const unusedMutation = vi.fn(async () => {
    throw new Error('Unexpected mutation call')
  })
  convexMocks.mutation.mockReset()
  convexMocks.mutation.mockImplementation((reference) => {
    switch (functionName(reference)) {
      case 'adminAccounts:generateManagedAccessLink':
        return generateLinkMutation
      case 'adminAccounts:revokeManagedAccessLinks':
        return revokeLinksMutation
      case 'adminAccounts:createManagedAccount':
      case 'adminAccounts:disableManagedAccount':
      case 'adminAccounts:reactivateManagedAccount':
        return unusedMutation
      default:
        throw new Error(`Unexpected mutation: ${functionName(reference)}`)
    }
  })

  clipboardMocks.copy.mockReset()
  clipboardMocks.copy.mockResolvedValue(true)
})

afterEach(async () => {
  if (root) {
    await act(async () => root?.unmount())
  }
  root = null
  container?.remove()
  container = null
})

async function renderManagers() {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await rerenderManagers()
  return container
}

async function rerenderManagers() {
  await act(async () => {
    root?.render(
      createElement(AdminManagers, {
        token: ADMIN_TOKEN,
        onUnauthorized: vi.fn(),
      }),
    )
  })
}

async function generateOneTimeLink() {
  await act(async () => {
    buttonWithText(container!, 'Gerar novo link').click()
    await Promise.resolve()
  })
}

describe('AdminManagers one-time links', () => {
  it('reveals the clickable fragment URL and enables copying only after valid status', async () => {
    const scope = await renderManagers()

    await generateOneTimeLink()

    expect(
      scope.querySelector('a[aria-label="Abrir link de uso único"]'),
    ).toBeNull()
    expect(buttonWithText(scope, 'Verificando…').disabled).toBe(true)

    accessLinkStatus = { kind: 'valid' }
    await rerenderManagers()

    const anchor = scope.querySelector<HTMLAnchorElement>(
      'a[aria-label="Abrir link de uso único"]',
    )
    expect(anchor).not.toBeNull()
    const url = new URL(anchor!.href)
    expect(url.pathname).toBe('/admin/ativar')
    expect(url.search).toBe('')
    const generatedToken = (
      generateLinkMutation.mock.calls[0][0] as { accessToken: string }
    ).accessToken
    expect(new URLSearchParams(url.hash.slice(1)).get('token')).toBe(
      generatedToken,
    )
    expect(anchor?.target).toBe('_blank')
    expect(anchor?.rel).toBe('noreferrer')
    const copyButton = buttonWithText(scope, 'Copiar link')
    expect(copyButton.disabled).toBe(false)
    await act(async () => copyButton.click())
    expect(clipboardMocks.copy).toHaveBeenCalledWith(anchor!.href)
    expect(scope.textContent).toContain('Link copiado.')
  })

  it('keeps invalidation busy, ignores a second activation and removes the link on success', async () => {
    accessLinkStatus = { kind: 'valid' }
    const pendingRevocation = deferred<{ kind: 'revoked' }>()
    revokeLinksMutation.mockReturnValueOnce(pendingRevocation.promise)
    const scope = await renderManagers()
    await generateOneTimeLink()

    const invalidate = buttonWithText(scope, 'Invalidar links')
    await act(async () => {
      invalidate.click()
      await Promise.resolve()
    })

    expect(invalidate.disabled).toBe(true)
    expect(invalidate.getAttribute('aria-busy')).toBe('true')
    invalidate.click()
    expect(revokeLinksMutation).toHaveBeenCalledTimes(1)

    await act(async () => {
      pendingRevocation.resolve({ kind: 'revoked' })
      await pendingRevocation.promise
    })

    expect(
      scope.querySelector('a[aria-label="Abrir link de uso único"]'),
    ).toBeNull()
    expect(scope.textContent).toContain('Links pendentes invalidados.')
    expect(buttonWithText(scope, 'Invalidar links').disabled).toBe(false)
  })

  it('reports a failed invalidation, keeps the link and enables retry', async () => {
    accessLinkStatus = { kind: 'valid' }
    revokeLinksMutation.mockRejectedValueOnce(new Error('offline'))
    const scope = await renderManagers()
    await generateOneTimeLink()

    await act(async () => {
      buttonWithText(scope, 'Invalidar links').click()
      await Promise.resolve()
    })

    expect(scope.textContent).toContain(
      'Não foi possível invalidar os links agora.',
    )
    expect(
      scope.querySelector('a[aria-label="Abrir link de uso único"]'),
    ).not.toBeNull()
    expect(buttonWithText(scope, 'Invalidar links').disabled).toBe(false)
  })

  it('removes a displayed link when remote validation marks it invalid', async () => {
    accessLinkStatus = { kind: 'valid' }
    const scope = await renderManagers()
    await generateOneTimeLink()
    expect(
      scope.querySelector('a[aria-label="Abrir link de uso único"]'),
    ).not.toBeNull()

    accessLinkStatus = { kind: 'invalid' }
    await rerenderManagers()

    expect(
      scope.querySelector('a[aria-label="Abrir link de uso único"]'),
    ).toBeNull()
    expect(scope.textContent).toContain(
      'O link exibido deixou de ser válido. Gere um novo antes de compartilhar.',
    )
  })

  it('does not claim success when clipboard writing fails', async () => {
    accessLinkStatus = { kind: 'valid' }
    clipboardMocks.copy.mockResolvedValueOnce(false)
    const scope = await renderManagers()
    await generateOneTimeLink()

    await act(async () => buttonWithText(scope, 'Copiar link').click())

    expect(scope.textContent).not.toContain('Link copiado.')
    expect(scope.textContent).toContain(
      'Não foi possível copiar automaticamente.',
    )
  })
})
