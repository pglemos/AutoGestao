import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NotificationBellButton } from '../NotificationBellButton'

type SellerPageHeaderProps = {
  title: ReactNode
  icon: LucideIcon
  actions?: ReactNode
  subtitle?: ReactNode
  className?: string
  variant?: 'light' | 'dark'
}

export function SellerPageHeader({ title, icon: Icon, actions, subtitle, className, variant }: SellerPageHeaderProps) {
  const isDark = variant === 'dark' || className?.includes('bg-[#071723]')

  return (
    <header
      className={cn(
        'flex min-h-16 w-full flex-col justify-center gap-3 rounded-2xl border border-border bg-white px-4 py-4 shadow-sm sm:px-6 lg:flex-row lg:items-center lg:justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Icon className="h-5 w-5 shrink-0 text-status-info-text" aria-hidden="true" />
        <div className="min-w-0">
          <h1 className="truncate text-h3 font-bold text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex w-full min-w-0 flex-wrap items-center gap-3 lg:w-auto lg:justify-end">
        {actions && <div className="flex w-full min-w-0 flex-wrap items-center gap-2 lg:w-auto">{actions}</div>}
        {process.env.NODE_ENV !== 'test' && (
          <div className="hidden sm:block">
            <NotificationBellButton variant={isDark ? 'dark' : 'light'} />
          </div>
        )}
      </div>
    </header>
  )
}
