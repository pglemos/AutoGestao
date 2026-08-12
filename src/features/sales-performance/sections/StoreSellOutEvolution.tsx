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

type Point = { month: string; sales: number }
type Props = { chartData: Point[] }

export function StoreSellOutEvolution({ chartData }: Props) {
  return (
    <Card className="h-full border-none bg-white overflow-hidden">
      <CardHeader className="bg-gray-50/30 border-b border-border p-mx-10 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-2xl uppercase">Evolução de Sell-out</CardTitle>
          <CardDescription className="uppercase tracking-widest font-bold text-mx-micro mt-1 opacity-60">
            VOLUME CONSOLIDADO MENSAL
          </CardDescription>
        </div>
        <Badge variant="brand" className="animate-pulse px-4 py-1.5 rounded-mx-full">
          LIVE MATRIX
        </Badge>
      </CardHeader>
      <CardContent className="p-mx-10" style={{ height: 'var(--height-mx-chart)' }}>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
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
