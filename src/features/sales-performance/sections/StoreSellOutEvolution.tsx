import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/atoms/Badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/molecules/Card'
import { Typography } from '@/components/atoms/Typography'

type Point = { month: string; sales: number }
type Props = { chartData: Point[] }

export function StoreSellOutEvolution({ chartData }: Props) {
  const [chartReady, setChartReady] = useState(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setChartReady(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <Card className="h-full border-none bg-white overflow-hidden">
      <CardHeader className="bg-surface-alt/30 border-b border-border p-mx-10 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-2xl uppercase">Evolução de Sell-out</CardTitle>
          <CardDescription className="uppercase tracking-widest font-bold text-mx-micro mt-1">
            VOLUME CONSOLIDADO MENSAL
          </CardDescription>
        </div>
        <Badge variant="brand" className="gap-2 px-4 py-1.5 rounded-mx-full">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full bg-current animate-pulse motion-reduce:animate-none"
            aria-hidden="true"
          />
          LIVE MATRIX
        </Badge>
      </CardHeader>
      <CardContent className="min-h-[280px] min-w-0 p-mx-10" style={{ height: 'var(--height-mx-chart, 280px)' }}>
        {chartData.length > 0 ? chartReady ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280} initialDimension={{ width: 320, height: 280 }}>
            <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-brand-primary)" stopOpacity={0.2} />
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
                fill="url(#colorSales)"
                dot={{
                  r: 6,
                  fill: 'var(--color-brand-primary)',
                  strokeWidth: 4,
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
          <div className="grid h-full min-h-[280px] place-items-center" role="status" aria-label="Preparando gráfico"><div className="h-full min-h-[240px] w-full animate-pulse rounded-xl bg-muted" /></div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <Typography variant="caption" tone="muted">
              Nenhum dado disponível.
            </Typography>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default StoreSellOutEvolution
