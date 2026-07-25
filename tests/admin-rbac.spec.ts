import { expect, test } from '@playwright/test'
import {
  allowedNavItems,
  canonicalDestination,
  defaultDestination,
} from '../src/content/admin'
import {
  ADMIN_ROLE_FIXTURES,
  DECISION_COVERAGE,
  installConvexTrafficObserver,
} from '../src/test/adminRoleFixtures'

test('D-07–D-12 e D-34–D-36: cada papel recebe apenas seus destinos', () => {
  for (const fixture of ADMIN_ROLE_FIXTURES) {
    expect(defaultDestination(fixture.role)).toBe(fixture.defaultRoute)
    expect(allowedNavItems(fixture.role).map(({ route }) => route)).toEqual(
      fixture.allowedRoutes,
    )
    for (const forbidden of fixture.forbiddenRoutes) {
      expect(canonicalDestination(fixture.role, forbidden)).toBe(
        fixture.defaultRoute,
      )
    }
  }
  expect(DECISION_COVERAGE.rolesAndUx).toEqual([
    'D-07', 'D-08', 'D-09', 'D-10', 'D-11', 'D-12',
    'D-34', 'D-35', 'D-36', 'D-37', 'D-38',
  ])
})

test('D-11: anônimo e deep-link proibido não disparam query protegida', async ({
  page,
}) => {
  await installConvexTrafficObserver(page)
  await page.goto('/admin/auditoria')
  await expect(page.getByRole('heading', { name: 'Painel da festa' })).toBeVisible()
  const traffic = (await page.evaluate(() => window.__phase8ConvexTraffic)).join('\n')
  expect(traffic).not.toMatch(
    /adminOverview|adminRsvps|adminPosts|adminWines|adminAccounts|adminAudit|adminSessions/i,
  )
})

test('D-23–D-28: seller só opera Presentes e o catálogo mantém a copy pública', async ({
  page,
}) => {
  const seller = ADMIN_ROLE_FIXTURES.find(({ role }) => role === 'seller')
  expect(seller?.allowedRoutes).toEqual(['/admin/presentes'])
  expect(seller?.forbiddenFunctions).toEqual(
    expect.arrayContaining(['adminOverview.get', 'adminRsvps.listFamilies', 'adminPosts.listByStatus']),
  )
  expect(DECISION_COVERAGE.gifts).toEqual(['D-23', 'D-24', 'D-25', 'D-26', 'D-27', 'D-28'])

  await page.goto('/presentes')
  await expect(page.getByText('Já escolhido com carinho').first()).toBeAttached()
})
