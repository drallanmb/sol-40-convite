import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  useConvexConnectionState,
  useQuery_experimental,
} from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router'
import {
  ADMIN_COPY,
  ADMIN_ROUTES,
  allowedNavItems,
  canonicalDestination,
  defaultDestination,
  type AdminBadgeKind,
  type AdminIconName,
} from '../../content/admin'
import Button from '../ui/Button'
import AdminOverview from './AdminOverview'
import AdminGuests from './AdminGuests'
import AdminGifts from './AdminGifts'
import AdminModeration from './AdminModeration'
import AdminMyAccount from './AdminMyAccount'
import AdminManagers from './AdminManagers'
import AdminAudit from './AdminAudit'
import type { AdminPrincipalView } from '../../lib/adminSession'

type AdminShellProps = {
  badges?: Partial<Record<AdminBadgeKind, number>>
  children?: ReactNode
  loggingOut: boolean
  onLogout: () => Promise<void>
  onUnauthorized: () => void
  token: string
  principal: AdminPrincipalView
}

function AdminIcon({ name }: { name: AdminIconName }) {
  const paths: Record<AdminIconName, ReactNode> = {
    overview: (
      <>
        <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
      </>
    ),
    guests: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 20v-2.5A4.5 4.5 0 0 1 8 13h2a4.5 4.5 0 0 1 4.5 4.5V20M16 5.5a3 3 0 0 1 0 5.8M16.5 14a4 4 0 0 1 4 4v2" />
      </>
    ),
    moderation: (
      <>
        <path d="m12 3 7 3v5c0 4.5-2.8 8-7 10-4.2-2-7-5.5-7-10V6z" />
        <path d="m9 12 2 2 4-5" />
      </>
    ),
    gifts: (
      <>
        <path d="M4 10h16v11H4zM3 6h18v4H3zM12 6v15" />
        <path d="M12 6H8.5A2.5 2.5 0 1 1 11 3.5zM12 6h3.5A2.5 2.5 0 1 0 13 3.5z" />
      </>
    ),
    managers: (
      <>
        <circle cx="8" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M3 20v-2a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v2M14 15h3a4 4 0 0 1 4 4v1" />
      </>
    ),
    audit: (
      <>
        <path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" />
      </>
    ),
  }
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}

function Badge({
  count,
  kind,
}: {
  count: number | undefined
  kind: AdminBadgeKind
}) {
  if (!count || count <= 0) return null
  const label =
    kind === 'guests'
      ? `${count} ${count === 1 ? 'pessoa pendente' : 'pessoas pendentes'}`
      : `${count} ${count === 1 ? 'memória pendente' : 'memórias pendentes'}`
  return (
    <span
      aria-label={label}
      className="min-w-6 rounded-full bg-rsvp-pendente px-1.5 py-0.5 text-center text-xs font-bold tabular-nums text-cream"
    >
      {count}
    </span>
  )
}

