import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/** Aparência única — sem variação por perfil (§8.5). */
const selectVariants = cva(
  'h-[var(--mx-input-height)] w-full appearance-none rounded-[var(--mx-input-radius)] border bg-surface-default py-2 pl-3 pr-10 text-sm font-normal text-text-primary outline-none transition disabled:cursor-not-allowed disabled:bg-surface-alt disabled:text-text-disabled',
  {
    variants: {
      variant: {
        default:
          'border-border focus-visible:border-primary focus-visible:ring-[length:var(--mx-input-focus-ring-width)] focus-visible:ring-focus-ring/25',
        error:
          'border-status-error/40 focus-visible:border-status-error focus-visible:ring-[length:var(--mx-input-focus-ring-width)] focus-visible:ring-status-error/20',
        ghost: 'border-transparent bg-transparent focus-visible:ring-0',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement>,
    VariantProps<typeof selectVariants> {
  label?: string
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, variant, label, id, children, 'aria-label': ariaLabel, ...props }, ref) => {
    const generatedId = React.useId()
    const fieldId = id || generatedId
    // Sem rótulo próprio nem aria-labelledby, o nome acessível vem do <label>
    // que envolve o campo (MxField). Um aria-label genérico aqui venceria esse
    // rótulo e anunciaria "Seleção" no lugar do nome real do campo.
    const resolvedAriaLabel = ariaLabel ?? label
    const selectElement = (
      <div className="relative">
        <select
          id={fieldId}
          className={cn(selectVariants({ variant }), className)}
          ref={ref}
          {...props}
          aria-label={resolvedAriaLabel}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-text-secondary">
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    )

    if (label) {
      return (
        <div className="w-full space-y-2">
          <label htmlFor={fieldId} className="block">
            <span className="text-sm font-medium text-text-primary">{label}</span>
          </label>
          {selectElement}
        </div>
      )
    }

    return selectElement
  },
)
Select.displayName = 'Select'

export { Select, selectVariants }
