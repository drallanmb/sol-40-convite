const POST_CAPABILITY_LENGTH = 43
const CANONICAL_BASE64URL_32_BYTES =
  /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/u

function toHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function sha256Hex(value: string) {
  const encoded = new TextEncoder().encode(value)
  return toHex(await crypto.subtle.digest('SHA-256', encoded))
}

/**
 * Trinta e dois bytes em base64url canônico sem padding sempre ocupam 43
 * caracteres; os quatro finais possíveis garantem zero nos pad bits.
 */
export function validatePostCapability(value: string) {
  return value.length === POST_CAPABILITY_LENGTH && CANONICAL_BASE64URL_32_BYTES.test(value)
}

async function hashCanonicalKey(purpose: 'post-capability' | 'post-device-key', value: string) {
  if (!validatePostCapability(value)) {
    throw new Error('Invalid post capability')
  }

  return sha256Hex(`${purpose}\u0000${value}`)
}

export function hashPostCapability(capability: string) {
  return hashCanonicalKey('post-capability', capability)
}

/**
 * A chave do dispositivo serve apenas para justiça do rate-limit, nunca como
 * identidade ou autorização. Só o hash com domínio próprio vira chave de bucket.
 */
export function hashPostDeviceKey(deviceKey: string) {
  return hashCanonicalKey('post-device-key', deviceKey)
}
