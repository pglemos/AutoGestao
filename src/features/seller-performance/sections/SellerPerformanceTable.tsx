import { Avatar } from '@/components/atoms/Avatar'
import { ReportDataTable } from '@/features/internal-reports/ReportDataTable'
import type { RankingEntry } from '@/types/database'
import type { SellerSortOption } from '../lib/sellerPerformanceViewModel'

export function SellerPerformanceTable({
  rows,
  onSelect,
  sortBy,
  onSortChange,
}: {
  rows: RankingEntry[]
  onSelect: (id: string, storeId?: string) => void
  sortBy?: SellerSortOption
  onSortChange?: (nextSort: SellerSortOption) => void
}) {
  const mapped = rows.map(entry => ({ ...entry, id: entry.user_id }))

  const handleHeaderClick = (columnKey: string) => {
    if (!onSortChange) return
    if (columnKey === 'seller') {
      onSortChange(sortBy === 'name_asc' ? 'name_desc' : 'name_asc')
    } else if (columnKey === 'sales') {
      onSortChange(sortBy === 'sales_desc' ? 'sales_asc' : 'sales_desc')
    } else if (columnKey === 'attainment') {
      onSortChange('attainment_desc')
    } else if (columnKey === 'leads') {
      onSortChange('leads_desc')
    }
  }

  const getSortIndicator = (columnKey: string) => {
    if (!sortBy) return ''
    if (columnKey === 'seller') {
      if (sortBy === 'name_asc') return ' ▲'
      if (sortBy === 'name_desc') return ' ▼'
    }
    if (columnKey === 'sales') {
      if (sortBy === 'sales_desc') return ' ▼'
      if (sortBy === 'sales_asc') return ' ▲'
    }
    if (columnKey === 'attainment' && sortBy === 'attainment_desc') return ' ▼'
    if (columnKey === 'leads' && sortBy === 'leads_desc') return ' ▼'
    return ''
  }

  return (
    <ReportDataTable
      title="Vendedores"
      description="Selecione um vendedor para consultar a leitura individual."
      rows={mapped}
      columns={[
        {
          key: 'seller',
          label: `Vendedor${getSortIndicator('seller')}`,
          render: row => (
            <button
              type="button"
              className="flex items-center gap-3 text-left hover:text-status-success-text transition-colors"
              onClick={() => onSelect(row.user_id, String((row as RankingEntry & { store_id?: string }).store_id || ''))}
            >
              <Avatar src={row.avatar_url || undefined} fallback={row.user_name} size="sm" />
              <span className="font-semibold text-foreground">{row.user_name}</span>
            </button>
          ),
        },
        {
          key: 'sales',
          label: `Vendas${getSortIndicator('sales')}`,
          align: 'center',
          render: row => <span className="font-bold text-foreground">{row.vnd_total}</span>,
        },
        {
          key: 'leads',
          label: `Leads${getSortIndicator('leads')}`,
          align: 'center',
          render: row => row.leads,
        },
        {
          key: 'attainment',
          label: `Atingimento${getSortIndicator('attainment')}`,
          align: 'right',
          render: row => `${Number(row.atingimento || 0).toFixed(1)}%`,
        },
      ]}
    />
  )
}
