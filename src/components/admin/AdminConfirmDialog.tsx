import { useEffect, useId, useRef, useState } from 'react'
import Button from '../ui/Button'

type AdminConfirmDialogProps = {
  open: boolean
  title: string
  body: string
  confirmLabel: string
  cancelLabel?: string
  busy?: boolean
  acknowledgement?: string
  onCancel: () => void
  onConfirm: () => void
  returnFocus?: () => void
}

export function AdminConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Voltar',
  busy = false,
  acknowledgement,
  onCancel,
  onConfirm,
  returnFocus,
}: AdminConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [acknowledged, setAcknowledged] = useState(false)
  const titleId = useId()
  const bodyId = useId()
  const cancelId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      setAcknowledged(false)
      dialog.showModal()
      window.requestAnimationFrame(() => document.getElementById(cancelId)?.focus())
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [cancelId, open])

  function cancel() {
    if (busy) return
    dialogRef.current?.close()
    onCancel()
    window.requestAnimationFrame(() => returnFocus?.())
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onCancel={(event) => {
        event.preventDefault()
        cancel()
      }}
      className="admin-dialog m-auto w-[calc(100%-2rem)] max-w-lg rounded-lg border border-line bg-card p-6 text-ink backdrop:bg-plum/55 sm:p-8"
    >
      <h2 id={titleId} className="font-serif text-2xl font-bold text-plum">
        {title}
      </h2>
      <p id={bodyId} className="mt-3 leading-relaxed">{body}</p>
      {acknowledgement ? (
        <label className="mt-5 flex min-h-11 items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5"
            checked={acknowledged}
            disabled={busy}
            onChange={(event) => setAcknowledged(event.currentTarget.checked)}
          />
          <span>{acknowledgement}</span>
        </label>
      ) : null}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Button
          id={cancelId}
          variant="adminSecondary"
          disabled={busy}
          onClick={cancel}
        >
          {cancelLabel}
        </Button>
        <Button
          variant="adminDestructive"
          disabled={busy || (Boolean(acknowledgement) && !acknowledged)}
          aria-busy={busy}
          onClick={onConfirm}
        >
          {busy ? 'Removendo…' : confirmLabel}
        </Button>
      </div>
    </dialog>
  )
}

export default AdminConfirmDialog
