import type { ReactNode } from 'react'
import { isPerfilInternoMx, useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { InternalMxCanonicalSurface } from './InternalMxCanonicalSurface'

export function MxRoleVisualScope({
  children,
  manager = true,
  className,
}: {
  children: ReactNode
  manager?: boolean
  className?: string
}) {
  const { role } = useAuth()

  if (isPerfilInternoMx(role)) {
    return (
      <InternalMxCanonicalSurface role={role}>
        <div className={cn('h-full min-h-0 w-full', className)}>{children}</div>
      </InternalMxCanonicalSurface>
    )
  }

  if (!manager) return <>{children}</>

  // O modo `manager` é a aparência aprovada do Base44/Dono — não um tema do
  // perfil Gerente. Até aqui o escopo o fornecia apenas aos botões, então a
  // mesma tela combinava botão Base44 com campo, card e tabela no visual
  // legado. Fornecer também às superfícies alinha a tela inteira à referência.
  return (
        <div
          data-mx-visual-system="manager"
          className={cn(
            'h-full min-h-0 w-full bg-gray-50 text-foreground',
            className,
          )}
        >
          {children}
        </div>
  )
}
