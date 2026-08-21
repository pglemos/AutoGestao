import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const sql = readFileSync('supabase/migrations/20260820233000_action_plan_template_lifecycle_atomic.sql', 'utf8')

describe('migration ciclo de vida transacional dos templates', () => {
  test('garante um rascunho por template e reconcilia duplicados sem delete', () => {
    expect(sql).toContain('uniq_pa_template_versao_rascunho')
    expect(sql).toContain("WHERE status = 'rascunho'")
    expect(sql).toContain('[AUTO_RECONCILED]')
    expect(sql).not.toMatch(/DELETE FROM public\.planos_acao_template_versoes/i)
  })

  test('abre revisão sob lock e copia itens na mesma transação', () => {
    expect(sql).toContain('open_action_plan_template_revision')
    expect(sql).toContain('FOR UPDATE')
    expect(sql).toContain('INSERT INTO public.planos_acao_template_itens')
    expect(sql).toContain('public.eh_area_interna_mx(v_actor)')
  })

  test('arquiva versões e template numa única função protegida', () => {
    expect(sql).toContain('archive_action_plan_template')
    expect(sql).toContain("status IN ('rascunho', 'publicada')")
    expect(sql).toContain('SET active = false')
    expect(sql).toContain('REVOKE ALL ON FUNCTION')
  })
})
