import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const sql = readFileSync(
  new URL('../../supabase/migrations/20260820232000_strategic_plan_publish_readiness.sql', import.meta.url),
  'utf8',
)

describe('prontidão autoritativa do plano estratégico', () => {
  test('persiste política no catálogo e congela no item do pacote', () => {
    expect(sql).toContain('unit_entry_mode_snapshot')
    expect(sql).toContain('unit_rollup_method_snapshot')
    expect(sql).toContain('weight_indicator_code_snapshot')
    expect(sql).toContain('FROM public.catalogo_metricas_consultoria cm')
    expect(sql).toContain("nullif(trim(cm.formula_expression), '')")
    expect(sql).toContain("ELSE 'calculado'")
  })

  test('valida o pacote congelado e não qualquer catálogo publicado', () => {
    expect(sql).toContain('v_cycle.package_version_id')
    expect(sql).toContain("status = 'publicada'")
    expect(sql).toContain("'PACOTE_INVALIDO'")
  })

  test('cobra metas conforme empresa, unidade obrigatória ou unidade opcional', () => {
    expect(sql).toContain("('COMPANY_ONLY', 'SHARED_COMPANY_VALUE')")
    expect(sql).toContain("= 'PER_UNIT_OPTIONAL'")
    expect(sql).toContain('l.active = true')
    expect(sql).toContain("'UNIDADES_AUSENTES'")
    expect(sql).toContain('vip.ciclo_id = v_cycle.id')
  })

  test('banco recusa publicação incompleta mesmo que o navegador tente contornar', () => {
    expect(sql).toContain('BEFORE UPDATE OF status')
    expect(sql).toContain("NEW.status = 'publicado'")
    expect(sql).toContain('Plano estratégico incompleto')
  })

  test('validação é interna e não fica exposta a anon ou public', () => {
    expect(sql).toContain('eh_area_interna_mx(auth.uid())')
    expect(sql).toContain('FROM PUBLIC, anon')
    expect(sql).toContain('TO authenticated')
    expect(sql).toContain('FROM PUBLIC, anon, authenticated')
  })
})
