import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { VisuallyHidden } from '@/components/atoms/VisuallyHidden'

export interface FilterChipProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onSelect'> {
  label: string
  /** Valor aplicado, exibido após o rótulo (ex.: “Loja: Centro”). */
  value?: string
  selected?: boolean
  /** Torna o chip removível. Sem isto, ele é apenas um alternador. */
  onRemove?: () => void
  count?: number
}

/**
 * Filtro aplicado ou disponível.
 *
 * `aria-pressed` comunica o estado a leitores de tela — a cor de fundo sozinha
 * não indica seleção (§43.15).
 */
const FilterChip = React.forwardRef<HTMLButtonElement, FilterChipProps>(
  ({ className, label, value, selected = false, onRemove, count, ...props }, ref) => (
    <span
      className={cn(
        'inline-flex items-center gap-[var(--mx-space-1)] rounded-full',
        'border transition-colors duration-[var(--mx-duration-fast)] ease-standard',
        selected
          ? 'border-[hsl(var(--mx-color-primary))] bg-[hsl(var(--mx-color-primary-subtle))] text-[hsl(var(--mx-color-primary-active))]'
          : 'border-[hsl(var(--mx-color-border))] bg-[hsl(var(--mx-color-surface))] text-[hsl(var(--mx-color-text-secondary))]',
        className,
      )}
    >
      <button
        ref={ref}
        type="button"
        aria-pressed={selected}
        className={cn(
          'inline-flex items-center gap-1 rounded-full py-1 pl-3 text-[length:var(--mx-font-size-xs)] font-medium',
          onRemove ? 'pr-1' : 'pr-3',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--mx-color-focus-ring))] focus-visible:ring-offset-1',
        )}
        {...props}
      >
        <span>
          {label}
          {value ? (
            <>
              : <span className="font-semibold">{value}</span>
            </>
          ) : null}
        </span>
        {typeof count === 'number' ? (
          <span
            className={cn(
              'ml-0.5 rounded-full px-1.5 text-[length:var(--mx-font-size-micro)] font-semibold',
              selected
                ? 'bg-[hsl(var(--mx-color-primary))] text-[hsl(var(--mx-color-primary-foreground))]'
                : 'bg-[hsl(var(--mx-color-surface-muted))] text-[hsl(var(--mx-color-text-secondary))]',
            )}
          >
            {count}
          </span>
        ) : null}
      </button>

      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className={cn(
            'mr-1 shrink-0 rounded-full p-0.5',
            'transition-colors duration-[var(--mx-duration-fast)]',
            'hover:bg-[hsl(var(--mx-color-surface-muted))]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--mx-color-focus-ring))]',
          )}
        >
          <X aria-hidden className="h-3 w-3" />
          <VisuallyHidden>{`Remover filtro ${label}`}</VisuallyHidden>
        </button>
      ) : null}
    </span>
  ),
)
FilterChip.displayName = 'FilterChip'

export { FilterChip }
