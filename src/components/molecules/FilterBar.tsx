import * as React from 'react'
import { cn } from '@/lib/utils'
import { Typography } from '@/components/atoms/Typography'

export interface FilterBarProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  icon?: React.ReactNode
}

const FilterBar = React.forwardRef<HTMLDivElement, FilterBarProps>(
  ({ className, label, icon, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col gap-mx-sm sm:flex-row sm:flex-wrap sm:items-center',
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-mx-xs shrink-0">
          {icon && <span className="text-gray-500">{icon}</span>}
          <Typography variant="caption" className="">
            {label}
          </Typography>
        </div>
        <div className="flex w-full min-w-0 flex-wrap items-center gap-mx-xs sm:w-auto sm:flex-1">
          {children}
        </div>
      </div>
    )
  }
)
FilterBar.displayName = 'FilterBar'

export { FilterBar }
