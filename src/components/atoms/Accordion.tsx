import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const accordionVariants = cva(
  "group",
  {
    variants: {
      variant: {
        default: "border border-gray-200 rounded-xl bg-white",
        bordered: "border border-gray-200 rounded-xl bg-white shadow-sm",
        ghost: "bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface AccordionItemProps
  extends React.HTMLAttributes<HTMLDetailsElement>,
    VariantProps<typeof accordionVariants> {
  summary: React.ReactNode
  defaultOpen?: boolean
}

const AccordionItem = React.forwardRef<HTMLDetailsElement, AccordionItemProps>(
  ({ className, variant, summary, defaultOpen = false, children, ...props }, ref) => {
    return (
      <details
        ref={ref}
        open={defaultOpen}
        className={cn(accordionVariants({ variant }), className)}
        {...props}
      >
        <summary className="flex cursor-pointer items-center justify-between px-mx-md py-mx-sm font-bold text-sm text-gray-800 select-none list-none hover:bg-gray-50/50 transition-colors [&::-webkit-details-marker]:hidden">
          <span>{summary}</span>
          <svg
            className="h-mx-xs w-mx-xs text-gray-500 transition-transform duration-200 group-open:rotate-180 shrink-0 ml-mx-xs"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="px-mx-md py-mx-sm text-sm text-gray-500 border-t border-gray-100 animate-accordion-down">
          {children}
        </div>
      </details>
    )
  }
)
AccordionItem.displayName = "AccordionItem"

export interface AccordionProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const Accordion = React.forwardRef<HTMLDivElement, AccordionProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("space-y-mx-xs", className)} {...props}>
      {children}
    </div>
  )
)
Accordion.displayName = "Accordion"

export { Accordion, AccordionItem, accordionVariants }
