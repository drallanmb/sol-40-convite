import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  expect,
  test,
  type BrowserContext,
  type Page,
} from '@playwright/test'

const INTRO_DURATION_MS = 3000
const PROGRESS_SAMPLES = [0, 0.4, 0.7, 0.88, 1] as const
const ARTIFACT_DIR = resolve(
  process.cwd(),
  '.planning/phases/10-abertura-cinematogr-fica-do-p-r-do-sol/artifacts',
)

type TrackContract = {
  track: string
  duration: number | string | null
  iterations: number
  keyframes: ComputedKeyframe[]
}

declare global {
  interface Window {
    __pwCinematicIntroTimeline?: {
      tracks: () => string[]
      duplicates: () => string[]
      contracts: () => TrackContract[]
      seek: (progress: number) => void
    }
  }
}

async function installTimelineInstrumentation(page: Page): Promise<void> {
  await page.addInitScript(({ duration }) => {
    const originalAnimate = Element.prototype.animate
    const handles = new Map<string, Animation>()
    const duplicateTracks: string[] = []

    window.__pwCinematicIntroTimeline = {
      tracks: () => [...handles.keys()],
      duplicates: () => [...duplicateTracks],
      contracts: () =>
        [...handles.entries()].map(([track, animation]) => {
          const effect = animation.effect as KeyframeEffect | null
          const timing = effect?.getTiming()
          return {
            track,
            duration: timing?.duration ?? null,
            iterations: timing?.iterations ?? Number.NaN,
            keyframes: effect?.getKeyframes() ?? [],
          }
        }),
      seek: (progress) => {
        const clamped = Math.min(1, Math.max(0, progress))
        for (const animation of handles.values()) {
          animation.pause()
          animation.currentTime = clamped * duration
        }
      },
    }

    Element.prototype.animate = function (
      keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
      options?: number | KeyframeAnimationOptions,
    ) {
      const animation = originalAnimate.call(this, keyframes, options)
      const owner = this as HTMLElement
      const track = owner.dataset.introTrack
      if (!track) return animation

      const effect = animation.effect as KeyframeEffect | null
      const timing = effect?.getTiming()
      const finiteDuration =
        typeof timing?.duration === 'number' &&
        Number.isFinite(timing.duration)
      const finiteIterations =
        typeof timing?.iterations === 'number' &&
        Number.isFinite(timing.iterations)

      if (!finiteDuration || !finiteIterations) return animation
      if (handles.has(track)) {
        duplicateTracks.push(track)
        return animation
      }

      animation.pause()
      handles.set(track, animation)
      return animation
    }
  }, { duration: INTRO_DURATION_MS })
}

async function waitForCoordinatedTracks(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const timeline = window.__pwCinematicIntroTimeline
    if (!timeline) return false

    const rendered = [...document.querySelectorAll<HTMLElement>(
      '#inicio [data-intro-track]',
    )]
      .map((element) => element.dataset.introTrack ?? '')
      .filter(Boolean)
      .sort()
    const registered = timeline.tracks().sort()

    return (
      rendered.length > 0 &&
      rendered.length === registered.length &&
      rendered.every((track, index) => track === registered[index])
    )
  })

  await expect
    .poll(() =>
      page.evaluate(
        () => window.__pwCinematicIntroTimeline?.duplicates() ?? [],
      ),
    )
    .toEqual([])
}

async function seekIntro(page: Page, progress: number): Promise<void> {
  await page.evaluate((value) => {
    const timeline = window.__pwCinematicIntroTimeline
    if (!timeline) throw new Error('Playwright cinematic timeline is absent')
    timeline.seek(value)
  }, progress)

  await page.evaluate(
    () =>
      new Promise<void>((resolvePaint) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolvePaint())
        })
      }),
  )
}

async function expectNoDocumentOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => ({
    document:
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }))
  expect(overflow.document).toBeLessThanOrEqual(1)
  expect(overflow.body).toBeLessThanOrEqual(1)
}

async function captureStoryboard(
  page: Page,
  viewport: { width: number; height: number },
): Promise<Buffer[]> {
  await page.setViewportSize(viewport)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await waitForCoordinatedTracks(page)

  const frames: Buffer[] = []
  for (const progress of PROGRESS_SAMPLES) {
    await seekIntro(page, progress)
    if (progress <= 0.7) {
      await expect(
        page.locator('[data-intro-copy="primary"]'),
      ).toHaveCSS('opacity', '0')
      await expect(
        page.locator('[data-intro-copy="secondary"]'),
      ).toHaveCSS('opacity', '0')
    }
    frames.push(
      await page.locator('#inicio').screenshot({
        animations: 'allow',
        type: 'png',
      }),
    )
  }
  return frames
}

