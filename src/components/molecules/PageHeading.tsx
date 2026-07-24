import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { LayoutDashboard } from 'lucide-react'
import { Typography } from '../atoms/Typography'
import { useMxSurfaceVisualMode } from '@/components/module/MxSurfaceVisualContext'

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
  const manager = useMxSurfaceVisualMode() === 'manager'

  if (manager) {
    return (
      <header
        data-mx-page-heading="manager"
        className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
              <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              {breadcrumb ? <div className="mb-1 text-xs text-gray-500">{breadcrumb}</div> : null}
              <Typography as="h1" variant="h2" className="text-xl font-bold text-gray-800 md:text-2xl">
                {title}
              </Typography>
              {subtitle ? (
                <Typography as="div" variant="p" className="mt-1 max-w-3xl text-sm font-normal leading-6 text-gray-500">
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

  return (
    <header className="flex min-w-0 shrink-0 flex-col justify-between gap-mx-sm border-b border-border-default pb-mx-md sm:gap-mx-md sm:pb-mx-lg lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-col gap-mx-tiny text-center lg:text-left">
        {breadcrumb && <div className="mb-mx-xs">{breadcrumb}</div>}
        <div className="flex min-w-0 items-center justify-center gap-mx-sm lg:justify-start">
          <div className="h-mx-8 w-mx-xs shrink-0 rounded-mx-full bg-brand-primary shadow-mx-md sm:h-mx-10" aria-hidden="true" />
          <Typography variant="h1" className="min-w-0 break-words text-2xl leading-tight sm:text-3xl md:text-[2rem] xl:text-4xl">{title}</Typography>
        </div>
        {subtitle && (
          <Typography variant="caption" className="px-mx-xs text-[11px] font-bold uppercase leading-snug tracking-normal text-text-label sm:pl-mx-md sm:text-[12px] sm:font-black xl:whitespace-nowrap">
            {subtitle}
          </Typography>
        )}
      </div>
      {actions && (
        <div className="flex w-full min-w-0 flex-col items-center gap-mx-sm sm:flex-row sm:flex-wrap lg:w-auto lg:max-w-[70%] lg:shrink-0 lg:justify-end xl:flex-wrap">
          {actions}
        </div>
      )}
    </header>
  )
}
