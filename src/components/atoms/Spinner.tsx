import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { VisuallyHidden } from '@/components/atoms/VisuallyHidden'

const spinnerVariants = cva(
  'inline-block animate-spin rounded-full border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]',
  {
    variants: {
      size: {
        sm: 'h-4 w-4 border-2',
        md: 'h-5 w-5 border-2',
        lg: 'h-8 w-8 border-[3px]',
      },
      tone: {
        current: 'text-current',
        primary: 'text-[hsl(var(--mx-color-primary))]',
        muted: 'text-[hsl(var(--mx-color-text-secondary))]',
      },
    },
    defaultVariants: { size: 'md', tone: 'current' },
  },
)

export interface SpinnerProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'>,
    VariantProps<typeof spinnerVariants> {
  /** Nome acessível. Omita apenas quando o contexto já anuncia o carregamento. */
  label?: string
}

/** Indicador de progresso indeterminado. Para progresso conhecido, use `Progress`. */
const Spinner = React.forwardRef<HTMLSpanElement, SpinnerProps>(
  ({ className, size, tone, label = 'Carregando', ...props }, ref) => (
    <span ref={ref} role="status" className={cn('inline-flex items-center', className)} {...props}>
      <span aria-hidden className={spinnerVariants({ size, tone })} />
      <VisuallyHidden>{label}</VisuallyHidden>
    </span>
  ),
)
Spinner.displayName = 'Spinner'

export { Spinner, spinnerVariants }
