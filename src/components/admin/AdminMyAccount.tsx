import { useAction, useMutation, useQuery } from 'convex/react'
import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import Button from '../ui/Button'
import Card from '../ui/Card'
import Field from '../ui/Field'
import AdminConfirmDialog from './AdminConfirmDialog'

type AdminMyAccountProps = {
  token: string
  onLogout: () => Promise<void>
  onUnauthorized: () => void
}

const ROLE_LABELS = {
  owner: 'Proprietário',
  manager: 'Gestor',
  seller: 'Vendedora',
} as const

export function AdminMyAccount({
  token,
  onLogout,
  onUnauthorized,
}: AdminMyAccountProps) {
  const profile = useQuery(api.adminAccounts.getOwnProfile, { token })
  const sessions = useQuery(api.adminSessions.listOwnSessions, { token })
  const changePassword = useAction(api.adminAuthActions.changeOwnPassword)
  const changeEmail = useAction(api.adminAuthActions.changeOwnerEmail)
  const revokeSession = useMutation(api.adminSessions.revokeSession)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [email, setEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [emailBusy, setEmailBusy] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [sessionToRevoke, setSessionToRevoke] =
    useState<Id<'adminSessions'> | null>(null)
  const [revokeBusy, setRevokeBusy] = useState(false)
  const passwordRef = useRef<HTMLInputElement>(null)
  const passwordFeedbackId = useId()

  useEffect(() => {
    if (profile?.kind === 'unauthorized' || sessions?.kind === 'unauthorized') {
      onUnauthorized()
    }
  }, [onUnauthorized, profile, sessions])

  useEffect(() => {
    if (profile?.kind === 'ready') setEmail(profile.profile.email)
  }, [profile])

  async function submitPassword(event: FormEvent) {
    event.preventDefault()
    if (
      passwordBusy ||
      !currentPassword ||
      !newPassword ||
      newPassword !== confirmation
    ) {
      setFeedback(
        newPassword !== confirmation
          ? 'A confirmação precisa ser igual à nova senha.'
          : 'Preencha todos os campos de senha.',
      )
      return
    }
    setPasswordBusy(true)
    setFeedback(null)
    try {
      const result = await changePassword({
        token,
        currentPassword,
        newPassword,
      })
      if (result.kind === 'changed') {
        setCurrentPassword('')
        setNewPassword('')
        setConfirmation('')
        setFeedback('Senha alterada. Os outros aparelhos foram desconectados.')
      } else if (result.kind === 'unauthorized') {
        onUnauthorized()
      } else {
        setFeedback(
          result.kind === 'invalid_password'
            ? 'Use uma frase-senha com pelo menos 15 caracteres.'
            : result.kind === 'invalid_credentials'
              ? 'A senha atual não confere.'
              : 'Não foi possível alterar a senha. Atualize e tente novamente.',
        )
        passwordRef.current?.focus()
      }
    } catch {
      setFeedback('Não foi possível alterar a senha agora.')
    } finally {
      setPasswordBusy(false)
    }
  }

  async function submitEmail(event: FormEvent) {
    event.preventDefault()
    if (emailBusy || profile?.kind !== 'ready') return
    setEmailBusy(true)
    setFeedback(null)
    try {
      const result = await changeEmail({
        token,
        currentPassword: emailPassword,
        email,
      })
      if (result.kind === 'changed') {
        setEmailPassword('')
        setEmail(result.email)
        setFeedback('E-mail atualizado.')
      } else if (result.kind === 'unauthorized') {
        onUnauthorized()
      } else {
        setFeedback(
          result.kind === 'invalid_credentials'
            ? 'A senha atual não confere.'
            : result.kind === 'email_taken'
              ? 'Este e-mail já está em uso.'
              : 'Confira o e-mail e tente novamente.',
        )
      }
    } catch {
      setFeedback('Não foi possível atualizar o e-mail agora.')
    } finally {
      setEmailBusy(false)
    }
  }

  async function confirmRevoke() {
    if (sessionToRevoke === null || revokeBusy) return
    setRevokeBusy(true)
    try {
      const result = await revokeSession({
        token,
        sessionId: sessionToRevoke,
      })
      setSessionToRevoke(null)
      if (result.kind === 'unauthorized' || result.revokedCurrent) {
        onUnauthorized()
      } else if (result.kind === 'revoked') {
        setFeedback('Aparelho desconectado.')
      } else {
        setFeedback('A sessão já não estava disponível.')
      }
    } catch {
      setFeedback('Não foi possível desconectar o aparelho agora.')
    } finally {
      setRevokeBusy(false)
    }
  }

  if (profile === undefined || sessions === undefined) {
    return <p role="status">Carregando sua conta…</p>
  }
  if (profile.kind !== 'ready' || sessions.kind !== 'ready') return null

  return (
    <section aria-labelledby="admin-page-title">
      <header>
        <h1
          id="admin-page-title"
          tabIndex={-1}
          className="font-serif text-admin-title font-bold text-plum outline-none"
        >
          Minha conta
        </h1>
        <p className="mt-2 text-ink/75">
          {profile.profile.displayName} · {ROLE_LABELS[profile.profile.role]}
        </p>
      </header>

      {feedback ? (
        <p
          id={passwordFeedbackId}
          role="status"
          className="mt-6 rounded-lg border border-line bg-card px-4 py-3"
        >
          {feedback}
        </p>
      ) : null}

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <Card variant="operational">
          <h2 className="font-serif text-2xl font-bold text-plum">Perfil</h2>
          <dl className="mt-5 grid gap-4">
            <div>
              <dt className="text-sm font-bold">Nome</dt>
              <dd className="mt-1">{profile.profile.displayName}</dd>
            </div>
            <div>
              <dt className="text-sm font-bold">E-mail</dt>
              <dd className="mt-1 break-all">{profile.profile.email}</dd>
            </div>
            <div>
              <dt className="text-sm font-bold">Papel</dt>
              <dd className="mt-1">{ROLE_LABELS[profile.profile.role]}</dd>
            </div>
          </dl>
          {profile.profile.role === 'owner' ? (
            <form className="mt-8" onSubmit={submitEmail}>
              <Field
                id="my-account-email"
                label="Novo e-mail"
                type="email"
                autoComplete="email"
                appearance="outline"
                value={email}
                disabled={emailBusy}
                onChange={(event) => setEmail(event.currentTarget.value)}
              />
              <Field
                id="my-account-email-password"
                label="Senha atual"
                type="password"
                autoComplete="current-password"
                appearance="outline"
                value={emailPassword}
                disabled={emailBusy}
                onChange={(event) =>
                  setEmailPassword(event.currentTarget.value)
                }
              />
              <Button
                type="submit"
                variant="adminSecondary"
                disabled={emailBusy || !email.trim() || !emailPassword}
                aria-busy={emailBusy}
              >
                {emailBusy ? 'Salvando…' : 'Alterar e-mail'}
              </Button>
            </form>
          ) : null}
        </Card>

        <Card variant="operational">
          <h2 className="font-serif text-2xl font-bold text-plum">Trocar senha</h2>
          <form className="mt-5" onSubmit={submitPassword}>
            <Field
              ref={passwordRef}
              id="my-account-current-password"
              label="Senha atual"
              type="password"
              autoComplete="current-password"
              appearance="outline"
              value={currentPassword}
              disabled={passwordBusy || emailBusy}
              aria-describedby={feedback ? passwordFeedbackId : undefined}
              onChange={(event) => setCurrentPassword(event.currentTarget.value)}
            />
            <Field
              id="my-account-new-password"
              label="Nova senha"
              hint="Use uma frase com pelo menos 15 caracteres."
              type="password"
              autoComplete="new-password"
              appearance="outline"
              value={newPassword}
              disabled={passwordBusy}
              onChange={(event) => setNewPassword(event.currentTarget.value)}
            />
            <Field
              id="my-account-password-confirmation"
              label="Confirmar nova senha"
              type="password"
              autoComplete="new-password"
              appearance="outline"
              value={confirmation}
              disabled={passwordBusy}
              onChange={(event) => setConfirmation(event.currentTarget.value)}
            />
            <Button
              type="submit"
              variant="adminPrimary"
              disabled={
                passwordBusy ||
                !currentPassword ||
                !newPassword ||
                !confirmation
              }
              aria-busy={passwordBusy}
            >
              {passwordBusy ? 'Alterando…' : 'Alterar senha'}
            </Button>
          </form>
        </Card>
      </div>

      <Card variant="operational" className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl font-bold text-plum">
              Aparelhos conectados
            </h2>
            <p className="mt-1 text-sm text-ink/70">
              Cada acesso expira automaticamente em sete dias.
            </p>
          </div>
          <Button variant="adminSecondary" onClick={() => void onLogout()}>
            Sair deste aparelho
          </Button>
        </div>
        <ul className="mt-6 divide-y divide-line">
          {sessions.sessions.map((session) => (
            <li
              key={session.id}
              className="flex flex-wrap items-center justify-between gap-4 py-4"
            >
              <div>
                <p className="font-bold text-plum">
                  {session.label}
                  {session.isCurrent ? ' · este aparelho' : ''}
                </p>
                <p className="mt-1 text-sm text-ink/70">
                  Conectado em{' '}
                  {new Intl.DateTimeFormat('pt-BR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  }).format(session.createdAt)}
                </p>
              </div>
              <Button
                variant="adminSecondary"
                className="min-h-11"
                onClick={() => setSessionToRevoke(session.id)}
              >
                Desconectar
              </Button>
            </li>
          ))}
        </ul>
      </Card>

      <AdminConfirmDialog
        open={sessionToRevoke !== null}
        title="Desconectar aparelho?"
        body="Esta sessão perderá acesso imediatamente. Você poderá entrar de novo com a senha."
        confirmLabel="Desconectar"
        busy={revokeBusy}
        onCancel={() => setSessionToRevoke(null)}
        onConfirm={() => void confirmRevoke()}
      />
    </section>
  )
}

export default AdminMyAccount
