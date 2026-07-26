import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { spawnSync } from 'node:child_process'

const WCAG_AA_TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
]
const CINEMATIC_INTRO_DURATION_MS = 3700
const CINEMATIC_INTRO_RELEASE_SAMPLES_MS = [
  0,
  Math.round(CINEMATIC_INTRO_DURATION_MS * 0.7),
  CINEMATIC_INTRO_DURATION_MS,
] as const

type ReleaseCinematicIntroAnimation = {
  animation: Animation
  durationMs: number
  track: string
}

const RELEASE_ROUTES = [
  { path: '/', heading: /Sol/i },
  { path: '/confirmar', heading: /Esse pôr do sol/i },
  { path: '/presentes', heading: /Um carinho para abrir/i },
  { path: '/admin', heading: /Painel da festa/i },
  { path: '/admin/convidados', heading: /Painel da festa/i },
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

async function expectNoWcagTaggedViolations(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(WCAG_AA_TAGS)
    .analyze()
  expect(result.violations).toEqual([])
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

async function installReleaseCinematicIntroControl(
  page: Page,
): Promise<void> {
  await page.addInitScript(() => {
    const originalAnimate = Element.prototype.animate
    window.__releaseCinematicIntroAnimations = []

    Element.prototype.animate = function (
      keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
      options?: number | KeyframeAnimationOptions,
    ) {
      const animation = originalAnimate.call(this, keyframes, options)
      const owner = this as HTMLElement
      const track = owner.dataset.introTrack
      if (!track) return animation

      const timing = animation.effect?.getTiming()
      const finite =
        typeof timing?.duration === 'number'
        && Number.isFinite(timing.duration)
        && typeof timing.iterations === 'number'
        && Number.isFinite(timing.iterations)
      if (!finite) return animation

      animation.pause()
      animation.currentTime = 0
      window.__releaseCinematicIntroAnimations.push({
        animation,
        durationMs: timing.duration as number,
        track,
      })
      return animation
    }
  })
}

async function seekReleaseCinematicIntroAtMs(
  page: Page,
  currentTimeMs: number,
): Promise<void> {
  const intro = page.locator('#inicio')
  if ((await intro.getAttribute('data-intro-state')) !== 'playing') return

  await page.waitForFunction(() => {
    const renderedTracks = document.querySelectorAll(
      '#inicio [data-intro-track]',
    ).length
    return (
      renderedTracks > 0
      && window.__releaseCinematicIntroAnimations?.length === renderedTracks
    )
  })
  await page.evaluate(async ({ duration, value }) => {
    const timelineTime = Math.min(
      duration,
      Math.max(0, value),
    )
    for (const record of window.__releaseCinematicIntroAnimations) {
      record.animation.pause()
    }
    await Promise.all(
      window.__releaseCinematicIntroAnimations.map(({ animation }) =>
        animation.ready.catch(() => animation),
      ),
    )
    for (const record of window.__releaseCinematicIntroAnimations) {
      record.animation.currentTime = Math.min(
        timelineTime,
        record.durationMs,
      )
    }
  }, {
    duration: CINEMATIC_INTRO_DURATION_MS,
    value: currentTimeMs,
  })
  await page.evaluate(
    () =>
      new Promise<void>((resolvePaint) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolvePaint())
        })
      }),
  )

  if (currentTimeMs >= CINEMATIC_INTRO_DURATION_MS) {
    await expect(intro).toHaveAttribute('data-intro-state', 'complete')
  }
}

declare global {
  interface Window {
    __releaseConvexTraffic: string[]
    __releaseCinematicIntroAnimations: ReleaseCinematicIntroAnimation[]
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
    'https://www.sol40.com.br/og-sol40-v2.jpg',
  )

  await expectNoWcagTaggedViolations(page)

  await page.keyboard.press('Tab')
  const focusedTagName = await page.evaluate(() => document.activeElement?.tagName)
  expect(focusedTagName).toBeTruthy()
  expect(focusedTagName).not.toBe('BODY')

  await expectNoDocumentOverflow(page)
})

