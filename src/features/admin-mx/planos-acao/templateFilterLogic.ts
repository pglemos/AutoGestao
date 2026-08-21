import type { ActionPlanTemplate } from './actionPlanTemplates'
import { departmentMatchesFilter } from './departmentTaxonomy'

/**
 * Filtros avançados de template (Base44 `TemplateFilters`), como lógica pura.
 * Sem imports de Supabase — testável sem banco.
 */

export type TemplateFilterState = {
  search: string
  departamento: string
  indicador: string
  status: string
  prioridade: string
  comVersaoPublicada: boolean
  suggestion_enabled: boolean | ''
  responsible_role: string
}

export function emptyTemplateFilters(): TemplateFilterState {
  return {
    search: '',
    departamento: '',
    indicador: '',
    status: '',
    prioridade: '',
    comVersaoPublicada: false,
    suggestion_enabled: '',
    responsible_role: '',
  }
}

export function templateFiltersActive(filters: TemplateFilterState): boolean {
  return Boolean(
    filters.search ||
      filters.departamento ||
      filters.indicador ||
      filters.status ||
      filters.prioridade ||
      filters.comVersaoPublicada ||
      filters.suggestion_enabled !== '' ||
      filters.responsible_role,
  )
}

/** Status derivado de um template: versão publicada / rascunho / inativo. */
export function deriveTemplateStatus(template: ActionPlanTemplate): 'publicada' | 'rascunho' | 'inativo' | 'arquivado' {
  if (template.versions.length > 0 && template.versions.every(version => version.status === 'arquivada')) return 'arquivado'
  if (!template.active) return 'inativo'
  if (template.versions.some(version => version.status === 'rascunho')) return 'rascunho'
  if (template.versions.some(version => version.status === 'publicada')) return 'publicada'
  return 'rascunho'
}

/**
 * Decide se o template passa pelos filtros. Busca é case-insensitive sobre
 * nome e chave; demais filtros são igualdade exata.
 */
export function templateMatchesFilters(template: ActionPlanTemplate, filters: TemplateFilterState): boolean {
  const term = filters.search.trim().toLowerCase()
  if (term) {
    const haystack = [template.nome, template.template_key, template.indicador ?? '']
      .join(' ')
      .toLowerCase()
    if (!haystack.includes(term)) return false
  }
  if (filters.departamento && !departmentMatchesFilter(template.departamento, filters.departamento)) return false
  if (filters.indicador && (template.indicador ?? '').toLowerCase() !== filters.indicador.toLowerCase()) return false
  if (filters.prioridade) {
    const items = template.versions.flatMap(version => version.itens ?? [])
    const prioridades = new Set(items.map(item => item.prioridade))
    if (!prioridades.has(filters.prioridade as never)) return false
  }
  if (filters.suggestion_enabled !== '' && template.owner_suggestion_enabled !== filters.suggestion_enabled) return false
  if (filters.responsible_role) {
    const matchesTemplate = template.default_responsible_role === filters.responsible_role
    const matchesVersion = template.versions.some(version => version.default_responsible_role === filters.responsible_role)
    const matchesItem = template.versions.some(version => (version.itens ?? []).some(item => item.recommended_responsible_role === filters.responsible_role))
    if (!matchesTemplate && !matchesVersion && !matchesItem) return false
  }
  if (filters.status) {
    const actual = deriveTemplateStatus(template)
    // Base44 exposes editorial aliases that map to the MX lifecycle without
    // changing the persisted MX statuses or copying its data model.
    const wanted = filters.status === 'publicada'
      ? 'publicada'
      : filters.status === 'rascunho' || filters.status === 'em_revisao'
        ? 'rascunho'
        : filters.status === 'arquivado' || filters.status === 'arquivada'
          ? 'arquivado'
          : 'inativo'
    if (actual !== wanted) return false
  }
  if (filters.comVersaoPublicada) {
    if (!template.versions.some(version => version.status === 'publicada')) return false
  }
  return true
}
