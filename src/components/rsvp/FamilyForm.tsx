import {
  useEffect,
  useId,
  useRef,
  useState,
  type RefObject,
} from 'react'
import { useMutation } from 'convex/react'
import { Link } from 'react-router'
import { api } from '../../../convex/_generated/api'
import { GIFTS_RSVP_CALLOUT, RSVP_COPY } from '../../content/event'
import {
  CONTACT_MAX_LENGTH,
  buildSparseCommand,
  countRsvpAttendance,
  createRsvpDraft,
  getRsvpSaveSuccessMessage,
  isRsvpDraftDirty,
  reduceRsvpDraft,
  validateRsvpContact,
  type RsvpAttendance,
  type RsvpFamilyView,
} from '../../lib/rsvpDraft'
import Button, { buttonClassName } from '../ui/Button'
import Card from '../ui/Card'
import Field from '../ui/Field'
import Toast from '../ui/Toast'
import AttendanceGroup from './AttendanceGroup'
import DiscardDialog from './DiscardDialog'

export type FamilyFormProps = {
  capability: string
  view: RsvpFamilyView
  announceUnlocked?: boolean
  headingRef: RefObject<HTMLHeadingElement | null>
  onViewChange: (view: RsvpFamilyView) => void
  onSessionExpired: () => void
  onSwitchPhone: () => void
}

type SaveFeedback =
  | { kind: 'success'; text: string }
  | { kind: 'error'; text: string }
  | null

function fillTemplate(
  template: string,
  values: Record<string, string | number>,
) {
  return Object.entries(values).reduce(
    (copy, [key, value]) => copy.replace(`{${key}}`, String(value)),
    template,
  )
}

function retryTime(seconds: number) {
  return seconds === 1 ? '1 segundo' : `${seconds} segundos`
}

