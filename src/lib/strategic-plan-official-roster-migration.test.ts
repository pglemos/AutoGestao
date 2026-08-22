import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const sql = readFileSync(
  new URL('../../supabase/migrations/20260822033000_prune_non_base44_strategic_indicators.sql', import.meta.url),
  'utf8',
)

describe('roster oficial Base44 — prune de extras MX', () => {
  test('define o gate oficial e remove extras de ciclo e pacote', () => {
    expect(sql).toContain('eh_indicador_oficial_base44')
    expect(sql).toContain("'sales_door_flow'")
    expect(sql).toContain("'contribution_margin'")
    expect(sql).not.toContain("'sales_goal'")
    expect(sql).toContain("status = 'arquivado'")
    expect(sql).toContain("catalog.status = 'publicado'")
    expect(sql).toContain('DELETE FROM public.ciclos_plano_estrategico_indicadores')
    expect(sql).toContain('DELETE FROM public.pacotes_indicadores_itens')
    expect(sql).toContain('trg_bloquear_indicador_nao_oficial_ciclo')
    expect(sql).toContain('Só indicadores oficiais do Base44 entram no plano.')
  })

  test('ciclos novos só herdam indicadores publicados e ativos', () => {
    expect(sql).toContain('seed_ciclo_plano_estrategico_indicadores')
    expect(sql).toContain('AND public.eh_indicador_oficial_base44(metric_key)')
    expect(sql).toContain('AND COALESCE(catalog.active, true)')
    expect(sql).toContain("ciclo.status IN ('rascunho', 'em_validacao')")
  })
})
