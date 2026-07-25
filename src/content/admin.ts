export const ADMIN_ROUTES = {
  index: '/admin',
  overview: '/admin/visao',
  guests: '/admin/convidados',
  moderation: '/admin/moderacao',
  gifts: '/admin/presentes',
  guestsPending: '/admin/convidados?presenca=pending',
  moderationPending: '/admin/moderacao?status=pendente',
  giftsGifted: '/admin/presentes?status=gifted',
} as const

export type AdminBadgeKind = 'guests' | 'memories'
export type AdminIconName = 'overview' | 'guests' | 'moderation' | 'gifts'

export type AdminNavItem = {
  label: string
  shortLabel: string
  route: string
  icon: AdminIconName
  badge: AdminBadgeKind | null
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    label: 'Visão geral',
    shortLabel: 'Visão',
    route: ADMIN_ROUTES.overview,
    icon: 'overview',
    badge: null,
  },
  {
    label: 'Convidados',
    shortLabel: 'Convidados',
    route: ADMIN_ROUTES.guests,
    icon: 'guests',
    badge: 'guests',
  },
  {
    label: 'Moderação',
    shortLabel: 'Moderação',
    route: ADMIN_ROUTES.moderation,
    icon: 'moderation',
    badge: 'memories',
  },
  {
    label: 'Presentes',
    shortLabel: 'Presentes',
    route: ADMIN_ROUTES.gifts,
    icon: 'gifts',
    badge: null,
  },
]

export const ADMIN_COPY = {
  login: {
    wordmark: 'Sol 40',
    title: 'Painel dos donos',
    description: 'Entre com a senha compartilhada para cuidar da festa.',
    expired:
      'Sua sessão expirou. Entre novamente para continuar nesta seção.',
    logoutUnconfirmed:
      'Você saiu deste navegador, mas não foi possível confirmar o encerramento no servidor. Tente entrar e sair novamente quando a conexão voltar.',
    passwordLabel: 'Senha',
    submit: 'Entrar no painel',
    submitting: 'Entrando…',
    checking: 'Verificando acesso…',
    errors: {
      invalid_credentials: 'Senha incorreta. Confira e tente novamente.',
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
export type ModerationFilter = 'pendente' | 'aprovada' | 'oculta'
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

export function moderationStatusFromSearch(search: string) {
  return permittedSearchValue(search, 'status', [
    'pendente',
    'aprovada',
    'oculta',
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
  return ADMIN_ROUTES.overview
}

export function formatAdminCount(
  count: number,
  singular: string,
  plural: string,
) {
  return `${count} ${count === 1 ? singular : plural}`
}
