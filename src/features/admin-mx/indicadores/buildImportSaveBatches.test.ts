import { describe, expect, it } from 'bun:test'
import { buildImportSaveBatches } from './metasRealizados'

describe('buildImportSaveBatches', () => {
  it('junta duas células do mesmo indicador em uma única chamada', () => {
    const batches = buildImportSaveBatches({
      changes: [
        { indicatorCode: 'sales_goal', month: 1, newValue: 185400.75 },
        { indicatorCode: 'sales_goal', month: 2, newValue: 78910.5 },
      ],
      currentValues: [],
    })

    expect(batches).toHaveLength(1)
    expect(batches[0]?.indicatorCode).toBe('sales_goal')
    expect(batches[0]?.values[0]).toBe(185400.75)
    expect(batches[0]?.values[1]).toBe(78910.5)
  })

  /**
   * O defeito que motivou este helper: uma chamada por célula enviava os
   * outros onze meses nulos, apagando o que já estava gravado.
   */
  it('preserva os meses que não vieram na planilha', () => {
    const batches = buildImportSaveBatches({
      changes: [{ indicatorCode: 'sales_goal', month: 3, newValue: 500 }],
      currentValues: [
        { indicator_code: 'sales_goal', month: 1, value: 100 },
        { indicator_code: 'sales_goal', month: 2, value: 200 },
        { indicator_code: 'sales_goal', month: 12, value: 999 },
      ],
    })

    expect(batches[0]?.values).toEqual([100, 200, 500, null, null, null, null, null, null, null, null, 999])
  })

  it('não deixa um indicador sobrescrever o outro', () => {
    const batches = buildImportSaveBatches({
      changes: [
        { indicatorCode: 'sales_goal', month: 1, newValue: 10 },
        { indicatorCode: 'sales_total', month: 1, newValue: 20 },
      ],
      currentValues: [{ indicator_code: 'sales_total', month: 6, value: 77 }],
    })

    expect(batches).toHaveLength(2)
    expect(batches.find(b => b.indicatorCode === 'sales_goal')?.values[0]).toBe(10)
    const total = batches.find(b => b.indicatorCode === 'sales_total')
    expect(total?.values[0]).toBe(20)
    expect(total?.values[5]).toBe(77)
  })

  it('mantém 12 posições sempre', () => {
    const batches = buildImportSaveBatches({
      changes: [{ indicatorCode: 'x', month: 7, newValue: 1 }],
      currentValues: [],
    })
    expect(batches[0]?.values).toHaveLength(12)
  })

  it('permite limpar uma célula sem apagar as demais', () => {
    const batches = buildImportSaveBatches({
      changes: [{ indicatorCode: 'sales_goal', month: 2, newValue: null }],
      currentValues: [
        { indicator_code: 'sales_goal', month: 1, value: 100 },
        { indicator_code: 'sales_goal', month: 2, value: 200 },
      ],
    })
    expect(batches[0]?.values[0]).toBe(100)
    expect(batches[0]?.values[1]).toBeNull()
  })

  it('ignora meses fora do intervalo', () => {
    const batches = buildImportSaveBatches({
      changes: [
        { indicatorCode: 'x', month: 0, newValue: 1 },
        { indicatorCode: 'x', month: 13, newValue: 1 },
        { indicatorCode: 'x', month: 5, newValue: 42 },
      ],
      currentValues: [],
    })
    expect(batches).toHaveLength(1)
    expect(batches[0]?.values[4]).toBe(42)
  })

  it('devolve lista vazia quando não há alterações', () => {
    expect(buildImportSaveBatches({ changes: [], currentValues: [] })).toEqual([])
  })

  it('não mistura valores de outro indicador ao montar a base', () => {
    const batches = buildImportSaveBatches({
      changes: [{ indicatorCode: 'sales_goal', month: 1, newValue: 5 }],
      currentValues: [{ indicator_code: 'outro_indicador', month: 2, value: 999 }],
    })
    expect(batches[0]?.values[1]).toBeNull()
  })
})
