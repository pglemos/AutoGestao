import * as React from 'react'
import { cn } from '@/lib/utils'

/** Família de card. Aparência única — sem variação por perfil (§8.5). */
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-mx-card=""
      className={cn(
        'relative overflow-hidden rounded-[var(--mx-card-radius)] border border-border-subtle bg-white shadow-[var(--mx-card-shadow)] transition-colors',
        className,
      )}
      {...props}
    />
  ),
)
Card.displayName = 'Card'

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-mx-card-header=""
      className={cn('flex flex-col gap-1 border-b border-border-subtle bg-white p-[var(--mx-card-padding)]', className)}
      {...props}
    />
  ),
)
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <h3
      ref={ref}
      data-mx-card-title=""
      className={cn(
        'text-h4 text-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </h3>
  ),
)
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    data-mx-card-description=""
    className={cn(
      'mt-1 text-body-sm text-muted-foreground',
      className,
    )}
    {...props}
  />
))
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-mx-card-content="" className={cn('p-[var(--mx-card-padding)]', className)} {...props} />
  ),
)
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-mx-card-footer=""
      className={cn('mt-auto flex items-center border-t border-border-subtle bg-white p-[var(--mx-card-padding)]', className)}
      {...props}
    />
  ),
)
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
