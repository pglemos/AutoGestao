import * as React from 'react'
import { useMxSurfaceVisualMode } from '@/components/module/MxSurfaceVisualContext'
import { cn } from '@/lib/utils'

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const manager = useMxSurfaceVisualMode() === 'manager'
    return (
      <div
        ref={ref}
        data-mx-card=""
        className={cn(
          manager
            ? 'relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-colors'
            : 'relative overflow-hidden rounded-mx-3xl border border-border-default bg-white shadow-mx-sm transition-all',
          className,
          manager && 'rounded-2xl shadow-sm',
        )}
        {...props}
      />
    )
  },
)
Card.displayName = 'Card'

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const manager = useMxSurfaceVisualMode() === 'manager'
    return (
      <div
        ref={ref}
        data-mx-card-header=""
        className={cn(
          manager
            ? 'flex flex-col gap-1 border-b border-gray-100 bg-white p-5'
            : 'flex flex-col space-y-1.5 border-b border-border-subtle bg-surface-alt/30 p-mx-lg',
          className,
          manager && 'gap-1 p-5',
        )}
        {...props}
      />
    )
  },
)
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => {
    const manager = useMxSurfaceVisualMode() === 'manager'
    return (
      <h3
        ref={ref}
        data-mx-card-title=""
        className={cn(
          manager
            ? 'text-lg font-semibold leading-tight tracking-normal text-gray-800 md:text-xl'
            : 'text-lg font-black leading-tight tracking-tight text-text-primary md:text-xl',
          className,
          manager && 'font-semibold normal-case tracking-normal',
        )}
        {...props}
      >
        {children}
      </h3>
    )
  },
)
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    const manager = useMxSurfaceVisualMode() === 'manager'
    return (
      <p
        ref={ref}
        data-mx-card-description=""
        className={cn(
          manager
            ? 'mt-1 text-sm font-normal leading-6 tracking-normal text-gray-500'
            : 'mt-1 text-mx-tiny font-black uppercase tracking-mx-wide text-text-tertiary',
          className,
          manager && 'text-sm font-normal normal-case leading-6 tracking-normal',
        )}
        {...props}
      />
    )
  },
)
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const manager = useMxSurfaceVisualMode() === 'manager'
    return <div ref={ref} data-mx-card-content="" className={cn(manager ? 'p-5' : 'p-mx-lg', className)} {...props} />
  },
)
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const manager = useMxSurfaceVisualMode() === 'manager'
    return (
      <div
        ref={ref}
        data-mx-card-footer=""
        className={cn(
          manager
            ? 'mt-auto flex items-center border-t border-gray-100 bg-white p-5'
            : 'mt-auto flex items-center border-t border-border-subtle bg-surface-alt/10 p-mx-lg',
          className,
        )}
        {...props}
      />
    )
  },
)
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
