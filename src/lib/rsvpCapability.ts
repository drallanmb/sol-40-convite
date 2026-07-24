export const RSVP_CAPABILITY_BYTE_LENGTH = 32
export const RSVP_CAPABILITY_ENCODED_LENGTH = Math.ceil(
  (RSVP_CAPABILITY_BYTE_LENGTH * 8) / 6,
)

const RSVP_CAPABILITY_PATTERN =
  /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/

/**
 * Contrato canônico compartilhado pelo navegador e pelo backend.
 * O último caractere restrito rejeita base64url com pad bits não canônicos.
 */
export function isRsvpCapability(value: string) {
  return (
    value.length === RSVP_CAPABILITY_ENCODED_LENGTH &&
    RSVP_CAPABILITY_PATTERN.test(value)
  )
}
