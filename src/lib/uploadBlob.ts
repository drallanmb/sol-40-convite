export type UploadBlobResult =
  | { kind: 'uploaded'; storageId: string }
  | {
      kind: 'error'
      code:
        | 'network_error'
        | 'aborted'
        | 'http_error'
        | 'invalid_response'
    }

export type UploadXhr = {
  status: number
  responseText: string
  upload: {
    addEventListener: (
      type: 'progress',
      listener: (event: {
        lengthComputable: boolean
        loaded: number
        total: number
      }) => void,
    ) => void
  }
  open: (method: string, url: string, async: boolean) => void
  setRequestHeader: (name: string, value: string) => void
  addEventListener: (type: string, listener: () => void) => void
  send: (body: Blob) => void
  abort: () => void
}

export type UploadBlobOptions = {
  uploadUrl: string
  blob: Blob
  onProgress: (percent: number) => void
  signal?: AbortSignal
  createXhr?: () => UploadXhr
}

export function uploadBlobWithProgress({
  uploadUrl,
  blob,
  onProgress,
  signal,
  createXhr = () => new XMLHttpRequest(),
}: UploadBlobOptions): Promise<UploadBlobResult> {
  return new Promise((resolve) => {
    const xhr = createXhr()
    let settled = false

    const finish = (result: UploadBlobResult) => {
      if (settled) return
      settled = true
      signal?.removeEventListener('abort', abortFromSignal)
      resolve(result)
    }
    const abortFromSignal = () => xhr.abort()

    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable || event.total <= 0) return
      const percent = Math.max(
        0,
        Math.min(100, Math.round((event.loaded / event.total) * 100)),
      )
      onProgress(percent)
    })
    xhr.addEventListener('load', () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        finish({ kind: 'error', code: 'http_error' })
        return
      }
      try {
        const payload = JSON.parse(xhr.responseText) as {
          storageId?: unknown
        }
        if (
          typeof payload.storageId !== 'string' ||
          payload.storageId.length === 0
        ) {
          finish({ kind: 'error', code: 'invalid_response' })
          return
        }
        finish({ kind: 'uploaded', storageId: payload.storageId })
      } catch {
        finish({ kind: 'error', code: 'invalid_response' })
      }
    })
    xhr.addEventListener('error', () => {
      finish({ kind: 'error', code: 'network_error' })
    })
    xhr.addEventListener('abort', () => {
      finish({ kind: 'error', code: 'aborted' })
    })

    if (signal?.aborted) {
      finish({ kind: 'error', code: 'aborted' })
      return
    }
    signal?.addEventListener('abort', abortFromSignal, { once: true })
    xhr.open('POST', uploadUrl, true)
    xhr.setRequestHeader('Content-Type', blob.type || 'image/jpeg')
    xhr.send(blob)
  })
}
