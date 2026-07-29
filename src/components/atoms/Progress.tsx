import * as React from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const progressVariants = cva('relative w-full overflow-hidden rounded-full', {
  variants: {
    size: {
      sm: 'h-1',
      md: 'h-2',
      lg: 'h-3',
    },
  },
  defaultVariants: { size: 'md' },
})

const indicatorTones = {
  primary: 'bg-[hsl(var(--mx-color-primary))]',
  success: 'bg-[hsl(var(--mx-color-success))]',
  warning: 'bg-[hsl(var(--mx-color-warning))]',
  danger: 'bg-[hsl(var(--mx-color-danger))]',
} as const

export interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
    VariantProps<typeof progressVariants> {
  /** 0–100. `null` renderiza estado indeterminado. */
  value?: number | null
  tone?: keyof typeof indicatorTones
}

/**
 * Progresso determinado. A cor nunca é o único indicador — o valor numérico
 * precisa estar visível ou em `aria-valuetext` (§14).
 */
const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, size, tone = 'primary', ...props }, ref) => {
  const clamped = value == null ? null : Math.min(100, Math.max(0, value))
  return (
    <ProgressPrimitive.Root
      ref={ref}
      value={clamped}
      className={cn(
        progressVariants({ size }),
        'bg-[hsl(var(--mx-color-surface-muted))]',
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          'h-full w-full flex-1 transition-transform duration-[var(--mx-duration-slow)] ease-[var(--mx-easing-standard)]',
          indicatorTones[tone],
        )}
        style={{ transform: `translateX(-${100 - (clamped ?? 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
})
Progress.displayName = 'Progress'

export { Progress, progressVariants }
