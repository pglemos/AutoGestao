import * as React from 'react'
import { cn } from '@/lib/utils'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Card clicável (13.007): ganha hover de elevação e cursor pointer. Só cards
   * interativos exibem hover (13.009).
   */
  interactive?: boolean
  /** Card selecionado (13.008): anel de destaque semântico. */
  selected?: boolean
}

/** Família de card. Aparência única — sem variação por perfil (§8.5). */
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive, selected, ...props }, ref) => (
    <div
      ref={ref}
      data-mx-card=""
      data-interactive={interactive ? '' : undefined}
      data-selected={selected ? '' : undefined}
      className={cn(
        'relative overflow-hidden rounded-[var(--mx-card-radius)] border border-border-subtle bg-white shadow-[var(--mx-card-shadow)] transition-colors',
        interactive && 'cursor-pointer transition-[background-color,box-shadow] hover:shadow-[var(--mx-card-hover-shadow)] hover:bg-surface-alt',
        selected && 'border-status-info ring-2 ring-status-info/30',
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
