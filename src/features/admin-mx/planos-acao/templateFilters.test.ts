import { describe, expect, test } from 'bun:test'
import type { ActionPlanTemplate } from './actionPlanTemplates'
import {
  deriveTemplateStatus,
  emptyTemplateFilters,
  templateFiltersActive,
  templateMatchesFilters,
} from './templateFilters'

function template(overrides: Partial<ActionPlanTemplate> = {}): ActionPlanTemplate {
  return {
    id: 't1',
    template_key: 'ruptura_estoque',
    nome: 'Ruptura de estoque',
    departamento: 'Estoque',
    indicador: 'Estoque acima de 90 dias',
    descricao: null,
    program_key: null,
    active: true,
    versions: [],
    ...overrides,
  }
}

describe('templateFilters — estado', () => {
  test('filtros vazios não estão ativos', () => {
    expect(templateFiltersActive(emptyTemplateFilters())).toBe(false)
  })

  test('qualquer valor ativa os filtros', () => {
    expect(templateFiltersActive({ ...emptyTemplateFilters(), search: 'x' })).toBe(true)
    expect(templateFiltersActive({ ...emptyTemplateFilters(), comVersaoPublicada: true })).toBe(true)
  })
})

describe('templateFilters — status derivado', () => {
  test('template inativo é inativo mesmo com versão publicada', () => {
    const t = template({
      active: false,
      versions: [{ id: 'v1', template_id: 't1', versao: 1, status: 'publicada', notas: null, published_at: null }],
    })
    expect(deriveTemplateStatus(t)).toBe('inativo')
  })

  test('template ativo com versão publicada é publicada', () => {
    const t = template({
      versions: [{ id: 'v1', template_id: 't1', versao: 1, status: 'publicada', notas: null, published_at: null }],
    })
    expect(deriveTemplateStatus(t)).toBe('publicada')
  })

  test('template ativo sem versão publicada é rascunho', () => {
    expect(deriveTemplateStatus(template())).toBe('rascunho')
  })
})

describe('templateFilters — match', () => {
  test('busca case-insensitive em nome e chave', () => {
    const t = template()
    expect(templateMatchesFilters(t, { ...emptyTemplateFilters(), search: 'RUPTURA' })).toBe(true)
    expect(templateMatchesFilters(t, { ...emptyTemplateFilters(), search: 'estoque' })).toBe(true)
    expect(templateMatchesFilters(t, { ...emptyTemplateFilters(), search: 'não existe' })).toBe(false)
  })

  test('departamento e indicador filtram por igualdade', () => {
    const t = template()
    expect(templateMatchesFilters(t, { ...emptyTemplateFilters(), departamento: 'Estoque' })).toBe(true)
    expect(templateMatchesFilters(t, { ...emptyTemplateFilters(), departamento: 'Vendas' })).toBe(false)
    expect(templateMatchesFilters(t, { ...emptyTemplateFilters(), indicador: 'Estoque acima de 90 dias' })).toBe(true)
  })

  test('status publicada exige versão publicada', () => {
    const published = template({
      versions: [{ id: 'v1', template_id: 't1', versao: 1, status: 'publicada', notas: null, published_at: null }],
    })
    expect(templateMatchesFilters(published, { ...emptyTemplateFilters(), status: 'publicada' })).toBe(true)
    expect(templateMatchesFilters(template(), { ...emptyTemplateFilters(), status: 'publicada' })).toBe(false)
  })

  test('status rascunho exclui publicadas', () => {
    const published = template({
      versions: [{ id: 'v1', template_id: 't1', versao: 1, status: 'publicada', notas: null, published_at: null }],
    })
    expect(templateMatchesFilters(template(), { ...emptyTemplateFilters(), status: 'rascunho' })).toBe(true)
    expect(templateMatchesFilters(published, { ...emptyTemplateFilters(), status: 'rascunho' })).toBe(false)
  })

  test('prioridade filtra pelos itens da versão', () => {
    const t = template({
      versions: [{
        id: 'v1', template_id: 't1', versao: 1, status: 'publicada', notas: null, published_at: null,
        itens: [{ id: 'i1', ordem: 1, problema: 'p', acao: 'a', como: '', departamento: '', indicador: '', prioridade: 'critica', prazo_dias: 30, evidencia_requerida: false }],
      }],
    })
    expect(templateMatchesFilters(t, { ...emptyTemplateFilters(), prioridade: 'critica' })).toBe(true)
    expect(templateMatchesFilters(t, { ...emptyTemplateFilters(), prioridade: 'baixa' })).toBe(false)
  })

  test('comVersaoPublicada exige versão publicada', () => {
    const published = template({
      versions: [{ id: 'v1', template_id: 't1', versao: 1, status: 'publicada', notas: null, published_at: null }],
    })
    expect(templateMatchesFilters(published, { ...emptyTemplateFilters(), comVersaoPublicada: true })).toBe(true)
    expect(templateMatchesFilters(template(), { ...emptyTemplateFilters(), comVersaoPublicada: true })).toBe(false)
  })
})
