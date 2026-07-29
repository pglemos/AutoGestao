import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

/** Campo de texto. Aparência única — sem variação por perfil (§8.5). */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-normal text-gray-800 shadow-none outline-none transition',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium',
        'placeholder:text-gray-400',
        'focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20',
        'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export { Input }
