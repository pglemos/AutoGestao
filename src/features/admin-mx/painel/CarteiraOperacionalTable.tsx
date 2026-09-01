import { ArrowUpDown, Building2, CheckCircle2, CircleAlert, ExternalLink, ShieldAlert, Unlink, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { MxEmptyState, MxTableSurface } from '@/components/module/MxModuleVisualPrimitives'
import { linkageLabel, type CarteiraOperationalStatus, type CarteiraRow, type CarteiraSortKey } from './carteiraOperacional'

const statusCopy: Record<CarteiraOperationalStatus, { label: string; variant: 'danger' | 'warning' | 'success'; icon: LucideIcon }> = {
  critical: { label: 'Crítico', variant: 'danger', icon: ShieldAlert },
  alert: { label: 'Atenção', variant: 'warning', icon: CircleAlert },
  target: { label: 'Meta atingida', variant: 'success', icon: CheckCircle2 },
  healthy: { label: 'Em dia', variant: 'success', icon: CheckCircle2 },
}

const contractCopy: Record<string, { label: string; variant: 'success' | 'info' | 'warning' | 'danger' | 'outline' }> = {
  ativo: { label: 'Ativo', variant: 'success' },
  ativo_em_implantacao: { label: 'Ativo em implantação', variant: 'success' },
  em_implantacao: { label: 'Em implantação', variant: 'info' },
  em_configuracao: { label: 'Em configuração', variant: 'warning' },
  pronto_para_ativar: { label: 'Pronto para ativar', variant: 'info' },
  suspenso: { label: 'Suspenso', variant: 'danger' },
  rascunho: { label: 'Rascunho', variant: 'outline' },
}

function formatCount(value: number): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

function formatPercent(value: number, fractionDigits = 0): string {
  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })}%`
}

function salesValue(row: CarteiraRow): string {
  if (!row.store) return 'Sem loja'
  if (row.store.dataQuality?.operational !== 'available') return 'Sem dado'
  return row.store.sales === 0 ? 'Zero confirmado' : formatCount(row.store.sales)
}

function goalValue(row: CarteiraRow): string {
  if (!row.store) return 'Sem loja'
  if (!row.store.dataQuality || row.store.dataQuality.goal === 'unknown') return 'Meta não confirmada'
  return row.store.dataQuality.goal === 'configured' ? formatCount(row.store.goal) : 'Não configurada'
}

function disciplineValue(row: CarteiraRow): string {
  if (!row.store) return 'Sem loja'
  return row.store.dataQuality?.discipline === 'available' ? formatPercent(row.store.disciplinePct) : 'Sem dado'
}

function pendingValue(row: CarteiraRow): string {
  if (!row.store) return '—'
  return row.pending === 1 ? '1 pendência' : `${formatCount(row.pending)} pendências`
}

function StatusCell({ row }: { row: CarteiraRow }) {
  if (!row.operationalStatus) {
    return <Badge variant="outline"><Unlink size={14} aria-hidden="true" />Sem leitura</Badge>
  }
  const copy = statusCopy[row.operationalStatus]
  const Icon = copy.icon
  return <Badge variant={copy.variant}><Icon size={14} aria-hidden="true" />{copy.label}</Badge>
}

function ContractCell({ row }: { row: CarteiraRow }) {
  if (!row.client) return <span className="text-xs text-muted-foreground">Sem cliente MX</span>
  const copy = contractCopy[row.contractStatus ?? 'rascunho'] ?? { label: (row.contractStatus ?? 'Rascunho').replace(/_/g, ' '), variant: 'outline' as const }
  return (
    <span className="flex flex-col items-start gap-1">
      <Badge variant={copy.variant}>{copy.label}</Badge>
      {row.hasDonoMaster === false ? <span className="text-xs font-medium text-status-error-text">Sem Dono Master</span> : null}
    </span>
  )
}

export type CarteiraActions = {
  onAnalyzeStore: (row: CarteiraRow) => void
  onOpenClient: (row: CarteiraRow) => void
  onOpenStrategicPlan: (row: CarteiraRow) => void
  onOpenActionPlan: (row: CarteiraRow) => void
  onOpenConsulting: (row: CarteiraRow) => void
}

function RowActions({ row, actions, compact }: { row: CarteiraRow; actions: CarteiraActions; compact?: boolean }) {
  const width = compact ? 'w-full justify-center' : ''
  return (
    <div className={compact ? 'grid grid-cols-2 gap-2' : 'flex flex-wrap items-center justify-end gap-2'}>
      {row.store ? (
        <Button variant="outline" size="sm" className={width} onClick={() => actions.onAnalyzeStore(row)} aria-label={`Analisar ${row.name}`}>
          Abrir análise
        </Button>
      ) : null}
      {row.client ? (
        <Button variant="outline" size="sm" className={width} onClick={() => actions.onOpenClient(row)} aria-label={`Abrir ficha do cliente ${row.name}`}>
          <ExternalLink size={14} aria-hidden="true" />Ficha
        </Button>
      ) : null}
      {row.store ? (
        <>
          <Button variant="ghost" size="sm" className={width} onClick={() => actions.onOpenStrategicPlan(row)} aria-label={`Plano estratégico de ${row.name}`}>
            Estratégico
          </Button>
          <Button variant="ghost" size="sm" className={width} onClick={() => actions.onOpenActionPlan(row)} aria-label={`Plano de ação de ${row.name}`}>
            Plano de ação
          </Button>
          <Button variant="ghost" size="sm" className={width} onClick={() => actions.onOpenConsulting(row)} aria-label={`Consultoria de ${row.name}`}>
            Consultoria
          </Button>
        </>
      ) : null}
    </div>
  )
}

const columns = [
  { key: 'name', label: 'Loja / Cliente' },
  { key: 'status', label: 'Situação operacional' },
  { key: 'sales', label: 'Vendas' },
  { key: 'goal', label: 'Meta' },
  { key: 'discipline', label: 'Disciplina' },
  { key: 'pending', label: 'Pendências' },
  { key: 'contract', label: 'Contrato' },
  { key: 'owner', label: 'Responsável MX' },
] as const

export type CarteiraSort = { key: CarteiraSortKey; direction: 'asc' | 'desc' }

const SORTABLE = new Set<string>(['name', 'sales', 'goal', 'discipline', 'pending'])

export function CarteiraOperacionalTable({ rows, sort, onSort, actions }: {
  rows: CarteiraRow[]
  sort: CarteiraSort
  onSort: (sort: CarteiraSort) => void
  actions: CarteiraActions
}) {
  if (!rows.length) {
    return (
      <MxEmptyState
        variant="filter"
        icon={Building2}
        title="Nenhuma loja ou cliente nesta leitura"
        description="Ajuste a busca ou o filtro de situação para ver outros registros."
      />
    )
  }

  const changeSort = (key: CarteiraSortKey) => onSort({
    key,
    direction: sort.key === key && sort.direction === 'desc' ? 'asc' : 'desc',
  })

  return (
    <>
      <div className="hidden md:block">
        <MxTableSurface aria-label="Carteira operacional: operação da rede e governança da carteira">
          <table className="w-full min-w-[1180px] border-collapse text-sm">
            <caption className="sr-only">Operação da rede e governança da carteira MX na mesma leitura. A coluna de loja permanece visível durante a rolagem horizontal.</caption>
            <thead>
              <tr className="border-b border-border-subtle bg-surface-alt text-left text-muted-foreground">
                {columns.map(column => {
                  const sortable = SORTABLE.has(column.key)
                  const isSorted = sortable && sort.key === column.key
                  return (
                    <th
                      key={column.key}
                      scope="col"
                      aria-sort={isSorted ? (sort.direction === 'asc' ? 'ascending' : 'descending') : sortable ? 'none' : undefined}
                      className={`px-4 py-3 font-semibold ${column.key === 'name' ? 'sticky left-0 z-[var(--mx-z-sticky)] bg-surface-alt' : ''}`}
                    >
                      {sortable ? (
                        <button
                          type="button"
                          className="inline-flex min-h-8 items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                          onClick={() => changeSort(column.key as CarteiraSortKey)}
                          aria-label={`Ordenar por ${column.label}`}
                        >
                          {column.label}
                          <ArrowUpDown size={14} aria-hidden="true" />
                        </button>
                      ) : column.label}
                    </th>
                  )
                })}
                <th scope="col" className="px-4 py-3 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.key} className="border-b border-border-subtle last:border-0">
                  <th scope="row" className="sticky left-0 z-[var(--mx-z-sticky)] bg-white px-4 py-4 text-left font-semibold text-foreground">
                    <span className="flex min-w-[200px] max-w-[240px] flex-col items-start gap-1">
                      <span className="max-w-full truncate" title={row.name}>{row.name}</span>
                      {row.city ? <span className="text-xs font-normal text-muted-foreground">{row.city}</span> : null}
                      {row.linkage !== 'vinculado' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-status-warning-text">
                          <Unlink size={12} aria-hidden="true" />{linkageLabel(row.linkage)}
                        </span>
                      ) : null}
                    </span>
                  </th>
                  <td className="px-4 py-4"><StatusCell row={row} /></td>
                  <td className="px-4 py-4 tabular-nums">{salesValue(row)}</td>
                  <td className="px-4 py-4 tabular-nums">{goalValue(row)}</td>
                  <td className="px-4 py-4 tabular-nums">{disciplineValue(row)}</td>
                  <td className="px-4 py-4 tabular-nums">{pendingValue(row)}</td>
                  <td className="px-4 py-4"><ContractCell row={row} /></td>
                  <td className="px-4 py-4 text-muted-foreground">{row.ownerName || 'Não atribuído'}</td>
                  <td className="px-4 py-4 text-right"><RowActions row={row} actions={actions} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </MxTableSurface>
      </div>

      <ul className="m-0 list-none space-y-3 p-0 md:hidden" aria-label="Carteira operacional">
        {rows.map(row => (
          <li key={row.key} className="rounded-2xl border border-border-subtle bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-foreground">{row.name}</h3>
                {row.city ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{row.city}</p> : null}
              </div>
              <StatusCell row={row} />
            </div>
            {row.linkage !== 'vinculado' ? (
              <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-status-warning-text">
                <Unlink size={12} aria-hidden="true" />{linkageLabel(row.linkage)}
              </p>
            ) : null}
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div><dt className="text-xs text-muted-foreground">Vendas</dt><dd className="mt-0.5 font-semibold tabular-nums text-foreground">{salesValue(row)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Meta</dt><dd className="mt-0.5 font-semibold tabular-nums text-foreground">{goalValue(row)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Disciplina</dt><dd className="mt-0.5 font-semibold tabular-nums text-foreground">{disciplineValue(row)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Pendências</dt><dd className="mt-0.5 font-semibold tabular-nums text-foreground">{pendingValue(row)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Contrato</dt><dd className="mt-1"><ContractCell row={row} /></dd></div>
              <div><dt className="text-xs text-muted-foreground">Responsável MX</dt><dd className="mt-0.5 font-semibold text-foreground">{row.ownerName || 'Não atribuído'}</dd></div>
            </dl>
            <div className="mt-4"><RowActions row={row} actions={actions} compact /></div>
          </li>
        ))}
      </ul>
    </>
  )
}
