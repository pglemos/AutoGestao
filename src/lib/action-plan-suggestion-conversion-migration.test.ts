import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const sql = readFileSync(
  resolve(import.meta.dir, '../../supabase/migrations/20260820203000_convert_action_plan_suggestion_atomic.sql'),
  'utf8',
)

describe('conversão atômica de sugestão em plano de ação', () => {
  test('trava a sugestão e retorna o plano existente no retry', () => {
    expect(sql).toContain('FOR UPDATE')
    expect(sql).toContain('COALESCE(v_suggestion.source_plano_id, v_suggestion.converted_plano_id)')
    expect(sql).toContain('IF v_plan_id IS NOT NULL THEN')
    expect(sql).toContain('RETURN v_plan_id;')
  })

  test('cria o plano e vincula a sugestão na mesma transação', () => {
    expect(sql).toContain('BEGIN;')
    expect(sql).toContain('INSERT INTO public.planos_acao')
    expect(sql).toContain('UPDATE public.consultor_solucoes')
    expect(sql).toContain("status = 'convertida'")
    expect(sql).toContain('COMMIT;')
  })

  test('só converte sugestões validadas ou exibidas ao Dono', () => {
    expect(sql).toContain("IF v_suggestion.status NOT IN ('validada', 'exibida_dono') THEN")
    expect(sql).toContain("SUGGESTION_NOT_CONVERTIBLE")
  })

  test('restringe a função à área interna e não permite spoof do autor', () => {
    expect(sql).toContain('NOT public.eh_area_interna_mx()')
    expect(sql).toContain('created_by,')
    expect(sql).toContain('auth.uid(),')
    expect(sql).toContain('REVOKE ALL ON FUNCTION')
    expect(sql).toContain('TO authenticated')
  })

  test('documenta reversão sem apagar dados na migração de subida', () => {
    expect(sql).toContain('-- DOWN')
    expect(sql).not.toMatch(/^\s*DELETE\s+FROM/im)
    expect(sql).not.toMatch(/^\s*TRUNCATE/im)
  })
})
