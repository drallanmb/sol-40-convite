import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { useLocation } from 'react-router'
import { api } from '../../convex/_generated/api'
import AdminAccessLink from '../components/admin/AdminAccessLink'
import AdminLogin from '../components/admin/AdminLogin'
import AdminSetup from '../components/admin/AdminSetup'
import AdminShell from '../components/admin/AdminShell'
import { ADMIN_COPY } from '../content/admin'
import {
  adminDeadlineAction,
  adminStorageEventAction,
  clearAdminSession,
  generateAdminCapability,
  nextAdminSessionSequence,
  readAdminSession,
  reduceAdminSession,
  storeAdminSession,
  type AdminSessionAction,
  type AdminSessionEffect,
  type AdminSessionState,
} from '../lib/adminSession'

function initialSessionState(): AdminSessionState {
  const stored = readAdminSession(window.localStorage)
  return {
    kind: 'checking',
    sequence: 1,
    token: stored?.token ?? null,
  }
}

function applyEffects(effects: AdminSessionEffect[]) {
  for (const effect of effects) {
    if (effect.type === 'store-session') {
      storeAdminSession(window.localStorage, effect.session)
    } else if (effect.type === 'clear-stored-session') {
      clearAdminSession(window.localStorage)
    } else {
      window.dispatchEvent(new CustomEvent('admin-sensitive-state-clear'))
    }
  }
}

function AdminSessionGate() {
  const [session, setSession] = useState<AdminSessionState>(initialSessionState)
  const sessionRef = useRef(session)
  const login = useMutation(api.adminAuth.login)
  const logout = useMutation(api.adminAuth.logout)
  const token =
    session.kind === 'checking' ||
    session.kind === 'authenticated' ||
    session.kind === 'logging-out'
      ? session.token
      : null
  const status = useQuery(
    api.adminAuth.getSessionStatus,
    token ? { token } : 'skip',
  )

  const dispatch = useCallback((action: AdminSessionAction) => {
    const transition = reduceAdminSession(sessionRef.current, action)
    applyEffects(transition.effects)
    sessionRef.current = transition.state
    setSession(transition.state)
  }, [])

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  useEffect(() => {
    if (session.kind !== 'checking') return
    if (!session.token) {
      const anonymous: AdminSessionState = {
        kind: 'anonymous',
        sequence: session.sequence,
      }
      sessionRef.current = anonymous
      setSession(anonymous)
      return
    }
    if (status?.kind === 'valid') {
      dispatch({
        type: 'status-valid',
        sequence: session.sequence,
        token: session.token,
        expiresAt: status.expiresAt,
        now: Date.now(),
      })
    } else if (status?.kind === 'invalid') {
      dispatch({ type: 'status-invalid', sequence: session.sequence })
    }
  }, [dispatch, session, status])

  useEffect(() => {
    if (session.kind !== 'authenticated') return
    if (status?.kind === 'invalid') {
      dispatch({
        type: 'session-revoked',
        sequence: session.sequence,
      })
    }
  }, [dispatch, session, status])

  useEffect(() => {
    if (session.kind !== 'authenticated') return
    const delay = Math.max(0, session.expiresAt - Date.now())
    const timeout = window.setTimeout(() => {
      const action = adminDeadlineAction(
        { token: session.token, expiresAt: session.expiresAt },
        Date.now(),
        session.sequence,
      )
      if (action) dispatch(action)
    }, delay)
    return () => window.clearTimeout(timeout)
  }, [dispatch, session])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      const action = adminStorageEventAction(
        event,
        sessionRef.current.sequence,
      )
      if (action) dispatch(action)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [dispatch])

  const handleLogin = async (password: string) => {
    const sequence = nextAdminSessionSequence(sessionRef.current)
    dispatch({ type: 'login-started', sequence })
    try {
      let capability = generateAdminCapability()
      let result = await login({ password, token: capability })
      if (result.kind === 'token_conflict') {
        capability = generateAdminCapability()
        result = await login({ password, token: capability })
      }
      if (result.kind === 'authenticated') {
        dispatch({
          type: 'login-succeeded',
          sequence,
          token: capability,
          expiresAt: result.expiresAt,
          now: Date.now(),
        })
      } else {
        dispatch({
          type: 'login-failed',
          sequence,
          reason:
            result.kind === 'invalid_credentials'
              ? 'invalid_credentials'
              : result.kind === 'rate_limited'
                ? 'rate_limited'
                : 'configuration',
          ...(result.kind === 'rate_limited'
            ? { retryAfterSeconds: result.retryAfterSeconds }
            : {}),
        })
      }
    } catch {
      dispatch({
        type: 'login-failed',
        sequence,
        reason: 'network',
      })
    }
  }

  const handleLogout = async () => {
    const current = sessionRef.current
    if (current.kind !== 'authenticated') return
    const sequence = nextAdminSessionSequence(current)
    dispatch({ type: 'logout-started', sequence })
    try {
      await logout({ token: current.token })
      dispatch({ type: 'logout-succeeded', sequence })
    } catch {
      dispatch({ type: 'logout-failed', sequence })
    }
  }

  const handleUnauthorized = useCallback(() => {
    const current = sessionRef.current
    dispatch({
      type: 'session-revoked',
      sequence: current.sequence,
    })
  }, [dispatch])

  if (session.kind === 'checking') {
    return (
      <main className="grid min-h-screen place-items-center bg-cream px-4 text-center text-plum">
        <div>
          <p className="font-serif text-2xl font-bold">Sol 40</p>
          <p className="mt-4 text-sm" role="status">
            {ADMIN_COPY.login.checking}
          </p>
        </div>
      </main>
    )
  }

  if (session.kind !== 'authenticated' && session.kind !== 'logging-out') {
    return (
      <AdminLogin
        busy={session.kind === 'authenticating'}
        error={session.kind === 'error' ? session.reason : undefined}
        notice={
          session.kind === 'anonymous'
            ? session.notice
            : session.kind === 'error' && session.retryToken
              ? 'logout_unconfirmed'
              : undefined
        }
        onSubmit={handleLogin}
      />
    )
  }

  return (
    <AdminShell
      loggingOut={session.kind === 'logging-out'}
      onLogout={handleLogout}
      onUnauthorized={handleUnauthorized}
      token={session.token}
    />
  )
}

function Admin() {
  const location = useLocation()
  const bootstrapStatus = useQuery(api.adminBootstrap.getBootstrapStatus)

  if (location.pathname === '/admin/ativar') {
    return <AdminAccessLink purpose="activation" />
  }
  if (location.pathname === '/admin/redefinir') {
    return <AdminAccessLink purpose="reset" />
  }
  if (location.pathname === '/admin/configurar') {
    return (
      <AdminSetup
        mode="bootstrap"
        available={
          bootstrapStatus?.kind === 'available' ||
          bootstrapStatus?.kind === 'pending'
        }
        bootstrapPending={bootstrapStatus?.kind === 'pending'}
      />
    )
  }
  if (location.pathname === '/admin/recuperar-proprietario') {
    return (
      <AdminSetup
        mode="recovery"
        available={bootstrapStatus?.kind === 'complete'}
      />
    )
  }

  return <AdminSessionGate />
}

export default Admin
