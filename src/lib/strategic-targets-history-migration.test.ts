import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'bun:test'

const sql = readFileSync('supabase/migrations/20260727150000_strategic_targets_history.sql', 'utf8')

describe('migration de metas estratégicas', () => {
  test('persiste 45 indicadores pelo código canônico e mantém histórico restaurável', () => {
    expect(sql).toContain('historico_valores_indicadores_planejamento')
    expect(sql).toContain('salvar_metas_indicador_planejamento')
    expect(sql).toContain('restaurar_metas_indicador_planejamento')
    expect(sql).toContain("p_indicator_code = 'sales_volume'")
    expect(sql).not.toContain("p_indicator_code = 'SP-001'")
  })

  test('cria ação estratégica idempotente na coleção canônica', () => {
    expect(sql).toContain('criar_plano_acao_planejamento_unico')
    expect(sql).toContain('public.criar_plano_acao_v2')
    expect(sql).toContain('uq_planos_acao_strategic_indicator_active')
    expect(sql).not.toContain('CREATE TABLE IF NOT EXISTS public.strategic_actions')
  })
})
