import { MxMetricCard, MxMetricGrid } from '@/components/module/MxModuleVisualPrimitives'
import type { ReportMetric } from './types'

export function ReportMetricGrid({ metrics }: { metrics: ReportMetric[] }) {
  return (
    <MxMetricGrid>
      {metrics.map(metric => (
        <MxMetricCard
          key={metric.key}
          title={metric.title}
          value={metric.value}
          detail={metric.detail}
          icon={metric.icon}
          tone={metric.tone}
        />
      ))}
    </MxMetricGrid>
  )
}
