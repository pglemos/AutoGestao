import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'bun:test'

const sql = readFileSync('supabase/migrations/20260727182000_internal_mx_network_cockpit.sql', 'utf8')

describe('migration do cockpit interno MX', () => {
  test('consolida fontes canônicas sem criar score paralelo', () => {
    expect(sql).toContain('get_internal_mx_network_cockpit')
    for (const source of [
      'get_resumo_rede_periodo',
      'vendedor_performance_oficial',
      'seller_routine_snapshots',
      'manager_routine_snapshots',
      'planos_acao',
      'valores_indicadores_planejamento',
      'visitas_consultoria',
      'consultoria_itens_entrega',
      'evidencias_visita',
      'consultoria_participantes_encontro',
    ]) expect(sql).toContain(source)
    expect(sql).not.toContain('CREATE TABLE public.owner_score')
    expect(sql).not.toContain('score_global_dono')
  })

  test('restringe o snapshot à área interna MX', () => {
    expect(sql).toContain('public.eh_area_interna_mx(auth.uid())')
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.get_internal_mx_network_cockpit')
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.get_internal_mx_network_cockpit')
  })
})
