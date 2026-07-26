import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useAction, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { takeAdminAccessTokenFromUrl } from '../../lib/adminSession'
import Button from '../ui/Button'
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
    'completed' | 'invalid' | 'invalid_password' | 'network' | null
  >(null)
  const errorId = useId()
  const passwordRef = useRef<HTMLInputElement>(null)
  const status = useQuery(
    api.adminAccessLinks.getStatus,
    token ? { token, purpose } : 'skip',
  )
  const consume = useAction(api.adminAccessLinkActions.consumeAccessLink)

  useEffect(() => {
    let policy = document.querySelector<HTMLMetaElement>(
      'meta[name="referrer"]',
    )
    if (!policy) {
      policy = document.createElement('meta')
      policy.name = 'referrer'
      document.head.append(policy)
    }
    policy.content = 'no-referrer'
  }, [])

  const mismatch = confirmation.length > 0 && password !== confirmation
  const invalid =
    token === null || status?.kind === 'invalid' || outcome === 'invalid'

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (
      !token ||
      busy ||
      invalid ||
      password.length === 0 ||
      password !== confirmation
    ) {
      if (password !== confirmation) passwordRef.current?.focus()
      return
    }
    setBusy(true)
    setOutcome(null)
    try {
      const result = await consume({ token, purpose, password })
      setOutcome(result.kind)
      if (result.kind !== 'completed') {
        setPassword('')
        setConfirmation('')
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
            Senha definida. Você já pode entrar no painel.
          </Feedback>
        ) : invalid ? (
          <Feedback className="mt-7" tone="error" role="alert">
            Este link não é válido. Peça um novo link ao proprietário.
          </Feedback>
        ) : (
          <form className="mt-8" onSubmit={handleSubmit}>
            <Field
              ref={passwordRef}
              id="admin-new-password"
              label="Nova senha"
              hint="Use ao menos 15 caracteres."
              type="password"
              autoComplete="new-password"
              appearance="outline"
              value={password}
              disabled={busy}
              aria-invalid={
                mismatch || outcome === 'invalid_password' ? true : undefined
              }
              aria-describedby={
                mismatch || outcome === 'invalid_password'
                  ? errorId
                  : undefined
              }
              onChange={(event) => setPassword(event.currentTarget.value)}
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
                outcome === 'invalid_password' ||
                outcome === 'network'
                  ? 'alert'
                  : undefined
              }
              className="mb-4 min-h-6 text-sm text-wine"
            >
              {mismatch
                ? 'As senhas precisam ser iguais.'
                : outcome === 'invalid_password'
                  ? 'Escolha uma senha mais longa e menos previsível.'
                  : outcome === 'network'
                    ? 'Não foi possível concluir. Tente novamente.'
                    : null}
            </div>
            <Button
              type="submit"
              variant="adminPrimary"
              className="w-full"
              disabled={
                busy ||
                status?.kind !== 'valid' ||
                password.length === 0 ||
                password !== confirmation
              }
              aria-busy={busy}
            >
              {busy ? 'Salvando…' : 'Definir senha'}
            </Button>
          </form>
        )}
      </Card>
    </main>
  )
}

export default AdminAccessLink
