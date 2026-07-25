import type { HTMLAttributes, ReactNode } from 'react'

export type FeedbackTone = 'neutral' | 'success' | 'warning' | 'error'

export type FeedbackProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
  tone?: FeedbackTone
}

const toneClasses: Record<FeedbackTone, string> = {
  neutral: 'border-line bg-card/45 text-plum/80',
  success: 'border-sea/35 bg-sea/5 text-sea',
  warning:
    'border-rsvp-pendente/35 bg-rsvp-pendente/5 text-rsvp-pendente',
  error: 'border-wine/35 bg-wine/5 text-wine',
}

/**
 * Feedback semântico compartilhado. A borda completa e o fundo tonal
 * substituem a antiga faixa lateral, mantendo estado, contraste e leitura
 * consistentes nas experiências pública e administrativa.
 */
export function Feedback({
  children,
  className = '',
  tone = 'neutral',
  ...props
}: FeedbackProps) {
  return (
    <div
      className={`border p-4 ${toneClasses[tone]} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  )
}

export default Feedback
