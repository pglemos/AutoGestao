import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Inbox, SearchX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Typography } from '@/components/atoms/Typography'

const emptyStateVariants = cva(
  "flex flex-col items-center justify-center text-center",
  {
    variants: {
      size: {
        sm: "py-mx-md px-mx-sm space-y-mx-xs",
        md: "py-mx-xl px-mx-lg space-y-mx-sm",
        lg: "py-mx-3xl px-mx-2xl space-y-mx-md",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

const iconSizeVariants = cva(
  "text-muted-foreground",
  {
    variants: {
      size: {
        sm: "h-8 w-8",
        md: "h-12 w-12",
        lg: "h-16 w-16",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

/**
 * Distinção semântica do vazio (18.011):
 * - `filter`: existe dado, mas o filtro não retornou nada → SearchX.
 * - `dataset`: não há dado cadastrado ainda → Inbox.
 * A variação nunca é comunicada só por cor (§43.15).
 */
const DEFAULT_ICON: Record<'filter' | 'dataset', React.ReactNode> = {
  filter: <SearchX aria-hidden="true" />,
  dataset: <Inbox aria-hidden="true" />,
}

export type EmptyStateVariant = 'filter' | 'dataset'

export interface EmptyStateProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof emptyStateVariants> {
  icon?: React.ReactNode
  title: string
  description?: string
  nextStep?: string
  action?: React.ReactNode
  /** `filter` = filtro sem resultado; `dataset` = sem dados cadastrados. */
  variant?: EmptyStateVariant
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, size, icon, title, description, nextStep, action, variant = 'dataset', ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-mx-empty={variant}
        className={cn(emptyStateVariants({ size }), className)}
        {...props}
      >
        {(icon ?? DEFAULT_ICON[variant]) && (
          <div className={cn(iconSizeVariants({ size }))}>
            {icon ?? DEFAULT_ICON[variant]}
          </div>
        )}
        <Typography variant="h3" className="">
          {title}
        </Typography>
        {description && (
          <Typography variant="p" tone="muted" className="max-w-md">
            {description}
          </Typography>
        )}
        {nextStep && (
          <div className="mt-mx-xs max-w-md rounded-2xl border border-border bg-surface-alt px-mx-md py-mx-sm text-left">
            <Typography variant="caption" className="block">
              Próximo passo
            </Typography>
            <Typography variant="p" className="mt-mx-tiny">
              {nextStep}
            </Typography>
          </div>
        )}
        {action && (
          <div className="mt-mx-xs">
            {action}
          </div>
        )}
      </div>
    )
  }
)
EmptyState.displayName = "EmptyState"

export { EmptyState, emptyStateVariants }