for (const route of RELEASE_ROUTES) {
  test(`${route.path} loads, refreshes, passes automated AA and reflows`, async ({
    page,
  }) => {
    const response = await page.goto(route.path)
    expect(response?.status()).toBeLessThan(400)
    await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible()
    await expectNoWcagTaggedViolations(page)
    await expectNoDocumentOverflow(page)

    const refresh = await page.reload()
    expect(refresh?.status()).toBeLessThan(400)
    await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible()
  })
}

test('anonymous admin mounts no protected DOM or domain query', async ({ page }) => {
  await observeConvexTraffic(page)
  await page.goto('/admin/convidados')
  await expect(page.getByRole('heading', { name: 'Painel da festa' })).toBeVisible()
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
  await installReleaseCinematicIntroControl(page)
  await page.goto('/')

  const skipLink = page.getByRole('link', { name: 'Pular para o conteúdo' })
  const secondaryCopy = page.locator(
    '#inicio [data-intro-copy="secondary"]',
  )
  const ctaCopy = page.locator('#inicio [data-intro-copy="cta"]')
  const hiddenCta = ctaCopy.getByRole('link', {
    name: 'Confirmar presença',
  })
  await expect(page.locator('#inicio')).toHaveAttribute(
    'data-intro-state',
    'playing',
  )
  await expect(secondaryCopy).toHaveAttribute('inert', '')
  await expect(ctaCopy).toHaveAttribute('inert', '')
  expect(
    await hiddenCta.evaluate((element) => {
      ;(element as HTMLElement).focus()
      return document.activeElement === element
    }),
  ).toBe(false)
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

  await seekReleaseCinematicIntroAtMs(page, CINEMATIC_INTRO_DURATION_MS)

  const isDesktop = (page.viewportSize()?.width ?? 0) >= 1024
  if (isDesktop) {
    expect(
      await page
        .getByRole('navigation', { name: 'Navegação principal' })
        .count(),
    ).toBe(1)
    await expect(
      page.getByRole('navigation', { name: 'Navegação principal' }),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Login administrativo' }),
    ).toHaveAttribute('href', '/admin')
  } else {
    const menu = page.getByRole('button', { name: 'Abrir menu' })
    expect(await menu.count()).toBe(1)
    await expect(menu).toBeVisible()
    await menu.click()
    const mobileNavigation = page.getByRole('navigation', {
      name: 'Navegação mobile',
    })
    await expect(mobileNavigation).toBeVisible()
    await expect(
      mobileNavigation.getByRole('link', { name: 'Login administrativo' }),
    ).toHaveAttribute('href', '/admin')
    await expect(
      mobileNavigation.getByRole('link').first(),
    ).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(menu).toBeFocused()

    await page.locator('#programacao').scrollIntoViewIfNeeded()
    const rail = page.locator('.countdown-rail')
    await expect(rail).toHaveClass(/visible/)

    await menu.click()
    const firstMobileLink = page
      .getByRole('navigation', { name: 'Navegação mobile' })
      .getByRole('link')
      .first()
    await expect(rail).toHaveClass(/invisible/)
    await expect(firstMobileLink).toBeFocused()
    const firstMobileLinkIsTopmost = await firstMobileLink.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      const topElement = document.elementFromPoint(
        rect.left + Math.min(12, rect.width / 2),
        rect.top + rect.height / 2,
      )
      return topElement === element || element.contains(topElement)
    })
    expect(firstMobileLinkIsTopmost).toBe(true)
  }
})

