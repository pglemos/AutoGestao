import { useMemo } from 'react'
import { Search, X } from 'lucide-react'
import { MxInput, MxSelect } from '@/components/module/MxModuleVisualPrimitives'
import { Button } from '@/components/atoms/Button'
import type { ActionPlanTemplate } from './actionPlanTemplates'
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
  const departments = useMemo(
    () => [...new Set(props.templates.map(template => template.departamento).filter(Boolean))].sort(),
    [props.templates],
  )
  const hasFilters = templateFiltersActive(props.filters)
  const onSelectChange = (field: keyof TemplateFilterState) => (event: React.ChangeEvent<HTMLSelectElement>) => {
    props.onFilterChange(field, event.target.value)
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-background p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-48 flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3">
          <Search size={14} className="shrink-0 text-muted-foreground" />
          <MxInput
            value={props.filters.search}
            onChange={event => props.onFilterChange('search', event.target.value)}
            placeholder="Buscar por nome..."
            aria-label="Buscar template por nome"
            className="border-0 bg-transparent px-0 focus-visible:ring-0"
          />
        </div>

        <MxSelect aria-label="Filtrar por departamento" value={props.filters.departamento} onChange={onSelectChange('departamento')}>
          <option value="">Todos os departamentos</option>
          {departments.map(department => <option key={department} value={department}>{department}</option>)}
        </MxSelect>

        <MxSelect aria-label="Filtrar por status" value={props.filters.status} onChange={onSelectChange('status')}>
          <option value="">Todos os status</option>
          <option value="publicada">Publicado</option>
          <option value="rascunho">Rascunho</option>
          <option value="inativo">Inativo</option>
          <option value="arquivada">Arquivado</option>
        </MxSelect>

        <MxSelect aria-label="Filtrar por prioridade dos itens" value={props.filters.prioridade} onChange={onSelectChange('prioridade')}>
          <option value="">Todas as prioridades</option>
          {PRIORITY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
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
