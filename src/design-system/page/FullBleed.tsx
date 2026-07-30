import * as React from 'react'

export interface FullBleedProps {
  children: React.ReactNode
  className?: string
}

/**
 * Escape explícito da margem do `PageCanvas` — §8.5.
 *
 * Para o conteúdo que legitimamente precisa encostar nas bordas: mapas,
 * gráficos de largura total, faixas de destaque.
 *
 * Existe para que esse escape seja **nomeado e localizável**. Margem negativa
 * improvisada dentro de uma página resolve o mesmo pixel, mas fica
 * indistinguível de um bug e reaparece em cada tela nova. Um `grep FullBleed`
 * lista todos os escapes do produto.
 */
export function FullBleed({ children, className }: FullBleedProps) {
  return (
    <div
      className={className}
      style={{
        // Anula exatamente a margem lateral que o canvas aplicou — nem mais,
        // nem menos, e continua correto quando o breakpoint muda o token.
        marginInline: 'calc(var(--mx-page-margin) * -1)',
      }}
      data-mx-full-bleed=""
    >
      {children}
    </div>
  )
}
