import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Card de seção canônico (FASE M 13.006/13.010).
 *
 * Mesma geometria do `Card` (radius/shadow/border/padding por token), com
 * slots Header/Content/Footer. Substitui a geometria crua do módulo gerencial
 * por tokens semânticos.
 */
const SectionCard = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement> & { as?: React.ElementType }>(
  ({ as: Component = 'section', className, ...props }, ref) => (
    <Component
      ref={ref}
      data-mx-section-card=""
      className={cn(
        'relative overflow-hidden rounded-[var(--mx-card-radius)] border border-border-subtle bg-white shadow-[var(--mx-card-shadow)] transition-colors',
        className,
      )}
      {...props}
    />
  ),
)
SectionCard.displayName = 'SectionCard'

const SectionHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-mx-section-header=""
      className={cn('flex flex-col gap-3 border-b border-border-subtle p-[var(--mx-card-padding)] sm:flex-row sm:items-center sm:justify-between', className)}
      {...props}
    />
  ),
)
SectionHeader.displayName = 'SectionHeader'

const SectionContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-mx-section-content="" className={cn('p-[var(--mx-card-padding)]', className)} {...props} />
  ),
)
SectionContent.displayName = 'SectionContent'

export { SectionCard, SectionHeader, SectionContent }
