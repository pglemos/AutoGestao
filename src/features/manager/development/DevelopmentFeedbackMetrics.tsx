import { CheckCircle2, Clock, MessageSquare, TrendingUp } from 'lucide-react'
import { MxMetricCard, MxMetricGrid } from '@/components/module/MxModuleVisualPrimitives'

export function DevelopmentFeedbackMetrics({ total, positive, development, pending }: { total: number; positive: number; development: number; pending: number }) {
  return (
    <MxMetricGrid>
      <MxMetricCard title="Feedbacks no período" value={total} detail="Registros após os filtros aplicados" icon={MessageSquare} />
      <MxMetricCard title="Positivos" value={positive} detail="Reconhecimentos registrados" icon={CheckCircle2} tone="success" />
      <MxMetricCard title="Desenvolvimento" value={development} detail="Orientações com pontos de atenção" icon={TrendingUp} tone="warning" />
      <MxMetricCard title="Aguardando ciência" value={pending} detail="Feedbacks ainda não confirmados" icon={Clock} tone="info" />
    </MxMetricGrid>
  )
}
