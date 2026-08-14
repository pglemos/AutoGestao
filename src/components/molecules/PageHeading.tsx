import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { LayoutDashboard } from 'lucide-react'
import { PageHeader } from './PageHeader'

export type PageHeadingProps = {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  breadcrumb?: ReactNode
  icon?: LucideIcon
}

export function PageHeading({
  title,
  subtitle,
  actions,
  breadcrumb,
  icon: Icon = LayoutDashboard,
}: PageHeadingProps) {
  // Mantém a API histórica usada pelas páginas internas, mas a geometria é
  // única: todos os headers passam pelo mesmo organismo canônico.
  return (
    <PageHeader
      data-mx-page-heading="manager"
      title={title}
      description={subtitle}
      breadcrumb={breadcrumb}
      icon={Icon}
      actions={actions}
      titleVariant="h2"
      descriptionVariant="p"
    />
  )
}
