// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminAccessLink } from './AdminAccessLink'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true

const TOKEN = 'A'.repeat(43)
const PASSWORD = 'uma senha segura com 24'

const convexMocks = vi.hoisted(() => ({
  status: undefined as
    | undefined
    | { kind: 'valid' }
    | { kind: 'invalid' },
  connection: {
    hasEverConnected: true,
    isWebSocketConnected: true,
  },
  consume: vi.fn(),
}))

vi.mock('convex/react', () => ({
  useAction: () => convexMocks.consume,
  useConvexConnectionState: () => convexMocks.connection,
  useQuery: (_reference: unknown, args: unknown) =>
    args === 'skip' ? undefined : convexMocks.status,
}))

let root: Root | null = null
let container: HTMLDivElement | null = null

afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  root = null
  container?.remove()
  container = null
  convexMocks.status = undefined
  convexMocks.connection.hasEverConnected = true
  convexMocks.connection.isWebSocketConnected = true
  convexMocks.consume.mockReset()
  window.history.replaceState(null, '', '/')
  vi.useRealTimers()
})

function accessLinkTree() {
  return createElement(
    MemoryRouter,
    { initialEntries: ['/admin/ativar'] },
    createElement(AdminAccessLink, { purpose: 'activation' }),
  )
}

async function renderAccessLink() {
  window.history.replaceState(
    null,
    '',
    `/admin/ativar#token=${TOKEN}`,
  )
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)

  await rerenderAccessLink()
  return container
}

async function rerenderAccessLink() {
  await act(async () => {
    root?.render(accessLinkTree())
  })
}

function input(id: string) {
  const element = container?.querySelector<HTMLInputElement>(`#${id}`)
  if (!element) throw new Error(`Input not found: ${id}`)
  return element
}

function buttonWithText(text: string) {
  const button = [...(container?.querySelectorAll('button') ?? [])].find(
    (candidate) => candidate.textContent?.trim() === text,
  )
  if (!button) throw new Error(`Button not found: ${text}`)
  return button as HTMLButtonElement
}

function setInputValue(element: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )?.set
  setter?.call(element, value)
  element.dispatchEvent(new Event('input', { bubbles: true }))
}

async function fillPassword(value: string) {
  await act(async () => {
    setInputValue(input('admin-new-password'), value)
    setInputValue(input('admin-new-password-confirmation'), value)
  })
}

