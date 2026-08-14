import type { LucideIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { Typography } from '@/components/atoms/Typography'
import { cn } from '@/lib/utils'

export type TeamStat = {
  label: string
  shortLabel: string
  value: number
  icon: LucideIcon
  tone: string
  color: string
}

export function TeamStatsGrid({ stats }: { stats: TeamStat[] }) {
  return (
    <div className="grid grid-cols-4 gap-mx-xs md:gap-mx-lg shrink-0 mt-mx-md">
      {stats.map((item, idx) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
          className="p-mx-xs sm:p-mx-lg rounded-2xl sm:rounded-mx-4xl bg-white border border-border relative overflow-hidden group shadow-sm hover:shadow-sm transition-all h-mx-16 sm:h-mx-24 flex items-center"
        >
          <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50 group-hover:opacity-70 transition-opacity", item.color)} />
          <div className="flex items-center justify-between relative z-[var(--mx-z-sticky)] w-full">
            <div className="space-y-0.5 min-w-0">
              <Typography variant="tiny" tone="muted" className="block text-mx-nano opacity-60 truncate">
                <span className="sm:hidden">{item.shortLabel}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </Typography>
              <Typography variant="h1" className="text-2xl sm:text-3xl tabular-nums leading-none font-mono-numbers">{item.value}</Typography>
            </div>
            <div className={cn(
              "hidden sm:flex w-mx-12 h-mx-12 rounded-2xl items-center justify-center bg-white shadow-sm border border-border text-muted-foreground transition-all group-hover:rotate-6 group-hover:border-brand-primary/20 group-hover:text-status-success-text",
              item.tone === 'brand' && "text-status-success-text"
            )}>
              <item.icon size={20} strokeWidth={2} />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
