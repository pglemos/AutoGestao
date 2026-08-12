import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

/** Campo de texto. Aparência única — sem variação por perfil (§8.5). */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-[var(--mx-input-radius)] border border-border bg-white px-3 py-2 text-sm font-normal text-foreground shadow-none outline-none transition',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium',
        'placeholder:text-muted-foreground',
        'focus-visible:border-status-success focus-visible:ring-2 focus-visible:ring-status-success/20',
        'disabled:cursor-not-allowed disabled:bg-surface-alt disabled:text-muted-foreground',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export { Input }
