import * as React from 'react'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import { cn } from '@/lib/utils'

export interface SwitchProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> {}

/**
 * Alterna um estado que vale imediatamente. Se a mudança só vale após salvar,
 * use `Checkbox` — o switch promete efeito instantâneo.
 */
const Switch = React.forwardRef<React.ElementRef<typeof SwitchPrimitive.Root>, SwitchProps>(
  ({ className, ...props }, ref) => (
    <SwitchPrimitive.Root
      ref={ref}
      className={cn(
        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent',
        'transition-colors duration-[var(--mx-duration-fast)] ease-[var(--mx-easing-standard)]',
        'focus-visible:outline-none focus-visible:ring-[length:var(--mx-input-focus-ring-width)] focus-visible:ring-[hsl(var(--mx-color-focus-ring))] focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:bg-[hsl(var(--mx-color-primary))]',
        'data-[state=unchecked]:bg-[hsl(var(--mx-color-border-strong))]',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'pointer-events-none block h-4 w-4 rounded-full bg-[hsl(var(--mx-color-surface))] shadow-[var(--mx-shadow-sm)] ring-0',
          'transition-transform duration-[var(--mx-duration-fast)] ease-[var(--mx-easing-standard)]',
          'data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0',
        )}
      />
    </SwitchPrimitive.Root>
  ),
)
Switch.displayName = 'Switch'

export { Switch }
