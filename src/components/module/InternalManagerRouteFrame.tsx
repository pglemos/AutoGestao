import type { ReactNode } from 'react'
import { getInternalMxPageMeta } from '@/design-system/internal-mx/internalMxPageRegistry'
import type { UserRole } from '@/types/database'
import { isPerfilInternoMx } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { InternalMxCanonicalTemplate } from './InternalMxCanonicalTemplate'

export function InternalManagerRouteFrame({
  role,
  pathname,
  children,
}: {
  role: UserRole | null
  pathname: string
  children: ReactNode
}) {
  const pageMeta = getInternalMxPageMeta(pathname)
  const enabled = isPerfilInternoMx(role) && pageMeta.managerLayout

  return (
    <div
      data-mx-manager-page={enabled ? pageMeta.key : undefined}
      data-mx-manager-page-title={enabled ? pageMeta.title : undefined}
      data-mx-manager-template={enabled ? pageMeta.template : undefined}
      className={cn('h-full min-h-0 w-full', enabled && 'mx-manager-canonical-page')}
    >
      {enabled ? (
        <InternalMxCanonicalTemplate kind={pageMeta.template}>
          {children}
        </InternalMxCanonicalTemplate>
      ) : children}
    </div>
  )
}
