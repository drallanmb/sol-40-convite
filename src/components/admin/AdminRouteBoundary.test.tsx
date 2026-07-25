// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminRouteBoundary } from './AdminRouteBoundary'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement | null = null

afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  root = null
  container?.remove()
  container = null
  vi.restoreAllMocks()
})

function render(element: React.ReactNode) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  return act(async () => {
    root?.render(createElement(AdminRouteBoundary, null, element))
  })
}

describe('AdminRouteBoundary', () => {
  it('preserves the normal admin flow when no Convex error occurs', async () => {
    await render(createElement('main', null, 'login-admin-normal'))

    expect(container?.textContent).toContain('login-admin-normal')
    expect(container?.textContent).not.toContain(
      'Painel temporariamente indisponível',
    )
  })

  it('fails closed with a useful generic screen when bootstrap query throws', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    const technicalDetail =
      '[CONVEX Q(adminBootstrap:getBootstrapStatus)] Could not find public function'
    const BrokenAdmin = () => {
      throw new Error(technicalDetail)
    }

    await render(createElement(BrokenAdmin))

    expect(container?.textContent).toContain(
      'Painel temporariamente indisponível',
    )
    expect(container?.textContent).toContain(
      'Atualize a página depois que o serviço estiver disponível.',
    )
    expect(container?.textContent).toContain('Tentar novamente')
    expect(container?.textContent).not.toContain(technicalDetail)
    expect(container?.textContent).not.toContain('adminBootstrap')
    expect(container?.querySelector('[aria-label="Seções do painel"]')).toBeNull()
    expect(container?.querySelector('input')).toBeNull()
    expect(consoleError).toHaveBeenCalled()
  })
})
