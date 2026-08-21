import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const sql = readFileSync(
  new URL('../../supabase/migrations/20260820231000_strategic_plan_values_by_cycle.sql', import.meta.url),
  'utf8',
)

describe('metas estratégicas versionadas pelo ciclo', () => {
  test('valores e histórico passam a apontar para o ciclo', () => {
    expect(sql).toContain('ALTER TABLE public.valores_indicadores_planejamento')
    expect(sql).toContain('ALTER TABLE public.historico_valores_indicadores_planejamento')
    expect(sql).toContain('REFERENCES public.ciclos_plano_estrategico(id) ON DELETE CASCADE')
  })

  test('edição resolve e trava o ciclo vigente', () => {
    expect(sql).toContain("status <> 'revisado'")
    expect(sql).toContain('FOR UPDATE')
    expect(sql).toContain("IF v_cycle.status = 'publicado' THEN")
    expect(sql).toContain('Plano publicado é imutável')
  })

  test('upsert é isolado por ciclo, loja, indicador, ano e mês', () => {
    expect(sql).toContain('ON CONFLICT (ciclo_id, loja_id, indicator_code, year, (COALESCE(month, 0)))')
    expect(sql).toContain('WHERE ciclo_id IS NOT NULL')
  })

  test('revisão copia o snapshot dentro da transação que cria o ciclo', () => {
    expect(sql).toContain('copiar_valores_revisao_plano_estrategico')
    expect(sql).toContain("'strategic_plan_revision_copy'")
    expect(sql).toContain('WHERE ciclo_id = NEW.revised_from_id')
  })

  test('leitura operacional expõe apenas o ciclo vigente', () => {
    expect(sql).toContain('CREATE OR REPLACE VIEW public.valores_indicadores_planejamento_vigentes')
    expect(sql).toContain('vip.ciclo_id = c.id')
    expect(sql).toContain('(c.id IS NULL AND vip.ciclo_id IS NULL)')
    expect(sql).toContain('WITH (security_invoker = true)')
  })
})
