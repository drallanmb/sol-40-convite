import { expect, test, type Page } from '@playwright/test'

const INTRO_DURATION_MS = 3000
const ART_TRACKS = [
  'camera',
  'cool-veil',
  'copy-primary',
  'copy-secondary',
  'haze',
  'sun-arc',
  'warm-horizon',
] as const

type IntroProbeRecord = {
  animation: Animation
  node: Element
  track: string
}

type DOMRectShape = {
  x: number
  y: number
  width: number
  height: number
  top: number
  right: number
  bottom: number
  left: number
}

declare global {
  interface Window {
    __pwCinematicIntroProbe?: {
      records: IntroProbeRecord[]
      seek: (progress: number) => void
      pause: () => void
    }
  }
}

async function installIntroProbe(
  page: Page,
  pauseOnCreate = true,
): Promise<void> {
  await page.addInitScript(
    ({ duration, shouldPause }) => {
      const originalAnimate = Element.prototype.animate
      const records: IntroProbeRecord[] = []

      window.__pwCinematicIntroProbe = {
        records,
        seek: (progress) => {
          const clamped = Math.min(1, Math.max(0, progress))
          for (const record of records) {
            if (record.track === 'retarget') continue
            record.animation.pause()
            record.animation.currentTime = clamped * duration
          }
        },
        pause: () => {
          for (const record of records) record.animation.pause()
        },
      }

      Element.prototype.animate = function (
        keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
        options?: number | KeyframeAnimationOptions,
      ) {
        const animation = originalAnimate.call(this, keyframes, options)
        const owner = this as HTMLElement
        const track = owner.dataset.introTrack
          ?? (owner.hasAttribute('data-intro-sun-retarget')
            ? 'retarget'
            : null)
        if (!track) return animation

        const timing = (animation.effect as KeyframeEffect | null)?.getTiming()
        const finite =
          typeof timing?.duration === 'number'
          && Number.isFinite(timing.duration)
          && typeof timing.iterations === 'number'
          && Number.isFinite(timing.iterations)
        if (!finite) return animation

        records.push({ animation, node: this, track })
        if (shouldPause && track !== 'retarget') animation.pause()
        return animation
      }
    },
    { duration: INTRO_DURATION_MS, shouldPause: pauseOnCreate },
  )
}

async function waitForArtTracks(page: Page): Promise<void> {
  await page.waitForFunction(
    (expectedTracks) => {
      const records = window.__pwCinematicIntroProbe?.records ?? []
      const tracks = records
        .filter(({ track }) => track !== 'retarget')
        .map(({ track }) => track)
        .sort()
      return (
        tracks.length === expectedTracks.length
        && tracks.every((track, index) => track === expectedTracks[index])
      )
    },
    [...ART_TRACKS].sort(),
  )
}

async function seekIntro(page: Page, progress: number): Promise<void> {
  await page.evaluate((value) => {
    const probe = window.__pwCinematicIntroProbe
    if (!probe) throw new Error('Playwright intro probe is unavailable')
    probe.seek(value)
  }, progress)
  await waitForPaint(page)
}

async function waitForPaint(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      }),
  )
}

async function readSunGeometry(
  page: Page,
): Promise<{ target: DOMRectShape; visual: DOMRectShape }> {
  return page.evaluate(() => {
    const target = document.querySelector<HTMLElement>(
      '[data-intro-sun-target]',
    )
    const visual = document.querySelector<HTMLElement>('[data-intro-sun]')
    if (!target || !visual) {
      throw new Error('Canonical sun target and visual must both exist')
    }

    return {
      target: target.getBoundingClientRect().toJSON(),
      visual: visual.getBoundingClientRect().toJSON(),
    }
  })
}

async function expectSunGeometryAligned(page: Page): Promise<void> {
  const { target, visual } = await readSunGeometry(page)
  const targetCenterX = target.left + target.width / 2
  const targetCenterY = target.top + target.height / 2
  const visualCenterX = visual.left + visual.width / 2
  const visualCenterY = visual.top + visual.height / 2

  expect(Math.abs(visualCenterX - targetCenterX)).toBeLessThanOrEqual(1)
  expect(Math.abs(visualCenterY - targetCenterY)).toBeLessThanOrEqual(1)
  expect(Math.abs(visual.width - target.width)).toBeLessThanOrEqual(1)
  expect(Math.abs(visual.height - target.height)).toBeLessThanOrEqual(1)
}

