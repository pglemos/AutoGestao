import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/** Aparência única — sem variação por perfil (§8.5). */
const selectVariants = cva(
  'h-10 w-full appearance-none rounded-xl border bg-white py-2 pl-3 pr-10 text-sm font-normal text-foreground outline-none transition disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-muted-foreground',
  {
    variants: {
      variant: {
        default: 'border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20',
        error: 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20',
        ghost: 'border-transparent bg-transparent focus:ring-0',
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
  ({ className, variant, label, id, children, ...props }, ref) => {
    const generatedId = React.useId()
    const fieldId = id || generatedId
    const selectElement = (
      <div className="relative">
        <select
          id={fieldId}
          className={cn(selectVariants({ variant }), className)}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
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
            <span className="text-sm font-medium text-muted-foreground">{label}</span>
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