export function AdminShell({
  badges = {},
  loggingOut,
  onLogout,
  onUnauthorized,
  token,
  principal,
}: AdminShellProps) {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const pageTitleRef = useRef<HTMLElement | null>(null)
  const connection = useConvexConnectionState()
  const overviewQuery = useQuery_experimental({
    query: api.adminOverview.get,
    args: principal.role === 'seller' ? 'skip' : { token },
  })
  const unauthorized =
    overviewQuery.status === 'success' &&
    overviewQuery.data.kind === 'unauthorized'
  const overviewData =
    overviewQuery.status === 'success' &&
    overviewQuery.data.kind === 'ready'
      ? overviewQuery.data
      : null
  const liveBadges = overviewData?.badges ?? badges
  const permittedItems = allowedNavItems(principal.role)
  const activeItem =
    permittedItems.find((item) => item.route === location.pathname) ??
    permittedItems[0]

  useEffect(() => {
    window.scrollTo({ top: 0 })
    pageTitleRef.current = document.getElementById('admin-page-title')
    pageTitleRef.current?.focus()
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      menuButtonRef.current?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  useEffect(() => {
    if (unauthorized) onUnauthorized()
  }, [onUnauthorized, unauthorized])

  if (unauthorized) {
    return (
      <main className="grid min-h-screen place-items-center bg-cream text-plum">
        <p role="status">{ADMIN_COPY.login.checking}</p>
      </main>
    )
  }

  const navLinks = (compact: boolean) =>
    permittedItems
      .filter(
        (item) =>
          !compact ||
          (item.route !== ADMIN_ROUTES.managers &&
            item.route !== ADMIN_ROUTES.audit),
      )
      .map((item) => {
      const active = item.route === location.pathname
      const badge = item.badge ? liveBadges[item.badge] : undefined
      return (
        <Link
          key={item.route}
          to={item.route}
          aria-current={active ? 'page' : undefined}
          className={
            compact
              ? `admin-nav-link relative flex min-h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-sm font-bold leading-none ${
                  active ? 'text-plum' : 'text-ink/70'
                }`
              : `admin-nav-link flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold ${
                  active
                    ? 'bg-cream text-plum'
                    : 'text-cream hover:bg-cream/10'
                }`
          }
          data-active={active ? 'true' : undefined}
        >
          {compact && active ? (
            <span className="absolute inset-x-3 top-0 h-[3px] bg-plum" />
          ) : null}
          <span className="flex items-center gap-1.5">
            <AdminIcon name={item.icon} />
            {compact ? <Badge count={badge} kind={item.badge ?? 'guests'} /> : null}
          </span>
          <span className={compact ? 'max-w-full truncate' : ''}>
            {compact ? item.shortLabel : item.label}
          </span>
          {!compact && item.badge ? (
            <span className="ml-auto">
              <Badge count={badge} kind={item.badge} />
            </span>
          ) : null}
        </Link>
      )
    })

  const currentDestination = canonicalDestination(
    principal.role,
    location.pathname,
    location.search,
  )
  const roleDefault = defaultDestination(principal.role)

  return (
    <div className="admin-dashboard min-h-screen bg-cream text-ink lg:pl-[248px]">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-(--z-skip) focus:rounded-lg focus:bg-cream focus:px-4 focus:py-3 focus:font-bold focus:text-plum"
      >
        Pular para o conteúdo
      </a>

      <aside className="fixed inset-y-0 left-0 z-(--z-sticky) hidden w-[248px] flex-col bg-plum text-cream lg:flex">
        <div className="border-b border-cream/20 px-6 py-6">
          <p className="font-serif text-xl font-bold leading-none">Sol 40</p>
          <p className="mt-2 text-sm text-cream/75">Painel da festa</p>
        </div>
        <nav
          aria-label="Seções do painel"
          className="flex flex-1 flex-col gap-2 px-4 py-5"
        >
          {navLinks(false)}
        </nav>
        <div className="border-t border-cream/20 p-4">
          <p className="mb-3 px-1 text-sm text-cream/80">
            {principal.displayName} ·{' '}
            {principal.role === 'owner'
              ? 'Proprietário'
              : principal.role === 'manager'
                ? 'Gestor'
                : 'Vendedora'}
          </p>
          {principal.id ? (
            <Link
              to={ADMIN_ROUTES.myAccount}
              className="mb-2 flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-bold text-cream hover:bg-cream/10"
            >
              Minha conta
            </Link>
          ) : null}
          <Button
            variant="adminSecondaryOnDark"
            className="w-full"
            disabled={loggingOut}
            aria-busy={loggingOut}
            onClick={() => void onLogout()}
          >
            {loggingOut ? 'Saindo…' : 'Sair'}
          </Button>
        </div>
      </aside>

      <header className="sticky top-0 z-(--z-sticky) flex h-16 items-center justify-between border-b border-line bg-card px-4 lg:hidden">
        <p className="font-serif text-xl font-bold text-plum">
          {activeItem.label}
        </p>
        <div className="relative">
          <button
            ref={menuButtonRef}
            type="button"
            className="admin-utility-trigger grid h-11 w-11 place-items-center rounded-lg border border-line text-plum"
            data-open={menuOpen ? 'true' : undefined}
            aria-expanded={menuOpen}
            aria-controls="admin-utility-menu"
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span aria-hidden="true" className="text-xl leading-none">•••</span>
          </button>
          {menuOpen ? (
            <div
              id="admin-utility-menu"
              className="admin-popover-enter absolute right-0 top-[calc(100%+8px)] min-w-40 rounded-lg border border-line bg-card p-2 shadow-[0_8px_24px_rgba(53,25,42,.16)]"
            >
              <p className="mb-2 px-2 text-sm font-bold text-plum">
                {principal.displayName} ·{' '}
                {principal.role === 'owner'
                  ? 'Proprietário'
                  : principal.role === 'manager'
                    ? 'Gestor'
                    : 'Vendedora'}
              </p>
              {principal.id ? (
                <Link
                  to={ADMIN_ROUTES.myAccount}
                  className="mb-2 flex min-h-11 items-center rounded-lg px-3 text-sm font-bold text-plum hover:bg-cream"
                >
                  Minha conta
                </Link>
              ) : null}
              {principal.role === 'owner' ? (
                <>
                  <Link
                    to={ADMIN_ROUTES.managers}
                    className="mb-2 flex min-h-11 items-center rounded-lg px-3 text-sm font-bold text-plum hover:bg-cream"
                  >
                    Gestores
                  </Link>
                  <Link
                    to={ADMIN_ROUTES.audit}
                    className="mb-2 flex min-h-11 items-center rounded-lg px-3 text-sm font-bold text-plum hover:bg-cream"
                  >
                    Auditoria
                  </Link>
                </>
              ) : null}
              <Button
                variant="adminSecondary"
                className="w-full"
                disabled={loggingOut}
                aria-busy={loggingOut}
                onClick={() => void onLogout()}
              >
                {loggingOut ? 'Saindo…' : 'Sair'}
              </Button>
            </div>
          ) : null}
        </div>
      </header>

      <main
        id="admin-main"
        className="admin-main mx-auto min-h-screen max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-12 xl:px-12"
      >
        <div key={location.pathname} className="admin-route-enter">
          <Routes>
          <Route index element={<Navigate to={roleDefault} replace />} />
          <Route
            path="visao"
            element={
              principal.role === 'seller' ? (
                <Navigate to={roleDefault} replace />
              ) : (
                <AdminOverview
                {...(overviewQuery.status === 'pending'
                  ? { state: 'loading' as const }
                  : overviewQuery.status === 'error'
                    ? {
                        state: 'error' as const,
                        onRetry: () => window.location.reload(),
                      }
                    : {
                        state: 'ready' as const,
                        data: overviewData!,
                        reconnecting:
                          connection.hasEverConnected &&
                          !connection.isWebSocketConnected,
                      })}
                />
              )
            }
          />
          <Route
            path="convidados"
            element={
              principal.role === 'seller' ? (
                <Navigate to={roleDefault} replace />
              ) : (
                <AdminGuests token={token} onUnauthorized={onUnauthorized} />
              )
            }
          />
          <Route
            path="moderacao"
            element={
              principal.role === 'seller' ? (
                <Navigate to={roleDefault} replace />
              ) : (
                <AdminModeration token={token} onUnauthorized={onUnauthorized} />
              )
            }
          />
          <Route
            path="presentes"
            element={<AdminGifts token={token} onUnauthorized={onUnauthorized} />}
          />
          <Route
            path="gestores"
            element={
              principal.role === 'owner' ? (
                <AdminManagers token={token} onUnauthorized={onUnauthorized} />
              ) : (
                <Navigate to={roleDefault} replace />
              )
            }
          />
          <Route
            path="auditoria"
            element={
              principal.role === 'owner' ? (
                <AdminAudit token={token} onUnauthorized={onUnauthorized} />
              ) : (
                <Navigate to={roleDefault} replace />
              )
            }
          />
          <Route
            path="minha-conta"
            element={
              <AdminMyAccount
                token={token}
                onLogout={onLogout}
                onUnauthorized={onUnauthorized}
              />
            }
          />
          <Route
            path="*"
            element={<Navigate to={roleDefault} replace />}
          />
          </Routes>
        </div>
      </main>

      <nav
        aria-label="Seções do painel"
        className="admin-bottom-nav fixed inset-x-0 bottom-0 z-(--z-sticky) flex border-t border-line bg-card lg:hidden"
      >
        {navLinks(true)}
      </nav>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {loggingOut ? 'Encerrando acesso.' : ''}
      </p>
      {currentDestination !== `${location.pathname}${location.search}` ? (
        <Navigate to={currentDestination} replace />
      ) : null}
    </div>
  )
}

export default AdminShell
