import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { processMemoryImage } from '../../lib/imageProcessing'
import {
  AUTHOR_MAX_LENGTH,
  MESSAGE_MAX_LENGTH,
  canBeginMemorySubmission,
  countMemoryCodePoints,
  createMemoryState,
  memoryReducer,
  remainingMessageCharacters,
  tickMemoryRetrySeconds,
  validateMemoryDraft,
  type MemoryAction,
  type MemoryErrorCode,
  type MemoryState,
} from '../../lib/memoryDraft'
import {
  createReservationCapability,
  loadOrCreateMemoryDeviceKey,
} from '../../lib/memorySession'
import { uploadBlobWithProgress } from '../../lib/uploadBlob'
import Button from '../ui/Button'
import Card from '../ui/Card'
import Field from '../ui/Field'
import PhotoPicker from './PhotoPicker'
import SubmissionSuccess from './SubmissionSuccess'

const ERROR_COPY: Record<MemoryErrorCode, string> = {
  empty_content: 'Escolha uma foto, escreva um recado ou envie os dois.',
  invalid_author: 'O nome pode ter no máximo 60 caracteres.',
  invalid_message: 'O recado pode ter no máximo 280 caracteres.',
  invalid_control: 'Retire caracteres não permitidos do texto.',
  unsupported_format: 'Escolha uma imagem JPEG, PNG, WebP, HEIC ou HEIF.',
  heic_unsupported:
    'Este navegador não conseguiu abrir a foto do iPhone. Compartilhe ou exporte a imagem como JPEG e tente novamente — seu nome e recado continuam aqui.',
  original_too_large: 'A foto original deve ter no máximo 30 MB.',
  processed_too_large:
    'Não foi possível reduzir esta foto para o tamanho de envio. Escolha outra imagem.',
  processing_failed:
    'Não foi possível preparar esta foto. Escolha outra imagem ou tente novamente.',
  network_error:
    'A conexão falhou, mas sua memória continua aqui. Tente novamente.',
  upload_error:
    'O envio da foto não terminou, mas sua memória continua aqui. Tente novamente.',
  validation_rejected:
    'A foto não passou pela verificação. Exporte-a como JPEG e tente novamente.',
  validation_delayed:
    'A verificação está demorando mais que o esperado. Tente novamente — o mesmo envio será retomado.',
  rate_limited: 'Muitos envios em sequência. Aguarde um pouco e tente novamente.',
  expired_reservation:
    'O envio expirou. Tente novamente para criar uma nova reserva.',
  storage_conflict:
    'Não foi possível confirmar esta foto. Tente novamente com o rascunho preservado.',
  token_conflict:
    'Não foi possível iniciar o envio com segurança. Tente novamente.',
  invalid_capability:
    'O envio perdeu a validade. Tente novamente para continuar.',
}

function normalizedOptional(value: string) {
  const normalized = value.replace(/\r\n?/gu, '\n').trim()
  return normalized.length === 0 ? undefined : normalized
}

function progressCopy(state: MemoryState) {
  switch (state.submission.kind) {
    case 'processing':
      return 'Preparando sua memória…'
    case 'uploading':
      return `Enviando foto… ${state.submission.percent}%`
    case 'claiming':
      return 'Confirmando o envio…'
    case 'validating':
      return 'Verificando a foto com cuidado…'
    case 'idle':
      return 'Sua memória será enviada para aprovação.'
    case 'failed':
      return ERROR_COPY[state.submission.code]
    case 'success':
      return ''
  }
}

