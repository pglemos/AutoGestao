import * as React from 'react'

/**
 * Larguras semânticas — §8.1.
 *
 * A escolha é feita pelo que o conteúdo é, não por uma medida. Um formulário é
 * `form` porque formulários longos ficam ilegíveis esticados, não porque
 * alguém mediu 768px numa tela específica.
 */
export const PAGE_WIDTHS = [
  'fluid',
  'dashboard',
  'wide',
  'focused',
  'form',
  'reading',
] as const
export type PageWidth = (typeof PAGE_WIDTHS)[number]

export const PAGE_DENSITIES = ['comfortable', 'compact'] as const
export type PageDensity = (typeof PAGE_DENSITIES)[number]

/**
 * Espaço reservado no fim da página — §8.4.
 *
 * `navigation` para rotas que têm bottom navigation no mobile; `actions` para
 * rotas com barra de ações fixa (salvar, publicar). Sempre somado à
 * `env(safe-area-inset-bottom)`, então o valor não muda entre um iPhone com
 * notch e um desktop.
 */
export const PAGE_CLEARANCES = ['none', 'navigation', 'actions'] as const
export type PageBottomClearance = (typeof PAGE_CLEARANCES)[number]

export interface PageCanvasProps {
  children: React.ReactNode
  /** Largura semântica. Default `dashboard`, o caso mais comum no produto. */
  width?: PageWidth
  /** Densidade do ritmo vertical. Default herda a densidade do AppShell. */
  density?: PageDensity
  /** Reserva no fim da página. Default `none`. */
  bottomClearance?: PageBottomClearance
  /** Elemento raiz. `main` por padrão; use `div` quando já houver um `main`. */
  as?: 'main' | 'div' | 'section'
  /** `id` do conteúdo principal, alvo do skip-link do AppShell. */
  id?: string
  className?: string
}

/**
 * Container canônico de página — §8.
 *
 * Responsabilidade única e exclusiva: decidir largura máxima, centralização,
 * margem lateral responsiva, padding vertical e safe area inferior. É o único
 * lugar do produto autorizado a tomar essas decisões.
 *
 * Antes disso, cada rota escolhia sua própria margem com `px-*`/`max-w-*`
 * soltos, e o resultado é que títulos equivalentes começavam em linhas
 * diferentes entre perfis. O ganho aqui não é "menos código": é que passa a
 * existir um único ponto onde o alinhamento pode ser corrigido para todas as
 * telas de uma vez.
 *
 * Os valores vêm de `--mx-page-*` em `semantic.css`, que já respondem aos
 * breakpoints do Material Design 3. Este componente não conhece breakpoint
 * nenhum — deliberadamente.
 */
export function PageCanvas({
  children,
  width = 'dashboard',
  density,
  bottomClearance = 'none',
  as: Element = 'main',
  id,
  className,
}: PageCanvasProps) {
  const style: React.CSSProperties & Record<string, string> = {
    // A largura vem do token da variante; nunca de um literal aqui.
    maxWidth: `var(--mx-page-width-${width})`,
    marginInline: 'auto',
    paddingInline: 'var(--mx-page-margin)',
    paddingTop: 'var(--mx-page-padding-top)',
    // Soma a reserva de navegação à safe area do dispositivo — §8.4.
    paddingBottom:
      'calc(var(--mx-page-padding-bottom) + var(--mx-page-bottom-clearance) + env(safe-area-inset-bottom, 0px))',
    '--mx-page-bottom-clearance': `var(--mx-page-clearance-${bottomClearance})`,
    width: '100%',
  }

  return (
    <Element
      id={id}
      className={className}
      style={style}
      // Atributos de layout para regressão visual e E2E (§8.3): o teste afirma
      // a intenção declarada, não a medida renderizada.
      data-mx-page-canvas=""
      data-mx-page-width={width}
      data-mx-page-clearance={bottomClearance}
      data-mx-density={density}
    >
      {children}
    </Element>
  )
}
