import { useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import Button from '../ui/Button'
import Card from '../ui/Card'
import Feedback from '../ui/Feedback'
import Field from '../ui/Field'

type AdminSetupProps = {
  mode: 'bootstrap' | 'recovery'
  available: boolean
  bootstrapPending?: boolean
}

export function AdminSetup({
  mode,
  available,
  bootstrapPending = false,
}: AdminSetupProps) {
  const [masterPassword, setMasterPassword] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const errorId = useId()
  const passwordRef = useRef<HTMLInputElement>(null)
  const bootstrap = useAction(api.adminAuthActions.bootstrapOwner)
  const regenerate = useAction(
    api.adminAuthActions.regenerateOwnerActivation,
  )
  const recover = useAction(api.adminAuthActions.recoverOwner)
  const path = mode === 'bootstrap' ? '/admin/ativar' : '/admin/redefinir'
  const activationUrl =
    token === null
      ? null
      : `${window.location.origin}${path}?token=${encodeURIComponent(token)}`

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!masterPassword || busy || !available) return
    setBusy(true)
    setError(null)
    try {
      const result =
        mode === 'bootstrap'
          ? bootstrapPending
            ? await regenerate({ masterPassword })
            : await bootstrap({
                masterPassword,
                email: 'allanmesquitab@gmail.com',
              })
          : await recover({ masterPassword })
      setMasterPassword('')
      if (result.kind === 'created') {
        setToken(result.token)
      } else {
        setError(
          result.kind === 'rate_limited'
            ? 'Muitas tentativas. Aguarde e tente novamente.'
            : result.kind === 'invalid_credentials'
              ? 'Senha-mestra inválida.'
              : mode === 'bootstrap' && result.kind === 'pending'
                ? 'A configuração já foi iniciada. Gere um novo link pela recuperação se necessário.'
                : 'Este fluxo não está disponível agora.',
        )
        passwordRef.current?.focus()
      }
    } catch {
      setError('Não foi possível concluir. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  const copyLink = async () => {
    if (!activationUrl) return
    await navigator.clipboard.writeText(activationUrl)
  }

  return (
    <main className="admin-dashboard grid min-h-screen place-items-center bg-cream px-4 py-12 text-ink">
      <Card variant="login" className="w-full max-w-[520px]">
        <p className="font-serif text-xl font-bold text-plum">Sol 40</p>
        <h1 className="mt-5 font-serif text-[2rem] font-bold leading-none text-plum">
          {mode === 'bootstrap'
            ? 'Configurar proprietário'
            : 'Recuperar proprietário'}
        </h1>
        <p className="mt-3 leading-normal">
          {mode === 'bootstrap'
            ? 'Confirme a senha-mestra para criar a conta individual de Allan.'
            : 'A senha-mestra encerra as sessões de Allan e cria apenas um novo link de redefinição.'}
        </p>

        {activationUrl ? (
          <Feedback className="mt-7" tone="success" role="status">
            <p className="font-bold">Copie este link agora.</p>
            <p className="mt-2 break-all text-sm">{activationUrl}</p>
            <Button
              className="mt-4"
              variant="adminSecondary"
              onClick={copyLink}
            >
              Copiar link
            </Button>
            <p className="mt-3 text-sm">
              Ele expira em 72 horas e não será exibido novamente.
            </p>
          </Feedback>
        ) : available ? (
          <form className="mt-8" onSubmit={submit}>
            {mode === 'bootstrap' ? (
              <Field
                id="admin-owner-email"
                label="E-mail do proprietário"
                type="email"
                value="allanmesquitab@gmail.com"
                readOnly
                appearance="outline"
              />
            ) : null}
            <Field
              ref={passwordRef}
              id="admin-master-password"
              label="Senha-mestra"
              type="password"
              autoComplete="current-password"
              appearance="outline"
              value={masterPassword}
              disabled={busy}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              onChange={(event) =>
                setMasterPassword(event.currentTarget.value)
              }
            />
            <div
              id={errorId}
              role={error ? 'alert' : undefined}
              className="mb-4 min-h-6 text-sm text-wine"
            >
              {error}
            </div>
            <Button
              type="submit"
              variant="adminPrimary"
              className="w-full"
              disabled={busy || masterPassword.length === 0}
              aria-busy={busy}
            >
              {busy
                ? 'Gerando…'
                : mode === 'bootstrap'
                  ? bootstrapPending
                    ? 'Invalidar e gerar novo link'
                    : 'Criar link de ativação'
                  : 'Gerar link de redefinição'}
            </Button>
          </form>
        ) : (
          <Feedback className="mt-7" tone="warning" role="status">
            Este fluxo não está disponível neste momento.
          </Feedback>
        )}
      </Card>
    </main>
  )
}

export default AdminSetup
