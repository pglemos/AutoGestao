import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

import { Typography } from '@/components/atoms/Typography'

const buttonVariants = cva(
  "group relative inline-flex items-center justify-center gap-mx-xs whitespace-nowrap rounded-[var(--mx-button-radius)] font-semibold tracking-normal transition-all duration-fast focus-visible:ring-4 focus-visible:ring-mx-action/20 outline-none disabled:pointer-events-none disabled:bg-surface-alt disabled:text-mx-muted disabled:opacity-100 data-[legacy-disabled=true]:disabled:opacity-50 active:scale-[0.98] active:duration-fast [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Aparência única — sem variação por perfil (§8.5). Estes são os
        // estilos aprovados do Base44/Dono, antes acessíveis só sob o modo
        // `manager`.
        primary: "bg-brand-primary text-white shadow-[var(--mx-button-shadow)] hover:bg-brand-primary-hover focus-visible:ring-status-success/20 disabled:bg-muted disabled:text-muted-foreground",
        brand: "bg-brand-primary text-white shadow-[var(--mx-button-shadow)] hover:bg-brand-primary-hover focus-visible:ring-status-success/20 disabled:bg-muted disabled:text-muted-foreground",
        secondary: "border border-border bg-white text-foreground shadow-none hover:bg-surface-alt hover:text-foreground focus-visible:ring-status-success/20 disabled:border-border-subtle disabled:bg-surface-alt disabled:text-muted-foreground",
        outline: "border border-border bg-white text-foreground shadow-none hover:bg-surface-alt hover:text-foreground focus-visible:ring-status-success/20 disabled:border-border-subtle disabled:bg-surface-alt disabled:text-muted-foreground",
        ghost: "bg-transparent text-muted-foreground shadow-none hover:bg-surface-alt hover:text-foreground focus-visible:ring-status-success/20 disabled:bg-transparent disabled:text-text-disabled",
        success: "bg-brand-primary text-white shadow-[var(--mx-button-shadow)] hover:bg-brand-primary-hover focus-visible:ring-status-success/20",
        warning: "bg-status-warning text-status-warning-foreground shadow-[var(--mx-button-shadow)] hover:bg-status-warning focus-visible:ring-status-warning/20",
        info: "bg-status-info text-white shadow-[var(--mx-button-shadow)] hover:bg-status-info focus-visible:ring-status-info/20",
        danger: "bg-status-error text-white shadow-[var(--mx-button-shadow)] hover:bg-status-error focus-visible:ring-status-error/20",
        whatsapp: "bg-whatsapp text-white shadow-[var(--mx-button-shadow)] hover:bg-whatsapp/90",
        "mx-elite": "bg-status-success text-white shadow-[var(--mx-button-shadow)] hover:bg-status-success focus-visible:ring-status-success/20",
      },
      size: {
        default: "h-mx-11 px-6 sm:h-10 sm:px-4",
        sm: "h-mx-9 px-3",
        xs: "h-mx-8 px-2 text-caption",
        lg: "h-mx-14 px-8",
        icon: "h-mx-11 w-mx-11 sm:h-10 sm:w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  icon?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, children, asChild = false, loading = false, icon, ...props }, ref) => {
    const resolvedVariant = variant ?? 'primary'
    const iconTooltip = size === 'icon' && typeof props['aria-label'] === 'string' ? props['aria-label'] : null
    const decoratedChildren = React.Children.map(children, (child) => {
      if (!React.isValidElement(child)) return child
      if (typeof child.type === 'string' && child.type === 'svg') {
        return React.cloneElement(
          child,
          { 'aria-hidden': true, focusable: false } as Partial<typeof child.props>
        )
      }
      return child
    })

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<Record<string, unknown>>
      return React.cloneElement(child, {
        ...props,
        className: cn(
          buttonVariants({ variant: resolvedVariant, size, className }),
          String(child.props.className ?? ''),
        ),
      })
    }

    return (
      <button
        className={cn(buttonVariants({ variant: resolvedVariant, size, className }))}
        ref={ref}
        disabled={props.disabled || loading}
        {...props}
      >
        {loading ? (
          <div className="flex items-center gap-mx-sm">
            <svg className="animate-spin h-mx-4 w-mx-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {typeof children === 'string' ? (
              <Typography variant="caption" className="text-inherit tracking-inherit">
                Carregando...
              </Typography>
            ) : children}
          </div>
        ) : (
          <>
            {icon && <span className="mr-mx-xs">{icon}</span>}
            {!asChild && typeof children === 'string' ? (
              <Typography variant="caption" className="text-inherit tracking-inherit">
                {children}
              </Typography>
            ) : (
              decoratedChildren
            )}
            {iconTooltip && (
              <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-mx-xs -translate-x-1/2 rounded-[var(--mx-button-radius)] bg-gray-900 px-mx-xs py-mx-tiny text-mx-micro font-medium text-white opacity-0 shadow-[var(--mx-button-shadow)] transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                {iconTooltip}
              </span>
            )}
          </>
        )}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
