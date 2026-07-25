import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const WCAG_AA_TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
]

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

  const accessibility = await new AxeBuilder({ page })
    .withTags(WCAG_AA_TAGS)
    .analyze()
  expect(accessibility.violations).toEqual([])

  await page.keyboard.press('Tab')
  const focused = page.locator(':focus')
  await expect(focused).toBeVisible()
  await expect(focused).not.toHaveJSProperty('tagName', 'BODY')

  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }))
  expect(overflow.document).toBeLessThanOrEqual(1)
  expect(overflow.body).toBeLessThanOrEqual(1)
})
