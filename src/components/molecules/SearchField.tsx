import * as React from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/atoms/Spinner'
import { VisuallyHidden } from '@/components/atoms/VisuallyHidden'
import { fieldBaseClasses, nakedInputClasses } from './fieldStyles'

export interface SearchFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type'> {
  value: string
  onValueChange: (value: string) => void
  /** Nome acessível. O placeholder não substitui o label (§16.1). */
  label: string
  /** Exibe o label acima do campo em vez de só para leitores de tela. */
  showLabel?: boolean
  loading?: boolean
  onClear?: () => void
}

/**
 * Campo de busca com limpar e estado de carregamento.
 *
 * O botão de limpar devolve o foco ao input, para que o teclado não perca a
 * posição depois de esvaziar a busca (§13.1).
 */
const SearchField = React.forwardRef<HTMLInputElement, SearchFieldProps>(
  (
    {
      className,
      value,
      onValueChange,
      label,
      showLabel = false,
      loading = false,
      onClear,
      disabled,
      id,
      ...props
    },
    forwardedRef,
  ) => {
    const generatedId = React.useId()
    const inputId = id ?? generatedId
    const innerRef = React.useRef<HTMLInputElement>(null)
    React.useImperativeHandle(forwardedRef, () => innerRef.current as HTMLInputElement)

    const handleClear = () => {
      onValueChange('')
      onClear?.()
      innerRef.current?.focus()
    }

    return (
      <div className={cn('flex flex-col gap-[var(--mx-space-1)]', className)}>
        {showLabel ? (
          <label
            htmlFor={inputId}
            className="text-[length:var(--mx-font-size-base)] font-medium text-[hsl(var(--mx-color-text-primary))]"
          >
            {label}
          </label>
        ) : (
          <VisuallyHidden as="div">
            <label htmlFor={inputId}>{label}</label>
          </VisuallyHidden>
        )}

        <div
          className={cn(
            fieldBaseClasses,
            'gap-[var(--mx-space-2)]',
            disabled && 'bg-[hsl(var(--mx-color-surface-muted))]',
          )}
        >
          <Search
            aria-hidden
            className="h-4 w-4 shrink-0 text-[hsl(var(--mx-color-text-secondary))]"
          />
          <input
            ref={innerRef}
            id={inputId}
            type="search"
            role="searchbox"
            value={value}
            disabled={disabled}
            onChange={(event) => onValueChange(event.target.value)}
            className={cn(nakedInputClasses, '[&::-webkit-search-cancel-button]:hidden')}
            {...props}
          />
          {loading ? <Spinner size="sm" tone="muted" label="Buscando" /> : null}
          {value && !disabled ? (
            <button
              type="button"
              onClick={handleClear}
              className={cn(
                'shrink-0 rounded-full p-0.5 text-[hsl(var(--mx-color-text-secondary))]',
                'transition-colors duration-[var(--mx-duration-fast)]',
                'hover:bg-[hsl(var(--mx-color-surface-muted))] hover:text-[hsl(var(--mx-color-text-primary))]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--mx-color-focus-ring))]',
              )}
            >
              <X aria-hidden className="h-4 w-4" />
              <VisuallyHidden>Limpar busca</VisuallyHidden>
            </button>
          ) : null}
        </div>
      </div>
    )
  },
)
SearchField.displayName = 'SearchField'

export { SearchField }