async function submit(text = 'Definir senha') {
  await act(async () => {
    buttonWithText(text).click()
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('AdminAccessLink', () => {
  it('shows loading and offline guidance without mounting the password form', async () => {
    convexMocks.connection.isWebSocketConnected = false
    const scope = await renderAccessLink()

    expect(scope.textContent).toContain('Verificando este link…')
    expect(scope.textContent).toContain('Sem conexão no momento.')
    expect(scope.querySelector('form')).toBeNull()

    convexMocks.connection.isWebSocketConnected = true
    await rerenderAccessLink()

    expect(scope.textContent).toContain(
      'Aguarde enquanto confirmamos que ele ainda é válido.',
    )
    expect(scope.querySelector('form')).toBeNull()
  })

  it('mounts the password form only after the link is valid', async () => {
    convexMocks.status = { kind: 'valid' }
    const scope = await renderAccessLink()

    expect(scope.querySelector('form')).not.toBeNull()
    expect(input('admin-new-password').type).toBe('password')
    expect(input('admin-new-password-confirmation').type).toBe(
      'password',
    )
    expect(buttonWithText('Definir senha').disabled).toBe(true)
  })

  it('explains the lower and upper password length limits', async () => {
    convexMocks.status = { kind: 'valid' }
    const scope = await renderAccessLink()
    const password = input('admin-new-password')

    await act(async () => setInputValue(password, 'A'.repeat(14)))
    expect(scope.textContent).toContain('Use pelo menos 15 caracteres.')
    expect(password.getAttribute('aria-invalid')).toBe('true')

    await act(async () => setInputValue(password, 'A'.repeat(129)))
    expect(scope.textContent).toContain('Use no máximo 128 caracteres.')
    expect(scope.textContent).not.toContain(
      'Use pelo menos 15 caracteres.',
    )
    expect(password.getAttribute('aria-invalid')).toBe('true')
  })

  it('shows a generic invalid-password message and clears both fields', async () => {
    convexMocks.status = { kind: 'valid' }
    convexMocks.consume.mockResolvedValue({ kind: 'invalid_password' })
    const scope = await renderAccessLink()
    await fillPassword(PASSWORD)

    await submit()

    expect(scope.textContent).toContain(
      'Escolha uma senha menos previsível e que não contenha seu nome ou e-mail.',
    )
    expect(input('admin-new-password').value).toBe('')
    expect(input('admin-new-password-confirmation').value).toBe('')
  })

  it('shows the retry delay when consumption is rate-limited', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000)
    convexMocks.status = { kind: 'valid' }
    convexMocks.consume.mockResolvedValue({
      kind: 'rate_limited',
      retryAfterSeconds: 37,
    })
    const scope = await renderAccessLink()
    await fillPassword(PASSWORD)

    await submit()

    expect(scope.textContent).toContain(
      'Muitas tentativas. Aguarde 37 segundos antes de tentar novamente.',
    )
    expect(input('admin-new-password').value).toBe(PASSWORD)
    expect(input('admin-new-password-confirmation').value).toBe(PASSWORD)
    expect(buttonWithText('Tentar novamente').disabled).toBe(true)

    await fillPassword(`${PASSWORD}!`)
    expect(buttonWithText('Tentar novamente').disabled).toBe(true)
    expect(scope.textContent).toContain('Aguarde 37 segundos')

    await act(async () => {
      vi.advanceTimersByTime(37_000)
    })
    expect(buttonWithText('Definir senha').disabled).toBe(false)
    expect(scope.textContent).not.toContain('Muitas tentativas.')
  })

  it('preserves the password after a network failure and reuses it on retry', async () => {
    convexMocks.status = { kind: 'valid' }
    convexMocks.consume
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ kind: 'completed' })
    const scope = await renderAccessLink()
    await fillPassword(PASSWORD)

    await submit()

    expect(scope.textContent).toContain(
      'Não foi possível concluir. A senha foi mantida para você tentar novamente.',
    )
    expect(input('admin-new-password').value).toBe(PASSWORD)
    expect(input('admin-new-password-confirmation').value).toBe(PASSWORD)

    await submit('Tentar novamente')

    expect(convexMocks.consume).toHaveBeenCalledTimes(2)
    expect(convexMocks.consume).toHaveBeenNthCalledWith(1, {
      token: TOKEN,
      purpose: 'activation',
      password: PASSWORD,
    })
    expect(convexMocks.consume).toHaveBeenNthCalledWith(2, {
      token: TOKEN,
      purpose: 'activation',
      password: PASSWORD,
    })
  })

  it('reacts to invalidation by removing the form and clearing its state', async () => {
    convexMocks.status = { kind: 'valid' }
    const scope = await renderAccessLink()
    await fillPassword(PASSWORD)

    convexMocks.status = { kind: 'invalid' }
    await rerenderAccessLink()

    expect(scope.querySelector('form')).toBeNull()
    expect(scope.textContent).toContain(
      'Este link não é válido. Peça um novo link ao proprietário.',
    )

    convexMocks.status = { kind: 'valid' }
    await rerenderAccessLink()

    expect(input('admin-new-password').value).toBe('')
    expect(input('admin-new-password-confirmation').value).toBe('')
  })

  it('removes the password form after completion and links to login', async () => {
    convexMocks.status = { kind: 'valid' }
    convexMocks.consume.mockResolvedValue({ kind: 'completed' })
    const scope = await renderAccessLink()
    await fillPassword(PASSWORD)

    await submit()

    expect(scope.querySelector('form')).toBeNull()
    expect(scope.querySelectorAll('input')).toHaveLength(0)
    expect(scope.textContent).toContain(
      'Senha definida. Você já pode entrar no painel.',
    )
    const login = [...scope.querySelectorAll('a')].find(
      (anchor) => anchor.textContent?.trim() === 'Entrar no painel',
    )
    expect(login?.getAttribute('href')).toBe('/admin')
  })
})
