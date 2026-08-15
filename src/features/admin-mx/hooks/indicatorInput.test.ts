import { describe, expect, test } from 'bun:test'
import { validateIndicatorInput, type IndicatorInput } from './useAdminMxLists'

function input(overrides: Partial<IndicatorInput> = {}): IndicatorInput {
  return { metric_key: 'ticket_medio', label: 'Ticket médio', area: 'Vendas', value_type: 'number', direction: 'increase', source_scope: 'manual', active: true, ...overrides }
}

describe('indicador do catálogo — validação espelha o banco', () => {
  test('aceita indicador completo', () => {
    expect(validateIndicatorInput(input())).toBeNull()
  })

  test('cobra chave, nome e área (colunas NOT NULL)', () => {
    expect(validateIndicatorInput(input({ metric_key: '' }))).toBe('Informe a chave da métrica.')
    expect(validateIndicatorInput(input({ label: ' ' }))).toBe('Informe o nome do indicador.')
    expect(validateIndicatorInput(input({ area: '' }))).toBe('Informe a área do indicador.')
  })

  test('recusa direção fora do CHECK (increase/decrease)', () => {
    expect(validateIndicatorInput(input({ direction: 'up' }))).toBe('Selecione a direção de leitura do indicador.')
    expect(validateIndicatorInput(input({ direction: '' }))).toBe('Selecione a direção de leitura do indicador.')
    expect(validateIndicatorInput(input({ direction: 'decrease' }))).toBeNull()
  })

  test('recusa tipo de valor fora do CHECK (number/percent/currency)', () => {
    expect(validateIndicatorInput(input({ value_type: 'ratio' }))).toBe('Selecione o tipo de valor do indicador.')
    expect(validateIndicatorInput(input({ value_type: 'currency' }))).toBeNull()
  })

  test('chave com maiúscula ou espaço é recusada', () => {
    expect(validateIndicatorInput(input({ metric_key: 'Ticket Medio' }))).toBe('A chave aceita apenas minúsculas, números e underline.')
  })
})
