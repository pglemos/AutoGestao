import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const migration = readFileSync(
  new URL('../../../supabase/migrations/20260815110000_base44_admin_governance_foundation.sql', import.meta.url),
  'utf8',
)

describe('Base44 admin governance schema contract', () => {
  test('creates only missing governance domains, not parallel operational sources', () => {
    const required = [
      'versoes_programa_consultoria',
      'consultores_mx_perfil',
      'pacotes_indicadores_estrategicos',
      'modelos_planos_acao',
      'aplicacoes_modelo_plano_acao',
      'versoes_metodologia_consultoria',
    ]
    for (const table of required) expect(migration).toContain(`public.${table}`)

    const forbidden = [
      'public.client_accounts',
      'public.stores_base44',
      'public.user_profiles_base44',
      'public.action_plans_base44',
      'public.indicator_definitions_base44',
      'public.journey_encounters_base44',
    ]
    for (const table of forbidden) expect(migration).not.toContain(table)
  })

  test('protects template application with a unique idempotency key', () => {
    expect(migration).toContain('application_request_id uuid NOT NULL UNIQUE')
    expect(migration).toContain('created_action_ids uuid[]')
  })

  test('keeps one published governance version while preserving draft and archived history', () => {
    expect(migration).toContain('versoes_pacote_indicadores_one_published_idx')
    expect(migration).toContain("WHERE status = 'publicado'")
    expect(migration).not.toContain('UNIQUE (program_version_id, status)')
  })

  test('enables RLS and gates governance tables through the current internal MX contract', () => {
    expect(migration).toContain('ENABLE ROW LEVEL SECURITY')
    expect(migration).toContain('public.eh_area_interna_mx(auth.uid())')
    expect(migration).toContain('REVOKE ALL ON TABLE')
  })
})
