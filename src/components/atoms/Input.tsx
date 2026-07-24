import * as React from 'react'
import { useMxSurfaceVisualMode } from '@/components/module/MxSurfaceVisualContext'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    const manager = useMxSurfaceVisualMode() === 'manager'
    return (
      <input
        type={type}
        className={cn(
          manager
            ? 'flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-normal text-gray-800 shadow-none outline-none transition placeholder:text-gray-400 focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400'
            : 'flex h-12 w-full rounded-mx-md border border-mx-border bg-white px-5 py-3 text-sm font-bold text-mx-text shadow-inner transition-all duration-[120ms] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-mx-subtle focus-visible:border-mx-action focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mx-action/20 disabled:cursor-not-allowed disabled:bg-mx-bg disabled:text-mx-muted disabled:opacity-100',
          className,
          manager && 'h-10 rounded-xl font-normal shadow-none',
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
