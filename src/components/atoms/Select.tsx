import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { useMxSurfaceVisualMode } from '@/components/module/MxSurfaceVisualContext'
import { cn } from '@/lib/utils'

const selectVariants = cva(
  'flex h-mx-14 w-full appearance-none rounded-mx-md border bg-white px-5 py-3 text-sm font-bold text-mx-text shadow-inner transition-all duration-[120ms] focus:outline-none focus:ring-4 focus:ring-mx-action/20 disabled:cursor-not-allowed disabled:bg-mx-bg disabled:text-mx-muted disabled:opacity-100 sm:h-12',
  {
    variants: {
      variant: {
        default: 'border-mx-border focus:border-mx-action data-[legacy-default=true]:border-border-default',
        error: 'border-status-error focus:border-status-error focus:ring-status-error/5',
        ghost: 'border-transparent bg-transparent shadow-none focus:ring-0',
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
    const manager = useMxSurfaceVisualMode() === 'manager'
    const fieldId = id || React.useId()
    const selectElement = (
      <div className="relative">
        <select
          id={fieldId}
          className={cn(
            manager
              ? 'h-10 w-full appearance-none rounded-xl border border-gray-200 bg-white py-2 pl-3 pr-10 text-sm font-normal text-gray-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400'
              : selectVariants({ variant }),
            !manager && 'pr-10',
            className,
            manager && 'h-10 rounded-xl font-normal shadow-none',
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        <div className={cn('pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3', manager ? 'text-gray-400' : 'text-text-tertiary')}>
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    )

    if (label) {
      return (
        <div className={cn('w-full', manager ? 'space-y-2' : 'space-y-mx-xs')}>
          <label htmlFor={fieldId} className={cn('block', manager ? '' : 'ml-2')}>
            <span className={manager ? 'text-sm font-medium text-gray-600' : 'text-mx-tiny font-black uppercase tracking-widest text-text-tertiary'}>
              {label}
            </span>
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
