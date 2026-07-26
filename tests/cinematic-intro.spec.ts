import { expect, test, type Page } from '@playwright/test'

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
    __cinematicIntroAnimations: Animation[]
    __cinematicIntroSunNodes: Element[]
  }
}

export async function installCinematicIntroControl(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const originalAnimate = Element.prototype.animate
    window.__cinematicIntroAnimations = []
    window.__cinematicIntroSunNodes = []

    Element.prototype.animate = function (
      keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
      options?: number | KeyframeAnimationOptions,
    ) {
      const animation = originalAnimate.call(this, keyframes, options)
      if ((this as HTMLElement).dataset.testid === 'hero-sun-visual') {
        animation.pause()
        window.__cinematicIntroAnimations.push(animation)
        window.__cinematicIntroSunNodes.push(this)
      }
      return animation
    }
  })
}

export async function finishLatestCinematicIntro(page: Page): Promise<void> {
  await page.waitForFunction(
    () => window.__cinematicIntroAnimations?.length > 0,
  )
  await page.evaluate(() => {
    window.__cinematicIntroAnimations.at(-1)?.finish()
  })
  await expect
    .poll(() =>
      page
        .locator('[data-intro-phase]')
        .first()
        .getAttribute('data-intro-phase'),
    )
    .not.toBe('descending')
}

export async function readSunGeometry(
  page: Page,
): Promise<{ target: DOMRectShape; visual: DOMRectShape }> {
  return page.evaluate(() => {
    const target = document.querySelector<HTMLElement>(
      '[data-testid="hero-sun-target"]',
    )
    const visual = document.querySelector<HTMLElement>(
      '[data-testid="hero-sun-visual"]',
    )
    if (!target || !visual) {
      throw new Error('Canonical sun target and visual must both exist')
    }

    return {
      target: target.getBoundingClientRect().toJSON(),
      visual: visual.getBoundingClientRect().toJSON(),
    }
  })
}

export async function expectSunGeometryAligned(page: Page): Promise<void> {
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

test('first frame shows only the final sky while the sun starts above the viewport', async ({
  page,
}) => {
  await installCinematicIntroControl(page)
  await page.goto('/')

  const hero = page.locator('[data-intro-phase="descending"]')
  await expect(hero).toBeAttached()
  await expect(page.locator('[data-testid="hero-sun-target"]')).toHaveCount(1)
  await expect(page.locator('[data-testid="hero-sun-visual"]')).toHaveCount(1)

  const revealGroups = page.locator('[data-intro-reveal]')
  await expect(revealGroups).toHaveCount(3)
  for (const group of await revealGroups.all()) {
    await expect(group).toHaveCSS('visibility', 'hidden')
    await expect(group).toHaveCSS('opacity', '0')
  }

  const { visual } = await readSunGeometry(page)
  expect(visual.bottom).toBeLessThanOrEqual(0)
  await expect(page.getByRole('heading', { name: /Sol/i }).first()).toBeHidden()
})

test('geometry lands the same canonical sun on its responsive target', async ({
  page,
}) => {
  await installCinematicIntroControl(page)

  for (const viewport of [
    { width: 320, height: 760 },
    { width: 768, height: 1024 },
    { width: 1280, height: 800 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await page.waitForFunction(
      () => window.__cinematicIntroSunNodes?.length > 0,
    )
    const visualWasCanonical = await page.evaluate(() => {
      const visual = document.querySelector(
        '[data-testid="hero-sun-visual"]',
      )
      return window.__cinematicIntroSunNodes.at(-1) === visual
    })
    expect(visualWasCanonical).toBe(true)

    await finishLatestCinematicIntro(page)
    await expectSunGeometryAligned(page)

    const visualRemainedCanonical = await page.evaluate(() => {
      const visual = document.querySelector(
        '[data-testid="hero-sun-visual"]',
      )
      return window.__cinematicIntroSunNodes.at(-1) === visual
    })
    expect(visualRemainedCanonical).toBe(true)
  }
})

test('timing uses one transform-only descent and a 260ms reveal', async ({
  page,
}) => {
  await installCinematicIntroControl(page)
  await page.goto('/')
  await page.waitForFunction(
    () => window.__cinematicIntroAnimations?.length > 0,
  )

  const animationContract = await page.evaluate(() => {
    const visual = document.querySelector<HTMLElement>(
      '[data-testid="hero-sun-visual"]',
    )
    const animation = window.__cinematicIntroAnimations.at(-1)
    const effect = animation?.effect as KeyframeEffect | null
    const timing = effect?.getTiming()
    const keyframes = effect?.getKeyframes() ?? []

    return {
      duration: timing?.duration,
      easing: timing?.easing,
      animationCount: visual?.getAnimations().length,
      keyframes,
      background: visual ? getComputedStyle(visual).backgroundColor : '',
      boxShadow: visual ? getComputedStyle(visual).boxShadow : '',
    }
  })

  expect(animationContract.duration).toBe(2000)
  expect(animationContract.easing).toBe('cubic-bezier(0.65, 0, 0.35, 1)')
  expect(animationContract.animationCount).toBe(1)
  expect(animationContract.keyframes).toHaveLength(2)
  for (const keyframe of animationContract.keyframes) {
    expect(keyframe.transform).toBeTruthy()
    expect(keyframe).not.toHaveProperty('opacity')
    expect(keyframe).not.toHaveProperty('filter')
    expect(keyframe).not.toHaveProperty('width')
    expect(keyframe).not.toHaveProperty('height')
  }
  expect(animationContract.background).not.toBe('rgba(0, 0, 0, 0)')
  expect(animationContract.boxShadow).not.toBe('none')

  await finishLatestCinematicIntro(page)
  const reveal = page.locator('[data-intro-reveal]').first()
  await expect(reveal).toHaveCSS('transition-duration', '0.26s')
  await expect(page.locator('[data-testid="hero-sun-visual"]')).toHaveCSS(
    'transition-duration',
    '0s',
  )
})
