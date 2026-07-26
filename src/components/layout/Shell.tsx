import { useEffect, useId, useRef, useState } from 'react'
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router'
import CountdownRail from '../invite/CountdownRail'
import { FOOTER, SECTION_IDS, type NavLink } from '../../content/event'

export type ShellProps = {
  children: ReactNode
  /** Topbar nav entries, sourced from `NAV_LINKS` (content/event.ts). No links → no nav, no hamburger. */
  navLinks?: NavLink[]
  /** Mounts the compact countdown rail below the topbar, revealed once the real countdown has scrolled past. */
  showCountdownRail?: boolean
  /** Href for the wordmark. Omitted → wordmark renders as a plain (non-link) mark. */
  wordmarkHref?: string
}

const MAIN_ID = 'conteudo'

type NavigationAnchorProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string
}

function NavigationAnchor({ href, ...props }: NavigationAnchorProps) {
  return href.startsWith('/') ? <Link to={href} {...props} /> : <a href={href} {...props} />
}

/**
 * Shell base — topbar (wordmark + nav + mobile hamburger + optional compact
 * countdown rail) + skip link + main (children) + footer, mobile-first.
 * Reference for scroll/menu behaviour (adapted to React state, not the
 * original class-toggling): `.topbar`/`.menu-toggle`/`.countdown-rail` in
 * `globals.css` from `sol-40-integrado` (Phase 2, plan 02-07).
 *
 * All three new props are optional so `NotFound.tsx` keeps rendering with no
 * topbar nav, unchanged.
 */