export function FamilyForm({
  capability,
  view,
  announceUnlocked = false,
  headingRef,
  onViewChange,
  onSessionExpired,
  onSwitchPhone,
}: FamilyFormProps) {
  const saveResponses = useMutation(api.rsvps.saveResponses)
  const [draft, setDraft] = useState(() => createRsvpDraft(view))
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<SaveFeedback>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [retryBlocked, setRetryBlocked] = useState(false)
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false)
  const [hasSavedSuccessfully, setHasSavedSuccessfully] = useState(false)
  const busyRef = useRef(false)
  const retryTimerRef = useRef<number | null>(null)
  const toastTimerRef = useRef<number | null>(null)
  const contactId = useId()
  const contactGuidanceId = `${contactId}-limit`
  const switchPhoneId = useId()

  useEffect(() => {
    setDraft((current) =>
      reduceRsvpDraft(current, {
        type: 'server_reconciled',
        snapshot: view,
      }),
    )
  }, [view])

  useEffect(
    () => () => {
      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current)
      }
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current)
      }
    },
    [],
  )

  const dirty = isRsvpDraftDirty(draft)
  const counts = countRsvpAttendance(draft.latest.guests)
  const contactValidation = validateRsvpContact(draft.draft.contact)
  const savedSummary = fillTemplate(RSVP_COPY.family.savedSummary, counts)
  const summaryText = dirty
    ? `${savedSummary} · ${RSVP_COPY.save.dirty.toLocaleLowerCase('pt-BR')}`
    : savedSummary

  function resetTransientFeedback() {
    setFeedback(null)
    setToastMessage(null)
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current)
      toastTimerRef.current = null
    }
  }

  function handleAttendanceChange(
    guestRef: string,
    attendance: RsvpAttendance,
  ) {
    resetTransientFeedback()
    setDraft((current) =>
      reduceRsvpDraft(current, {
        type: 'guest_changed',
        guestRef,
        attendance,
      }),
    )
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

  function showSavedFeedback(savedView: RsvpFamilyView) {
    const message = getRsvpSaveSuccessMessage(savedView)
    setFeedback({ kind: 'success', text: message })
    setToastMessage(message)

    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current)
    }
    toastTimerRef.current = window.setTimeout(() => {
      toastTimerRef.current = null
      setToastMessage(null)
    }, 4_500)
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busyRef.current || retryBlocked || !dirty) return

    if (!contactValidation.valid) {
      setFeedback({
        kind: 'error',
        text: `Use no máximo ${CONTACT_MAX_LENGTH} caracteres no contato.`,
      })
      return
    }

    const command = buildSparseCommand(draft)
    busyRef.current = true
    setSaving(true)
    setFeedback(null)

    try {
      const result = await saveResponses({
        token: capability,
        ...command,
      })

      switch (result.kind) {
        case 'saved':
          setDraft(createRsvpDraft(result.view))
          onViewChange(result.view)
          showSavedFeedback(result.view)
          setHasSavedSuccessfully(true)
          break
        case 'rate_limited': {
          const seconds = Math.max(1, result.retryAfterSeconds)
          setFeedback({
            kind: 'error',
            text: RSVP_COPY.save.rateLimited.replace(
              '{tempo}',
              retryTime(seconds),
            ),
          })
          blockForRetry(seconds)
          break
        }
        case 'session_expired':
          onSessionExpired()
          break
        case 'invalid_update':
          setFeedback({
            kind: 'error',
            text: RSVP_COPY.save.failure,
          })
      }
    } catch {
      setFeedback({
        kind: 'error',
        text: RSVP_COPY.save.failure,
      })
    } finally {
      busyRef.current = false
      setSaving(false)
    }
  }

  function handleSwitchPhone() {
    if (dirty) {
      setDiscardDialogOpen(true)
      return
    }

    onSwitchPhone()
  }

  function focusSwitchPhone() {
    document.getElementById(switchPhoneId)?.focus()
  }

  const persistentStatus =
    feedback?.text ??
    (dirty ? RSVP_COPY.save.dirty : RSVP_COPY.save.clean)

  return (
    <>
      <Card className="grid gap-8 shadow-[8px_8px_0_var(--color-sand)] min-[640px]:shadow-[14px_14px_0_var(--color-sand)]">
        {announceUnlocked ? (
          <p className="sr-only" role="status" aria-live="polite">
            {RSVP_COPY.session.unlocked}
          </p>
        ) : null}

        <div className="grid gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="text-small font-bold uppercase tracking-label text-plum/75">
              {RSVP_COPY.family.kicker}
            </p>
            <Button
              id={switchPhoneId}
              type="button"
              variant="quiet"
              className="min-h-11 px-4 py-2 motion-reduce:transform-none motion-reduce:transition-none"
              onClick={handleSwitchPhone}
            >
              {RSVP_COPY.session.switchPhone}
            </Button>
          </div>

          <h2
            ref={headingRef}
            tabIndex={-1}
            className="break-words font-serif text-subheading leading-[1.2] text-plum"
          >
            {fillTemplate(RSVP_COPY.family.greeting, {
              displayName: view.displayName,
            })}
          </h2>

          <p aria-live="polite" className="text-small text-plum/80">
            {summaryText}
          </p>
        </div>

        {draft.latest.guests.length === 0 ? (
          <p role="status" className="border-l-4 border-rsvp-pendente pl-4 text-body">
            {RSVP_COPY.family.zeroGuests}
          </p>
        ) : (
          <form
            noValidate
            aria-busy={saving}
            onSubmit={handleSave}
            className="grid gap-8"
          >
            <div className="grid gap-5">
              <h3 className="font-serif text-subheading leading-[1.2] text-plum">
                {RSVP_COPY.family.formHeading}
              </h3>
              <div>
                {draft.latest.guests.map((guest) => (
                  <AttendanceGroup
                    key={guest.guestRef}
                    name={guest.name}
                    value={
                      draft.draft.guestAttendance[guest.guestRef] ??
                      guest.attendance
                    }
                    disabled={saving}
                    onChange={(attendance) =>
                      handleAttendanceChange(guest.guestRef, attendance)
                    }
                  />
                ))}
              </div>
            </div>

            <div>
              <Field
                id={contactId}
                label={RSVP_COPY.contact.label}
                hint={RSVP_COPY.contact.hint}
                placeholder={RSVP_COPY.contact.placeholder}
                maxLength={CONTACT_MAX_LENGTH}
                value={draft.draft.contact}
                disabled={saving}
                aria-describedby={contactGuidanceId}
                onChange={(event) => {
                  const value = event.currentTarget.value
                  resetTransientFeedback()
                  setDraft((current) =>
                    reduceRsvpDraft(current, {
                      type: 'contact_changed',
                      value,
                    }),
                  )
                }}
              />
              <p
                id={contactGuidanceId}
                className="-mt-3 text-right text-small text-plum/80"
              >
                {contactValidation.length}/{CONTACT_MAX_LENGTH} caracteres
              </p>
            </div>

            <div className="grid gap-4">
              <div
                role={feedback?.kind === 'error' ? 'alert' : 'status'}
                aria-live="polite"
                className={`min-h-[3.25rem] border-l-4 pl-4 text-small ${
                  feedback?.kind === 'error'
                    ? 'border-wine text-wine'
                    : feedback?.kind === 'success'
                      ? 'border-sea text-sea'
                      : 'border-line text-plum/80'
                }`}
              >
                <p>{persistentStatus}</p>
              </div>

              <Button
                type="submit"
                variant="rsvp"
                className="w-full aria-disabled:cursor-not-allowed aria-disabled:opacity-50 motion-reduce:transform-none motion-reduce:transition-none"
                aria-disabled={
                  saving ||
                  retryBlocked ||
                  !dirty ||
                  !contactValidation.valid
                }
                aria-busy={saving}
              >
                {saving ? RSVP_COPY.save.busy : RSVP_COPY.save.submit}
              </Button>

              <p className="text-center text-small text-plum/80">
                {RSVP_COPY.contact.hint}
              </p>

              {hasSavedSuccessfully ? (
                <aside className="grid gap-4 border border-sand bg-cream p-6 text-plum">
                  <div className="grid gap-2">
                    <h3 className="font-serif text-[28px] font-normal leading-[1.08] tracking-display">
                      {GIFTS_RSVP_CALLOUT.heading}
                    </h3>
                    <p className="text-[16px] leading-[1.62]">
                      {GIFTS_RSVP_CALLOUT.body}
                    </p>
                  </div>
                  <Link
                    to={GIFTS_RSVP_CALLOUT.href}
                    className={buttonClassName(
                      'rsvp',
                      'w-full text-center motion-reduce:transform-none motion-reduce:transition-none',
                    )}
                  >
                    {GIFTS_RSVP_CALLOUT.cta}
                  </Link>
                </aside>
              ) : null}
            </div>
          </form>
        )}
      </Card>

      {toastMessage ? <Toast>{toastMessage}</Toast> : null}
      <DiscardDialog
        open={discardDialogOpen}
        onContinueEditing={() => setDiscardDialogOpen(false)}
        onDiscard={() => {
          setDiscardDialogOpen(false)
          onSwitchPhone()
        }}
        returnFocus={focusSwitchPhone}
      />
    </>
  )
}

export default FamilyForm
