import { useMutation, useQuery } from 'convex/react'
import { useEffect, useId, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { generateAdminCapability } from '../../lib/adminSession'
import Button from '../ui/Button'
import Card from '../ui/Card'
import Field from '../ui/Field'
import AdminConfirmDialog from './AdminConfirmDialog'

type AdminManagersProps = {
  token: string
  onUnauthorized: () => void
}

type ManagedAccount = {
  id: Id<'adminAccounts'>
  displayName: string
  email: string
  role: 'owner' | 'manager' | 'seller'
  state: 'pending' | 'active' | 'disabled'
  updatedAt: number
}

const ROLE_LABELS = {
  owner: 'Proprietário',
  manager: 'Gestor',
  seller: 'Vendedora',
} as const

const STATE_LABELS = {
  pending: 'Ativação pendente',
  active: 'Ativa',
  disabled: 'Desativada',
} as const

function activationUrl(accessToken: string, purpose: 'activation' | 'reset') {
  const path = purpose === 'activation' ? '/admin/ativar' : '/admin/redefinir'
  return `${window.location.origin}${path}?token=${encodeURIComponent(accessToken)}`
}

function AccountSessions({
  account,
  token,
  onUnauthorized,
}: {
  account: ManagedAccount
  token: string
  onUnauthorized: () => void
}) {
  const result = useQuery(api.adminSessions.listAccountSessions, {
    token,
    accountId: account.id,
  })
  if (result === undefined) return <p role="status">Carregando aparelhos…</p>
  if (result.kind !== 'ready') {
    if (result.kind === 'unauthorized') onUnauthorized()
    return <p>Não foi possível consultar os aparelhos.</p>
  }
  if (result.sessions.length === 0) {
    return <p className="text-sm text-ink/70">Nenhum aparelho conectado.</p>
  }
  return (
    <ul className="divide-y divide-line">
      {result.sessions.map((session) => (
        <li key={session.id} className="py-3 text-sm">
          <strong className="block text-plum">{session.label}</strong>
          <span className="text-ink/65">
            Conectado em {new Date(session.createdAt).toLocaleString('pt-BR')}
          </span>
        </li>
      ))}
    </ul>
  )
}

export function AdminManagers({
  token,
  onUnauthorized,
}: AdminManagersProps) {
  const accountsResult = useQuery(api.adminAccounts.listManagedAccounts, {
    token,
  })
  const createAccount = useMutation(api.adminAccounts.createManagedAccount)
  const generateLink = useMutation(
    api.adminAccounts.generateManagedAccessLink,
  )
  const revokeLinks = useMutation(
    api.adminAccounts.revokeManagedAccessLinks,
  )
  const disableAccount = useMutation(
    api.adminAccounts.disableManagedAccount,
  )
  const reactivateAccount = useMutation(
    api.adminAccounts.reactivateManagedAccount,
  )
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'manager' | 'seller'>('manager')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [oneTimeLink, setOneTimeLink] = useState<string | null>(null)
  const [selected, setSelected] = useState<ManagedAccount | null>(null)
  const [disableTarget, setDisableTarget] =
    useState<ManagedAccount | null>(null)
  const roleId = useId()

  useEffect(() => {
    if (accountsResult?.kind === 'unauthorized') onUnauthorized()
  }, [accountsResult, onUnauthorized])

  function handleDenied(kind: string) {
    if (kind === 'unauthorized') onUnauthorized()
    else if (kind === 'forbidden') {
      setFeedback('Somente o proprietário administra contas.')
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setFeedback(null)
    setOneTimeLink(null)
    try {
      const accessToken = generateAdminCapability()
      const result = await createAccount({
        token,
        displayName,
        email,
        role,
        accessToken,
      })
      if (result.kind === 'created') {
        setDisplayName('')
        setEmail('')
        setOneTimeLink(activationUrl(result.accessToken, 'activation'))
        setFeedback('Conta criada. Copie o link antes de sair desta tela.')
      } else {
        handleDenied(result.kind)
        if (result.kind === 'email_taken') {
          setFeedback('Já existe uma conta com este e-mail.')
        } else if (result.kind === 'invalid') {
          setFeedback(result.message)
        }
      }
    } catch {
      setFeedback('Não foi possível criar a conta agora.')
    } finally {
      setBusy(false)
    }
  }

  async function createLink(
    account: ManagedAccount,
    purpose: 'activation' | 'reset',
  ) {
    if (busy) return
    setBusy(true)
    setOneTimeLink(null)
    try {
      const accessToken = generateAdminCapability()
      const result = await generateLink({
        token,
        accountId: account.id,
        expectedUpdatedAt: account.updatedAt,
        purpose,
        accessToken,
      })
      if (result.kind === 'created') {
        setOneTimeLink(activationUrl(result.accessToken, purpose))
        setFeedback('Novo link gerado. O link anterior deixou de funcionar.')
      } else {
        handleDenied(result.kind)
        if (result.kind === 'conflict') {
          setFeedback('A conta mudou. Atualize a página e tente novamente.')
        }
      }
    } catch {
      setFeedback('Não foi possível gerar o link agora.')
    } finally {
      setBusy(false)
    }
  }

  async function reactivate(account: ManagedAccount) {
    if (busy) return
    setBusy(true)
    setOneTimeLink(null)
    try {
      const accessToken = generateAdminCapability()
      const result = await reactivateAccount({
        token,
        accountId: account.id,
        expectedUpdatedAt: account.updatedAt,
        accessToken,
      })
      if (result.kind === 'updated') {
        setOneTimeLink(activationUrl(result.accessToken, 'activation'))
        setFeedback('Conta reativada. Compartilhe o novo link de ativação.')
      } else {
        handleDenied(result.kind)
      }
    } catch {
      setFeedback('Não foi possível reativar a conta agora.')
    } finally {
      setBusy(false)
    }
  }

  async function confirmDisable() {
    if (!disableTarget || busy) return
    setBusy(true)
    try {
      const result = await disableAccount({
        token,
        accountId: disableTarget.id,
        expectedUpdatedAt: disableTarget.updatedAt,
      })
      setDisableTarget(null)
      if (result.kind === 'updated') {
        setFeedback('Conta desativada e sessões encerradas.')
      } else {
        handleDenied(result.kind)
      }
    } catch {
      setFeedback('Não foi possível desativar a conta agora.')
    } finally {
      setBusy(false)
    }
  }

  if (accountsResult === undefined) {
    return <p role="status">Carregando gestores…</p>
  }
  if (accountsResult.kind !== 'ready') {
    return <p role="alert">Somente o proprietário administra contas.</p>
  }

  return (
    <section aria-labelledby="admin-page-title">
      <header>
        <h1
          id="admin-page-title"
          tabIndex={-1}
          className="font-serif text-admin-title font-bold text-plum outline-none"
        >
          Gestores
        </h1>
        <p className="mt-2 text-ink/75">
          Crie acessos individuais e encerre acessos sem apagar o histórico.
        </p>
      </header>

      {feedback ? (
        <p role="status" className="mt-6 rounded-lg border border-line bg-card p-4">
          {feedback}
        </p>
      ) : null}

      {oneTimeLink ? (
        <Card variant="operational" className="mt-6 border-coral">
          <h2 className="font-serif text-xl font-bold text-plum">
            Link de uso único
          </h2>
          <p className="mt-2 text-sm">
            Ele expira em 72 horas e não poderá ser consultado novamente.
          </p>
          <code className="mt-4 block overflow-x-auto rounded bg-cream p-3 text-sm">
            {oneTimeLink}
          </code>
          <Button
            className="mt-4"
            variant="adminPrimary"
            onClick={() => {
              void navigator.clipboard.writeText(oneTimeLink)
              setFeedback('Link copiado.')
            }}
          >
            Copiar link
          </Button>
        </Card>
      ) : null}

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(18rem,.8fr)_minmax(0,1.2fr)]">
        <Card variant="operational">
          <h2 className="font-serif text-2xl font-bold text-plum">
            Nova conta
          </h2>
          <form className="mt-5" onSubmit={submit}>
            <Field
              id="manager-name"
              label="Nome"
              appearance="outline"
              autoComplete="name"
              value={displayName}
              disabled={busy}
              onChange={(event) => setDisplayName(event.currentTarget.value)}
            />
            <Field
              id="manager-email"
              label="E-mail"
              type="email"
              appearance="outline"
              autoComplete="email"
              value={email}
              disabled={busy}
              onChange={(event) => setEmail(event.currentTarget.value)}
            />
            <label htmlFor={roleId} className="mb-5 block">
              <span className="mb-2 block text-sm font-bold">Papel</span>
              <select
                id={roleId}
                className="min-h-11 w-full rounded-lg border border-line bg-card px-3"
                value={role}
                disabled={busy}
                onChange={(event) =>
                  setRole(event.currentTarget.value as 'manager' | 'seller')
                }
              >
                <option value="manager">Gestor</option>
                <option value="seller">Vendedora</option>
              </select>
            </label>
            <Button
              type="submit"
              variant="adminPrimary"
              disabled={busy || !displayName.trim() || !email.trim()}
              aria-busy={busy}
            >
              {busy ? 'Criando…' : 'Criar e gerar link'}
            </Button>
          </form>
        </Card>

        <div className="grid gap-4">
          {accountsResult.accounts.map((account) => (
            <Card key={account.id} variant="operational">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-serif text-xl font-bold text-plum">
                    {account.displayName}
                  </h2>
                  <p className="mt-1 break-all text-sm">{account.email}</p>
                  <p className="mt-2 text-sm font-bold text-sea">
                    {ROLE_LABELS[account.role]} · {STATE_LABELS[account.state]}
                  </p>
                </div>
                <Button
                  variant="adminSecondary"
                  onClick={() =>
                    setSelected(selected?.id === account.id ? null : account)
                  }
                >
                  {selected?.id === account.id ? 'Ocultar aparelhos' : 'Ver aparelhos'}
                </Button>
              </div>
              {selected?.id === account.id ? (
                <div className="mt-5 border-t border-line pt-4">
                  <AccountSessions
                    account={account}
                    token={token}
                    onUnauthorized={onUnauthorized}
                  />
                </div>
              ) : null}
              {account.role !== 'owner' ? (
                <div className="mt-5 flex flex-wrap gap-3 border-t border-line pt-4">
                  {account.state === 'pending' ? (
                    <>
                      <Button
                        variant="adminSecondary"
                        disabled={busy}
                        onClick={() => void createLink(account, 'activation')}
                      >
                        Gerar novo link
                      </Button>
                      <Button
                        variant="adminSecondary"
                        disabled={busy}
                        onClick={() =>
                          void revokeLinks({
                            token,
                            accountId: account.id,
                          }).then((result) => {
                            handleDenied(result.kind)
                            if (result.kind === 'revoked') {
                              setFeedback('Links pendentes invalidados.')
                            }
                          })
                        }
                      >
                        Invalidar links
                      </Button>
                    </>
                  ) : null}
                  {account.state === 'active' ? (
                    <>
                      <Button
                        variant="adminSecondary"
                        disabled={busy}
                        onClick={() => void createLink(account, 'reset')}
                      >
                        Gerar redefinição
                      </Button>
                      <Button
                        variant="adminDestructive"
                        disabled={busy}
                        onClick={() => setDisableTarget(account)}
                      >
                        Desativar
                      </Button>
                    </>
                  ) : null}
                  {account.state === 'disabled' ? (
                    <Button
                      variant="adminPrimary"
                      disabled={busy}
                      onClick={() => void reactivate(account)}
                    >
                      Reativar e gerar link
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      </div>

      <AdminConfirmDialog
        open={disableTarget !== null}
        title={`Desativar ${disableTarget?.displayName ?? 'esta conta'}?`}
        body="As sessões serão encerradas e os links pendentes deixarão de funcionar. O histórico será preservado."
        confirmLabel="Desativar conta"
        acknowledgement="Entendo que esta pessoa perderá o acesso imediatamente"
        busy={busy}
        onCancel={() => setDisableTarget(null)}
        onConfirm={() => void confirmDisable()}
      />
    </section>
  )
}

export default AdminManagers
