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

  test('sobrepõe área, nome e modo de cálculo no catálogo MX', () => {
    const [row] = overlayCanonicalCatalog([{
      metric_key: 'sales_door_flow',
      label: 'Vendas porta',
      area: 'Vendas',
      formula_expression: null,
      target_calculation_mode: 'MANUAL',
      sort_order: 80,
    }])
    expect(row).toMatchObject({
      label: 'Vendas - Fluxo de Porta',
      area: 'Comercial',
      target_calculation_mode: 'MANUAL',
    })
    expect(officialCatalogCode(row.metric_key)).toBe('SALES_WALKIN')
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
