import * as React from 'react'
import * as SeparatorPrimitive from '@radix-ui/react-separator'
import { cn } from '@/lib/utils'

export interface DividerProps
  extends React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root> {
  /** Rótulo centrado na linha (ex.: “ou”). Torna o divisor semântico. */
  label?: string
}

/** Separador visual. Decorativo por padrão — não anunciado a leitores de tela. */
const Divider = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  DividerProps
>(({ className, orientation = 'horizontal', decorative = true, label, ...props }, ref) => {
  if (label && orientation === 'horizontal') {
    return (
      <div className={cn('flex items-center gap-[var(--mx-space-3)]', className)}>
        <SeparatorPrimitive.Root
          ref={ref}
          decorative
          orientation="horizontal"
          className="h-px flex-1 bg-border"
          {...props}
        />
        <span className="text-[length:var(--mx-font-size-xs)] text-text-secondary">
          {label}
        </span>
        <SeparatorPrimitive.Root
          decorative
          orientation="horizontal"
          className="h-px flex-1 bg-border"
        />
      </div>
    )
  }

  return (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        'shrink-0 bg-border',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
      {...props}
    />
  )
})
Divider.displayName = 'Divider'

export { Divider }
