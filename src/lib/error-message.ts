type ErrorRecord = Record<string, unknown>

function isErrorRecord(value: unknown): value is ErrorRecord {
  return typeof value === 'object' && value !== null
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

/**
 * Converts thrown values and JSON/RPC error payloads into safe UI text.
 * PostgREST errors are plain objects, not always Error instances.
 */
export function getErrorMessage(value: unknown, fallback: string): string {
  if (value instanceof Error) return firstText(value.message) || fallback
  if (typeof value === 'string') return firstText(value) || fallback
  if (!isErrorRecord(value)) return fallback

  const direct = firstText(value.message, value.error, value.details, value.hint)
  if (direct) return direct

  for (const nested of [value.error, value.details]) {
    if (isErrorRecord(nested)) {
      const nestedMessage = getErrorMessage(nested, '')
      if (nestedMessage) return nestedMessage
    }
  }

  return fallback
}
