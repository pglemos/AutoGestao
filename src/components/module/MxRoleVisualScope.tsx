import type { ReactNode } from 'react'
import { ButtonVisualProvider } from '@/components/atoms/Button'
import { isPerfilInternoMx, useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { InternalMxVisualScope } from './InternalMxVisualScope'

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
      <InternalMxVisualScope role={role}>
        <div className={cn('h-full min-h-0 w-full', className)}>{children}</div>
      </InternalMxVisualScope>
    )
  }

  if (!manager) return <>{children}</>

  return (
    <ButtonVisualProvider mode="manager">
      <div
        data-mx-visual-system="manager"
        className={cn(
          'mx-manager-scope h-full min-h-0 w-full bg-gray-50 text-gray-800',
          className,
        )}
      >
        {children}
      </div>
    </ButtonVisualProvider>
  )
}
