import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery_experimental } from 'convex/react'
import { useLocation, useNavigate } from 'react-router'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { GIFT_BANDS } from '../../content/gifts'
import {
  ADMIN_COPY,
  ADMIN_ROUTES,
  giftStatusFromSearch,
} from '../../content/admin'
import {
  filterAdminWines,
  groupAdminWinesByBand,
} from '../../lib/adminSearch'
import { usePendingOperations } from '../../lib/adminOperations'
import Button from '../ui/Button'
import Field from '../ui/Field'
import Toast from '../ui/Toast'
import AdminConfirmDialog from './AdminConfirmDialog'

type AdminWine = {
  id: Id<'wines'>
  productCode: string
  name: string
  producer: string
  priceCents: number
  category: 'ate-200' | '200-350' | '350-500'
  status: 'available' | 'gifted'
  giftedBy?: string
  giftedAt?: number
  updatedAt: number
}

function currency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value / 100)
}

function dateTime(value: number) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(value)
}

function MarkGiftDialog({
  wine,
  busy,
  error,
  review,
  onCancel,
  onSubmit,
}: {
  wine: AdminWine | null
  busy: boolean
  error: string | null
  review: boolean
  onCancel: () => void
  onSubmit: (presenter: string) => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const fieldRef = useRef<HTMLInputElement>(null)
  const [presenter, setPresenter] = useState('')
  const titleId = useId()
  useEffect(() => {
    const dialog = dialogRef.current
    if (wine && !dialog?.open) {
      dialog?.showModal()
      window.requestAnimationFrame(() => fieldRef.current?.focus())
    } else if (!wine && dialog?.open) {
      dialog.close()
      setPresenter('')
    }
  }, [wine])
  if (!wine) return <dialog ref={dialogRef} />
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onCancel()
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-lg border border-line bg-card p-6 text-ink backdrop:bg-plum/55 sm:p-8"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit(presenter)
        }}
      >
        <h2 id={titleId} className="font-serif text-2xl font-bold text-plum">
          Marcar como presenteado
        </h2>
        <p className="mt-3 break-words">
          <strong>{wine.name}</strong>{' '}
          <span className="whitespace-nowrap">· Cód. Mistral {wine.productCode}</span>
        </p>
        {review ? (
          <p role="alert" className="mt-4 border-l-4 border-rsvp-pendente pl-4">
            Este vinho foi atualizado em outra sessão. Revise o estado atual antes de continuar.
          </p>
        ) : null}
        <div className="mt-6">
          <Field
            ref={fieldRef}
            id="gift-presenter"
            appearance="outline"
            label="Nome de quem presenteou"
            value={presenter}
            disabled={busy || review}
            required
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'gift-presenter-error' : undefined}
            onChange={(event) => setPresenter(event.currentTarget.value)}
          />
          {error ? <p id="gift-presenter-error" role="alert" className="-mt-3 mb-4 text-wine">{error}</p> : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button variant="adminSecondary" disabled={busy} onClick={onCancel}>
            Voltar aos presentes
          </Button>
          <Button type="submit" variant="adminPrimary" disabled={busy || review || !presenter.trim()} aria-busy={busy}>
            {busy ? 'Confirmando…' : 'Confirmar presente'}
          </Button>
        </div>
      </form>
    </dialog>
  )
}

