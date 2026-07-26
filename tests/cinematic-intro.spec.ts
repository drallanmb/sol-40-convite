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

type WaapiFaultOperation =
  | 'animate'
  | 'pause'
  | 'setKeyframes'
  | 'updatePlaybackRate'
  | 'finish'
  | 'cancel'

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
      rateUpdates: Array<{
        track: string
        rate: number
        remaining: number
      }>
      seek: (progress: number) => void
      pause: () => void
    }
    __pwCinematicIntroWaapiFault?: {
      records: Array<{
        animation: Animation
        node: Element
        track: string
      }>
      calls: Record<WaapiFaultOperation, number>
    }
  }
}

async function installWaapiFault(
  page: Page,
  operation: WaapiFaultOperation,
): Promise<void> {
  await page.addInitScript((fault) => {
    const originalAnimate = Element.prototype.animate
    const originalPause = Animation.prototype.pause
    const originalUpdatePlaybackRate =
      Animation.prototype.updatePlaybackRate
    const originalFinish = Animation.prototype.finish
    const originalCancel = Animation.prototype.cancel
    const originalSetKeyframes = KeyframeEffect.prototype.setKeyframes
    const semanticAnimations = new WeakSet<Animation>()
    const semanticEffects = new WeakSet<KeyframeEffect>()
    const records: Array<{
      animation: Animation
      node: Element
      track: string
    }> = []
    const calls: Record<WaapiFaultOperation, number> = {
      animate: 0,
      pause: 0,
      setKeyframes: 0,
      updatePlaybackRate: 0,
      finish: 0,
      cancel: 0,
    }

    window.__pwCinematicIntroWaapiFault = { records, calls }

    Element.prototype.animate = function (
      keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
      options?: number | KeyframeAnimationOptions,
    ) {
      const owner = this as HTMLElement
      const track = owner.dataset.introTrack
        ?? (owner.hasAttribute('data-intro-sun-retarget')
          ? 'retarget'
          : null)
      if (track && fault === 'animate') {
        calls.animate += 1
        throw new Error('forced semantic animate failure')
      }

      const animation = originalAnimate.call(this, keyframes, options)
      if (!track) return animation

      semanticAnimations.add(animation)
      const effect = animation.effect
      if (effect instanceof KeyframeEffect) semanticEffects.add(effect)
      records.push({ animation, node: this, track })
      return animation
    }

    Animation.prototype.pause = function () {
      if (semanticAnimations.has(this) && fault === 'pause') {
        calls.pause += 1
        throw new Error('forced semantic pause failure')
      }
      return originalPause.call(this)
    }

    KeyframeEffect.prototype.setKeyframes = function (keyframes) {
      if (semanticEffects.has(this) && fault === 'setKeyframes') {
        calls.setKeyframes += 1
        throw new Error('forced semantic setKeyframes failure')
      }
      return originalSetKeyframes.call(this, keyframes)
    }

    Animation.prototype.updatePlaybackRate = function (rate) {
      if (
        semanticAnimations.has(this)
        && fault === 'updatePlaybackRate'
      ) {
        calls.updatePlaybackRate += 1
        throw new Error('forced semantic updatePlaybackRate failure')
      }
      return originalUpdatePlaybackRate.call(this, rate)
    }

    Animation.prototype.finish = function () {
      if (semanticAnimations.has(this) && fault === 'finish') {
        calls.finish += 1
        throw new Error('forced semantic finish failure')
      }
      return originalFinish.call(this)
    }

    Animation.prototype.cancel = function () {
      if (semanticAnimations.has(this) && fault === 'cancel') {
        calls.cancel += 1
        throw new Error('forced semantic cancel failure')
      }
      return originalCancel.call(this)
    }
  }, operation)
}

