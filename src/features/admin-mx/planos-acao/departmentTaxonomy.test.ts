import { describe, expect, test } from 'bun:test'
import {
  departmentCategory,
  departmentLabel,
  departmentMatchesFilter,
  indicatorAreaMatchesDepartment,
} from './departmentTaxonomy'

describe('taxonomia de departamentos do plano de ação', () => {
  test('agrupa os códigos históricos nos cards MX', () => {
    expect(departmentCategory('COMERCIAL')).toBe('comercial')
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
    expect(indicatorAreaMatchesDepartment('Estoque', 'produto')).toBe(true)
    expect(indicatorAreaMatchesDepartment('Vendas', 'financeiro')).toBe(false)
  })
})
