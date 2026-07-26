// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminSetup } from './AdminSetup'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true

const convexMocks = vi.hoisted(() => ({
  action: vi.fn(),
  query: vi.fn(
    (
      _args: unknown,
    ): undefined | { kind: 'valid' } | { kind: 'invalid' } => ({
      kind: 'valid',
    }),
  ),
}))

vi.mock('convex/react', () => ({
  useAction: () => convexMocks.action,
  useQuery: (_reference: unknown, args: unknown) =>
    args === 'skip' ? undefined : convexMocks.query(args),
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

const ACCESS_TOKEN = 'A'.repeat(43)

let root: Root | null = null
let container: HTMLDivElement | null = null

function buttonWithText(text: string) {
  const button = [...container!.querySelectorAll('button')].find(
    (candidate) => candidate.textContent?.trim() === text,
  )
  if (!button) throw new Error(`Button not found: ${text}`)
  return button as HTMLButtonElement
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function setClipboard(clipboard: Pick<Clipboard, 'writeText'> | undefined) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: clipboard,
  })
}

async function renderSetup() {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await rerenderSetup()
}

async function rerenderSetup() {
  await act(async () => {
    root?.render(
      createElement(AdminSetup, {
        mode: 'bootstrap',
        available: true,
      }),
    )
  })
}

async function generateActivationLink() {
  convexMocks.action.mockResolvedValueOnce({
    kind: 'created',
    token: ACCESS_TOKEN,
  })
  await renderSetup()

  await act(async () => {
    setInputValue(
      container!.querySelector<HTMLInputElement>('input[type="password"]')!,
      'master-password',
    )
  })
  await act(async () => {
    buttonWithText('Criar link de ativação').click()
    await Promise.resolve()
    await Promise.resolve()
  })
}

afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  root = null
  container?.remove()
  container = null
  setClipboard(undefined)
  convexMocks.action.mockReset()
  convexMocks.query.mockReset()
  convexMocks.query.mockReturnValue({ kind: 'valid' })
})

describe('AdminSetup owner access link', () => {
  it('renders the confirmed activation URL as a clickable fragment link', async () => {
    await generateActivationLink()

    const link = container!.querySelector<HTMLAnchorElement>(
      'a[href*="/admin/ativar"]',
    )
    expect(link).not.toBeNull()
    expect(link?.href).toBe(
      `${window.location.origin}/admin/ativar#token=${ACCESS_TOKEN}`,
    )
    expect(link?.href).not.toContain('?token=')
    expect(link?.textContent).toBe(link?.href)
    expect(link?.target).toBe('_blank')
    expect(link?.rel).toBe('noreferrer')
    expect(convexMocks.query).toHaveBeenCalledWith({
      token: ACCESS_TOKEN,
      purpose: 'activation',
    })
  })

  it('marks copy as busy and confirms it only after the clipboard resolves', async () => {
    const write = deferred<void>()
    const writeText = vi.fn(() => write.promise)
    setClipboard({ writeText })
    await generateActivationLink()

    await act(async () => {
      buttonWithText('Copiar link').click()
    })

    const copyingButton = buttonWithText('Copiando…')
    expect(copyingButton.getAttribute('aria-busy')).toBe('true')
    expect(copyingButton.disabled).toBe(true)
    expect(container!.textContent).not.toContain('Link copiado.')
    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/admin/ativar#token=${ACCESS_TOKEN}`,
    )

    await act(async () => {
      write.resolve()
      await write.promise
    })

    expect(container!.textContent).toContain('Link copiado.')
    expect(buttonWithText('Copiar link').getAttribute('aria-busy')).toBe(
      'false',
    )
  })

  it('ignores a late clipboard result after the displayed link becomes invalid', async () => {
    const write = deferred<void>()
    setClipboard({ writeText: vi.fn(() => write.promise) })
    await generateActivationLink()

    await act(async () => {
      buttonWithText('Copiar link').click()
    })
    convexMocks.query.mockReturnValue({ kind: 'invalid' })
    await rerenderSetup()

    await act(async () => {
      write.resolve()
      await write.promise
    })

    expect(container!.textContent).not.toContain('Link copiado.')
    expect(container!.textContent).toContain('O link deixou de ser válido.')
    expect(
      container!.querySelector('a[href*="/admin/ativar"]'),
    ).toBeNull()
  })

  it.each([
    {
      condition: 'clipboard permission is rejected',
      clipboard: {
        writeText: vi.fn(async () => {
          throw new Error('permission denied')
        }),
      },
    },
    {
      condition: 'clipboard API is absent',
      clipboard: undefined,
    },
  ])(
    'shows a manual-copy fallback without an unhandled rejection when $condition',
    async ({ clipboard }) => {
      const unhandled = vi.fn((event: PromiseRejectionEvent) =>
        event.preventDefault(),
      )
      window.addEventListener('unhandledrejection', unhandled)
      setClipboard(clipboard)

      try {
        await generateActivationLink()
        await act(async () => {
          buttonWithText('Copiar link').click()
          await Promise.resolve()
          await Promise.resolve()
        })

        expect(container!.textContent).toContain(
          'Não foi possível copiar automaticamente.',
        )
        expect(container!.textContent).toContain(
          'mantenha-o pressionado para copiar.',
        )
        expect(unhandled).not.toHaveBeenCalled()
      } finally {
        window.removeEventListener('unhandledrejection', unhandled)
      }
    },
  )
})
