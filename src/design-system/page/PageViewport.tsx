import * as React from 'react'

import { cn } from '@/lib/utils'

export interface PageViewportProps
  extends React.HTMLAttributes<HTMLElement> {
  /**
   * O shell autenticado usa `section` para preservar a composição do banner
   * de simulação. `div` existe para Storybook e shells embutidos.
   */
  as?: 'section' | 'div'
}

/**
 * Único scroll owner vertical de uma página autenticada.
 *
 * `PageCanvas` decide largura, gutters e safe areas; este componente decide
 * apenas a viewport rolável. Conteúdo de modal, drawer, listbox e tabela pode
 * rolar internamente, mas uma página comum não deve criar outro `overflow-y`.
 *
 * `tabIndex` padrão é `-1` (FASE H 08.003): o scroll container é passivo e não
 * pode ser uma parada de tabulação — o primeiro Tab em carga nova deve cair no
 * skip-link, e o foco programático de SkipLink/RouteAnnouncer visa o
 * `main#main-content`, não esta viewport. Um consumidor que de fato precise
 * expor a viewport na ordem de tabulação continua podendo passar `tabIndex={0}`
 * explicitamente.
 */
export function PageViewport({
  as: Element = 'section',
  className,
  children,
  ...props
}: PageViewportProps) {
  return (
    <Element
      {...props}
      data-mx-page-viewport=""
      data-mx-page-scroll-owner=""
      tabIndex={props.tabIndex ?? -1}
      className={cn(
        'min-h-0 w-full min-w-0 flex-1 overflow-y-auto overflow-x-hidden no-scrollbar bg-surface-alt text-foreground',
        // 20.009 — o mobile header é `fixed` (72px); o scroll owner reserva
        // `scroll-padding-top` para o foco programático/Tab não ficar oculto
        // sob ele ao rolar até o elemento.
        '[scroll-padding-top:var(--mx-mobile-header-height)]',
        className,
      )}
    >
      {children}
    </Element>
  )
}
