import { useEffect, useId, useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  buildGuestImportPreview,
  parseGuestCsv,
  type GuestImportPreview,
} from '../../lib/guestCsv'
import Button from '../ui/Button'

type ImportResult = {
  createdFamilies: number
  createdPeople: number
  ignoredFamilies: number
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
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState<GuestImportPreview | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)

  function clear() {
    setOpen(false)
    setPreview(null)
    setConfirming(false)
    setBusy(false)
    setError(null)
    setResult(null)
  }

  useEffect(() => {
    window.addEventListener('admin-sensitive-state-clear', clear)
    return () => window.removeEventListener('admin-sensitive-state-clear', clear)
  }, [])

  async function selectFile(file: File | undefined) {
    if (!file || busy) return
    setError(null)
    setResult(null)
    setConfirming(false)
    setPreview(buildGuestImportPreview(await parseGuestCsv(file)))
  }

  async function confirmImport() {
    if (!preview || preview.groups.length === 0 || busy) return
    setBusy(true)
    setError(null)
    try {
      const response = await importFamilies({
        token,
        groups: preview.groups.map((group) => ({
          sourceRows: group.sourceRows,
          displayName: group.displayName,
          phone: group.phone,
          guests: group.guests,
        })),
      })
      if (response.kind === 'unauthorized') {
        clear()
        onUnauthorized()
        return
      }
      setResult({
        createdFamilies: response.created.length,
        createdPeople: response.created.reduce(
          (total, family) => total + family.people,
          0,
        ),
        ignoredFamilies: response.ignored.length,
      })
      setConfirming(false)
    } catch {
      setError('Não foi possível importar o arquivo. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button
        variant="adminSecondary"
        onClick={() => {
          setOpen(true)
          setError(null)
        }}
      >
        Importar CSV
      </Button>
      {open ? (
        <section
          aria-labelledby={`${inputId}-title`}
          className="mt-5 w-full rounded-lg border border-line bg-card p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id={`${inputId}-title`} className="text-xl font-bold text-plum">
                Importar lista por CSV
              </h2>
              <p className="mt-1 text-sm text-ink/70">
                O arquivo é lido neste navegador e somente os grupos confirmados
                são enviados.
              </p>
            </div>
            <Button variant="adminSecondary" disabled={busy} onClick={clear}>
              Fechar
            </Button>
          </div>

          <div className="mt-5">
            <label htmlFor={inputId} className="block text-sm font-bold">
              Arquivo CSV
            </label>
            <input
              id={inputId}
              type="file"
              accept=".csv,text/csv"
              disabled={busy}
              className="mt-2 min-h-11 w-full rounded-lg border border-line bg-white px-3 py-2"
              onChange={(event) => void selectFile(event.currentTarget.files?.[0])}
            />
          </div>

          {preview ? (
            <div className="mt-5" aria-live="polite" aria-atomic="true">
              <p>
                Prévia: {preview.totals.families}{' '}
                {preview.totals.families === 1 ? 'família' : 'famílias'} e{' '}
                {preview.totals.people}{' '}
                {preview.totals.people === 1 ? 'pessoa válida' : 'pessoas válidas'}.
              </p>
              {preview.ignored.length > 0 ? (
                <p className="mt-2 text-sm text-wine">
                  {preview.ignored.length}{' '}
                  {preview.ignored.length === 1 ? 'linha ignorada' : 'linhas ignoradas'}.
                </p>
              ) : null}
              {!confirming && !result ? (
                <Button
                  variant="adminPrimary"
                  className="mt-4"
                  disabled={preview.groups.length === 0}
                  onClick={() => setConfirming(true)}
                >
                  Importar válidos
                </Button>
              ) : null}
            </div>
          ) : null}

          {confirming && preview ? (
            <div className="mt-5 rounded-lg bg-sand/35 p-4">
              <p className="font-bold">
                Confirmar {preview.totals.families}{' '}
                {preview.totals.families === 1 ? 'família' : 'famílias'} e{' '}
                {preview.totals.people}{' '}
                {preview.totals.people === 1 ? 'pessoa' : 'pessoas'}?
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  variant="adminSecondary"
                  disabled={busy}
                  onClick={() => setConfirming(false)}
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

          {result ? (
            <div className="mt-5" role="status">
              <p className="font-bold">Importação concluída.</p>
              <p className="mt-1">
                {result.createdFamilies} famílias e {result.createdPeople} pessoas
                criadas; {result.ignoredFamilies} famílias ignoradas.
              </p>
            </div>
          ) : null}
          {error ? <p role="alert" className="mt-4 text-wine">{error}</p> : null}
        </section>
      ) : null}
    </>
  )
}

export default AdminGuestImport
