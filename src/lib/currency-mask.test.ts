import { describe, expect, test } from 'bun:test'
import { formatCurrencyInput, formatCurrencyValue, parseCurrencyInput } from './currency-mask'

describe('formatCurrencyInput — dígito digitado é real, não centavo', () => {
  test('69900 vira R$ 69.900', () => {
    expect(formatCurrencyInput('69900')).toBe('R$ 69.900')
  })

  test('digitação progressiva não empurra vírgula no meio do caminho', () => {
    expect(formatCurrencyInput('6')).toBe('R$ 6')
    expect(formatCurrencyInput('69')).toBe('R$ 69')
    expect(formatCurrencyInput('699')).toBe('R$ 699')
    expect(formatCurrencyInput('6990')).toBe('R$ 6.990')
    expect(formatCurrencyInput('69900')).toBe('R$ 69.900')
  })

  test('centavos entram pela vírgula', () => {
    expect(formatCurrencyInput('69900,')).toBe('R$ 69.900,')
    expect(formatCurrencyInput('69900,5')).toBe('R$ 69.900,5')
    expect(formatCurrencyInput('69900,50')).toBe('R$ 69.900,50')
  })

  test('mais de duas casas decimais são cortadas', () => {
    expect(formatCurrencyInput('100,999')).toBe('R$ 100,99')
  })

  test('reformatar o próprio resultado é estável', () => {
    const uma = formatCurrencyInput('69900')
    expect(formatCurrencyInput(uma)).toBe(uma)
    const comCentavos = formatCurrencyInput('69900,50')
    expect(formatCurrencyInput(comCentavos)).toBe(comCentavos)
  })

  test('continuar digitando sobre o valor formatado mantém a ordem', () => {
    // Usuário digitou 6990 (R$ 6.990) e acrescenta 0 no fim.
    expect(formatCurrencyInput('R$ 6.9900')).toBe('R$ 69.900')
  })

  test('campo vazio e lixo não viram zero fantasma', () => {
    expect(formatCurrencyInput('')).toBe('')
    expect(formatCurrencyInput('R$ ')).toBe('')
    expect(formatCurrencyInput('abc')).toBe('')
  })
})

describe('parseCurrencyInput', () => {
  test('lê o valor mascarado', () => {
    expect(parseCurrencyInput('R$ 69.900')).toBe(69900)
    expect(parseCurrencyInput('R$ 69.900,50')).toBe(69900.5)
    expect(parseCurrencyInput('R$ 69.900,00')).toBe(69900)
  })

  test('lê o formato salvo pelo banco', () => {
    expect(parseCurrencyInput('69900')).toBe(69900)
    expect(parseCurrencyInput('69900.5')).toBe(69900.5)
  })

  test('vazio é zero', () => {
    expect(parseCurrencyInput('')).toBe(0)
    expect(parseCurrencyInput('R$ ')).toBe(0)
  })

  test('ida e volta preserva o valor', () => {
    for (const valor of [0.5, 10, 699, 69900, 69900.5, 1234567.89]) {
      expect(parseCurrencyInput(formatCurrencyValue(valor))).toBeCloseTo(valor, 2)
    }
  })
})

describe('formatCurrencyValue', () => {
  test('exibe valor salvo em BRL', () => {
    expect(formatCurrencyValue(69900)).toBe('R$ 69.900,00')
    expect(formatCurrencyValue(69900.5)).toBe('R$ 69.900,50')
  })

  test('nulo vira string vazia, não R$ 0,00', () => {
    expect(formatCurrencyValue(null)).toBe('')
    expect(formatCurrencyValue(undefined)).toBe('')
  })
})
