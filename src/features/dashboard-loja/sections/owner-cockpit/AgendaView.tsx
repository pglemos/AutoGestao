import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { cn } from '@/lib/utils'
import type { OwnerPerformanceAlert } from '../PerformanceAlerts'
import { toneClasses, type KpiTone } from './types'
import { SectionTitle } from './primitives'

export function AgendaView({ alerts }: { alerts: OwnerPerformanceAlert[] }) {
  const priorities = alerts.map((alert) => {
    let tone: KpiTone = 'info'
    if (alert.variant === 'success') tone = 'success'
    else if (alert.variant === 'danger') tone = 'danger'
    else if (alert.variant === 'warning') tone = 'warning'

    return {
      title: alert.title,
      detail: alert.description,
      tone,
    }
  })

  return (
    <div className="space-y-mx-md">
      <SectionTitle
        title="Prioridades operacionais"
        subtitle="Alertas calculados exclusivamente a partir dos indicadores atuais da loja."
      />
      <Card className="rounded-mx-2xl p-mx-lg">
        <div className="space-y-mx-sm">
          {priorities.length === 0 ? (
            <div className="owner-base44-exact__empty-state" role="status">
              <strong className="text-base font-black text-text-primary">Nenhuma prioridade calculada</strong>
              <p className="text-sm text-text-secondary">Não há alertas derivados dos dados atuais da loja.</p>
            </div>
          ) : (
            priorities.map((item, index) => {
              const classes = toneClasses[item.tone]
              return (
                <div key={`${item.title}-${index}`} className={cn('rounded-mx-xl border p-mx-md', classes.soft)}>
                  <Typography variant="p" className="font-black">{item.title}</Typography>
                  <Typography variant="tiny" className="mt-mx-xs block font-bold opacity-80">{item.detail}</Typography>
                </div>
              )
            })
          )}
        </div>
      </Card>
    </div>
  )
}
