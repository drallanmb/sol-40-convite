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

type PresenceTone = 'confirmed' | 'refused' | 'pending'

const presenceToneClasses: Record<
  PresenceTone,
  { dot: string; segment: string; value: string }
> = {
  confirmed: {
    dot: 'bg-sea',
    segment: 'bg-sea',
    value: 'text-sea',
  },
  refused: {
    dot: 'bg-wine',
    segment: 'bg-wine',
    value: 'text-wine',
  },
  pending: {
    dot: 'bg-rsvp-pendente',
    segment: 'bg-rsvp-pendente',
    value: 'text-rsvp-pendente',
  },
}

function OverviewSkeleton() {
  return (
    <div className="mt-6 grid gap-4" role="status" aria-label="Carregando resumo operacional">
      <div className="grid overflow-hidden rounded-lg border border-line bg-card sm:grid-cols-2 xl:grid-cols-4">
        {['Famílias', 'Pessoas', 'Responderam', 'Taxa de resposta'].map(
          (label) => (
            <div
              key={label}
              className="min-h-28 border-b border-line p-4 last:border-b-0 sm:[&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r xl:last:border-r-0"
            >
              <span className="text-sm font-bold text-ink/70">{label}</span>
              <span className="mt-4 block h-8 w-20 animate-pulse rounded bg-sand motion-reduce:animate-none" />
            </div>
          ),
        )}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(18rem,.8fr)]">
        <div className="h-72 animate-pulse rounded-lg border border-line bg-card motion-reduce:animate-none" />
        <div className="h-72 animate-pulse rounded-lg border border-line bg-card motion-reduce:animate-none" />
      </div>
    </div>
  )
}

function SummaryMetric({
  detail,
  label,
  value,
}: {
  detail: string
  label: string
  value: string | number
}) {
  return (
    <div className="min-h-28 border-b border-line p-4 last:border-b-0 sm:[&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r xl:last:border-r-0">
      <p className="text-sm font-bold text-ink/70">{label}</p>
      <strong className="mt-2 block text-[2rem] leading-none tabular-nums text-plum">
        {value}
      </strong>
      <p className="mt-2 text-xs leading-snug text-ink/65">{detail}</p>
    </div>
  )
}

