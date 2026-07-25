export const ADMIN_ROUTES = {
  index: '/admin',
  overview: '/admin/visao',
  guests: '/admin/convidados',
  moderation: '/admin/moderacao',
  gifts: '/admin/presentes',
  managers: '/admin/gestores',
  myAccount: '/admin/minha-conta',
  guestsPending: '/admin/convidados?presenca=pending',
  moderationPending: '/admin/moderacao?status=pendente',
  giftsGifted: '/admin/presentes?status=gifted',
} as const

export type AdminBadgeKind = 'guests' | 'memories'
export type AdminRole = 'owner' | 'manager' | 'seller'
export type AdminIconName =
  | 'overview'
  | 'guests'
  | 'moderation'
  | 'gifts'
  | 'managers'

export type AdminNavItem = {
  label: string
  shortLabel: string
  route: string
  icon: AdminIconName
  badge: AdminBadgeKind | null
  roles: readonly AdminRole[]
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    label: 'Visão geral',
    shortLabel: 'Visão',
    route: ADMIN_ROUTES.overview,
    icon: 'overview',
    badge: null,
    roles: ['owner', 'manager'],
  },
  {
    label: 'Convidados',
    shortLabel: 'Convidados',
    route: ADMIN_ROUTES.guests,
    icon: 'guests',
    badge: 'guests',
    roles: ['owner', 'manager'],
  },
  {
    label: 'Moderação',
    shortLabel: 'Moderação',
    route: ADMIN_ROUTES.moderation,
    icon: 'moderation',
    badge: 'memories',
    roles: ['owner', 'manager'],
  },
  {
    label: 'Presentes',
    shortLabel: 'Presentes',
    route: ADMIN_ROUTES.gifts,
    icon: 'gifts',
    badge: null,
    roles: ['owner', 'manager', 'seller'],
  },
  {
    label: 'Gestores',
    shortLabel: 'Gestores',
    route: ADMIN_ROUTES.managers,
    icon: 'managers',
    badge: null,
    roles: ['owner'],
  },
]

export function allowedNavItems(role: AdminRole) {
  return ADMIN_NAV_ITEMS.filter((item) => item.roles.includes(role))
}

export function defaultDestination(role: AdminRole) {
  return role === 'seller' ? ADMIN_ROUTES.gifts : ADMIN_ROUTES.overview
}

export const ADMIN_COPY = {
  login: {
    wordmark: 'Sol 40',
    title: 'Painel da festa',
    description: 'Entre com seu e-mail e sua senha para cuidar da festa.',
    expired:
      'Sua sessão expirou. Entre novamente para continuar nesta seção.',
    logoutUnconfirmed:
      'Você saiu deste navegador, mas não foi possível confirmar o encerramento no servidor. Tente entrar e sair novamente quando a conexão voltar.',
    emailLabel: 'E-mail',
    passwordLabel: 'Senha',
    submit: 'Entrar no painel',
    submitting: 'Entrando…',
    checking: 'Verificando acesso…',
    errors: {
      invalid_credentials:
        'E-mail ou senha inválidos. Confira os dados e tente novamente.',
      rate_limited:
        'Muitas tentativas. Aguarde um pouco e tente novamente.',
      network:
        'Não foi possível entrar agora. Confira a conexão e tente novamente.',
      configuration:
        'O acesso ao painel não está disponível agora. Tente novamente mais tarde.',
    },
  },
  overview: {
    title: 'Visão geral',
    subtitle:
      'Acompanhe confirmações, moderação e presentes em tempo real.',
  },
  guests: {
    title: 'Convidados',
    subtitle: 'Organize convites e respostas por família.',
  },
  moderation: {
    title: 'Moderação',
    subtitle: 'Revise memórias antes que apareçam no mural.',
  },
  gifts: {
    title: 'Presentes',
    subtitle: 'Registre os vinhos já presenteados.',
  },
} as const

export type PresenceFilter = 'yes' | 'pending' | 'no'
export type GuestPresenceFilter = 'all' | PresenceFilter
export type ModerationFilter = 'pendente' | 'aprovado' | 'oculto'
export type GiftFilter = 'available' | 'gifted'

function permittedSearchValue<const T extends string>(
  search: string,
  key: string,
  permitted: readonly T[],
): T | null {
  const value = new URLSearchParams(search).get(key)
  return permitted.includes(value as T) ? (value as T) : null
}

export function presenceFromSearch(search: string) {
  return permittedSearchValue(search, 'presenca', ['yes', 'pending', 'no'])
}

export function guestPresenceFromSearch(search: string): GuestPresenceFilter {
  return presenceFromSearch(search) ?? 'all'
}

export function guestPresenceSearch(filter: GuestPresenceFilter) {
  return filter === 'all' ? '' : `?presenca=${filter}`
}

export function moderationStatusFromSearch(search: string) {
  return permittedSearchValue(search, 'status', [
    'pendente',
    'aprovado',
    'oculto',
  ])
}

export function giftStatusFromSearch(search: string) {
  return permittedSearchValue(search, 'status', ['available', 'gifted'])
}

export function canonicalAdminDestination(pathname: string, search = '') {
  if (pathname === ADMIN_ROUTES.guests) {
    const filter = presenceFromSearch(search)
    return `${pathname}${filter ? `?presenca=${filter}` : ''}`
  }
  if (pathname === ADMIN_ROUTES.moderation) {
    const filter = moderationStatusFromSearch(search)
    return `${pathname}${filter ? `?status=${filter}` : ''}`
  }
  if (pathname === ADMIN_ROUTES.gifts) {
    const filter = giftStatusFromSearch(search)
    return `${pathname}${filter ? `?status=${filter}` : ''}`
  }
  if (pathname === ADMIN_ROUTES.overview) return pathname
  if (pathname === ADMIN_ROUTES.managers) return pathname
  if (pathname === ADMIN_ROUTES.myAccount) return pathname
  return ADMIN_ROUTES.overview
}

export function canonicalDestination(
  role: AdminRole,
  pathname: string,
  search = '',
) {
  if (pathname === ADMIN_ROUTES.myAccount) return pathname
  const canonical = canonicalAdminDestination(pathname, search)
  const canonicalPath = canonical.split('?')[0]
  return allowedNavItems(role).some((item) => item.route === canonicalPath)
    ? canonical
    : defaultDestination(role)
}

export function formatAdminCount(
  count: number,
  singular: string,
  plural: string,
) {
  return `${count} ${count === 1 ? singular : plural}`
}

export function overviewEmptyState(
  familyCount: number,
  personCount: number,
) {
  if (familyCount === 0) {
    return {
      title: 'Nenhuma família cadastrada',
      body: 'Adicione uma família para começar a organizar as confirmações.',
      action: 'Adicionar primeira família',
      route: ADMIN_ROUTES.guests,
    } as const
  }
  if (personCount === 0) {
    return {
      title: 'Nenhuma pessoa cadastrada nos convites',
      body: 'As famílias já existem. Abra um convite para adicionar pessoas.',
      action: 'Ver famílias',
      route: ADMIN_ROUTES.guests,
    } as const
  }
  return null
}
