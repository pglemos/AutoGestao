import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SkipLinkProps {
  /** `id` do landmark de destino, sem `#`. */
  targetId: string
  children?: React.ReactNode
  className?: string
}

/**
 * Primeiro elemento focável da página, invisível até receber foco.
 *
 * Sem ele, quem navega por teclado atravessa a sidebar inteira antes de chegar
 * ao conteúdo em cada troca de rota. O clique é interceptado para mover o foco
 * de fato — só alterar o hash rola a página sem mudar o foco em vários
 * navegadores.
 */
export function SkipLink({ targetId, children = 'Pular para o conteúdo', className }: SkipLinkProps) {
  const handleActivate = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById(targetId)
    if (!target) return
    event.preventDefault()
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
    target.focus()
    target.scrollIntoView({ block: 'start' })
  }

  return (
    <a
      href={`#${targetId}`}
      onClick={handleActivate}
      className={cn(
        'sr-only',
        'focus:not-sr-only focus:fixed focus:left-[var(--mx-space-4)] focus:top-[var(--mx-space-4)]',
        'focus:z-[var(--mx-z-tooltip)] focus:inline-flex focus:items-center',
        'focus:h-[var(--mx-button-height-md)] focus:rounded-[var(--mx-button-radius)] focus:px-[var(--mx-button-padding-inline-md)]',
        'focus:bg-[hsl(var(--mx-color-primary))] focus:text-[hsl(var(--mx-color-primary-foreground))]',
        'focus:text-[length:var(--mx-font-size-base)] focus:font-semibold focus:no-underline',
        'focus:shadow-[var(--mx-shadow-lg)] focus:outline-none',
        'focus:ring-2 focus:ring-[hsl(var(--mx-color-focus-ring))] focus:ring-offset-2',
        className,
      )}
    >
      {children}
    </a>
  )
}