export function MemoryForm() {
  const requestUpload = useMutation(api.posts.requestUpload)
  const submitPhotoMemory = useMutation(api.posts.submitPhotoMemory)
  const submitTextMemory = useMutation(api.posts.submitTextMemory)
  const [state, setState] = useState(createMemoryState)
  const stateRef = useRef(state)
  const busyRef = useRef(false)
  const [retryRemaining, setRetryRemaining] = useState(0)
  const authorId = useId()
  const messageId = useId()
  const counterId = `${messageId}-counter`
  const statusId = useId()
  const photoHintId = useId()

  const statusArgs =
    state.transport.kind === 'uploaded' &&
    state.submission.kind === 'validating'
      ? {
          reservationId: state.transport
            .reservationId as Id<'postUploadReservations'>,
          token: state.transport.capability,
        }
      : 'skip'
  const backendStatus = useQuery(api.posts.getSubmissionStatus, statusArgs)

  function transition(action: MemoryAction) {
    const reduction = memoryReducer(stateRef.current, action)
    stateRef.current = reduction.state
    setState(reduction.state)
    if (reduction.effects.previewUrlToRevoke) {
      URL.revokeObjectURL(reduction.effects.previewUrlToRevoke)
    }
  }

  useEffect(
    () => () => {
      const previewUrl = stateRef.current.draft.photo?.previewUrl
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    },
    [],
  )

  useEffect(() => {
    if (retryRemaining <= 0) return
    const timer = window.setTimeout(() => {
      setRetryRemaining((seconds) => tickMemoryRetrySeconds(seconds))
    }, 1_000)
    return () => window.clearTimeout(timer)
  }, [retryRemaining])

  useEffect(() => {
    if (state.submission.kind !== 'validating') return
    const timer = window.setTimeout(() => {
      if (stateRef.current.submission.kind === 'validating') {
        fail('validation_delayed')
      }
    }, 16_000)
    return () => window.clearTimeout(timer)
  }, [state.submission.kind])

  useEffect(() => {
    if (!backendStatus || stateRef.current.submission.kind !== 'validating') {
      return
    }
    switch (backendStatus.kind) {
      case 'accepted':
        transition({ type: 'accepted' })
        return
      case 'rejected':
        transition({
          type: 'transport_invalidated',
          code:
            backendStatus.code === 'heic_requires_conversion'
              ? 'heic_unsupported'
              : 'validation_rejected',
        })
        return
      case 'expired':
        transition({
          type: 'transport_invalidated',
          code: 'expired_reservation',
        })
        return
      case 'invalid_capability':
        transition({
          type: 'transport_invalidated',
          code: 'invalid_capability',
        })
        return
      case 'awaiting_upload':
      case 'processing':
        return
    }
  }, [backendStatus])

  function fail(code: MemoryErrorCode, retryAfterSeconds?: number) {
    transition({ type: 'submission_failed', code, retryAfterSeconds })
    if (retryAfterSeconds !== undefined) {
      setRetryRemaining(Math.max(1, retryAfterSeconds))
    }
  }

  async function submitText() {
    const draft = stateRef.current.draft
    const result = await submitTextMemory({
      deviceKey: loadOrCreateMemoryDeviceKey(),
      ...(normalizedOptional(draft.author) === undefined
        ? {}
        : { author: normalizedOptional(draft.author) }),
      message: draft.message,
    })
    switch (result.kind) {
      case 'submitted':
        transition({ type: 'accepted' })
        return
      case 'rate_limited':
        fail('rate_limited', result.retryAfterSeconds)
        return
      case 'invalid_author':
        fail('invalid_author')
        return
      case 'invalid_message':
        fail('invalid_message')
        return
      case 'invalid_control':
        fail('invalid_control')
        return
      case 'invalid_content':
        fail('empty_content')
        return
      case 'invalid_device_key':
        fail('network_error')
    }
  }

  async function ensureReservation() {
    if (stateRef.current.transport.kind !== 'none') {
      return true
    }

    const attempts =
      stateRef.current.reservationConflictRetries === 0 ? 2 : 1
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const capability = createReservationCapability()
      const result = await requestUpload({
        deviceKey: loadOrCreateMemoryDeviceKey(),
        token: capability,
      })
      switch (result.kind) {
        case 'reserved':
          transition({
            type: 'reservation_created',
            reservationId: result.reservationId,
            capability,
            uploadUrl: result.uploadUrl,
          })
          return true
        case 'token_conflict':
          transition({ type: 'token_conflict' })
          if (attempt + 1 < attempts) continue
          return false
        case 'rate_limited':
          fail('rate_limited', result.retryAfterSeconds)
          return false
        case 'invalid_request':
          fail('network_error')
          return false
      }
    }
    return false
  }

  async function submitPhoto() {
    const selected = stateRef.current.draft.photo
    if (!selected) return

    let processed = selected.processed
    if (!processed) {
      transition({ type: 'submission_stage', stage: 'processing' })
      const result = await processMemoryImage(selected.file)
      if (result.kind === 'error') {
        fail(result.code)
        return
      }
      processed = result.blob
      transition({ type: 'photo_processed', blob: processed })
    }

    if (!(await ensureReservation())) return

    if (stateRef.current.transport.kind === 'reserved') {
      transition({ type: 'upload_progress', percent: 0 })
      const uploaded = await uploadBlobWithProgress({
        uploadUrl: stateRef.current.transport.uploadUrl,
        blob: processed,
        onProgress: (percent) =>
          transition({ type: 'upload_progress', percent }),
      })
      if (uploaded.kind === 'error') {
        fail(
          uploaded.code === 'network_error' ? 'network_error' : 'upload_error',
        )
        return
      }
      transition({ type: 'upload_completed', storageId: uploaded.storageId })
    }

    const transport = stateRef.current.transport
    if (transport.kind !== 'uploaded') {
      fail('upload_error')
      return
    }

    transition({ type: 'submission_stage', stage: 'claiming' })
    const draft = stateRef.current.draft
    const result = await submitPhotoMemory({
      reservationId:
        transport.reservationId as Id<'postUploadReservations'>,
      token: transport.capability,
      storageId: transport.storageId as Id<'_storage'>,
      ...(normalizedOptional(draft.author) === undefined
        ? {}
        : { author: normalizedOptional(draft.author) }),
      ...(normalizedOptional(draft.message) === undefined
        ? {}
        : { message: normalizedOptional(draft.message) }),
    })

    switch (result.kind) {
      case 'accepted':
        transition({ type: 'accepted' })
        return
      case 'processing':
        transition({ type: 'submission_stage', stage: 'validating' })
        return
      case 'rejected':
        transition({
          type: 'transport_invalidated',
          code:
            result.code === 'heic_requires_conversion'
              ? 'heic_unsupported'
              : 'validation_rejected',
        })
        return
      case 'expired':
        transition({
          type: 'transport_invalidated',
          code: 'expired_reservation',
        })
        return
      case 'storage_conflict':
        transition({
          type: 'transport_invalidated',
          code: 'storage_conflict',
        })
        return
      case 'invalid_capability':
        transition({
          type: 'transport_invalidated',
          code: 'invalid_capability',
        })
        return
      case 'invalid_author':
        fail('invalid_author')
        return
      case 'invalid_message':
        fail('invalid_message')
        return
      case 'invalid_control':
        fail('invalid_control')
        return
      case 'invalid_content':
        fail('empty_content')
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (
      retryRemaining > 0 ||
      !canBeginMemorySubmission(stateRef.current, busyRef.current)
    ) {
      const validation = validateMemoryDraft(stateRef.current.draft)
      if (!validation.valid && validation.error) {
        fail(validation.error)
      }
      return
    }

    busyRef.current = true
    transition({ type: 'submission_stage', stage: 'processing' })
    try {
      if (stateRef.current.draft.photo) await submitPhoto()
      else await submitText()
    } catch {
      fail('network_error')
    } finally {
      busyRef.current = false
    }
  }

  if (state.submission.kind === 'success') {
    return (
      <SubmissionSuccess
        onSendAnother={() => transition({ type: 'send_another' })}
      />
    )
  }

  const busy =
    state.submission.kind === 'processing' ||
    state.submission.kind === 'uploading' ||
    state.submission.kind === 'claiming' ||
    state.submission.kind === 'validating'
  const validation = validateMemoryDraft(state.draft)
  const remaining = remainingMessageCharacters(state.draft.message)
  const failed = state.submission.kind === 'failed'
  const retryBlocked = retryRemaining > 0

  return (
    <Card>
      <form
        noValidate
        aria-busy={busy}
        onSubmit={handleSubmit}
        className="grid gap-7"
      >
        <div className="grid gap-3">
          <p className="text-small font-bold uppercase tracking-label text-plum/75">
            Deixe seu carinho
          </p>
          <h3 className="font-serif text-subheading leading-tight text-plum">
            Envie uma memória para a Sol
          </h3>
          <p className="text-body">
            Vale uma foto, um recado ou os dois. Cada envio vira uma memória
            para aprovação.
          </p>
        </div>

        <Field
          id={authorId}
          label="Seu nome (opcional)"
          hint={`Até ${AUTHOR_MAX_LENGTH} caracteres. Se preferir, deixe em branco.`}
          value={state.draft.author}
          maxLength={AUTHOR_MAX_LENGTH * 2}
          disabled={busy}
          onChange={(event) => {
            const value = event.currentTarget.value
            if (countMemoryCodePoints(value) <= AUTHOR_MAX_LENGTH) {
              transition({ type: 'author_changed', value })
            }
          }}
        />

        <div>
          <Field
            id={messageId}
            label="Recado (opcional)"
            hint="Escreva como quem deixa um bilhete para guardar."
            multiline
            value={state.draft.message}
            maxLength={MESSAGE_MAX_LENGTH * 2}
            disabled={busy}
            aria-describedby={`${counterId} ${statusId}`}
            aria-invalid={
              validation.error === 'invalid_message' ||
              validation.error === 'invalid_control' ||
              undefined
            }
            onChange={(event) => {
              const value = event.currentTarget.value
              if (countMemoryCodePoints(value) <= MESSAGE_MAX_LENGTH) {
                transition({ type: 'message_changed', value })
              }
            }}
          />
          <p
            id={counterId}
            className="-mt-3 text-right text-small text-plum/80"
          >
            {remaining} caracteres restantes
          </p>
        </div>

        <PhotoPicker
          photo={state.draft.photo}
          disabled={busy}
          describedBy={photoHintId}
          onSelect={(photo) => transition({ type: 'photo_selected', photo })}
          onRemove={() => transition({ type: 'photo_removed' })}
        />

        <div className="grid gap-4">
          <div
            id={statusId}
            role={failed ? 'alert' : 'status'}
            aria-live="polite"
            className={`min-h-[3.25rem] border-l-4 pl-4 text-small ${
              failed
                ? 'border-wine text-wine'
                : 'border-line text-plum/80'
            }`}
          >
            <p>
              {failed && retryBlocked
                ? `${progressCopy(state)} Tente novamente em ${retryRemaining} segundo(s).`
                : progressCopy(state)}
            </p>
          </div>

          <Button
            type="submit"
            variant="rsvp"
            className="w-full"
            disabled={busy || retryBlocked}
            aria-busy={busy}
            aria-describedby={statusId}
          >
            {failed
              ? retryBlocked
                ? `Aguarde ${retryRemaining}s`
                : 'Tentar novamente'
              : busy
                ? 'Enviando memória…'
                : 'Enviar memória'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

export default MemoryForm
