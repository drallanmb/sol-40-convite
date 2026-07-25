import { Link } from 'react-router'
import { ADMIN_COPY, ADMIN_ROUTES, overviewEmptyState } from '../../content/admin'
import Card from '../ui/Card'

export type AdminOverviewData = {
  familyCount: number
  confirmedCount: number
  refusedCount: number
  pendingCount: number
  pendingMemoryCount: number
  giftedWineCount: number
  totalWineCount: number
}

type AdminOverviewProps =
  | {
      state: 'loading' | 'error'
      data?: never
      reconnecting?: false
      onRetry?: () => void
    }
  | {
      state: 'ready'
      data: AdminOverviewData
      reconnecting: boolean
      onRetry?: never
    }

const metricLinkClasses =
  'group flex min-h-32 flex-col justify-between rounded-lg border border-line bg-card p-4 outline-none transition-colors hover:border-plum focus-visible:outline-2 focus-visible:outline-coral focus-visible:outline-offset-3'

function MetricSkeleton({ label }: { label: string }) {
  return (
    <div
      aria-hidden="true"
      className="flex min-h-32 flex-col justify-between rounded-lg border border-line bg-card p-4"
    >
      <span className="text-sm font-bold">{label}</span>
      <span className="h-8 w-16 animate-pulse rounded bg-sand motion-reduce:animate-none" />
      <span className="h-4 w-24 animate-pulse rounded bg-sand motion-reduce:animate-none" />
    </div>
  )
}

function MetricLink({
  action,
  count,
  label,
  priority = false,
  to,
}: {
  action: string
  count: string | number
  label: string
  priority?: boolean
  to: string
}) {
  return (
    <Link
      to={to}
      className={`${metricLinkClasses} ${
        priority ? 'border-rsvp-pendente bg-rsvp-pendente/10' : ''
      }`}
    >
      <span className="text-sm font-bold text-ink">{label}</span>
      <strong className="mt-3 text-[2rem] leading-none tabular-nums text-plum">
        {count}
      </strong>
      <span className="mt-4 text-sm font-bold text-plum group-hover:underline">
        {action} →
      </span>
    </Link>
  )
}

export function AdminOverview(props: AdminOverviewProps) {
  const emptyState =
    props.state === 'ready'
      ? overviewEmptyState(
          props.data.familyCount,
          props.data.confirmedCount +
            props.data.refusedCount +
            props.data.pendingCount,
        )
      : null

  return (
    <section aria-labelledby="admin-page-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1
            id="admin-page-title"
            tabIndex={-1}
            className="font-serif text-[2rem] font-bold leading-[1.08] tracking-[-.02em] text-plum outline-none"
          >
            {ADMIN_COPY.overview.title}
          </h1>
          <p className="mt-2 text-base">{ADMIN_COPY.overview.subtitle}</p>
        </div>
        <p className="flex items-center gap-2 text-sm text-sea">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-sea" />
          {props.reconnecting ? 'Reconectando…' : 'Atualizado ao vivo'}
        </p>
      </div>

      {props.state === 'loading' ? (
        <div
          className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          role="status"
          aria-label="Carregando resumo operacional"
        >
          {[
            'Confirmados',
            'Não vão',
            'Pendentes',
            'Memórias pendentes',
            'Vinhos presenteados',
          ].map((label) => <MetricSkeleton key={label} label={label} />)}
        </div>
      ) : null}

      {props.state === 'error' ? (
        <Card
          variant="operational"
          className="mt-6 border-wine bg-wine/5 text-wine"
          role="alert"
        >
          <h2 className="text-xl font-bold">Não foi possível carregar esta área.</h2>
          <p className="mt-2 text-ink">
            Confira a conexão e tente novamente. Os valores ficam ocultos até
            uma leitura atualizada.
          </p>
          <button
            type="button"
            className="mt-4 min-h-11 rounded-lg border border-wine px-4 py-2 font-bold"
            onClick={props.onRetry}
          >
            Tentar novamente
          </button>
        </Card>
      ) : null}

      {props.state === 'ready' ? (
        <>
          {emptyState ? (
            <Card variant="operational" className="mt-6">
              <h2 className="text-xl font-bold text-plum">
                {emptyState.title}
              </h2>
              <p className="mt-2">{emptyState.body}</p>
              <Link
                to={emptyState.route}
                className="mt-4 inline-flex min-h-11 items-center font-bold text-plum underline-offset-4 hover:underline"
              >
                {emptyState.action}
              </Link>
            </Card>
          ) : null}

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(15rem,1fr)]">
            <Card variant="operational">
              <h2 className="text-xl font-bold text-plum">Confirmações</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <MetricLink
                  label="Confirmados"
                  count={props.data.confirmedCount}
                  action="Ver convidados"
                  to={`${ADMIN_ROUTES.guests}?presenca=yes`}
                />
                <MetricLink
                  label="Não vão"
                  count={props.data.refusedCount}
                  action="Ver convidados"
                  to={`${ADMIN_ROUTES.guests}?presenca=no`}
                />
                <MetricLink
                  label={
                    props.data.pendingCount === 0
                      ? 'Todos responderam'
                      : 'Pendentes'
                  }
                  count={props.data.pendingCount}
                  action="Ver convidados"
                  priority={props.data.pendingCount > 0}
                  to={ADMIN_ROUTES.guestsPending}
                />
              </div>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <MetricLink
                label={
                  props.data.pendingMemoryCount === 0
                    ? 'Nenhuma memória aguardando revisão'
                    : 'Memórias pendentes'
                }
                count={props.data.pendingMemoryCount}
                action="Revisar fila"
                priority={props.data.pendingMemoryCount > 0}
                to={ADMIN_ROUTES.moderationPending}
              />
              <MetricLink
                label={
                  props.data.giftedWineCount === 0
                    ? 'Nenhum vinho marcado como presenteado'
                    : 'Vinhos presenteados'
                }
                count={`${props.data.giftedWineCount} de ${props.data.totalWineCount}`}
                action="Ver presentes"
                to={ADMIN_ROUTES.giftsGifted}
              />
            </div>
          </div>
        </>
      ) : null}
    </section>
  )
}

export default AdminOverview
