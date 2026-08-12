import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

/** Campo de texto longo. Aparência única — sem variação por perfil (§8.5). */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        'flex min-h-[120px] w-full resize-y rounded-xl border border-border bg-white px-3 py-3 text-sm font-normal text-foreground shadow-none outline-none transition',
        'placeholder:text-muted-foreground',
        'focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20',
        'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-muted-foreground',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'

export { Textarea }
