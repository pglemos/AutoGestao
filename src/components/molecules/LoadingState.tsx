import * as React from 'react'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/atoms/Spinner'

export interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** O que está carregando. Vira o texto anunciado a leitores de tela. */
  label?: string
  /**
   * `skeleton` preserva o formato do conteúdo e evita layout shift — prefira-o
   * quando o layout de destino é conhecido. `spinner` serve a áreas pequenas.
   */
  variant?: 'spinner' | 'skeleton'
  /** Linhas do esqueleto. Ignorado em `spinner`. */
  rows?: number
}

/** Estado de carregamento padrão. Nenhuma página inventa o seu (§9.5). */
const LoadingState = React.forwardRef<HTMLDivElement, LoadingStateProps>(
  ({ className, label = 'Carregando dados', variant = 'spinner', rows = 3, ...props }, ref) => {
    if (variant === 'skeleton') {
      return (
        <div
          ref={ref}
          role="status"
          aria-busy="true"
          aria-label={label}
          className={cn('flex flex-col gap-[var(--mx-space-3)]', className)}
          {...props}
        >
          {Array.from({ length: rows }).map((_, index) => (
            <div
              key={index}
              aria-hidden
              className={cn(
                'h-4 rounded-[var(--mx-radius-sm)] bg-[hsl(var(--mx-color-surface-muted))]',
                'motion-safe:animate-pulse',
                index === rows - 1 ? 'w-2/3' : 'w-full',
              )}
            />
          ))}
        </div>
      )
    }

    return (
      <div
        ref={ref}
        role="status"
        aria-busy="true"
        className={cn(
          'flex flex-col items-center justify-center gap-[var(--mx-space-3)] py-[var(--mx-space-10)]',
          className,
        )}
        {...props}
      >
        <Spinner size="lg" tone="primary" label="" />
        <p className="text-[length:var(--mx-font-size-base)] text-[hsl(var(--mx-color-text-secondary))]">
          {label}
        </p>
      </div>
    )
  },
)
LoadingState.displayName = 'LoadingState'

export { LoadingState }
