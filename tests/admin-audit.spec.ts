import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import {
  AUDIT_SECRET_CANARY,
  DECISION_COVERAGE,
  expectNoAdminSecret,
  sanitizeSmokeResult,
} from '../src/test/adminRoleFixtures'

test('D-29–D-33: evidência sanitizada nunca contém senha, token, link ou hash', () => {
  const sanitized = sanitizeSmokeResult({
    status: 'pass',
    durationMs: 42,
    token: AUDIT_SECRET_CANARY,
    password: AUDIT_SECRET_CANARY,
    activationUrl: `https://example.test/admin/ativar?token=${AUDIT_SECRET_CANARY}`,
    nested: { tokenHash: AUDIT_SECRET_CANARY, count: 3 },
  })
  expect(sanitized).toEqual({
    status: 'pass',
    durationMs: 42,
    token: '[redacted]',
    password: '[redacted]',
    activationUrl: '[redacted]',
    nested: { tokenHash: '[redacted]', count: 3 },
  })
  expectNoAdminSecret(JSON.stringify(sanitized))
  expect(DECISION_COVERAGE.audit).toEqual(['D-29', 'D-30', 'D-31', 'D-32', 'D-33'])
})

test('auditoria pré-auth permanece privada, acessível e responsiva', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 760 })
  await page.goto('/admin/auditoria')
  await expect(page.getByRole('heading', { name: 'Painel da festa' })).toBeVisible()
  await expect(page.getByText('Auditoria', { exact: true })).toHaveCount(0)
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(results.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
})
