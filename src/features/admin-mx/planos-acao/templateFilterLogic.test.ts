import { describe, expect, test } from 'bun:test'
import { emptyTemplateItem, type ActionPlanTemplate, type ActionPlanTemplateVersion } from './actionPlanTemplates'
import {
  deriveTemplateStatus,
  emptyTemplateFilters,
  templateFiltersActive,
  templateMatchesFilters,
} from './templateFilterLogic'

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
    primary_indicator_code: null,
    improvement_direction: null,
    default_responsible_role: null,
    manual_application_enabled: true,
    owner_suggestion_enabled: false,
    versions: [],
    ...overrides,
  }
}

function version(overrides: Partial<ActionPlanTemplateVersion> = {}): ActionPlanTemplateVersion {
  return {
    id: 'v1', template_id: 't1', versao: 1, status: 'publicada',
    improvement_direction: null, default_responsible_role: null, notas: null, published_at: null,
    problem: null, objective: null, when_to_apply: null,
    owner_suggestion_title: null, owner_suggestion_problem: null, owner_suggestion_recommendation: null,
    effectiveness_indicator_code: null, itens: [], ...overrides,
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
      versions: [version()],
    })
    expect(deriveTemplateStatus(t)).toBe('inativo')
  })

  test('template ativo com versão publicada é publicada', () => {
    const t = template({
      versions: [version()],
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
      versions: [version()],
    })
    expect(templateMatchesFilters(published, { ...emptyTemplateFilters(), status: 'publicada' })).toBe(true)
    expect(templateMatchesFilters(template(), { ...emptyTemplateFilters(), status: 'publicada' })).toBe(false)
  })

  test('status rascunho exclui publicadas', () => {
    const published = template({
      versions: [version()],
    })
    expect(templateMatchesFilters(template(), { ...emptyTemplateFilters(), status: 'rascunho' })).toBe(true)
    expect(templateMatchesFilters(published, { ...emptyTemplateFilters(), status: 'rascunho' })).toBe(false)
  })

  test('prioridade filtra pelos itens da versão', () => {
    const t = template({
      versions: [version({
        itens: [{ ...emptyTemplateItem(1), id: 'i1', problema: 'p', acao: 'a', prioridade: 'critica' }],
      })],
    })
    expect(templateMatchesFilters(t, { ...emptyTemplateFilters(), prioridade: 'critica' })).toBe(true)
    expect(templateMatchesFilters(t, { ...emptyTemplateFilters(), prioridade: 'baixa' })).toBe(false)
  })

  test('comVersaoPublicada exige versão publicada', () => {
    const published = template({
      versions: [version()],
    })
    expect(templateMatchesFilters(published, { ...emptyTemplateFilters(), comVersaoPublicada: true })).toBe(true)
    expect(templateMatchesFilters(template(), { ...emptyTemplateFilters(), comVersaoPublicada: true })).toBe(false)
  })

  test('filtra disponibilidade para sugestão', () => {
    const enabled = template({ owner_suggestion_enabled: true })
    expect(templateMatchesFilters(enabled, { ...emptyTemplateFilters(), suggestion_enabled: true })).toBe(true)
    expect(templateMatchesFilters(enabled, { ...emptyTemplateFilters(), suggestion_enabled: false })).toBe(false)
  })

  test('filtra responsável recomendado do template ou item', () => {
    const byTemplate = template({ default_responsible_role: 'GERENTE_COMERCIAL' })
    const byItem = template({
      versions: [version({
        itens: [{ ...emptyTemplateItem(1), id: 'i1', problema: 'p', acao: 'a', recommended_responsible_role: 'MARKETING' }],
      })],
    })
    expect(templateMatchesFilters(byTemplate, { ...emptyTemplateFilters(), responsible_role: 'GERENTE_COMERCIAL' })).toBe(true)
    expect(templateMatchesFilters(byItem, { ...emptyTemplateFilters(), responsible_role: 'MARKETING' })).toBe(true)
    expect(templateMatchesFilters(byItem, { ...emptyTemplateFilters(), responsible_role: 'FINANCEIRO' })).toBe(false)
  })
})
