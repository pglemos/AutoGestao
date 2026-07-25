import { ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { MxEmptyState, MxTableSurface } from '@/components/module/MxModuleVisualPrimitives'
import { getStoreDiagnosticStatus } from '../lib/networkDashboardFilters'
import type { NetworkSort, StoreDiagnostic } from '../types'

const columns: Array<{ key: keyof StoreDiagnostic; label: string }> = [
  { key: 'name', label: 'Loja' },
  { key: 'sales', label: 'Vendas' },
  { key: 'goal', label: 'Meta' },
  { key: 'proj', label: 'Projeção' },
  { key: 'efficiency', label: 'Conversão' },
  { key: 'disciplinePct', label: 'Disciplina' },
]

export function StoreHealthTable({ rows, sort, onSort, onOpen }: {
  rows: StoreDiagnostic[]
  sort: NetworkSort
  onSort: (sort: NetworkSort) => void
  onOpen: (row: StoreDiagnostic) => void
}) {
  if (rows.length === 0) {
    return <MxEmptyState title="Nenhuma loja encontrada" description="Ajuste os filtros ou atualize os dados da rede." />
  }

  const changeSort = (key: keyof StoreDiagnostic) => {
    onSort({ key, direction: sort.key === key && sort.direction === 'desc' ? 'asc' : 'desc' })
  }

  return (
    <MxTableSurface>
      <table className="min-w-[880px] w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-left text-gray-500">
            {columns.map(column => (
              <th key={column.key} className="px-4 py-3 font-semibold">
                <button type="button" className="inline-flex items-center gap-2" onClick={() => changeSort(column.key)}>
                  {column.label}<ArrowUpDown size={14} aria-hidden="true" />
                </button>
              </th>
            ))}
            <th className="px-4 py-3 text-right font-semibold">Ação</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const status = getStoreDiagnosticStatus(row)
            const statusLabel = status === 'target' ? 'Meta atingida' : status === 'critical' ? 'Crítico' : 'Atenção'
            return (
              <tr key={row.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-4 font-semibold text-gray-800">
                  <div>{row.name}</div>
                  <div className="mt-1 text-xs font-normal text-gray-500">{statusLabel}</div>
                </td>
                <td className="px-4 py-4 tabular-nums">{row.sales}</td>
                <td className="px-4 py-4 tabular-nums">{row.goal}</td>
                <td className="px-4 py-4 tabular-nums">{row.proj}</td>
                <td className="px-4 py-4 tabular-nums">{row.efficiency.toFixed(1)}%</td>
                <td className="px-4 py-4 tabular-nums">{row.disciplinePct.toFixed(0)}%</td>
                <td className="px-4 py-4 text-right"><Button variant="managerSecondary" size="sm" onClick={() => onOpen(row)}>Abrir</Button></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </MxTableSurface>
  )
}
