import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { isPerfilInternoMx } from '@/hooks/useAuth'
import type { UserRole } from '@/types/database'
import '@/styles/internal-mx-manager-scope.css'
import '@/styles/internal-mx-template-slots.css'
import { InternalManagerRouteFrame } from './InternalManagerRouteFrame'

export function InternalMxVisualScope({
  role,
  children,
}: {
  role: UserRole | null
  children: ReactNode
}) {
  const location = useLocation()

  if (!isPerfilInternoMx(role)) return <>{children}</>

  return (
        <div
          data-testid="internal-mx-visual-scope"
          data-mx-visual-system="manager"
          className="mx-manager-scope mx-internal-scope h-full min-h-0 w-full bg-gray-50 text-gray-800"
        >
          <InternalManagerRouteFrame role={role} pathname={location.pathname}>
            {children}
          </InternalManagerRouteFrame>
        </div>
  )
}
