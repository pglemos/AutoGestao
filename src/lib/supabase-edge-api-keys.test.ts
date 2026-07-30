import { describe, expect, test } from 'bun:test'
import {
  resolveSupabasePublishableKey,
  resolveSupabaseSecretKey,
} from '../../supabase/functions/_shared/api-keys'

const env = (values: Record<string, string | undefined>) => (name: string) => values[name]

describe('Edge Functions — API keys modernas', () => {
  test('usa a chave secret default do mapa gerenciado', () => {
    expect(resolveSupabaseSecretKey(env({
      SUPABASE_SECRET_KEYS: JSON.stringify({ default: 'sb_secret_current' }),
      SUPABASE_SERVICE_ROLE_KEY: 'legacy-service-role',
    }))).toBe('sb_secret_current')
  })

  test('usa a chave publishable default do mapa gerenciado', () => {
    expect(resolveSupabasePublishableKey(env({
      SUPABASE_PUBLISHABLE_KEYS: JSON.stringify({ default: 'sb_publishable_current' }),
      SUPABASE_ANON_KEY: 'legacy-anon',
    }))).toBe('sb_publishable_current')
  })

  test('mantém fallback legado somente durante o cutover', () => {
    expect(resolveSupabaseSecretKey(env({
      SUPABASE_SERVICE_ROLE_KEY: 'legacy-service-role',
    }))).toBe('legacy-service-role')
    expect(resolveSupabasePublishableKey(env({
      SUPABASE_ANON_KEY: 'legacy-anon',
    }))).toBe('legacy-anon')
  })

  test('falha fechada para mapa inválido sem fallback', () => {
    expect(() => resolveSupabaseSecretKey(env({
      SUPABASE_SECRET_KEYS: '{"default":42}',
    }))).toThrow('Missing Supabase secret API key')
    expect(() => resolveSupabasePublishableKey(env({
      SUPABASE_PUBLISHABLE_KEYS: 'not-json',
    }))).toThrow('Missing Supabase publishable API key')
  })
})
