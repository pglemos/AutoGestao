import { Database, Gauge, Target, Zap } from 'lucide-react'
import { motion } from 'motion/react'
import { Badge } from '@/components/atoms/Badge'
import { Card } from '@/components/molecules/Card'
import { Typography } from '@/components/atoms/Typography'
import { cn } from '@/lib/utils'
import { formatNumber, formatPercent } from '../data/formatters'
import type { NetworkMetrics } from '../data/types'

type Props = { metrics: NetworkMetrics }

export function AdminKpiCards({ metrics }: Props) {
  const stats = [
    {
      title: 'Sell-out Historico',
      value: formatNumber(metrics.historicalSales),
      trend: `${metrics.historicalCheckins} lancamentos`,
      icon: Zap,
      color: 'brand' as const,
    },
    {
      title: 'Meta Consolidada',
      value: formatNumber(metrics.networkGoal),
      trend: `${metrics.configuredGoalStores} lojas com meta`,
      icon: Target,
      color: 'info' as const,
    },
    {
      title: 'Mes Atual',
      value: formatNumber(metrics.currentMonthSales),
      trend: formatPercent(metrics.reaching),
      icon: Gauge,
      color: (metrics.reaching >= 80 ? 'success' : 'warning') as 'success' | 'warning',
    },
    {
      title: 'Cobertura de Dados',
      value: formatPercent(metrics.disciplineRate),
      trend: `${metrics.storesWithSales}/${metrics.activeStoreCount} lojas com venda`,
      icon: Database,
      color: 'success' as const,
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-mx-md shrink-0">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <Card className="p-mx-lg border-none hover:shadow-sm transition-all group relative overflow-hidden bg-white min-h-mx-36">
            <div className="flex items-center gap-mx-md relative z-10">
              <div
                className={cn(
                  'w-mx-14 h-mx-14 rounded-2xl flex items-center justify-center border shadow-none transition-transform group-hover:scale-110',
                  stat.color === 'brand'
                    ? 'bg-mx-indigo-50 border-mx-indigo-100 text-status-success-text'
                    : stat.color === 'info'
                      ? 'bg-status-info-surface border-status-info/20 text-status-info-text'
                      : stat.color === 'warning'
                        ? 'bg-status-warning-surface border-status-warning/20 text-status-warning-text'
                        : 'bg-status-success-surface border-mx-emerald-100 text-status-success-text',
                )}
              >
                <stat.icon size={24} strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <Typography
                  variant="caption"
                  tone="muted"
                  className="mb-1 block text-mx-micro"
                >
                  {stat.title}
                </Typography>
                <Typography variant="h1" className="text-3xl tabular-nums leading-none">
                  {stat.value}
                </Typography>
                <Badge
                  variant={
                    stat.color === 'warning'
                      ? 'warning'
                      : stat.color === 'info'
                        ? 'info'
                        : stat.color === 'success'
                          ? 'success'
                          : 'brand'
                  }
                  className="text-mx-micro px-3 py-1 mt-3 shadow-sm"
                >
                  {stat.trend}
                </Badge>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}

export default AdminKpiCards
