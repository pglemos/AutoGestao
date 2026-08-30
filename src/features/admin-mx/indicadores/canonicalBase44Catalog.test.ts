import { describe, expect, test } from 'bun:test'
import {
  BASE44_STANDARD_INDICATORS,
  BASE44_STANDARD_PARAMETERS,
  filterOfficialRows,
  isOfficialBase44Key,
  matchCanonicalIndicator,
  matchOfficialParameter,
  officialCatalogCode,
  officialDefinitionDirection,
  officialDefinitionUnit,
  officialDemoManualValue,
  officialParameterDefaults,
  officialUnitLabel,
  overlayCanonicalCatalog,
  rewriteCanonicalFormula,
  sortCatalogAreas,
} from './canonicalBase44Catalog'

describe('catálogo canônico Base44', () => {
  test('tem 46 indicadores oficiais com 19 digitáveis e 27 calculáveis', () => {
    expect(BASE44_STANDARD_INDICATORS).toHaveLength(46)
    expect(BASE44_STANDARD_INDICATORS.filter(item => item.target_calculation_mode === 'MANUAL')).toHaveLength(19)
    expect(BASE44_STANDARD_INDICATORS.filter(item => item.target_calculation_mode !== 'MANUAL')).toHaveLength(27)
    expect(officialUnitLabel('SALES_WALKIN')).toBe('veículos')
    expect(officialUnitLabel('TRADE_SALES_PERCENTAGE')).toBe('%')
    expect(officialUnitLabel('INTERNET_INVESTMENT')).toBe('R$')
    expect(officialDefinitionUnit('SALES_WALKIN')).toBe('Número inteiro')
    expect(officialDefinitionUnit('TRADE_SALES_PERCENTAGE')).toBe('Percentual')
    expect(officialDefinitionUnit('INTERNET_INVESTMENT')).toBe('Moeda')
    expect(officialDefinitionDirection('SALES_TOTAL')).toBe('AUMENTAR')
    expect(officialDefinitionDirection('APPOINTMENTS_PER_INTERNET_SALE')).toBe('DIMINUIR')
    expect(matchCanonicalIndicator('VOLUME_DE_LEADS_POR_VENDA')).toMatchObject({
      name: 'Volume de Leads por Venda',
      department: 'MARKETING',
      target_calculation_mode: 'MANUAL',
      display_order: 26,
    })
    expect(officialDefinitionUnit('VOLUME_DE_LEADS_POR_VENDA')).toBe('Número decimal')
    expect(officialDefinitionUnit('volume_de_leads_por_venda')).toBe('Número decimal')
    expect(officialUnitLabel('VOLUME_DE_LEADS_POR_VENDA')).toBe('leads/venda')
  })

  test('reconhece chaves MX e códigos oficiais', () => {
    expect(matchCanonicalIndicator('sales_door_flow')?.code).toBe('SALES_WALKIN')
    expect(officialCatalogCode('sales_total')).toBe('SALES_TOTAL')
    expect(isOfficialBase44Key('sales_door_flow')).toBe(true)
    expect(isOfficialBase44Key('sales_goal')).toBe(false)
    expect(isOfficialBase44Key('internet_sales_share')).toBe(false)
    expect(isOfficialBase44Key('crm_followup_rate')).toBe(false)
  })

  test('remove extras MX e deduplica aliases oficiais', () => {
    const rows = filterOfficialRows([
      { metric_key: 'sales_door_flow' },
      { metric_key: 'sales_walkin' },
      { metric_key: 'sales_goal' },
      { metric_key: 'goal_achievement_rate' },
      { metric_key: 'contribution_margin' },
    ])
    expect(rows.map(row => row.metric_key)).toEqual(['sales_door_flow', 'contribution_margin'])
  })

  test('regrava fórmulas para as chaves reais do catálogo', () => {
    const rewritten = rewriteCanonicalFormula(
      'IND("SALES_WALKIN") + IND("SALES_REFERRAL")',
      code => code === 'SALES_WALKIN' ? 'sales_door_flow' : code.toLowerCase(),
    )
    expect(rewritten).toBe('IND("sales_door_flow") + IND("sales_referral")')
  })

  test('reconstrói os 46 oficiais e arquiva extras MX', () => {
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
    expect(live).toHaveLength(46)
    expect(live.filter(row => row.area === 'Comercial')).toHaveLength(22)
    expect(live.filter(row => row.target_calculation_mode === 'MANUAL')).toHaveLength(19)
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

  test('demo oficial reproduz o seed do Base44', () => {
    expect(officialDemoManualValue('sales_door_flow')).toBe(15)
    expect(officialDemoManualValue('SALES_REFERRAL')).toBe(5)
    expect(officialDemoManualValue('SALES_INTERNET')).toBe(20)
    expect(
      officialDemoManualValue('sales_door_flow')!
      + officialDemoManualValue('sales_referral')!
      + officialDemoManualValue('sales_company_wallet')!
      + officialDemoManualValue('sales_seller_wallet')!
      + officialDemoManualValue('sales_internet')!
      + officialDemoManualValue('sales_other')!,
    ).toBe(55)
  })

  test('parâmetros oficiais usam os defaults do Base44', () => {
    expect(BASE44_STANDARD_PARAMETERS).toHaveLength(13)
    expect(matchOfficialParameter('trade_sales_rate')?.code).toBe('TRADE_SALES_RATE')
    expect(officialParameterDefaults(1).LEADS_PER_INTERNET_SALE).toBe(40)
    expect(officialParameterDefaults(1).STOCK_TO_SALES_RATIO).toBe(1.7)
    expect(officialParameterDefaults(2).STOCK_TO_SALES_RATIO).toBe(1.65)
    expect(officialParameterDefaults(1).trade_sales_rate).toBe(0.5)
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