export function AdminGifts({
  token,
  onUnauthorized,
}: {
  token: string
  onUnauthorized: () => void
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const status = giftStatusFromSearch(location.search) ?? 'available'
  const query = useQuery_experimental({
    query: api.adminWines.listAdmin,
    args: { token },
  })
  const markGifted = useMutation(api.adminWines.markGifted)
  const makeAvailable = useMutation(api.adminWines.makeAvailable)
  const [search, setSearch] = useState('')
  const [marking, setMarking] = useState<AdminWine | null>(null)
  const markingRef = useRef<AdminWine | null>(null)
  const [unmarking, setUnmarking] = useState<AdminWine | null>(null)
  const pendingWines = usePendingOperations()
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [review, setReview] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const wines =
    query.status === 'success' && query.data.kind === 'ready'
      ? (query.data.wines as AdminWine[])
      : []

  useEffect(() => {
    if (query.status === 'success' && query.data.kind === 'unauthorized') {
      onUnauthorized()
    }
  }, [onUnauthorized, query])

  useEffect(() => {
    markingRef.current = marking
  }, [marking])

  useEffect(() => {
    if (!marking) return
    const remote = wines.find((wine) => wine.id === marking.id)
    if (!remote || remote.updatedAt !== marking.updatedAt) setReview(true)
  }, [marking, wines])

  useEffect(() => {
    const clear = () => {
      pendingWines.clear()
      setSearch('')
      setMarking(null)
      setUnmarking(null)
      setDialogError(null)
      setReview(false)
      setFeedback(null)
    }
    window.addEventListener('admin-sensitive-state-clear', clear)
    return () => window.removeEventListener('admin-sensitive-state-clear', clear)
  }, [pendingWines.clear])

  const visible = useMemo(
    () => filterAdminWines(wines, { query: search, status }),
    [search, status, wines],
  )
  const groups = groupAdminWinesByBand(visible)
  const counts = {
    available: wines.filter((wine) => wine.status === 'available').length,
    gifted: wines.filter((wine) => wine.status === 'gifted').length,
  }

  async function submitMark(presenter: string) {
    if (!marking) return
    if (!presenter.trim()) {
      setDialogError('Informe o nome de quem presenteou.')
      return
    }
    const commandWine = marking
    await pendingWines.run(marking.id, async (command) => {
      setDialogError(null)
      try {
        const result = await markGifted({
          token,
          wineId: commandWine.id,
          expectedUpdatedAt: commandWine.updatedAt,
          giftedBy: presenter,
        })
        if (!command.isCurrent()) return
        if (result.kind === 'unauthorized') return onUnauthorized()
        const ownsDialog =
          markingRef.current?.id === commandWine.id &&
          markingRef.current.updatedAt === commandWine.updatedAt
        if (result.kind === 'conflict') {
          if (ownsDialog && command.isLatest()) {
            setReview(true)
            setDialogError(
              'Este vinho foi atualizado em outra sessão. Revise o estado atual antes de continuar.',
            )
          }
        } else if (result.kind === 'updated') {
          if (command.isLatest()) {
            setFeedback(`${result.wine.name} marcado como presenteado.`)
          }
          setMarking((current) =>
            current?.id === commandWine.id &&
            current.updatedAt === commandWine.updatedAt
              ? null
              : current,
          )
        } else if (ownsDialog && command.isLatest()) {
          setDialogError(
            result.kind === 'invalid'
              ? result.message
              : 'Não foi possível confirmar este presente. Tente novamente.',
          )
        }
      } catch {
        if (
          command.isCurrent() &&
          command.isLatest() &&
          markingRef.current?.id === commandWine.id &&
          markingRef.current.updatedAt === commandWine.updatedAt
        ) {
          setDialogError('Não foi possível confirmar este presente. Tente novamente.')
        }
      }
    })
  }

  async function confirmUnmark() {
    if (!unmarking) return
    const commandWine = unmarking
    await pendingWines.run(unmarking.id, async (command) => {
      try {
        const result = await makeAvailable({
          token,
          wineId: commandWine.id,
          expectedUpdatedAt: commandWine.updatedAt,
        })
        if (!command.isCurrent()) return
        if (result.kind === 'unauthorized') return onUnauthorized()
        if (command.isLatest()) {
          if (result.kind === 'updated') {
            setFeedback(`${result.wine.name} voltou a ficar disponível.`)
          } else if (result.kind === 'conflict') {
            setFeedback(
              'Este vinho foi alterado em outra sessão. Mantivemos a versão mais recente.',
            )
          } else {
            setFeedback('Não foi possível tornar este vinho disponível.')
          }
        }
      } catch {
        if (command.isCurrent() && command.isLatest()) {
          setFeedback('Não foi possível tornar este vinho disponível.')
        }
      } finally {
        if (command.isCurrent()) {
          setUnmarking((current) =>
            current?.id === commandWine.id &&
            current.updatedAt === commandWine.updatedAt
              ? null
              : current,
          )
        }
      }
    })
  }

  return (
    <section aria-labelledby="admin-page-title">
      <h1 id="admin-page-title" tabIndex={-1} className="font-serif text-[2rem] font-bold text-plum outline-none">
        {ADMIN_COPY.gifts.title}
      </h1>
      <p className="mt-2">{ADMIN_COPY.gifts.subtitle}</p>

      <div role="tablist" aria-label="Estado dos presentes" className="mt-6 flex flex-wrap gap-2">
        {([
          ['available', 'Disponíveis'],
          ['gifted', 'Presenteados'],
        ] as const).map(([value, label], index, all) => (
          <Button
            key={value}
            role="tab"
            aria-selected={status === value}
            tabIndex={status === value ? 0 : -1}
            variant={status === value ? 'adminPrimary' : 'adminSecondary'}
            onKeyDown={(event) => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
              event.preventDefault()
              const next =
                event.key === 'Home'
                  ? all[0][0]
                  : event.key === 'End'
                    ? all[1][0]
                    : all[index === 0 ? 1 : 0][0]
              navigate(`${ADMIN_ROUTES.gifts}?status=${next}`)
            }}
            onClick={() => navigate(`${ADMIN_ROUTES.gifts}?status=${value}`)}
          >
            {label} ({counts[value]})
          </Button>
        ))}
      </div>

      {query.status === 'pending' ? (
        <div className="mt-6 grid gap-6" aria-label="Carregando presentes">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index}>
              <div className="h-7 w-44 animate-pulse rounded bg-card motion-reduce:animate-none" />
              <div className="mt-3 grid gap-3">
                {Array.from({ length: 4 }, (_, row) => <div key={row} className="h-24 animate-pulse rounded-lg border border-line bg-card motion-reduce:animate-none" />)}
              </div>
            </div>
          ))}
        </div>
      ) : query.status === 'error' ? (
        <div role="alert" className="mt-6 rounded-lg border border-wine bg-wine/5 p-5">
          <p>Não foi possível carregar os presentes.</p>
          <Button variant="adminSecondary" className="mt-4" onClick={() => window.location.reload()}>Tentar novamente</Button>
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Field
                id="admin-gift-search"
                type="search"
                appearance="outline"
                label="Buscar presentes"
                placeholder="Buscar vinho, código ou quem presenteou"
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
              />
            </div>
            {search ? <Button variant="adminSecondary" onClick={() => setSearch('')}>Limpar busca</Button> : null}
          </div>
          <p className="sr-only" aria-live="polite">{visible.length} {visible.length === 1 ? 'vinho encontrado' : 'vinhos encontrados'}.</p>

          {visible.length === 0 ? (
            <div className="mt-6 rounded-lg border border-line bg-card p-6">
              <h2 className="text-xl font-bold text-plum">
                {search
                  ? 'Nenhum vinho encontrado'
                  : status === 'available'
                    ? 'Todos os vinhos foram presenteados'
                    : 'Nenhum vinho presenteado ainda.'}
              </h2>
              <p className="mt-2">
                {search
                  ? 'Tente outro vinho, código ou nome de quem presenteou.'
                  : status === 'available'
                    ? 'Consulte os rótulos já escolhidos.'
                    : 'As marcações aparecerão aqui.'}
              </p>
              <Button
                variant="adminSecondary"
                className="mt-4"
                onClick={() =>
                  search
                    ? setSearch('')
                    : navigate(
                        `${ADMIN_ROUTES.gifts}?status=${
                          status === 'available' ? 'gifted' : 'available'
                        }`,
                      )
                }
              >
                {search ? 'Limpar busca' : status === 'available' ? 'Ver presenteados' : 'Ver disponíveis'}
              </Button>
            </div>
          ) : (
            <div className="mt-6 grid gap-8">
              {groups.map((group) => {
                const band = GIFT_BANDS.find((item) => item.category === group.category)!
                return (
                  <section key={group.category} aria-labelledby={`admin-band-${group.category}`}>
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <h2 id={`admin-band-${group.category}`} className="font-serif text-2xl font-bold text-plum">{band.heading}</h2>
                      <p className="text-sm">{group.items.length} {group.items.length === 1 ? 'vinho' : 'vinhos'}</p>
                    </div>
                    <ul className="mt-3 grid gap-3">
                      {group.items.map((wine) => (
                        <li key={wine.id} aria-busy={pendingWines.has(wine.id)} className="flex flex-col gap-4 rounded-lg border border-line bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <h3 className="break-words font-bold text-plum">{wine.name}</h3>
                            <p className="mt-1 text-sm text-ink/70">
                              <span className="whitespace-nowrap">Cód. Mistral {wine.productCode}</span> · {currency(wine.priceCents)}
                            </p>
                            {wine.status === 'gifted' ? (
                              <p className="mt-2 break-words text-sm">
                                Presenteado por <strong>{wine.giftedBy}</strong>
                                {wine.giftedAt ? ` em ${dateTime(wine.giftedAt)}` : ''}
                              </p>
                            ) : null}
                          </div>
                          <Button
                            variant={wine.status === 'available' ? 'adminPrimary' : 'adminSecondary'}
                            disabled={pendingWines.has(wine.id)}
                            onClick={() => {
                              if (wine.status === 'available') {
                                setDialogError(null)
                                setReview(false)
                                setMarking(wine)
                              } else {
                                setUnmarking(wine)
                              }
                            }}
                          >
                            {wine.status === 'available' ? 'Marcar como presenteado' : 'Desfazer marcação'}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </section>
                )
              })}
            </div>
          )}
        </>
      )}

      <MarkGiftDialog
        wine={marking}
        busy={Boolean(marking && pendingWines.has(marking.id))}
        error={dialogError}
        review={review}
        onCancel={() => {
          setMarking(null)
          setDialogError(null)
          setReview(false)
        }}
        onSubmit={(presenter) => void submitMark(presenter)}
      />
      <AdminConfirmDialog
        open={unmarking !== null}
        title={`Tornar ${unmarking?.name ?? ''} disponível novamente?`}
        body="O nome de quem presenteou e a data da marcação serão removidos."
        confirmLabel="Tornar disponível"
        cancelLabel="Voltar aos presentes"
        busy={Boolean(unmarking && pendingWines.has(unmarking.id))}
        onCancel={() => setUnmarking(null)}
        onConfirm={() => void confirmUnmark()}
      />
      {feedback ? <Toast onDismiss={() => setFeedback(null)}>{feedback}</Toast> : null}
    </section>
  )
}

export default AdminGifts
