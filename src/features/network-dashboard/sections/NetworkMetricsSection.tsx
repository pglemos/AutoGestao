import { AlertTriangle, Building2, Target, TrendingUp } from 'lucide-react'
import { MxMetricCard, MxMetricGrid } from '@/components/module/MxModuleVisualPrimitives'

export function NetworkMetricsSection({ metrics }: { metrics: { stores: number; sales: number; goal: number; critical: number } }) {
  const attainment = metrics.goal > 0 ? (metrics.sales / metrics.goal) * 100 : 0
  return (
    <MxMetricGrid>
      <MxMetricCard title="Lojas ativas" value={metrics.stores} detail="Unidades incluídas na leitura" icon={Building2} />
      <MxMetricCard title="Vendas" value={metrics.sales} detail="Total no período selecionado" icon={TrendingUp} tone="success" />
      <MxMetricCard title="Atingimento" value={`${attainment.toFixed(1)}%`} detail={`${metrics.sales} de ${metrics.goal}`} icon={Target} tone={attainment >= 100 ? 'success' : 'warning'} />
      <MxMetricCard title="Prioridades" value={metrics.critical} detail="Lojas com ritmo ou disciplina crítica" icon={AlertTriangle} tone={metrics.critical > 0 ? 'danger' : 'success'} />
    </MxMetricGrid>
  )
}
