import { BriefcaseBusiness } from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/molecules/Card'
import { Typography } from '@/components/atoms/Typography'
import { getChartPalette } from '../data/formatters'
import type { ConsultingItem, NetworkMetrics } from '../data/types'

type Props = { consultingData: ConsultingItem[]; metrics: NetworkMetrics }

export function AdminConsultingCard({ consultingData, metrics }: Props) {
  const palette = getChartPalette()
  return (
    <Card className="border-none bg-white overflow-hidden">
      <CardHeader className="p-mx-lg">
        <CardTitle className="text-lg flex items-center gap-mx-sm">
          <BriefcaseBusiness size={18} className="text-brand-primary" /> Consultoria MX
        </CardTitle>
        <CardDescription>Clientes, visitas e execucao PMR</CardDescription>
      </CardHeader>
      <CardContent className="p-mx-lg flex flex-col gap-mx-md">
        <div className="grid grid-cols-2 gap-mx-md">
          <div className="p-mx-md rounded-mx-2xl bg-surface-alt border border-border-subtle">
            <Typography variant="tiny" tone="muted" className="">
              Clientes
            </Typography>
            <Typography variant="h1" className="text-4xl tabular-nums">
              {metrics.consultingClients}
            </Typography>
          </div>
          <div className="p-mx-md rounded-mx-2xl bg-surface-alt border border-border-subtle">
            <Typography variant="tiny" tone="muted" className="">
              Visitas
            </Typography>
            <Typography variant="h1" className="text-4xl tabular-nums">
              {metrics.consultingVisits}
            </Typography>
          </div>
        </div>
        <div className="space-y-mx-sm">
          {consultingData.map((item, index) => (
            <div key={item.name} className="flex items-center justify-between gap-mx-sm">
              <div className="flex items-center gap-mx-sm min-w-0">
                <span
                  className="w-mx-xs h-mx-xs rounded-full shrink-0"
                  style={{ backgroundColor: palette[index % palette.length] }}
                />
                <Typography variant="tiny" className="truncate">
                  {item.name}
                </Typography>
              </div>
              <Badge variant="outline" className="text-mx-nano">
                {String(item.value)}
              </Badge>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-mx-sm mt-auto pt-mx-md border-t border-border-subtle">
          <Badge variant="success" className="justify-center text-mx-nano">
            {metrics.completedConsultingVisits} concluidas
          </Badge>
          <Badge variant="info" className="justify-center text-mx-nano">
            {metrics.plannedConsultingVisits} abertas
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

export default AdminConsultingCard
