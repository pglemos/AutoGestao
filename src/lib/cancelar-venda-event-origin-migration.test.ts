import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const migration = readFileSync(
  new URL('../../supabase/migrations/20260826150000_cancelar_venda_evento_origem.sql', import.meta.url),
  'utf8',
)
const canonicalSalesMigration = readFileSync(
  new URL('../../supabase/migrations/20260824163327_ranking_vendas_competencia_canonica.sql', import.meta.url),
  'utf8',
)
const deduplicatedSalesMigration = readFileSync(
  new URL('../../supabase/migrations/20260824173308_fix_ranking_canonical_sales_dedup.sql', import.meta.url),
  'utf8',
)

describe('cancelamento por evento oficial', () => {
  test('aceita oportunidade ou evento e mantém o evento original imutável', () => {
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS evento_origem_id uuid')
    expect(migration).toContain("v_oportunidade_text text := nullif(trim(p_payload->>'oportunidade_id'), '')")
    expect(migration).toContain("v_evento_text text := nullif(trim(p_payload->>'evento_id'), '')")
    expect(migration).toContain("ec.tipo_evento = 'venda_realizada'")
    expect(migration).toContain('FOR UPDATE')
    expect(migration).toContain("tipo_evento,\n    canal,\n    data_evento")
    expect(migration).toContain("'venda_cancelada'")
    expect(migration).toContain('evento_origem_id')
    expect(migration).toContain('v_evento_origem.id')
  })

  test('protege escopo e idempotência para gerente, dono e área interna MX', () => {
    expect(migration).toContain('public.eh_area_interna_mx(v_caller_id)')
    expect(migration).toContain('public.is_manager_of(v_store_id)')
    expect(migration).toContain('public.is_owner_of(v_store_id)')
    expect(migration).toContain('Venda não está em estado cancelável.')
    expect(migration).toContain('idx_eventos_comerciais_cancelamento_origem')
    expect(migration).toContain("cancelamento.agendamento_id IS NULL")
  })

  test('desconta cancelamentos órfãos do helper consumido pelos agregadores canônicos', () => {
    const helper = migration.slice(migration.indexOf('CREATE OR REPLACE FUNCTION public.vendas_oficiais_deduplicadas_periodo'))

    expect(helper).toContain('cancelamento.evento_origem_id = ec.id')
    expect(helper).toContain('PARTITION BY coalesce(c.oportunidade_id, c.evento_id)')
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.get_resumo_rede_periodo')
    expect(migration).toContain('public.vendas_oficiais_deduplicadas_periodo(')
    expect(deduplicatedSalesMigration).toContain('FROM public.vendas_oficiais_deduplicadas_periodo(')
  })

  test('preserva o caminho real do cockpit do Dono sem reconstrução dinâmica', () => {
    expect(migration).not.toContain('pg_get_functiondef')
    expect(migration).not.toContain('  owner_sales AS (')
    expect(migration).toContain('patch_network_cockpit_sales')
    expect(canonicalSalesMigration).toContain('ALTER FUNCTION public.get_owner_network_cockpit(date, date) RENAME TO get_owner_network_cockpit_legacy;')
    expect(canonicalSalesMigration).toContain('public.get_owner_network_cockpit_legacy(p_start_date, p_end_date)')
    expect(canonicalSalesMigration).toContain('public.patch_network_cockpit_sales(')
    expect(canonicalSalesMigration).toContain('FROM public.get_vendas_oficiais_periodo(')
  })
})
