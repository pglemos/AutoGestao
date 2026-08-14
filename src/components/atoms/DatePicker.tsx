import * as React from 'react'
import { cn } from '@/lib/utils'

export interface DatePickerProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  ({ className, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <input
          type="date"
          className={cn(
            'flex h-[var(--mx-input-height)] w-full rounded-[var(--mx-input-radius)] border-[length:var(--mx-input-border-width)] border-solid border-border bg-surface-default px-3 py-2 text-sm font-normal text-text-primary shadow-none outline-none transition',
            'placeholder:text-text-disabled',
            'focus-visible:border-primary focus-visible:ring-[length:var(--mx-input-focus-ring-width)] focus-visible:ring-focus-ring/25',
            'disabled:cursor-not-allowed disabled:bg-surface-alt disabled:text-text-disabled',
            'read-only:cursor-default read-only:bg-surface-alt read-only:text-text-disabled',
            className,
          )}
          ref={ref}
          {...props}
        />
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-text-secondary">
          <svg className="h-mx-xs w-mx-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      </div>
    )
  },
)
DatePicker.displayName = 'DatePicker'

export { DatePicker }
