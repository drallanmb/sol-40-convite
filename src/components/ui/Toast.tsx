import type { ReactNode } from 'react'

export type ToastProps = {
  children: ReactNode
  className?: string
}

/**
 * Toast primitivo — feedback flutuante fixo no rodapé, `role="status"`
 * para leitores de tela. Referência: `.toast` do globals.css antigo
 * (fundo plum, texto cream, borda cream translúcida, sombra).
 */
export function Toast({ children, className = '' }: ToastProps) {
  return (
    <div
      role="status"
      className={`fixed inset-x-0 bottom-[max(26px,env(safe-area-inset-bottom))] z-(--z-toast) mx-auto w-fit max-w-[min(520px,calc(100vw-32px))] border border-cream/30 bg-plum px-[22px] py-[15px] text-center font-sans text-small leading-normal text-cream shadow-[0_10px_40px_rgba(53,25,42,.28)] ${className}`.trim()}
    >
      {children}
    </div>
  )
}

export default Toast
