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
            "flex w-full rounded-xl border border-border bg-white px-5 py-3 text-sm font-bold text-foreground shadow-none transition-all placeholder:text-muted-foreground focus:outline-none focus:border-brand-primary/30 focus:ring-4 focus:ring-brand-primary/5 disabled:cursor-not-allowed disabled:opacity-50 h-mx-14 sm:h-12 pr-10",
            className
          )}
          ref={ref}
          {...props}
        />
        <div className="pointer-events-none absolute inset-y-0 right-mx-0 flex items-center pr-3 text-muted-foreground">
          <svg className="h-mx-xs w-mx-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      </div>
    )
  }
)
DatePicker.displayName = "DatePicker"

export { DatePicker }
