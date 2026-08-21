import { describe, expect, test } from 'bun:test'
import {
  buildPackageItems,
  canLinkPackageVersion,
  competenceMetaCount,
  filterPackageIndicators,
  groupIndicatorsByArea,
  inclusionReasonLabel,
  isCalculatedIndicator,
  summarizePackageIndicators,
  toPackageIndicator,
  validatePackageDraft,
  type PackageIndicator,
} from './strategicPlan'

function indicator(overrides: Partial<PackageIndicator> = {}): PackageIndicator {
  return {
    metric_key: 'sales_total',
    label: 'Vendas total',
    area: 'Vendas',
    sort_order: 20,
    value_type: 'number',
    direction: 'increase',
    calculavel: true,
    inclusion_reason: 'selecao_direta',
    unit_entry_mode: 'PER_UNIT_REQUIRED',
    unit_rollup_method: 'SUM',
    weight_indicator_code: null,
    ...overrides,
  }
}

describe('plano estratégico — modo de entrada do indicador', () => {
  test('formula_key define calculável vs digitável', () => {
    expect(isCalculatedIndicator('sum_sales_channels')).toBe(true)
    expect(isCalculatedIndicator(null)).toBe(false)
    expect(isCalculatedIndicator('  ')).toBe(false)
  })

  test('toPackageIndicator deriva calculável do catálogo', () => {
    const row = { metric_key: 'sales_total', label: 'Vendas total', area: 'Vendas', sort_order: 20, value_type: 'number', direction: 'increase', formula_key: 'sum_sales_channels' }
    expect(toPackageIndicator(row)).toMatchObject({ calculavel: true, inclusion_reason: 'selecao_direta' })
    expect(toPackageIndicator({ ...row, formula_key: null })).toMatchObject({ calculavel: false })
  })
})

describe('plano estratégico — resumo do pacote', () => {
  test('conta digitáveis, calculáveis e departamentos', () => {
    const resumo = summarizePackageIndicators([
      indicator({ calculavel: false }),
      indicator({ calculavel: false }),
      indicator({ calculavel: true }),
      indicator({ metric_key: 'sales_door', area: 'Funil', calculavel: false }),
    ])
    expect(resumo).toEqual({ total: 4, manuais: 3, calculados: 1, departamentos: 2 })
  })

  test('competências meta = indicadores × 12 meses', () => {
    expect(competenceMetaCount(4)).toBe(48)
    expect(competenceMetaCount(0)).toBe(0)
  })
})

describe('plano estratégico — itens da versão', () => {
  test('buildPackageItems congela snapshot do catálogo', () => {
    const items = buildPackageItems([indicator()], 'ver-1')
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      version_id: 'ver-1',
      metric_key: 'sales_total',
      label_snapshot: 'Vendas total',
      input_mode_snapshot: 'calculado',
      unit_entry_mode_snapshot: 'PER_UNIT_REQUIRED',
      unit_rollup_method_snapshot: 'SUM',
      is_required: true,
    })
  })
})

describe('plano estratégico — validação e vínculo', () => {
  test('pacote precisa de nome e ao menos um indicador', () => {
    expect(validatePackageDraft({ nome: '', metricKeys: ['a'] })).toBe('Informe o nome do pacote.')
    expect(validatePackageDraft({ nome: 'Padrão', metricKeys: [] })).toBe('O pacote precisa de ao menos um indicador.')
    expect(validatePackageDraft({ nome: 'Padrão', metricKeys: ['a'] })).toBeNull()
  })

  test('só versão publicada vincula ao produto', () => {
    expect(canLinkPackageVersion({ status: 'publicada' })).toBe(true)
    expect(canLinkPackageVersion({ status: 'rascunho' })).toBe(false)
    expect(canLinkPackageVersion({ status: 'arquivada' })).toBe(false)
  })

  test('origem por dependência tem rótulo próprio', () => {
    expect(inclusionReasonLabel('dependencia_formula')).toBe('Por dependência')
    expect(inclusionReasonLabel('selecao_direta')).toBe('Direto')
  })
})

describe('plano estratégico — filtro e agrupamento', () => {
  test('filtra por busca (nome/código) e por área', () => {
    const items = [
      indicator({ metric_key: 'sales_total', label: 'Vendas total', area: 'Vendas' }),
      indicator({ metric_key: 'leads', label: 'Leads recebidos', area: 'Funil' }),
      indicator({ metric_key: 'sales_door', label: 'Vendas - fluxo de porta', area: 'Vendas' }),
    ]
    expect(filterPackageIndicators(items, 'vendas', 'todas')).toHaveLength(2)
    expect(filterPackageIndicators(items, '', 'Funil')).toHaveLength(1)
    expect(filterPackageIndicators(items, 'leads', 'todas')).toHaveLength(1)
    expect(filterPackageIndicators(items, 'xyz', 'todas')).toHaveLength(0)
  })

  test('agrupa por área mantendo ordem oficial', () => {
    const groups = groupIndicatorsByArea([
      indicator({ metric_key: 'b', area: 'Vendas', sort_order: 30 }),
      indicator({ metric_key: 'a', area: 'Vendas', sort_order: 10 }),
      indicator({ metric_key: 'c', area: 'Funil' }),
    ])
    expect(groups.map(g => g.area)).toEqual(['Funil', 'Vendas'])
    const vendas = groups.find(g => g.area === 'Vendas')!
    expect(vendas.items.map(i => i.metric_key)).toEqual(['a', 'b'])
  })
})
