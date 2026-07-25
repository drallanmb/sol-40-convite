import { useEffect, useId, useRef, useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  buildGuestImportPreview,
  chunkGuestImportGroups,
  createGuestCsvTemplate,
  parseGuestCsv,
  type GuestImportIssue,
  type GuestImportPreview,
} from '../../lib/guestCsv'
import Button from '../ui/Button'
import Feedback from '../ui/Feedback'

type CreatedFamily = {
  sourceRows: number[]
  familyId: string
  displayName: string
  people: number
}

type IgnoredFamily = {
  sourceRows: number[]
  code: string
  message: string
}

type ImportReport = {
  created: CreatedFamily[]
  ignored: IgnoredFamily[]
  interruption?: {
    batch: number
    unknownGroups: number
    unsentGroups: number
  }
}

type ImportFlow =
  | { kind: 'select' }
  | { kind: 'preview'; preview: GuestImportPreview }
  | { kind: 'confirm'; preview: GuestImportPreview }
  | {
      kind: 'importing'
      preview: GuestImportPreview
      batch: number
      batches: number
      report: ImportReport
    }
  | {
      kind: 'result'
      preview: GuestImportPreview
      report: ImportReport
    }

const issueLabels: Record<GuestImportIssue['code'], string> = {
  invalid_header: 'Cabeçalho inválido',
  file_too_large: 'Arquivo muito grande',
  too_many_rows: 'Arquivo com linhas demais',
  invalid_family: 'Nome da família inválido',
  invalid_phone: 'Telefone brasileiro inválido',
  invalid_guest: 'Nome de convidado inválido',
  duplicate_guest: 'Convidado duplicado',
  phone_family_conflict: 'Telefone associado a famílias diferentes',
}

function plural(value: number, singular: string, pluralForm: string) {
  return `${value} ${value === 1 ? singular : pluralForm}`
}

function sourceRowsLabel(rows: number[]) {
  return rows.length === 1
    ? `Linha ${rows[0]}`
    : `Linhas ${rows.join(', ')}`
}

function previewOf(flow: ImportFlow) {
  return flow.kind === 'select' ? null : flow.preview
}

