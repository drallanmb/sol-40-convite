import {
  uploadBlobWithProgress,
  type UploadBlobOptions,
  type UploadBlobResult,
} from './uploadBlob'

export type FreshMemoryReservation = {
  reservationId: string
  capability: string
  uploadUrl: string
}

export type FreshMemoryUploadResult =
  | { kind: 'reservation_failed' }
  | {
      kind: 'upload_failed'
      code: Extract<UploadBlobResult, { kind: 'error' }>['code']
    }
  | {
      kind: 'uploaded'
      reservation: FreshMemoryReservation
      storageId: string
    }

export type FreshMemoryUploadDependencies = {
  blob: Blob
  requestReservation: () => Promise<FreshMemoryReservation | null>
  upload?: (options: UploadBlobOptions) => Promise<UploadBlobResult>
  onReservation: (reservation: FreshMemoryReservation) => void
  onProgress: (percent: number) => void
}

/**
 * One invocation owns one short-lived upload URL. Any failure ends that
 * transport; a user retry invokes this function again and must reserve afresh.
 */
export async function runFreshMemoryUploadAttempt({
  blob,
  requestReservation,
  upload = uploadBlobWithProgress,
  onReservation,
  onProgress,
}: FreshMemoryUploadDependencies): Promise<FreshMemoryUploadResult> {
  let reservation: FreshMemoryReservation | null
  try {
    reservation = await requestReservation()
  } catch {
    return { kind: 'reservation_failed' }
  }
  if (reservation === null) {
    return { kind: 'reservation_failed' }
  }
  onReservation(reservation)

  let result: UploadBlobResult
  try {
    result = await upload({
      uploadUrl: reservation.uploadUrl,
      blob,
      onProgress,
    })
  } catch {
    return { kind: 'upload_failed', code: 'network_error' }
  }
  if (result.kind === 'error') {
    return { kind: 'upload_failed', code: result.code }
  }
  return {
    kind: 'uploaded',
    reservation,
    storageId: result.storageId,
  }
}
