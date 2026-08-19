import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TabNavItem<T extends string = string> {
  key: T
  label: string
  controls?: string
  disabled?: boolean
}

interface TabNavProps<T extends string = string> {
  tabs: TabNavItem<T>[]
  activeTab: T
  onTabChange: (tab: T) => void
  className?: string
  /** Scroll horizontal em vez de quebra de linha em mobile (10.014). */
  scrollable?: boolean
}

/**
 * Tablist underline canônico (FASE J 10.011/10.013/10.014).
 *
 * Padrão ARIA tabs com roving tabindex: apenas a aba ativa está na ordem de
 * tabulação (`tabIndex=0`), as demais ficam fora (`tabIndex=-1`) e as setas
 * (esquerda/direita, Home/End) movem a seleção e o foco — quem navega por
 * teclado não atravessa N abas para trocar de painel.
 *
 * Tabs `disabled` ficam fora da navegação (roving pula) e do clique.
 * `scrollable` troca o wrap por `overflow-x-auto` (padrão de tabs em mobile
 * com muitas abas).
 */
export function TabNav<T extends string = string>({
  tabs,
  activeTab,
  onTabChange,
  className,
  scrollable = false,
}: TabNavProps<T>) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const currentIndex = tabs.findIndex((tab) => tab.key === activeTab)

    const moveTo = (nextIndex: number) => {
      let index = nextIndex
      // Roving pulando abas disabled: anda até achar uma aba habilitada.
      for (let step = 0; step < tabs.length; step += 1) {
        const normalized = (index + tabs.length) % tabs.length
        const target = tabs[normalized]
        if (!target?.disabled) {
          onTabChange(target.key)
          document.getElementById(`${String(target.key)}-tab`)?.focus()
          return
        }
        index += nextIndex > 0 ? 1 : -1
      }
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
        scrollable
          ? 'relative flex max-w-full gap-mx-xs overflow-x-auto overscroll-x-contain border-b border-border-subtle mb-mx-md whitespace-nowrap pr-mx-md [scrollbar-width:thin]'
          : 'flex flex-wrap gap-mx-xs border-b border-border-subtle mb-mx-md overflow-visible',
        className
      )}
      role="tablist"
    >
      {tabs.map(({ key, label, controls, disabled }) => {
        const tabId = `${String(key)}-tab`
        const panelId = controls ?? `${String(key)}-panel`

        return (
          <button
            key={key}
            id={tabId}
            type="button"
            role="tab"
            disabled={disabled}
            aria-disabled={disabled || undefined}
            tabIndex={disabled ? -1 : activeTab === key ? 0 : -1}
            aria-selected={activeTab === key}
            aria-controls={panelId}
            onClick={() => !disabled && onTabChange(key)}
            onKeyDown={handleKeyDown}
            className={cn(
              'inline-flex min-h-[44px] items-center px-mx-md py-mx-sm text-label font-medium transition-colors border-b-2 whitespace-nowrap outline-none focus-visible:ring-[length:var(--mx-input-focus-ring-width)] focus-visible:ring-focus-ring focus-visible:ring-offset-2',
              disabled
                ? 'cursor-not-allowed border-transparent text-text-disabled'
                : activeTab === key
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
