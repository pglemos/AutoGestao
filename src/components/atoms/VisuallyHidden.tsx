import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Conteúdo lido por leitores de tela, invisível na tela.
 *
 * Use para dar nome acessível a controles que só mostram ícone, para anunciar
 * mudanças em `aria-live` e para o resumo textual de gráficos (§14).
 */
export interface VisuallyHiddenProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Torna o conteúdo visível ao receber foco — usado pelo skip-link. */
  focusable?: boolean
  as?: 'span' | 'div'
}

const VisuallyHidden = React.forwardRef<HTMLSpanElement, VisuallyHiddenProps>(
  ({ className, focusable = false, as: Tag = 'span', ...props }, ref) => (
    <Tag
      ref={ref as React.Ref<HTMLSpanElement & HTMLDivElement>}
      className={cn(
        'absolute h-px w-px overflow-hidden whitespace-nowrap border-0 p-0',
        '[clip:rect(0,0,0,0)] [clip-path:inset(50%)]',
        focusable &&
          'focus:static focus:h-auto focus:w-auto focus:overflow-visible focus:whitespace-normal focus:[clip:auto] focus:[clip-path:none]',
        className,
      )}
      {...props}
    />
  ),
)
VisuallyHidden.displayName = 'VisuallyHidden'

export { VisuallyHidden }
