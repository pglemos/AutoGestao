import { describe, expect, test } from 'bun:test'
import {
  applyCarteiraParams,
  CARTEIRA_FILTER_PARAM,
  CARTEIRA_SEARCH_PARAM,
  parseCarteiraFilter,
  parseCarteiraSearch,
  readCarteiraParams,
} from './carteiraUrlState'

describe('estado da carteira na URL', () => {
  test('valor desconhecido na URL cai no padrão em vez de quebrar o filtro', () => {
    expect(parseCarteiraFilter('com_bloqueios')).toBe('com_bloqueios')
    expect(parseCarteiraFilter('__injetado__')).toBe('todos')
    expect(parseCarteiraFilter(null)).toBe('todos')
  })

  test('busca longa é truncada', () => {
    expect(parseCarteiraSearch('a'.repeat(500))).toHaveLength(120)
    expect(parseCarteiraSearch(null)).toBe('')
  })

  test('valores padrão não sujam a URL', () => {
    const params = applyCarteiraParams(new URLSearchParams(), { search: '  ', filter: 'todos' })
    expect(params.toString()).toBe('')
  })

  test('valores aplicados sobrevivem à ida e volta', () => {
    const params = applyCarteiraParams(new URLSearchParams(), { search: 'gocars', filter: 'com_bloqueios' })
    expect(params.get(CARTEIRA_SEARCH_PARAM)).toBe('gocars')
    expect(params.get(CARTEIRA_FILTER_PARAM)).toBe('com_bloqueios')
    expect(readCarteiraParams(params)).toEqual({ search: 'gocars', filter: 'com_bloqueios' })
  })

  test('preserva parâmetros de outras funcionalidades na mesma URL', () => {
    const existing = new URLSearchParams({ clientId: 'abc', tab: 'governanca' })
    const params = applyCarteiraParams(existing, { search: 'norte', filter: 'todos' })
    expect(params.get('clientId')).toBe('abc')
    expect(params.get('tab')).toBe('governanca')
    expect(params.has(CARTEIRA_FILTER_PARAM)).toBe(false)
  })

  test('limpar o recorte remove os parâmetros que existiam', () => {
    const existing = new URLSearchParams({ [CARTEIRA_SEARCH_PARAM]: 'x', [CARTEIRA_FILTER_PARAM]: 'alert' })
    const params = applyCarteiraParams(existing, { search: '', filter: 'todos' })
    expect(params.toString()).toBe('')
  })
})
