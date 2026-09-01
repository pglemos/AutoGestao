import { AlertTriangle, Building2, CircleAlert, CircleCheck, CircleHelp, CircleX, Info, Target, TrendingUp, type LucideIcon } from 'lucide-react'
import { MxMetricCard, MxMetricGrid } from '@/components/module/MxModuleVisualPrimitives'
import type { NetworkDashboardMetrics, NetworkMetricState } from '../types'

const stateCopy: Record<NetworkMetricState, { label: string; className: string; icon: LucideIcon }> = {
  value: { label: 'Leitura disponível', className: 'bg-status-success-surface text-status-success-text', icon: CircleCheck },
  zero: { label: 'Zero real', className: 'bg-status-info-surface text-status-info-text', icon: CircleCheck },
  partial: { label: 'Leitura parcial', className: 'bg-status-warning-surface text-status-warning-text', icon: CircleAlert },
  no_data: { label: 'Sem dados no período', className: 'bg-status-warning-surface text-status-warning-text', icon: CircleX },
  not_configured: { label: 'Sem configuração', className: 'bg-status-warning-surface text-status-warning-text', icon: CircleAlert },
  unknown: { label: 'Disponibilidade não confirmada', className: 'bg-surface-alt text-muted-foreground', icon: CircleHelp },
}

function MetricStateChip({ state }: { state: NetworkMetricState }) {
  const copy = stateCopy[state]
  const Icon = copy.icon
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-caption font-semibold leading-4 ${copy.className}`}><Icon size={14} aria-hidden="true" />{copy.label}</span>
}

function salesDetail(metrics: NetworkDashboardMetrics, periodLabel: string): string {
  if (metrics.salesState === 'no_data') return `Nenhuma fonte operacional confirmou leitura · ${periodLabel}`
  if (metrics.salesState === 'unknown') return `A fonte não confirmou a disponibilidade da leitura · ${periodLabel}`
  if (metrics.salesState === 'partial') return `${metrics.sales} confirmada(s) · ${metrics.storesWithoutData} sem leitura · ${metrics.storesWithUnknownData} sem confirmação · ${periodLabel}`
  return `${metrics.sales} venda(s) confirmada(s) · ${periodLabel}`
}

function attainmentDetail(metrics: NetworkDashboardMetrics, periodLabel: string): string {
  if (metrics.attainmentState === 'not_configured') return `${metrics.storesWithoutGoal} de ${metrics.stores} loja(s) sem meta mensal · ${periodLabel}`
  if (metrics.attainmentState === 'unknown') return metrics.storesWithUnknownGoal > 0
    ? `${metrics.storesWithUnknownGoal} loja(s) sem configuração de meta confirmada · ${periodLabel}`
    : `A disponibilidade da leitura não foi confirmada · ${periodLabel}`
  if (metrics.attainmentState === 'no_data') return `Meta cadastrada, mas sem leitura operacional confirmada · ${periodLabel}`
  if (metrics.goal === 0) return `Meta não configurada · ${periodLabel}`
  if (metrics.attainmentState === 'partial') return `${metrics.sales} de ${metrics.goal} vendas · ${metrics.storesWithoutGoal} sem meta · ${metrics.storesWithUnknownGoal} sem confirmação · ${periodLabel}`
  return `${metrics.sales} de ${metrics.goal} vendas · ${periodLabel}`
}

export function NetworkMetricsSection({ metrics, periodLabel, onShowPriorities }: {
  metrics: NetworkDashboardMetrics
  periodLabel: string
  onShowPriorities: () => void
}) {
  const attainmentAvailable = metrics.attainmentState === 'value' || metrics.attainmentState === 'zero' || metrics.attainmentState === 'partial'
  const attainment = attainmentAvailable && metrics.goal > 0 ? `${((metrics.sales / metrics.goal) * 100).toFixed(1)}%` : '—'

  return (
    <section aria-labelledby="network-metrics-title" className="space-y-3">
      <h2 id="network-metrics-title" className="sr-only">Resumo do cockpit operacional</h2>
      <MxMetricGrid>
        <MxMetricCard
          title="Lojas ativas"
          value={metrics.stores}
          detail={`${metrics.stores} unidade(s) no escopo · ${periodLabel}`}
          icon={Building2}
          actionLabel="Abrir fila por prioridade"
          onAction={onShowPriorities}
        >
          <span className="text-xs font-medium text-muted-foreground">Escopo carregado</span>
        </MxMetricCard>
        <MxMetricCard
          title="Vendas"
          value={metrics.sales}
          detail={salesDetail(metrics, periodLabel)}
          icon={TrendingUp}
          tone="success"
          actionLabel="Ver fila de prioridades"
          onAction={onShowPriorities}
        >
          <MetricStateChip state={metrics.salesState} />
        </MxMetricCard>
        <MxMetricCard
          title="Atingimento"
          value={attainment}
          detail={attainmentDetail(metrics, periodLabel)}
          icon={Target}
          tone={metrics.attainmentState === 'value' && Number.parseFloat(attainment) >= 100 ? 'success' : 'warning'}
          actionLabel="Ver fila de prioridades"
          onAction={onShowPriorities}
        >
          <MetricStateChip state={metrics.attainmentState} />
        </MxMetricCard>
        <MxMetricCard
          title="Prioridades"
          value={metrics.critical}
          detail={`${metrics.critical} crítica(s) · ${metrics.attention} em atenção · ${periodLabel}`}
          icon={AlertTriangle}
          tone={metrics.critical > 0 ? 'danger' : metrics.attention > 0 ? 'warning' : 'success'}
          actionLabel="Abrir fila de prioridades"
          onAction={onShowPriorities}
        >
          <span className="text-xs font-medium text-muted-foreground">Triagem operacional</span>
        </MxMetricCard>
      </MxMetricGrid>

      <details className="rounded-xl border border-border-subtle bg-white text-sm shadow-sm">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-3 font-semibold text-foreground outline-none marker:hidden focus-visible:ring-2 focus-visible:ring-status-success/30">
          <Info size={16} className="shrink-0 text-status-info-text" aria-hidden="true" />
          Como ler os estados dos números
        </summary>
        <div className="grid gap-3 border-t border-border-subtle px-4 py-4 text-xs leading-5 text-muted-foreground sm:grid-cols-3">
          <p><strong className="text-foreground">Zero real:</strong> a fonte confirmou a leitura e o valor é zero.</p>
          <p><strong className="text-foreground">Sem configuração:</strong> a meta ainda não foi cadastrada; o percentual não é calculado.</p>
          <p><strong className="text-foreground">Sem dados:</strong> não houve leitura operacional confirmada para o período.</p>
        </div>
      </details>
    </section>
  )
}
