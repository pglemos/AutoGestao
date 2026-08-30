import { describe, expect, it } from 'bun:test'
import { diagnoseEmptyImport } from './importDiagnosis'
import { MONTH_LABELS } from './indicatorFormulas'

const FULL_HEADERS = ['Código', 'Indicador', 'Departamento', 'Tipo', ...MONTH_LABELS]
const INDICATORS = [
  { code: 'sales_goal', calculado: false },
  { code: 'sales_total', calculado: false },
  { code: 'goal_achievement_rate', calculado: true },
]

const run = (over: Partial<Parameters<typeof diagnoseEmptyImport>[0]>) =>
  diagnoseEmptyImport({ headers: FULL_HEADERS, matrix: [], codesInFile: [], indicators: INDICATORS, ...over })

describe('diagnoseEmptyImport', () => {
  it('avisa quando a planilha não tem cabeçalho', () => {
    expect(run({ headers: [] })).toContain('planilha está vazia')
  })

  it('aceita a coluna Código do Indicador do modelo consolidado', () => {
    const message = run({ headers: ['Código do Indicador', 'Indicador', ...MONTH_LABELS], matrix: [{}], codesInFile: ['sales_goal'] })
    expect(message).toContain('todos os meses estão em branco')
  })

  it('nomeia a coluna Código quando ela some, e lista o que veio no lugar', () => {
    const message = run({ headers: ['Nome', 'Indicador', ...MONTH_LABELS] })
    expect(message).toContain('“Código”')
    expect(message).toContain('Nome')
    expect(message).toContain('Exportar planilha')
  })

  /** O caso real: meses por extenso em vez de abreviados. */
  it('explica quando nenhum mês bate, mostrando o formato esperado', () => {
    const message = run({ headers: ['Código', 'Indicador', 'Janeiro', 'Fevereiro', 'Março'] })
    expect(message).toContain('Nenhuma coluna de mês')
    expect(message).toContain('Jan, Fev, Mar')
    expect(message).toContain('abreviados')
  })

  it('lista exatamente os meses faltantes quando só alguns somem', () => {
    const message = run({ headers: FULL_HEADERS.filter(header => header !== 'Mar' && header !== 'Set') })
    expect(message).toContain('Mar, Set')
    expect(message).not.toContain('Jan')
  })

  it('distingue cabeçalho válido sem nenhuma linha', () => {
    expect(run({ matrix: [] })).toContain('nenhuma linha de indicador')
  })

  it('avisa quando a coluna Código existe mas está vazia', () => {
    expect(run({ matrix: [{ Indicador: 'x' }], codesInFile: [] })).toContain('vazia em todas as linhas')
  })

  it('avisa quando os códigos não pertencem ao catálogo, citando os lidos', () => {
    const message = run({ matrix: [{}], codesInFile: ['FANTASMA_1', 'FANTASMA_2'] })
    expect(message).toContain('Nenhum código da planilha corresponde')
    expect(message).toContain('FANTASMA_1')
    expect(message).toContain('mesmo cliente')
  })

  it('avisa quando só há indicadores calculados', () => {
    const message = run({ matrix: [{}], codesInFile: ['goal_achievement_rate'] })
    expect(message).toContain('calculados')
    expect(message).toContain('Digitável')
  })

  it('reconhece a planilha oficial de 46 quando a grade só tem digitáveis', () => {
    const message = run({
      indicators: [{ code: 'sales_goal', calculado: false }],
      matrix: [{}],
      codesInFile: ['SALES_TOTAL'],
    })
    expect(message).toContain('calculados')
    expect(message).not.toContain('Nenhum código da planilha corresponde')
  })

  it('cai no caso benigno quando tudo bate mas os meses estão em branco', () => {
    const message = run({ matrix: [{}], codesInFile: ['sales_goal'] })
    expect(message).toContain('todos os meses estão em branco')
  })

  it('trunca a lista de códigos para não estourar a mensagem', () => {
    const many = Array.from({ length: 20 }, (_, index) => `COD_${index}`)
    const message = run({ matrix: [{}], codesInFile: many })
    expect(message).toContain('e mais 14')
    expect(message).not.toContain('COD_19')
  })
})
