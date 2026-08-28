import {
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts'
import { UsersRound } from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/molecules/Card'
import { getChartPalette } from '../data/formatters'
import type { NetworkMetrics, RoleItem } from '../data/types'

type Props = { roleData: RoleItem[]; metrics: NetworkMetrics }

export function AdminPeopleChart({ roleData, metrics }: Props) {
  const palette = getChartPalette()
  return (
    <Card className="border-none bg-white overflow-hidden">
      <CardHeader className="p-mx-lg">
        <CardTitle className="text-lg flex items-center gap-mx-sm">
          <UsersRound size={18} className="text-status-success-text" /> Pessoas e papeis
        </CardTitle>
        <CardDescription>Donos, gerentes, vendedores e equipe MX</CardDescription>
      </CardHeader>
      <CardContent className="h-mx-80 p-mx-lg">
        <ResponsiveContainer width="100%" height="70%" minWidth={0} minHeight={0} initialDimension={{ width: 320, height: 196 }}>
          <RechartsPieChart>
            <Pie
              data={roleData}
              dataKey="value"
              nameKey="name"
              innerRadius={54}
              outerRadius={86}
              paddingAngle={3}
            >
              {roleData.map((entry, index) => (
                <Cell key={entry.name} fill={palette[index % palette.length]} />
              ))}
            </Pie>
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
          </RechartsPieChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-2 gap-mx-xs">
          <Badge variant="outline" className="justify-center">
            {metrics.owners} donos
          </Badge>
          <Badge variant="outline" className="justify-center">
            {metrics.managers} gerentes
          </Badge>
          <Badge variant="outline" className="justify-center">
            {metrics.sellers} vendedores
          </Badge>
          <Badge variant="outline" className="justify-center">
            {metrics.internalUsers} MX
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

export default AdminPeopleChart
