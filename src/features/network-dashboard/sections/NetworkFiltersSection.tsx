import { RotateCcw, Search } from 'lucide-react'
import { Input } from '@/components/atoms/Input'
import { Button } from '@/components/atoms/Button'
import { MxField, MxToolbar } from '@/components/module/MxModuleVisualPrimitives'
import type { NetworkDateRange, NetworkStatusFilter, NetworkTimeframe } from '../types'

/**
 * Grupos do seletor de situação. Quando a página tem um controle único
 * governando cockpit e carteira, ela passa o vocabulário completo agrupado
 * por eixo — situação operacional e contrato não são a mesma dimensão.
 */
export type StatusGroup = { label: string; options: Array<{ value: string; label: string }> }

const DEFAULT_STATUS_GROUPS: StatusGroup[] = [{
  label: 'Situação',
  options: [
    { value: 'all', label: 'Todas' },
    { value: 'critical', label: 'Crítico' },
    { value: 'alert', label: 'Atenção' },
    { value: 'target', label: 'Meta atingida' },
    { value: 'healthy', label: 'Em dia' },
  ],
}]

export function NetworkFiltersSection(props: {
  search: string
  onSearch: (value: string) => void
  status: NetworkStatusFilter
  onStatus: (value: NetworkStatusFilter) => void
  /** Valor exibido no seletor quando a página governa o filtro. */
  statusValue?: string
  onStatusValue?: (value: string) => void
  statusGroups?: StatusGroup[]
  searchLabel?: string
  searchPlaceholder?: string
  timeframe: NetworkTimeframe
  onTimeframe: (value: NetworkTimeframe) => void
  customRange: NetworkDateRange
  onCustomRange: (value: NetworkDateRange) => void
  onReset: () => void
}) {
  const groups = props.statusGroups ?? DEFAULT_STATUS_GROUPS
  const statusValue = props.statusValue ?? props.status
  const defaultStatusValue = groups[0]?.options[0]?.value ?? 'all'
  const setStatusValue = (value: string) => {
    if (props.onStatusValue) props.onStatusValue(value)
    else props.onStatus(value as NetworkStatusFilter)
  }
  const hasActiveFilters = Boolean(props.search.trim()) || statusValue !== defaultStatusValue || props.timeframe !== 'mensal'

  return (
    <MxToolbar aria-label="Filtros do cockpit operacional">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-sm font-semibold text-foreground">Refinar a fila</p>
        <p className="text-xs leading-5 text-muted-foreground">Atenção inclui configuração pendente, ausência de leitura ou risco operacional.</p>
      </div>
      <MxField label={props.searchLabel ?? 'Buscar loja'} className="min-w-[220px] flex-1">
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} aria-hidden="true" /><Input aria-label={props.searchLabel ?? 'Buscar loja por nome'} value={props.search} onChange={event => props.onSearch(event.target.value)} className="h-mx-10 min-h-[var(--mx-touch-target-min)] pl-9 sm:min-h-[var(--mx-input-height)]" placeholder={props.searchPlaceholder ?? 'Ex.: nome da loja'} /></div>
      </MxField>
      <MxField label="Situação" className="min-w-[200px]">
        <select aria-label="Filtrar por situação" className="h-mx-10 min-h-[var(--mx-touch-target-min)] rounded-xl border border-border bg-white px-3 text-sm sm:min-h-[var(--mx-input-height)]" value={statusValue} onChange={event => setStatusValue(event.target.value)}>
          {groups.length === 1
            ? groups[0].options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)
            : groups.map(group => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </optgroup>
            ))}
        </select>
      </MxField>
      <MxField label="Período" className="min-w-[168px]">
        <select aria-label="Filtrar lojas por período" className="h-mx-10 min-h-[var(--mx-touch-target-min)] rounded-xl border border-border bg-white px-3 text-sm sm:min-h-[var(--mx-input-height)]" value={props.timeframe} onChange={event => props.onTimeframe(event.target.value as NetworkTimeframe)}>
          <option value="hoje">Hoje</option><option value="ontem">Ontem</option><option value="semanal">Semana atual</option><option value="mensal">Mês atual</option><option value="personalizada">Personalizado</option>
        </select>
      </MxField>
      {props.timeframe === 'personalizada' ? (
        <>
          <MxField label="Início"><Input aria-label="Data inicial do período" type="date" value={props.customRange.start} onChange={event => props.onCustomRange({ ...props.customRange, start: event.target.value })} className="h-mx-10 min-h-[var(--mx-touch-target-min)] sm:min-h-[var(--mx-input-height)]" /></MxField>
          <MxField label="Fim"><Input aria-label="Data final do período" type="date" value={props.customRange.end} onChange={event => props.onCustomRange({ ...props.customRange, end: event.target.value })} className="h-mx-10 min-h-[var(--mx-touch-target-min)] sm:min-h-[var(--mx-input-height)]" /></MxField>
        </>
      ) : null}
      {hasActiveFilters ? <Button type="button" variant="ghost" size="sm" className="self-end text-status-success-text sm:self-center" onClick={props.onReset}><RotateCcw size={15} aria-hidden="true" /> Limpar filtros</Button> : null}
    </MxToolbar>
  )
}
