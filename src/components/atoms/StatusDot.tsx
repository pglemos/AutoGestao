import * as React from 'react'
import { cn } from '@/lib/utils'
import { VisuallyHidden } from '@/components/atoms/VisuallyHidden'

const toneClasses = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  neutral: 'bg-text-disabled',
} as const

export type StatusTone = keyof typeof toneClasses

export interface StatusDotProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone: StatusTone
  /**
   * Texto do estado. Obrigatório: cor nunca pode ser o único indicador (§43.15).
   * Renderize-o visível via `showLabel`, ou deixe-o só para leitores de tela
   * quando o rótulo já estiver adjacente na interface.
   */
  label: string
  showLabel?: boolean
  pulse?: boolean
}

/** Indicador compacto de estado. Sempre acompanhado de texto. */
const StatusDot = React.forwardRef<HTMLSpanElement, StatusDotProps>(
  ({ className, tone, label, showLabel = false, pulse = false, ...props }, ref) => (
    <span
      ref={ref}
      className={cn('inline-flex items-center gap-[var(--mx-space-2)]', className)}
      {...props}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        {pulse ? (
          <span
            aria-hidden
            className={cn(
              'absolute inline-flex h-full w-full rounded-full opacity-60 motion-safe:animate-ping motion-reduce:hidden',
              toneClasses[tone],
            )}
          />
        ) : null}
        <span
          aria-hidden
          className={cn('relative inline-flex h-2 w-2 rounded-full', toneClasses[tone])}
        />
      </span>
      {showLabel ? (
        <span className="text-[length:var(--mx-font-size-xs)] text-text-secondary">
          {label}
        </span>
      ) : (
        <VisuallyHidden>{label}</VisuallyHidden>
      )}
    </span>
  ),
)
StatusDot.displayName = 'StatusDot'

export { StatusDot }
