// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { getFunctionName, type FunctionReference } from 'convex/server'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { AdminGuestImport } from './AdminGuestImport'
import { AdminGuests } from './AdminGuests'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true

const convexMocks = vi.hoisted(() => ({
  query: vi.fn((_reference: unknown, _args: unknown): unknown => ({
    status: 'pending',
  })),
  mutation: vi.fn((_reference: unknown): ((args: unknown) => Promise<unknown>) =>
    vi.fn(async () => ({ kind: 'ready', created: [], ignored: [] })),
  ),
}))

vi.mock('convex/react', () => ({
  useQuery_experimental: ({
    query,
    args,
  }: {
    query: unknown
    args: unknown
  }) => convexMocks.query(query, args),
  useMutation: (reference: unknown) => convexMocks.mutation(reference),
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

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function csvFile(contents: string) {
  const file = new File([contents], 'convidados-ficticios.csv', {
    type: 'text/csv;charset=utf-8',
  })
  Object.defineProperty(file, 'text', {
    configurable: true,
    value: async () => contents,
  })
  return file
}

function familyCsv(count: number) {
  return [
    'familia,telefone,convidado',
    ...Array.from({ length: count }, (_, index) => {
      const subscriber = String(900_004_500 + index)
      return `Família Fictícia ${index + 1},79${subscriber},Pessoa Fictícia ${index + 1}`
    }),
  ].join('\n')
}

let root: Root | null = null
let container: HTMLDivElement | null = null
let createObjectUrl: ReturnType<typeof vi.fn>
let revokeObjectUrl: ReturnType<typeof vi.fn>

beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = true
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = false
    },
  })
  window.requestAnimationFrame = (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  }
})

afterEach(async () => {
  if (root) {
    await act(async () => root?.unmount())
  }
  root = null
  container?.remove()
  container = null
  vi.restoreAllMocks()
  convexMocks.query.mockReset()
  convexMocks.query.mockReturnValue({ status: 'pending' })
  convexMocks.mutation.mockReset()
  convexMocks.mutation.mockReturnValue(
    vi.fn(async () => ({ kind: 'ready', created: [], ignored: [] })),
  )
})

async function renderImporter(onUnauthorized = vi.fn()) {
  createObjectUrl = vi.fn(() => 'blob:guest-csv-template')
  revokeObjectUrl = vi.fn()
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: createObjectUrl,
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: revokeObjectUrl,
  })
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => {
    root?.render(
      createElement(AdminGuestImport, {
        token: 'admin-token-ficticio',
        onUnauthorized,
      }),
    )
  })
  await act(async () => buttonWithText(container!, 'Importar CSV').click())
  return { onUnauthorized }
}

async function chooseCsv(contents: string) {
  const input = container!.querySelector<HTMLInputElement>(
    'input[type="file"]',
  )!
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: [csvFile(contents)],
  })
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }))
    await Promise.resolve()
  })
}

async function startImport() {
  await act(async () => buttonWithText(container!, 'Importar válidos').click())
  await act(async () =>
    buttonWithText(container!, 'Confirmar importação').click(),
  )
}

