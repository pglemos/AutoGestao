import * as React from 'react'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import { cn } from '@/lib/utils'

export interface RadioGroupProps
  extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root> {}
export interface RadioProps
  extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> {}

/** Container de escolha única. Navegação por setas é nativa do Radix. */
const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  RadioGroupProps
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Root
    ref={ref}
    className={cn('grid gap-[var(--mx-space-2)]', className)}
    {...props}
  />
))
RadioGroup.displayName = 'RadioGroup'

const Radio = React.forwardRef<React.ElementRef<typeof RadioGroupPrimitive.Item>, RadioProps>(
  ({ className, ...props }, ref) => (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        'aspect-square h-4 w-4 rounded-full border border-[hsl(var(--mx-color-border-strong))]',
        'transition-colors duration-[var(--mx-duration-fast)] ease-standard',
        'focus-visible:outline-none focus-visible:ring-[length:var(--mx-input-focus-ring-width)] focus-visible:ring-[hsl(var(--mx-color-focus-ring))] focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:border-[hsl(var(--mx-color-primary))]',
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <span
          aria-hidden
          className="block h-2 w-2 rounded-full bg-[hsl(var(--mx-color-primary))]"
        />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  ),
)
Radio.displayName = 'Radio'

export { Radio, RadioGroup }
