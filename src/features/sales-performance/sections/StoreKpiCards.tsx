import { Target, TrendingUp, Zap } from 'lucide-react'
import { motion } from 'motion/react'
import { Badge } from '@/components/atoms/Badge'
import { Card } from '@/components/molecules/Card'
import { Typography } from '@/components/atoms/Typography'
import { cn } from '@/lib/utils'

type StoreMetrics = {
  currentSales: number
  teamGoal: number
  projection: number
  reaching: number
}

type Props = { metrics: StoreMetrics }

export function StoreKpiCards({ metrics }: Props) {
  const stats = [
    {
      title: 'Volume Bruto',
      value: metrics.currentSales,
      trend: `${metrics.reaching}%`,
      icon: Zap,
      tone: 'brand' as const,
    },
    {
      title: 'Meta Mensal',
      value: metrics.teamGoal,
      trend: 'Alvo',
      icon: Target,
      tone: 'info' as const,
    },
    {
      title: 'Projeção MX',
      value: metrics.projection,
      trend: 'Predictive',
      icon: TrendingUp,
      tone: 'success' as const,
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-mx-lg shrink-0">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <Card className="p-mx-lg border-none hover:shadow-sm transition-all group relative overflow-hidden bg-white">
            <div className="absolute top-mx-0 right-mx-0 w-mx-3xl h-mx-3xl bg-brand-primary/5 rounded-mx-full blur-3xl -mr-12 -mt-12" />
            <div className="flex items-center gap-mx-md relative z-10">
              <div
                className={cn(
                  'w-mx-14 h-mx-14 rounded-2xl flex items-center justify-center border shadow-none transition-transform group-hover:scale-110',
                  stat.tone === 'brand'
                    ? 'bg-brand-primary-subtle border-brand-primary/20 text-status-success-text'
                    : stat.tone === 'info'
                      ? 'bg-status-info-surface border-status-info/20 text-status-info-text'
                      : 'bg-status-success-surface border-mx-emerald-100 text-status-success-text',
                )}
              >
                <stat.icon size={24} strokeWidth={2} />
              </div>
              <div className="flex-1">
                <Typography
                  variant="caption"
                  tone="muted"
                  className="mb-1 block text-mx-micro"
                >
                  {stat.title}
                </Typography>
                <div className="flex items-center justify-between">
                  <Typography variant="h1" className="text-3xl tabular-nums leading-none">
                    {stat.value}
                  </Typography>
                  <Badge
                    variant={stat.tone}
                    className="text-mx-micro px-3 py-1 shadow-sm"
                  >
                    {stat.trend}
                  </Badge>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}

export default StoreKpiCards
