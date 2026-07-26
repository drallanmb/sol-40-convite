type ClipboardWriter = Pick<Clipboard, 'writeText'>

export async function copyTextToClipboard(
  text: string,
  clipboard: ClipboardWriter | undefined = globalThis.navigator?.clipboard,
) {
  if (!text || !clipboard?.writeText) return false

  try {
    await clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
