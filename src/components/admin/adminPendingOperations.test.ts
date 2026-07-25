// @vitest-environment jsdom

import { act, createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { getFunctionName, type FunctionReference } from 'convex/server'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { usePendingOperations } from '../../lib/adminOperations'
import { AdminGifts } from './AdminGifts'
import { AdminGuests } from './AdminGuests'
import { AdminModeration } from './AdminModeration'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true

const convexMocks = vi.hoisted(() => ({
  query: (_reference: unknown, _args: unknown): unknown => ({
    status: 'pending',
  }),
  mutation: (_reference: unknown): ((args: unknown) => Promise<unknown>) =>
    vi.fn(async () => ({ kind: 'invalid' })),
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

let root: Root | null = null
let container: HTMLDivElement | null = null

afterEach(async () => {
  if (root) {
    await act(async () => root?.unmount())
  }
  root = null
  container?.remove()
  container = null
  vi.restoreAllMocks()
  convexMocks.query = () => ({ status: 'pending' })
  convexMocks.mutation = () => vi.fn(async () => ({ kind: 'invalid' }))
})

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

function functionName(reference: unknown) {
  return getFunctionName(reference as FunctionReference<'query' | 'mutation'>)
}

async function renderScreen(element: React.ReactNode, route: string) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => {
    root?.render(
      createElement(MemoryRouter, { initialEntries: [route] }, element),
    )
  })
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function setTextareaValue(textarea: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    'value',
  )?.set
  setter?.call(textarea, value)
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
}

function buttonWithText(scope: ParentNode, text: string) {
  const button = [...scope.querySelectorAll('button')].find(
    (candidate) => candidate.textContent?.trim() === text,
  )
  if (!button) throw new Error(`Button not found: ${text}`)
  return button as HTMLButtonElement
}

function buttonContainingText(scope: ParentNode, text: string) {
  const button = [...scope.querySelectorAll('button')].find((candidate) =>
    candidate.textContent?.includes(text),
  )
  if (!button) throw new Error(`Button containing text not found: ${text}`)
  return button as HTMLButtonElement
}

function PendingHarness({
  operations,
}: {
  operations: Record<string, () => Promise<void>>
}) {
  const pending = usePendingOperations()
  const [completed, setCompleted] = useState<string[]>([])

  return createElement(
    'div',
    null,
    ...['a', 'b'].map((id) =>
      createElement(
        'button',
        {
          key: id,
          type: 'button',
          'data-id': id,
          disabled: pending.has(id),
          'aria-busy': pending.has(id),
          onClick: () =>
            void pending.run(id, async () => {
              await operations[id]()
              setCompleted((current) => [...current, id])
            }),
        },
        id,
      ),
    ),
    createElement('output', null, completed.join(',')),
  )
}

describe('per-record pending DOM harness', () => {
  it('settles A while B stays disabled and rejects a same-tick duplicate B', async () => {
    const operationA = deferred<void>()
    const operationB = deferred<void>()
    const calls = { a: vi.fn(() => operationA.promise), b: vi.fn(() => operationB.promise) }
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(async () => {
      root?.render(createElement(PendingHarness, { operations: calls }))
    })
    const buttonA = container.querySelector<HTMLButtonElement>('[data-id="a"]')!
    const buttonB = container.querySelector<HTMLButtonElement>('[data-id="b"]')!

    await act(async () => {
      buttonA.click()
      buttonB.click()
      buttonB.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(calls.a).toHaveBeenCalledTimes(1)
    expect(calls.b).toHaveBeenCalledTimes(1)
    expect(buttonA.disabled).toBe(true)
    expect(buttonB.disabled).toBe(true)
    expect(buttonB.getAttribute('aria-busy')).toBe('true')

    await act(async () => {
      operationA.resolve()
      await operationA.promise
    })
    expect(buttonA.disabled).toBe(false)
    expect(buttonB.disabled).toBe(true)
    expect(buttonB.getAttribute('aria-busy')).toBe('true')

    await act(async () => {
      operationB.resolve()
      await operationB.promise
    })
    expect(buttonB.disabled).toBe(false)
    expect(container.querySelector('output')?.textContent).toBe('a,b')
  })
})

describe('admin screen pending operations', () => {
  it('keeps guest family B pending after A settles and clears locks on auth loss', async () => {
    const familyA = {
      id: 'family-a',
      displayName: 'Família A',
      phone: '81999999991',
      contact: '',
      updatedAt: 1,
      guests: [],
    }
    const familyB = {
      id: 'family-b',
      displayName: 'Família B',
      phone: '81999999992',
      contact: '',
      updatedAt: 2,
      guests: [],
    }
    const operationA = deferred<unknown>()
    const operationB = deferred<unknown>()
    const updateFamily = vi
      .fn()
      .mockImplementationOnce(() => operationA.promise)
      .mockImplementationOnce(() => operationB.promise)
    convexMocks.query = () => ({
      status: 'success',
      data: { kind: 'ready', families: [familyA, familyB] },
    })
    convexMocks.mutation = (reference) =>
      functionName(reference) === 'adminRsvps:updateFamily'
        ? updateFamily
        : vi.fn(async () => ({ kind: 'invalid', message: 'unused' }))

    await renderScreen(
      createElement(AdminGuests, {
        token: 'test-token',
        onUnauthorized: vi.fn(),
      }),
      '/admin/convidados',
    )
    await act(async () => {
      buttonContainingText(container!, 'Família A').click()
      buttonContainingText(container!, 'Família B').click()
    })
    const regionA = container!.querySelector<HTMLElement>('#family-family-a')!
    const regionB = container!.querySelector<HTMLElement>('#family-family-b')!
    const inputA = regionA.querySelector<HTMLInputElement>('#family-name-family-a')!
    const inputB = regionB.querySelector<HTMLInputElement>('#family-name-family-b')!
    await act(async () => {
      setInputValue(inputA, 'Família A editada')
      setInputValue(inputB, 'Família B editada')
    })
    const submitA = buttonWithText(regionA, 'Salvar família')
    const submitB = buttonWithText(regionB, 'Salvar família')
    await act(async () => {
      submitA.click()
      submitB.click()
      submitB.click()
    })
    expect(updateFamily).toHaveBeenCalledTimes(2)
    expect(inputA.disabled).toBe(true)
    expect(inputB.disabled).toBe(true)

    await act(async () => {
      operationA.resolve({
        kind: 'saved',
        family: { ...familyA, displayName: 'Família A editada', updatedAt: 3 },
      })
      await operationA.promise
    })
    expect(inputA.disabled).toBe(false)
    expect(inputB.disabled).toBe(true)

    await act(async () => {
      window.dispatchEvent(new Event('admin-sensitive-state-clear'))
    })
    expect(container!.querySelector('#family-family-b')).toBeNull()

    await act(async () => {
      operationB.resolve({
        kind: 'saved',
        family: { ...familyB, displayName: 'Família B editada', updatedAt: 4 },
      })
      await operationB.promise
    })
  })

  it('keeps moderation post B pending after A settles and rejects duplicate B', async () => {
    const postA = {
      id: 'post-a',
      author: 'Pessoa A',
      message: 'Memória A',
      status: 'pendente',
      createdAt: 1,
      moderationRevision: 0,
    }
    const postB = {
      id: 'post-b',
      author: 'Pessoa B',
      message: 'Memória B',
      status: 'pendente',
      createdAt: 2,
      moderationRevision: 0,
    }
    const operationA = deferred<unknown>()
    const operationB = deferred<unknown>()
    const transitionPost = vi
      .fn()
      .mockImplementationOnce(() => operationA.promise)
      .mockImplementationOnce(() => operationB.promise)
    convexMocks.query = (_reference, args) => ({
      status: 'success',
      data: {
        kind: 'ready',
        posts:
          (args as { status: string }).status === 'pendente'
            ? [postA, postB]
            : [],
      },
    })
    convexMocks.mutation = (reference) =>
      functionName(reference) === 'adminPosts:transitionPost'
        ? transitionPost
        : vi.fn(async () => ({ kind: 'invalid' }))

    await renderScreen(
      createElement(AdminModeration, {
        token: 'test-token',
        onUnauthorized: vi.fn(),
      }),
      '/admin/moderacao?status=pendente',
    )
    const rows = container!.querySelectorAll<HTMLLIElement>('ul.mt-6 > li')
    const submitA = buttonWithText(rows[0], 'Aprovar memória')
    const submitB = buttonWithText(rows[1], 'Aprovar memória')
    await act(async () => {
      submitA.click()
      submitB.click()
      submitB.click()
    })
    expect(transitionPost).toHaveBeenCalledTimes(2)
    expect(rows[0].getAttribute('aria-busy')).toBe('true')
    expect(rows[1].getAttribute('aria-busy')).toBe('true')

    await act(async () => {
      operationA.resolve({
        kind: 'updated',
        post: { ...postA, status: 'aprovado', moderationRevision: 1 },
      })
      await operationA.promise
    })
    expect(submitA.disabled).toBe(false)
    expect(submitB.disabled).toBe(true)
    expect(rows[1].getAttribute('aria-busy')).toBe('true')

    await act(async () => {
      window.dispatchEvent(new Event('admin-sensitive-state-clear'))
    })
    expect(submitB.disabled).toBe(false)

    await act(async () => {
      operationB.resolve({
        kind: 'updated',
        post: { ...postB, status: 'aprovado', moderationRevision: 1 },
      })
      await operationB.promise
    })
  })

  it('keeps the newer gift B dialog pending when gift A settles', async () => {
    const wineA = {
      id: 'wine-a',
      productCode: 'A',
      name: 'Vinho A',
      producer: 'Produtor',
      priceCents: 10000,
      category: 'ate-200',
      status: 'available',
      updatedAt: 1,
    }
    const wineB = {
      id: 'wine-b',
      productCode: 'B',
      name: 'Vinho B',
      producer: 'Produtor',
      priceCents: 12000,
      category: 'ate-200',
      status: 'available',
      updatedAt: 2,
    }
    const operationA = deferred<unknown>()
    const operationB = deferred<unknown>()
    const markGifted = vi
      .fn()
      .mockImplementationOnce(() => operationA.promise)
      .mockImplementationOnce(() => operationB.promise)
    convexMocks.query = () => ({
      status: 'success',
      data: { kind: 'ready', wines: [wineA, wineB] },
    })
    convexMocks.mutation = (reference) =>
      functionName(reference) === 'adminWines:markGifted'
        ? markGifted
        : vi.fn(async () => ({ kind: 'invalid' }))

    await renderScreen(
      createElement(AdminGifts, {
        token: 'test-token',
        onUnauthorized: vi.fn(),
      }),
      '/admin/presentes?status=available',
    )
    const rows = container!.querySelectorAll<HTMLLIElement>('ul.mt-3 > li')
    await act(async () => {
      buttonWithText(rows[0], 'Confirmar compra').click()
    })
    let presenter = container!.querySelector<HTMLInputElement>('#gift-presenter')!
    await act(async () => setInputValue(presenter, 'Pessoa A'))
    let note = container!.querySelector<HTMLTextAreaElement>('#gift-note')!
    await act(async () => setTextareaValue(note, 'Pago no balcão'))
    await act(async () => {
      buttonWithText(
        container!.querySelector<HTMLDialogElement>('dialog[open]')!,
        'Confirmar compra',
      ).click()
      buttonWithText(rows[1], 'Confirmar compra').click()
    })
    presenter = container!.querySelector<HTMLInputElement>('#gift-presenter')!
    await act(async () => setInputValue(presenter, 'Pessoa B'))
    note = container!.querySelector<HTMLTextAreaElement>('#gift-note')!
    await act(async () => setTextareaValue(note, 'Pagamento por link'))
    const submitB = buttonWithText(
      container!.querySelector<HTMLDialogElement>('dialog[open]')!,
      'Confirmar compra',
    )
    await act(async () => {
      submitB.click()
      submitB.click()
    })
    expect(markGifted).toHaveBeenCalledTimes(2)
    expect(markGifted).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        giftedBy: 'Pessoa A',
        giftNote: 'Pago no balcão',
      }),
    )
    expect(rows[0].getAttribute('aria-busy')).toBe('true')
    expect(rows[1].getAttribute('aria-busy')).toBe('true')

    await act(async () => {
      operationA.resolve({
        kind: 'updated',
        wine: { ...wineA, status: 'gifted', giftedBy: 'Pessoa A' },
      })
      await operationA.promise
    })
    expect(rows[1].getAttribute('aria-busy')).toBe('true')
    expect(submitB.disabled).toBe(true)
    expect(container!.querySelector<HTMLDialogElement>('dialog[open]')).not.toBeNull()

    await act(async () => {
      window.dispatchEvent(new Event('admin-sensitive-state-clear'))
    })
    expect(rows[1].getAttribute('aria-busy')).toBe('false')
    expect(container!.querySelector<HTMLDialogElement>('dialog[open]')).toBeNull()

    await act(async () => {
      operationB.resolve({
        kind: 'updated',
        wine: { ...wineB, status: 'gifted', giftedBy: 'Pessoa B' },
      })
      await operationB.promise
    })
  })

  it('keeps gift correction data after conflict and reopens only through explicit undo', async () => {
    const wine = {
      id: 'wine-confirmed',
      productCode: 'C',
      name: 'Vinho Confirmado',
      producer: 'Produtor',
      priceCents: 15000,
      category: 'ate-200',
      status: 'gifted',
      giftedBy: 'Nome original',
      giftNote: 'Nota original',
      giftedAt: 10_000,
      updatedAt: 3,
    }
    const editGift = vi.fn(async () => ({
      kind: 'conflict',
      wine: { ...wine, giftedBy: 'Outra pessoa', updatedAt: 4 },
    }))
    const makeAvailable = vi.fn(async () => ({
      kind: 'updated',
      wine: {
        ...wine,
        status: 'available',
        giftedBy: undefined,
        giftNote: undefined,
        giftedAt: undefined,
        updatedAt: 5,
      },
    }))
    convexMocks.query = () => ({
      status: 'success',
      data: { kind: 'ready', wines: [wine] },
    })
    convexMocks.mutation = (reference) => {
      const name = functionName(reference)
      if (name === 'adminWines:editGift') return editGift
      if (name === 'adminWines:makeAvailable') return makeAvailable
      return vi.fn(async () => ({ kind: 'invalid' }))
    }

    await renderScreen(
      createElement(AdminGifts, {
        token: 'test-token',
        onUnauthorized: vi.fn(),
      }),
      '/admin/presentes?status=gifted',
    )

    expect(container!.textContent).toContain('Compra confirmada')
    const row = container!.querySelector<HTMLLIElement>('ul.mt-3 > li')!
    await act(async () => buttonWithText(row, 'Editar compra').click())
    const presenter =
      container!.querySelector<HTMLInputElement>('#gift-presenter')!
    const note = container!.querySelector<HTMLTextAreaElement>('#gift-note')!
    expect(presenter.value).toBe('Nome original')
    expect(note.value).toBe('Nota original')
    await act(async () => {
      setInputValue(presenter, 'Nome corrigido')
      setTextareaValue(note, 'Nota corrigida')
      buttonWithText(container!, 'Salvar correção').click()
    })

    expect(editGift).toHaveBeenCalledWith({
      token: 'test-token',
      wineId: 'wine-confirmed',
      expectedUpdatedAt: 3,
      giftedBy: 'Nome corrigido',
      giftNote: 'Nota corrigida',
    })
    expect(presenter.value).toBe('Nome corrigido')
    expect(note.value).toBe('Nota corrigida')
    expect(container!.textContent).toContain(
      'Este vinho foi atualizado em outra sessão',
    )

    await act(async () =>
      buttonWithText(container!, 'Voltar aos presentes').click(),
    )
    await act(async () => buttonWithText(row, 'Desfazer compra').click())
    expect(container!.textContent).toContain(
      'voltar a ficar disponível no catálogo',
    )
    await act(async () => buttonWithText(container!, 'Tornar disponível').click())
    expect(makeAvailable).toHaveBeenCalledWith({
      token: 'test-token',
      wineId: 'wine-confirmed',
      expectedUpdatedAt: 3,
    })
  })
})
