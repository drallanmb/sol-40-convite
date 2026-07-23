import type { ReactNode } from 'react'

export type ShellProps = {
  children: ReactNode
  nav?: ReactNode
}

/**
 * Shell base — topbar (wordmark + slot de navegação) + main (children) +
 * footer, mobile-first (empilha no mobile, espaça no desktop). Referência
 * de estilo (adaptada, sem o comportamento de scroll/countdown — Phase 2):
 * `.topbar`/`.site-footer` do globals.css antigo (sol-40-integrado).
 */
export function Shell({ children, nav }: ShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-cream text-ink">
      <header className="sticky top-0 z-(--z-sticky) border-b border-line bg-cream/90 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-4 px-4 sm:px-8">
          <span className="font-serif text-lead tracking-display">Sol faz 40</span>
          {nav ? (
            <nav className="flex items-center gap-4 text-small uppercase tracking-label sm:gap-6">{nav}</nav>
          ) : null}
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="grid place-content-center gap-2 bg-plum px-4 py-16 text-center text-cream sm:py-24">
        <h2 className="font-serif text-heading leading-[0.9] tracking-display">
          Sol <em className="not-italic text-coral">faz 40</em>
        </h2>
        <p className="text-caption font-bold uppercase tracking-label opacity-80">
          17 de outubro de 2026 · Matapuã Eventos · Aracaju/SE
        </p>
      </footer>
    </div>
  )
}

export default Shell
