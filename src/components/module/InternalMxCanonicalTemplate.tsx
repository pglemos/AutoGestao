import type { ReactNode } from 'react'
import type { InternalMxTemplateKind } from '@/design-system/internal-mx/internalMxPageRegistry'
import { cn } from '@/lib/utils'

const templateClasses: Record<InternalMxTemplateKind, string> = {
  dashboard: 'mx-canonical-dashboard',
  list: 'mx-canonical-list',
  detail: 'mx-canonical-detail',
  workspace: 'mx-canonical-workspace',
  settings: 'mx-canonical-settings',
}

export function InternalMxCanonicalTemplate({
  kind,
  children,
}: {
  kind: InternalMxTemplateKind
  children: ReactNode
}) {
  return (
    <div
      data-mx-canonical-template={kind}
      data-mx-template-version="manager-v3"
      className={cn('mx-canonical-template h-full min-h-0 w-full', templateClasses[kind])}
    >
      {children}
    </div>
  )
}
