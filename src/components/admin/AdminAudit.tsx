import { useEffect, useMemo, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import Button from '../ui/Button'
import Card from '../ui/Card'

type AdminAuditProps = {
  token: string
  onUnauthorized: () => void
}

const AREAS = [
  ['auth', 'Acesso'],
  ['accounts', 'Contas'],
  ['sessions', 'Sessões'],
  ['rsvps', 'Convidados'],
  ['moderation', 'Moderação'],
  ['gifts', 'Presentes'],
] as const

const ACTIONS = [
  'login_succeeded',
  'login_failed',
  'login_rate_limited',
  'activation_completed',
  'password_changed',
  'password_reset',
  'master_recovery_started',
  'logout',
  'session_revoked',
  'sessions_revoked',
  'account_created',
  'account_updated',
  'account_disabled',
  'account_reactivated',
  'access_link_generated',
  'access_link_revoked',
  'rsvp_created',
  'rsvp_updated',
  'rsvp_deleted',
  'rsvp_imported',
  'moderation_transitioned',
  'moderation_undone',
  'gift_confirmed',
  'gift_updated',
  'gift_reopened',
] as const

const ACTION_LABELS: Record<(typeof ACTIONS)[number], string> = {
  login_succeeded: 'Login realizado',
  login_failed: 'Login recusado',
  login_rate_limited: 'Login limitado',
  activation_completed: 'Ativação concluída',
  password_changed: 'Senha alterada',
  password_reset: 'Senha redefinida',
  master_recovery_started: 'Recuperação mestra iniciada',
  logout: 'Logout',
  session_revoked: 'Sessão revogada',
  sessions_revoked: 'Sessões revogadas',
  account_created: 'Conta criada',
  account_updated: 'Conta atualizada',
  account_disabled: 'Conta desativada',
  account_reactivated: 'Conta reativada',
  access_link_generated: 'Link gerado',
  access_link_revoked: 'Link revogado',
  rsvp_created: 'Família criada',
  rsvp_updated: 'Convidado atualizado',
  rsvp_deleted: 'Família removida',
  rsvp_imported: 'Famílias importadas',
  moderation_transitioned: 'Moderação alterada',
  moderation_undone: 'Moderação desfeita',
  gift_confirmed: 'Compra confirmada',
  gift_updated: 'Compra corrigida',
  gift_reopened: 'Garrafa reaberta',
}

function startOfDay(value: string) {
  return value ? new Date(`${value}T00:00:00`).getTime() : undefined
}

function endOfDay(value: string) {
  return value ? new Date(`${value}T23:59:59.999`).getTime() : undefined
}

export function AdminAudit({ token, onUnauthorized }: AdminAuditProps) {
  const accounts = useQuery(api.adminAccounts.listManagedAccounts, { token })
  const [actor, setActor] = useState('')
  const [area, setArea] = useState('')
  const [action, setAction] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [cursor, setCursor] = useState<string | undefined>()
  const [history, setHistory] = useState<string[]>([])
  const filters = useMemo(
    () => ({
      actorAccountId: actor
        ? (actor as Id<'adminAccounts'>)
        : undefined,
      area: area
        ? (area as (typeof AREAS)[number][0])
        : undefined,
      action: action
        ? (action as (typeof ACTIONS)[number])
        : undefined,
      from: startOfDay(from),
      to: endOfDay(to),
    }),
    [action, actor, area, from, to],
  )
  const result = useQuery(api.adminAudit.listAuditEvents, {
    token,
    cursor,
    limit: 25,
    ...filters,
  })

  useEffect(() => {
    if (result?.kind === 'unauthorized') onUnauthorized()
  }, [onUnauthorized, result])

  function resetPage() {
    setCursor(undefined)
    setHistory([])
  }

  if (accounts === undefined || result === undefined) {
    return <p role="status">Carregando auditoria…</p>
  }
  if (accounts.kind !== 'ready' || result.kind !== 'ready') {
    return <p role="alert">Somente o proprietário consulta a auditoria.</p>
  }

  return (
    <section aria-labelledby="admin-page-title">
      <header>
        <h1
          id="admin-page-title"
          tabIndex={-1}
          className="font-serif text-admin-title font-bold text-plum outline-none"
        >
          Auditoria
        </h1>
        <p className="mt-2 text-ink/75">
          Alterações e eventos de segurança dos últimos 120 dias.
        </p>
      </header>

      <Card variant="operational" className="mt-8">
        <form
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-5"
          onChange={resetPage}
        >
          <label className="grid gap-1 text-sm font-bold">
            Pessoa
            <select
              className="min-h-11 rounded-lg border border-line bg-card px-3 font-normal"
              value={actor}
              onChange={(event) => setActor(event.currentTarget.value)}
            >
              <option value="">Todas</option>
              {accounts.accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Área
            <select
              className="min-h-11 rounded-lg border border-line bg-card px-3 font-normal"
              value={area}
              onChange={(event) => setArea(event.currentTarget.value)}
            >
              <option value="">Todas</option>
              {AREAS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Ação
            <select
              className="min-h-11 rounded-lg border border-line bg-card px-3 font-normal"
              value={action}
              onChange={(event) => setAction(event.currentTarget.value)}
            >
              <option value="">Todas</option>
              {ACTIONS.map((value) => (
                <option key={value} value={value}>{ACTION_LABELS[value]}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold">
            De
            <input
              type="date"
              className="min-h-11 rounded-lg border border-line bg-card px-3 font-normal"
              value={from}
              onChange={(event) => setFrom(event.currentTarget.value)}
            />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Até
            <input
              type="date"
              className="min-h-11 rounded-lg border border-line bg-card px-3 font-normal"
              value={to}
              onChange={(event) => setTo(event.currentTarget.value)}
            />
          </label>
        </form>
      </Card>

      {result.events.length === 0 ? (
        <p className="mt-8 rounded-lg border border-line bg-card p-5">
          Nenhum evento encontrado para estes filtros.
        </p>
      ) : (
        <ol className="mt-8 grid gap-3">
          {result.events.map((event) => (
            <li key={event.id}>
              <details className="rounded-lg border border-line bg-card px-4 py-3">
                <summary className="min-h-11 cursor-pointer list-none py-2">
                  <strong className="text-plum">
                    {ACTION_LABELS[event.action]}
                  </strong>
                  <span className="ml-2 text-sm text-ink/65">
                    {event.actorName ?? 'Sistema'} ·{' '}
                    {new Date(event.occurredAt).toLocaleString('pt-BR')}
                  </span>
                  {event.targetLabel ? (
                    <span className="mt-1 block text-sm">{event.targetLabel}</span>
                  ) : null}
                </summary>
                {event.changes.length > 0 ? (
                  <dl className="mt-2 grid gap-3 border-t border-line pt-4 text-sm">
                    {event.changes.map((change) => (
                      <div key={change.field}>
                        <dt className="font-bold text-plum">{change.field}</dt>
                        <dd className="mt-1 break-words text-ink/75">
                          {String(change.before ?? '—')} →{' '}
                          {String(change.after ?? '—')}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="border-t border-line pt-4 text-sm text-ink/65">
                    Este evento não altera campos de domínio.
                  </p>
                )}
              </details>
            </li>
          ))}
        </ol>
      )}

      <nav aria-label="Paginação da auditoria" className="mt-6 flex gap-3">
        <Button
          variant="adminSecondary"
          disabled={history.length === 0}
          onClick={() => {
            const previous = [...history]
            setCursor(previous.pop() || undefined)
            setHistory(previous)
          }}
        >
          Anterior
        </Button>
        <Button
          variant="adminSecondary"
          disabled={!result.nextCursor}
          onClick={() => {
            if (!result.nextCursor) return
            setHistory((items) => [...items, cursor ?? ''])
            setCursor(result.nextCursor)
          }}
        >
          Próxima
        </Button>
      </nav>
    </section>
  )
}

export default AdminAudit
