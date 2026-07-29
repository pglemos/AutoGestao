/**
 * MX Design System — espelho TS da arquitetura de tokens.
 *
 * Mantido em sincronia com `primitives.css` / `semantic.css` / `components.css`
 * e verificado por `tokens-contract.test.ts`. Use para chart libs e qualquer
 * consumidor que precise do valor em JS (Recharts não lê CSS custom properties
 * em todas as props).
 */

export const MX_DENSITIES = ['comfortable', 'standard', 'compact'] as const
export type MxDensity = (typeof MX_DENSITIES)[number]

/** Camada 2 — nomes semânticos válidos. Fonte para lint e testes. */
export const MX_SEMANTIC_COLOR_TOKENS = [
  'background',
  'surface',
  'surface-muted',
  'surface-elevated',
  'text-primary',
  'text-secondary',
  'text-disabled',
  'border',
  'border-strong',
  'primary',
  'primary-hover',
  'primary-active',
  'primary-foreground',
  'primary-subtle',
  'success',
  'success-subtle',
  'warning',
  'warning-subtle',
  'danger',
  'danger-subtle',
  'info',
  'info-subtle',
  'focus-ring',
] as const
export type MxSemanticColorToken = (typeof MX_SEMANTIC_COLOR_TOKENS)[number]

/** Escala de z-index fechada — §34. Nenhum valor fora desta lista é permitido. */
export const MX_Z_INDEX = {
  base: 0,
  sticky: 10,
  sidebar: 20,
  topbar: 30,
  drawer: 40,
  overlay: 50,
  modal: 60,
  popover: 70,
  toast: 80,
  tooltip: 90,
} as const

/** Tokens de motion — §20. */
export const MX_MOTION = {
  duration: {
    instant: 0,
    fast: 150,
    normal: 200,
    slow: 300,
    deliberate: 600,
  },
  easing: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    enter: 'cubic-bezier(0, 0, 0, 1)',
    exit: 'cubic-bezier(0.3, 0, 1, 1)',
    emphasized: 'cubic-bezier(0.2, 0, 0, 1.2)',
  },
} as const

/** Classe raiz do Design System. Aplicada pelo AppShell. */
export const MX_DS_ROOT_CLASS = 'mx-ds'

/** Referência de cor semântica em CSS, para uso em `style` de bibliotecas. */
export function mxColor(token: MxSemanticColorToken, alpha?: number): string {
  const ref = `var(--mx-color-${token})`
  return alpha === undefined ? `hsl(${ref})` : `hsl(${ref} / ${alpha})`
}
