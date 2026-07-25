import type { ReactNode } from 'react'

export type ToastProps = {
  children: ReactNode
  className?: string
  action?: ReactNode
  dismissLabel?: string
  onDismiss?: () => void
  tone?: 'status' | 'error'
}

/**
 * Toast primitivo — feedback flutuante fixo no rodapé, `role="status"`
 * para leitores de tela. Referência: `.toast` do globals.css antigo
 * (fundo plum, texto cream, borda cream translúcida, sombra).
 */
export function Toast({
  children,
  className = '',
  action,
  dismissLabel = 'Fechar aviso',
  onDismiss,
  tone = 'status',
}: ToastProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`admin-toast fixed inset-x-0 z-(--z-toast) mx-auto flex w-fit max-w-[min(520px,calc(100vw-32px))] items-center gap-3 border border-cream/30 bg-plum px-[22px] py-[15px] text-center font-sans text-small leading-normal text-cream shadow-[0_10px_40px_rgba(53,25,42,.28)] ${className}`.trim()}
    >
      <span>{children}</span>
      {action}
      {onDismiss ? (
        <button
          type="button"
          aria-label={dismissLabel}
          className="grid min-h-11 min-w-11 place-items-center text-xl"
          onClick={onDismiss}
        >
          ×
        </button>
      ) : null}
    </div>
  )
}

export default Toast
