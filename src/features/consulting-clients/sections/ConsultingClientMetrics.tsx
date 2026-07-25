import { Activity, Building2, CheckCircle2, TrendingUp } from 'lucide-react'
import { MxMetricCard, MxMetricGrid } from '@/components/module/MxModuleVisualPrimitives'

export function ConsultingClientMetrics({ metrics }: { metrics: Record<string, number> }) {
  const total = Number(metrics.total || metrics.total_clients || 0)
  const active = Number(metrics.active || metrics.active_clients || 0)
  const visits = Number(metrics.visits || metrics.total_visits || 0)
  const health = Number(metrics.health || metrics.health_percentage || 0)
  return <MxMetricGrid><MxMetricCard title="Clientes" value={total} detail="Carteira consultiva" icon={Building2} /><MxMetricCard title="Ativos" value={active} detail="Programas em andamento" icon={CheckCircle2} tone="success" /><MxMetricCard title="Visitas" value={visits} detail="Ritual registrado" icon={Activity} tone="info" /><MxMetricCard title="Saúde" value={`${health.toFixed(0)}%`} detail="Regularidade da carteira" icon={TrendingUp} tone={health >= 80 ? 'success' : 'warning'} /></MxMetricGrid>
}
