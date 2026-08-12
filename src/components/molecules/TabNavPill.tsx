import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/atoms/Button'

export interface TabNavPillItem<T extends string = string> {
  key: T
  label: string
  mobileLabel?: string
  icon?: LucideIcon
  badge?: number
}

interface TabNavPillProps<T extends string = string> {
  tabs: TabNavPillItem<T>[]
  activeTab: T
  onTabChange: (tab: T) => void
  className?: string
  buttonClassName?: string
  'aria-label'?: string
}

export function TabNavPill<T extends string = string>({
  tabs,
  activeTab,
  onTabChange,
  className,
  buttonClassName,
  'aria-label': ariaLabel,
}: TabNavPillProps<T>) {
  return (
    <nav
      className={cn(
        'grid w-full max-w-full [grid-template-columns:repeat(auto-fit,minmax(6.75rem,1fr))] bg-white p-mx-tiny rounded-2xl border border-gray-200 shadow-sm gap-mx-tiny sm:flex sm:w-auto sm:flex-nowrap sm:rounded-mx-full',
        className
      )}
      role="tablist"
      aria-label={ariaLabel}
    >
      {tabs.map(({ key, label, mobileLabel, icon: Icon, badge }) => (
        <Button
          key={key}
          variant={activeTab === key ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => onTabChange(key)}
          role="tab"
          aria-selected={activeTab === key}
          className={cn(
            'relative h-mx-10 w-full px-3 sm:w-auto sm:px-6 rounded-mx-full text-label font-medium shrink-0',
            buttonClassName
          )}
        >
          {Icon && <Icon size={14} className="mr-1.5 shrink-0" />}
          {mobileLabel ? (
            <>
              <span className="sm:hidden">{mobileLabel}</span>
              <span className="hidden sm:inline">{label}</span>
            </>
          ) : label}
          {badge !== undefined && badge > 0 && (
            <span className="absolute -top-1 -right-1 w-mx-xs h-mx-xs bg-status-error text-white rounded-full flex items-center justify-center text-mx-tiny shadow-sm border-2 border-white animate-bounce">
              {badge}
            </span>
          )}
        </Button>
      ))}
    </nav>
  )
}
