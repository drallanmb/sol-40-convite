import { describe, expect, it } from 'vitest'
import {
  ADMIN_COPY,
  ADMIN_NAV_ITEMS,
  ADMIN_ROUTES,
  allowedNavItems,
  canonicalDestination,
  canonicalAdminDestination,
  defaultDestination,
  formatAdminCount,
  overviewEmptyState,
  moderationStatusFromSearch,
  presenceFromSearch,
  giftStatusFromSearch,
} from './admin'

describe('admin canonical route contract', () => {
  it('defines operational and owner destinations with explicit roles', () => {
    expect(ADMIN_NAV_ITEMS.map(({ shortLabel, route, badge, roles }) => ({
      shortLabel,
      route,
      badge,
      roles,
    }))).toEqual([
      {
        shortLabel: 'Visão',
        route: '/admin/visao',
        badge: null,
        roles: ['owner', 'manager'],
      },
      {
        shortLabel: 'Convidados',
        route: '/admin/convidados',
        badge: 'guests',
        roles: ['owner', 'manager'],
      },
      {
        shortLabel: 'Moderação',
        route: '/admin/moderacao',
        badge: 'memories',
        roles: ['owner', 'manager'],
      },
      {
        shortLabel: 'Presentes',
        route: '/admin/presentes',
        badge: null,
        roles: ['owner', 'manager', 'seller'],
      },
      {
        shortLabel: 'Gestores',
        route: '/admin/gestores',
        badge: null,
        roles: ['owner'],
      },
    ])
  })

  it.each([
    ['owner', ['/admin/visao', '/admin/convidados', '/admin/moderacao', '/admin/presentes', '/admin/gestores']],
    ['manager', ['/admin/visao', '/admin/convidados', '/admin/moderacao', '/admin/presentes']],
    ['seller', ['/admin/presentes']],
  ] as const)('filters navigation for %s', (role, expected) => {
    expect(allowedNavItems(role).map((item) => item.route)).toEqual(expected)
  })

  it('uses role-specific defaults and redirects forbidden deep links safely', () => {
    expect(defaultDestination('owner')).toBe('/admin/visao')
    expect(defaultDestination('manager')).toBe('/admin/visao')
    expect(defaultDestination('seller')).toBe('/admin/presentes')
    expect(
      canonicalDestination('seller', '/admin/convidados', '?presenca=yes'),
    ).toBe('/admin/presentes')
    expect(
      canonicalDestination('seller', '/admin/presentes', '?status=gifted'),
    ).toBe('/admin/presentes?status=gifted')
    expect(
      canonicalDestination('manager', '/admin/gestores', ''),
    ).toBe('/admin/visao')
    expect(
      canonicalDestination('owner', '/admin/minha-conta', ''),
    ).toBe('/admin/minha-conta')
  })

  it('keeps canonical filtered deep links stable', () => {
    expect(ADMIN_ROUTES).toMatchObject({
      index: '/admin',
      overview: '/admin/visao',
      guestsPending: '/admin/convidados?presenca=pending',
      moderationPending: '/admin/moderacao?status=pendente',
      giftsGifted: '/admin/presentes?status=gifted',
      managers: '/admin/gestores',
    })
  })

  it('normalizes unknown nested routes without losing valid filters', () => {
    expect(
      canonicalAdminDestination('/admin/convidados', '?presenca=pending'),
    ).toBe('/admin/convidados?presenca=pending')
    expect(
      canonicalAdminDestination('/admin/convidados', '?presenca=unknown'),
    ).toBe('/admin/convidados')
    expect(
      canonicalAdminDestination('/admin/moderacao', '?status=aprovado'),
    ).toBe('/admin/moderacao?status=aprovado')
    expect(
      canonicalAdminDestination('/admin/presentes', '?status=gifted'),
    ).toBe('/admin/presentes?status=gifted')
    expect(canonicalAdminDestination('/admin/qualquer', '?token=secret')).toBe(
      '/admin/visao',
    )
  })

  it('accepts only each surface permitted query value', () => {
    expect(presenceFromSearch('?presenca=yes')).toBe('yes')
    expect(presenceFromSearch('?presenca=pending')).toBe('pending')
    expect(presenceFromSearch('?presenca=no')).toBe('no')
    expect(presenceFromSearch('?presenca=all')).toBeNull()
    expect(moderationStatusFromSearch('?status=pendente')).toBe('pendente')
    expect(moderationStatusFromSearch('?status=aprovado')).toBe('aprovado')
    expect(moderationStatusFromSearch('?status=oculto')).toBe('oculto')
    expect(moderationStatusFromSearch('?status=gifted')).toBeNull()
    expect(giftStatusFromSearch('?status=available')).toBe('available')
    expect(giftStatusFromSearch('?status=gifted')).toBe('gifted')
    expect(giftStatusFromSearch('?status=pendente')).toBeNull()
  })
})

describe('admin copy and grammatical counts', () => {
  it('locks the owner login and overview copy', () => {
    expect(ADMIN_COPY.login).toMatchObject({
      title: 'Painel da festa',
      description: 'Entre com seu e-mail e sua senha para cuidar da festa.',
      submit: 'Entrar no painel',
      checking: 'Verificando acesso…',
    })
    expect(ADMIN_COPY.overview).toMatchObject({
      title: 'Visão geral',
      subtitle:
        'Acompanhe confirmações, moderação e presentes em tempo real.',
    })
  })

  it.each([
    [0, 'pessoa', 'pessoas', '0 pessoas'],
    [1, 'pessoa', 'pessoas', '1 pessoa'],
    [2, 'pessoa', 'pessoas', '2 pessoas'],
    [1, 'memória pendente', 'memórias pendentes', '1 memória pendente'],
    [3, 'memória pendente', 'memórias pendentes', '3 memórias pendentes'],
    [1, 'vinho', 'vinhos', '1 vinho'],
  ] as const)(
    'pluralizes %i as %s/%s',
    (count, singular, plural, expected) => {
      expect(formatAdminCount(count, singular, plural)).toBe(expected)
    },
  )

  it('branches the empty overview on familyCount, never attendance sums', () => {
    expect(overviewEmptyState(0, 0)).toEqual({
      title: 'Nenhuma família cadastrada',
      body: 'Adicione uma família para começar a organizar as confirmações.',
      action: 'Adicionar primeira família',
      route: '/admin/convidados',
    })
    expect(overviewEmptyState(1, 0)).toEqual({
      title: 'Nenhuma pessoa cadastrada nos convites',
      body: 'As famílias já existem. Abra um convite para adicionar pessoas.',
      action: 'Ver famílias',
      route: '/admin/convidados',
    })
    expect(overviewEmptyState(1, 1)).toBeNull()
  })
})
