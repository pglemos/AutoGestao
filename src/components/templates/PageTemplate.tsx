import * as React from 'react'
import { PageCanvas, type PageCanvasProps } from '@/design-system/page'

export interface PageTemplateProps extends Omit<PageCanvasProps, 'as'> {
  /** Elemento do canvas interno. `main` por padrão. */
  as?: 'main' | 'div' | 'section'
  /** Fundo da área rolável. O padrão cobre a quase totalidade das telas. */
  surface?: 'muted' | 'plain'
  /** Classe da casca de rolagem, não do canvas. Raramente necessária. */
  scrollerClassName?: string
}

/**
 * Casca de página rolável + container canônico — §11.4.
 *
 * Toda tela migrada para o `PageCanvas` acabou repetindo a mesma dupla à mão:
 * um `<div>` que rola (`h-full w-full overflow-y-auto no-scrollbar bg-gray-50`)
 * envolvendo o canvas. O padrão apareceu em dezesseis lugares, e cada cópia é
 * uma chance de alguém esquecer o `no-scrollbar`, trocar o fundo ou deixar a
 * rolagem no elemento errado — que foi como `/vendas` acabou com o
 * conteúdo colado na borda.
 *
 * A separação entre os dois elementos é deliberada e não deve ser removida: quem
 * rola precisa ser o pai de altura fixa, e quem tem margem precisa ser o filho.
 * Juntar os papéis num elemento só faz o padding lateral rolar junto com o
 * conteúdo.
 *
 * As variantes semânticas de página (dashboard, formulário, leitura…) continuam
 * vindo de `width`, não de um template por tipo — dez arquivos quase idênticos
 * divergiriam entre si na primeira manutenção.
 */
export function PageTemplate({
  children,
  surface = 'muted',
  scrollerClassName,
  as = 'main',
  ...canvasProps
}: PageTemplateProps) {
  const background = surface === 'muted' ? 'bg-gray-50' : 'bg-white'
  return (
    <div
      className={`h-full w-full min-w-0 overflow-y-auto no-scrollbar ${background} ${scrollerClassName ?? ''}`.trim()}
      data-mx-page-scroller=""
    >
      <PageCanvas as={as} {...canvasProps}>
        {children}
      </PageCanvas>
    </div>
  )
}
