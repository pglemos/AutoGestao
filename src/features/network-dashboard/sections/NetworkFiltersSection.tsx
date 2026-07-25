import { Search } from 'lucide-react'
import { Input } from '@/components/atoms/Input'
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
}) {
  return (
    <MxToolbar>
      <MxField label="Buscar loja" className="min-w-[220px] flex-1">
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={17} /><Input value={props.search} onChange={event => props.onSearch(event.target.value)} className="pl-9" placeholder="Nome da loja" /></div>
      </MxField>
      <MxField label="Situação" className="min-w-[170px]">
        <select className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm" value={props.status} onChange={event => props.onStatus(event.target.value as NetworkStatusFilter)}>
          <option value="all">Todas</option><option value="target">Meta atingida</option><option value="alert">Atenção</option><option value="critical">Crítico</option>
        </select>
      </MxField>
      <MxField label="Período" className="min-w-[170px]">
        <select className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm" value={props.timeframe} onChange={event => props.onTimeframe(event.target.value as NetworkTimeframe)}>
          <option value="hoje">Hoje</option><option value="ontem">Ontem</option><option value="semanal">Semana</option><option value="mensal">Mês</option><option value="personalizada">Personalizado</option>
        </select>
      </MxField>
      {props.timeframe === 'personalizada' ? (
        <>
          <MxField label="Início"><Input type="date" value={props.customRange.start} onChange={event => props.onCustomRange({ ...props.customRange, start: event.target.value })} /></MxField>
          <MxField label="Fim"><Input type="date" value={props.customRange.end} onChange={event => props.onCustomRange({ ...props.customRange, end: event.target.value })} /></MxField>
        </>
      ) : null}
    </MxToolbar>
  )
}