async function expectNoDocumentOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => ({
    document:
      document.documentElement.scrollWidth
      - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }))
  expect(overflow.document).toBeLessThanOrEqual(1)
  expect(overflow.body).toBeLessThanOrEqual(1)
}

async function expectFinalUiOpen(page: Page): Promise<void> {
  const hero = page.locator('#inicio')
  const primary = hero.locator('[data-intro-copy="primary"]')
  const secondary = hero.locator('[data-intro-copy="secondary"]')
  const cta = hero.getByRole('link', { name: 'Confirmar presença' })

  await expect(hero).toHaveAttribute('data-intro-state', 'complete')
  await expect(page.locator('header')).toBeVisible()
  await expect(primary).not.toHaveAttribute('inert', '')
  await expect(secondary).not.toHaveAttribute('inert', '')
  await expect(cta).toBeVisible()
  await expect(cta).toBeEnabled()
}

async function expectSkipStillWorks(page: Page): Promise<void> {
  const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
  await skip.focus()
  await expect(skip).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#conteudo')).toBeFocused()
}

test('continuous scene shares one 3000ms clock and preserves the approved restraint', async ({
  page,
}) => {
  await installIntroProbe(page)
  await page.goto('/')
  await waitForArtTracks(page)
  await seekIntro(page, 0)

  const hero = page.locator('#inicio')
  await expect(hero).toHaveAttribute('data-intro-state', 'playing')
  await expect(hero.locator('[data-intro-layer="sky-base"]')).toBeVisible()
  await expect(
    hero.locator('[data-intro-layer="horizon-depth"]'),
  ).toBeVisible()
  await expect(hero.locator('[data-intro-layer="sea"]')).toBeVisible()
  await expect(hero.locator('.wave-band')).toHaveCount(3)
  await expect(
    hero.locator(
      '[data-intro-layer="cloud-far"], '
      + '[data-intro-layer="cloud-near"], '
      + '[data-intro-layer="reflection"], '
      + '[data-intro-layer="palms"]',
    ),
  ).toHaveCount(0)
  await expect(hero.locator('[data-intro-scene]')).toHaveCSS(
    'pointer-events',
    'none',
  )
  await expectNoDocumentOverflow(page)

  const contracts = await page.evaluate(() =>
    (window.__pwCinematicIntroProbe?.records ?? [])
      .filter(({ track }) => track !== 'retarget')
      .map(({ animation, track }) => {
        const effect = animation.effect as KeyframeEffect | null
        const timing = effect?.getTiming()
        return {
          track,
          duration: timing?.duration,
          iterations: timing?.iterations,
          keyframes: effect?.getKeyframes() ?? [],
        }
      }),
  )

  expect(contracts.map(({ track }) => track).sort()).toEqual(
    [...ART_TRACKS].sort(),
  )
  for (const contract of contracts) {
    expect(contract.duration).toBe(INTRO_DURATION_MS)
    expect(contract.iterations).toBe(1)
    for (const keyframe of contract.keyframes) {
      expect(keyframe).not.toHaveProperty('left')
      expect(keyframe).not.toHaveProperty('top')
      expect(keyframe).not.toHaveProperty('width')
      expect(keyframe).not.toHaveProperty('height')
      expect(keyframe).not.toHaveProperty('filter')
    }
  }

  const sun = contracts.find(({ track }) => track === 'sun-arc')
  const warmHorizon = contracts.find(
    ({ track }) => track === 'warm-horizon',
  )
  const haze = contracts.find(({ track }) => track === 'haze')
  const primary = contracts.find(({ track }) => track === 'copy-primary')
  const secondary = contracts.find(({ track }) => track === 'copy-secondary')
  const firstSunTransform = String(sun?.keyframes[0]?.transform ?? '')
  const coordinates = firstSunTransform.match(
    /translate3d\(([-\d.]+)px,\s*([-\d.]+)px/,
  )

  expect(coordinates).not.toBeNull()
  expect(Number(coordinates?.[1])).not.toBe(0)
  expect(Number(coordinates?.[2])).not.toBe(0)
  expect(
    sun?.keyframes.some(
      ({ offset, transform }) => offset === 0.82 && transform === 'none',
    ),
  ).toBe(true)
  for (const lightTrack of [warmHorizon, haze]) {
    const throughOnset = lightTrack?.keyframes.filter(
      ({ offset }) => Number(offset) <= 0.83,
    )
    expect(throughOnset?.length).toBeGreaterThan(1)
    expect(throughOnset?.every(({ opacity }) => Number(opacity) === 0)).toBe(
      true,
    )
    expect(
      lightTrack?.keyframes.some(
        ({ offset, opacity }) =>
          Number(offset) > 0.83 && Number(opacity) > 0,
      ),
    ).toBe(true)
  }

  const firstVisibleOffset = (keyframes: ComputedKeyframe[]) =>
    Number(
      keyframes.find(({ opacity }) => Number(opacity) > 0)?.offset
      ?? Number.NaN,
    )
  const primaryOnset = firstVisibleOffset(primary?.keyframes ?? [])
  const secondaryOnset = firstVisibleOffset(secondary?.keyframes ?? [])
  expect(primaryOnset).toBeLessThan(secondaryOnset)
  expect((1 - primaryOnset) * INTRO_DURATION_MS).toBeGreaterThanOrEqual(500)
  expect((1 - primaryOnset) * INTRO_DURATION_MS).toBeLessThanOrEqual(700)
})

test('arc geometry keeps one canonical sun and finishes on the real responsive target', async ({
  page,
}) => {
  await installIntroProbe(page)

  for (const viewport of [
    { width: 320, height: 760 },
    { width: 1280, height: 800 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await waitForArtTracks(page)
    await seekIntro(page, 0)

    const start = await readSunGeometry(page)
    const identity = await page.evaluate(() => {
      const sun = document.querySelector('[data-intro-sun]')
      const records = window.__pwCinematicIntroProbe?.records ?? []
      const sunRecords = records.filter(({ track }) => track === 'sun-arc')
      return {
        sunCount: document.querySelectorAll('[data-intro-sun]').length,
        recordCount: sunRecords.length,
        sameNode: sunRecords[0]?.node === sun,
      }
    })
    expect(identity).toEqual({
      sunCount: 1,
      recordCount: 1,
      sameNode: true,
    })
    expect(
      Math.abs(start.visual.left - start.target.left),
    ).toBeGreaterThan(20)
    expect(
      Math.abs(start.visual.top - start.target.top),
    ).toBeGreaterThan(20)

    await seekIntro(page, 1)
    await expectSunGeometryAligned(page)
    await expectNoDocumentOverflow(page)
  }
})

test('resize at 40% preserves progress and generation through a bounded retarget', async ({
  page,
}) => {
  await installIntroProbe(page)
  await page.setViewportSize({ width: 320, height: 760 })
  await page.goto('/')
  await waitForArtTracks(page)
  await seekIntro(page, 0.4)

  const before = await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>('#inicio')
    const sun = document.querySelector<HTMLElement>('[data-intro-sun]')
    const master = window.__pwCinematicIntroProbe?.records.find(
      ({ track }) => track === 'sun-arc',
    )?.animation
    return {
      generation: root?.dataset.introGeneration,
      progress: Number(master?.currentTime ?? 0) / 3000,
      rect: sun?.getBoundingClientRect().toJSON(),
    }
  })

  await page.setViewportSize({ width: 768, height: 1024 })
  await page.waitForFunction(
    () =>
      (window.__pwCinematicIntroProbe?.records ?? []).some(
        ({ track }) => track === 'retarget',
      ),
    undefined,
    { timeout: 1000 },
  )
  await page.evaluate(() => window.__pwCinematicIntroProbe?.pause())

  const after = await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>('#inicio')
    const sun = document.querySelector<HTMLElement>('[data-intro-sun]')
    const records = window.__pwCinematicIntroProbe?.records ?? []
    const master = records.find(
      ({ track }) => track === 'sun-arc',
    )?.animation
    const retarget = records.find(({ track }) => track === 'retarget')
    return {
      generation: root?.dataset.introGeneration,
      progress: Number(master?.currentTime ?? 0) / 3000,
      artCount: records.filter(({ track }) => track !== 'retarget').length,
      retargetDuration: (
        retarget?.animation.effect as KeyframeEffect | null
      )?.getTiming().duration,
      hasWrapper: Boolean(
        document.querySelector('[data-intro-sun-retarget]'),
      ),
      rect: sun?.getBoundingClientRect().toJSON(),
    }
  })

  expect(after.generation).toBe(before.generation)
  expect(after.progress).toBeGreaterThanOrEqual(before.progress)
  expect(after.progress).toBeLessThan(0.6)
  expect(after.artCount).toBe(ART_TRACKS.length)
  expect(after.retargetDuration).toBe(180)
  expect(after.hasWrapper).toBe(true)
  expect(
    Math.hypot(
      Number(after.rect?.left) - Number(before.rect?.left),
      Number(after.rect?.top) - Number(before.rect?.top),
    ),
  ).toBeLessThanOrEqual(80)

  await seekIntro(page, 1)
  await expectSunGeometryAligned(page)
  await expectNoDocumentOverflow(page)
})

