import { createContext, useContext, type ReactNode } from 'react'
import type { InternalMxTemplateKind } from '@/design-system/internal-mx/internalMxPageRegistry'
import type { UserRole } from '@/types/database'
import { cn } from '@/lib/utils'

type InternalMxTemplateContextValue = {
  kind: InternalMxTemplateKind
  pageKey: string
  pageTitle: string
  role: UserRole | null
}

const InternalMxTemplateContext = createContext<InternalMxTemplateContextValue | null>(null)

const templateClasses: Record<InternalMxTemplateKind, string> = {
  dashboard: 'mx-canonical-dashboard',
  list: 'mx-canonical-list',
  detail: 'mx-canonical-detail',
  workspace: 'mx-canonical-workspace',
  settings: 'mx-canonical-settings',
}

export function useInternalMxTemplate(): InternalMxTemplateContextValue | null {
  return useContext(InternalMxTemplateContext)
}

export function InternalMxCanonicalTemplate({
  kind,
  pageKey,
  pageTitle,
  role,
  children,
}: {
  kind: InternalMxTemplateKind
  pageKey: string
  pageTitle: string
  role: UserRole | null
  children: ReactNode
}) {
  const contextValue: InternalMxTemplateContextValue = { kind, pageKey, pageTitle, role }

  return (
    <InternalMxTemplateContext.Provider value={contextValue}>
      <section
        aria-label={pageTitle}
        data-mx-canonical-template={kind}
        data-mx-template-page-key={pageKey}
        data-mx-template-role={role || undefined}
        data-mx-template-version="manager-v4"
        className={cn('mx-canonical-template h-full min-h-0 w-full', templateClasses[kind])}
      >
        <div data-mx-template-shell="" data-mx-template-slot="shell" className="h-full min-h-0 w-full">
          <div
            data-mx-template-body=""
            data-mx-template-slot="body"
            data-mx-template-legacy-bridge=""
            className="h-full min-h-0 w-full"
          >
            {children}
          </div>
        </div>
      </section>
    </InternalMxTemplateContext.Provider>
  )
}
