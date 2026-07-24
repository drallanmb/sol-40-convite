export const RSVP_CAPABILITY_STORAGE_KEY = 'sol40:rsvp-capability:v1'

const CAPABILITY_BYTE_LENGTH = 32
const CAPABILITY_PATTERN = /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/

export type RsvpUnlockServerResult =
  | { kind: 'unlocked' }
  | { kind: 'not_found' }
  | { kind: 'token_conflict' }
  | { kind: 'rate_limited'; retryAfterSeconds: number }

export type RsvpUnlockClientResult =
  | { kind: 'unlocked'; capability: string }
  | { kind: 'not_found' }
  | { kind: 'rate_limited'; retryAfterSeconds: number }
  | { kind: 'failed' }

export type RsvpUnlockCaller = (
  capability: string,
) => Promise<RsvpUnlockServerResult>

export type RsvpCapabilityFactory = () => string

export type RsvpRandomFill = (bytes: Uint8Array<ArrayBuffer>) => void

function isRsvpCapability(value: string) {
  return CAPABILITY_PATTERN.test(value)
}

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

export function generateRsvpCapability(
  fillRandom: RsvpRandomFill = (bytes) => {
    globalThis.crypto.getRandomValues(bytes)
  },
) {
  const bytes: Uint8Array<ArrayBuffer> = new Uint8Array(
    new ArrayBuffer(CAPABILITY_BYTE_LENGTH),
  )
  fillRandom(bytes)
  return encodeBase64Url(bytes)
}

export function readRsvpCapability(storage: Storage) {
  let capability: string | null

  try {
    capability = storage.getItem(RSVP_CAPABILITY_STORAGE_KEY)
  } catch {
    return null
  }

  if (capability === null) return null
  if (isRsvpCapability(capability)) return capability

  clearRsvpCapability(storage)
  return null
}

export function storeRsvpCapability(storage: Storage, capability: string) {
  if (!isRsvpCapability(capability)) return false

  try {
    storage.setItem(RSVP_CAPABILITY_STORAGE_KEY, capability)
    return true
  } catch {
    return false
  }
}

export function clearRsvpCapability(storage: Storage) {
  try {
    storage.removeItem(RSVP_CAPABILITY_STORAGE_KEY)
  } catch {
    // A blocked storage implementation already behaves as an empty session.
  }
}

export async function unlockRsvpWithFreshCapability(
  callUnlock: RsvpUnlockCaller,
  createCapability: RsvpCapabilityFactory = generateRsvpCapability,
): Promise<RsvpUnlockClientResult> {
  const firstCapability = createCapability()
  const firstResult = await callUnlock(firstCapability)

  if (firstResult.kind === 'unlocked') {
    return {
      kind: 'unlocked',
      capability: firstCapability,
    }
  }
  if (firstResult.kind !== 'token_conflict') {
    return firstResult
  }

  const secondCapability = createCapability()
  if (secondCapability === firstCapability) {
    return { kind: 'failed' }
  }

  const secondResult = await callUnlock(secondCapability)
  if (secondResult.kind === 'unlocked') {
    return {
      kind: 'unlocked',
      capability: secondCapability,
    }
  }
  if (secondResult.kind === 'token_conflict') {
    return { kind: 'failed' }
  }
  return secondResult
}
