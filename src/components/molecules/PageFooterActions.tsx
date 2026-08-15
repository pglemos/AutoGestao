import * as React from 'react'
import { cn } from '@/lib/utils'

export interface PageFooterActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Ações persistentes (botões de submit/confirmar/cancelar) exibidas na
   * barra inferior da página. A barra é `sticky` (in-flow) — o conteúdo flui
   * ao redor dela e a `bottomClearance="actions"` do PageCanvas garante a
   * reserva — então ela NUNCA cobre o último campo (10.018).
   */
  children: React.ReactNode
}

/**
 * Barra de ações persistentes do rodapé de página (FASE J 10.016-10.018).
 *
 * - 10.016: barra persistente com fundo degradê de superfície → transparente,
 *   borda superior e `sticky bottom-0` com z-index de topo.
 * - 10.017: reserva de safe-area inferior via `env(safe-area-inset-bottom)`,
 *   somada a um respiro mínimo de 8px — em dispositivos com home indicator.
 * - 10.018: por ser `sticky` (não `fixed`), a barra permanece no fluxo; a
 *   reserva vem do `PageCanvas` com `bottomClearance="actions"`, então o
 *   último campo nunca fica coberto.
 */
const PageFooterActions = React.forwardRef<HTMLDivElement, PageFooterActionsProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      data-mx-page-footer-actions=""
      className={cn(
        'sticky bottom-0 z-[var(--mx-z-topbar)] mt-auto',
        '-mx-[var(--mx-page-margin)] border-t border-border',
        'bg-gradient-to-t from-surface to-surface/0',
        'px-[var(--mx-page-margin)] pt-3',
        'pb-[max(env(safe-area-inset-bottom, 0px), 8px)]',
        className,
      )}
      {...props}
    >
      <div className="mx-auto flex w-full max-w-[var(--mx-page-width-dashboard)] flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
        {children}
      </div>
    </div>
  ),
)
PageFooterActions.displayName = 'PageFooterActions'

export { PageFooterActions }
