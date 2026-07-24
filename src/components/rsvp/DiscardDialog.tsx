import { useEffect, useId, useRef } from 'react'
import { RSVP_COPY } from '../../content/event'
import Button from '../ui/Button'

export type DiscardDialogProps = {
  open: boolean
  onContinueEditing: () => void
  onDiscard: () => void
  returnFocus: () => void
}

export function DiscardDialog({
  open,
  onContinueEditing,
  onDiscard,
  returnFocus,
}: DiscardDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const headingId = useId()
  const bodyId = useId()
  const safeActionId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (!open) {
      if (dialog.open) dialog.close()
      return
    }

    if (!dialog.open) dialog.showModal()
    const focusFrame = window.requestAnimationFrame(() => {
      document.getElementById(safeActionId)?.focus()
    })

    return () => window.cancelAnimationFrame(focusFrame)
  }, [open, safeActionId])

  function continueEditing() {
    dialogRef.current?.close()
    onContinueEditing()
    window.requestAnimationFrame(returnFocus)
  }

  function discardChanges() {
    dialogRef.current?.close()
    onDiscard()
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      aria-describedby={bodyId}
      onCancel={(event) => {
        event.preventDefault()
        continueEditing()
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-[32rem] border border-line bg-card p-6 text-ink shadow-[8px_8px_0_var(--color-sand)] backdrop:bg-plum/55 min-[640px]:p-8 min-[640px]:shadow-[14px_14px_0_var(--color-sand)]"
    >
      <div className="grid gap-6">
        <div className="grid gap-3">
          <h2
            id={headingId}
            className="font-serif text-subheading leading-[1.2] text-plum"
          >
            {RSVP_COPY.discard.heading}
          </h2>
          <p id={bodyId} className="text-body">
            {RSVP_COPY.discard.body}
          </p>
        </div>

        <div className="grid gap-3 min-[520px]:grid-cols-2">
          <Button
            id={safeActionId}
            type="button"
            variant="quiet"
            onClick={continueEditing}
          >
            {RSVP_COPY.discard.safeAction}
          </Button>
          <Button
            type="button"
            variant="quiet"
            className="border-wine bg-wine text-cream hover:bg-plum"
            onClick={discardChanges}
          >
            {RSVP_COPY.discard.destructiveAction}
          </Button>
        </div>
      </div>
    </dialog>
  )
}

export default DiscardDialog
