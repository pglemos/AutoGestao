import { DollarSign, LayoutGrid, Megaphone, Package, Settings, TrendingUp, Users, type LucideIcon } from 'lucide-react'
import type { ActionPlanTemplate, IndicatorCatalogEntry } from './actionPlanTemplates'
import { ACTION_PLAN_DEPARTMENT_CARDS, departmentCategory, indicatorAreaMatchesDepartment } from './departmentTaxonomy'

const CATEGORY_ICON: Record<string, LucideIcon> = {
  financeiro: DollarSign,
  comercial: TrendingUp,
  marketing: Megaphone,
  produto: Package,
  rh: Users,
  operacional: Settings,
}

/** Cores dos ícones — Base44 `actionPlanConstants.ACTION_PLAN_DEPARTMENTS`. */
const CATEGORY_ICON_TONE: Record<string, string> = {
  comercial: 'bg-blue-50 text-blue-700',
  marketing: 'bg-pink-50 text-pink-700',
  produto: 'bg-orange-50 text-orange-700',
  rh: 'bg-teal-50 text-teal-700',
  financeiro: 'bg-green-50 text-green-700',
  operacional: 'bg-purple-50 text-purple-700',
}

/** Cards por categoria de indicador (mesma taxonomia do catálogo do Planejamento Estratégico) — filtra a biblioteca de templates ao clicar. */
export function DepartmentCards(props: {
  templates: ActionPlanTemplate[]
  indicators: IndicatorCatalogEntry[]
  selectedDept: string
  onSelect: (category: string) => void
}) {
  const cards = [{ code: '', label: 'Todos' }, ...ACTION_PLAN_DEPARTMENT_CARDS]

  const countsFor = (category: string) => {
    const published = props.templates.filter(template => (!category || departmentCategory(template.departamento) === category) && template.versions.some(version => version.status === 'publicada')).length
    const drafts = props.templates.filter(template => (!category || departmentCategory(template.departamento) === category) && template.versions.some(version => version.status === 'rascunho')).length
    const activeIndicators = props.indicators.filter(indicator => !category || indicatorAreaMatchesDepartment(indicator.category, category)).length
    return { published, drafts, activeIndicators }
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
      {cards.map(card => {
        const Icon = CATEGORY_ICON[card.code] ?? LayoutGrid
        const counts = countsFor(card.code)
        const selected = props.selectedDept === card.code
        return (
          <button
            key={card.code || 'todos'}
            type="button"
            onClick={() => props.onSelect(card.code)}
            className={`rounded-xl border-2 p-3 text-left transition-all ${selected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-surface-default hover:border-border-strong'}`}
          >
            <div className="mb-2 flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${CATEGORY_ICON_TONE[card.code] ?? 'bg-surface-alt text-text-secondary'}`}>
                <Icon size={14} />
              </div>
              <span className="truncate text-xs font-semibold text-text-primary">{card.label}</span>
            </div>
            <div className="text-lg font-bold text-text-primary">{counts.published}</div>
            <div className="text-[10px] text-text-secondary">Planos Padrão</div>
            <div className="mt-0.5 text-[10px] text-text-disabled">{counts.activeIndicators} indicadores ativos</div>
            {counts.drafts > 0 ? <div className="mt-0.5 text-[10px] text-status-warning">{counts.drafts} em rascunho</div> : null}
          </button>
        )
      })}
    </div>
  )
}
