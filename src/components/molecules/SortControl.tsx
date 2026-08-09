import * as React from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { VisuallyHidden } from '@/components/atoms/VisuallyHidden'

export type SortDirection = 'asc' | 'desc'

export interface SortControlProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  label: string
  /** Direção ativa, ou `null` quando a ordenação é por outra coluna. */
  direction: SortDirection | null
  onSortChange: (direction: SortDirection) => void
  /** Alinha o ícone à esquerda — use em colunas numéricas alinhadas à direita. */
  alignEnd?: boolean
}

/**
 * Cabeçalho ordenável de tabela.
 *
 * Emite `aria-sort` no `<th>` pai quando usado dentro de uma tabela; o estado
 * também é anunciado no nome do botão, para leitores que não propagam a coluna.
 */
const SortControl = React.forwardRef<HTMLButtonElement, SortControlProps>(
  ({ className, label, direction, onSortChange, alignEnd = false, ...props }, ref) => {
    const next: SortDirection = direction === 'asc' ? 'desc' : 'asc'
    const Icon = direction === 'asc' ? ArrowUp : direction === 'desc' ? ArrowDown : ChevronsUpDown

    const state =
      direction === 'asc'
        ? 'ordenado crescente'
        : direction === 'desc'
          ? 'ordenado decrescente'
          : 'não ordenado'

    return (
      <button
        ref={ref}
        type="button"
        onClick={() => onSortChange(next)}
        className={cn(
          'inline-flex items-center gap-1 rounded-[var(--mx-radius-sm)] px-1 py-0.5',
          'text-[length:var(--mx-font-size-xs)] font-semibold uppercase tracking-wide',
          direction
            ? 'text-text-primary'
            : 'text-text-secondary',
          'transition-colors duration-[var(--mx-duration-fast)] hover:text-text-primary',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
          alignEnd && 'flex-row-reverse',
          className,
        )}
        {...props}
      >
        {label}
        <Icon aria-hidden className="h-3.5 w-3.5" />
        <VisuallyHidden>{`, ${state}. Ativar para ordenar ${next === 'asc' ? 'crescente' : 'decrescente'}.`}</VisuallyHidden>
      </button>
    )
  },
)
SortControl.displayName = 'SortControl'

/** Valor de `aria-sort` para o `<th>` que contém o controle. */
export function ariaSortFor(direction: SortDirection | null) {
  if (direction === 'asc') return 'ascending' as const
  if (direction === 'desc') return 'descending' as const
  return 'none' as const
}

export { SortControl }