async function installIntroProbe(
  page: Page,
  pauseOnCreate = true,
): Promise<void> {
  await page.addInitScript(
    ({ duration, shouldPause }) => {
      const originalAnimate = Element.prototype.animate
      const originalUpdatePlaybackRate =
        Animation.prototype.updatePlaybackRate
      const records: IntroProbeRecord[] = []
      const rateUpdates: Array<{
        track: string
        rate: number
        remaining: number
      }> = []

      window.__pwCinematicIntroProbe = {
        records,
        rateUpdates,
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

      Animation.prototype.updatePlaybackRate = function (rate) {
        const record = records.find(({ animation }) => animation === this)
        if (record && record.track !== 'retarget') {
          const timing = (
            this.effect as KeyframeEffect | null
          )?.getTiming()
          const effectDuration =
            typeof timing?.duration === 'number'
              ? timing.duration
              : duration
          const currentTime = Number(this.currentTime ?? 0)
          rateUpdates.push({
            track: record.track,
            rate,
            remaining: (effectDuration - currentTime) / rate,
          })
        }
        return originalUpdatePlaybackRate.call(this, rate)
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
        if (shouldPause) animation.pause()
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

async function expectCapturedIntentInterval(page: Page): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__pwCinematicIntroProbe?.rateUpdates.length ?? 0,
      ),
    )
    .toBe(ART_TRACKS.length)

  const updates = await page.evaluate(
    () => window.__pwCinematicIntroProbe?.rateUpdates ?? [],
  )
  expect(updates.map(({ track }) => track).sort()).toEqual(
    [...ART_TRACKS].sort(),
  )
  expect(
    updates.every(
      ({ remaining }) => remaining >= 150 && remaining <= 200,
    ),
  ).toBe(true)
}

async function expectWaapiFaultCalls(
  page: Page,
  operation: WaapiFaultOperation,
  expected: number | 'none',
): Promise<void> {
  const calls = await page.evaluate(
    (name) =>
      window.__pwCinematicIntroWaapiFault?.calls[
        name as WaapiFaultOperation
      ] ?? -1,
    operation,
  )
  if (expected === 'none') {
    expect(calls).toBe(0)
    return
  }
  expect(calls).toBeGreaterThanOrEqual(expected)
}

async function liveSemanticWaapiAnimations(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      window.__pwCinematicIntroWaapiFault?.records.filter(
        ({ animation }) =>
          animation.effect !== null && animation.playState !== 'idle',
      ).length ?? -1,
  )
}

test('continuous production preview exposes no injected intro namespace', async ({
  page,
}) => {
  await page.goto('/')

  const namespaces = await page.evaluate(() => {
    const runtime = window as unknown as Record<string, unknown>
    return {
      focusedProbe: typeof runtime.__pwCinematicIntroProbe,
      visualTimeline: typeof runtime.__pwCinematicIntroTimeline,
      productionController: typeof runtime.__cinematicIntro,
    }
  })

  expect(namespaces).toEqual({
    focusedProbe: 'undefined',
    visualTimeline: 'undefined',
    productionController: 'undefined',
  })
})

test('geometry fragment entry bypasses the intro and keeps the target operable', async ({
  page,
}) => {
  await installIntroProbe(page, false)
  await page.goto('/#programacao')

  await expectFinalUiOpen(page)
  await expect(page).toHaveURL(/#programacao$/)
  await expect(page.locator('#programacao')).toBeInViewport()
  expect(
    await page.evaluate(
      () => window.__pwCinematicIntroProbe?.records.length ?? -1,
    ),
  ).toBe(0)
})

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
  const hierarchyEnd = Math.max(
    ...[primary, secondary].map((contract) =>
      Number(
        contract?.keyframes.find(({ opacity }) => Number(opacity) === 1)
          ?.offset ?? Number.NaN,
      ),
    ),
  )
  expect(primaryOnset).toBeLessThan(secondaryOnset)
  expect((hierarchyEnd - primaryOnset) * INTRO_DURATION_MS).toBeGreaterThanOrEqual(
    500,
  )
  expect((hierarchyEnd - primaryOnset) * INTRO_DURATION_MS).toBeLessThanOrEqual(
    700,
  )
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
      connected: sun?.isConnected,
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
  expect(before.connected).toBe(true)

  const nextFrame = await page.evaluate(() => {
    const records = window.__pwCinematicIntroProbe?.records ?? []
    const retarget = records.find(({ track }) => track === 'retarget')
    const sun = document.querySelector<HTMLElement>('[data-intro-sun]')
    if (!retarget || !sun) {
      throw new Error('Retarget correction and canonical sun are required')
    }
    retarget.animation.currentTime = 16
    return sun.getBoundingClientRect().toJSON()
  })
  expect(
    Math.hypot(
      Number(nextFrame.left) - Number(after.rect?.left),
      Number(nextFrame.top) - Number(after.rect?.top),
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
    const probe = window.__pwCinematicIntroProbe
    return {
      state: document.querySelector<HTMLElement>('#inicio')?.dataset.introState,
      scrollY: window.scrollY,
      rateUpdates: probe?.rateUpdates ?? [],
    }
  })
  expect(['playing', 'complete']).toContain(accelerated.state)
  expect(accelerated.scrollY).toBe(4)
  await expectCapturedIntentInterval(page)

  await expect(hero).toHaveAttribute('data-intro-state', 'complete', {
    timeout: 1000,
  })
  const elapsed = await page.evaluate(
    (start) => performance.now() - start,
    startedAt,
  )
  expect(elapsed).toBeGreaterThanOrEqual(120)
  expect(await page.evaluate(() => window.scrollY)).toBe(4)
})

