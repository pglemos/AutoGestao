import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '@/lib/utils'

export interface LabelProps
  extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> {
  /** Marca o campo como obrigatório (asterisco + `aria-hidden` no símbolo). */
  required?: boolean
}

/**
 * Rótulo de campo. Sempre associado ao controle via `htmlFor` — placeholder
 * nunca substitui label (§16.1).
 */
const Label = React.forwardRef<React.ElementRef<typeof LabelPrimitive.Root>, LabelProps>(
  ({ className, required, children, ...props }, ref) => (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(
        'text-[length:var(--mx-font-size-base)] font-medium leading-none text-[hsl(var(--mx-color-text-primary))]',
        'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className,
      )}
      {...props}
    >
      {children}
      {required ? (
        <span aria-hidden className="ml-0.5 text-[hsl(var(--mx-color-danger))]">
          *
        </span>
      ) : null}
    </LabelPrimitive.Root>
  ),
)
Label.displayName = 'Label'

export { Label }
