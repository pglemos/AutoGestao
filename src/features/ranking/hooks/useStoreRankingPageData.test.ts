import { describe, expect, test } from 'bun:test'
import { calculateManagerScore, getPeriodoRange, lerFiltrosSalvos, RANKING_PREF_KEY } from './useStoreRankingPageData'

describe('calculateManagerScore', () => {
  test('replica os pesos do ranking gerencial Base44', () => {
    expect(calculateManagerScore({ attainment: 80, conversion: 20, routine: 100 })).toBe(70)
  })

  test('não inventa pontuação sem execução de rotina verificável', () => {
    expect(calculateManagerScore({ attainment: 100, conversion: 25, routine: null })).toBeNull()
  })
})

describe('getPeriodoRange', () => {
  test('usa o mês selecionado como âncora do trimestre', () => {
    expect(getPeriodoRange('Trimestral', '2026-05')).toEqual({
      startDate: '2026-04-01',
      endDate: '2026-06-30',
    })
  })

  test('preserva o semestre e o ano selecionados', () => {
    expect(getPeriodoRange('Semestral', '2025-11')).toEqual({
      startDate: '2025-07-01',
      endDate: '2025-12-31',
    })
    expect(getPeriodoRange('Anual', '2025-11')).toEqual({
      startDate: '2025-01-01',
      endDate: '2025-12-31',
    })
  })
})

describe('lerFiltrosSalvos', () => {
  const limpar = () => window.localStorage.removeItem(RANKING_PREF_KEY)

  test('devolve vazio quando não há nada salvo', () => {
    limpar()
    expect(lerFiltrosSalvos()).toEqual({ periodo: undefined, unidade: undefined })
  })

  test('recupera período e unidade salvos', () => {
    window.localStorage.setItem(RANKING_PREF_KEY, JSON.stringify({ periodo: 'Trimestral', unidade: 'Centro' }))
    expect(lerFiltrosSalvos()).toEqual({ periodo: 'Trimestral', unidade: 'Centro' })
    limpar()
  })

  test('descarta período fora da lista em vez de propagar lixo para o hook', () => {
    window.localStorage.setItem(RANKING_PREF_KEY, JSON.stringify({ periodo: 'Decenal', unidade: 'Centro' }))
    expect(lerFiltrosSalvos().periodo).toBeUndefined()
    limpar()
  })

  test('não quebra com JSON corrompido', () => {
    window.localStorage.setItem(RANKING_PREF_KEY, '{nao-e-json')
    expect(lerFiltrosSalvos()).toEqual({})
    limpar()
  })
})
