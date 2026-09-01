import { RotateCcw, Search } from 'lucide-react'
import { Input } from '@/components/atoms/Input'
import { Button } from '@/components/atoms/Button'
import { MxField, MxToolbar } from '@/components/module/MxModuleVisualPrimitives'
import type { NetworkDateRange, NetworkStatusFilter, NetworkTimeframe } from '../types'

export function NetworkFiltersSection(props: {
  search: string
  onSearch: (value: string) => void
  status: NetworkStatusFilter
  onStatus: (value: NetworkStatusFilter) => void
  timeframe: NetworkTimeframe
  onTimeframe: (value: NetworkTimeframe) => void
  customRange: NetworkDateRange
  onCustomRange: (value: NetworkDateRange) => void
  onReset: () => void
}) {
  const hasActiveFilters = Boolean(props.search.trim()) || props.status !== 'all' || props.timeframe !== 'mensal'

  return (
    <MxToolbar aria-label="Filtros do cockpit operacional">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-sm font-semibold text-foreground">Refinar a fila</p>
        <p className="text-xs leading-5 text-muted-foreground">Atenção inclui configuração pendente, ausência de leitura ou risco operacional.</p>
      </div>
      <MxField label="Buscar loja" className="min-w-[220px] flex-1">
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} aria-hidden="true" /><Input aria-label="Buscar loja por nome" value={props.search} onChange={event => props.onSearch(event.target.value)} className="h-mx-11 pl-9 sm:h-10" placeholder="Ex.: nome da loja" /></div>
      </MxField>
      <MxField label="Situação" className="min-w-[168px]">
        <select aria-label="Filtrar lojas por situação" className="h-mx-11 rounded-xl border border-border bg-white px-3 text-sm sm:h-10" value={props.status} onChange={event => props.onStatus(event.target.value as NetworkStatusFilter)}>
          <option value="all">Todas</option><option value="critical">Crítico</option><option value="alert">Atenção</option><option value="target">Meta atingida</option><option value="healthy">Em dia</option>
        </select>
      </MxField>
      <MxField label="Período" className="min-w-[168px]">
        <select aria-label="Filtrar lojas por período" className="h-mx-11 rounded-xl border border-border bg-white px-3 text-sm sm:h-10" value={props.timeframe} onChange={event => props.onTimeframe(event.target.value as NetworkTimeframe)}>
          <option value="hoje">Hoje</option><option value="ontem">Ontem</option><option value="semanal">Semana atual</option><option value="mensal">Mês atual</option><option value="personalizada">Personalizado</option>
        </select>
      </MxField>
      {props.timeframe === 'personalizada' ? (
        <>
          <MxField label="Início"><Input aria-label="Data inicial do período" type="date" value={props.customRange.start} onChange={event => props.onCustomRange({ ...props.customRange, start: event.target.value })} className="h-mx-11 sm:h-10" /></MxField>
          <MxField label="Fim"><Input aria-label="Data final do período" type="date" value={props.customRange.end} onChange={event => props.onCustomRange({ ...props.customRange, end: event.target.value })} className="h-mx-11 sm:h-10" /></MxField>
        </>
      ) : null}
      {hasActiveFilters ? <Button type="button" variant="ghost" size="sm" className="self-end text-status-success-text sm:self-center" onClick={props.onReset}><RotateCcw size={15} aria-hidden="true" /> Limpar filtros</Button> : null}
    </MxToolbar>
  )
}
