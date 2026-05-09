export function routeParamToString(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) return value
  if (Array.isArray(value) && value.length > 0) {
    const first = value[0]
    if (typeof first === 'string' && first.length > 0) return first
  }
  return null
}
