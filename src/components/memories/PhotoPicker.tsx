import { useId, useRef, type ChangeEvent } from 'react'
import type { MemoryPhoto } from '../../lib/memoryDraft'
import Button from '../ui/Button'

const ACCEPTED_MEMORY_IMAGES =
  'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif'

export type PhotoPickerProps = {
  photo: MemoryPhoto | null
  disabled?: boolean
  describedBy?: string
  onSelect: (photo: MemoryPhoto) => void
  onRemove: () => void
}

export function PhotoPicker({
  photo,
  disabled = false,
  describedBy,
  onSelect,
  onRemove,
}: PhotoPickerProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    onSelect({
      file,
      previewUrl: URL.createObjectURL(file),
    })
  }

  return (
    <fieldset className="grid gap-4" disabled={disabled}>
      <legend className="mb-2 text-small font-bold uppercase tracking-label">
        Foto (opcional)
      </legend>
      <input
        ref={inputRef}
        id={inputId}
        className="sr-only"
        type="file"
        accept={ACCEPTED_MEMORY_IMAGES}
        aria-describedby={describedBy}
        onChange={handleSelection}
      />

      {photo ? (
        <div className="grid gap-4">
          <div className="flex min-h-[240px] items-center justify-center overflow-hidden border border-line bg-sand/35 p-2 sm:min-h-[320px]">
            <img
              src={photo.previewUrl}
              alt="Prévia completa da foto selecionada"
              className="max-h-[420px] w-full object-contain"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="quiet"
              className="min-h-11 flex-1 px-4 py-2"
              onClick={() => inputRef.current?.click()}
            >
              Trocar foto
            </Button>
            <Button
              variant="quiet"
              className="min-h-11 flex-1 px-4 py-2"
              onClick={onRemove}
            >
              Remover foto
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="quiet"
          className="w-full"
          onClick={() => inputRef.current?.click()}
        >
          Escolher uma foto
        </Button>
      )}

      <p id={describedBy} className="text-small text-plum/75">
        JPEG, PNG, WebP ou uma foto HEIC/HEIF compatível com seu navegador.
        A imagem será reduzida antes do envio.
      </p>
    </fieldset>
  )
}

export default PhotoPicker
