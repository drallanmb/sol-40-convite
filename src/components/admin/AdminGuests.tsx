import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery_experimental } from 'convex/react'
import { useLocation, useNavigate } from 'react-router'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import {
  ADMIN_COPY,
  ADMIN_ROUTES,
  guestPresenceFromSearch,
  guestPresenceSearch,
  type GuestPresenceFilter,
} from '../../content/admin'
import {
  createAdminGuestDraft,
  reduceAdminGuestDraft,
  type AdminFamilySnapshot,
  type AdminGuestDraftState,
} from '../../lib/adminGuestDraft'
import {
  filterFamilies,
  guestResultCount,
  type AdminPresence,
} from '../../lib/adminSearch'
import { usePendingOperations } from '../../lib/adminOperations'
import { formatBrazilianPhoneInput } from '../../lib/phone'
import Button from '../ui/Button'
import Feedback from '../ui/Feedback'
import Field from '../ui/Field'
import Toast from '../ui/Toast'
import AdminConfirmDialog from './AdminConfirmDialog'
import AdminGuestImport from './AdminGuestImport'

type AdminFamily = Omit<AdminFamilySnapshot, 'id' | 'guests'> & {
  id: Id<'rsvps'>
  guests: Array<
    Omit<AdminFamilySnapshot['guests'][number], 'id'> & {
      id: Id<'rsvpGuests'>
    }
  >
}

type Removal =
  | { kind: 'guest'; family: AdminFamily; guestId: Id<'rsvpGuests'>; name: string }
  | { kind: 'family'; family: AdminFamily }
  | null

const filters: Array<{ value: GuestPresenceFilter; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'yes', label: 'Confirmados' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'no', label: 'Não vão' },
]

function attendanceLabel(value: AdminPresence) {
  return value === 'yes' ? 'Vai' : value === 'no' ? 'Não vai' : 'Pendente'
}

function attendanceSummary(family: AdminFamily) {
  const counts = family.guests.reduce(
    (result, guest) => ({ ...result, [guest.attendance]: result[guest.attendance] + 1 }),
    { yes: 0, no: 0, pending: 0 },
  )
  return [
    counts.yes ? `${counts.yes} confirmado${counts.yes === 1 ? '' : 's'}` : '',
    counts.no ? `${counts.no} ${counts.no === 1 ? 'recusa' : 'recusas'}` : '',
    counts.pending ? `${counts.pending} pendente${counts.pending === 1 ? '' : 's'}` : '',
  ].filter(Boolean).join(' · ') || 'Nenhuma pessoa'
}

function CreateFamilyDialog({
  open,
  busy,
  error,
  onCancel,
  onCreate,
}: {
  open: boolean
  busy: boolean
  error: string | null
  onCancel: () => void
  onCreate: (values: {
    displayName: string
    phone: string
    contact?: string
    guests: Array<{ name: string; attendance: AdminPresence }>
  }) => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [contact, setContact] = useState('')
  const [guests, setGuests] = useState<string[]>([])
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      window.requestAnimationFrame(() => nameRef.current?.focus())
    } else if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    if (open) return
    setDisplayName('')
    setPhone('')
    setContact('')
    setGuests([])
  }, [open])

  function close() {
    if (busy) return
    ref.current?.close()
    onCancel()
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-lg border border-line bg-card p-5 text-ink backdrop:bg-plum/55 sm:p-8"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onCreate({
            displayName,
            phone,
            ...(contact.trim() ? { contact } : {}),
            guests: guests
              .filter((name) => name.trim())
              .map((name) => ({ name, attendance: 'pending' })),
          })
        }}
      >
        <h2 id={titleId} className="font-serif text-2xl font-bold text-plum">
          Adicionar família
        </h2>
        <div className="mt-6">
          <Field ref={nameRef} id="new-family-name" appearance="outline" label="Nome da família" required value={displayName} disabled={busy} onChange={(event) => setDisplayName(event.currentTarget.value)} />
          <Field id="new-family-phone" appearance="outline" label="Telefone" inputMode="tel" required value={phone} disabled={busy} onChange={(event) => setPhone(formatBrazilianPhoneInput(event.currentTarget.value))} />
          <Field id="new-family-contact" appearance="outline" label="Contato (opcional)" value={contact} disabled={busy} onChange={(event) => setContact(event.currentTarget.value)} />
        </div>
        <div className="border-t border-line pt-5">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-bold">Pessoas</h3>
            <Button variant="adminSecondary" disabled={busy} onClick={() => setGuests((current) => [...current, ''])}>Adicionar pessoa</Button>
          </div>
          {guests.length === 0 ? <p className="mt-3 text-sm text-ink/70">Você pode criar a família sem pessoas e adicioná-las depois.</p> : null}
          <div className="mt-4 grid gap-3">
            {guests.map((guest, index) => (
              <div key={index} className="flex items-end gap-2">
                <div className="flex-1">
                  <Field id={`new-guest-${index}`} appearance="outline" label={`Pessoa ${index + 1}`} value={guest} disabled={busy} onChange={(event) => setGuests((current) => current.map((value, guestIndex) => guestIndex === index ? event.currentTarget.value : value))} />
                </div>
                <Button variant="adminSecondary" aria-label={`Remover pessoa ${index + 1}`} disabled={busy} onClick={() => setGuests((current) => current.filter((_, guestIndex) => guestIndex !== index))}>×</Button>
              </div>
            ))}
          </div>
        </div>
        {error ? <p role="alert" className="mt-4 text-wine">{error}</p> : null}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button variant="adminSecondary" disabled={busy} onClick={close}>Voltar sem criar</Button>
          <Button type="submit" variant="adminPrimary" disabled={busy || !displayName.trim() || !phone.trim()} aria-busy={busy}>{busy ? 'Criando…' : 'Criar família'}</Button>
        </div>
      </form>
    </dialog>
  )
}

