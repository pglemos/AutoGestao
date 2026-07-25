import { AlertTriangle, Calendar, Clock, FileText } from 'lucide-react'
import { MxMetricCard, MxMetricGrid } from '@/components/module/MxModuleVisualPrimitives'

export function DevelopmentPdiMetrics({ reviews, active, overdue, overdueActions }: { reviews: number; active: number; overdue: number; overdueActions: number }) {
  return (
    <MxMetricGrid>
      <MxMetricCard title="Revisões a realizar" value={reviews} detail="Revisões futuras dos planos ativos" icon={Calendar} tone="info" />
      <MxMetricCard title="PDIs ativos" value={active} detail="Planos em acompanhamento" icon={FileText} tone="success" />
      <MxMetricCard title="Acompanhamentos atrasados" value={overdue} detail="Planos com revisão vencida" icon={AlertTriangle} tone="warning" />
      <MxMetricCard title="Ações vencidas" value={overdueActions} detail="Compromissos ainda não concluídos" icon={Clock} tone="danger" />
    </MxMetricGrid>
  )
}
