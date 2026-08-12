import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

import { Typography } from '@/components/atoms/Typography'

const buttonVariants = cva(
  "group relative inline-flex items-center justify-center gap-mx-xs whitespace-nowrap rounded-xl font-semibold tracking-normal transition-all duration-fast focus-visible:ring-4 focus-visible:ring-mx-action/20 outline-none disabled:pointer-events-none disabled:bg-gray-50 disabled:text-mx-muted disabled:opacity-100 data-[legacy-disabled=true]:disabled:opacity-50 active:scale-[0.98] active:duration-fast [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Aparência única — sem variação por perfil (§8.5). Estes são os
        // estilos aprovados do Base44/Dono, antes acessíveis só sob o modo
        // `manager`.
        primary: "rounded-xl bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus-visible:ring-emerald-500/20 disabled:bg-gray-100 disabled:text-muted-foreground",
        brand: "rounded-xl bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus-visible:ring-emerald-500/20 disabled:bg-gray-100 disabled:text-muted-foreground",
        secondary: "rounded-xl border border-border bg-white text-foreground shadow-none hover:bg-gray-50 hover:text-foreground focus-visible:ring-emerald-500/20 disabled:border-border-subtle disabled:bg-gray-50 disabled:text-muted-foreground",
        outline: "rounded-xl border border-border bg-white text-foreground shadow-none hover:bg-gray-50 hover:text-foreground focus-visible:ring-emerald-500/20 disabled:border-border-subtle disabled:bg-gray-50 disabled:text-muted-foreground",
        ghost: "rounded-xl bg-transparent text-muted-foreground shadow-none hover:bg-gray-50 hover:text-foreground focus-visible:ring-emerald-500/20 disabled:bg-transparent disabled:text-text-disabled",
        success: "rounded-xl bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus-visible:ring-emerald-500/20",
        warning: "rounded-xl bg-amber-500 text-white shadow-sm hover:bg-amber-600 focus-visible:ring-amber-500/20",
        info: "rounded-xl bg-blue-600 text-white shadow-sm hover:bg-blue-700 focus-visible:ring-blue-500/20",
        danger: "rounded-xl bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-500/20",
        whatsapp: "rounded-xl bg-whatsapp text-white shadow-sm hover:bg-whatsapp/90",
        "mx-elite": "rounded-xl bg-emerald-700 text-white shadow-sm hover:bg-emerald-800 focus-visible:ring-emerald-500/20",
      },
      size: {
        default: "h-mx-11 px-6 sm:h-10 sm:px-4",
        sm: "h-mx-9 rounded-lg px-3",
        xs: "h-mx-8 rounded-lg px-2 text-caption",
        lg: "h-mx-14 rounded-xl px-8",
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
              <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-mx-xs -translate-x-1/2 rounded-xl bg-gray-900 px-mx-xs py-mx-tiny text-mx-micro font-medium text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
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
