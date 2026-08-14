import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

/** Campo de texto. Aparência única — sem variação por perfil (§8.5). */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-[var(--mx-input-height)] w-full rounded-[var(--mx-input-radius)] border-[length:var(--mx-input-border-width)] border-solid border-border bg-surface-default px-3 py-2 text-sm font-normal text-text-primary shadow-none outline-none transition',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium',
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
Input.displayName = 'Input'

export { Input }
