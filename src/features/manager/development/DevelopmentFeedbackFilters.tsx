import type { ChangeEvent } from 'react'
import { MxField, MxSelect, MxToolbar } from '@/components/module/MxModuleVisualPrimitives'
import type { DevelopmentFeedbackStatusFilter, DevelopmentKindFilter, DevelopmentPeriodFilter } from './development-filters'

interface SellerOption { id: string; name: string }

export function DevelopmentFeedbackFilters({
  period,
  sellerId,
  kind,
  competency,
  status,
  sellers,
  competencies,
  onPeriodChange,
  onSellerChange,
  onKindChange,
  onCompetencyChange,
  onStatusChange,
}: {
  period: DevelopmentPeriodFilter
  sellerId: string
  kind: DevelopmentKindFilter
  competency: string
  status: DevelopmentFeedbackStatusFilter
  sellers: SellerOption[]
  competencies: string[]
  onPeriodChange: (value: DevelopmentPeriodFilter) => void
  onSellerChange: (value: string) => void
  onKindChange: (value: DevelopmentKindFilter) => void
  onCompetencyChange: (value: string) => void
  onStatusChange: (value: DevelopmentFeedbackStatusFilter) => void
}) {
  return (
    <MxToolbar className="grid grid-cols-1 items-end sm:grid-cols-2 lg:grid-cols-5">
      <MxField label="Período">
        <MxSelect value={period} onChange={(event: ChangeEvent<HTMLSelectElement>) => onPeriodChange(event.target.value as DevelopmentPeriodFilter)}>
          <option value="current">Mês atual</option>
          <option value="previous">Mês anterior</option>
          <option value="last30">Últimos 30 dias</option>
        </MxSelect>
      </MxField>
      <MxField label="Vendedor">
        <MxSelect value={sellerId} onChange={(event: ChangeEvent<HTMLSelectElement>) => onSellerChange(event.target.value)}>
          <option value="">Todos</option>
          {sellers.map((seller) => <option key={seller.id} value={seller.id}>{seller.name}</option>)}
        </MxSelect>
      </MxField>
      <MxField label="Tipo">
        <MxSelect value={kind} onChange={(event: ChangeEvent<HTMLSelectElement>) => onKindChange(event.target.value as DevelopmentKindFilter)}>
          <option value="all">Todos</option>
          <option value="positive">Com reconhecimento</option>
          <option value="development">Com desenvolvimento</option>
        </MxSelect>
      </MxField>
      <MxField label="Competência">
        <MxSelect value={competency} onChange={(event: ChangeEvent<HTMLSelectElement>) => onCompetencyChange(event.target.value)}>
          <option value="">Todas</option>
          {competencies.map((value) => <option key={value} value={value}>{value}</option>)}
        </MxSelect>
      </MxField>
      <MxField label="Status">
        <MxSelect value={status} onChange={(event: ChangeEvent<HTMLSelectElement>) => onStatusChange(event.target.value as DevelopmentFeedbackStatusFilter)}>
          <option value="all">Todos</option>
          <option value="pending">Aguardando ciência</option>
          <option value="acknowledged">Ciência registrada</option>
        </MxSelect>
      </MxField>
    </MxToolbar>
  )
}