test('intent acceleration exposes a 150–200ms interval without restoring scroll', async ({
  page,
}) => {
  await installIntroProbe(page, false)
  await page.goto('/')
  await waitForArtTracks(page)
  const hero = page.locator('#inicio')
  await expect(hero).toHaveAttribute('data-intro-state', 'playing')

  const startedAt = await page.evaluate(() => {
    window.scrollTo(0, 4)
    return performance.now()
  })

  await expect(hero).toHaveAttribute('data-intro-intent', 'accelerated', {
    timeout: 1000,
  })
  const accelerated = await page.evaluate(() => {
    const records = window.__pwCinematicIntroProbe?.records ?? []
    return {
      state: document.querySelector<HTMLElement>('#inicio')?.dataset.introState,
      scrollY: window.scrollY,
      remaining: records
        .filter(({ track }) => track !== 'retarget')
        .map(({ animation }) => {
          const currentTime = Number(animation.currentTime ?? 0)
          return (3000 - currentTime) / animation.playbackRate
        }),
    }
  })
  expect(accelerated.state).toBe('playing')
  expect(accelerated.scrollY).toBe(4)
  expect(accelerated.remaining.every((value) => value <= 205)).toBe(true)
  expect(accelerated.remaining.some((value) => value >= 120)).toBe(true)

  await expect(hero).toHaveAttribute('data-intro-state', 'complete', {
    timeout: 1000,
  })
  const elapsed = await page.evaluate(
    (start) => performance.now() - start,
    startedAt,
  )
  expect(elapsed).toBeGreaterThanOrEqual(120)
  expect(elapsed).toBeLessThanOrEqual(500)
  expect(await page.evaluate(() => window.scrollY)).toBe(4)
})

