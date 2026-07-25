import { describe, expect, it, vi } from 'vitest'
import {
  MEMORY_DEVICE_KEY_STORAGE_KEY,
  createMemoryDeviceKey,
  createReservationCapability,
  isCanonicalMemoryKey,
  loadOrCreateMemoryDeviceKey,
} from './memorySession'
import {
  uploadBlobWithProgress,
  type UploadXhr,
} from './uploadBlob'

class MemoryStorage implements Storage {
  values = new Map<string, string>()
  get length() {
    return this.values.size
  }
  clear() {
    this.values.clear()
  }
  getItem(key: string) {
    return this.values.get(key) ?? null
  }
  key(index: number) {
    return [...this.values.keys()][index] ?? null
  }
  removeItem(key: string) {
    this.values.delete(key)
  }
  setItem(key: string, value: string) {
    this.values.set(key, value)
  }
}

function decodeBase64Url(value: string) {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/')
  return Uint8Array.from(
    atob(`${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`),
    (character) => character.charCodeAt(0),
  )
}

describe('memory fairness and reservation keys', () => {
  it('encodes exactly 32 cryptographic bytes as canonical base64url', () => {
    const key = createMemoryDeviceKey((bytes) => {
      bytes.forEach((_, index) => {
        bytes[index] = index
      })
    })

    expect(key).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect([...decodeBase64Url(key)]).toEqual(
      Array.from({ length: 32 }, (_, index) => index),
    )
    expect(isCanonicalMemoryKey(key)).toBe(true)
  })

  it('creates a fresh reservation capability without touching storage', () => {
    const storage = new MemoryStorage()
    const capability = createReservationCapability((bytes) => bytes.fill(7))

    expect(isCanonicalMemoryKey(capability)).toBe(true)
    expect(storage.length).toBe(0)
  })

  it('restores a valid fairness key and does not rewrite it', () => {
    const storage = new MemoryStorage()
    const stored = createMemoryDeviceKey((bytes) => bytes.fill(4))
    storage.setItem(MEMORY_DEVICE_KEY_STORAGE_KEY, stored)

    expect(
      loadOrCreateMemoryDeviceKey(storage, () => {
        throw new Error('must not generate')
      }),
    ).toBe(stored)
  })

  it.each(['broken', `${'A'.repeat(42)}B`, `${'A'.repeat(42)}=`])(
    'replaces malformed persisted input: %s',
    (malformed) => {
      const storage = new MemoryStorage()
      const replacement = createMemoryDeviceKey((bytes) => bytes.fill(8))
      storage.setItem(MEMORY_DEVICE_KEY_STORAGE_KEY, malformed)

      expect(loadOrCreateMemoryDeviceKey(storage, () => replacement)).toBe(
        replacement,
      )
      expect(storage.getItem(MEMORY_DEVICE_KEY_STORAGE_KEY)).toBe(replacement)
    },
  )

  it('falls back to a stable in-memory key when localStorage is blocked', () => {
    const replacement = createMemoryDeviceKey((bytes) => bytes.fill(9))
    const blocked = {
      getItem() {
        throw new Error('blocked')
      },
      setItem() {
        throw new Error('blocked')
      },
      removeItem() {
        throw new Error('blocked')
      },
    } as unknown as Storage

    expect(loadOrCreateMemoryDeviceKey(blocked, () => replacement)).toBe(
      replacement,
    )
    expect(
      loadOrCreateMemoryDeviceKey(blocked, () => {
        throw new Error('must reuse fallback')
      }),
    ).toBe(replacement)
  })
})

class FakeXhr implements UploadXhr {
  status = 0
  responseText = ''
  upload = {
    addEventListener: vi.fn(
      (
        _type: 'progress',
        listener: (event: { lengthComputable: boolean; loaded: number; total: number }) => void,
      ) => {
        this.progressListener = listener
      },
    ),
  }
  listeners = new Map<string, () => void>()
  headers: Array<[string, string]> = []
  progressListener?: (event: {
    lengthComputable: boolean
    loaded: number
    total: number
  }) => void
  open = vi.fn()
  setRequestHeader = vi.fn((name: string, value: string) => {
    this.headers.push([name, value])
  })
  addEventListener = vi.fn((type: string, listener: () => void) => {
    this.listeners.set(type, listener)
  })
  send = vi.fn()
  abort = vi.fn(() => this.listeners.get('abort')?.())
  emit(type: string) {
    this.listeners.get(type)?.()
  }
}

describe('uploadBlobWithProgress', () => {
  it('reports clamped real progress and parses a storage ID only on 2xx', async () => {
    const xhr = new FakeXhr()
    const onProgress = vi.fn()
    const pending = uploadBlobWithProgress({
      uploadUrl: 'https://upload.example.test/path',
      blob: new Blob(['jpeg'], { type: 'image/jpeg' }),
      onProgress,
      createXhr: () => xhr,
    })

    xhr.progressListener?.({ lengthComputable: true, loaded: 150, total: 100 })
    xhr.status = 201
    xhr.responseText = JSON.stringify({ storageId: 'kg2abc' })
    xhr.emit('load')

    await expect(pending).resolves.toEqual({
      kind: 'uploaded',
      storageId: 'kg2abc',
    })
    expect(onProgress).toHaveBeenCalledWith(100)
    expect(xhr.open).toHaveBeenCalledWith(
      'POST',
      'https://upload.example.test/path',
      true,
    )
    expect(xhr.headers).toEqual([['Content-Type', 'image/jpeg']])
  })

  it.each([
    ['network', 0, '', 'error', 'network_error'],
    ['abort', 0, '', 'abort', 'aborted'],
    ['http', 429, '{}', 'load', 'http_error'],
    ['malformed', 200, '{"storageId":4}', 'load', 'invalid_response'],
  ])(
    'maps %s failures to stable codes',
    async (_, status, responseText, event, code) => {
      const xhr = new FakeXhr()
      const pending = uploadBlobWithProgress({
        uploadUrl: 'https://upload.example.test/path',
        blob: new Blob(['jpeg'], { type: 'image/jpeg' }),
        onProgress: vi.fn(),
        createXhr: () => xhr,
      })
      xhr.status = status
      xhr.responseText = responseText
      xhr.emit(event)

      await expect(pending).resolves.toEqual({ kind: 'error', code })
    },
  )
})
