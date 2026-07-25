import { describe, expect, it, vi } from 'vitest'
import {
  runFreshMemoryUploadAttempt,
  type FreshMemoryReservation,
} from './memoryUploadAttempt'

const uploadFailures = [
  'network_error',
  'aborted',
  'http_error',
  'invalid_response',
] as const

describe('fresh memory upload transport orchestration', () => {
  it.each(uploadFailures)(
    'requests a different reservation after %s while reusing the processed blob',
    async (failureCode) => {
      const blob = new Blob(['processed-jpeg'], { type: 'image/jpeg' })
      const reservations: FreshMemoryReservation[] = [
        {
          reservationId: 'reservation-1',
          capability: 'capability-1',
          uploadUrl: 'https://upload.example.test/one',
        },
        {
          reservationId: 'reservation-2',
          capability: 'capability-2',
          uploadUrl: 'https://upload.example.test/two',
        },
      ]
      const requestReservation = vi.fn(async () => reservations.shift()!)
      const upload = vi
        .fn()
        .mockResolvedValueOnce({ kind: 'error', code: failureCode })
        .mockResolvedValueOnce({
          kind: 'uploaded',
          storageId: 'storage-2',
        })

      const first = await runFreshMemoryUploadAttempt({
        blob,
        requestReservation,
        upload,
        onReservation: vi.fn(),
        onProgress: vi.fn(),
      })
      const second = await runFreshMemoryUploadAttempt({
        blob,
        requestReservation,
        upload,
        onReservation: vi.fn(),
        onProgress: vi.fn(),
      })

      expect(first).toEqual({ kind: 'upload_failed', code: failureCode })
      expect(second).toEqual({
        kind: 'uploaded',
        reservation: {
          reservationId: 'reservation-2',
          capability: 'capability-2',
          uploadUrl: 'https://upload.example.test/two',
        },
        storageId: 'storage-2',
      })
      expect(requestReservation).toHaveBeenCalledTimes(2)
      expect(upload).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          uploadUrl: 'https://upload.example.test/one',
          blob,
        }),
      )
      expect(upload).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          uploadUrl: 'https://upload.example.test/two',
          blob,
        }),
      )
    },
  )

  it('turns a thrown upload into a refreshable network failure', async () => {
    const reservation = {
      reservationId: 'reservation-1',
      capability: 'capability-1',
      uploadUrl: 'https://upload.example.test/one',
    }

    await expect(
      runFreshMemoryUploadAttempt({
        blob: new Blob(['jpeg']),
        requestReservation: async () => reservation,
        upload: async () => {
          throw new Error('offline')
        },
        onReservation: vi.fn(),
        onProgress: vi.fn(),
      }),
    ).resolves.toEqual({ kind: 'upload_failed', code: 'network_error' })
  })
})