test('reduced motion starts complete with no finite intro or wave animation', async ({
  page,
}) => {
  await installIntroProbe(page, false)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')

  await expectFinalUiOpen(page)
  expect(
    await page.evaluate(
      () => window.__pwCinematicIntroProbe?.records.length ?? -1,
    ),
  ).toBe(0)
  await expect(page.locator('.wave-band').first()).toHaveCSS(
    'animation-name',
    'none',
  )
  await expectNoDocumentOverflow(page)
})

test('fail-open animate failure leaves header, CTA and skip operable', async ({
  page,
}) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.addInitScript(() => {
    const originalAnimate = Element.prototype.animate
    Element.prototype.animate = function (...args) {
      if ((this as HTMLElement).dataset.introTrack) {
        throw new Error('forced semantic animate failure')
      }
      return originalAnimate.apply(this, args)
    }
  })
  await page.goto('/')

  await expectFinalUiOpen(page)
  await expectSkipStillWorks(page)
  expect(pageErrors).toEqual([])
})

test('fail-open intent rate failure preserves the original scroll action', async ({
  page,
}) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.addInitScript(() => {
    Animation.prototype.updatePlaybackRate = function () {
      throw new Error('forced updatePlaybackRate failure')
    }
  })
  await page.goto('/')
  await expect(page.locator('#inicio')).toHaveAttribute(
    'data-intro-state',
    'playing',
  )

  await page.evaluate(() => window.scrollTo(0, 4))
  await expect(page.locator('#inicio')).toHaveAttribute(
    'data-intro-state',
    'complete',
    { timeout: 1000 },
  )
  await expectFinalUiOpen(page)
  expect(await page.evaluate(() => window.scrollY)).toBe(4)
  expect(pageErrors).toEqual([])
})

test('fail-open resize setKeyframes failure converges to the usable final geometry', async ({
  page,
}) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.addInitScript(() => {
    KeyframeEffect.prototype.setKeyframes = function () {
      throw new Error('forced setKeyframes failure')
    }
  })
  await page.setViewportSize({ width: 320, height: 760 })
  await page.goto('/')
  await expect(page.locator('#inicio')).toHaveAttribute(
    'data-intro-state',
    'playing',
  )

  await page.setViewportSize({ width: 768, height: 1024 })
  await expect(page.locator('#inicio')).toHaveAttribute(
    'data-intro-state',
    'complete',
    { timeout: 1000 },
  )
  await expectFinalUiOpen(page)
  await expectSunGeometryAligned(page)
  await expectNoDocumentOverflow(page)
  expect(pageErrors).toEqual([])
})
