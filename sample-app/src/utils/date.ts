function formatWithSeparator(value: string | null | undefined, separator: string, fallback: string): string {
  if (typeof value !== 'string' || value.length === 0) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear())
  return `${day}${separator}${month}${separator}${year}`
}

export function formatDateReadable(value: string | null | undefined): string {
  return formatWithSeparator(value, '. ', '—')
}

export function formatDueDate(value: string | null | undefined): string {
  return formatWithSeparator(value, '.', 'Bez termínu')
}

export function dateToSortKey(value: string | null | undefined): number {
  if (typeof value !== 'string') return 0
  const t = new Date(value).getTime()
  return Number.isNaN(t) ? 0 : t
}

export function isLoanOverdue(expectedReturnAt: string | null | undefined): boolean {
  if (typeof expectedReturnAt !== 'string' || expectedReturnAt.length === 0) return false
  return expectedReturnAt < new Date().toISOString()
}
