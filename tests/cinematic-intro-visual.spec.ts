import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  expect,
  test,
  type BrowserContext,
  type Page,
} from '@playwright/test'
import sharp from 'sharp'

const SUN_ARRIVAL_MS = 3000
const POST_ARRIVAL_MS = 700
const INTRO_DURATION_MS = SUN_ARRIVAL_MS + POST_ARRIVAL_MS
const GLOW_ONSET_MS = 3060
const PRIMARY_COPY_ONSET_MS = 3100
const SECONDARY_COPY_ONSET_MS = 3400
const CTA_ONSET_MS = 3460
const APPROVED_TIMELINE_SAMPLES = [
  { label: '0% · 0ms', progress: 0, timeMs: 0 },
  {
    label: `70% · ${Math.round(INTRO_DURATION_MS * 0.7)}ms`,
    progress: 0.7,
    timeMs: Math.round(INTRO_DURATION_MS * 0.7),
  },
  {
    label: `100% · ${INTRO_DURATION_MS}ms`,
    progress: 1,
    timeMs: INTRO_DURATION_MS,
  },
] as const
const APPROVED_SNAPSHOT_DIR = resolve(
  process.cwd(),
  'tests/cinematic-intro.snapshots',
)
const UPDATE_APPROVED_BASELINES =
  process.env.UPDATE_CINEMATIC_INTRO_BASELINES === '1'

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
      seek: (progress: number) => Promise<void>
      seekAtMs: (currentTimeMs: number) => Promise<void>
    }
  }
}

