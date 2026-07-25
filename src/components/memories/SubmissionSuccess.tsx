import { useEffect, useRef } from 'react'
import Button from '../ui/Button'
import Card from '../ui/Card'

export type SubmissionSuccessProps = {
  onSendAnother: () => void
}

export function SubmissionSuccess({
  onSendAnother,
}: SubmissionSuccessProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <Card
      role="status"
      aria-live="polite"
      className="grid gap-6 text-center"
    >
      <div className="grid gap-3">
        <p className="text-small font-bold uppercase tracking-label text-sea">
          Memória recebida
        </p>
        <h3
          ref={headingRef}
          tabIndex={-1}
          className="font-serif text-subheading leading-tight text-plum outline-none"
        >
          Obrigada por fazer parte desta história.
        </h3>
        <p className="text-body text-ink">
          Sua memória aguarda aprovação antes de aparecer no mural.
        </p>
      </div>
      <Button variant="rsvp" className="w-full" onClick={onSendAnother}>
        Enviar outra memória
      </Button>
    </Card>
  )
}

export default SubmissionSuccess
