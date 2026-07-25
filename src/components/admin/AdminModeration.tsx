import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery_experimental } from 'convex/react'
import { useLocation, useNavigate } from 'react-router'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import {
  ADMIN_COPY,
  ADMIN_ROUTES,
  moderationStatusFromSearch,
} from '../../content/admin'
import {
  MODERATION_UNDO_MS,
  moderationTargets,
  usePendingOperations,
  type ModerationStatus,
  type ModerationUndoCommand,
} from '../../lib/adminOperations'
import Button from '../ui/Button'
import Toast from '../ui/Toast'

type ModerationPost = {
  id: Id<'posts'>
  author: string
  message?: string
  imageUrl?: string
  status: ModerationStatus
  createdAt: number
  moderatedAt?: number
  approvedAt?: number
  moderationRevision: number
}

const tabs: Array<{ value: ModerationStatus; label: string }> = [
  { value: 'pendente', label: 'Pendentes' },
  { value: 'aprovado', label: 'Aprovadas' },
  { value: 'oculto', label: 'Ocultas' },
]

function formatDate(value: number) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(value)
}

function emptyCopy(status: ModerationStatus) {
  if (status === 'pendente') {
    return ['Fila em dia', 'Nenhuma memória aguardando revisão.'] as const
  }
  if (status === 'aprovado') {
    return ['Nenhuma memória aprovada ainda.', 'As aprovações aparecerão aqui.'] as const
  }
  return ['Nenhuma memória oculta.', 'As memórias ocultadas aparecerão aqui.'] as const
}

