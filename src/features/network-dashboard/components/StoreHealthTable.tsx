import { ArrowUpDown, CheckCircle2, CircleAlert, ShieldAlert, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { MxEmptyState, MxTableSurface } from '@/components/module/MxModuleVisualPrimitives'
import { getStoreDiagnosticStatus, getStorePendingCount } from '../lib/networkDashboardFilters'
import type { NetworkCockpitStore, NetworkSort, NetworkStatusFilter, StoreDiagnostic } from '../types'

type StoreStatus = Exclude<NetworkStatusFilter, 'all'>

const columns: Array<{ key: keyof StoreDiagnostic; label: string }> = [
  { key: 'name', label: 'Loja' },
  { key: 'sales', label: 'Vendas' },
  { key: 'goal', label: 'Meta' },
  { key: 'proj', label: 'Projeção' },
  { key: 'efficiency', label: 'Conversão' },
  { key: 'disciplinePct', label: 'Disciplina' },
]

const statusCopy: Record<StoreStatus, { label: string; variant: 'danger' | 'warning' | 'success'; icon: LucideIcon }> = {
  critical: { label: 'Crítico', variant: 'danger', icon: ShieldAlert },
  alert: { label: 'Atenção', variant: 'warning', icon: CircleAlert },
  target: { label: 'Meta atingida', variant: 'success', icon: CheckCircle2 },
  healthy: { label: 'Em dia', variant: 'success', icon: CheckCircle2 },
}

function statusFor(row: NetworkCockpitStore) {
  const status = getStoreDiagnosticStatus(row)
  return { status, ...statusCopy[status] }
}

function hasConfiguredGoal(row: NetworkCockpitStore): boolean {
  return row.dataQuality?.goal === 'configured' || (!row.dataQuality && row.goal > 0)
}

function hasOperationalData(row: NetworkCockpitStore): boolean {
  return row.dataQuality ? row.dataQuality.operational === 'available' : true
}

function hasConfirmedDiscipline(row: NetworkCockpitStore): boolean {
  return row.dataQuality ? row.dataQuality.discipline === 'available' : true
}

function formatCount(value: number): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

function formatPercent(value: number, fractionDigits = 1): string {
  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })}%`
}

function salesValue(row: NetworkCockpitStore): string {
  if (!hasOperationalData(row)) return 'Sem dado'
  if (row.sales === 0) return 'Zero confirmado' /* legado contratual: 0 confirmado */
  return formatCount(row.sales)
}

function goalValue(row: NetworkCockpitStore): string {
  if (row.dataQuality?.goal === 'unknown') return 'Meta não confirmada'
  return hasConfiguredGoal(row) ? formatCount(row.goal) : 'Não configurada'
}

function projectionValue(row: NetworkCockpitStore): string {
  if (!hasOperationalData(row)) return 'Sem dado'
  if (!hasConfiguredGoal(row)) return '—'
  return formatCount(row.proj)
}

function conversionValue(row: NetworkCockpitStore): string {
  return hasOperationalData(row) ? formatPercent(row.efficiency) : 'Sem dado'
}

function disciplineValue(row: NetworkCockpitStore): string {
  return hasConfirmedDiscipline(row) ? formatPercent(row.disciplinePct, 0) : 'Sem dado'
}

function qualityNote(row: NetworkCockpitStore): string | null {
  if (row.dataQuality?.operational === 'no_data') return 'Sem fechamento validado no período.'
  if (row.dataQuality?.operational === 'unknown') return 'A disponibilidade operacional não foi confirmada.'
  if (row.dataQuality?.goal === 'not_configured') return 'A meta mensal precisa ser configurada.'
  if (row.dataQuality?.goal === 'unknown') return 'A configuração da meta não foi confirmada.'
  if (row.dataQuality?.discipline === 'no_data') return 'Sem fechamento de disciplina validado no período.'
  if (row.dataQuality?.discipline === 'unknown') return 'A disponibilidade da disciplina não foi confirmada.'
  return row.riskReasons[0] || null
}

function pendingSummary(row: NetworkCockpitStore): string {
  const pending = getStorePendingCount(row)
  return pending === 1 ? '1 pendência' : `${formatCount(pending)} pendências`
}

function StatusBadge({ row }: { row: NetworkCockpitStore }) {
  const status = statusFor(row)
  const Icon = status.icon
  return <Badge variant={status.variant}><Icon size={14} aria-hidden="true" />{status.label}</Badge>
}

export function StoreHealthTable({ rows, sort, onSort, onOpen }: {
  rows: NetworkCockpitStore[]
  sort: NetworkSort
  onSort: (sort: NetworkSort) => void
  onOpen: (row: NetworkCockpitStore) => void
}) {
  if (!rows.length) return <MxEmptyState variant="filter" title="Nenhuma loja encontrada" description="Ajuste os filtros ou atualize os dados da rede." />

  const changeSort = (key: keyof StoreDiagnostic) => onSort({
    key,
    direction: sort.key === key && sort.direction === 'desc' ? 'asc' : 'desc',
  })

  return (
    <>
      <div className="hidden md:block">
        <MxTableSurface aria-label="Saúde operacional por loja">
          <table className="min-w-[980px] w-full border-collapse text-sm">
            <caption className="sr-only">Saúde operacional por loja no período selecionado.</caption>
            <thead>
              <tr className="border-b border-border-subtle bg-surface-alt text-left text-muted-foreground">
                {columns.map(column => {
                  const isSorted = sort.key === column.key
                  const direction = isSorted ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'
                  return (
                    <th
                      key={column.key}
                      scope="col"
                      aria-sort={direction}
                      className={`px-4 py-3 font-semibold ${column.key === 'name' ? 'sticky left-0 z-[var(--mx-z-sticky)] bg-surface-alt' : ''}`}
                    >
                      <button
                        type="button"
                        className="inline-flex min-h-8 items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-status-success/30"
                        onClick={() => changeSort(column.key)}
                        aria-label={`Ordenar por ${column.label}`}
                      >
                        {column.label}
                        <ArrowUpDown size={14} aria-hidden="true" />
                      </button>
                    </th>
                  )
                })}
                <th scope="col" className="px-4 py-3 font-semibold">Pendências</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Ação</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const note = qualityNote(row)
                return (
                  <tr key={row.id} className="border-b border-border-subtle last:border-0">
                    <td className="sticky left-0 z-[var(--mx-z-sticky)] bg-white px-4 py-4 font-semibold text-foreground">
                      <div className="flex min-w-[192px] flex-col items-start gap-2">
                        <span className="max-w-[220px] truncate" title={row.name}>{row.name}</span>
                        <StatusBadge row={row} />
                      </div>
                      {note ? <p className="mt-2 max-w-[232px] text-xs font-normal leading-5 text-muted-foreground">{note}</p> : null}
                    </td>
                    <td className="px-4 py-4 tabular-nums">{salesValue(row)}</td>
                    <td className="px-4 py-4 tabular-nums">{goalValue(row)}</td>
                    <td className="px-4 py-4 tabular-nums">{projectionValue(row)}</td>
                    <td className="px-4 py-4 tabular-nums">{conversionValue(row)}</td>
                    <td className="px-4 py-4 tabular-nums">{disciplineValue(row)}</td>
                    <td className="px-4 py-4 tabular-nums">{pendingSummary(row)}</td>
                    <td className="px-4 py-4 text-right">
                      <Button variant="outline" size="sm" onClick={() => onOpen(row)} aria-label={`Analisar ${row.name}`}>Abrir análise</Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </MxTableSurface>
      </div>

      <div className="space-y-3 md:hidden" aria-label="Prioridades por loja">
        {rows.map(row => {
          const note = qualityNote(row)
          return (
            <article key={row.id} className="rounded-2xl border border-border-subtle bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-foreground">{row.name}</h3>
                  <div className="mt-2"><StatusBadge row={row} /></div>
                </div>
                <Button variant="outline" size="sm" onClick={() => onOpen(row)} aria-label={`Analisar ${row.name}`}>Abrir análise</Button>
              </div>
              {note ? <p className="mt-3 text-xs leading-5 text-muted-foreground"><span className="font-semibold text-foreground">Motivo:</span> {note}</p> : null}
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div><dt className="text-xs text-muted-foreground">Vendas</dt><dd className="mt-0.5 font-semibold tabular-nums text-foreground">{salesValue(row)}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Meta</dt><dd className="mt-0.5 font-semibold tabular-nums text-foreground">{goalValue(row)}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Projeção</dt><dd className="mt-0.5 font-semibold tabular-nums text-foreground">{projectionValue(row)}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Conversão</dt><dd className="mt-0.5 font-semibold tabular-nums text-foreground">{conversionValue(row)}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Disciplina</dt><dd className="mt-0.5 font-semibold tabular-nums text-foreground">{disciplineValue(row)}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Pendências</dt><dd className="mt-0.5 font-semibold tabular-nums text-foreground">{pendingSummary(row)}</dd></div>
              </dl>
            </article>
          )
        })}
      </div>
    </>
  )
}
