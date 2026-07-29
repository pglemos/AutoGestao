import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { IconButton } from '@/components/atoms/IconButton'

export interface PaginationProps extends Omit<React.HTMLAttributes<HTMLElement>, 'onChange'> {
  page: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
  disabled?: boolean
}

const numberFormatter = new Intl.NumberFormat('pt-BR')

/**
 * Paginação com contagem explícita.
 *
 * Mostrar o intervalo (“1–25 de 340”) evita o beco sem saída em que o usuário
 * não sabe se a lista acabou ou se o filtro zerou o resultado (§12.1).
 */
const Pagination = React.forwardRef<HTMLElement, PaginationProps>(
  ({ className, page, pageSize, totalItems, onPageChange, disabled = false, ...props }, ref) => {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
    const current = Math.min(Math.max(1, page), totalPages)
    const first = totalItems === 0 ? 0 : (current - 1) * pageSize + 1
    const last = Math.min(current * pageSize, totalItems)

    const summary =
      totalItems === 0
        ? 'Nenhum resultado'
        : `${numberFormatter.format(first)}–${numberFormatter.format(last)} de ${numberFormatter.format(totalItems)}`

    return (
      <nav
        ref={ref}
        aria-label="Paginação"
        className={cn(
          'flex items-center justify-between gap-[var(--mx-space-3)] py-[var(--mx-space-2)]',
          className,
        )}
        {...props}
      >
        <p
          aria-live="polite"
          className="text-[length:var(--mx-font-size-xs)] text-[hsl(var(--mx-color-text-secondary))]"
        >
          {summary}
        </p>

        <div className="flex items-center gap-[var(--mx-space-2)]">
          <IconButton
            icon={<ChevronLeft />}
            label="Página anterior"
            variant="outline"
            size="sm"
            disabled={disabled || current <= 1}
            onClick={() => onPageChange(current - 1)}
          />
          <span className="text-[length:var(--mx-font-size-xs)] font-medium text-[hsl(var(--mx-color-text-primary))]">
            {`Página ${numberFormatter.format(current)} de ${numberFormatter.format(totalPages)}`}
          </span>
          <IconButton
            icon={<ChevronRight />}
            label="Próxima página"
            variant="outline"
            size="sm"
            disabled={disabled || current >= totalPages}
            onClick={() => onPageChange(current + 1)}
          />
        </div>
      </nav>
    )
  },
)
Pagination.displayName = 'Pagination'

export { Pagination }
