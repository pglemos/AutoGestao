import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const tooltipVariants = cva(
  "absolute z-[var(--mx-z-tooltip)] whitespace-nowrap rounded-xl bg-surface-overlay px-3 py-1.5 text-mx-tiny font-bold text-white shadow-sm opacity-0 pointer-events-none transition-opacity duration-150",
  {
    variants: {
      position: {
        top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
        bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
        left: "right-full top-1/2 -translate-y-1/2 mr-2",
        right: "left-full top-1/2 -translate-y-1/2 ml-2",
      },
    },
    defaultVariants: {
      position: "top",
    },
  }
)

export interface TooltipProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof tooltipVariants> {
  content: string
}

const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(
  ({ className, position, content, children, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false)

    return (
      <div
        ref={ref}
        role="group"
        tabIndex={-1}
        className="relative inline-flex"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        {...props}
      >
        {children}
        <div
          role="tooltip"
          className={cn(
            tooltipVariants({ position }),
            visible && "opacity-100",
            className
          )}
        >
          {content}
        </div>
      </div>
    )
  }
)
Tooltip.displayName = "Tooltip"

export { Tooltip, tooltipVariants }
