import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const WCAG_AA_TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
]

const RELEASE_ROUTES = [
  { path: '/', heading: /Sol/i },
  { path: '/confirmar', heading: /Esse pôr do sol/i },
  { path: '/presentes', heading: /Um carinho para abrir/i },
  { path: '/admin', heading: /Painel dos donos/i },
  { path: '/admin/convidados', heading: /Painel dos donos/i },
  { path: '/rota-inexistente', heading: /Página não encontrada/i },
]

async function expectNoDocumentOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    document:
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }))
  expect(overflow.document).toBeLessThanOrEqual(1)
  expect(overflow.body).toBeLessThanOrEqual(1)
}

async function expectNoBlockingAxeViolations(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(WCAG_AA_TAGS)
    .analyze()
  const blocking = result.violations.filter(
    ({ impact }) => impact === 'serious' || impact === 'critical',
  )
  expect(blocking).toEqual([])
}

async function observeConvexTraffic(page: Page) {
  await page.addInitScript(() => {
    const OriginalWebSocket = window.WebSocket
    window.__releaseConvexTraffic = []

    class ObservedWebSocket extends OriginalWebSocket {
      override send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
        if (typeof data === 'string') {
          window.__releaseConvexTraffic.push(data)
        }
        return super.send(data)
      }
    }

    window.WebSocket = ObservedWebSocket
  })
}

declare global {
  interface Window {
    __releaseConvexTraffic: string[]
  }
}

test('canonical tracer: emulated 320px home quality slice', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://www.sol40.com.br/',
  )
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    'content',
    'https://www.sol40.com.br/',
  )
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    'https://www.sol40.com.br/og.jpg',
  )

  await expectNoBlockingAxeViolations(page)

  await page.keyboard.press('Tab')
  const focused = page.locator(':focus')
  await expect(focused).toBeVisible()
  await expect(focused).not.toHaveJSProperty('tagName', 'BODY')

  await expectNoDocumentOverflow(page)
})

for (const route of RELEASE_ROUTES) {
  test(`${route.path} loads, refreshes, passes automated AA and reflows`, async ({
    page,
  }) => {
    const response = await page.goto(route.path)
    expect(response?.status()).toBeLessThan(400)
    await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible()
    await expectNoBlockingAxeViolations(page)
    await expectNoDocumentOverflow(page)

    const refresh = await page.reload()
    expect(refresh?.status()).toBeLessThan(400)
    await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible()
  })
}

test('anonymous admin mounts no protected DOM or domain query', async ({ page }) => {
  await observeConvexTraffic(page)
  await page.goto('/admin/convidados')
  await expect(page.getByRole('heading', { name: 'Painel dos donos' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Seções do painel' })).toHaveCount(0)
  await expect(page.getByText('Visão geral', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Convidados', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Moderação', { exact: true })).toHaveCount(0)

  const traffic = (await page.evaluate(
    () => window.__releaseConvexTraffic,
  )).join('\n')
  expect(traffic).not.toMatch(
    /adminOverview|getFamilies|adminRsvps|adminModeration|adminGifts|listCatalog/i,
  )
})

test('keyboard skip link and mobile navigation return focus safely', async ({
  browserName,
  page,
}) => {
  await page.goto('/')
  const skipLink = page.getByRole('link', { name: 'Pular para o conteúdo' })
  // macOS WebKit follows the operating-system "full keyboard access"
  // preference and may omit links from the native Tab order in automation.
  // Focus it explicitly there, then exercise the same keyboard activation.
  if (browserName === 'webkit') {
    await skipLink.focus()
  } else {
    await page.keyboard.press('Tab')
  }
  await expect(skipLink).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#conteudo')).toBeFocused()

  const menu = page.getByRole('button', { name: 'Abrir menu' })
  if (await menu.isVisible()) {
    await menu.click()
    await expect(page.getByRole('navigation', { name: 'Navegação mobile' })).toBeVisible()
    await expect(
      page.getByRole('navigation', { name: 'Navegação mobile' }).getByRole('link').first(),
    ).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(menu).toBeFocused()
  }
})

test('reduced motion keeps content visible without continuous animation', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('.wave-band').first()).toBeVisible()
  await expect(page.locator('.wave-band').first()).toHaveCSS(
    'animation-name',
    'none',
  )
})
