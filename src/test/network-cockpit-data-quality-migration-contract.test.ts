import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dir, '../..')
const migration = readFileSync(join(root, 'supabase/migrations/20260901170000_network_cockpit_data_quality.sql'), 'utf8')

describe('contrato de qualidade de dados do cockpit de rede', () => {
  test('define fechamento válido sem promover rascunho ou linha vazia a dado real', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.get_resumo_rede_periodo')
    expect(migration).toContain('l.submitted_at IS NOT NULL')
    expect(migration).toContain("coalesce(l.submission_status, '') <> 'draft'")
    expect(migration).toContain("nullif(trim(coalesce(l.zero_reason, '')), '') IS NOT NULL")
    expect(migration).toContain('vendas_oficiais_deduplicadas_periodo')
  })

  test('expõe qualidade operacional, de meta e de disciplina no patch canônico', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.patch_network_cockpit_sales')
    expect(migration).toContain("'{dataQuality}'")
    expect(migration).toContain("'operational', (item.has_closing OR item.sales > 0)")
    expect(migration).toContain("'goal', item.has_goal")
    expect(migration).toContain("'discipline', (item.has_seller AND item.has_closing)")
    expect(migration).toContain('get_vendas_oficiais_periodo')
  })

  test('mantém o RPC protegido para a sessão autenticada', () => {
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.get_resumo_rede_periodo(date, date, text) FROM PUBLIC, anon;')
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.get_resumo_rede_periodo(date, date, text) TO authenticated;')
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.patch_network_cockpit_sales(jsonb, date, date) FROM PUBLIC, anon;')
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.patch_network_cockpit_sales(jsonb, date, date) TO authenticated;')
  })
})
