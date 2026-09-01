import { ArrowUpDown } from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
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
  if (!rows.length) return <MxEmptyState variant="filter" title="Nenhuma loja encontrada" description="Ajuste os filtros ou atualize os dados da rede." />
  const changeSort = (key: keyof StoreDiagnostic) => onSort({ key, direction: sort.key === key && sort.direction === 'desc' ? 'asc' : 'desc' })
  const getStatusLabel = (row: NetworkCockpitStore) => {
    const status = getStoreDiagnosticStatus(row)
    return status === 'target' ? 'Meta atingida' : status === 'critical' ? 'Crítico' : row.riskReasons.length ? 'Atenção' : 'Em dia'
  }
  const getStatusVariant = (label: string) => label === 'Crítico' ? 'danger' : label === 'Atenção' ? 'warning' : 'success'

  return (
    <>
      <div className="hidden md:block">
        <MxTableSurface>
          <table className="min-w-[980px] w-full border-collapse text-sm">
            <thead><tr className="border-b border-border-subtle bg-surface-alt text-left text-muted-foreground">
              {columns.map(column => <th key={column.key} className="px-4 py-3 font-semibold"><button type="button" className="inline-flex items-center gap-2" onClick={() => changeSort(column.key)} aria-label={`Ordenar por ${column.label}`}>{column.label}<ArrowUpDown size={14} aria-hidden="true" /></button></th>)}
              <th className="px-4 py-3 font-semibold">Pendências</th><th className="px-4 py-3 text-right font-semibold">Ação</th>
            </tr></thead>
            <tbody>{rows.map(row => {
              const statusLabel = getStatusLabel(row)
              const pending = row.pendingClosures + row.overdueActions + row.consultingEvidencePending + row.consultingParticipantsPending
              return <tr key={row.id} className="border-b border-border-subtle last:border-0">
                <td className="px-4 py-4 font-semibold text-foreground"><div>{row.name}</div><div className="mt-1 text-xs font-normal text-muted-foreground">{statusLabel}</div></td>
                <td className="px-4 py-4 tabular-nums">{row.sales === 0 ? '0 confirmado' : row.sales}</td><td className="px-4 py-4 tabular-nums">{row.goal > 0 ? row.goal : 'Não configurada'}</td><td className="px-4 py-4 tabular-nums">{row.goal > 0 ? row.proj : '—'}</td>
                <td className="px-4 py-4 tabular-nums">{row.efficiency.toFixed(1)}%</td><td className="px-4 py-4 tabular-nums">{row.disciplinePct.toFixed(0)}%</td>
                <td className="px-4 py-4 tabular-nums">{pending}</td><td className="px-4 py-4 text-right"><Button variant="outline" size="sm" onClick={() => onOpen(row)} aria-label={`Analisar ${row.name}`}>Analisar</Button></td>
              </tr>
            })}</tbody>
          </table>
        </MxTableSurface>
      </div>

      <div className="space-y-3 md:hidden" aria-label="Prioridades por loja">
        {rows.map(row => {
          const statusLabel = getStatusLabel(row)
          const pending = row.pendingClosures + row.overdueActions + row.consultingEvidencePending + row.consultingParticipantsPending
          return (
            <article key={row.id} className="rounded-2xl border border-border-subtle bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-foreground">{row.name}</h3>
                  <Badge variant={getStatusVariant(statusLabel)} className="mt-2">{statusLabel}</Badge>
                </div>
                <Button variant="outline" size="sm" onClick={() => onOpen(row)} aria-label={`Analisar ${row.name}`}>Analisar</Button>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div><dt className="text-xs text-muted-foreground">Vendas</dt><dd className="mt-0.5 font-semibold tabular-nums text-foreground">{row.sales === 0 ? '0 confirmado' : row.sales}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Meta</dt><dd className="mt-0.5 font-semibold tabular-nums text-foreground">{row.goal > 0 ? row.goal : 'Não configurada'}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Projeção</dt><dd className="mt-0.5 font-semibold tabular-nums text-foreground">{row.goal > 0 ? row.proj : '—'}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Conversão</dt><dd className="mt-0.5 font-semibold tabular-nums text-foreground">{row.efficiency.toFixed(1)}%</dd></div>
                <div><dt className="text-xs text-muted-foreground">Disciplina</dt><dd className="mt-0.5 font-semibold tabular-nums text-foreground">{row.disciplinePct.toFixed(0)}%</dd></div>
                <div><dt className="text-xs text-muted-foreground">Pendências</dt><dd className="mt-0.5 font-semibold tabular-nums text-foreground">{pending}</dd></div>
              </dl>
            </article>
          )
        })}
      </div>
    </>
  )
}
