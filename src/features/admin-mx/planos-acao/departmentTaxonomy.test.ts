import { describe, expect, test } from 'bun:test'
import {
  departmentCategory,
  departmentLabel,
  departmentMatchesFilter,
  indicatorAreaMatchesDepartment,
  indicatorsForDepartment,
} from './departmentTaxonomy'

describe('taxonomia de departamentos do plano de ação', () => {
  test('agrupa os códigos históricos nos cards MX', () => {
    expect(departmentCategory('COMERCIAL')).toBe('comercial')
    expect(departmentCategory('commercial')).toBe('comercial')
    expect(departmentCategory('PRODUTO_ESTOQUE')).toBe('produto')
    expect(departmentCategory('PESSOAS_RH')).toBe('rh')
    expect(departmentCategory('OPERACOES')).toBe('operacional')
  })

  test('filtro canônico encontra departamentos persistidos em caixa alta', () => {
    expect(departmentMatchesFilter('COMERCIAL', 'comercial')).toBe(true)
    expect(departmentMatchesFilter('PRODUTO_ESTOQUE', 'produto')).toBe(true)
    expect(departmentMatchesFilter('PESSOAS_RH', 'financeiro')).toBe(false)
  })

  test('preserva labels do Base44 e traduz áreas legadas do catálogo', () => {
    expect(departmentLabel('PESSOAS_RH')).toBe('Pessoas - RH')
    expect(departmentCategory('Produto e Estoque')).toBe('produto')
    expect(indicatorAreaMatchesDepartment('Estoque', 'produto')).toBe(true)
    expect(indicatorAreaMatchesDepartment('Produto e Estoque', 'produto')).toBe(true)
    expect(indicatorAreaMatchesDepartment('Vendas', 'financeiro')).toBe(false)
  })

  test('não mistura o catálogo quando o departamento não tem indicadores', () => {
    const rows = [
      { area: 'Comercial', label: 'Vendas Total' },
      { area: 'Marketing', label: 'Leads' },
    ]
    expect(indicatorsForDepartment(rows, 'produto')).toEqual([])
    expect(indicatorsForDepartment(rows, 'comercial')).toEqual([rows[0]])
    expect(indicatorsForDepartment(rows, '')).toEqual([])
    expect(indicatorsForDepartment(rows, null)).toEqual([])
  })
})