export function AdminGuests({
  token,
  onUnauthorized,
}: {
  token: string
  onUnauthorized: () => void
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const query = useQuery_experimental({ query: api.adminRsvps.listFamilies, args: { token } })
  const createFamily = useMutation(api.adminRsvps.createFamily)
  const updateFamily = useMutation(api.adminRsvps.updateFamily)
  const addGuest = useMutation(api.adminRsvps.addGuest)
  const updateGuest = useMutation(api.adminRsvps.updateGuest)
  const removeGuest = useMutation(api.adminRsvps.removeGuest)
  const removeFamily = useMutation(api.adminRsvps.removeFamily)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [drafts, setDrafts] = useState<Map<string, AdminGuestDraftState>>(new Map())
  const pendingFamilies = usePendingOperations()
  const [createOpen, setCreateOpen] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [removal, setRemoval] = useState<Removal>(null)
  const [addNames, setAddNames] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState<string | null>(null)
  const presence = guestPresenceFromSearch(location.search)
  const families =
    query.status === 'success' && query.data.kind === 'ready'
      ? (query.data.families as AdminFamily[])
      : []
  const familyRevisionKey = families
    .map((family) => `${family.id}:${family.updatedAt}`)
    .join('|')

  useEffect(() => {
    if (query.status === 'success' && query.data.kind === 'unauthorized') onUnauthorized()
  }, [onUnauthorized, query])

  useEffect(() => {
    setDrafts((current) => {
      const next = new Map(current)
      for (const family of families) {
        const existing = next.get(family.id)
        next.set(
          family.id,
          existing
            ? reduceAdminGuestDraft(existing, { type: 'server-reconciled', snapshot: family })
            : createAdminGuestDraft(family),
        )
      }
      for (const id of next.keys()) {
        if (!families.some((family) => family.id === id)) next.delete(id)
      }
      return next
    })
  }, [familyRevisionKey])

  useEffect(() => {
    const clear = () => {
      pendingFamilies.clear()
      setDrafts(new Map())
      setExpanded(new Set())
      setSearch('')
      setCreateOpen(false)
      setCreateError(null)
      setRemoval(null)
      setAddNames({})
      setFeedback(null)
    }
    window.addEventListener('admin-sensitive-state-clear', clear)
    return () => window.removeEventListener('admin-sensitive-state-clear', clear)
  }, [pendingFamilies.clear])

  const visible = useMemo(
    () => filterFamilies(families, { query: search, presence }),
    [families, presence, search],
  )
  const resultAnnouncement = `${visible.length} ${visible.length === 1 ? 'família encontrada' : 'famílias encontradas'}, ${guestResultCount(visible)} ${guestResultCount(visible) === 1 ? 'pessoa' : 'pessoas'}.`

  function setPresence(value: GuestPresenceFilter) {
    navigate(`${ADMIN_ROUTES.guests}${guestPresenceSearch(value)}`)
  }

  function updateDraft(id: string, action: Parameters<typeof reduceAdminGuestDraft>[1]) {
    setDrafts((current) => {
      const draft = current.get(id)
      if (!draft) return current
      const next = new Map(current)
      next.set(id, reduceAdminGuestDraft(draft, action))
      return next
    })
  }

  async function saveFamily(family: AdminFamily) {
    const draft = drafts.get(family.id)
    if (!draft || draft.conflict) return
    const expectedUpdatedAt = draft.expectedUpdatedAt
    await pendingFamilies.run(family.id, async (command) => {
      try {
        const result = await updateFamily({
          token,
          familyId: family.id,
          expectedUpdatedAt,
          patch: {
            ...(draft.dirtyFields.has('displayName') ? { displayName: draft.values.displayName } : {}),
            ...(draft.dirtyFields.has('phone') ? { phone: draft.values.phone } : {}),
            ...(draft.dirtyFields.has('contact') ? { contact: draft.values.contact || null } : {}),
          },
        })
        if (!command.isCurrent()) return
        if (result.kind === 'unauthorized') return onUnauthorized()
        if (result.kind === 'conflict') {
          updateDraft(family.id, { type: 'server-reconciled', snapshot: result.family })
        } else if (result.kind === 'saved') {
          updateDraft(family.id, { type: 'save-succeeded', expectedUpdatedAt, snapshot: result.family })
          if (command.isLatest()) setFeedback('Alterações salvas.')
        } else {
          updateDraft(family.id, { type: 'save-failed', message: result.kind === 'invalid' ? result.message : 'Não foi possível salvar esta família.' })
        }
      } catch {
        if (command.isCurrent()) {
          updateDraft(family.id, { type: 'save-failed', message: 'Não foi possível salvar esta família. Tente novamente.' })
        }
      }
    })
  }

  async function savePerson(family: AdminFamily, guestId: Id<'rsvpGuests'>) {
    const draft = drafts.get(family.id)
    const values = draft?.guestValues[guestId]
    if (!draft || !values || draft.conflict) return
    const expectedUpdatedAt = draft.expectedUpdatedAt
    await pendingFamilies.run(family.id, async (command) => {
      try {
        const result = await updateGuest({ token, familyId: family.id, guestId, expectedUpdatedAt, patch: values })
        if (!command.isCurrent()) return
        if (result.kind === 'unauthorized') return onUnauthorized()
        if (result.kind === 'conflict') updateDraft(family.id, { type: 'server-reconciled', snapshot: result.family })
        else if (result.kind === 'saved') {
          updateDraft(family.id, { type: 'save-succeeded', expectedUpdatedAt, snapshot: result.family })
          if (command.isLatest()) setFeedback('Alterações salvas.')
        } else updateDraft(family.id, { type: 'save-failed', message: result.kind === 'invalid' ? result.message : 'Não foi possível salvar esta pessoa.' })
      } catch {
        if (command.isCurrent()) {
          updateDraft(family.id, { type: 'save-failed', message: 'Não foi possível salvar esta pessoa. Tente novamente.' })
        }
      }
    })
  }

  async function addPerson(family: AdminFamily) {
    const name = addNames[family.id]?.trim()
    const draft = drafts.get(family.id)
    if (!name || !draft) return
    await pendingFamilies.run(family.id, async (command) => {
      try {
        const result = await addGuest({ token, familyId: family.id, expectedUpdatedAt: draft.expectedUpdatedAt, name, attendance: 'pending' })
        if (!command.isCurrent()) return
        if (result.kind === 'unauthorized') return onUnauthorized()
        if (result.kind === 'saved') {
          updateDraft(family.id, { type: 'save-succeeded', expectedUpdatedAt: draft.expectedUpdatedAt, snapshot: result.family })
          setAddNames((current) => ({ ...current, [family.id]: '' }))
          if (command.isLatest()) setFeedback('Pessoa adicionada.')
        } else if (result.kind === 'conflict') updateDraft(family.id, { type: 'server-reconciled', snapshot: result.family })
        else updateDraft(family.id, { type: 'save-failed', message: result.kind === 'invalid' ? result.message : 'Não foi possível adicionar a pessoa.' })
      } catch {
        if (command.isCurrent()) {
          updateDraft(family.id, { type: 'save-failed', message: 'Não foi possível adicionar a pessoa.' })
        }
      }
    })
  }

  async function confirmRemoval() {
    if (!removal) return
    const draft = drafts.get(removal.family.id)
    if (!draft) return
    const commandRemoval = removal
    await pendingFamilies.run(removal.family.id, async (command) => {
      try {
        const result = commandRemoval.kind === 'guest'
          ? await removeGuest({ token, familyId: commandRemoval.family.id, guestId: commandRemoval.guestId, expectedUpdatedAt: draft.expectedUpdatedAt })
          : await removeFamily({ token, familyId: commandRemoval.family.id, expectedUpdatedAt: draft.expectedUpdatedAt })
        if (!command.isCurrent()) return
        if (result.kind === 'unauthorized') return onUnauthorized()
        if (result.kind === 'conflict') updateDraft(commandRemoval.family.id, { type: 'server-reconciled', snapshot: result.family })
        else if (result.kind === 'saved') {
          updateDraft(commandRemoval.family.id, { type: 'save-succeeded', expectedUpdatedAt: draft.expectedUpdatedAt, snapshot: result.family })
          if (command.isLatest()) setFeedback('Pessoa removida.')
        } else if (result.kind === 'removed') {
          if (command.isLatest()) setFeedback('Família removida.')
        } else updateDraft(commandRemoval.family.id, { type: 'save-failed', message: result.kind === 'invalid' ? result.message : 'Não foi possível remover.' })
      } catch {
        if (command.isCurrent()) {
          updateDraft(commandRemoval.family.id, { type: 'save-failed', message: 'Não foi possível remover. Tente novamente.' })
        }
      } finally {
        if (command.isCurrent()) {
          setRemoval((current) => current === commandRemoval ? null : current)
        }
      }
    })
  }

  if (query.status === 'pending') {
    return <section aria-labelledby="admin-page-title"><h1 id="admin-page-title" tabIndex={-1} className="font-serif text-[2rem] font-bold text-plum outline-none">{ADMIN_COPY.guests.title}</h1><div className="mt-6 grid gap-3" aria-label="Carregando convidados">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-24 animate-pulse rounded-lg border border-line bg-card motion-reduce:animate-none" />)}</div></section>
  }
  if (query.status === 'error') {
    return <section aria-labelledby="admin-page-title"><h1 id="admin-page-title" tabIndex={-1} className="font-serif text-[2rem] font-bold text-plum outline-none">{ADMIN_COPY.guests.title}</h1><div role="alert" className="mt-6 rounded-lg border border-wine bg-wine/5 p-5"><p>Não foi possível carregar esta área. Confira a conexão e tente novamente.</p><Button variant="adminSecondary" className="mt-4" onClick={() => window.location.reload()}>Tentar novamente</Button></div></section>
  }

  return (
    <section aria-labelledby="admin-page-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 id="admin-page-title" tabIndex={-1} className="font-serif text-[2rem] font-bold text-plum outline-none">{ADMIN_COPY.guests.title}</h1><p className="mt-2">{ADMIN_COPY.guests.subtitle}</p></div>
        <div className="flex flex-wrap gap-3">
          <AdminGuestImport token={token} onUnauthorized={onUnauthorized} />
          <Button variant="adminPrimary" onClick={() => { setCreateError(null); setCreateOpen(true) }}>Adicionar família</Button>
        </div>
      </div>
      {families.length > 0 ? (
        <div className="mt-6 grid gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1"><Field id="admin-guest-search" appearance="outline" type="search" label="Buscar convidados" placeholder="Buscar família, pessoa ou telefone" value={search} onChange={(event) => setSearch(event.currentTarget.value)} /></div>
            {search ? <Button variant="adminSecondary" onClick={() => setSearch('')}>Limpar busca</Button> : null}
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Filtrar por presença">
            {filters.map((filter) => <Button key={filter.value} variant={presence === filter.value ? 'adminPrimary' : 'adminSecondary'} aria-pressed={presence === filter.value} onClick={() => setPresence(filter.value)}>{filter.label}</Button>)}
          </div>
          <p className="text-sm text-ink/70">O filtro encontra famílias; ao abrir, todas as pessoas continuam visíveis.</p>
          <p className="sr-only" aria-live="polite" aria-atomic="true">{resultAnnouncement}</p>
        </div>
      ) : null}

      {families.length === 0 ? (
        <div className="mt-8 rounded-lg border border-line bg-card p-6"><h2 className="text-xl font-bold">Nenhuma família cadastrada</h2><p className="mt-2">Adicione uma família para começar a organizar as confirmações.</p><Button variant="adminPrimary" className="mt-5" onClick={() => setCreateOpen(true)}>Adicionar família</Button></div>
      ) : visible.length === 0 ? (
        <div className="mt-8 rounded-lg border border-line bg-card p-6"><h2 className="text-xl font-bold">{search ? 'Nenhuma família encontrada' : 'Nenhuma família neste filtro'}</h2><p className="mt-2">{search ? 'Tente outro nome ou telefone.' : 'Não há pessoas com esta resposta agora.'}</p><Button variant="adminSecondary" className="mt-5" onClick={() => search ? setSearch('') : setPresence('all')}>{search ? 'Limpar busca' : 'Ver todos'}</Button></div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {visible.map((family) => {
            const open = expanded.has(family.id)
            const draft = drafts.get(family.id)
            const busy = pendingFamilies.has(family.id)
            return (
              <li key={family.id} className="overflow-hidden rounded-lg border border-line bg-card">
                <button type="button" aria-expanded={open} aria-controls={`family-${family.id}`} className="flex min-h-20 w-full items-center justify-between gap-4 p-4 text-left sm:p-5" onClick={() => setExpanded((current) => { const next = new Set(current); if (next.has(family.id)) next.delete(family.id); else next.add(family.id); return next })}>
                  <span className="min-w-0"><strong className="block break-words text-base">{family.displayName}</strong><span className="mt-1 block text-sm text-ink/70"><span className="whitespace-nowrap">{formatBrazilianPhoneInput(family.phone)}</span> · {family.guests.length} {family.guests.length === 1 ? 'pessoa' : 'pessoas'} · {attendanceSummary(family)}</span></span>
                  <span aria-hidden="true" className="shrink-0 text-xl">{open ? '−' : '+'}</span>
                </button>
                {open && draft ? (
                  <div id={`family-${family.id}`} className="border-t border-line p-4 sm:p-6">
                    {draft.conflict ? <Feedback role="alert" tone="warning" className="mb-5"><p>Esta família foi alterada em outra sessão. Suas mudanças não foram salvas.</p><Button variant="adminSecondary" className="mt-3" onClick={() => updateDraft(family.id, { type: 'reload-current' })}>Revisar versão atual</Button></Feedback> : null}
                    <div className="grid gap-1 sm:grid-cols-2">
                      <Field id={`family-name-${family.id}`} appearance="outline" label="Nome da família" value={draft.values.displayName} disabled={busy} onChange={(event) => updateDraft(family.id, { type: 'family-field-changed', field: 'displayName', value: event.currentTarget.value })} />
                      <Field id={`family-phone-${family.id}`} appearance="outline" label="Telefone" value={formatBrazilianPhoneInput(draft.values.phone)} disabled={busy} onChange={(event) => updateDraft(family.id, { type: 'family-field-changed', field: 'phone', value: formatBrazilianPhoneInput(event.currentTarget.value) })} />
                      <div className="sm:col-span-2"><Field id={`family-contact-${family.id}`} appearance="outline" label="Contato" value={draft.values.contact} disabled={busy} onChange={(event) => updateDraft(family.id, { type: 'family-field-changed', field: 'contact', value: event.currentTarget.value })} /></div>
                    </div>
                    {draft.phoneChangeWarning ? <p className="mb-4 text-sm text-rsvp-pendente">Ao trocar o telefone, os acessos públicos deste convite serão encerrados.</p> : null}
                    {draft.error ? <p role="alert" className="mb-4 text-wine">{draft.error}</p> : null}
                    <Button variant="adminPrimary" disabled={busy || draft.conflict || draft.dirtyFields.size === 0} aria-busy={busy} onClick={() => void saveFamily(family)}>{busy ? 'Salvando…' : 'Salvar família'}</Button>
                    <div className="mt-8 border-t border-line pt-6">
                      <h2 className="text-xl font-bold">Pessoas</h2>
                      {family.guests.length === 0 ? <p className="mt-3">Nenhuma pessoa nesta família.</p> : (
                        <ul className="mt-4 grid gap-4">
                          {family.guests.map((guest) => {
                            const values = draft.guestValues[guest.id] ?? guest
                            const personDirty = draft.dirtyGuestFields.has(guest.id)
                            return <li key={guest.id} className="rounded-lg bg-sand/35 p-4"><Field id={`guest-name-${guest.id}`} appearance="outline" label="Nome" value={values.name} disabled={busy} onChange={(event) => updateDraft(family.id, { type: 'guest-field-changed', guestId: guest.id, field: 'name', value: event.currentTarget.value })} /><fieldset disabled={busy}><legend className="mb-2 text-sm font-bold">Presença</legend><div className="grid grid-cols-3 gap-2">{(['pending', 'yes', 'no'] as const).map((attendance) => <label key={attendance} className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg border px-2 text-center text-sm font-bold ${values.attendance === attendance ? 'border-plum bg-plum text-cream' : 'border-line bg-card'}`}><input className="sr-only" type="radio" name={`attendance-${guest.id}`} value={attendance} checked={values.attendance === attendance} onChange={() => updateDraft(family.id, { type: 'guest-field-changed', guestId: guest.id, field: 'attendance', value: attendance })} />{attendanceLabel(attendance)}</label>)}</div></fieldset><div className="mt-4 flex flex-wrap gap-3">{personDirty ? <Button variant="adminPrimary" disabled={busy || draft.conflict} onClick={() => void savePerson(family, guest.id)}>Salvar pessoa</Button> : null}<Button variant="adminDestructive" disabled={busy} onClick={() => setRemoval({ kind: 'guest', family, guestId: guest.id, name: guest.name })}>Remover pessoa</Button></div></li>
                          })}
                        </ul>
                      )}
                      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"><div className="flex-1"><Field id={`add-guest-${family.id}`} appearance="outline" label="Nova pessoa" value={addNames[family.id] ?? ''} disabled={busy} onChange={(event) => setAddNames((current) => ({ ...current, [family.id]: event.currentTarget.value }))} /></div><Button variant="adminSecondary" disabled={busy || !(addNames[family.id] ?? '').trim()} onClick={() => void addPerson(family)}>Adicionar pessoa</Button></div>
                    </div>
                    <div className="mt-8 border-t border-wine/30 pt-6"><h2 className="text-lg font-bold text-wine">Zona de cuidado</h2><p className="mt-2 text-sm">A remoção da família apaga o convite, todas as pessoas e os acessos públicos.</p><Button variant="adminDestructive" className="mt-4" disabled={busy} onClick={() => setRemoval({ kind: 'family', family })}>Remover família</Button></div>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
      <CreateFamilyDialog open={createOpen} busy={pendingFamilies.has('create')} error={createError} onCancel={() => setCreateOpen(false)} onCreate={async (values) => { await pendingFamilies.run('create', async (command) => { setCreateError(null); try { const result = await createFamily({ token, ...values }); if (!command.isCurrent()) return; if (result.kind === 'unauthorized') return onUnauthorized(); if (result.kind === 'saved') { setCreateOpen(false); setExpanded((current) => new Set(current).add(result.family.id)); if (command.isLatest()) setFeedback('Família criada.') } else setCreateError(result.message) } catch { if (command.isCurrent()) setCreateError('Não foi possível criar a família. Tente novamente.') } }) }} />
      <AdminConfirmDialog open={removal !== null} title={removal?.kind === 'guest' ? `Remover ${removal.name}?` : `Remover a família ${removal?.family.displayName ?? ''}?`} body={removal?.kind === 'guest' ? 'A pessoa será removida desta família. As outras pessoas e o convite continuam.' : 'Esta ação remove o convite e todas as pessoas e encerra os acessos públicos vinculados. Não é possível desfazer.'} confirmLabel={removal?.kind === 'guest' ? 'Remover pessoa' : 'Remover família'} acknowledgement={removal?.kind === 'family' ? 'Entendo que toda a família será removida' : undefined} busy={removal ? pendingFamilies.has(removal.family.id) : false} onCancel={() => setRemoval(null)} onConfirm={() => void confirmRemoval()} />
      {feedback ? <Toast onDismiss={() => setFeedback(null)}>{feedback}</Toast> : null}
    </section>
  )
}

export default AdminGuests
