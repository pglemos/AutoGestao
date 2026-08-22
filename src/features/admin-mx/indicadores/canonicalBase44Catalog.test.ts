import { describe, expect, test } from 'bun:test'
import {
  BASE44_STANDARD_INDICATORS,
  matchCanonicalIndicator,
  officialCatalogCode,
  overlayCanonicalCatalog,
  rewriteCanonicalFormula,
  sortCatalogAreas,
} from './canonicalBase44Catalog'

describe('catálogo canônico Base44', () => {
  test('tem 45 indicadores oficiais com 27 calculáveis', () => {
    expect(BASE44_STANDARD_INDICATORS).toHaveLength(45)
    expect(BASE44_STANDARD_INDICATORS.filter(item => item.target_calculation_mode !== 'MANUAL')).toHaveLength(27)
  })

  test('reconhece chaves MX e códigos oficiais', () => {
    expect(matchCanonicalIndicator('sales_door_flow')?.code).toBe('SALES_WALKIN')
    expect(officialCatalogCode('sales_total')).toBe('SALES_TOTAL')
  })

  test('regrava fórmulas para as chaves reais do catálogo', () => {
    const rewritten = rewriteCanonicalFormula(
      'IND("SALES_WALKIN") + IND("SALES_REFERRAL")',
      code => code === 'SALES_WALKIN' ? 'sales_door_flow' : code.toLowerCase(),
    )
    expect(rewritten).toBe('IND("sales_door_flow") + IND("sales_referral")')
  })

  test('reconstrói os 45 oficiais e arquiva extras MX', () => {
    const rows = overlayCanonicalCatalog([
      {
        metric_key: 'sales_door_flow',
        label: 'Vendas porta',
        area: 'Vendas',
        formula_expression: null,
        target_calculation_mode: 'MANUAL',
        sort_order: 80,
        status: 'publicado',
        active: true,
      },
      {
        metric_key: 'avg_sales_per_seller',
        label: 'Media de vendas por vendedor',
        area: 'Equipe',
        formula_expression: null,
        target_calculation_mode: 'MANUAL',
        sort_order: 110,
        status: 'publicado',
        active: true,
      },
      {
        metric_key: 'appointments',
        label: 'Agendamentos',
        area: 'Funil',
        formula_expression: null,
        target_calculation_mode: 'MANUAL',
        sort_order: 150,
        status: 'publicado',
        active: true,
      },
      {
        metric_key: 'google_rating',
        label: 'Avaliacao Google Meu Negocio',
        area: 'Marketing',
        formula_expression: null,
        target_calculation_mode: 'MANUAL',
        sort_order: 270,
        status: 'publicado',
        active: true,
      },
      {
        metric_key: 'internet_sales_share',
        label: '% Vendas Internet',
        area: 'Marketing',
        formula_expression: null,
        target_calculation_mode: 'MANUAL',
        sort_order: 185,
        status: 'publicado',
        active: true,
      },
    ])
    const live = rows.filter(row => row.status !== 'arquivado')
    const archived = rows.filter(row => row.status === 'arquivado')
    expect(live).toHaveLength(45)
    expect(live.filter(row => row.area === 'Comercial')).toHaveLength(22)
    expect(live.filter(row => row.target_calculation_mode === 'MANUAL')).toHaveLength(18)
    expect(live.filter(row => row.target_calculation_mode !== 'MANUAL')).toHaveLength(27)
    expect(sortCatalogAreas([...new Set(live.map(row => row.area))])).toEqual([
      'Comercial',
      'Marketing',
      'Produto e Estoque',
      'Financeiro',
      'Operações',
      'Pessoas - RH',
    ])
    expect(rows.find(row => row.metric_key === 'sales_door_flow')).toMatchObject({
      label: 'Vendas - Fluxo de Porta',
      area: 'Comercial',
    })
    expect(officialCatalogCode('avg_sales_per_seller')).toBe('SALES_PER_SELLER')
    expect(officialCatalogCode('appointments')).toBe('APPOINTMENTS_VOLUME')
    expect(officialCatalogCode('google_rating')).toBe('GOOGLE_BUSINESS_RATING')
    expect(archived.map(row => row.metric_key)).toEqual(['internet_sales_share'])
  })

  test('ordena departamentos na sequência oficial', () => {
    expect(sortCatalogAreas(['Financeiro', 'Vendas', 'Comercial', 'Marketing'])).toEqual([
      'Comercial',
      'Marketing',
      'Financeiro',
      'Vendas',
    ])
  })
})
