import { useMemo } from 'react'
import { Search, X } from 'lucide-react'
import { MxInput, MxSelect } from '@/components/module/MxModuleVisualPrimitives'
import { Button } from '@/components/atoms/Button'
import { RESPONSIBLE_ROLE_OPTIONS, type ActionPlanTemplate } from './actionPlanTemplates'
import { ACTION_PLAN_DEPARTMENT_CARDS, departmentMatchesFilter, indicatorAreaMatchesDepartment } from './departmentTaxonomy'
import { emptyTemplateFilters, templateFiltersActive, type TemplateFilterState } from './templateFilterLogic'
import type { WizardIndicator } from './clientActionPlanWizardData'

const PRIORITY_OPTIONS = [
  { value: 'critica', label: 'Crítica' },
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Média' },
  { value: 'baixa', label: 'Baixa' },
]

/**
 * Filtros avançados da biblioteca de templates (Base44 `TemplateFilters`),
 * usando o design system MX.
 */
export function TemplateFilters(props: {
  templates: ActionPlanTemplate[]
  indicators: WizardIndicator[]
  filters: TemplateFilterState
  onFilterChange: (field: keyof TemplateFilterState, value: string | boolean) => void
  onClear: () => void
}) {
  const departments = ACTION_PLAN_DEPARTMENT_CARDS
  const indicators = useMemo(() => {
    const selectedDepartment = props.filters.departamento
    const fromCatalog = props.indicators
      .filter(indicator => indicatorAreaMatchesDepartment(indicator.area, selectedDepartment))
      .map(indicator => ({ value: indicator.metric_key, label: indicator.label }))
      .filter(indicator => indicator.value && indicator.label)
    const fromTemplates = props.templates
      .filter(template => departmentMatchesFilter(template.departamento, selectedDepartment))
      .map(template => ({ value: template.indicador ?? '', label: template.indicador ?? '' }))
      .filter(indicator => indicator.value)
    return [...new Map([...fromCatalog, ...fromTemplates].map(indicator => [indicator.value.toLowerCase(), indicator])).values()]
      .sort((left, right) => left.label.localeCompare(right.label, 'pt-BR'))
  }, [props.filters.departamento, props.indicators, props.templates])
  const hasFilters = templateFiltersActive(props.filters)
  const onSelectChange = (field: keyof TemplateFilterState) => (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value
    props.onFilterChange(field, value)
    if (field === 'departamento') props.onFilterChange('indicador', '')
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-background p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-48 flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3">
          <Search size={14} className="shrink-0 text-muted-foreground" />
          <MxInput
            id="template-filter-search"
            name="template-search"
            value={props.filters.search}
            onChange={event => props.onFilterChange('search', event.target.value)}
            placeholder="Buscar por nome..."
            aria-label="Buscar template por nome"
            className="border-0 bg-transparent px-0 focus-visible:ring-0"
          />
        </div>

        <MxSelect id="template-filter-department" name="template-department" aria-label="Filtrar por departamento" value={props.filters.departamento} onChange={onSelectChange('departamento')}>
          <option value="">Todos os departamentos</option>
          {departments.map(department => <option key={department.code} value={department.code}>{department.label}</option>)}
        </MxSelect>

        <MxSelect id="template-filter-indicator" name="template-indicator" aria-label="Filtrar por indicador" value={props.filters.indicador} onChange={event => {
          props.onFilterChange('indicador', event.target.value)
        }}>
          <option value="">Todos os indicadores</option>
          {indicators.map(indicator => <option key={indicator.value} value={indicator.value}>{indicator.label}</option>)}
        </MxSelect>

        <MxSelect id="template-filter-status" name="template-status" aria-label="Filtrar por status" value={props.filters.status} onChange={onSelectChange('status')}>
          <option value="">Todos os status</option>
          <option value="publicada">Publicado</option>
          <option value="rascunho">Rascunho</option>
          <option value="em_revisao">Em Revisão</option>
          <option value="inativo">Inativo</option>
          <option value="desabilitado">Desabilitado</option>
          <option value="arquivada">Arquivado</option>
        </MxSelect>

        <MxSelect id="template-filter-priority" name="template-priority" aria-label="Filtrar por prioridade dos itens" value={props.filters.prioridade} onChange={onSelectChange('prioridade')}>
          <option value="">Todas as prioridades</option>
          {PRIORITY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </MxSelect>

        <MxSelect id="template-filter-suggestion" name="template-suggestion" aria-label="Filtrar disponibilidade para sugestão" value={props.filters.suggestion_enabled === '' ? '' : String(props.filters.suggestion_enabled)} onChange={event => props.onFilterChange('suggestion_enabled', event.target.value === '' ? '' : event.target.value === 'true')}>
          <option value="">Disponibilidade</option>
          <option value="true">Disponível para sugestão</option>
          <option value="false">Não disponível</option>
        </MxSelect>

        <MxSelect id="template-filter-responsible" name="template-responsible" aria-label="Filtrar responsável recomendado" value={props.filters.responsible_role} onChange={onSelectChange('responsible_role')}>
          <option value="">Todos os responsáveis</option>
          {RESPONSIBLE_ROLE_OPTIONS.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}
        </MxSelect>

        {hasFilters ? (
          <Button variant="outline" size="sm" onClick={props.onClear}>
            <X size={14} />Limpar filtros
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export { emptyTemplateFilters }
export type { TemplateFilterState }
