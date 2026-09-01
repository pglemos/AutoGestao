import { CheckCircle2, CircleAlert, CircleHelp, ShieldAlert, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { MxEmptyState, MxSectionCard, MxSectionHeader, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { getStoreDiagnosticStatus, getStorePendingCount, prioritizeStoreDiagnostics } from '../lib/networkDashboardFilters'
import { StoreHealthTable } from '../components/StoreHealthTable'
import type { NetworkCockpitStore, NetworkStatusFilter, NetworkSort } from '../types'

type StoreStatus = Exclude<NetworkStatusFilter, 'all'>

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
  return row.dataQuality?.goal === 'configured'
}

function hasOperationalData(row: NetworkCockpitStore): boolean {
  return row.dataQuality?.operational === 'available'
}

function resultSummary(row: NetworkCockpitStore): string {
  if (!hasOperationalData(row)) return row.dataQuality?.operational === 'no_data' ? 'Sem dados operacionais no período' : 'Disponibilidade operacional não confirmada'
  if (row.dataQuality?.goal === 'unknown') return 'Meta mensal não confirmada'
  if (!hasConfiguredGoal(row)) return 'Meta mensal não configurada'
  if (row.sales === 0) return `Zero confirmado · meta de ${row.goal} vendas`
  return `${row.sales} de ${row.goal} vendas · gap de ${row.gap}`
}

function nextStep(row: NetworkCockpitStore): string {
  if (!hasOperationalData(row)) return 'Verificar os lançamentos do período'
  if (row.dataQuality?.goal === 'unknown') return 'Confirmar a configuração da meta mensal'
  if (!hasConfiguredGoal(row)) return 'Configurar a meta mensal da loja'
  if (row.overdueActions > 0 || row.blockedActions > 0 || row.awaitingValidationActions > 0) return 'Revisar o plano de ação'
  if (row.dataQuality?.discipline === 'no_data' || row.dataQuality?.discipline === 'unknown') return 'Confirmar o fechamento da disciplina'
  if (row.disciplinePct < 50) return 'Revisar a disciplina da equipe'
  return 'Abrir o diagnóstico da loja'
}

function PriorityRow({ row, position, onOpen }: { row: NetworkCockpitStore; position: number; onOpen: (row: NetworkCockpitStore) => void }) {
  const status = statusFor(row)
  const Icon = status.icon
  const pending = getStorePendingCount(row)
  const reason = row.riskReasons[0] || 'Revisar a leitura operacional da loja'

  return (
    <li className="grid gap-4 border-b border-border-subtle px-4 py-4 last:border-b-0 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start sm:px-5">
      <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-full bg-surface-alt text-sm font-bold text-foreground">{position}</span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="min-w-0 truncate text-sm font-semibold text-foreground">{row.name}</h3>
          <Badge variant={status.variant}><Icon size={14} aria-hidden="true" />{status.label}</Badge>
        </div>
        <p className="mt-2 text-sm leading-5 text-foreground"><span className="font-semibold">Motivo:</span> {reason}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground"><span className="font-semibold text-foreground">Próximo passo:</span> {nextStep(row)}</p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
          <span><span className="font-semibold text-foreground">Resultado:</span> {resultSummary(row)}</span>
          <span><span className="font-semibold text-foreground">Pendências:</span> {pending.toLocaleString('pt-BR')}</span>
        </div>
      </div>
      <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => onOpen(row)} aria-label={`Analisar ${row.name}`}>
        Abrir análise
      </Button>
    </li>
  )
}

export function NetworkPrioritiesSection(props: { rows: NetworkCockpitStore[]; sort: NetworkSort; onSort: (sort: NetworkSort) => void; onOpen: (row: NetworkCockpitStore) => void }) {
  const [showAll, setShowAll] = useState(false)
  const actionableRows = prioritizeStoreDiagnostics(props.rows.filter(row => {
    const status = getStoreDiagnosticStatus(row)
    return status === 'critical' || status === 'alert'
  }))
  const priorityRows = actionableRows.slice(0, 5)
  const hasRows = props.rows.length > 0

  return (
    <MxSectionCard id="network-priorities" tabIndex={-1} aria-label="Fila de prioridades por loja" className="scroll-mt-6">
      <MxSectionHeader
        title="Fila de prioridades"
        description="Decisões ordenadas por risco, pendências e gap. A tabela completa fica disponível sob demanda."
        actions={hasRows ? <Button variant="outline" size="sm" aria-expanded={showAll} onClick={() => setShowAll(value => !value)}>{showAll ? 'Ocultar tabela completa' : `Ver todas as lojas (${props.rows.length})`}</Button> : undefined}
      />
      {hasRows ? (
        <>
          <div className="border-b border-border-subtle px-4 py-3 sm:px-5" role="status" aria-live="polite">
            <p className="text-sm font-medium text-foreground">
              {actionableRows.length > 0
                ? `${actionableRows.length} ${actionableRows.length === 1 ? 'loja exige' : 'lojas exigem'} atenção · mostrando ${priorityRows.length} ${priorityRows.length === 1 ? 'mais urgente' : 'mais urgentes'}`
                : 'Nenhuma exceção operacional na leitura atual.'}
            </p>
          </div>
          {priorityRows.length > 0 ? (
            <ol aria-label="Lojas que exigem decisão" className="m-0 list-none p-0">
              {priorityRows.map((row, index) => <PriorityRow key={row.id} row={row} position={index + 1} onOpen={props.onOpen} />)}
            </ol>
          ) : (
            <div className="p-5">
              <MxStatusBanner tone="success"><span className="inline-flex items-center gap-2"><CheckCircle2 size={16} aria-hidden="true" /> Todas as lojas estão sem exceções críticas ou de atenção.</span></MxStatusBanner>
            </div>
          )}
          {showAll ? (
            <div className="border-t border-border-subtle p-4 sm:p-5">
              <div className="mb-3 flex items-start gap-2">
                <CircleHelp size={16} className="mt-0.5 shrink-0 text-status-info-text" aria-hidden="true" />
                <p className="text-xs leading-5 text-muted-foreground">Use os cabeçalhos da tabela para ordenar. A coluna da loja permanece visível durante a rolagem horizontal.</p>
              </div>
              <StoreHealthTable {...props} />
            </div>
          ) : null}
        </>
      ) : (
        <div className="p-5"><StoreHealthTable {...props} /></div>
      )}
    </MxSectionCard>
  )
}
