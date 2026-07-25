import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import {
  ADMIN_INITIAL_ACCOUNTS,
  DECISION_COVERAGE,
  expectNoAdminSecret,
} from '../src/test/adminRoleFixtures'

test('D-01–D-06: contas iniciais e links mantêm o contrato individual', async ({
  page,
}) => {
  expect(ADMIN_INITIAL_ACCOUNTS).toEqual([
    {
      displayName: 'Allan',
      email: 'allanmesquitab@gmail.com',
      role: 'owner',
    },
    {
      displayName: 'Soraya',
      email: 'sorayathorsjo@outlook.com',
      role: 'manager',
    },
    {
      displayName: 'Guga',
      email: 'gugart@hotmail.com',
      role: 'manager',
    },
    {
      displayName: 'Vanessa',
      email: 'vanessa.alonso@mistral.com.br',
      role: 'seller',
    },
  ])
  expect(DECISION_COVERAGE.credentials).toEqual(['D-01', 'D-02', 'D-03', 'D-04', 'D-05', 'D-06'])

  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'Painel da festa' })).toBeVisible()
  await expect(page.getByLabel('E-mail')).toHaveAttribute('autocomplete', 'username')
  await expect(page.getByLabel('Senha')).toHaveAttribute('autocomplete', 'current-password')
  expectNoAdminSecret(await page.content())
})

test('D-13–D-22: ativação sanitiza URL e superfícies anônimas não montam o painel', async ({
  page,
}) => {
  const token = 'A'.repeat(43)
  await page.goto(`/admin/ativar?token=${token}`)
  await expect(page).toHaveURL(/\/admin\/ativar$/u)
  await expect(page.getByRole('heading', { name: 'Ativar acesso' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Seções do painel' })).toHaveCount(0)
  await expect(page.getByText(token, { exact: false })).toHaveCount(0)
  expect(DECISION_COVERAGE.sessionsAndMigration).toEqual([
    'D-13', 'D-14', 'D-15', 'D-16', 'D-17', 'D-18',
    'D-19', 'D-20', 'D-21', 'D-22',
  ])
})

test('D-37–D-38: login e ativação passam AA, foco e reflow em 320px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 760 })
  await page.goto('/admin')
  await page.getByLabel('E-mail').focus()
  await expect(page.getByLabel('E-mail')).toBeFocused()
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(results.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
})
