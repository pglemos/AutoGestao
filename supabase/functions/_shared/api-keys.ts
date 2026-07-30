export type SupabaseEnvReader = (name: string) => string | undefined

function resolveDefaultKey(raw: string | undefined): string | null {
  if (!raw) return null

  try {
    const keys: unknown = JSON.parse(raw)
    if (!keys || typeof keys !== 'object' || Array.isArray(keys)) return null
    const defaultKey = (keys as Record<string, unknown>).default
    return typeof defaultKey === 'string' && defaultKey.length > 0 ? defaultKey : null
  } catch {
    return null
  }
}

export function findSupabaseSecretKey(getEnv: SupabaseEnvReader): string | undefined {
  return resolveDefaultKey(getEnv('SUPABASE_SECRET_KEYS'))
    ?? getEnv('SUPABASE_SERVICE_ROLE_KEY')
    ?? undefined
}

export function resolveSupabaseSecretKey(getEnv: SupabaseEnvReader): string {
  const key = findSupabaseSecretKey(getEnv)
  if (!key) throw new Error('Missing Supabase secret API key')
  return key
}

export function findSupabasePublishableKey(getEnv: SupabaseEnvReader): string | undefined {
  return resolveDefaultKey(getEnv('SUPABASE_PUBLISHABLE_KEYS'))
    ?? getEnv('SUPABASE_ANON_KEY')
    ?? undefined
}

export function resolveSupabasePublishableKey(getEnv: SupabaseEnvReader): string {
  const key = findSupabasePublishableKey(getEnv)
  if (!key) throw new Error('Missing Supabase publishable API key')
  return key
}
