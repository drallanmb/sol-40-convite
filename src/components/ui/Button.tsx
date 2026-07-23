import type { ButtonHTMLAttributes } from 'react'

export type ButtonVariant = 'primary' | 'quiet'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
}

const baseClasses =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[100px] px-6 py-4 font-sans text-small font-bold uppercase tracking-label transition-[transform,background-color,border-color,color] duration-(--duration-fast) ease-out disabled:cursor-not-allowed disabled:opacity-50 aria-[busy=true]:cursor-progress'

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'border-0 bg-orange text-cream hover:bg-plum active:scale-[0.98]',
  quiet: 'border border-plum bg-transparent text-plum hover:bg-plum/5 active:scale-[0.98]',
}

/**
 * Botão primitivo — variantes `primary` (fundo orange, texto cream) e
 * `quiet` (borda, transparente). Referência: `.button-primary`/`.button-quiet`
 * do globals.css antigo (sol-40-integrado), portado para os tokens do
 * `@theme` (src/index.css).
 */
export function Button({ variant = 'primary', className = '', disabled, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={`${baseClasses} ${variantClasses[variant]} ${className}`.trim()}
      disabled={disabled}
      {...props}
    />
  )
}

export default Button
