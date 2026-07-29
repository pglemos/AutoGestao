import * as React from 'react'
import { cn } from '@/lib/utils'
import { VisuallyHidden } from '@/components/atoms/VisuallyHidden'

export interface ViewModeOption<T extends string> {
  value: T
  label: string
  icon?: React.ReactNode
}

export interface ViewModeSelectorProps<T extends string> {
  options: ViewModeOption<T>[]
  value: T
  onValueChange: (value: T) => void
  /** Nome do grupo para leitores de tela (ex.: “Modo de visualização”). */
  label: string
  className?: string
}

/**
 * Alternador entre modos de exibição (lista, cards, kanban).
 *
 * Implementa o padrão radiogroup: setas navegam, Espaço/Enter seleciona — não
 * é um grupo de botões soltos, que quebraria a navegação por teclado (§14).
 */
function ViewModeSelector<T extends string>({
  options,
  value,
  onValueChange,
  label,
  className,
}: ViewModeSelectorProps<T>) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([])

  const move = (from: number, delta: number) => {
    const next = (from + delta + options.length) % options.length
    onValueChange(options[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-[var(--mx-tabs-container-radius)] p-0.5',
        'bg-[hsl(var(--mx-color-surface-muted))]',
        className,
      )}
    >
      {options.map((option, index) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onValueChange(option.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                event.preventDefault()
                move(index, 1)
              }
              if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                event.preventDefault()
                move(index, -1)
              }
            }}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-[var(--mx-tabs-item-radius)] px-[var(--mx-space-3)]',
              'text-[length:var(--mx-font-size-xs)] font-medium',
              'transition-colors duration-[var(--mx-duration-fast)] ease-[var(--mx-easing-standard)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--mx-color-focus-ring))] focus-visible:ring-offset-1',
              '[&_svg]:h-4 [&_svg]:w-4',
              selected
                ? 'bg-[hsl(var(--mx-color-surface))] text-[hsl(var(--mx-color-text-primary))] shadow-[var(--mx-shadow-sm)]'
                : 'text-[hsl(var(--mx-color-text-secondary))] hover:text-[hsl(var(--mx-color-text-primary))]',
            )}
          >
            {option.icon ? <span aria-hidden>{option.icon}</span> : null}
            {option.label}
            {selected ? <VisuallyHidden> (selecionado)</VisuallyHidden> : null}
          </button>
        )
      })}
    </div>
  )
}

export { ViewModeSelector }
