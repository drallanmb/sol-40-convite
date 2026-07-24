import { describe, expect, it, vi } from 'vitest'
import {
  RSVP_CAPABILITY_STORAGE_KEY,
  clearRsvpCapability,
  generateRsvpCapability,
  readRsvpCapability,
  storeRsvpCapability,
  unlockRsvpWithFreshCapability,
} from './rsvpSession'

class MemoryStorage implements Storage {
  readonly values = new Map<string, string>()
  readonly reads: string[] = []
  readonly writes: string[] = []
  readonly removals: string[] = []

  get length() {
    return this.values.size
  }

  clear() {
    this.values.clear()
  }

  getItem(key: string) {
    this.reads.push(key)
    return this.values.get(key) ?? null
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null
  }

  removeItem(key: string) {
    this.removals.push(key)
    this.values.delete(key)
  }

  setItem(key: string, value: string) {
    this.writes.push(key)
    this.values.set(key, value)
  }
}

function decodeBase64Url(value: string) {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/')
  const padded = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
}

const CAPABILITY_A = 'A'.repeat(43)
const CAPABILITY_B = 'B'.repeat(43)

describe('RSVP capability generation', () => {
  it('encodes exactly 32 random bytes as canonical unpadded base64url', () => {
    const capability = generateRsvpCapability((bytes) => {
      bytes.forEach((_, index) => {
        bytes[index] = index
      })
    })

    expect(capability).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(capability).not.toContain('=')
    expect([...decodeBase64Url(capability)]).toEqual(
      Array.from({ length: 32 }, (_, index) => index),
    )
  })
})

describe('RSVP session-scoped storage', () => {
  it('writes and restores only the raw capability under the exported versioned key', () => {
    const storage = new MemoryStorage()

    expect(storeRsvpCapability(storage, CAPABILITY_A)).toBe(true)
    expect([...storage.values.entries()]).toEqual([
      [RSVP_CAPABILITY_STORAGE_KEY, CAPABILITY_A],
    ])
    expect(readRsvpCapability(storage)).toBe(CAPABILITY_A)
    expect(storage.writes).toEqual([RSVP_CAPABILITY_STORAGE_KEY])
    expect(storage.reads).toEqual([RSVP_CAPABILITY_STORAGE_KEY])
  })

  it('returns null when the versioned entry is absent', () => {
    const storage = new MemoryStorage()

    expect(readRsvpCapability(storage)).toBeNull()
    expect(storage.reads).toEqual([RSVP_CAPABILITY_STORAGE_KEY])
  })

  it.each([
    ['too short', 'abc'],
    ['padded', `${'A'.repeat(42)}=`],
    ['non-url alphabet', `${'A'.repeat(42)}+`],
  ])('clears a malformed restored value: %s', (_, malformed) => {
    const storage = new MemoryStorage()
    storage.setItem(RSVP_CAPABILITY_STORAGE_KEY, malformed)

    expect(readRsvpCapability(storage)).toBeNull()
    expect(storage.getItem(RSVP_CAPABILITY_STORAGE_KEY)).toBeNull()
    expect(storage.removals).toEqual([RSVP_CAPABILITY_STORAGE_KEY])
  })

  it('refuses to persist malformed input', () => {
    const storage = new MemoryStorage()

    expect(storeRsvpCapability(storage, 'not-a-capability')).toBe(false)
    expect(storage.length).toBe(0)
  })

  it('clears exactly the exported capability entry', () => {
    const storage = new MemoryStorage()
    storage.setItem(RSVP_CAPABILITY_STORAGE_KEY, CAPABILITY_A)
    storage.setItem('unrelated', 'keep')

    clearRsvpCapability(storage)

    expect(storage.getItem(RSVP_CAPABILITY_STORAGE_KEY)).toBeNull()
    expect(storage.getItem('unrelated')).toBe('keep')
  })
})

describe('bounded RSVP unlock collision recovery', () => {
  it('makes one call and returns its fresh capability on normal success', async () => {
    const call = vi.fn().mockResolvedValue({ kind: 'unlocked' })
    const createCapability = vi.fn().mockReturnValue(CAPABILITY_A)

    await expect(
      unlockRsvpWithFreshCapability(call, createCapability),
    ).resolves.toEqual({
      kind: 'unlocked',
      capability: CAPABILITY_A,
    })
    expect(call).toHaveBeenCalledTimes(1)
    expect(call).toHaveBeenCalledWith(CAPABILITY_A)
    expect(createCapability).toHaveBeenCalledTimes(1)
  })

  it.each([
    [{ kind: 'not_found' }, { kind: 'not_found' }],
    [
      { kind: 'rate_limited', retryAfterSeconds: 7 },
      { kind: 'rate_limited', retryAfterSeconds: 7 },
    ],
  ])('makes one call for a non-collision failure', async (serverResult, expected) => {
    const call = vi.fn().mockResolvedValue(serverResult)

    await expect(
      unlockRsvpWithFreshCapability(call, () => CAPABILITY_A),
    ).resolves.toEqual(expected)
    expect(call).toHaveBeenCalledTimes(1)
  })

  it('discards the collided capability and succeeds once with a distinct token', async () => {
    const call = vi
      .fn()
      .mockResolvedValueOnce({ kind: 'token_conflict' })
      .mockResolvedValueOnce({ kind: 'unlocked' })
    const createCapability = vi
      .fn()
      .mockReturnValueOnce(CAPABILITY_A)
      .mockReturnValueOnce(CAPABILITY_B)

    await expect(
      unlockRsvpWithFreshCapability(call, createCapability),
    ).resolves.toEqual({
      kind: 'unlocked',
      capability: CAPABILITY_B,
    })
    expect(call).toHaveBeenCalledTimes(2)
    expect(call.mock.calls.map(([capability]) => capability)).toEqual([
      CAPABILITY_A,
      CAPABILITY_B,
    ])
  })

  it('stops after a conflict followed by an ordinary failure', async () => {
    const call = vi
      .fn()
      .mockResolvedValueOnce({ kind: 'token_conflict' })
      .mockResolvedValueOnce({ kind: 'not_found' })

    await expect(
      unlockRsvpWithFreshCapability(
        call,
        vi.fn().mockReturnValueOnce(CAPABILITY_A).mockReturnValueOnce(CAPABILITY_B),
      ),
    ).resolves.toEqual({ kind: 'not_found' })
    expect(call).toHaveBeenCalledTimes(2)
  })

  it('turns a second conflict into a generic failure with no third call or capability', async () => {
    const call = vi.fn().mockResolvedValue({ kind: 'token_conflict' })
    const result = await unlockRsvpWithFreshCapability(
      call,
      vi.fn().mockReturnValueOnce(CAPABILITY_A).mockReturnValueOnce(CAPABILITY_B),
    )

    expect(result).toEqual({ kind: 'failed' })
    expect(result).not.toHaveProperty('capability')
    expect(call).toHaveBeenCalledTimes(2)
  })
})
