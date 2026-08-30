import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const sql = readFileSync(
  new URL('../../supabase/migrations/20260829120000_allow_volume_de_leads_por_venda.sql', import.meta.url),
  'utf8',
)

describe('roster oficial — VOLUME_DE_LEADS_POR_VENDA', () => {
  test('o gate SQL passa a aceitar os aliases oficiais do 46º indicador', () => {
    expect(sql).toContain('eh_indicador_oficial_base44')
    expect(sql).toContain("'volume_de_leads_por_venda'")
    expect(sql).toContain("'volume_leads_por_venda'")
    expect(sql).toContain("'leads_per_sale'")
    expect(sql).toContain("target_calculation_mode")
    expect(sql).toContain("'MANUAL'")
    expect(sql).toContain('casas_decimais')
  })
})
