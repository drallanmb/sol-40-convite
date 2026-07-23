import type { HTMLAttributes, ReactNode } from 'react'

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
}

/**
 * Card primitivo — superfície cream com borda `line` e sombra offset.
 * Referência: `.rsvp-form`/`.memory-card` do globals.css antigo
 * (fundo #fffaf1, borda --line, box-shadow deslocado em --sand).
 */
export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div
      className={`border border-line bg-[#fffaf1] p-6 shadow-[14px_14px_0_var(--color-sand)] sm:p-8 ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  )
}

export default Card
