import type { ChangeEvent } from 'react'
import { MxField, MxSelect, MxToolbar } from '@/components/module/MxModuleVisualPrimitives'
import type { DevelopmentPdiStatusFilter } from './development-filters'

interface SellerOption { id: string; name: string }

export function DevelopmentPdiFilters({ sellers, sellerId, status, onSellerChange, onStatusChange }: { sellers: SellerOption[]; sellerId: string; status: DevelopmentPdiStatusFilter; onSellerChange: (value: string) => void; onStatusChange: (value: DevelopmentPdiStatusFilter) => void }) {
  return (
    <MxToolbar className="grid grid-cols-1 items-end sm:grid-cols-2">
      <MxField label="Vendedor">
        <MxSelect value={sellerId} onChange={(event: ChangeEvent<HTMLSelectElement>) => onSellerChange(event.target.value)}>
          <option value="">Todos</option>
          {sellers.map((seller) => <option key={seller.id} value={seller.id}>{seller.name}</option>)}
        </MxSelect>
      </MxField>
      <MxField label="Status">
        <MxSelect value={status} onChange={(event: ChangeEvent<HTMLSelectElement>) => onStatusChange(event.target.value as DevelopmentPdiStatusFilter)}>
          <option value="all">Todos</option>
          <option value="none">Sem PDI</option>
          <option value="active">PDI ativo</option>
          <option value="overdue">Em atraso</option>
          <option value="completed">Concluído</option>
        </MxSelect>
      </MxField>
    </MxToolbar>
  )
}