test('intent focus acceleration preserves the skip action', async ({
  page,
}) => {
  await installIntroProbe(page, false)
  await page.goto('/')
  await waitForArtTracks(page)

  const hero = page.locator('#inicio')
  const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
  await skip.focus()
  await expect(skip).toBeFocused()
  await expect(hero).toHaveAttribute('data-intro-intent', 'accelerated')
  await expectCapturedIntentInterval(page)

  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#conteudo$/)
  await expect(page.locator('#conteudo')).toBeFocused()
})

test('intent pointer acceleration preserves hash navigation', async ({
  page,
}) => {
  await installIntroProbe(page, false)
  await page.goto('/')
  await waitForArtTracks(page)

  const mobileMenu = page.getByRole('button', { name: 'Abrir menu' })
  if (await mobileMenu.isVisible()) {
    await mobileMenu.click()
    await page
      .getByRole('navigation', { name: 'Navegação mobile' })
      .getByRole('link', { name: 'Programação' })
      .click()
  } else {
    await page
      .getByRole('navigation', { name: 'Navegação principal' })
      .getByRole('link', { name: 'Programação' })
      .click()
  }

  await expect(page).toHaveURL(/#programacao$/)
  await expect(page.locator('#programacao')).toBeInViewport()
  await expect(page.locator('#inicio')).toHaveAttribute(
    'data-intro-intent',
    'accelerated',
  )
  await expectCapturedIntentInterval(page)
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

test('route remount owns one controller while same-mount wordmark never replays it', async ({
  page,
}) => {
  await installIntroProbe(page)
  await page.goto('/')
  await waitForArtTracks(page)
  await seekIntro(page, 0.9)

  const hero = page.locator('#inicio')
  const initialGeneration = await hero.getAttribute('data-intro-generation')
  const primaryCta = hero.getByRole('link', {
    name: 'Confirmar presença',
  })
  await expect(primaryCta).toBeVisible()
  await expect(primaryCta).toBeEnabled()
  await primaryCta.click()
  await expect(page).toHaveURL(/\/confirmar$/)
  await expect(hero).toHaveCount(0)

  const disposedRun = await page.evaluate(() => {
    const probe = window.__pwCinematicIntroProbe
    return {
      liveAnimations:
        probe?.records.filter(
          ({ animation }) => animation.playState !== 'idle',
        )
          .length ?? -1,
      rateUpdates: probe?.rateUpdates.length ?? -1,
    }
  })
  expect(disposedRun.liveAnimations).toBe(0)

  await page.evaluate(() => {
    const probe = window.__pwCinematicIntroProbe
    if (!probe) throw new Error('Playwright intro probe is unavailable')
    const updatesBefore = probe.rateUpdates.length
    window.scrollTo(0, 24)
    document.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true }),
    )
    document.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    if (probe.rateUpdates.length !== updatesBefore) {
      throw new Error('Disposed cinematic listeners handled route events')
    }
    probe.records.length = 0
    probe.rateUpdates.length = 0
  })

  await page.goBack()
  await expect(page).toHaveURL(/\/$/)
  await waitForArtTracks(page)
  await expect(hero).toHaveAttribute('data-intro-state', 'playing')
  await expect(hero).toHaveAttribute('data-intro-generation', '0')
  expect(
    await page.evaluate(
      () =>
        window.__pwCinematicIntroProbe?.records.filter(
          ({ track }) => track !== 'retarget',
        ).length ?? -1,
    ),
  ).toBe(ART_TRACKS.length)

  const wordmark = page.getByRole('link', {
    name: 'Sol faz 40 — voltar ao início',
  })
  await wordmark.click()
  await expect(page).toHaveURL(/#inicio$/)
  await expect(hero).toHaveAttribute(
    'data-intro-generation',
    initialGeneration ?? '0',
  )
  expect(
    await page.evaluate(
      () =>
        window.__pwCinematicIntroProbe?.records.filter(
          ({ track }) => track !== 'retarget',
        ).length ?? -1,
    ),
  ).toBe(ART_TRACKS.length)
})

test('focus keeps skip first and excludes copy until each visible onset', async ({
  browserName,
  page,
}) => {
  await installIntroProbe(page)
  await page.goto('/')
  await waitForArtTracks(page)
  await seekIntro(page, 0)

  const hero = page.locator('#inicio')
  const primary = hero.locator('[data-intro-copy="primary"]')
  const secondary = hero.locator('[data-intro-copy="secondary"]')
  const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })

  // macOS WebKit follows the operating-system "full keyboard access"
  // preference and may omit links from the native Tab order in automation.
  if (browserName === 'webkit') {
    await skip.focus()
  } else {
    await page.keyboard.press('Tab')
  }
  await expect(skip).toBeFocused()
  await expect(page.locator('header')).not.toHaveAttribute('inert', '')
  await expect(primary).toHaveAttribute('inert', '')
  await expect(secondary).toHaveAttribute('inert', '')

  await page.keyboard.press('Tab')
  expect(
    await page.evaluate(() =>
      Boolean(document.activeElement?.closest(
        '[data-intro-copy="secondary"]',
      )),
    ),
  ).toBe(false)

  await seekIntro(page, 0.76)
  await expect(primary).not.toHaveAttribute('inert', '')
  await expect(secondary).toHaveAttribute('inert', '')
  await seekIntro(page, 0.88)
  await expect(secondary).not.toHaveAttribute('inert', '')
})

