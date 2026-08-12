import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { LayoutDashboard } from 'lucide-react'
import { Typography } from '../atoms/Typography'

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
  // Aparência única — sem variação por perfil (§8.5). O atributo mantém o
  // valor "manager" porque é o seletor usado por testes e E2E existentes.
  return (
    <header
      data-mx-page-heading="manager"
      className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm"
    >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
              <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              {breadcrumb ? <div className="mb-1 text-xs text-muted-foreground">{breadcrumb}</div> : null}
              <Typography as="h1" variant="h2" className="font-bold text-foreground">
                {title}
              </Typography>
              {subtitle ? (
                <Typography as="div" variant="p" className="mt-1 max-w-3xl text-sm font-normal leading-6 text-muted-foreground">
                  {subtitle}
                </Typography>
              ) : null}
            </div>
          </div>
          {actions ? (
            <div className="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">
              {actions}
            </div>
          ) : null}
        </div>
    </header>
  )
}
