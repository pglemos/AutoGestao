import { cn } from '@/lib/utils'

export interface TabNavItem<T extends string = string> {
  key: T
  label: string
  controls?: string
}

interface TabNavProps<T extends string = string> {
  tabs: TabNavItem<T>[]
  activeTab: T
  onTabChange: (tab: T) => void
  className?: string
}

export function TabNav<T extends string = string>({
  tabs,
  activeTab,
  onTabChange,
  className,
}: TabNavProps<T>) {
  return (
    <nav
      className={cn(
        'flex flex-wrap gap-mx-xs border-b border-gray-100 mb-mx-md overflow-visible',
        className
      )}
      role="tablist"
    >
      {tabs.map(({ key, label, controls }) => {
        const tabId = `${String(key)}-tab`
        const panelId = controls ?? `${String(key)}-panel`

        return (
          <button
            key={key}
            id={tabId}
            type="button"
            role="tab"
            aria-selected={activeTab === key}
            aria-controls={panelId}
            onClick={() => onTabChange(key)}
            className={cn(
              'px-mx-md py-mx-sm text-label font-medium transition-all border-b-2 whitespace-nowrap',
              activeTab === key
                ? 'border-brand-primary text-status-success-text bg-emerald-600/5'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            )}
          >
            {label}
          </button>
        )
      })}
    </nav>
  )
}
