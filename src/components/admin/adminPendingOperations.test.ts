// @vitest-environment jsdom

import { act, createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePendingOperations } from '../../lib/adminOperations'

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
})

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