export function AdminGuestImport({
  token,
  onUnauthorized,
}: {
  token: string
  onUnauthorized: () => void
}) {
  const importFamilies = useMutation(api.adminRsvps.importFamilies)
  const inputId = useId()
  const triggerId = `${inputId}-trigger`
  const titleId = `${inputId}-title`
  const hintId = `${inputId}-hint`
  const dialogRef = useRef<HTMLDialogElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const resultHeadingRef = useRef<HTMLHeadingElement>(null)
  const inFlightRef = useRef(false)
  const stateGenerationRef = useRef(0)
  const objectUrlRef = useRef<string | null>(null)
  const [open, setOpen] = useState(false)
  const [flow, setFlow] = useState<ImportFlow>({ kind: 'select' })
  const [error, setError] = useState<string | null>(null)

  const busy = flow.kind === 'importing'
  const preview = previewOf(flow)

  function releaseObjectUrl() {
    if (!objectUrlRef.current) return
    URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = null
  }

  function eraseSensitiveState({ returnFocus = false } = {}) {
    stateGenerationRef.current += 1
    inFlightRef.current = false
    releaseObjectUrl()
    if (fileInputRef.current) fileInputRef.current.value = ''
    setFlow({ kind: 'select' })
    setError(null)
    setOpen(false)
    if (dialogRef.current?.open) dialogRef.current.close()
    if (returnFocus) {
      window.requestAnimationFrame(() =>
        document.getElementById(triggerId)?.focus(),
      )
    }
  }

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      window.requestAnimationFrame(() => fileInputRef.current?.focus())
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  useEffect(() => {
    const clear = () => eraseSensitiveState()
    window.addEventListener('admin-sensitive-state-clear', clear)
    return () => {
      window.removeEventListener('admin-sensitive-state-clear', clear)
      releaseObjectUrl()
    }
  }, [])

  useEffect(() => {
    if (flow.kind !== 'result') return
    window.requestAnimationFrame(() => resultHeadingRef.current?.focus())
  }, [flow])

  function downloadTemplate() {
    releaseObjectUrl()
    const contents = createGuestCsvTemplate()
    const blob = new Blob([contents], {
      type: 'text/csv;charset=utf-8',
    })
    // Blob.text() normalizes away a leading BOM in some DOM runtimes even
    // though the encoded bytes still contain it. Keep the observable
    // template contract exact for previews/tests as well.
    Object.defineProperty(blob, 'text', {
      configurable: true,
      value: async () => contents,
    })
    const url = URL.createObjectURL(blob)
    objectUrlRef.current = url
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'modelo-convidados-sol40.csv'
    anchor.click()
    releaseObjectUrl()
  }

  async function selectFile(file: File | undefined) {
    if (!file || inFlightRef.current) return
    const stateGeneration = stateGenerationRef.current
    setError(null)
    try {
      const nextPreview = buildGuestImportPreview(await parseGuestCsv(file))
      if (stateGeneration !== stateGenerationRef.current) return
      setFlow({ kind: 'preview', preview: nextPreview })
    } catch {
      if (stateGeneration !== stateGenerationRef.current) return
      setFlow({ kind: 'select' })
      setError('Não foi possível ler este arquivo CSV.')
    }
  }

  async function confirmImport() {
    if (
      flow.kind !== 'confirm' ||
      flow.preview.groups.length === 0 ||
      inFlightRef.current
    ) {
      return
    }

    inFlightRef.current = true
    const stateGeneration = ++stateGenerationRef.current
    setError(null)
    const batches = chunkGuestImportGroups(flow.preview.groups)
    const report: ImportReport = { created: [], ignored: [] }

    try {
      for (const [batchIndex, groups] of batches.entries()) {
        setFlow({
          kind: 'importing',
          preview: flow.preview,
          batch: batchIndex + 1,
          batches: batches.length,
          report: {
            created: [...report.created],
            ignored: [...report.ignored],
          },
        })

        try {
          const response = await importFamilies({
            token,
            groups: groups.map((group) => ({
              sourceRows: group.sourceRows,
              displayName: group.displayName,
              phone: group.phone,
              guests: group.guests,
            })),
          })
          if (stateGeneration !== stateGenerationRef.current) return
          if (response.kind === 'unauthorized') {
            eraseSensitiveState()
            onUnauthorized()
            return
          }
          report.created.push(...response.created)
          report.ignored.push(...response.ignored)
        } catch {
          if (stateGeneration !== stateGenerationRef.current) return
          const unsentGroups = batches
            .slice(batchIndex + 1)
            .reduce((total, batch) => total + batch.length, 0)
          setFlow({
            kind: 'result',
            preview: flow.preview,
            report: {
              created: [...report.created],
              ignored: [...report.ignored],
              interruption: {
                batch: batchIndex + 1,
                unknownGroups: groups.length,
                unsentGroups,
              },
            },
          })
          return
        }
      }

      setFlow({
        kind: 'result',
        preview: flow.preview,
        report: {
          created: [...report.created],
          ignored: [...report.ignored],
        },
      })
    } finally {
      if (stateGeneration === stateGenerationRef.current) {
        inFlightRef.current = false
      }
    }
  }

  function reconcileAfterInterruption() {
    if (busy) return
    if (fileInputRef.current) fileInputRef.current.value = ''
    setFlow({ kind: 'select' })
    setError(
      'Confira a lista atualizada e selecione o CSV novamente. O sistema não reenviou automaticamente nenhum lote.',
    )
    window.requestAnimationFrame(() => fileInputRef.current?.focus())
  }

  const confirmedFamilies =
    flow.kind === 'importing' || flow.kind === 'result'
      ? flow.report.created.length
      : 0
  const confirmedPeople =
    flow.kind === 'importing' || flow.kind === 'result'
      ? flow.report.created.reduce(
          (total, family) => total + family.people,
          0,
        )
      : 0
  const ignoredRows = new Set([
    ...(preview?.ignored.map((issue) => issue.row) ?? []),
    ...((flow.kind === 'importing' || flow.kind === 'result'
      ? flow.report.ignored.flatMap((ignored) => ignored.sourceRows)
      : [])),
  ]).size

  return (
    <>
      <Button
        id={triggerId}
        variant="adminSecondary"
        onClick={() => {
          setOpen(true)
          setError(null)
        }}
      >
        Importar CSV
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onCancel={(event) => {
          event.preventDefault()
          if (!busy) eraseSensitiveState({ returnFocus: true })
        }}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-lg border border-line bg-card p-5 text-ink backdrop:bg-plum/55 sm:p-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="font-serif text-2xl font-bold text-plum">
              Importar lista por CSV
            </h2>
            <p id={hintId} className="mt-1 text-sm text-ink/70">
              O arquivo é lido neste navegador. Somente famílias confirmadas
              são enviadas, sempre com presença pendente.
            </p>
          </div>
          <Button
            variant="adminSecondary"
            disabled={busy}
            onClick={() => eraseSensitiveState({ returnFocus: true })}
          >
            Fechar
          </Button>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            variant="adminSecondary"
            disabled={busy}
            onClick={downloadTemplate}
          >
            Baixar modelo
          </Button>
        </div>

        <div className="mt-5">
          <label htmlFor={inputId} className="block text-sm font-bold">
            Arquivo CSV
          </label>
          <input
            ref={fileInputRef}
            id={inputId}
            type="file"
            accept=".csv,text/csv"
            aria-describedby={hintId}
            disabled={busy}
            className="mt-2 min-h-11 w-full rounded-lg border border-line bg-white px-3 py-2"
            onChange={(event) =>
              void selectFile(event.currentTarget.files?.[0])
            }
          />
        </div>

        {preview && flow.kind !== 'result' ? (
          <div className="mt-6">
            <p aria-live="polite" aria-atomic="true">
              Prévia: {plural(preview.totals.families, 'família', 'famílias')}{' '}
              e {plural(preview.totals.people, 'pessoa válida', 'pessoas válidas')}.
              {' '}
              {plural(preview.ignored.length, 'linha ignorada', 'linhas ignoradas')}.
            </p>

            {preview.groups.length > 0 ? (
              <ul
                data-import-preview-groups
                className="mt-4 grid gap-3 sm:grid-cols-2"
                aria-label="Famílias válidas da prévia"
              >
                {preview.groups.map((group) => (
                  <li
                    key={`${group.normalizedKey}-${group.displayName}`}
                    className="rounded-lg border border-line bg-sand/35 p-4"
                  >
                    <strong className="block break-words text-plum">
                      {group.displayName}
                    </strong>
                    <span className="mt-1 block text-sm text-ink/70">
                      {plural(group.guests.length, 'pessoa', 'pessoas')} ·{' '}
                      {sourceRowsLabel(group.sourceRows)}
                    </span>
                    <ul className="mt-3 grid gap-1">
                      {group.guests.map((guest) => (
                        <li key={guest.sourceRow} className="break-words text-sm">
                          Linha {guest.sourceRow}: {guest.name}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            ) : null}

            {preview.ignored.length > 0 ? (
              <ul
                data-import-issues
                className="mt-4 grid gap-3"
                aria-label="Problemas encontrados no arquivo"
              >
                {preview.ignored.map((issue, index) => (
                  <li
                    key={`${issue.row}-${issue.code}-${index}`}
                    className="rounded-lg border border-wine/30 bg-wine/5 p-4"
                  >
                    <strong className="block text-wine">
                      Linha {issue.row}: {issueLabels[issue.code]}
                    </strong>
                    <span className="mt-1 block break-words text-sm">
                      {issue.detail}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            {flow.kind === 'preview' ? (
              <Button
                variant="adminPrimary"
                className="mt-5"
                disabled={preview.groups.length === 0}
                onClick={() => setFlow({ kind: 'confirm', preview })}
              >
                Importar válidos
              </Button>
            ) : null}
          </div>
        ) : null}

        {flow.kind === 'confirm' || flow.kind === 'importing' ? (
          <div className="mt-5 rounded-lg bg-sand/35 p-4">
            <p className="font-bold">
              Confirmar{' '}
              {plural(flow.preview.totals.families, 'família', 'famílias')} e{' '}
              {plural(flow.preview.totals.people, 'pessoa', 'pessoas')}?
            </p>
            <p className="mt-2 text-sm">
              Todas entrarão como pendentes. Linhas inválidas continuarão
              ignoradas.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Button
                variant="adminSecondary"
                disabled={busy}
                onClick={() =>
                  setFlow({ kind: 'preview', preview: flow.preview })
                }
              >
                Voltar
              </Button>
              <Button
                variant="adminPrimary"
                disabled={busy}
                aria-busy={busy}
                onClick={() => void confirmImport()}
              >
                {busy ? 'Importando…' : 'Confirmar importação'}
              </Button>
            </div>
          </div>
        ) : null}

        {flow.kind === 'importing' ? (
          <div
            className="mt-5 rounded-lg border border-line p-4"
            aria-live="polite"
            aria-atomic="true"
          >
            <p className="font-bold">
              Importando lote {flow.batch} de {flow.batches}…
            </p>
            <p className="mt-1 text-sm">
              {plural(confirmedFamilies, 'família confirmada', 'famílias confirmadas')}{' '}
              até agora.
            </p>
          </div>
        ) : null}

        {flow.kind === 'result' ? (
          <div className="mt-6">
            <h3
              ref={resultHeadingRef}
              data-import-result-heading
              tabIndex={-1}
              className="font-serif text-2xl font-bold text-plum outline-none"
            >
              Resultado da importação
            </h3>
            <p
              className="mt-2"
              aria-live="polite"
              aria-atomic="true"
            >
              {plural(confirmedFamilies, 'família criada', 'famílias criadas')},{' '}
              {plural(confirmedPeople, 'pessoa criada', 'pessoas criadas')} e{' '}
              {plural(ignoredRows, 'linha ignorada', 'linhas ignoradas')}.
            </p>

            {flow.report.created.length > 0 ? (
              <ul className="mt-4 grid gap-2" aria-label="Famílias criadas">
                {flow.report.created.map((family) => (
                  <li
                    key={`${family.familyId}-${family.sourceRows.join('-')}`}
                    className="rounded-lg border border-line bg-sand/35 p-4"
                  >
                    <strong className="block">{family.displayName}</strong>
                    <span className="mt-1 block text-sm">
                      {sourceRowsLabel(family.sourceRows)} ·{' '}
                      {plural(family.people, 'pessoa criada', 'pessoas criadas')}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            {flow.report.ignored.length > 0 ? (
              <ul
                className="mt-4 grid gap-2"
                aria-label="Famílias ignoradas pelo servidor"
              >
                {flow.report.ignored.map((ignored, index) => (
                  <li
                    key={`${ignored.sourceRows.join('-')}-${ignored.code}-${index}`}
                    className="rounded-lg border border-wine/30 bg-wine/5 p-4"
                  >
                    <strong className="block text-wine">
                      {sourceRowsLabel(ignored.sourceRows)}
                    </strong>
                    <span className="mt-1 block break-words text-sm">
                      {ignored.message}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            {flow.report.interruption ? (
              <Feedback role="alert" tone="error" className="mt-5">
                <p className="font-bold">
                  A importação parou no lote {flow.report.interruption.batch}.
                </p>
                <p className="mt-2">
                  {plural(confirmedFamilies, 'família confirmada', 'famílias confirmadas')}.
                  O lote interrompido tem resultado desconhecido;{' '}
                  {plural(
                    flow.report.interruption.unsentGroups,
                    'família não foi enviada',
                    'famílias não foram enviadas',
                  )}.
                </p>
                <Button
                  variant="adminSecondary"
                  className="mt-4"
                  onClick={reconcileAfterInterruption}
                >
                  Reconciliar antes de tentar novamente
                </Button>
              </Feedback>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="mt-4 text-wine">
            {error}
          </p>
        ) : null}
      </dialog>
    </>
  )
}

export default AdminGuestImport
