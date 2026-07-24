import * as React from 'react'
import { useMxSurfaceVisualMode } from '@/components/module/MxSurfaceVisualContext'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    const manager = useMxSurfaceVisualMode() === 'manager'
    return (
      <textarea
        className={cn(
          manager
            ? 'flex min-h-[120px] w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm font-normal text-gray-800 shadow-none outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400'
            : 'flex min-h-[120px] w-full resize-none rounded-mx-2xl border border-mx-border bg-white px-6 py-5 text-sm font-bold text-mx-text shadow-inner transition-all duration-[120ms] placeholder:text-mx-subtle focus:border-mx-action focus:outline-none focus:ring-4 focus:ring-mx-action/20 disabled:cursor-not-allowed disabled:bg-mx-bg disabled:text-mx-muted disabled:opacity-100',
          className,
          manager && 'rounded-xl font-normal shadow-none',
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Textarea.displayName = 'Textarea'

export { Textarea }
