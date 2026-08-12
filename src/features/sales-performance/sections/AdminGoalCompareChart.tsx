import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Target } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/molecules/Card'
import type { StoreRow } from '../data/types'

type Props = { topStores: StoreRow[] }

export function AdminGoalCompareChart({ topStores }: Props) {
  return (
    <Card className="xl:col-span-7 border-none bg-white overflow-hidden">
      <CardHeader className="p-mx-lg">
        <CardTitle className="text-lg flex items-center gap-mx-sm">
          <Target size={18} className="text-status-success-text" /> Comparativo loja x meta
        </CardTitle>
        <CardDescription>
          As 10 maiores lojas com realizado historico e meta mensal vigente
        </CardDescription>
      </CardHeader>
      <CardContent className="h-mx-96 p-mx-lg">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 320, height: 344 }}>
          <BarChart data={topStores} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--color-border-default)"
            />
            <XAxis
              dataKey="storeName"
              tick={{ fill: 'var(--color-text-tertiary)', fontWeight: 900, fontSize: 9 }}
              interval={0}
              angle={-16}
              textAnchor="end"
              height={72}
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
            <Legend />
            <Bar dataKey="sales" name="Sell-out" radius={[6, 6, 0, 0]} fill="var(--color-brand-primary)" />
            <Bar dataKey="goal" name="Meta" radius={[6, 6, 0, 0]} fill="var(--color-status-info)" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export default AdminGoalCompareChart