test('cinematic 320px stays overflow-free at absolute 0/70/100 timeline samples and pointer-transparent', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 760 })
  await installReleaseCinematicIntroControl(page)
  await page.goto('/')

  const scene = page.locator('#inicio [data-intro-scene]')
  await expect(scene).toHaveCSS('pointer-events', 'none')
  await expect(
    page.locator(
      '#inicio [data-intro-layer="cloud-far"], '
      + '#inicio [data-intro-layer="cloud-near"], '
      + '#inicio [data-intro-layer="reflection"], '
      + '#inicio [data-intro-layer="palms"]',
    ),
  ).toHaveCount(0)

  for (const currentTimeMs of CINEMATIC_INTRO_RELEASE_SAMPLES_MS) {
    await seekReleaseCinematicIntroAtMs(page, currentTimeMs)
    await expectNoDocumentOverflow(page)
  }
})

test('forced colors keeps skip, chrome and final CTA usable', async ({
  page,
}) => {
  await page.emulateMedia({
    forcedColors: 'active',
    reducedMotion: 'reduce',
  })
  await page.goto('/')

  const skip = page.getByRole('link', {
    name: 'Pular para o conteúdo',
  })
  const wordmark = page.getByRole('link', {
    name: 'Sol faz 40 — voltar ao início',
  })
  const cta = page
    .locator('#inicio')
    .getByRole('link', { name: 'Confirmar presença' })
  await expect(page.locator('#inicio')).toHaveAttribute(
    'data-intro-state',
    'complete',
  )
  await expect(wordmark).toBeVisible()
  await expect(cta).toBeVisible()
  await skip.focus()
  await expect(skip).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#conteudo')).toBeFocused()
  await expectNoDocumentOverflow(page)
})

test('reduced motion keeps content visible without continuous animation', async ({
  page,
}) => {
  await installReleaseCinematicIntroControl(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('#inicio')).toHaveAttribute(
    'data-intro-state',
    'complete',
  )
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__releaseCinematicIntroAnimations.length,
      ),
    )
    .toBe(0)
  const finiteIntroAnimations = await page.evaluate(() => {
    const elements = [
      ...document.querySelectorAll('#inicio [data-intro-track]'),
    ]

    return elements.flatMap((element) => element.getAnimations()).filter(
      (animation) => {
        const duration = animation.effect?.getTiming().duration
        return typeof duration === 'number' && Number.isFinite(duration)
      },
    ).length
  })
  expect(finiteIntroAnimations).toBe(0)
  await expect(page.locator('.wave-band').first()).toBeVisible()
  await expect(page.locator('.wave-band').first()).toHaveCSS(
    'animation-name',
    'none',
  )

  await page.goto('/presentes')
  await expect(page.locator('.gift-route-enter')).toHaveCSS(
    'animation-name',
    'none',
  )

  await page.goto('/admin')
  await expect(page.locator('.admin-auth-enter')).toHaveCSS(
    'animation-name',
    'none',
  )
})

test('phase 8 smoke aborts Production before any probe', () => {
  const result = spawnSync(
    process.execPath,
    ['scripts/phase8-preview-smoke.mjs', '--check-only'],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        CONVEX_DEPLOYMENT: 'prod:do-not-touch',
      },
    },
  )

  expect(result.status).not.toBe(0)
  expect(`${result.stdout}\n${result.stderr}`).toMatch(
    /Production recusado antes de qualquer probe/iu,
  )
  expect(`${result.stdout}\n${result.stderr}`).not.toMatch(
    /npx convex run|password|token|hash/iu,
  )
})

test('phase 8 smoke check-only validates Preview without network or writes', () => {
  const result = spawnSync(
    process.execPath,
    ['scripts/phase8-preview-smoke.mjs', '--check-only'],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        CONVEX_DEPLOYMENT: 'preview:phase8-safe',
      },
    },
  )

  expect(result.status).toBe(0)
  expect(JSON.parse(result.stdout)).toEqual({
    mode: 'check-only',
    deploymentClass: 'preview',
    production: false,
    writesAttempted: 0,
    status: 'ready',
  })
})