export function Shell({ children, navLinks, showCountdownRail = false, wordmarkHref }: ShellProps) {
  const [scrolled, setScrolled] = useState(false)
  const [railRevealed, setRailRevealed] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuId = useId()
  const menuToggleRef = useRef<HTMLButtonElement>(null)
  const mobileNavRef = useRef<HTMLElement>(null)

  const hasNav = Boolean(navLinks && navLinks.length > 0)

  // Basic keyboard/focus management for the mobile hamburger panel (WR-03):
  // Escape closes it and returns focus to the toggle button, and opening it
  // moves focus to the first link so keyboard/AT users land inside the newly
  // revealed navigation region instead of being left on the button with no
  // signal anything changed. Link clicks keep closing the panel through
  // their own `onClick` below, unaffected by this effect.
  useEffect(() => {
    if (!menuOpen) return

    // Wait until the reveal transition has promoted the panel from
    // `visibility: hidden` before moving focus into it. Focusing a descendant
    // during that discrete visibility transition is ignored by Chromium and
    // WebKit. Reduced-motion users do not need the delay.
    const focusDelay = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 0
      : 280
    const focusTimer = window.setTimeout(() => {
      const firstLink = mobileNavRef.current?.querySelector<HTMLAnchorElement>('a')
      firstLink?.focus()
    }, focusDelay)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      menuToggleRef.current?.focus()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  // Single scroll listener for the whole page: CountdownRail deliberately
  // has none of its own. Throttled through requestAnimationFrame so a burst
  // of scroll events never schedules more than one state update per frame,
  // registered passive so it can never block scrolling.
  useEffect(() => {
    let frame = 0

    const readScrollState = () => {
      frame = 0
      setScrolled(window.scrollY > 12)

      // Derive the reveal threshold from the countdown section's own
      // position via its stable id (WR-05) rather than DOM adjacency to the
      // hero (`heroEl.nextElementSibling`), which would silently degrade if
      // a future change ever reorders sections: reveal once its bottom edge
      // has scrolled above the viewport top, i.e. the real countdown is no
      // longer visible.
      const countdownEl = document.getElementById(SECTION_IDS.countdown)
      if (countdownEl) {
        setRailRevealed(countdownEl.getBoundingClientRect().bottom <= 0)
      } else {
        // Fallback for routes without the invite composition (or before the
        // DOM has settled): roughly a viewport for the hero plus one more
        // for the countdown section itself.
        setRailRevealed(window.scrollY > window.innerHeight * 2)
      }
    }

    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(readScrollState)
    }

    readScrollState()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  const headerChromeClasses = scrolled
    ? 'border-line bg-cream/[.82] shadow-[0_4px_8px_rgba(53,25,42,0.1)] backdrop-blur-xl backdrop-saturate-[1.2]'
    : 'border-transparent bg-transparent'

  const wordmarkMark = (
    <img src="/sol-symbol.png" alt="" width={58} height={50} className="h-[50px] w-[58px] object-contain" />
  )

  return (
    <div className="flex min-h-screen flex-col bg-cream text-ink">
      {/* Skip link — visually hidden until focused, first focusable element on the page. */}
      <a
        href={`#${MAIN_ID}`}
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-(--z-skip) focus:rounded-full focus:bg-plum focus:px-4 focus:py-3 focus:text-small focus:font-bold focus:uppercase focus:tracking-label focus:text-cream"
      >
        Pular para o conteúdo
      </a>

      <header
        className={`sticky top-0 z-(--z-sticky) border-b text-plum transition-[background-color,border-color,box-shadow] duration-(--duration-medium) ease-out ${headerChromeClasses}`}
      >
        <div className="relative mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-4 px-4 sm:px-8">
          {wordmarkHref ? (
            <NavigationAnchor
              href={wordmarkHref}
              aria-label="Sol faz 40 — voltar ao início"
              className="flex min-h-[44px] w-[58px] items-center justify-center"
            >
              {wordmarkMark}
            </NavigationAnchor>
          ) : (
            <span
              role="img"
              aria-label="Sol faz 40"
              className="flex min-h-[44px] w-[58px] items-center justify-center"
            >
              {wordmarkMark}
            </span>
          )}

          {hasNav ? (
            <>
              <nav
                aria-label="Navegação principal"
                className="hidden flex-1 items-center justify-center gap-6 text-small uppercase tracking-label lg:flex"
              >
                {navLinks!.map((link) => (
                  <NavigationAnchor
                    key={link.href}
                    href={link.href}
                    className="nav-link flex min-h-[44px] items-center opacity-80 transition-opacity duration-(--duration-fast) ease-out hover:opacity-100"
                  >
                    {link.label}
                  </NavigationAnchor>
                ))}
              </nav>

              <NavigationAnchor
                href="/admin"
                aria-label="Login administrativo"
                className="hidden min-h-[44px] items-center px-2 text-small uppercase tracking-label opacity-60 transition-opacity duration-(--duration-fast) ease-out hover:opacity-100 lg:flex"
              >
                Login
              </NavigationAnchor>

              <button
                ref={menuToggleRef}
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-controls={menuId}
                aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
                className="relative flex h-11 min-h-[44px] w-11 flex-col items-center justify-center gap-[6px] lg:hidden"
              >
                <span
                  className={`block h-0.5 w-[22px] rounded-full bg-current transition-transform duration-(--duration-fast) ease-out ${
                    menuOpen ? 'translate-y-[8px] rotate-45' : ''
                  }`}
                />
                <span
                  className={`block h-0.5 w-[22px] rounded-full bg-current transition-opacity duration-(--duration-fast) ease-out ${
                    menuOpen ? 'opacity-0' : 'opacity-100'
                  }`}
                />
                <span
                  className={`block h-0.5 w-[22px] rounded-full bg-current transition-transform duration-(--duration-fast) ease-out ${
                    menuOpen ? '-translate-y-[8px] -rotate-45' : ''
                  }`}
                />
              </button>
            </>
          ) : null}
        </div>

        {hasNav ? (
          <nav
            ref={mobileNavRef}
            id={menuId}
            aria-label="Navegação mobile"
            className={`absolute inset-x-0 top-full flex flex-col gap-1 border-b border-line bg-cream px-4 py-4 text-small uppercase tracking-label transition-[opacity,transform,visibility] duration-(--duration-medium) ease-out lg:hidden ${
              menuOpen
                ? 'visible pointer-events-auto translate-y-0 opacity-100'
                : 'invisible pointer-events-none -translate-y-2 opacity-0'
            }`}
            style={{
              transitionDelay: menuOpen
                ? '0s'
                : '0s, 0s, var(--duration-medium)',
            }}
          >
            {navLinks!.map((link) => (
              <NavigationAnchor
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="nav-link flex min-h-[44px] items-center px-2"
              >
                {link.label}
              </NavigationAnchor>
            ))}
            <NavigationAnchor
              href="/admin"
              aria-label="Login administrativo"
              onClick={() => setMenuOpen(false)}
              className="mt-2 flex min-h-[44px] items-center border-t border-line px-2 pt-3 opacity-70 transition-opacity duration-(--duration-fast) ease-out hover:opacity-100"
            >
              Login
            </NavigationAnchor>
          </nav>
        ) : null}

        {showCountdownRail ? (
          <CountdownRail revealed={railRevealed && !menuOpen} />
        ) : null}
      </header>

      <main id={MAIN_ID} tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>

      <footer className="sunset-footer relative overflow-hidden bg-plum text-plum">
        <div className="sunset-footer__sky" aria-hidden="true" />

        <div className="sunset-footer__sun absolute left-1/2 top-6 z-20 flex -translate-x-1/2 flex-col items-center justify-center px-6 pb-8 text-center sm:pb-12">
          <h2 className="font-serif text-[clamp(4.75rem,9vw,6rem)] leading-[0.88] tracking-display">
            {FOOTER.title}
          </h2>
          <p className="mt-4 font-serif text-[clamp(2rem,4vw,2.625rem)] italic leading-none">
            {FOOTER.anniversary}
          </p>
        </div>

        <div className="sunset-footer__base relative z-10 flex flex-col items-center justify-end gap-3 bg-plum px-5 py-5 text-center text-cream sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-12">
          <p className="text-[0.6875rem] font-bold uppercase tracking-[0.04em] sm:text-caption">
            Feito com 🧠 + 🫀 + 🤖 por{' '}
            <a
              href="https://drallanmesquitabrito.com.br/"
              target="_blank"
              rel="noreferrer"
              className="normal-case underline decoration-cream/40 underline-offset-4 transition-colors duration-(--duration-fast) ease-out hover:text-peach"
            >
              anamnesis.MD
            </a>
          </p>
          <p className="text-[0.6875rem] font-bold uppercase tracking-[0.04em] sm:text-caption">
            <time dateTime={FOOTER.dateTime}>{FOOTER.date}</time>{' '}
            <span aria-hidden="true">·</span> {FOOTER.venue}{' '}
            <span aria-hidden="true">·</span> {FOOTER.city}
          </p>
        </div>
      </footer>
    </div>
  )
}

export default Shell
