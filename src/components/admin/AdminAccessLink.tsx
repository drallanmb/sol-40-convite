import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  useAction,
  useConvexConnectionState,
  useQuery,
} from 'convex/react'
import { Link } from 'react-router'
import { api } from '../../../convex/_generated/api'
import { takeAdminAccessTokenFromUrl } from '../../lib/adminSession'
import Button, { buttonClassName } from '../ui/Button'
import Card from '../ui/Card'
import Feedback from '../ui/Feedback'
import Field from '../ui/Field'

type AccessPurpose = 'activation' | 'reset'

type AdminAccessLinkProps = {
  purpose: AccessPurpose
}

export function AdminAccessLink({ purpose }: AdminAccessLinkProps) {
  const [token] = useState(() =>
    takeAdminAccessTokenFromUrl(window.location.href, (safeUrl) => {
      window.history.replaceState(null, '', safeUrl)
    }),
  )
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [outcome, setOutcome] = useState<
    | 'completed'
    | 'invalid'
    | 'invalid_password'
    | 'rate_limited'
    | 'network'
    | null
  >(null)
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number | null>(
    null,
  )
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null)
  const errorId = useId()
  const passwordRef = useRef<HTMLInputElement>(null)
  const connection = useConvexConnectionState()
  const status = useQuery(
    api.adminAccessLinks.getStatus,
    token ? { token, purpose } : 'skip',
  )
  const consume = useAction(api.adminAccessLinkActions.consumeAccessLink)

  useEffect(() => {
    if (
      token === null ||
      status?.kind === 'invalid' ||
      outcome === 'invalid'
    ) {
      setPassword('')
      setConfirmation('')
    }
  }, [outcome, status?.kind, token])

  useEffect(() => {
    if (cooldownUntil === null) return
    const remaining = cooldownUntil - Date.now()
    if (remaining <= 0) {
      setCooldownUntil(null)
      setRetryAfterSeconds(null)
      setOutcome((current) => (current === 'rate_limited' ? null : current))
      return
    }
    const timeout = window.setTimeout(() => {
      setCooldownUntil(null)
      setRetryAfterSeconds(null)
      setOutcome((current) => (current === 'rate_limited' ? null : current))
    }, remaining)
    return () => window.clearTimeout(timeout)
  }, [cooldownUntil])

  const mismatch = confirmation.length > 0 && password !== confirmation
  const passwordLength = Array.from(password.normalize('NFC')).length
  const tooShort = password.length > 0 && passwordLength < 15
  const tooLong = passwordLength > 128
  const invalid =
    token === null || status?.kind === 'invalid' || outcome === 'invalid'
  const cooldownActive =
    cooldownUntil !== null && Date.now() < cooldownUntil
  const passwordError = mismatch
    ? 'As senhas precisam ser iguais.'
    : tooShort
      ? 'Use pelo menos 15 caracteres.'
      : tooLong
        ? 'Use no máximo 128 caracteres.'
        : outcome === 'invalid_password'
          ? 'Escolha uma senha menos previsível e que não contenha seu nome ou e-mail.'
          : outcome === 'rate_limited'
            ? `Muitas tentativas. Aguarde${
                retryAfterSeconds ? ` ${retryAfterSeconds} segundos` : ''
              } antes de tentar novamente.`
            : outcome === 'network'
              ? 'Não foi possível concluir. A senha foi mantida para você tentar novamente.'
              : null

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (
      !token ||
      busy ||
      invalid ||
      cooldownActive ||
      password.length === 0 ||
      password !== confirmation ||
      tooShort ||
      tooLong
    ) {
      if (password !== confirmation) passwordRef.current?.focus()
      return
    }
    setBusy(true)
    setOutcome(null)
    setRetryAfterSeconds(null)
    setCooldownUntil(null)
    try {
      const result = await consume({ token, purpose, password })
      setOutcome(result.kind)
      if (result.kind === 'rate_limited') {
        setRetryAfterSeconds(result.retryAfterSeconds)
        setCooldownUntil(Date.now() + result.retryAfterSeconds * 1_000)
      }
      if (
        result.kind === 'completed' ||
        result.kind === 'invalid' ||
        result.kind === 'invalid_password'
      ) {
        setPassword('')
        setConfirmation('')
      }
      if (
        result.kind === 'invalid' ||
        result.kind === 'invalid_password'
      ) {
        passwordRef.current?.focus()
      }
    } catch {
      setOutcome('network')
    } finally {
      setBusy(false)
    }
  }

  const title =
    purpose === 'activation' ? 'Ativar acesso' : 'Redefinir senha'
  const description =
    purpose === 'activation'
      ? 'Crie sua senha para concluir a ativação da conta.'
      : 'Crie uma nova senha. As sessões anteriores já foram encerradas.'

  return (
    <main className="admin-dashboard grid min-h-screen place-items-center bg-cream px-4 py-12 text-ink">
      <Card variant="login" className="w-full max-w-[480px]">
        <p className="font-serif text-xl font-bold text-plum">Sol 40</p>
        <h1 className="mt-5 font-serif text-admin-title font-bold leading-none text-plum">
          {title}
        </h1>
        <p className="mt-3 leading-normal">{description}</p>

        {outcome === 'completed' ? (
          <Feedback className="mt-7" tone="success" role="status">
            <p>Senha definida. Você já pode entrar no painel.</p>
            <Link
              to="/admin"
              className={buttonClassName(
                'adminPrimary',
                'mt-5 w-full text-center',
              )}
            >
              Entrar no painel
            </Link>
          </Feedback>
        ) : invalid ? (
          <Feedback className="mt-7" tone="error" role="alert">
            Este link não é válido. Peça um novo link ao proprietário.
          </Feedback>
        ) : status === undefined ? (
          <Feedback className="mt-7" tone="neutral" role="status">
            <p className="font-bold">Verificando este link…</p>
            <p className="mt-2 text-sm">
              {connection.isWebSocketConnected
                ? 'Aguarde enquanto confirmamos que ele ainda é válido.'
                : 'Sem conexão no momento. Mantenha esta tela aberta; a verificação será retomada automaticamente.'}
            </p>
          </Feedback>
        ) : (
          <form className="mt-8" onSubmit={handleSubmit}>
            <Field
              ref={passwordRef}
              id="admin-new-password"
              label="Nova senha"
              hint="Use entre 15 e 128 caracteres."
              type="password"
              autoComplete="new-password"
              appearance="outline"
              value={password}
              disabled={busy}
              aria-invalid={
                mismatch ||
                tooShort ||
                tooLong ||
                outcome === 'invalid_password'
                  ? true
                  : undefined
              }
              aria-describedby={
                mismatch ||
                tooShort ||
                tooLong ||
                outcome === 'invalid_password'
                  ? errorId
                  : undefined
              }
              onChange={(event) => {
                setPassword(event.currentTarget.value)
                if (
                  outcome === 'invalid_password' ||
                  outcome === 'network'
                ) {
                  setOutcome(null)
                  setRetryAfterSeconds(null)
                }
              }}
            />
            <Field
              id="admin-new-password-confirmation"
              label="Confirmar nova senha"
              type="password"
              autoComplete="new-password"
              appearance="outline"
              value={confirmation}
              disabled={busy}
              aria-invalid={mismatch ? true : undefined}
              aria-describedby={mismatch ? errorId : undefined}
              onChange={(event) =>
                setConfirmation(event.currentTarget.value)
              }
            />
            <div
              id={errorId}
              role={
                mismatch ||
                tooShort ||
                tooLong ||
                outcome === 'invalid_password' ||
                outcome === 'rate_limited' ||
                outcome === 'network'
                  ? 'alert'
                  : undefined
              }
              className="mb-4 min-h-6 text-sm text-wine"
            >
              {passwordError}
            </div>
            <Button
              type="submit"
              variant="adminPrimary"
              className="w-full"
              disabled={
                busy ||
                status?.kind !== 'valid' ||
                password.length === 0 ||
                password !== confirmation ||
                tooShort ||
                tooLong ||
                cooldownActive
              }
              aria-busy={busy}
            >
              {busy
                ? 'Salvando…'
                : outcome === 'network' || outcome === 'rate_limited'
                  ? 'Tentar novamente'
                  : 'Definir senha'}
            </Button>
          </form>
        )}
      </Card>
    </main>
  )
}

export default AdminAccessLink
