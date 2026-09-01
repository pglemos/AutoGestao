import { AlertTriangle, Building2, CircleAlert, CircleCheck, CircleHelp, CircleX, Info, Target, TrendingUp, type LucideIcon } from 'lucide-react'
import { MxMetricCard, MxMetricGrid } from '@/components/module/MxModuleVisualPrimitives'
import type { NetworkDashboardMetrics, NetworkMetricState } from '../types'

const stateCopy: Record<NetworkMetricState, { label: string; className: string; icon: LucideIcon }> = {
  value: { label: 'Leitura disponível', className: 'bg-status-success-surface text-status-success-text', icon: CircleCheck },
  zero: { label: 'Zero confirmado', className: 'bg-status-info-surface text-status-info-text', icon: CircleCheck },
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

function formatCount(value: number): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

function countLabel(value: number, singular: string, plural: string): string {
  return `${formatCount(value)} ${value === 1 ? singular : plural}`
}

function nonZeroLabels(labels: Array<string | null>): string {
  return labels.filter((label): label is string => Boolean(label)).join(' · ')
}

function salesDetail(metrics: NetworkDashboardMetrics, periodLabel: string): string {
  if (metrics.salesState === 'no_data') return `Nenhuma fonte operacional confirmou leitura · ${periodLabel}`
  if (metrics.salesState === 'unknown') return `A fonte não confirmou a disponibilidade da leitura · ${periodLabel}`
  if (metrics.salesState === 'partial') {
    const qualifiers = nonZeroLabels([
      metrics.storesWithoutData > 0 ? countLabel(metrics.storesWithoutData, 'loja sem leitura', 'lojas sem leitura') : null,
      metrics.storesWithUnknownData > 0 ? countLabel(metrics.storesWithUnknownData, 'loja sem confirmação', 'lojas sem confirmação') : null,
    ])
    return `${countLabel(metrics.sales, 'venda confirmada', 'vendas confirmadas')}${qualifiers ? ` · ${qualifiers}` : ''} · ${periodLabel}`
  }
  return `${countLabel(metrics.sales, 'venda confirmada', 'vendas confirmadas')} · ${periodLabel}`
}

function attainmentDetail(metrics: NetworkDashboardMetrics, periodLabel: string): string {
  if (metrics.attainmentState === 'not_configured') return `${countLabel(metrics.storesWithoutGoal, 'loja sem meta mensal', 'lojas sem meta mensal')} · ${periodLabel}`
  if (metrics.attainmentState === 'unknown') return metrics.storesWithUnknownGoal > 0
    ? `${countLabel(metrics.storesWithUnknownGoal, 'loja sem configuração de meta confirmada', 'lojas sem configuração de meta confirmada')} · ${periodLabel}`
    : `A disponibilidade da leitura não foi confirmada · ${periodLabel}`
  if (metrics.attainmentState === 'no_data') return `Meta cadastrada, mas sem leitura operacional confirmada · ${periodLabel}`
  if (metrics.goal === 0) return `Meta não configurada · ${periodLabel}`
  if (metrics.attainmentState === 'partial') {
    const qualifiers = nonZeroLabels([
      metrics.storesWithoutGoal > 0 ? countLabel(metrics.storesWithoutGoal, 'loja sem meta', 'lojas sem meta') : null,
      metrics.storesWithUnknownGoal > 0 ? countLabel(metrics.storesWithUnknownGoal, 'loja sem confirmação', 'lojas sem confirmação') : null,
    ])
    return `${formatCount(metrics.sales)} de ${formatCount(metrics.goal)} vendas${qualifiers ? ` · ${qualifiers}` : ''} · ${periodLabel}`
  }
  return `${formatCount(metrics.sales)} de ${formatCount(metrics.goal)} vendas · ${periodLabel}`
}

function salesValue(metrics: NetworkDashboardMetrics): string | number {
  return metrics.salesState === 'no_data' || metrics.salesState === 'unknown' ? '—' : formatCount(metrics.sales)
}

function attainmentValue(metrics: NetworkDashboardMetrics): string {
  if (metrics.attainmentState === 'no_data' || metrics.attainmentState === 'unknown' || metrics.attainmentState === 'not_configured' || metrics.goal <= 0) return '—'
  // Base incompleta não vira percentual: um número calculado sobre parte da
  // rede, exibido com peso máximo, é exatamente o que "dados que não mentem"
  // proíbe. O vazio informado vale mais que o falso preciso.
  if (metrics.attainmentState === 'partial') return '—'
  return `${((metrics.sales / metrics.goal) * 100).toFixed(1)}%`
}

/** Quantas lojas ficaram fora do cálculo do atingimento. */
function attainmentBaseNote(metrics: NetworkDashboardMetrics): string | null {
  if (metrics.attainmentState !== 'partial') return null
  const missing = metrics.storesWithoutGoal + metrics.storesWithUnknownGoal
  if (missing <= 0) return null
  return `Sem base confiável · ${formatCount(missing)} de ${formatCount(metrics.stores)} lojas sem meta`
}

export function NetworkMetricsSection({ metrics, periodLabel, onShowPriorities, onConfigureGoals }: {
  metrics: NetworkDashboardMetrics
  periodLabel: string
  onShowPriorities: () => void
  onConfigureGoals?: () => void
}) {
  const attainment = attainmentValue(metrics)
  const baseNote = onConfigureGoals ? attainmentBaseNote(metrics) : null
  const priorityCount = metrics.critical + metrics.attention
  const priorityDetail = nonZeroLabels([
    metrics.critical > 0 ? countLabel(metrics.critical, 'loja crítica', 'lojas críticas') : null,
    metrics.attention > 0 ? countLabel(metrics.attention, 'loja em atenção', 'lojas em atenção') : null,
  ]) || 'Nenhuma prioridade na leitura'

  return (
    <section aria-labelledby="network-metrics-title" className="space-y-3">
      <h2 id="network-metrics-title" className="sr-only">Resumo do cockpit operacional</h2>
      <MxMetricGrid>
        <MxMetricCard
          title="Lojas ativas"
          value={metrics.stores}
          detail={`${countLabel(metrics.stores, 'unidade no escopo', 'unidades no escopo')} · ${periodLabel}`}
          icon={Building2}
          actionLabel="Abrir fila por prioridade"
          onAction={onShowPriorities}
        >
          <span className="text-xs font-medium text-muted-foreground">Escopo carregado</span>
        </MxMetricCard>
        <MxMetricCard
          title="Vendas"
          value={salesValue(metrics)}
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
          detail={baseNote ?? attainmentDetail(metrics, periodLabel)}
          icon={Target}
          tone={metrics.attainmentState === 'value' && Number.parseFloat(attainment) >= 100 ? 'success' : 'warning'}
          actionLabel={baseNote ? 'Configurar metas' : 'Ver fila de prioridades'}
          onAction={baseNote ? onConfigureGoals : onShowPriorities}
        >
          <MetricStateChip state={metrics.attainmentState} />
        </MxMetricCard>
        <MxMetricCard
          title="Prioridades"
          value={priorityCount}
          detail={`${priorityDetail} · ${periodLabel}`}
          icon={AlertTriangle}
          tone={priorityCount > 0 ? metrics.critical > 0 ? 'danger' : 'warning' : 'success'}
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
        <div className="grid gap-3 border-t border-border-subtle px-4 py-4 text-xs leading-5 text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
          <p><strong className="text-foreground">Zero confirmado:</strong> a fonte confirmou a leitura e o valor é zero.</p>
          <p><strong className="text-foreground">Sem configuração:</strong> a meta ainda não foi cadastrada; o percentual não é calculado.</p>
          <p><strong className="text-foreground">Sem dados:</strong> não houve leitura operacional confirmada para o período.</p>
          <p><strong className="text-foreground">Não confirmado:</strong> a fonte não trouxe qualidade suficiente para validar o número.</p>
        </div>
      </details>
    </section>
  )
}