export function AdminModeration({
  token,
  onUnauthorized,
}: {
  token: string
  onUnauthorized: () => void
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const status = moderationStatusFromSearch(location.search) ?? 'pendente'
  const pending = useQuery_experimental({
    query: api.adminPosts.listByStatus,
    args: { token, status: 'pendente' },
  })
  const approved = useQuery_experimental({
    query: api.adminPosts.listByStatus,
    args: { token, status: 'aprovado' },
  })
  const hidden = useQuery_experimental({
    query: api.adminPosts.listByStatus,
    args: { token, status: 'oculto' },
  })
  const transitionPost = useMutation(api.adminPosts.transitionPost)
  const undoPost = useMutation(api.adminPosts.undoPost)
  const queries = { pendente: pending, aprovado: approved, oculto: hidden }
  const current = queries[status]
  const pendingPosts = usePendingOperations()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [imageRetries, setImageRetries] = useState<Record<string, number>>({})
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const [undo, setUndo] = useState<ModerationUndoCommand | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    for (const query of Object.values(queries)) {
      if (query.status === 'success' && query.data.kind === 'unauthorized') {
        onUnauthorized()
        return
      }
    }
  }, [approved, hidden, onUnauthorized, pending])

  useEffect(() => {
    if (!undo) return
    const timer = window.setTimeout(() => setUndo(null), MODERATION_UNDO_MS)
    return () => window.clearTimeout(timer)
  }, [undo])

  useEffect(() => {
    const clear = () => {
      pendingPosts.clear()
      setUndo(null)
      setExpanded(new Set())
      setFeedback(null)
      setError(null)
    }
    window.addEventListener('admin-sensitive-state-clear', clear)
    return () => window.removeEventListener('admin-sensitive-state-clear', clear)
  }, [pendingPosts.clear])

  const counts = useMemo(
    () =>
      Object.fromEntries(
        tabs.map(({ value }) => {
          const query = queries[value]
          return [
            value,
            query.status === 'success' && query.data.kind === 'ready'
              ? query.data.posts.length
              : null,
          ]
        }),
      ) as Record<ModerationStatus, number | null>,
    [approved, hidden, pending],
  )

  async function apply(post: ModerationPost, targetStatus: ModerationStatus) {
    await pendingPosts.run(post.id, async (command) => {
      if (command.isLatest()) setError(null)
      try {
        const result = await transitionPost({
          token,
          postId: post.id,
          expectedStatus: post.status,
          expectedRevision: post.moderationRevision,
          targetStatus,
        })
        if (!command.isCurrent()) return
        if (result.kind === 'unauthorized') return onUnauthorized()
        if (!command.isLatest()) return
        if (result.kind === 'conflict') {
          setFeedback(
            'Esta memória foi alterada em outra sessão. Mantivemos a versão mais recente.',
          )
        } else if (result.kind === 'updated') {
          setUndo({
            postId: post.id,
            priorStatus: post.status,
            expectedStatus: result.post.status,
            expectedRevision: result.post.moderationRevision,
            expiresAt: Date.now() + MODERATION_UNDO_MS,
          })
          setFeedback(
            result.post.status === 'aprovado'
              ? 'Memória aprovada.'
              : 'Memória ocultada.',
          )
        } else {
          setError('Não foi possível atualizar esta memória. Tente novamente.')
        }
      } catch {
        if (command.isCurrent() && command.isLatest()) {
          setError('Não foi possível atualizar esta memória. Tente novamente.')
        }
      }
    })
  }

  async function handleUndo() {
    if (!undo || Date.now() >= undo.expiresAt) {
      setUndo(null)
      return
    }
    const commandUndo = undo
    await pendingPosts.run(undo.postId, async (command) => {
      try {
        const result = await undoPost({
          token,
          postId: commandUndo.postId as Id<'posts'>,
          priorStatus: commandUndo.priorStatus,
          expectedStatus: commandUndo.expectedStatus,
          expectedRevision: commandUndo.expectedRevision,
        })
        if (!command.isCurrent()) return
        if (command.isLatest()) setUndo(null)
        if (result.kind === 'unauthorized') return onUnauthorized()
        if (!command.isLatest()) return
        setFeedback(
          result.kind === 'updated'
            ? 'Alteração desfeita.'
            : result.kind === 'conflict'
              ? 'Esta memória foi alterada em outra sessão. Mantivemos a versão mais recente.'
              : 'Não foi possível desfazer esta alteração.',
        )
      } catch {
        if (command.isCurrent() && command.isLatest()) {
          setFeedback('Não foi possível desfazer esta alteração.')
        }
      }
    })
  }

  const posts =
    current.status === 'success' && current.data.kind === 'ready'
      ? (current.data.posts as ModerationPost[])
      : []
  const [emptyTitle, emptyBody] = emptyCopy(status)

  return (
    <section aria-labelledby="admin-page-title">
      <h1
        id="admin-page-title"
        tabIndex={-1}
        className="font-serif text-[2rem] font-bold text-plum outline-none"
      >
        {ADMIN_COPY.moderation.title}
      </h1>
      <p className="mt-2">{ADMIN_COPY.moderation.subtitle}</p>

      <div role="tablist" aria-label="Estado das memórias" className="mt-6 flex flex-wrap gap-2">
        {tabs.map((tab, index) => (
          <Button
            key={tab.value}
            role="tab"
            aria-selected={status === tab.value}
            tabIndex={status === tab.value ? 0 : -1}
            variant={status === tab.value ? 'adminPrimary' : 'adminSecondary'}
            onKeyDown={(event) => {
              const delta =
                event.key === 'ArrowRight'
                  ? 1
                  : event.key === 'ArrowLeft'
                    ? -1
                    : 0
              const targetIndex =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? tabs.length - 1
                    : delta
                      ? (index + delta + tabs.length) % tabs.length
                      : -1
              if (targetIndex >= 0) {
                event.preventDefault()
                navigate(
                  `${ADMIN_ROUTES.moderation}?status=${tabs[targetIndex].value}`,
                )
              }
            }}
            onClick={() =>
              navigate(`${ADMIN_ROUTES.moderation}?status=${tab.value}`)
            }
          >
            {tab.label}
            {counts[tab.value] === null ? '' : ` (${counts[tab.value]})`}
          </Button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="mt-5 rounded-lg border border-wine bg-wine/5 p-4 text-wine">
          {error}
        </p>
      ) : null}

      {current.status === 'pending' ? (
        <div aria-label="Carregando memórias" className="mt-6 grid gap-5">
          {Array.from({ length: 2 }, (_, index) => (
            <div
              key={index}
              className="min-h-80 animate-pulse rounded-lg border border-line bg-card motion-reduce:animate-none"
            />
          ))}
        </div>
      ) : current.status === 'error' ? (
        <div role="alert" className="mt-6 rounded-lg border border-wine bg-wine/5 p-5">
          <p>Não foi possível carregar esta área. Confira a conexão e tente novamente.</p>
          <Button variant="adminSecondary" className="mt-4" onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
        </div>
      ) : posts.length === 0 ? (
        <div className="mt-6 rounded-lg border border-line bg-card p-6">
          <h2 className="text-xl font-bold text-plum">{emptyTitle}</h2>
          <p className="mt-2">{emptyBody}</p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-5">
          {posts.map((post) => {
            const isExpanded = expanded.has(post.id)
            const imageFailed = imageErrors.has(post.id)
            const targets = moderationTargets(post.status)
            return (
              <li
                key={post.id}
                className="overflow-hidden rounded-lg border border-line bg-card sm:grid sm:grid-cols-[minmax(220px,40%)_1fr]"
                aria-busy={pendingPosts.has(post.id)}
              >
                {post.imageUrl ? (
                  <div className="grid min-h-64 place-items-center bg-sand/45">
                    {imageFailed ? (
                      <div className="p-6 text-center">
                        <p>Não foi possível carregar esta foto.</p>
                        <Button
                          variant="adminSecondary"
                          className="mt-4"
                          onClick={() => {
                            setImageErrors((currentErrors) => {
                              const next = new Set(currentErrors)
                              next.delete(post.id)
                              return next
                            })
                            setImageRetries((currentRetries) => ({
                              ...currentRetries,
                              [post.id]: (currentRetries[post.id] ?? 0) + 1,
                            }))
                          }}
                        >
                          Tentar novamente
                        </Button>
                      </div>
                    ) : (
                      <img
                        key={imageRetries[post.id] ?? 0}
                        src={post.imageUrl}
                        alt={`Memória enviada por ${post.author}`}
                        className="max-h-[32rem] h-full w-full object-contain"
                        onError={() =>
                          setImageErrors((currentErrors) =>
                            new Set(currentErrors).add(post.id),
                          )
                        }
                      />
                    )}
                  </div>
                ) : (
                  <div className="grid min-h-48 place-items-center bg-sand/45 p-6 text-center text-plum/70">
                    Memória em texto
                  </div>
                )}
                <div className="flex min-w-0 flex-col p-5 sm:p-6">
                  {post.message ? (
                    <>
                      <p
                        className={`whitespace-pre-wrap break-words font-serif text-xl leading-snug text-plum ${
                          isExpanded ? '' : 'line-clamp-6'
                        }`}
                      >
                        {post.message}
                      </p>
                      <Button
                        variant="adminSecondary"
                        className="mt-3 self-start"
                        aria-expanded={isExpanded}
                        onClick={() =>
                          setExpanded((currentExpanded) => {
                            const next = new Set(currentExpanded)
                            if (next.has(post.id)) next.delete(post.id)
                            else next.add(post.id)
                            return next
                          })
                        }
                      >
                        {isExpanded ? 'Recolher' : 'Ler tudo'}
                      </Button>
                    </>
                  ) : (
                    <p className="font-serif text-xl italic text-plum/70">
                      Foto sem recado
                    </p>
                  )}
                  <dl className="mt-5 grid gap-1 text-sm">
                    <div><dt className="inline font-bold">Enviada por: </dt><dd className="inline break-words">{post.author}</dd></div>
                    <div><dt className="inline font-bold">Data: </dt><dd className="inline">{formatDate(post.createdAt)}</dd></div>
                  </dl>
                  <div className="mt-auto flex flex-wrap gap-3 pt-6">
                    {targets.map((target) => (
                      <Button
                        key={target}
                        variant={target === 'aprovado' ? 'adminPrimary' : 'adminDestructive'}
                        disabled={pendingPosts.has(post.id)}
                        onClick={() => void apply(post, target)}
                      >
                        {target === 'aprovado' ? 'Aprovar memória' : 'Ocultar memória'}
                      </Button>
                    ))}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {feedback ? (
        <Toast
          action={
            undo ? (
              <button
                type="button"
                className="min-h-11 font-bold underline"
                onClick={() => void handleUndo()}
              >
                Desfazer
              </button>
            ) : null
          }
          onDismiss={() => {
            setFeedback(null)
            setUndo(null)
          }}
        >
          {feedback}
        </Toast>
      ) : null}
    </section>
  )
}

export default AdminModeration
