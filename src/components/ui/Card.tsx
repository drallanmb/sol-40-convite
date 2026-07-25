import type { HTMLAttributes, ReactNode } from 'react'

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
  variant?: 'public' | 'login' | 'operational'
}

/**
 * Card primitivo — superfície cream com borda `line` e sombra offset.
 * Referência: `.rsvp-form`/`.memory-card` do globals.css antigo
 * (fundo #fffaf1, borda --line, box-shadow deslocado em --sand).
 */
export function Card({
  children,
  className = '',
  variant = 'public',
  ...props
}: CardProps) {
  const variantClasses = {
    public:
      'border border-line bg-card p-6 shadow-[14px_14px_0_var(--color-sand)] sm:p-8',
    login:
      'border border-line bg-card p-6 shadow-[14px_14px_0_var(--color-sand)] sm:p-8',
    operational: 'rounded-lg border border-line bg-card p-4 shadow-none sm:p-6',
  } as const
  return (
    <div
      className={`${variantClasses[variant]} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  )
}

export default Card
