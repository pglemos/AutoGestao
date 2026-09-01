import { AlertTriangle, Building2, Target, TrendingUp } from 'lucide-react'
import { MxMetricCard, MxMetricGrid } from '@/components/module/MxModuleVisualPrimitives'

export function NetworkMetricsSection({ metrics, periodLabel, onShowPriorities }: {
  metrics: { stores: number; sales: number; goal: number; critical: number }
  periodLabel: string
  onShowPriorities: () => void
}) {
  const attainment = metrics.goal > 0 ? (metrics.sales / metrics.goal) * 100 : null
  return (
    <MxMetricGrid>
      <MxMetricCard
        title="Lojas ativas"
        value={metrics.stores}
        detail={metrics.stores ? `${metrics.stores} unidade(s) no escopo · ${periodLabel}` : 'Nenhuma loja no escopo'}
        icon={Building2}
        actionLabel="Ver lojas por resultado"
        onAction={onShowPriorities}
      />
      <MxMetricCard
        title="Vendas"
        value={metrics.sales}
        detail={`${metrics.sales} venda(s) confirmada(s) · ${periodLabel}`}
        icon={TrendingUp}
        tone="success"
        actionLabel="Ver vendas por loja"
        onAction={onShowPriorities}
      />
      <MxMetricCard
        title="Atingimento"
        value={attainment == null ? '—' : `${attainment.toFixed(1)}%`}
        detail={metrics.goal > 0 ? `${metrics.sales} de ${metrics.goal} vendas · ${periodLabel}` : `Meta não configurada · ${periodLabel}`}
        icon={Target}
        tone={attainment != null && attainment >= 100 ? 'success' : 'warning'}
        actionLabel="Ver gap por loja"
        onAction={onShowPriorities}
      />
      <MxMetricCard
        title="Prioridades"
        value={metrics.critical}
        detail={metrics.critical ? `${metrics.critical} loja(s) com ritmo ou disciplina crítica` : 'Nenhuma prioridade crítica na leitura'}
        icon={AlertTriangle}
        tone={metrics.critical > 0 ? 'danger' : 'success'}
        actionLabel="Abrir fila de prioridades"
        onAction={onShowPriorities}
      />
    </MxMetricGrid>
  )
}
