import { useEffect, useId, useRef, useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { RSVP_COPY } from '../../content/event'
import {
  unlockRsvpWithFreshCapability,
  type RsvpUnlockClientResult,
} from '../../lib/rsvpSession'
import Button from '../ui/Button'
import Card from '../ui/Card'
import Field from '../ui/Field'

export type PhoneGateProps = {
  notice?: 'expired'
  focusInput?: boolean
  onUnlocked: (capability: string) => void
}

type PhoneMessage =
  | { kind: 'local-invalid'; text: string }
  | { kind: 'not-found'; text: string }
  | { kind: 'rate-limited'; text: string }
  | { kind: 'connection'; text: string }
  | null

function retryTime(seconds: number) {
  return seconds === 1 ? '1 segundo' : `${seconds} segundos`
}

function obviouslyIncompletePhone(phone: string) {
  return (phone.match(/\d/gu) ?? []).length < 10
}

export function PhoneGate({
  notice,
  focusInput = false,
  onUnlocked,
}: PhoneGateProps) {
  const unlockByPhone = useMutation(api.rsvps.unlockByPhone)
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState<PhoneMessage>(null)
  const [busy, setBusy] = useState(false)
  const [retryBlocked, setRetryBlocked] = useState(false)
  const busyRef = useRef(false)
  const retryTimerRef = useRef<number | null>(null)
  const fieldId = useId()
  const messageId = `${fieldId}-message`

  useEffect(() => {
    if (focusInput) {
      document.getElementById(fieldId)?.focus()
    }
  }, [fieldId, focusInput])

  useEffect(
    () => () => {
      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current)
      }
    },
    [],
  )

  function focusPhone() {
    window.requestAnimationFrame(() => {
      document.getElementById(fieldId)?.focus()
    })
  }

  function blockForRetry(seconds: number) {
    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current)
    }

    setRetryBlocked(true)
    retryTimerRef.current = window.setTimeout(() => {
      retryTimerRef.current = null
      setRetryBlocked(false)
    }, seconds * 1000)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busyRef.current || retryBlocked) return

    if (obviouslyIncompletePhone(phone)) {
      setMessage({
        kind: 'local-invalid',
        text: RSVP_COPY.phone.localInvalid,
      })
      focusPhone()
      return
    }

    busyRef.current = true
    setBusy(true)
    setMessage(null)

    let result: RsvpUnlockClientResult
    try {
      result = await unlockRsvpWithFreshCapability((token) =>
        unlockByPhone({
          phone,
          token,
        }),
      )
    } catch {
      result = { kind: 'failed' }
    }

    busyRef.current = false
    setBusy(false)

    switch (result.kind) {
      case 'unlocked':
        setPhone('')
        onUnlocked(result.capability)
        return
      case 'not_found':
        setMessage({
          kind: 'not-found',
          text: RSVP_COPY.phone.notFound,
        })
        focusPhone()
        return
      case 'rate_limited': {
        const seconds = Math.max(1, result.retryAfterSeconds)
        setMessage({
          kind: 'rate-limited',
          text: RSVP_COPY.phone.rateLimited.replace(
            '{tempo}',
            retryTime(seconds),
          ),
        })
        blockForRetry(seconds)
        return
      }
      case 'failed':
        setMessage({
          kind: 'connection',
          text: RSVP_COPY.phone.connectionError,
        })
    }
  }

  const invalid =
    message?.kind === 'local-invalid' || message?.kind === 'not-found'

  return (
    <Card className="shadow-[8px_8px_0_var(--color-sand)] min-[640px]:shadow-[14px_14px_0_var(--color-sand)]">
      <form
        noValidate
        aria-busy={busy}
        onSubmit={handleSubmit}
        className="grid gap-6"
      >
        <div className="grid gap-3">
          <h2 className="font-serif text-subheading leading-[1.2] text-plum">
            {RSVP_COPY.phone.heading}
          </h2>
          <p className="text-body">{RSVP_COPY.phone.body}</p>
        </div>

        {notice === 'expired' ? (
          <p role="alert" className="border-l-4 border-wine pl-4 text-small text-wine">
            {RSVP_COPY.session.expired}
          </p>
        ) : null}

        <div>
          <Field
            id={fieldId}
            label={RSVP_COPY.phone.label}
            hint={RSVP_COPY.phone.hint}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder={RSVP_COPY.phone.placeholder}
            value={phone}
            aria-invalid={invalid || undefined}
            aria-describedby={messageId}
            onChange={(event) => {
              setPhone(event.currentTarget.value)
              if (message?.kind !== 'rate-limited') {
                setMessage(null)
              }
            }}
          />
          <div
            id={messageId}
            className="min-h-[3.25rem] text-small text-wine"
          >
            {message ? <p role="alert">{message.text}</p> : null}
          </div>
        </div>

        <Button
          type="submit"
          variant="rsvp"
          className="w-full"
          disabled={busy || retryBlocked}
          aria-busy={busy}
        >
          {busy ? RSVP_COPY.phone.busy : RSVP_COPY.phone.submit}
        </Button>

        <p className="text-center text-caption opacity-70">
          {RSVP_COPY.phone.privacy}
        </p>
      </form>
    </Card>
  )
}

export default PhoneGate
