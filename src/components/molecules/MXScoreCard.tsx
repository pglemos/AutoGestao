import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { Skeleton } from '@/components/atoms/Skeleton'

export interface MXScoreCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  value: string | number
  sub: string
  icon: LucideIcon
  tone: 'brand' | 'success' | 'warning' | 'error'
  description?: string
  isHighlight?: boolean
}

const MXScoreCardInner = React.forwardRef<HTMLDivElement, MXScoreCardProps>(
  ({ label, value, sub, icon: Icon, tone, description, isHighlight, className, ...props }, ref) => {
    return (
      <Card
        ref={ref}
        className={cn(
          "p-mx-lg border-none shadow-sm group hover:shadow-sm transition-all bg-white",
          isHighlight && "ring-2 ring-brand-primary/20 shadow-mx-glow-brand",
          className
        )}
        aria-label={description}
        {...props}
      >
        <div className="flex items-center justify-between">
          <div className="space-y-mx-tiny">
            <Typography variant="caption" tone="muted" className="block text-mx-micro">{label}</Typography>
            <div className="flex items-baseline gap-mx-xs">
                <Typography variant="h1" className="text-4xl tabular-nums leading-none">{value}</Typography>
                <Typography variant="caption" tone="muted" className="text-mx-micro">{sub}</Typography>
            </div>
          </div>
          <div className={cn(
            'h-mx-xl w-mx-xl rounded-2xl flex items-center justify-center border shadow-none transition-transform group-hover:scale-110',
            tone === 'brand' ? 'bg-mx-green-50 border-mx-green-200 text-mx-green-700' :
            tone === 'success' ? 'bg-status-success-surface border-mx-emerald-100 text-status-success' :
            tone === 'warning' ? 'bg-status-warning-surface border-mx-amber-100 text-status-warning' :
            'bg-status-error-surface border-mx-red-100 text-status-error'
          )}>
            <Icon size={22} strokeWidth={2} />
          </div>
        </div>
      </Card>
    )
  }
)
MXScoreCardInner.displayName = "MXScoreCard"

function MXScoreCardSkeleton() {
  return (
    <Card className="p-mx-lg border-none bg-white overflow-hidden relative">
      <div className="flex items-center justify-between">
        <div className="space-y-mx-sm flex-1">
          <Skeleton className="h-mx-xs w-mx-20" />
          <div className="flex items-baseline gap-mx-xs">
            <Skeleton className="h-mx-lg w-mx-10" />
            <Skeleton className="h-mx-xs w-mx-14" />
          </div>
        </div>
        <Skeleton className="h-mx-xl w-mx-xl rounded-2xl" />
      </div>
    </Card>
  )
}

export const MXScoreCard = Object.assign(MXScoreCardInner, { Skeleton: MXScoreCardSkeleton })