async function installTimelineInstrumentation(page: Page): Promise<void> {
  await page.addInitScript(({ duration }) => {
    const originalAnimate = Element.prototype.animate
    const handles = new Map<string, Animation>()
    const duplicateTracks: string[] = []
    const seekAtMs = async (currentTimeMs: number) => {
      const timelineTime = Math.min(
        duration,
        Math.max(0, currentTimeMs),
      )
      for (const animation of handles.values()) {
        animation.pause()
      }
      await Promise.all(
        [...handles.values()].map((animation) =>
          animation.ready.catch(() => animation),
        ),
      )
      for (const animation of handles.values()) {
        const timing = animation.effect?.getTiming()
        const trackDuration =
          typeof timing?.duration === 'number'
            ? timing.duration
            : duration
        animation.currentTime = Math.min(timelineTime, trackDuration)
      }
    }

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
      seek: async (progress) => {
        const clamped = Math.min(1, Math.max(0, progress))
        await seekAtMs(clamped * duration)
      },
      seekAtMs,
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
      animation.currentTime = 0
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
    return timeline.seek(value)
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

async function seekIntroAtMs(
  page: Page,
  currentTimeMs: number,
): Promise<void> {
  await page.evaluate((value) => {
    const timeline = window.__pwCinematicIntroTimeline
    if (!timeline) throw new Error('Playwright cinematic timeline is absent')
    return timeline.seekAtMs(value)
  }, currentTimeMs)

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
  await page.evaluate(() => document.fonts.ready)
  await page.addStyleTag({
    content: '.wave-band { animation: none !important; }',
  })
  await page.evaluate(
    () =>
      new Promise<void>((resolvePaint) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolvePaint()))
      }),
  )

  const frames: Buffer[] = []
  for (const sample of APPROVED_TIMELINE_SAMPLES) {
    await seekIntroAtMs(page, sample.timeMs)
    if (sample.progress <= 0.7) {
      for (const group of ['primary', 'secondary', 'cta']) {
        const copy = page.locator(`[data-intro-copy="${group}"]`)
        await expect(copy).toHaveCSS('opacity', '0')
        await expect(copy).toHaveCSS('clip-path', 'none')
      }
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
  dimensions: {
    width: number
    height: number
    frameAspect: string
  },
): Promise<Buffer> {
  const sheetPage = await context.newPage()
  await sheetPage.setViewportSize({
    width: dimensions.width,
    height: dimensions.height,
  })

  const figures = frames
    .map((frame, index) => {
      const label = APPROVED_TIMELINE_SAMPLES[index].label
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
          main { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
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
  const contactSheet = await sheetPage.screenshot({
    fullPage: true,
    type: 'png',
  })
  await sheetPage.close()
  return contactSheet
}

async function expectApprovedBaseline(
  actual: Buffer,
  fileName: 'intro-approved-desktop.png' | 'intro-approved-mobile.png',
): Promise<void> {
  const baselinePath = resolve(APPROVED_SNAPSHOT_DIR, fileName)
  if (UPDATE_APPROVED_BASELINES) {
    await mkdir(APPROVED_SNAPSHOT_DIR, { recursive: true })
    await writeFile(baselinePath, actual)
  }

  const approved = await readFile(baselinePath)
  const [actualPixels, approvedPixels] = await Promise.all(
    [actual, approved].map((png) =>
      sharp(png)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true }),
    ),
  )
  expect(actualPixels.info).toMatchObject({
    width: approvedPixels.info.width,
    height: approvedPixels.info.height,
    channels: approvedPixels.info.channels,
  })

  let materiallyDifferentPixels = 0
  const channels = actualPixels.info.channels
  for (
    let index = 0;
    index < actualPixels.data.length;
    index += channels
  ) {
    let maximumChannelDelta = 0
    for (let channel = 0; channel < channels; channel += 1) {
      maximumChannelDelta = Math.max(
        maximumChannelDelta,
        Math.abs(
          actualPixels.data[index + channel]
            - approvedPixels.data[index + channel],
        ),
      )
    }
    if (maximumChannelDelta > 16) materiallyDifferentPixels += 1
  }
  const pixelCount = actualPixels.info.width * actualPixels.info.height
  const differentPixelRatio = materiallyDifferentPixels / pixelCount
  expect(
    differentPixelRatio,
    `${fileName} divergiu em ${materiallyDifferentPixels}/${pixelCount} pixels materiais`,
  ).toBeLessThanOrEqual(0.002)
}

test('normal production preview exposes no test namespace', async ({
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
    expect(track.duration).toBe(
      track.track === 'sun-arc'
        ? SUN_ARRIVAL_MS
        : INTRO_DURATION_MS,
    )
    expect(track.iterations).toBe(1)
    for (const keyframe of track.keyframes) {
      const animatedProperties = Object.keys(keyframe).filter(
        (property) =>
          !['offset', 'computedOffset', 'easing', 'composite'].includes(
            property,
          ),
      )
      const allowedProperties = track.track.startsWith('copy-')
        ? ['opacity']
        : ['opacity', 'transform']
      expect(
        animatedProperties.every((property) =>
          allowedProperties.includes(property),
        ),
      ).toBe(true)
    }
  }

  const sunContract = contract.find(({ track }) => track === 'sun-arc')
  expect(sunContract?.keyframes.length).toBeGreaterThan(20)
  expect(String(sunContract?.keyframes[0]?.transform)).toMatch(
    /translate3d\([^,]+px,\s*-[^,]+px/,
  )
  expect(sunContract?.keyframes.at(-1)?.offset).toBe(1)
  expect(sunContract?.keyframes.at(-1)?.transform).toBe('none')
  expect(
    sunContract?.keyframes.slice(0, -1).every(
      ({ transform, easing }) =>
        transform !== 'none' && easing === 'linear',
    ),
  ).toBe(true)

  for (const glowTrack of ['warm-horizon', 'haze']) {
    const glowContract = contract.find(({ track }) => track === glowTrack)
    expect(glowContract?.keyframes.map(({ offset }) => offset)).toEqual([
      0,
      GLOW_ONSET_MS / INTRO_DURATION_MS,
      SECONDARY_COPY_ONSET_MS / INTRO_DURATION_MS,
      1,
    ])
    expect(Number(glowContract?.keyframes[0]?.opacity)).toBe(0)
    expect(Number(glowContract?.keyframes[1]?.opacity)).toBe(0)
    expect(
      Number(glowContract?.keyframes[1]?.offset) * INTRO_DURATION_MS,
    ).toBeGreaterThan(SUN_ARRIVAL_MS)
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
  const ctaGroup = page.locator('[data-intro-copy="cta"]')
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
  await expect(ctaGroup).toHaveAttribute('inert', '')
  await expect(primary).toHaveCSS('opacity', '0')
  await expect(secondary).toHaveCSS('opacity', '0')
  await expect(ctaGroup).toHaveCSS('opacity', '0')
  await expect(primary).toHaveCSS('clip-path', 'none')
  await expect(secondary).toHaveCSS('clip-path', 'none')
  await expect(ctaGroup).toHaveCSS('clip-path', 'none')
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

  await seekIntroAtMs(page, PRIMARY_COPY_ONSET_MS)
  await expect(primary).not.toHaveAttribute('inert', '')
  await expect
    .poll(() =>
      primary.evaluate((element) =>
        Number(getComputedStyle(element).opacity),
      ),
    )
    .toBeGreaterThan(0)
  await expect
    .poll(() =>
      primary.evaluate((element) =>
        Number(getComputedStyle(element).opacity),
      ),
    )
    .toBeLessThan(1)
  await expect(secondary).toHaveAttribute('inert', '')
  await expect(ctaGroup).toHaveAttribute('inert', '')

  await seekIntroAtMs(page, PRIMARY_COPY_ONSET_MS + 250)
  const primaryMidFadeOpacity = await primary.evaluate((element) =>
    Number(getComputedStyle(element).opacity),
  )
  expect(primaryMidFadeOpacity).toBeGreaterThan(0.5)
  expect(primaryMidFadeOpacity).toBeLessThan(1)
  await expect(secondary).toHaveAttribute('inert', '')

  await seekIntroAtMs(page, SECONDARY_COPY_ONSET_MS)
  await expect(secondary).not.toHaveAttribute('inert', '')
  await expect
    .poll(() =>
      secondary.evaluate((element) =>
        Number(getComputedStyle(element).opacity),
      ),
    )
    .toBeGreaterThan(0)
  await expect
    .poll(() =>
      secondary.evaluate((element) =>
        Number(getComputedStyle(element).opacity),
      ),
    )
    .toBeLessThan(1)
  await expect(ctaGroup).toHaveAttribute('inert', '')
  await seekIntroAtMs(page, CTA_ONSET_MS)
  await expect(ctaGroup).not.toHaveAttribute('inert', '')
  await expect
    .poll(() =>
      ctaGroup.evaluate((element) =>
        Number(getComputedStyle(element).opacity),
      ),
    )
    .toBeGreaterThan(0)
  await expect
    .poll(() =>
      ctaGroup.evaluate((element) =>
        Number(getComputedStyle(element).opacity),
      ),
    )
    .toBeLessThan(1)
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
  const ctaGroup = hero.locator('[data-intro-copy="cta"]')
  const cta = hero.getByRole('link', { name: 'Confirmar presença' })

  await expect(hero).toHaveAttribute('data-intro-state', 'playing')
  await expect(primary).toHaveAttribute('inert', '')
  await expect(secondary).toHaveAttribute('inert', '')
  await expect(ctaGroup).toHaveAttribute('inert', '')
  await expect(primary).toHaveCSS('opacity', '0')
  await expect(secondary).toHaveCSS('opacity', '0')
  await expect(ctaGroup).toHaveCSS('opacity', '0')
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
        }, 5_500)
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
  await expect(ctaGroup).not.toHaveAttribute('inert', '')
  await expect(secondary).toHaveCSS('opacity', '1')
  await expect(ctaGroup).toHaveCSS('opacity', '1')
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
  const ctaGroup = page.locator('[data-intro-copy="cta"]')
  await expect(page.locator('#inicio')).toHaveAttribute(
    'data-intro-state',
    'complete',
  )
  await expect(primary).not.toHaveAttribute('inert', '')
  await expect(secondary).not.toHaveAttribute('inert', '')
  await expect(ctaGroup).not.toHaveAttribute('inert', '')
  await expect(primary).toHaveCSS('opacity', '1')
  await expect(secondary).toHaveCSS('opacity', '1')
  await expect(ctaGroup).toHaveCSS('opacity', '1')
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
  await expect(ctaGroup).not.toHaveAttribute('inert', '')
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

test('desktop approved baseline contains the absolute 0/70/100 timeline frames', async ({
  context,
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'emulated-chromium-desktop',
    'Pixel baseline is intentionally confined to stable Chromium.',
  )
  await installTimelineInstrumentation(page)

  const desktopFrames = await captureStoryboard(page, {
    width: 1280,
    height: 800,
  })
  expect(desktopFrames).toHaveLength(APPROVED_TIMELINE_SAMPLES.length)
  const desktopContactSheet = await composeContactSheet(
    context,
    desktopFrames,
    { width: 1580, height: 390, frameAspect: '1280 / 800' },
  )
  await expectApprovedBaseline(
    desktopContactSheet,
    'intro-approved-desktop.png',
  )
})

test('mobile approved baseline contains the absolute 0/70/100 timeline frames', async ({
  context,
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'emulated-chromium-desktop',
    'Pixel baseline is intentionally confined to stable Chromium.',
  )
  await installTimelineInstrumentation(page)

  const mobileFrames = await captureStoryboard(page, {
    width: 320,
    height: 760,
  })
  expect(mobileFrames).toHaveLength(APPROVED_TIMELINE_SAMPLES.length)
  const mobileContactSheet = await composeContactSheet(
    context,
    mobileFrames,
    { width: 1040, height: 830, frameAspect: '320 / 760' },
  )
  await expectApprovedBaseline(
    mobileContactSheet,
    'intro-approved-mobile.png',
  )
})

test('approved direction keeps removed layers absent and glow post-arrival', async ({
  page,
}) => {
  await installTimelineInstrumentation(page)
  await page.goto('/')
  await waitForCoordinatedTracks(page)
  await seekIntro(page, 0)
  await expect(page.locator('[data-intro-layer="sky-base"]')).toBeVisible()
  await expect(page.locator('[data-intro-layer="horizon-depth"]')).toBeVisible()
  await expect(page.locator('[data-intro-layer="sea"]')).toBeVisible()
  expect(
    await page.locator('[data-intro-layer]').evaluateAll((layers) =>
      layers
        .map((layer) => (layer as HTMLElement).dataset.introLayer ?? '')
        .filter(Boolean)
        .sort(),
    ),
  ).toEqual([
    'camera',
    'cool-veil',
    'haze-horizon',
    'horizon-depth',
    'sea',
    'sky-base',
    'texture',
    'warm-horizon',
  ])
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
  for (const preArrivalMs of [
    0,
    1200,
    2100,
    SUN_ARRIVAL_MS - 1,
    SUN_ARRIVAL_MS,
  ]) {
    await seekIntroAtMs(page, preArrivalMs)
    await expect(warmHorizon).toHaveCSS('opacity', '0')
    await expect(haze).toHaveCSS('opacity', '0')
  }

  await seekIntroAtMs(page, SUN_ARRIVAL_MS)
  await expect(warmHorizon).toHaveCSS('opacity', '0')
  await expect(haze).toHaveCSS('opacity', '0')
  await seekIntroAtMs(page, GLOW_ONSET_MS)
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

  await seekIntroAtMs(page, GLOW_ONSET_MS + 1)
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

  const ctaGroup = page.locator('[data-intro-copy="cta"]')
  const readCtaColors = () =>
    page.evaluate(() => {
      const group = document.querySelector<HTMLElement>(
        '[data-intro-copy="cta"]',
      )
      if (!group) throw new Error('Semantic CTA reveal group is absent')
      const groupStyle = getComputedStyle(group)
      return {
        clipPath: groupStyle.clipPath,
        transform: groupStyle.transform,
        opacity: Number.parseFloat(groupStyle.opacity),
        parentOpacities: (() => {
          const opacities: number[] = []
          let ancestor: HTMLElement | null = group.parentElement
          while (ancestor) {
            opacities.push(
              Number.parseFloat(getComputedStyle(ancestor).opacity),
            )
            if (ancestor.id === 'inicio') break
            ancestor = ancestor.parentElement
          }
          return opacities
        })(),
        surfaces: [...group.querySelectorAll<HTMLElement>('a')].map(
          (button) => {
            const style = getComputedStyle(button)
            return {
              backgroundColor: style.backgroundColor,
              borderColor: style.borderTopColor,
              borderStyle: style.borderTopStyle,
              borderWidth: style.borderTopWidth,
              color: style.color,
              filter: style.filter,
            }
          },
        ),
      }
    })
  await seekIntroAtMs(page, CTA_ONSET_MS + 120)
  await expect(ctaGroup).not.toHaveAttribute('inert', '')
  const intermediateCta = await readCtaColors()
  expect(
    intermediateCta.parentOpacities.every((opacity) => opacity === 1),
  ).toBe(true)
  expect(intermediateCta.opacity).toBeGreaterThan(0)
  expect(intermediateCta.opacity).toBeLessThan(1)
  expect(intermediateCta.clipPath).toBe('none')
  expect(intermediateCta.transform).toBe('none')

  await seekIntroAtMs(page, INTRO_DURATION_MS - 1)
  await expect(page.locator('#inicio')).toHaveAttribute(
    'data-intro-state',
    'playing',
  )
  const almostFinalCta = await readCtaColors()
  expect(
    almostFinalCta.parentOpacities.every((opacity) => opacity === 1),
  ).toBe(true)
  expect(almostFinalCta.opacity).toBeGreaterThan(0.95)
  expect(almostFinalCta.opacity).toBeLessThanOrEqual(1)
  expect(almostFinalCta.clipPath).toBe('none')
  expect(almostFinalCta.transform).toBe('none')

  await seekIntroAtMs(page, INTRO_DURATION_MS)
  await expect(page.locator('#inicio')).toHaveAttribute(
    'data-intro-state',
    'complete',
  )
  const finalCta = await readCtaColors()
  expect(intermediateCta.surfaces).toEqual(finalCta.surfaces)
  expect(almostFinalCta.surfaces).toEqual(finalCta.surfaces)
  expect(finalCta.opacity).toBe(1)
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
