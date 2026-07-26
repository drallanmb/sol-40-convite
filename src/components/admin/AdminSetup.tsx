import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useAction, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { buildAdminAccessUrl } from '../../lib/adminSession'
import { copyTextToClipboard } from '../../lib/clipboard'
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
  const [copyState, setCopyState] = useState<
    'idle' | 'copying' | 'copied' | 'failed'
  >('idle')
  const [error, setError] = useState<string | null>(null)
  const errorId = useId()
  const passwordRef = useRef<HTMLInputElement>(null)
  const linkRevision = useRef(0)
  const bootstrap = useAction(api.adminAuthActions.bootstrapOwner)
  const regenerate = useAction(
    api.adminAuthActions.regenerateOwnerActivation,
  )
  const recover = useAction(api.adminAuthActions.recoverOwner)
  const linkPurpose = mode === 'bootstrap' ? 'activation' : 'reset'
  const activationUrl =
    token === null
      ? null
      : buildAdminAccessUrl(
          window.location.origin,
          token,
          linkPurpose,
        )
  const linkStatus = useQuery(
    api.adminAccessLinks.getStatus,
    token ? { token, purpose: linkPurpose } : 'skip',
  )

  useEffect(() => {
    if (token === null || linkStatus?.kind !== 'invalid') return
    linkRevision.current += 1
    setToken(null)
    setCopyState('idle')
    setError(
      'O link deixou de ser válido. Confirme a senha-mestra para gerar outro.',
    )
  }, [linkStatus?.kind, token])

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
        linkRevision.current += 1
        setToken(result.token)
        setCopyState('idle')
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
    if (
      !activationUrl ||
      linkStatus?.kind !== 'valid' ||
      copyState === 'copying'
    ) {
      return
    }
    const revision = linkRevision.current
    setCopyState('copying')
    const copied = await copyTextToClipboard(activationUrl)
    if (revision !== linkRevision.current) return
    setCopyState(copied ? 'copied' : 'failed')
  }

  return (
    <main className="admin-dashboard grid min-h-screen place-items-center bg-cream px-4 py-12 text-ink">
      <Card variant="login" className="w-full max-w-[520px]">
        <p className="font-serif text-xl font-bold text-plum">Sol 40</p>
        <h1 className="mt-5 font-serif text-admin-title font-bold leading-none text-plum">
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
            {linkStatus?.kind === 'valid' ? (
              <a
                href={activationUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 block break-all rounded bg-cream p-3 text-sm underline decoration-sea/50 underline-offset-4 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-plum"
              >
                {activationUrl}
              </a>
            ) : (
              <p className="mt-2 text-sm">
                Verificando se este é o link mais recente…
              </p>
            )}
            <Button
              className="mt-4"
              variant="adminSecondary"
              disabled={
                copyState === 'copying' ||
                linkStatus?.kind !== 'valid'
              }
              aria-busy={
                copyState === 'copying' || linkStatus === undefined
              }
              onClick={() => void copyLink()}
            >
              {linkStatus === undefined
                ? 'Verificando…'
                : copyState === 'copying'
                  ? 'Copiando…'
                  : 'Copiar link'}
            </Button>
            {copyState === 'copied' ? (
              <p className="mt-3 text-sm font-bold">Link copiado.</p>
            ) : copyState === 'failed' ? (
              <p className="mt-3 text-sm text-wine">
                Não foi possível copiar automaticamente. Abra o link acima ou
                mantenha-o pressionado para copiar.
              </p>
            ) : null}
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
