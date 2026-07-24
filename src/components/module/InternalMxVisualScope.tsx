import type { ReactNode } from 'react'
import { ButtonVisualProvider } from '@/components/atoms/Button'
import { isPerfilInternoMx } from '@/hooks/useAuth'
import type { UserRole } from '@/types/database'
import '@/styles/internal-mx-manager-scope.css'
import { MxSurfaceVisualProvider } from './MxSurfaceVisualContext'

export function InternalMxVisualScope({
  role,
  children,
}: {
  role: UserRole | null
  children: ReactNode
}) {
  if (!isPerfilInternoMx(role)) return <>{children}</>

  return (
    <ButtonVisualProvider mode="manager">
      <MxSurfaceVisualProvider mode="manager">
        <div
          data-testid="internal-mx-visual-scope"
          data-mx-visual-system="manager"
          className="mx-manager-scope mx-internal-scope h-full min-h-0 w-full bg-gray-50 text-gray-800"
        >
          {children}
        </div>
      </MxSurfaceVisualProvider>
    </ButtonVisualProvider>
  )
}
