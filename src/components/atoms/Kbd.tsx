import * as React from 'react'
import { cn } from '@/lib/utils'

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {}

/** Tecla ou atalho de teclado. */
const Kbd = React.forwardRef<HTMLElement, KbdProps>(({ className, ...props }, ref) => (
  <kbd
    ref={ref}
    className={cn(
      'inline-flex h-5 min-w-5 items-center justify-center rounded-[4px] px-1.5',
      'border border-border bg-surface-alt',
      'font-mono text-[length:var(--mx-font-size-micro)] font-medium text-text-secondary',
      className,
    )}
    {...props}
  />
))
Kbd.displayName = 'Kbd'

export { Kbd }
