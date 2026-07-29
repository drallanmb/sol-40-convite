import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(HTMLMediaElement.prototype, 'paused', {
      configurable: true,
      get() {
        return this.dataset.testPlaying !== 'true'
      },
    })

    HTMLMediaElement.prototype.play = async function () {
      this.dataset.testPlaying = 'true'
      this.dispatchEvent(new Event('play'))
    }

    HTMLMediaElement.prototype.pause = function () {
      if (this.dataset.testPlaying !== 'true') return

      this.dataset.testPlaying = 'false'
      this.dispatchEvent(new Event('pause'))
    }
  })
})

test('keeps the ambient track playing across public routes and stops it in admin', async ({
  page,
}) => {
  await page.goto('/')

  const audio = page.locator('audio')
  const player = page.getByRole('button', { name: 'Tocar trilha Ô Sol' })

  await expect(audio).toHaveCount(1)
  await expect(audio.locator('source')).toHaveAttribute(
    'src',
    '/audio/o-sol.mp3',
  )
  await expect(audio).toHaveAttribute('loop', '')
  await expect
    .poll(() => audio.evaluate((element) => element.volume))
    .toBeCloseTo(0.18)
  await expect(player).toHaveAttribute('aria-pressed', 'false')

  await player.click()

  await expect(
    page.getByRole('button', { name: 'Pausar trilha Ô Sol' }),
  ).toHaveAttribute('aria-pressed', 'true')

  await page.locator('a[href="/confirmar"]:visible').first().click()
  await expect(page).toHaveURL(/\/confirmar$/)
  await expect(audio).toHaveCount(1)
  await expect(audio).toHaveJSProperty('paused', false)
  await expect(
    page.getByRole('button', { name: 'Pausar trilha Ô Sol' }),
  ).toBeVisible()

  await page.evaluate(() => {
    window.history.pushState({}, '', '/admin')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })

  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByRole('button', { name: /trilha Ô Sol/i })).toHaveCount(
    0,
  )
  await expect(audio).toHaveJSProperty('paused', true)
})

test('serves the attached MP3 as a public audio asset', async ({ request }) => {
  const response = await request.get('/audio/o-sol.mp3')

  expect(response.ok()).toBe(true)
  expect(response.headers()['content-type']).toContain('audio/mpeg')
  expect((await response.body()).byteLength).toBeGreaterThan(3_000_000)
})
