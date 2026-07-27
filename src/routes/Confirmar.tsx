import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useConvex } from 'convex/react'
import { api } from '../../convex/_generated/api'
import FamilyForm from '../components/rsvp/FamilyForm'
import PhoneGate from '../components/rsvp/PhoneGate'
import Shell from '../components/layout/Shell'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Feedback from '../components/ui/Feedback'
import {
  RSVP_COPY,
  RSVP_NAV_LINKS,
} from '../content/event'
import { getRsvpDeadlinePresentation, getRsvpNow } from '../lib/rsvpClock'
import type { RsvpFamilyView } from '../lib/rsvpDraft'
import {
  RSVP_CAPABILITY_STORAGE_KEY,
  clearRsvpCapability,
  readRsvpCapability,
  storeRsvpCapability,
} from '../lib/rsvpSession'

type RouteState =
  | { kind: 'restoring' }
  | { kind: 'phone'; notice?: 'expired'; focusInput: boolean }
  | {
      kind: 'family-loading'
      capability: string
      announceOnSuccess: boolean
    }
  | {
      kind: 'family-error'
      capability: string
      announceOnSuccess: boolean
    }
  | {
      kind: 'family'
      capability: string
      view: RsvpFamilyView
      announce: boolean
    }

function browserSessionStorage() {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function storageContainsCapabilityKey(storage: Storage) {
  try {
    for (let index = 0; index < storage.length; index += 1) {
      if (storage.key(index) === RSVP_CAPABILITY_STORAGE_KEY) {
        return true
      }
    }
  } catch {
    return false
  }

  return false
}

const ROUTE_HEADING_EMPHASIS = 'vocês.'

type LoadingCardProps = {
  label: string
}

function LoadingCard({ label }: LoadingCardProps) {
  return (
    <Card
      aria-busy="true"
      className="grid min-h-[25rem] content-start gap-6 shadow-[8px_8px_0_var(--color-sand)] min-[640px]:shadow-[14px_14px_0_var(--color-sand)]"
    >
      <img
        src="/sol-symbol.png"
        alt=""
        width={58}
        height={50}
        className="h-[50px] w-[58px] object-contain"
      />
      <p role="status" aria-live="polite" className="font-serif text-subheading text-plum">
        {label}
      </p>
      <div aria-hidden="true" className="grid gap-3">
        <span className="h-12 bg-sand/55" />
        <span className="h-12 bg-sand/55" />
        <span className="h-12 bg-sand/55" />
      </div>
    </Card>
  )
}

type FamilyReadErrorCardProps = {
  onRetry: () => void
  onSwitchPhone: () => void
}

function FamilyReadErrorCard({
  onRetry,
  onSwitchPhone,
}: FamilyReadErrorCardProps) {
  return (
    <Card className="grid gap-6 shadow-[8px_8px_0_var(--color-sand)] min-[640px]:shadow-[14px_14px_0_var(--color-sand)]">
      <Feedback role="alert" tone="error" className="text-small">
        {RSVP_COPY.phone.connectionError}
      </Feedback>
      <div className="grid gap-3 min-[420px]:grid-cols-2">
        <Button
          type="button"
          variant="rsvp"
          className="motion-reduce:transform-none motion-reduce:transition-none"
          onClick={onRetry}
        >
          Tentar novamente
        </Button>
        <Button
          type="button"
          variant="quiet"
          className="motion-reduce:transform-none motion-reduce:transition-none"
          onClick={onSwitchPhone}
        >
          {RSVP_COPY.session.switchPhone}
        </Button>
      </div>
    </Card>
  )
}

function Confirmar() {
  const convex = useConvex()
  const [routeState, setRouteState] = useState<RouteState>({
    kind: 'restoring',
  })
  const routeHeadingRef = useRef<HTMLHeadingElement>(null)
  const familyHeadingRef = useRef<HTMLHeadingElement>(null)
  const restoreStartedRef = useRef(false)
  const requestSequenceRef = useRef(0)
  const deadline = useMemo(
    () => getRsvpDeadlinePresentation(getRsvpNow()),
    [],
  )

  const clearScopedState = useCallback((focusInput: boolean) => {
    requestSequenceRef.current += 1
    const storage = browserSessionStorage()
    if (storage) {
      clearRsvpCapability(storage)
    }
    setRouteState({ kind: 'phone', focusInput })
  }, [])

  const expireScopedState = useCallback(() => {
    requestSequenceRef.current += 1
    const storage = browserSessionStorage()
    if (storage) {
      clearRsvpCapability(storage)
    }
    setRouteState({
      kind: 'phone',
      notice: 'expired',
      focusInput: true,
    })
  }, [])

  const loadFamily = useCallback(
    async (capability: string, announceOnSuccess: boolean) => {
      const requestSequence = requestSequenceRef.current + 1
      requestSequenceRef.current = requestSequence
      setRouteState({
        kind: 'family-loading',
        capability,
        announceOnSuccess,
      })

      try {
        const view = await convex.query(api.rsvps.getCurrent, {
          token: capability,
        })
        if (requestSequenceRef.current !== requestSequence) return

        if (view === null) {
          expireScopedState()
          return
        }

        setRouteState({
          kind: 'family',
          capability,
          view,
          announce: announceOnSuccess,
        })
      } catch {
        if (requestSequenceRef.current !== requestSequence) return
        setRouteState({
          kind: 'family-error',
          capability,
          announceOnSuccess,
        })
      }
    },
    [convex, expireScopedState],
  )

  useEffect(() => {
    routeHeadingRef.current?.focus()
  }, [])

  useEffect(() => {
    if (routeState.kind === 'family' && routeState.announce) {
      familyHeadingRef.current?.focus()
    }
  }, [routeState])

  useEffect(() => {
    if (restoreStartedRef.current) return
    restoreStartedRef.current = true

    const storage = browserSessionStorage()
    if (!storage) {
      setRouteState({ kind: 'phone', focusInput: false })
      return
    }

    const hadStoredValue = storageContainsCapabilityKey(storage)
    const capability = readRsvpCapability(storage)
    if (capability) {
      void loadFamily(capability, false)
      return
    }

    setRouteState({
      kind: 'phone',
      ...(hadStoredValue ? { notice: 'expired' as const } : {}),
      focusInput: hadStoredValue,
    })
  }, [loadFamily])

  function handleUnlocked(capability: string) {
    const storage = browserSessionStorage()
    if (storage) {
      storeRsvpCapability(storage, capability)
    }
    void loadFamily(capability, true)
  }

  let stateCard
  switch (routeState.kind) {
    case 'restoring':
      stateCard = <LoadingCard label={RSVP_COPY.session.restoring} />
      break
    case 'family-loading':
      stateCard = <LoadingCard label="Abrindo seu convite…" />
      break
    case 'phone':
      stateCard = (
        <PhoneGate
          notice={routeState.notice}
          focusInput={routeState.focusInput}
          onUnlocked={handleUnlocked}
        />
      )
      break
    case 'family-error':
      stateCard = (
        <FamilyReadErrorCard
          onRetry={() =>
            void loadFamily(
              routeState.capability,
              routeState.announceOnSuccess,
            )
          }
          onSwitchPhone={() => clearScopedState(true)}
        />
      )
      break
    case 'family':
      stateCard = (
        <FamilyForm
          capability={routeState.capability}
          view={routeState.view}
          announceUnlocked={routeState.announce}
          headingRef={familyHeadingRef}
          onViewChange={(view) =>
            setRouteState((current) =>
              current.kind === 'family'
                ? {
                    ...current,
                    view,
                    announce: false,
                  }
                : current,
            )
          }
          onSessionExpired={expireScopedState}
          onSwitchPhone={() => clearScopedState(true)}
        />
      )
  }

  return (
    <Shell
      navLinks={RSVP_NAV_LINKS}
      showCountdownRail={false}
      wordmarkHref="/"
    >
      <section className="px-4 pb-[max(3rem,env(safe-area-inset-bottom))] pt-12 sm:px-8 sm:pb-[max(4rem,env(safe-area-inset-bottom))] sm:pt-16">
        <div className="mx-auto grid max-w-[704px] gap-12 sm:gap-16 lg:max-w-[1120px] lg:grid-cols-[minmax(0,0.8fr)_minmax(560px,1.2fr)] lg:items-start lg:gap-16">
          <div className="grid gap-5 lg:sticky lg:top-[104px]">
            <p className="text-small font-bold uppercase tracking-label text-plum/75">
              {RSVP_COPY.route.kicker}
            </p>
            <h1
              ref={routeHeadingRef}
              tabIndex={-1}
              className="font-serif text-heading leading-heading tracking-display text-plum"
            >
              {RSVP_COPY.route.heading.slice(
                0,
                -ROUTE_HEADING_EMPHASIS.length,
              )}
              <em className="not-italic text-orange">
                {ROUTE_HEADING_EMPHASIS}
              </em>
            </h1>
            <p className="font-serif text-subheading text-orange">
              {deadline.deadlineText}
            </p>
            {deadline.lateHelper ? (
              <p className="text-small text-plum/80">{deadline.lateHelper}</p>
            ) : null}
            <p className="max-w-[34rem] text-body">
              {RSVP_COPY.route.supporting}
            </p>
          </div>

          <div
            key={routeState.kind}
            className="public-route-panel-enter min-w-0"
          >
            {stateCard}
          </div>
        </div>
      </section>
    </Shell>
  )
}

export default Confirmar
