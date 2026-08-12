import * as React from 'react'
import { PageCanvas, type PageCanvasProps } from '@/design-system/page'

export interface PageTemplateProps extends Omit<PageCanvasProps, 'as'> {
  /** Elemento do canvas interno. `div` evita uma landmark main aninhada. */
  as?: 'div' | 'section'
  /** Fundo da superfície da página. */
  surface?: 'muted' | 'plain'
  /** Classes legadas da superfície, não decisões de geometria ou rolagem. */
  scrollerClassName?: string
}

/**
 * Superfície de página + container canônico — §11.4.
 *
 * A rolagem pertence ao `PageViewport` fornecido pelo shell. Esta casca não
 * pode criar um scroll vertical: ela apenas mantém a superfície e delega a
 * largura, gutters e safe areas ao `PageCanvas`.
 *
 * As variantes semânticas de página (dashboard, formulário, leitura…) continuam
 * vindo de `width`, não de um template por tipo — dez arquivos quase idênticos
 * divergiriam entre si na primeira manutenção.
 */
export function PageTemplate({
  children,
  surface = 'muted',
  scrollerClassName,
  as = 'div',
  ...canvasProps
}: PageTemplateProps) {
  const background = surface === 'muted' ? 'bg-surface-alt' : 'bg-background'
  return (
    <div
      className={`min-h-full w-full min-w-0 ${background} ${scrollerClassName ?? ''}`.trim()}
      data-mx-page-template=""
    >
      <PageCanvas as={as} {...canvasProps}>
        {children}
      </PageCanvas>
    </div>
  )
}
