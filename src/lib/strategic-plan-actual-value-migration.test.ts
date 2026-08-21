import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const sql = readFileSync(
  new URL(
    '../../supabase/migrations/20260821120000_salvar_realizado_indicador_planejamento.sql',
    import.meta.url,
  ),
  'utf8',
)

describe('registrar realizado do plano estratégico', () => {
  test('histórico passa a distinguir meta de realizado', () => {
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS field text NOT NULL DEFAULT \'meta\'')
    expect(sql).toContain("CHECK (field IN ('meta', 'realizado'))")
  })

  test('RPC nova grava realizado, não meta', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.salvar_realizado_indicador_planejamento')
    expect(sql).toContain("'realizado', v_previous, p_values")
    expect(sql).toContain('realizado = EXCLUDED.realizado')
  })

  test('exige permissão, indicador ativo e 12 valores numéricos ou nulos', () => {
    expect(sql).toContain('pode_gerir_metas_planejamento')
    expect(sql).toContain('Sem permissão para editar o realizado estratégico.')
    expect(sql).toContain("WHERE code = p_indicator_code AND active = true")
    expect(sql).toContain('jsonb_array_length(p_values) <> 12')
  })

  test('origem do dado é validada contra o mesmo domínio da coluna source', () => {
    expect(sql).toContain(
      "p_source NOT IN ('manual', 'importacao', 'dre', 'funil', 'score', 'sistema')",
    )
  })

  test('não bloqueia ciclo publicado — resultado é lançado contra a meta já fechada', () => {
    expect(sql).not.toContain("IF v_cycle.status = 'publicado' THEN\n    RAISE EXCEPTION 'Plano publicado")
    expect(sql).toContain("WHERE client_id = v_client_id AND year = p_year AND status <> 'revisado'")
  })

  test('upsert isolado por ciclo, loja, indicador, ano e mês, sem tocar a meta existente', () => {
    expect(sql).toContain('ON CONFLICT (ciclo_id, loja_id, indicator_code, year, (COALESCE(month, 0)))')
    const upsertClause = sql.slice(
      sql.indexOf('DO UPDATE SET\n      realizado = EXCLUDED.realizado'),
    )
    expect(upsertClause).not.toContain('meta = EXCLUDED.meta')
  })

  test('grants restritos a authenticated', () => {
    expect(sql).toContain(
      'REVOKE ALL ON FUNCTION public.salvar_realizado_indicador_planejamento(uuid, text, integer, jsonb, text, text) FROM PUBLIC, anon;',
    )
    expect(sql).toContain(
      'GRANT EXECUTE ON FUNCTION public.salvar_realizado_indicador_planejamento(uuid, text, integer, jsonb, text, text) TO authenticated;',
    )
  })
})
