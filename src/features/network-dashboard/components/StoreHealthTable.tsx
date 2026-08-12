import { ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { MxEmptyState, MxTableSurface } from '@/components/module/MxModuleVisualPrimitives'
import { getStoreDiagnosticStatus } from '../lib/networkDashboardFilters'
import type { NetworkCockpitStore, NetworkSort, StoreDiagnostic } from '../types'

const columns: Array<{ key: keyof StoreDiagnostic; label: string }> = [
  { key: 'name', label: 'Loja' }, { key: 'sales', label: 'Vendas' }, { key: 'goal', label: 'Meta' },
  { key: 'proj', label: 'Projeção' }, { key: 'efficiency', label: 'Conversão' }, { key: 'disciplinePct', label: 'Disciplina' },
]

export function StoreHealthTable({ rows, sort, onSort, onOpen }: {
  rows: NetworkCockpitStore[]
  sort: NetworkSort
  onSort: (sort: NetworkSort) => void
  onOpen: (row: NetworkCockpitStore) => void
}) {
  if (!rows.length) return <MxEmptyState title="Nenhuma loja encontrada" description="Ajuste os filtros ou atualize os dados da rede." />
  const changeSort = (key: keyof StoreDiagnostic) => onSort({ key, direction: sort.key === key && sort.direction === 'desc' ? 'asc' : 'desc' })
  return (
    <MxTableSurface><table className="min-w-[980px] w-full border-collapse text-sm"><thead><tr className="border-b border-border-subtle bg-surface-alt text-left text-muted-foreground">
      {columns.map(column => <th key={column.key} className="px-4 py-3 font-semibold"><button type="button" className="inline-flex items-center gap-2" onClick={() => changeSort(column.key)}>{column.label}<ArrowUpDown size={14} /></button></th>)}
      <th className="px-4 py-3 font-semibold">Pendências</th><th className="px-4 py-3 text-right font-semibold">Ação</th>
    </tr></thead><tbody>{rows.map(row => {
      const status = getStoreDiagnosticStatus(row)
      const statusLabel = status === 'target' ? 'Meta atingida' : status === 'critical' ? 'Crítico' : row.riskReasons.length ? 'Atenção' : 'Em dia'
      const pending = row.pendingClosures + row.overdueActions + row.consultingEvidencePending + row.consultingParticipantsPending
      return <tr key={row.id} className="border-b border-border-subtle last:border-0">
        <td className="px-4 py-4 font-semibold text-foreground"><div>{row.name}</div><div className="mt-1 text-xs font-normal text-muted-foreground">{statusLabel}</div></td>
        <td className="px-4 py-4 tabular-nums">{row.sales}</td><td className="px-4 py-4 tabular-nums">{row.goal}</td><td className="px-4 py-4 tabular-nums">{row.proj}</td>
        <td className="px-4 py-4 tabular-nums">{row.efficiency.toFixed(1)}%</td><td className="px-4 py-4 tabular-nums">{row.disciplinePct.toFixed(0)}%</td>
        <td className="px-4 py-4 tabular-nums">{pending}</td><td className="px-4 py-4 text-right"><Button variant="secondary" size="sm" onClick={() => onOpen(row)}>Analisar</Button></td>
      </tr>
    })}</tbody></table></MxTableSurface>
  )
}
