import { describe, expect, test } from 'bun:test'
import { officialActionPlanIndicatorCatalog } from './actionPlanTemplates'
import { filterIndicatorPickerOptions, formatIndicatorPickerMeta } from './IndicatorPicker'

describe('picker de indicador do plano de ação', () => {
  test('mostra unidade e direção oficiais do Base44', () => {
    const comercial = officialActionPlanIndicatorCatalog().filter(row => row.category === 'comercial')
    expect(formatIndicatorPickerMeta(comercial[0]!)).toBe('Percentual · AUMENTAR')
    expect(formatIndicatorPickerMeta(comercial.find(row => row.code === 'APPOINTMENTS_PER_INTERNET_SALE')!)).toBe('Número decimal · DIMINUIR')
    expect(comercial.map(row => row.label)).not.toContain('Meta de vendas')
  })

  test('filtra pelo nome oficial', () => {
    const options = officialActionPlanIndicatorCatalog().filter(row => row.category === 'comercial')
    expect(filterIndicatorPickerOptions(options, 'fluxo de porta').map(row => row.code)).toEqual(['SALES_WALKIN'])
  })
})
