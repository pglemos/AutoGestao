import type { ActionPlanTemplate } from './actionPlanTemplates'

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
}

export function emptyTemplateFilters(): TemplateFilterState {
  return {
    search: '',
    departamento: '',
    indicador: '',
    status: '',
    prioridade: '',
    comVersaoPublicada: false,
  }
}

export function templateFiltersActive(filters: TemplateFilterState): boolean {
  return Boolean(
    filters.search ||
      filters.departamento ||
      filters.indicador ||
      filters.status ||
      filters.prioridade ||
      filters.comVersaoPublicada,
  )
}

/** Status derivado de um template: versão publicada / rascunho / inativo. */
export function deriveTemplateStatus(template: ActionPlanTemplate): 'publicada' | 'rascunho' | 'inativo' {
  if (!template.active) return 'inativo'
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
  if (filters.departamento && template.departamento !== filters.departamento) return false
  if (filters.indicador && template.indicador !== filters.indicador) return false
  if (filters.prioridade) {
    const items = template.versions.flatMap(version => version.itens ?? [])
    const prioridades = new Set(items.map(item => item.prioridade))
    if (!prioridades.has(filters.prioridade as never)) return false
  }
  if (filters.status) {
    const actual = deriveTemplateStatus(template)
    const wanted = filters.status === 'publicada' ? 'publicada' : filters.status === 'rascunho' ? 'rascunho' : 'inativo'
    if (actual !== wanted) return false
  }
  if (filters.comVersaoPublicada) {
    if (!template.versions.some(version => version.status === 'publicada')) return false
  }
  return true
}