async function composeContactSheet(
  context: BrowserContext,
  frames: Buffer[],
  outputPath: string,
  dimensions: {
    width: number
    height: number
    frameAspect: string
  },
): Promise<void> {
  const sheetPage = await context.newPage()
  await sheetPage.setViewportSize({
    width: dimensions.width,
    height: dimensions.height,
  })

  const figures = frames
    .map((frame, index) => {
      const label = `${Math.round(PROGRESS_SAMPLES[index] * 100)}%`
      const source = `data:image/png;base64,${frame.toString('base64')}`
      return `<figure><img src="${source}" alt="Keyframe ${label}"><figcaption>${label}</figcaption></figure>`
    })
    .join('')

  await sheetPage.setContent(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <style>
          * { box-sizing: border-box; }
          html, body { margin: 0; width: 100%; min-height: 100%; background: #24141f; }
          body { padding: 24px; font-family: ui-sans-serif, system-ui, sans-serif; }
          main { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; }
          figure { margin: 0; overflow: hidden; border: 1px solid rgba(255,243,223,.28); background: #35192a; }
          img { display: block; width: 100%; aspect-ratio: ${dimensions.frameAspect}; object-fit: contain; background: #35192a; }
          figcaption { padding: 9px 12px 11px; color: #fff3df; font-size: 16px; font-weight: 700; letter-spacing: .08em; text-align: center; }
        </style>
      </head>
      <body><main>${figures}</main></body>
    </html>
  `)
  await sheetPage.waitForFunction(() =>
    [...document.images].every((image) => image.complete),
  )
  await sheetPage.screenshot({
    path: outputPath,
    fullPage: true,
    type: 'png',
  })
  await sheetPage.close()
}

test('normal production preview exposes no Playwright timeline namespace', async ({
  page,
}) => {
  await page.goto('/')
  await expect
    .poll(() =>
      page.evaluate(() => typeof window.__pwCinematicIntroTimeline),
    )
    .toBe('undefined')
})

test('injected wrapper delegates non-intro and infinite animations unchanged', async ({
  page,
}) => {
  await installTimelineInstrumentation(page)
  await page.goto('/')
  await waitForCoordinatedTracks(page)

  const result = await page.evaluate(() => {
    const before = window.__pwCinematicIntroTimeline?.tracks() ?? []
    const ordinary = document.createElement('div')
    document.body.append(ordinary)
    const ordinaryAnimation = ordinary.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: 400 },
    )

    const infiniteOwner = document.createElement('div')
    infiniteOwner.dataset.introTrack = 'test-infinite'
    document.body.append(infiniteOwner)
    const infiniteAnimation = infiniteOwner.animate(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(2px)' }],
      { duration: 400, iterations: Number.POSITIVE_INFINITY },
    )
    const after = window.__pwCinematicIntroTimeline?.tracks() ?? []
    const ordinaryPlayState = ordinaryAnimation.playState
    const infinitePlayState = infiniteAnimation.playState

    ordinaryAnimation.cancel()
    infiniteAnimation.cancel()
    ordinary.remove()
    infiniteOwner.remove()

    return {
      before,
      after,
      ordinaryPlayState,
      infinitePlayState,
      infiniteRegistered: after.includes('test-infinite'),
    }
  })

  expect(result.after).toEqual(result.before)
  expect(result.infiniteRegistered).toBe(false)
  expect(result.ordinaryPlayState).toBe('running')
  expect(result.infinitePlayState).toBe('running')
})

test('storyboard tracks are finite, semantic and transform-opacity only', async ({
  page,
}) => {
  await installTimelineInstrumentation(page)
  await page.goto('/')
  await waitForCoordinatedTracks(page)

  const contract = await page.evaluate(
    () => window.__pwCinematicIntroTimeline?.contracts() ?? [],
  )
  expect(contract.length).toBeGreaterThanOrEqual(7)
  for (const track of contract) {
    expect(track.duration).toBe(INTRO_DURATION_MS)
    expect(track.iterations).toBe(1)
    for (const keyframe of track.keyframes) {
      const animatedProperties = Object.keys(keyframe).filter(
        (property) =>
          !['offset', 'computedOffset', 'easing', 'composite'].includes(
            property,
          ),
      )
      expect(animatedProperties.every(
        (property) => property === 'opacity' || property === 'transform',
      )).toBe(true)
    }
  }

  const sunContract = contract.find(({ track }) => track === 'sun-arc')
  expect(sunContract?.keyframes).toHaveLength(5)
  expect(String(sunContract?.keyframes[0]?.transform)).toMatch(
    /translate3d\([^,]+px,\s*-[^,]+px/,
  )
  expect(sunContract?.keyframes.at(-2)?.offset).toBe(0.82)
  expect(sunContract?.keyframes.at(-2)?.transform).toBe('none')

  for (const glowTrack of ['warm-horizon', 'haze']) {
    const glowContract = contract.find(({ track }) => track === glowTrack)
    expect(glowContract?.keyframes.map(({ offset }) => offset)).toEqual([
      0,
      0.83,
      0.88,
      1,
    ])
    expect(Number(glowContract?.keyframes[0]?.opacity)).toBe(0)
    expect(Number(glowContract?.keyframes[1]?.opacity)).toBe(0)
  }
})

test('copy groups unlock at their own visible onset without blocking chrome', async ({
  browserName,
  page,
}) => {
  await installTimelineInstrumentation(page)
  await page.goto('/')
  await waitForCoordinatedTracks(page)

  const primary = page.locator('[data-intro-copy="primary"]')
  const secondary = page.locator('[data-intro-copy="secondary"]')
  const cta = page
    .locator('#inicio')
    .getByRole('link', { name: 'Confirmar presença' })
  const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
  const wordmark = page.getByRole('link', {
    name: 'Sol faz 40 — voltar ao início',
  })

  await seekIntro(page, 0)
  await expect(primary).toHaveAttribute('inert', '')
  await expect(secondary).toHaveAttribute('inert', '')
  await expect(primary).toHaveCSS('opacity', '0')
  await expect(secondary).toHaveCSS('opacity', '0')
  expect(
    await cta.evaluate((element) => {
      ;(element as HTMLElement).focus()
      return document.activeElement === element
    }),
  ).toBe(false)
  await expect(page.locator('header')).not.toHaveAttribute('inert', '')
  await expect(wordmark).toBeEnabled()

  if (browserName === 'webkit') {
    await skip.focus()
  } else {
    await page.keyboard.press('Tab')
  }
  await expect(skip).toBeFocused()

  await seekIntro(page, 0.76)
  await expect(primary).not.toHaveAttribute('inert', '')
  await expect
    .poll(() =>
      primary.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).opacity),
      ),
    )
    .toBeGreaterThan(0)
  await expect(secondary).toHaveAttribute('inert', '')

  await seekIntro(page, 0.88)
  await expect(secondary).not.toHaveAttribute('inert', '')
  await expect
    .poll(() =>
      secondary.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).opacity),
      ),
    )
    .toBeGreaterThan(0)
  await cta.focus()
  await expect(cta).toBeFocused()
})

test('normal playback keeps invisible CTAs inert and unlocks hierarchy in order', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')

  const hero = page.locator('#inicio')
  const primary = hero.locator('[data-intro-copy="primary"]')
  const secondary = hero.locator('[data-intro-copy="secondary"]')
  const cta = hero.getByRole('link', { name: 'Confirmar presença' })

  await expect(hero).toHaveAttribute('data-intro-state', 'playing')
  await expect(primary).toHaveAttribute('inert', '')
  await expect(secondary).toHaveAttribute('inert', '')
  await expect(primary).toHaveCSS('opacity', '0')
  await expect(secondary).toHaveCSS('opacity', '0')
  expect(
    await cta.evaluate((element) => {
      ;(element as HTMLElement).focus()
      return document.activeElement === element
    }),
  ).toBe(false)
  await expect(page.locator('header')).not.toHaveAttribute('inert', '')

  const unlockOrder = await page.evaluate(() => {
    const primaryCopy = document.querySelector<HTMLElement>(
      '[data-intro-copy="primary"]',
    )
    const secondaryCopy = document.querySelector<HTMLElement>(
      '[data-intro-copy="secondary"]',
    )
    if (!primaryCopy || !secondaryCopy) {
      throw new Error('Semantic copy groups are absent')
    }

    return new Promise<Array<{ group: string; at: number }>>(
      (resolveOrder, rejectOrder) => {
        const startedAt = performance.now()
        const order: Array<{ group: string; at: number }> = []
        const record = (group: string, element: HTMLElement) => {
          if (
            !element.hasAttribute('inert') &&
            !order.some((entry) => entry.group === group)
          ) {
            order.push({ group, at: performance.now() - startedAt })
          }
          if (order.length === 2) {
            observer.disconnect()
            resolveOrder(order)
          }
        }
        const observer = new MutationObserver(() => {
          record('primary', primaryCopy)
          record('secondary', secondaryCopy)
        })
        observer.observe(primaryCopy, {
          attributes: true,
          attributeFilter: ['inert'],
        })
        observer.observe(secondaryCopy, {
          attributes: true,
          attributeFilter: ['inert'],
        })
        window.setTimeout(() => {
          observer.disconnect()
          rejectOrder(new Error('Copy groups did not unlock during playback'))
        }, 4_500)
      },
    )
  })

  expect(unlockOrder.map(({ group }) => group)).toEqual([
    'primary',
    'secondary',
  ])
  expect(unlockOrder[1].at - unlockOrder[0].at).toBeGreaterThan(200)
  await expect(hero).toHaveAttribute('data-intro-state', 'complete')
  await expect(primary).not.toHaveAttribute('inert', '')
  await expect(secondary).not.toHaveAttribute('inert', '')
  await expect
    .poll(() =>
      secondary.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).opacity),
      ),
    )
    .toBe(1)
  await cta.focus()
  await expect(cta).toBeFocused()
})

test('reduced motion and direct fragments expose the final operable hero immediately', async ({
  page,
}) => {
  await installTimelineInstrumentation(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')

  const primary = page.locator('[data-intro-copy="primary"]')
  const secondary = page.locator('[data-intro-copy="secondary"]')
  await expect(page.locator('#inicio')).toHaveAttribute(
    'data-intro-state',
    'complete',
  )
  await expect(primary).not.toHaveAttribute('inert', '')
  await expect(secondary).not.toHaveAttribute('inert', '')
  await expect(primary).toHaveCSS('opacity', '1')
  await expect(secondary).toHaveCSS('opacity', '1')
  expect(
    await page.evaluate(
      () => window.__pwCinematicIntroTimeline?.tracks().length ?? -1,
    ),
  ).toBe(0)

  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/#programacao')
  await expect(page.locator('#inicio')).toHaveAttribute(
    'data-intro-state',
    'complete',
  )
  await expect(primary).not.toHaveAttribute('inert', '')
  await expect(secondary).not.toHaveAttribute('inert', '')
  expect(
    await page.evaluate(
      () => window.__pwCinematicIntroTimeline?.tracks().length ?? -1,
    ),
  ).toBe(0)
})

test('a WAAPI setup failure fails open without an uncaught page error', async ({
  page,
}) => {
  const pageErrors: Error[] = []
  page.on('pageerror', (error) => pageErrors.push(error))
  await page.addInitScript(() => {
    const originalAnimate = Element.prototype.animate
    Element.prototype.animate = function (
      keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
      options?: number | KeyframeAnimationOptions,
    ) {
      if ((this as HTMLElement).dataset.introTrack) {
        throw new Error('forced cinematic WAAPI failure')
      }
      return originalAnimate.call(this, keyframes, options)
    }
  })
  await page.goto('/')

  await expect(page.locator('#inicio')).toHaveAttribute(
    'data-intro-state',
    'complete',
  )
  await expect(
    page.locator('[data-intro-copy="primary"]'),
  ).not.toHaveAttribute('inert', '')
  await expect(
    page.locator('[data-intro-copy="secondary"]'),
  ).not.toHaveAttribute('inert', '')
  await expect(
    page
      .locator('#inicio')
      .getByRole('link', { name: 'Confirmar presença' }),
  ).toBeEnabled()
  expect(pageErrors).toEqual([])
})

test('generates deterministic desktop and mobile cinematic contact sheets', async ({
  context,
  page,
}) => {
  await mkdir(ARTIFACT_DIR, { recursive: true })
  await installTimelineInstrumentation(page)

  const desktopFrames = await captureStoryboard(page, {
    width: 1280,
    height: 800,
  })
  const mobileFrames = await captureStoryboard(page, {
    width: 320,
    height: 760,
  })

  expect(desktopFrames).toHaveLength(5)
  expect(mobileFrames).toHaveLength(5)

  await composeContactSheet(
    context,
    desktopFrames,
    resolve(ARTIFACT_DIR, 'intro-keyframes-desktop.png'),
    { width: 2600, height: 390, frameAspect: '1280 / 800' },
  )
  await composeContactSheet(
    context,
    mobileFrames,
    resolve(ARTIFACT_DIR, 'intro-keyframes-mobile.png'),
    { width: 1700, height: 830, frameAspect: '320 / 760' },
  )

  await seekIntro(page, 0)
  await expect(page.locator('[data-intro-layer="sky-base"]')).toBeVisible()
  await expect(page.locator('[data-intro-layer="horizon-depth"]')).toBeVisible()
  await expect(page.locator('[data-intro-layer="sea"]')).toBeVisible()
  for (const removedLayer of [
    'cloud-far',
    'cloud-near',
    'reflection',
    'wave-light',
    'palm-left',
    'palm-right',
  ]) {
    await expect(
      page.locator(`[data-intro-layer="${removedLayer}"]`),
    ).toHaveCount(0)
  }
  await expect(page.locator('[data-intro-sun]')).toHaveCount(1)
  await expect(page.locator('[data-intro-scene]')).toHaveCSS(
    'pointer-events',
    'none',
  )
  await expectNoDocumentOverflow(page)

  const warmHorizon = page.locator('[data-intro-layer="warm-horizon"]')
  const haze = page.locator('[data-intro-layer="haze-horizon"]')
  for (const preArrivalProgress of [0, 0.4, 0.7]) {
    await seekIntro(page, preArrivalProgress)
    await expect(warmHorizon).toHaveCSS('opacity', '0')
    await expect(haze).toHaveCSS('opacity', '0')
  }

  await seekIntro(page, 0.82)
  await expect(warmHorizon).toHaveCSS('opacity', '0')
  await expect(haze).toHaveCSS('opacity', '0')

  const settledGeometry = await page.evaluate(() => {
    const target = document.querySelector<HTMLElement>(
      '[data-intro-sun-target]',
    )
    const sun = document.querySelector<HTMLElement>('[data-intro-sun]')
    if (!target || !sun) throw new Error('Canonical sun geometry is absent')
    const targetRect = target.getBoundingClientRect()
    const sunRect = sun.getBoundingClientRect()
    return {
      centerDeltaX: Math.abs(
        targetRect.left + targetRect.width / 2 -
          (sunRect.left + sunRect.width / 2),
      ),
      centerDeltaY: Math.abs(
        targetRect.top + targetRect.height / 2 -
          (sunRect.top + sunRect.height / 2),
      ),
      sizeDelta: Math.abs(targetRect.width - sunRect.width),
    }
  })
  expect(settledGeometry.centerDeltaX).toBeLessThanOrEqual(1)
  expect(settledGeometry.centerDeltaY).toBeLessThanOrEqual(1)
  expect(settledGeometry.sizeDelta).toBeLessThanOrEqual(1)

  await seekIntro(page, 0.88)
  await expect
    .poll(() =>
      warmHorizon.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).opacity),
      ),
    )
    .toBeGreaterThan(0)
  await expect
    .poll(() =>
      haze.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).opacity),
      ),
    )
    .toBeGreaterThan(0)

  await seekIntro(page, 1)
  const geometry = await page.evaluate(() => {
    const target = document.querySelector<HTMLElement>(
      '[data-intro-sun-target]',
    )
    const sun = document.querySelector<HTMLElement>('[data-intro-sun]')
    if (!target || !sun) throw new Error('Canonical sun geometry is absent')
    const targetRect = target.getBoundingClientRect()
    const sunRect = sun.getBoundingClientRect()
    return {
      centerDeltaX: Math.abs(
        targetRect.left + targetRect.width / 2 -
          (sunRect.left + sunRect.width / 2),
      ),
      centerDeltaY: Math.abs(
        targetRect.top + targetRect.height / 2 -
          (sunRect.top + sunRect.height / 2),
      ),
      sizeDelta: Math.abs(targetRect.width - sunRect.width),
    }
  })
  expect(geometry.centerDeltaX).toBeLessThanOrEqual(1)
  expect(geometry.centerDeltaY).toBeLessThanOrEqual(1)
  expect(geometry.sizeDelta).toBeLessThanOrEqual(1)
})
