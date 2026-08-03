import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Layers3 } from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/molecules/Card'
import { formatPercent } from '../data/formatters'
import type { FunnelItem, NetworkMetrics } from '../data/types'

type Props = { funnelData: FunnelItem[]; metrics: NetworkMetrics }

export function AdminFunnelChart({ funnelData, metrics }: Props) {
  return (
    <Card className="border-none bg-white overflow-hidden">
      <CardHeader className="p-mx-lg">
        <CardTitle className="text-lg flex items-center gap-mx-sm">
          <Layers3 size={18} className="text-emerald-600" /> Funil agregado
        </CardTitle>
        <CardDescription>Leads ate vendas no historico</CardDescription>
      </CardHeader>
      <CardContent className="h-mx-80 p-mx-lg">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart data={funnelData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--color-border-default)"
            />
            <XAxis
              dataKey="name"
              tick={{ fill: 'var(--color-text-tertiary)', fontWeight: 900, fontSize: 10 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--color-text-tertiary)', fontWeight: 900, fontSize: 10 }}
            />
            <RechartsTooltip
              contentStyle={{
                backgroundColor: 'var(--color-mx-black)',
                borderRadius: 'var(--radius-mx-xl)',
                border: 'none',
                color: 'var(--color-chart-dot-stroke)',
                fontSize: '10px',
                fontWeight: 900,
                padding: '16px',
              }}
            />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {funnelData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-3 gap-mx-xs pt-mx-md border-t border-gray-100">
          <Badge variant="info" className="justify-center text-mx-nano">
            {formatPercent(metrics.convLeadAgd)} L-A
          </Badge>
          <Badge variant="warning" className="justify-center text-mx-nano">
            {formatPercent(metrics.convAgdVis)} A-V
          </Badge>
          <Badge variant="success" className="justify-center text-mx-nano">
            {formatPercent(metrics.convVisVnd)} V-V
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

export default AdminFunnelChart
