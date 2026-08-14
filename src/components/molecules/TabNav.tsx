import * as React from 'react'
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

/**
 * Tablist underline canônico (FASE J 10.011/10.013).
 *
 * Padrão ARIA tabs com roving tabindex: apenas a aba ativa está na ordem de
 * tabulação (`tabIndex=0`), as demais ficam fora (`tabIndex=-1`) e as setas
 * (esquerda/direita, Home/End) movem a seleção e o foco — quem navega por
 * teclado não atravessa N abas para trocar de painel.
 */
export function TabNav<T extends string = string>({
  tabs,
  activeTab,
  onTabChange,
  className,
}: TabNavProps<T>) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const currentIndex = tabs.findIndex((tab) => tab.key === activeTab)

    const moveTo = (nextIndex: number) => {
      const normalized = (nextIndex + tabs.length) % tabs.length
      const target = tabs[normalized]
      if (!target) return
      onTabChange(target.key)
      // Roving tabindex: foca a aba recém-ativa. O DOM já contém todos os
      // botões (só o `tabIndex` muda), então a busca síncrona é segura.
      document.getElementById(`${String(target.key)}-tab`)?.focus()
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
      className={cn(
        'flex flex-wrap gap-mx-xs border-b border-border-subtle mb-mx-md overflow-visible',
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
            tabIndex={activeTab === key ? 0 : -1}
            aria-selected={activeTab === key}
            aria-controls={panelId}
            onClick={() => onTabChange(key)}
            onKeyDown={handleKeyDown}
            className={cn(
              'px-mx-md py-mx-sm text-label font-medium transition-all border-b-2 whitespace-nowrap',
              activeTab === key
                ? 'border-brand-primary text-status-success-text bg-brand-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-surface-alt'
            )}
          >
            {label}
          </button>
        )
      })}
    </nav>
  )
}
