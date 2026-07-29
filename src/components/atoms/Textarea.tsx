import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

/** Campo de texto longo. Aparência única — sem variação por perfil (§8.5). */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        'flex min-h-[120px] w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm font-normal text-gray-800 shadow-none outline-none transition',
        'placeholder:text-gray-400',
        'focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20',
        'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'

export { Textarea }
