export type AdminPresence = 'pending' | 'yes' | 'no'
export type AdminPresenceFilter = 'all' | AdminPresence

export type AdminGuestSearchRecord = {
  id: string
  name: string
  attendance: AdminPresence
}

export type AdminFamilySearchRecord = {
  id: string
  displayName: string
  phone: string
  guests: readonly AdminGuestSearchRecord[]
}

const COMBINING_MARKS = /\p{M}+/gu

export function foldAdminSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLocaleLowerCase('pt-BR')
    .trim()
}

export function foldAdminPhone(value: string) {
  return value.replace(/\D/gu, '')
}

export function filterFamilies<T extends AdminFamilySearchRecord>(
  families: readonly T[],
  options: { query: string; presence: AdminPresenceFilter },
): T[] {
  const query = foldAdminSearchText(options.query)
  const phoneQuery = foldAdminPhone(options.query)

  return families.filter((family) => {
    const searchMatches =
      !query ||
      foldAdminSearchText(family.displayName).includes(query) ||
      family.guests.some((guest) =>
        foldAdminSearchText(guest.name).includes(query),
      ) ||
      (phoneQuery.length > 0 && foldAdminPhone(family.phone).includes(phoneQuery))
    const presenceMatches =
      options.presence === 'all' ||
      family.guests.some((guest) => guest.attendance === options.presence)
    return searchMatches && presenceMatches
  })
}

export function guestResultCount(families: readonly AdminFamilySearchRecord[]) {
  return families.reduce((total, family) => total + family.guests.length, 0)
}
