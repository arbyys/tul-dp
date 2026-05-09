import { DateIso, NonEmptyString100, NonEmptyString1000, String1000 } from '@evolu/common'

export function toNonEmpty100(value: string): typeof NonEmptyString100.Type {
  return NonEmptyString100.orThrow(value.trim())
}

export function toNullableNonEmpty100(
  value: string | null | undefined,
): typeof NonEmptyString100.Type | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  return NonEmptyString100.orThrow(trimmed)
}

export function toNonEmpty1000(value: string): typeof NonEmptyString1000.Type {
  return NonEmptyString1000.orThrow(value.trim())
}

export function toNullableString1000(
  value: string | null | undefined,
): typeof String1000.Type | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  return String1000.orThrow(trimmed)
}

export function nowDateIso(): typeof DateIso.Type {
  return DateIso.orThrow(new Date().toISOString())
}

export function toNullableDateIsoFromDateInput(
  value: string | null | undefined,
): typeof DateIso.Type | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  const date = new Date(trimmed)
  if (Number.isNaN(date.getTime())) return null
  return DateIso.orThrow(date.toISOString())
}