describe('admin guest csv importer', () => {
  it('downloads a BOM header-only model before file selection and revokes its URL', async () => {
    await renderImporter()
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined)

    await act(async () => buttonWithText(container!, 'Baixar modelo').click())

    expect(createObjectUrl).toHaveBeenCalledTimes(1)
    const blob = createObjectUrl.mock.calls[0][0] as Blob
    expect(await blob.text()).toBe('\uFEFFfamilia,telefone,convidado\r\n')
    expect(anchorClick).toHaveBeenCalledTimes(1)
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:guest-csv-template')
  })

  it('closes with Escape, returns focus and keeps actions at the 44px target', async () => {
    await renderImporter()
    const trigger = buttonWithText(container!, 'Importar CSV')
    const dialog = container!.querySelector<HTMLDialogElement>('dialog[open]')!
    const close = buttonWithText(dialog, 'Fechar')

    expect(close.className).toContain('min-h-[44px]')
    await act(async () => {
      dialog.dispatchEvent(new Event('cancel', { cancelable: true }))
    })

    expect(container!.querySelector('dialog[open]')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('shows normalized stacked preview issues and exact confirmation counts', async () => {
    await renderImporter()
    await chooseCsv(
      [
        'familia,telefone,convidado',
        ' Família   Mar ,(79) 99999-4501,Ana Mar',
        'Família Inválida,telefone,Beto',
      ].join('\n'),
    )

    expect(container!.textContent).toContain('Família Mar')
    expect(container!.textContent).toContain('Linha 3')
    expect(container!.textContent).toContain('Telefone brasileiro inválido')
    const previewList = container!.querySelector('[data-import-preview-groups]')
    const issueList = container!.querySelector('[data-import-issues]')
    expect(previewList?.className).toContain('grid')
    expect(issueList?.className).toContain('grid')

    await act(async () => buttonWithText(container!, 'Importar válidos').click())
    expect(container!.textContent).toContain('1 família e 1 pessoa')
    expect(
      buttonWithText(container!, 'Confirmar importação').disabled,
    ).toBe(false)
  })

  it('sends batches sequentially, blocks double activation and stops after a second-batch failure', async () => {
    const first = deferred<any>()
    const second = deferred<any>()
    const importMutation = vi
      .fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)
    convexMocks.mutation.mockImplementation((reference) =>
      functionName(reference) === 'adminRsvps:importFamilies'
        ? importMutation
        : vi.fn(),
    )
    await renderImporter()
    await chooseCsv(familyCsv(26))
    await act(async () => buttonWithText(container!, 'Importar válidos').click())
    const submit = buttonWithText(container!, 'Confirmar importação')
    await act(async () => {
      submit.click()
      submit.click()
    })

    expect(importMutation).toHaveBeenCalledTimes(1)
    expect((importMutation.mock.calls[0][0] as any).groups).toHaveLength(25)
    expect(submit.disabled).toBe(true)
    expect(buttonWithText(container!, 'Fechar').disabled).toBe(true)
    expect(container!.querySelector<HTMLInputElement>('input[type="file"]')?.disabled).toBe(true)

    await act(async () => {
      first.resolve({
        kind: 'ready',
        created: Array.from({ length: 25 }, (_, index) => ({
          sourceRows: [index + 2],
          familyId: `family-${index}`,
          displayName: `Família Fictícia ${index + 1}`,
          people: 1,
        })),
        ignored: [],
      })
      await first.promise
    })
    expect(importMutation).toHaveBeenCalledTimes(2)
    expect((importMutation.mock.calls[1][0] as any).groups).toHaveLength(1)

    await act(async () => {
      second.reject(new Error('falha de transporte'))
      await second.promise.catch(() => undefined)
    })
    expect(importMutation).toHaveBeenCalledTimes(2)
    expect(container!.textContent).toContain('25 famílias confirmadas')
    expect(container!.textContent).toContain('lote 2')
    expect(container!.textContent).toContain('resultado desconhecido')
    expect(container!.textContent).toContain('Reconciliar antes de tentar novamente')
  })

  it('accumulates server conflicts by source row and focuses an atomic live result', async () => {
    const importMutation = vi.fn(async () => ({
      kind: 'ready',
      created: [
        {
          sourceRows: [2],
          familyId: 'family-created',
          displayName: 'Família Criada',
          people: 1,
        },
      ],
      ignored: [
        {
          sourceRows: [3],
          code: 'existing_phone',
          message: 'Este telefone já pertence a uma família cadastrada.',
        },
      ],
    }))
    convexMocks.mutation.mockReturnValue(importMutation)
    await renderImporter()
    await chooseCsv(familyCsv(2))
    await startImport()

    const heading = container!.querySelector<HTMLElement>(
      '[data-import-result-heading]',
    )
    expect(heading?.textContent).toContain('Resultado da importação')
    expect(document.activeElement).toBe(heading)
    expect(container!.textContent).toContain('Linha 3')
    const live = container!.querySelector('[aria-live="polite"][aria-atomic="true"]')
    expect(live?.textContent).toContain('1 família')
    expect(live?.textContent).toContain('1 linha ignorada')
  })

  it('clears file, preview and report on authorization loss or sensitive-state clear', async () => {
    const onUnauthorized = vi.fn()
    convexMocks.mutation.mockReturnValue(
      vi.fn(async () => ({ kind: 'unauthorized' })),
    )
    await renderImporter(onUnauthorized)
    await chooseCsv(familyCsv(1))
    await startImport()
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
    expect(container!.querySelector('dialog[open]')).toBeNull()
    expect(container!.textContent).not.toContain('Pessoa Fictícia')

    await act(async () => buttonWithText(container!, 'Importar CSV').click())
    await chooseCsv(familyCsv(1))
    await act(async () =>
      window.dispatchEvent(new Event('admin-sensitive-state-clear')),
    )
    expect(container!.querySelector('dialog[open]')).toBeNull()
    expect(container!.textContent).not.toContain('Pessoa Fictícia')
  })

  it('does not restore protected results when an in-flight batch settles after clear', async () => {
    const pending = deferred<any>()
    convexMocks.mutation.mockReturnValue(vi.fn(() => pending.promise))
    await renderImporter()
    await chooseCsv(familyCsv(1))
    await startImport()

    await act(async () =>
      window.dispatchEvent(new Event('admin-sensitive-state-clear')),
    )
    await act(async () => {
      pending.resolve({
        kind: 'ready',
        created: [
          {
            sourceRows: [2],
            familyId: 'family-late',
            displayName: 'Família Fictícia Tardia',
            people: 1,
          },
        ],
        ignored: [],
      })
      await pending.promise
    })

    expect(container!.querySelector('dialog[open]')).toBeNull()
    expect(container!.textContent).not.toContain('Família Fictícia Tardia')
  })

  it('keeps manual family creation rendered and operational beside csv import', async () => {
    convexMocks.query.mockReturnValue({
      status: 'success',
      data: { kind: 'ready', families: [] },
    })
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    await act(async () => {
      root?.render(
        createElement(
          MemoryRouter,
          { initialEntries: ['/admin/convidados'] },
          createElement(AdminGuests, {
            token: 'admin-token-ficticio',
            onUnauthorized: vi.fn(),
          }),
        ),
      )
    })

    expect(buttonWithText(container, 'Importar CSV')).toBeTruthy()
    const addButtons = [...container.querySelectorAll('button')].filter(
      (button) => button.textContent?.trim() === 'Adicionar família',
    )
    expect(addButtons.length).toBeGreaterThan(0)
    await act(async () => addButtons[0].click())
    expect(
      container.querySelector<HTMLDialogElement>('dialog[open] h2')?.textContent,
    ).toBe('Adicionar família')

    const dialog = container.querySelector<HTMLDialogElement>('dialog[open]')!
    await act(async () => buttonWithText(dialog, 'Adicionar pessoa').click())
    const guestInput =
      dialog.querySelector<HTMLInputElement>('#new-guest-0')!
    await act(async () => setInputValue(guestInput, 'Pessoa Fictícia'))

    expect(guestInput.value).toBe('Pessoa Fictícia')
    expect(guestInput.parentElement?.className).toContain('mb-0')
    expect(
      dialog.querySelector(
        'button[aria-label="Remover pessoa 1"] svg[aria-hidden="true"]',
      ),
    ).toBeTruthy()
    expect(container.textContent).toContain('Adicionar família')
  })

  it('keeps the panel mounted while typing a new person into an existing family', async () => {
    convexMocks.query.mockReturnValue({
      status: 'success',
      data: {
        kind: 'ready',
        families: [
          {
            id: 'family-existing',
            displayName: 'Família Fictícia',
            phone: '79999994501',
            contact: '',
            updatedAt: 1,
            guests: [],
          },
        ],
      },
    })
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    await act(async () => {
      root?.render(
        createElement(
          MemoryRouter,
          { initialEntries: ['/admin/convidados'] },
          createElement(AdminGuests, {
            token: 'admin-token-ficticio',
            onUnauthorized: vi.fn(),
          }),
        ),
      )
    })

    const familyToggle = container.querySelector<HTMLButtonElement>(
      'button[aria-controls="family-family-existing"]',
    )!
    await act(async () => familyToggle.click())
    const guestInput =
      container.querySelector<HTMLInputElement>('#add-guest-family-existing')!
    await act(async () => setInputValue(guestInput, 'Pessoa Fictícia'))

    expect(guestInput.value).toBe('Pessoa Fictícia')
    expect(container.textContent).toContain('Convidados')
    expect(container.textContent).not.toContain(
      'Painel temporariamente indisponível',
    )
  })
})