function PresenceLink({
  count,
  label,
  percentage,
  to,
  tone,
}: {
  count: number
  label: string
  percentage: number
  to: string
  tone: PresenceTone
}) {
  const colors = presenceToneClasses[tone]

  return (
    <Link
      to={to}
      className="group grid min-h-14 grid-cols-[1fr_auto] items-center gap-4 rounded-lg px-3 py-2 outline-none transition-colors hover:bg-sand/35 focus-visible:outline-2 focus-visible:outline-coral focus-visible:outline-offset-2"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${colors.dot}`} />
        <span>
          <span className="block text-sm font-bold text-ink">{label}</span>
          <span className="block text-xs text-ink/65">{percentage}% das pessoas</span>
        </span>
      </span>
      <strong className={`text-xl tabular-nums ${colors.value}`}>
        {count}
        <span className="ml-2 text-sm text-plum transition-transform group-hover:translate-x-0.5">
          →
        </span>
      </strong>
    </Link>
  )
}

function PendingLink({
  count,
  label,
  to,
}: {
  count: number
  label: string
  to: string
}) {
  const hasPendingItems = count > 0

  return (
    <Link
      to={to}
      className={`group flex min-h-20 items-center justify-between gap-4 rounded-lg border p-4 outline-none transition-colors focus-visible:outline-2 focus-visible:outline-coral focus-visible:outline-offset-2 ${
        hasPendingItems
          ? 'border-rsvp-pendente/45 bg-rsvp-pendente/[.07] hover:bg-rsvp-pendente/[.12]'
          : 'border-line bg-cream/45 hover:border-plum/35'
      }`}
    >
      <span>
        <span className="block text-sm font-bold text-ink">{label}</span>
        <span className={`mt-1 block text-xs ${hasPendingItems ? 'text-rsvp-pendente' : 'text-sea'}`}>
          {hasPendingItems ? 'Ação necessária' : 'Tudo em dia'}
        </span>
      </span>
      <strong className="flex items-center gap-3 text-2xl tabular-nums text-plum">
        {count}
        <span className="text-sm transition-transform group-hover:translate-x-0.5">→</span>
      </strong>
    </Link>
  )
}

function percentage(count: number, total: number) {
  return total === 0 ? 0 : Math.round((count / total) * 100)
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

  const readyData = props.state === 'ready' ? props.data : null
  const personCount = readyData
    ? readyData.confirmedCount + readyData.refusedCount + readyData.pendingCount
    : 0
  const answeredCount = readyData
    ? readyData.confirmedCount + readyData.refusedCount
    : 0
  const responseRate = percentage(answeredCount, personCount)
  const wineProgress = readyData
    ? percentage(readyData.giftedWineCount, readyData.totalWineCount)
    : 0

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
        <p
          className={`flex min-h-8 items-center gap-2 rounded-full border px-3 text-sm ${
            props.reconnecting
              ? 'border-rsvp-pendente/40 bg-rsvp-pendente/[.07] text-rsvp-pendente'
              : 'border-sea/25 bg-sea/[.06] text-sea'
          }`}
        >
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${
              props.reconnecting ? 'bg-rsvp-pendente' : 'bg-sea'
            }`}
          />
          {props.reconnecting ? 'Reconectando…' : 'Atualizado ao vivo'}
        </p>
      </div>

      {props.state === 'loading' ? <OverviewSkeleton /> : null}

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

      {readyData ? (
        <>
          {emptyState ? (
            <Card variant="operational" className="mt-6">
              <h2 className="text-xl font-bold text-plum">{emptyState.title}</h2>
              <p className="mt-2">{emptyState.body}</p>
              <Link
                to={emptyState.route}
                className="mt-4 inline-flex min-h-11 items-center font-bold text-plum underline-offset-4 hover:underline"
              >
                {emptyState.action}
              </Link>
            </Card>
          ) : null}

          <div
            className="mt-6 grid overflow-hidden rounded-lg border border-line bg-card sm:grid-cols-2 xl:grid-cols-4"
            aria-label="Resumo da festa"
          >
            <SummaryMetric
              label="Famílias"
              value={readyData.familyCount}
              detail="convites cadastrados"
            />
            <SummaryMetric
              label="Pessoas"
              value={personCount}
              detail="nos convites"
            />
            <SummaryMetric
              label="Responderam"
              value={answeredCount}
              detail={`de ${personCount} pessoas`}
            />
            <SummaryMetric
              label="Taxa de resposta"
              value={`${responseRate}%`}
              detail={
                readyData.pendingCount === 0
                  ? 'todos responderam'
                  : `${readyData.pendingCount} aguardando`
              }
            />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(18rem,.8fr)]">
            <Card variant="operational">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-plum">Confirmações</h2>
                  <p className="mt-1 text-sm text-ink/65">
                    Distribuição das respostas recebidas.
                  </p>
                </div>
                <span className="rounded-full bg-sand/55 px-3 py-1 text-sm font-bold tabular-nums text-plum">
                  {responseRate}% respondido
                </span>
              </div>

              <div
                className="mt-6 flex h-3 overflow-hidden rounded-full bg-sand/60"
                role="progressbar"
                aria-label={`${answeredCount} de ${personCount} pessoas responderam`}
                aria-valuemin={0}
                aria-valuemax={Math.max(personCount, 1)}
                aria-valuenow={answeredCount}
              >
                {readyData.confirmedCount > 0 ? (
                  <span
                    className="bg-sea"
                    style={{ flexGrow: readyData.confirmedCount }}
                    aria-hidden="true"
                  />
                ) : null}
                {readyData.refusedCount > 0 ? (
                  <span
                    className="bg-wine"
                    style={{ flexGrow: readyData.refusedCount }}
                    aria-hidden="true"
                  />
                ) : null}
                {readyData.pendingCount > 0 ? (
                  <span
                    className="bg-rsvp-pendente"
                    style={{ flexGrow: readyData.pendingCount }}
                    aria-hidden="true"
                  />
                ) : null}
              </div>

              <div className="mt-4 divide-y divide-line">
                <PresenceLink
                  label="Confirmados"
                  count={readyData.confirmedCount}
                  percentage={percentage(readyData.confirmedCount, personCount)}
                  tone="confirmed"
                  to={`${ADMIN_ROUTES.guests}?presenca=yes`}
                />
                <PresenceLink
                  label="Não vão"
                  count={readyData.refusedCount}
                  percentage={percentage(readyData.refusedCount, personCount)}
                  tone="refused"
                  to={`${ADMIN_ROUTES.guests}?presenca=no`}
                />
                <PresenceLink
                  label="Pendentes"
                  count={readyData.pendingCount}
                  percentage={percentage(readyData.pendingCount, personCount)}
                  tone="pending"
                  to={ADMIN_ROUTES.guestsPending}
                />
              </div>
            </Card>

            <Card variant="operational">
              <h2 className="text-lg font-bold text-plum">Prioridades</h2>
              <p className="mt-1 text-sm text-ink/65">
                O que ainda precisa da sua atenção.
              </p>
              <div className="mt-5 grid gap-3">
                <PendingLink
                  label="Respostas pendentes"
                  count={readyData.pendingCount}
                  to={ADMIN_ROUTES.guestsPending}
                />
                <PendingLink
                  label="Memórias para revisar"
                  count={readyData.pendingMemoryCount}
                  to={ADMIN_ROUTES.moderationPending}
                />
              </div>
            </Card>
          </div>

          <Card variant="operational" className="mt-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-plum">Presentes</h2>
                <p className="mt-1 text-sm text-ink/65">
                  Vinhos já escolhidos na carta.
                </p>
              </div>
              <Link
                to={ADMIN_ROUTES.giftsGifted}
                className="inline-flex min-h-11 items-center text-sm font-bold text-plum underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-coral focus-visible:outline-offset-2"
              >
                Gerenciar presentes →
              </Link>
            </div>
            <div className="mt-5 grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div
                className="h-2 overflow-hidden rounded-full bg-sand/65"
                role="progressbar"
                aria-label={`${readyData.giftedWineCount} de ${readyData.totalWineCount} vinhos presenteados`}
                aria-valuemin={0}
                aria-valuemax={Math.max(readyData.totalWineCount, 1)}
                aria-valuenow={readyData.giftedWineCount}
              >
                <div
                  className="h-full rounded-full bg-plum"
                  style={{ width: `${wineProgress}%` }}
                />
              </div>
              <strong className="whitespace-nowrap text-lg tabular-nums text-plum">
                {readyData.giftedWineCount} de {readyData.totalWineCount}
              </strong>
            </div>
          </Card>
        </>
      ) : null}
    </section>
  )
}

export default AdminOverview
