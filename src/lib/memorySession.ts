export const MEMORY_DEVICE_KEY_STORAGE_KEY = 'sol40:memory-device-key:v1'
export const MEMORY_KEY_BYTE_LENGTH = 32

export type MemoryRandomFill = (bytes: Uint8Array<ArrayBuffer>) => void

let inMemoryDeviceKey: string | null = null

function encodeBase64Url(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/u, '')
}

export function isCanonicalMemoryKey(value: string) {
  return /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/u.test(value)
}

function createMemoryKey(
  fillRandom: MemoryRandomFill = (bytes) => {
    globalThis.crypto.getRandomValues(bytes)
  },
) {
  const bytes: Uint8Array<ArrayBuffer> = new Uint8Array(
    new ArrayBuffer(MEMORY_KEY_BYTE_LENGTH),
  )
  fillRandom(bytes)
  return encodeBase64Url(bytes)
}

/** A persisted anonymous fairness key, never an identity or authentication token. */
export function createMemoryDeviceKey(fillRandom?: MemoryRandomFill) {
  return createMemoryKey(fillRandom)
}

/** A single-reservation capability that callers must keep in component memory. */
export function createReservationCapability(fillRandom?: MemoryRandomFill) {
  return createMemoryKey(fillRandom)
}

export function loadOrCreateMemoryDeviceKey(
  storage: Storage = globalThis.localStorage,
  createKey: () => string = createMemoryDeviceKey,
) {
  let storageAvailable = true
  try {
    const stored = storage.getItem(MEMORY_DEVICE_KEY_STORAGE_KEY)
    if (stored !== null && isCanonicalMemoryKey(stored)) {
      return stored
    }
    if (stored !== null) {
      storage.removeItem(MEMORY_DEVICE_KEY_STORAGE_KEY)
    }
  } catch {
    storageAvailable = false
  }

  if (!storageAvailable && inMemoryDeviceKey !== null) {
    return inMemoryDeviceKey
  }

  const generated = createKey()
  if (!isCanonicalMemoryKey(generated)) {
    throw new Error('Memory key factory returned a malformed key')
  }
  try {
    storage.setItem(MEMORY_DEVICE_KEY_STORAGE_KEY, generated)
  } catch {
    storageAvailable = false
  }
  if (!storageAvailable) inMemoryDeviceKey = generated
  return generated
}
