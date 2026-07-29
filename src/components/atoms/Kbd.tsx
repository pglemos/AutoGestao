import * as React from 'react'
import { cn } from '@/lib/utils'

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {}

/** Tecla ou atalho de teclado. */
const Kbd = React.forwardRef<HTMLElement, KbdProps>(({ className, ...props }, ref) => (
  <kbd
    ref={ref}
    className={cn(
      'inline-flex h-5 min-w-5 items-center justify-center rounded-[4px] px-1.5',
      'border border-[hsl(var(--mx-color-border))] bg-[hsl(var(--mx-color-surface-muted))]',
      'font-mono text-[length:var(--mx-font-size-micro)] font-medium text-[hsl(var(--mx-color-text-secondary))]',
      className,
    )}
    {...props}
  />
))
Kbd.displayName = 'Kbd'

export { Kbd }
