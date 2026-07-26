import { describe, expect, it, vi } from 'vitest'
import { copyTextToClipboard } from './clipboard'

describe('copyTextToClipboard', () => {
  it('confirms the copy only after the clipboard accepts the link', async () => {
    const writeText = vi.fn(async () => undefined)

    await expect(
      copyTextToClipboard('https://www.sol40.com.br/admin/ativar?token=valid', {
        writeText,
      }),
    ).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith(
      'https://www.sol40.com.br/admin/ativar?token=valid',
    )
  })

  it('reports failure when mobile clipboard access is unavailable or denied', async () => {
    await expect(copyTextToClipboard('link', undefined)).resolves.toBe(false)
    await expect(
      copyTextToClipboard('link', {
        writeText: vi.fn(async () => {
          throw new DOMException('Clipboard denied', 'NotAllowedError')
        }),
      }),
    ).resolves.toBe(false)
  })
})
