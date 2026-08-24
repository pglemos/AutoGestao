import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const migration = readFileSync(
  new URL('../../supabase/migrations/20260824173308_fix_ranking_canonical_sales_dedup.sql', import.meta.url),
  'utf8',
)
const adapter = readFileSync(
  new URL('../features/carteira-clientes/lib/installCarteiraBase44Adapter.js', import.meta.url),
  'utf8',
)
const base44Client = readFileSync(new URL('../api/base44Client.js', import.meta.url), 'utf8')
const targetPlan = migration.slice(migration.indexOf('CREATE OR REPLACE FUNCTION public.consolidate_store_target_plan'))
const securityFollowup = readFileSync(
  new URL('../../supabase/migrations/20260824182000_harden_ranking_canonical_sales_security.sql', import.meta.url),
  'utf8',
)
const privilegeFollowup = readFileSync(
  new URL('../../supabase/migrations/20260824193000_harden_vendedor_performance_anon_privilege.sql', import.meta.url),
  'utf8',
)

describe('canonical ranking sales migration', () => {
  test('deduplicates by opportunity and excludes cancelled or competence-less sales', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.vendas_oficiais_deduplicadas_periodo')
    expect(migration).toContain('PARTITION BY coalesce(c.oportunidade_id, c.evento_id)')
    expect(migration).toContain("o.etapa IS DISTINCT FROM 'cancelada'")
    expect(migration).toContain('public.venda_competencia_canonica(')
    expect(migration).toContain('WHERE r.occurrence_number = 1')
  })

  test('uses the helper in the ranking, performance, live overview and target plan paths', () => {
    expect(migration.match(/public\.vendas_oficiais_deduplicadas_periodo\(/g)?.length).toBeGreaterThanOrEqual(8)
    expect(targetPlan).toContain("'sales_source','vendas_oficiais_deduplicadas_periodo'")
    expect(targetPlan).not.toContain("COALESCE(ec.data_competencia, timezone('America/Sao_Paulo', ec.data_evento)")
  })

  test('updates the latest sale event by opportunity rather than an absent RPC event_id', () => {
    expect(migration).toContain('WHERE ec.oportunidade_id = p_oportunidade_id')
    expect(migration).toContain("AND ec.tipo_evento = 'venda_realizada'")
    expect(migration).toContain('ORDER BY ec.data_evento DESC NULLS LAST')
    expect(migration).not.toContain("v_result->'data'->>'evento_id'")
  })

  test('propagates competence through both Base44 payload paths', () => {
    expect(adapter).toContain('data_competencia: saleCompetence ?? null')
    expect(base44Client).toContain('data_competencia: data.data_competencia || data.sale_date || data.data_venda || null')
  })

  test('hardens the already-applied RPCs without relying on a re-run of the original migration', () => {
    expect(securityFollowup).toContain('ALTER FUNCTION public.get_vendas_oficiais_periodo(date, date, uuid, uuid)')
    expect(securityFollowup).toContain('ALTER FUNCTION public.vendedor_performance_oficial(date, date, uuid, uuid)')
    expect(securityFollowup).toContain('CREATE OR REPLACE FUNCTION public.admin_store_live_overview(')
    expect(securityFollowup).toContain('ALTER FUNCTION public.consolidate_store_target_plan(uuid, date)')
    expect(securityFollowup).toContain("SET search_path = public, pg_temp")
    expect(securityFollowup).toContain("IF v_caller_id IS NULL THEN")
    expect(securityFollowup).toContain('public.is_manager_of(p_store_id)')
    expect(securityFollowup).toContain('public.is_owner_of(p_store_id)')
  })

  test('revokes explicit anonymous privilege in a new forward-only follow-up', () => {
    expect(privilegeFollowup).toContain('REVOKE ALL ON FUNCTION public.vendedor_performance_oficial(date, date, uuid, uuid) FROM PUBLIC, anon')
    expect(privilegeFollowup).toContain('GRANT EXECUTE ON FUNCTION public.vendedor_performance_oficial(date, date, uuid, uuid) TO authenticated')
  })
})
