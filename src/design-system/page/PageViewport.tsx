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
      tabIndex={props.tabIndex ?? 0}
      className={cn(
        'h-full min-h-0 w-full min-w-0 overflow-y-auto overflow-x-hidden no-scrollbar bg-surface-alt text-gray-800',
        className,
      )}
    >
      {children}
    </Element>
  )
}
