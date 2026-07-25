// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { AdminOverview } from './AdminOverview'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement | null = null

afterEach(async () => {
  if (root) {
    await act(async () => root?.unmount())
  }
  root = null
  container?.remove()
  container = null
})

async function renderOverview() {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)

  await act(async () => {
    root?.render(
      createElement(
        MemoryRouter,
        { initialEntries: ['/admin/visao'] },
        createElement(AdminOverview, {
          state: 'ready',
          reconnecting: false,
          data: {
            familyCount: 18,
            confirmedCount: 42,
            refusedCount: 6,
            pendingCount: 12,
            pendingMemoryCount: 3,
            giftedWineCount: 9,
            totalWineCount: 37,
          },
        }),
      ),
    )
  })

  return container
}

describe('AdminOverview', () => {
  it('turns the overview into an operational summary with intact destinations', async () => {
    const scope = await renderOverview()
    const text = scope.textContent ?? ''

    expect(text).toContain('18')
    expect(text).toContain('60')
    expect(text).toContain('48')
    expect(text).toContain('80%')
    expect(text).toContain('Ação necessária')
    expect(text).toContain('9 de 37')

    const responseProgress = scope.querySelector(
      '[role="progressbar"][aria-label="48 de 60 pessoas responderam"]',
    )
    expect(responseProgress?.getAttribute('aria-valuenow')).toBe('48')

    const destinations = [...scope.querySelectorAll('a')].map((link) =>
      link.getAttribute('href'),
    )
    expect(destinations).toContain('/admin/convidados?presenca=yes')
    expect(destinations).toContain('/admin/convidados?presenca=no')
    expect(destinations).toContain('/admin/convidados?presenca=pending')
    expect(destinations).toContain('/admin/moderacao?status=pendente')
    expect(destinations).toContain('/admin/presentes?status=gifted')
  })
})
