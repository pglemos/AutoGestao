import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

/** Campo de texto longo. Aparência única — sem variação por perfil (§8.5). */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        'flex min-h-[var(--mx-textarea-min-height)] w-full resize-y rounded-[var(--mx-input-radius)] border-[length:var(--mx-input-border-width)] border-solid border-border bg-surface-default px-3 py-3 text-sm font-normal text-text-primary shadow-none outline-none transition',
        'placeholder:text-text-disabled',
        'focus-visible:border-primary focus-visible:ring-[length:var(--mx-input-focus-ring-width)] focus-visible:ring-focus-ring/25',
        'disabled:cursor-not-allowed disabled:bg-surface-alt disabled:text-text-disabled',
        'read-only:cursor-default read-only:bg-surface-alt read-only:text-text-disabled',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'

export { Textarea }
