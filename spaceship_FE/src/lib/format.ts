export function money(amount: number): string {
  return `${amount.toLocaleString('en-US')} ₫`
}

/** "9:00" — the clock time in the viewer's own timezone. */
export function clock(iso: string): string {
  const date = new Date(iso)
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function day(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function duration(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes))
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

export function minutesBetween(startIso: string, endIso: string): number {
  return Math.floor((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000)
}

export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

/**
 * Customer search: every word typed must appear in the name or the phone,
 * so "lan", "0901" and "lan 0901" all work.
 */
export function matchesCustomer(
  customer: { name: string; phone: string | null },
  query: string,
): boolean {
  const name = customer.name.toLowerCase()
  const phone = customer.phone ?? ''
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => name.includes(word) || phone.includes(word))
}

export function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong'
}
