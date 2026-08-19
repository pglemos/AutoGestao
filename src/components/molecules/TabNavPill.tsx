import { useRef } from 'react'
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

/**
 * Tablist pill canônico (FASE J 10.011/10.013).
 *
 * Padrão ARIA tabs com roving tabindex: apenas a aba ativa está na ordem de
 * tabulação (`tabIndex=0`), as demais ficam fora (`tabIndex=-1`) e as setas
 * (esquerda/direita, Home/End) movem a seleção e o foco. A busca do alvo usa
 * `data-tab-key` escopado ao próprio `<nav>` (ref), sem `id` global — dois
 * tablists na mesma tela podem compartilhar chaves sem colidir.
 */
export function TabNavPill<T extends string = string>({
  tabs,
  activeTab,
  onTabChange,
  className,
  buttonClassName,
  'aria-label': ariaLabel,
}: TabNavPillProps<T>) {
  const navRef = useRef<HTMLElement>(null)

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const currentIndex = tabs.findIndex((tab) => tab.key === activeTab)

    const moveTo = (nextIndex: number) => {
      const normalized = (nextIndex + tabs.length) % tabs.length
      const target = tabs[normalized]
      if (!target) return
      onTabChange(target.key)
      // Roving tabindex: foca a aba recém-ativa dentro do próprio tablist.
      navRef.current
        ?.querySelector<HTMLButtonElement>(`[data-tab-key="${String(target.key)}"]`)
        ?.focus()
    }

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault()
        moveTo(currentIndex + 1)
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault()
        moveTo(currentIndex - 1)
        break
      case 'Home':
        event.preventDefault()
        moveTo(0)
        break
      case 'End':
        event.preventDefault()
        moveTo(tabs.length - 1)
        break
    }
  }

  return (
    <nav
      ref={navRef}
      className={cn(
        'grid w-full max-w-full [grid-template-columns:repeat(auto-fit,minmax(6.75rem,1fr))] bg-white p-mx-tiny rounded-2xl border border-border shadow-sm gap-mx-tiny sm:flex sm:w-auto sm:flex-nowrap sm:rounded-mx-full',
        className
      )}
      role="tablist"
      aria-label={ariaLabel}
    >
      {tabs.map(({ key, label, mobileLabel, icon: Icon, badge }) => (
        <Button
          key={key}
          variant={activeTab === key ? 'outline' : 'ghost'}
          size="sm"
          onClick={() => onTabChange(key)}
          role="tab"
          tabIndex={activeTab === key ? 0 : -1}
          data-tab-key={String(key)}
          aria-selected={activeTab === key}
          onKeyDown={handleKeyDown}
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
            <span className="absolute -top-1 -right-1 w-mx-xs h-mx-xs bg-status-error text-status-error-foreground rounded-full flex items-center justify-center text-mx-tiny shadow-sm border-2 border-white">
              {badge}
            </span>
          )}
        </Button>
      ))}
    </nav>
  )
}
