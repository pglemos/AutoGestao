import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const sql = readFileSync(
  new URL(
    '../../supabase/migrations/20260821121000_restaurar_indicador_planejamento_por_campo.sql',
    import.meta.url,
  ),
  'utf8',
)

describe('restaurar versão do histórico respeita o campo original', () => {
  test('redefine restaurar_metas_indicador_planejamento', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.restaurar_metas_indicador_planejamento')
  })

  test('snapshot de realizado restaura via salvar_realizado_indicador_planejamento', () => {
    expect(sql).toContain("IF v_history.field = 'realizado' THEN")
    expect(sql).toContain('RETURN public.salvar_realizado_indicador_planejamento(')
  })

  test('snapshot de meta continua restaurando via salvar_metas_indicador_planejamento', () => {
    expect(sql).toContain('RETURN public.salvar_metas_indicador_planejamento(')
  })

  test('mantém a checagem de permissão antes de restaurar', () => {
    expect(sql).toContain('pode_gerir_metas_planejamento(v_history.loja_id)')
  })
})