test('bfcache restart disposes the previous generation even when WAAPI cancel throws', async ({
  page,
}) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await installWaapiFault(page, 'cancel')
  await page.goto('/')

  const hero = page.locator('#inicio')
  await expect(hero).toHaveAttribute('data-intro-state', 'playing')
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__pwCinematicIntroWaapiFault?.records.length ?? -1,
      ),
    )
    .toBe(ART_TRACKS.length)
  const initialGeneration = Number(
    await hero.getAttribute('data-intro-generation'),
  )

  await page.evaluate(() => {
    window.dispatchEvent(
      new PageTransitionEvent('pageshow', { persisted: true }),
    )
  })
  await expect(hero).toHaveAttribute(
    'data-intro-generation',
    String(initialGeneration + 1),
  )
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__pwCinematicIntroWaapiFault?.records.length ?? -1,
      ),
    )
    .toBe(ART_TRACKS.length * 2)

  expect(await liveSemanticWaapiAnimations(page)).toBe(ART_TRACKS.length)
  await expectWaapiFaultCalls(page, 'cancel', ART_TRACKS.length)

  await page.evaluate(() => window.scrollTo(0, 4))
  await expect(hero).toHaveAttribute('data-intro-state', 'complete', {
    timeout: 1000,
  })
  await expectFinalUiOpen(page)
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThanOrEqual(4)
  await expectSkipStillWorks(page)
  expect(await liveSemanticWaapiAnimations(page)).toBe(0)
  expect(pageErrors).toEqual([])
})

test('WAAPI pause failure during retarget fails open without losing navigation', async ({
  page,
}) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await installWaapiFault(page, 'pause')
  await page.setViewportSize({ width: 320, height: 760 })
  await page.goto('/')
  await page.setViewportSize({ width: 768, height: 1024 })
  await expectFinalUiOpen(page)
  await expectWaapiFaultCalls(page, 'pause', 1)
  await expectSkipStillWorks(page)
  expect(pageErrors).toEqual([])
})

test('WAAPI finish remains unused and cannot turn intent acceleration into a cut', async ({
  page,
}) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await installWaapiFault(page, 'finish')
  await page.goto('/')
  await expect(page.locator('#inicio')).toHaveAttribute(
    'data-intro-state',
    'playing',
  )

  await page.evaluate(() => window.scrollTo(0, 4))
  await expectFinalUiOpen(page)
  await expectWaapiFaultCalls(page, 'finish', 'none')
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThanOrEqual(4)
  await expectSkipStillWorks(page)
  expect(pageErrors).toEqual([])
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
