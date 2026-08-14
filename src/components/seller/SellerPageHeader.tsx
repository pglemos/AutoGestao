import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { PageHeader } from '@/components/molecules/PageHeader'
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
  const isDark = variant === 'dark' || className?.includes('bg-mx-navy')

  return <PageHeader
    title={title}
    icon={Icon}
    description={subtitle}
    titleVariant="h3"
    descriptionVariant="p"
    titleClassName="truncate font-bold text-foreground"
    descriptionClassName="mt-0.5 text-sm"
    className={className}
    actions={(
      <>
        {actions}
        {process.env.NODE_ENV !== 'test' && (
          <div className="hidden sm:block">
            <NotificationBellButton variant={isDark ? 'dark' : 'light'} />
          </div>
        )}
      </>
    )}
  />
}
