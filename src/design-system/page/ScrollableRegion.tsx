import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ScrollableRegionProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Eixo do scroll local. Página nunca usa `vertical` — ver contrato §7.8. */
  axis?: 'horizontal' | 'vertical' | 'both'
  /**
   * Rótulo do região para leitor de tela. Obrigatório porque um contêiner
   * rolável focável sem nome acessível é apenas uma parada de tab sem sentido.
   */
  label: string
}

const AXIS_CLASS: Record<NonNullable<ScrollableRegionProps['axis']>, string> = {
  horizontal: 'overflow-x-auto',
  vertical: 'overflow-y-auto',
  both: 'overflow-auto',
}

/**
 * Dono único do scroll LOCAL de conteúdo (tabela larga, Kanban, carrossel).
 *
 * Por que existe: um `<div class="overflow-x-auto">` cujo conteúdo não tem
 * elemento focável é inalcançável por teclado — quem navega sem mouse não
 * consegue rolar a tabela. É a regra `scrollable-region-focusable` do axe
 * (WCAG 2.1.1), que apareceu no sweep da FASE AE nas rotas de departamento.
 *
 * A correção canônica é tornar a própria região focável e nomeada, e é isso
 * que este primitivo garante em um lugar só — em vez de repetir
 * `tabIndex={0} role="region" aria-label=…` em cada tela.
 *
 * NÃO use para o scroll vertical da página: esse pertence ao PageViewport.
 */
export const ScrollableRegion = React.forwardRef<HTMLDivElement, ScrollableRegionProps>(
  function ScrollableRegion({ axis = 'horizontal', label, className, children, ...props }, ref) {
    return (
      <div
        ref={ref}
        role="region"
        aria-label={label}
        tabIndex={0}
        className={cn(
          AXIS_CLASS[axis],
          'outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    )
  },
)
