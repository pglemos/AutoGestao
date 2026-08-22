import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const sql = readFileSync(
  new URL('../../supabase/migrations/20260822010000_strategic_plan_editor_roster.sql', import.meta.url),
  'utf8',
)

describe('roster e operações do editor administrativo do Plano Estratégico', () => {
  test('materializa o roster por ciclo com snapshot, ordem e visibilidade', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.ciclos_plano_estrategico_indicadores')
    expect(sql).toContain('UNIQUE (ciclo_id, metric_key)')
    expect(sql).toContain('label_snapshot')
    expect(sql).toContain('unit_rollup_method_snapshot')
    expect(sql).toContain('visible_to_owner boolean NOT NULL DEFAULT true')
    expect(sql).toContain('origin IN (\'pacote\', \'adicionado_mx\')')
  })

  test('ciclos novos e revisões herdam o roster e ciclos antigos são preenchidos', () => {
    expect(sql).toContain('seed_ciclo_plano_estrategico_indicadores')
    expect(sql).toContain('WHERE ciclo_id = NEW.revised_from_id')
    expect(sql).toContain('trg_seed_ciclo_plano_estrategico_indicadores')
    expect(sql).toContain('ON CONFLICT (ciclo_id, metric_key) DO NOTHING')
  })

  test('operações do roster exigem área interna e ficam restritas a authenticated', () => {
    expect(sql).toContain('eh_area_interna_mx(auth.uid())')
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.adicionar_indicador_ciclo_plano(uuid, text) TO authenticated')
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.atualizar_visibilidade_indicador_ciclo(uuid, text, boolean) TO authenticated')
    expect(sql).toContain('O roster de um ciclo publicado é imutável. Crie uma revisão para alterar a visibilidade.')
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.adicionar_indicador_ciclo_plano(uuid, text) FROM PUBLIC, anon')
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.validar_ciclo_plano_estrategico(uuid) FROM PUBLIC, anon')
  })

  test('validação usa o roster efetivo e cobre todas as unidades ativas', () => {
    expect(sql).toContain('FROM public.ciclos_plano_estrategico_indicadores WHERE ciclo_id = p_cycle_id AND enabled = true')
    expect(sql).toContain('FROM public.lojas WHERE active = true AND (id = v_primary_store_id OR parent_loja_id = v_primary_store_id)')
    expect(sql).toContain("v_entry_mode IN ('COMPANY_ONLY', 'SHARED_COMPANY_VALUE')")
    expect(sql).toContain("v_entry_mode = 'PER_UNIT_OPTIONAL'")
    expect(sql).toContain("v_cycle.status = 'publicado'")
    expect(sql).toContain('Plano publicado é imutável. Crie uma revisão para alterar o ano anterior.')
  })

  test('ano anterior e restauração preservam o campo e o histórico', () => {
    expect(sql).toContain("field IN ('meta', 'realizado', 'ano_anterior')")
    expect(sql).toContain("'ano_anterior', v_previous, p_values")
    expect(sql).toContain("ELSIF v_history.field = 'ano_anterior' THEN")
    expect(sql).toContain('salvar_ano_anterior_indicador_planejamento')
  })
})
