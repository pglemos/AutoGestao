import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Badge } from '@/components/atoms/Badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/molecules/Card'
import { Typography } from '@/components/atoms/Typography'
import type { NetworkMetrics } from '../data/types'

type Props = { metrics: NetworkMetrics; hasHistoricalData: boolean }

export function AdminSellOutEvolution({ metrics, hasHistoricalData }: Props) {
  return (
    <Card className="h-full border-none bg-white overflow-hidden">
      <CardHeader className="bg-surface-alt/30 border-b border-border p-mx-lg md:p-mx-10 flex flex-col md:flex-row md:items-center justify-between gap-mx-md">
        <div>
          <CardTitle className="text-xl md:text-2xl uppercase">Evolucao de Sell-out</CardTitle>
          <CardDescription className="uppercase tracking-widest font-bold text-mx-micro mt-1">
            Historico consolidado da rede | 180 dias
          </CardDescription>
        </div>
        <Badge
          variant={hasHistoricalData ? 'brand' : 'warning'}
          className="px-4 py-1.5 rounded-mx-full"
        >
          {hasHistoricalData ? 'MATRIX LIVE' : 'SEM HISTORICO'}
        </Badge>
      </CardHeader>
      <CardContent className="p-mx-10" style={{ height: 'var(--height-mx-chart)' }}>
        {metrics.byMonth.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 320, height: 360 }}>
            <AreaChart data={metrics.byMonth} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSalesExecutive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-brand-primary)" stopOpacity={0.24} />
                  <stop offset="95%" stopColor="var(--color-brand-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--color-border-default)"
              />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
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
              <Area
                type="monotone"
                dataKey="sales"
                stroke="var(--color-brand-primary)"
                strokeWidth={4}
                fillOpacity={1}
                fill="url(#colorSalesExecutive)"
                dot={{
                  r: 5,
                  fill: 'var(--color-brand-primary)',
                  strokeWidth: 3,
                  stroke: 'var(--color-chart-dot-stroke)',
                }}
                activeDot={{
                  r: 8,
                  fill: 'var(--color-brand-primary)',
                  stroke: 'var(--color-chart-dot-stroke)',
                  strokeWidth: 4,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full">
            <Typography variant="caption" tone="muted">
              Sem historico suficiente para montar grafico.
            </Typography>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default AdminSellOutEvolution
