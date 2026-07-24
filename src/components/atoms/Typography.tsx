import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { useMxSurfaceVisualMode } from '@/components/module/MxSurfaceVisualContext'
import { cn } from '@/lib/utils'

const typographyVariants = cva('transition-colors', {
  variants: {
    variant: {
      h1: 'text-3xl md:text-4xl font-black tracking-tight leading-tight text-text-primary',
      h2: 'text-xl md:text-2xl font-bold tracking-normal leading-tight text-text-primary',
      h3: 'text-lg font-semibold tracking-normal leading-tight text-text-primary',
      h4: 'text-base font-semibold tracking-normal leading-tight text-text-primary',
      p: 'text-sm font-normal leading-relaxed text-text-secondary tracking-normal',
      caption: 'text-mx-tiny font-medium tracking-normal text-text-tertiary',
      tiny: 'text-mx-micro font-medium tracking-normal',
      mono: 'font-mono-numbers text-sm font-semibold',
    },
    tone: {
      default: '',
      brand: 'text-mx-green-700',
      success: 'text-status-success',
      warning: 'text-status-warning',
      info: 'text-status-info',
      error: 'text-status-error',
      muted: 'text-text-tertiary',
      white: 'text-white',
    },
  },
  defaultVariants: {
    variant: 'p',
    tone: 'default',
  },
})

const managerVariantClasses = {
  h1: 'text-3xl font-bold normal-case leading-tight tracking-tight md:text-4xl',
  h2: 'text-xl font-bold normal-case leading-tight tracking-tight md:text-2xl',
  h3: 'text-lg font-semibold normal-case leading-tight tracking-normal',
  h4: 'text-base font-semibold normal-case leading-tight tracking-normal',
  p: 'text-sm font-normal normal-case leading-relaxed tracking-normal',
  caption: 'text-xs font-medium normal-case tracking-normal',
  tiny: 'text-[11px] font-medium normal-case tracking-normal',
  mono: 'font-mono-numbers text-sm font-semibold normal-case tracking-normal',
} as const

const managerToneClasses = {
  default: '',
  brand: 'text-emerald-700',
  success: 'text-emerald-700',
  warning: 'text-amber-700',
  info: 'text-blue-700',
  error: 'text-red-700',
  muted: 'text-gray-500',
  white: 'text-white',
} as const

type TypographyElementType = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'label' | 'div'

export interface TypographyProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof typographyVariants> {
  as?: TypographyElementType
  htmlFor?: string
}

const DEFAULT_ELEMENT_MAP: Record<string, TypographyElementType> = {
  body: 'p',
  caption: 'span',
  tiny: 'span',
  mono: 'span',
}

const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  ({ className, variant, tone, as, htmlFor, ...props }, ref) => {
    const manager = useMxSurfaceVisualMode() === 'manager'
    const resolvedVariant = variant ?? 'p'
    const resolvedTone = tone ?? 'default'
    const Component = as || DEFAULT_ELEMENT_MAP[resolvedVariant] || (resolvedVariant as TypographyElementType) || 'p'
    return (
      <Component
        className={cn(
          typographyVariants({ variant: resolvedVariant, tone: resolvedTone }),
          className,
          manager && managerVariantClasses[resolvedVariant],
          manager && resolvedTone !== 'default' && managerToneClasses[resolvedTone],
        )}
        ref={ref as React.Ref<never>}
        {...(htmlFor ? { htmlFor } : {})}
        {...props}
      />
    )
  },
)
Typography.displayName = 'Typography'

export { Typography, typographyVariants }
