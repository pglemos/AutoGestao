import type { ElementType, HTMLAttributes, LabelHTMLAttributes, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, Inbox, LoaderCircle } from 'lucide-react'
import { Button, ButtonVisualProvider } from '@/components/atoms/Button'
import { Input, type InputProps } from '@/components/atoms/Input'
import { Select, type SelectProps } from '@/components/atoms/Select'
import { Skeleton, type SkeletonProps } from '@/components/atoms/Skeleton'
import { Textarea, type TextareaProps } from '@/components/atoms/Textarea'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { cn } from '@/lib/utils'
import { MxSurfaceVisualProvider } from './MxSurfaceVisualContext'
import {
  InternalMxTemplateHeader,
  InternalMxTemplatePage,
  InternalMxTemplateSection,
  InternalMxTemplateTable,
  InternalMxTemplateToolbar,
} from './InternalMxTemplateSlots'

export type MxTone = 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'violet' | 'neutral'
export type MxAccessMode = 'manage' | 'read-only'

type ToneStyle = { icon: string; surface: string; value: string; banner: string; progress: string }
const toneStyles: Record<MxTone, ToneStyle> = {
  brand: { icon: 'bg-emerald-50 text-emerald-600', surface: 'border-gray-100', value: 'text-emerald-700', banner: 'border-emerald-100 bg-emerald-50 text-emerald-800', progress: 'bg-emerald-600' },
  success: { icon: 'bg-emerald-50 text-emerald-600', surface: 'border-gray-100', value: 'text-emerald-700', banner: 'border-emerald-100 bg-emerald-50 text-emerald-800', progress: 'bg-emerald-600' },
  warning: { icon: 'bg-amber-50 text-amber-600', surface: 'border-amber-200', value: 'text-amber-700', banner: 'border-amber-200 bg-amber-50 text-amber-800', progress: 'bg-amber-500' },
  danger: { icon: 'bg-red-50 text-red-600', surface: 'border-red-200', value: 'text-red-700', banner: 'border-red-200 bg-red-50 text-red-700', progress: 'bg-red-500' },
  info: { icon: 'bg-blue-50 text-blue-600', surface: 'border-blue-200', value: 'text-blue-700', banner: 'border-blue-200 bg-blue-50 text-blue-700', progress: 'bg-blue-500' },
  violet: { icon: 'bg-violet-50 text-violet-600', surface: 'border-violet-200', value: 'text-violet-700', banner: 'border-violet-200 bg-violet-50 text-violet-700', progress: 'bg-violet-500' },
  neutral: { icon: 'bg-gray-50 text-gray-500', surface: 'border-gray-100', value: 'text-gray-800', banner: 'border-gray-200 bg-gray-50 text-gray-700', progress: 'bg-gray-400' },
}

export function MxModulePage({ children, className, contentClassName, maxWidth = '7xl', id, accessMode }: { children: ReactNode; className?: string; contentClassName?: string; maxWidth?: 'full' | '7xl'; id?: string; accessMode?: MxAccessMode }) {
  return (
    <ButtonVisualProvider mode="manager">
      <MxSurfaceVisualProvider mode="manager">
        <InternalMxTemplatePage
          id={id}
          data-mx-module-page=""
          data-mx-visual-system="manager"
          data-mx-access-mode={accessMode}
          className={cn('min-h-full w-full overflow-y-auto text-gray-800', className)}
        >
          <div className={cn('mx-auto w-full space-y-5 px-4 py-6 pb-24', maxWidth === '7xl' ? 'max-w-7xl' : 'max-w-none', contentClassName)}>{children}</div>
        </InternalMxTemplatePage>
      </MxSurfaceVisualProvider>
    </ButtonVisualProvider>
  )
}

export function MxModuleHeader({ title, description, eyebrow, actions, className }: { title: ReactNode; description?: ReactNode; eyebrow?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <InternalMxTemplateHeader data-mx-module-header="" className={cn('rounded-2xl border border-gray-100 bg-white p-5 shadow-sm', className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          {eyebrow ? <Typography variant="caption" className="mb-1 block font-semibold text-emerald-700">{eyebrow}</Typography> : null}
          <Typography as="h1" variant="h2" className="text-xl font-bold text-gray-800 md:text-2xl">{title}</Typography>
          {description ? <Typography variant="p" className="mt-1 max-w-3xl text-sm leading-6 text-gray-500">{description}</Typography> : null}
        </div>
        {actions ? <div className="flex min-w-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </InternalMxTemplateHeader>
  )
}

export function MxMetricGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <section data-mx-metric-grid="" className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4', className)}>{children}</section>
}

export function MxMetricCard({ title, value, detail, icon: Icon, tone = 'brand', actionLabel, onAction, children, className }: { title: string; value: string | number; detail: string; icon: LucideIcon; tone?: MxTone; actionLabel?: string; onAction?: () => void; children?: ReactNode; className?: string }) {
  const styles = toneStyles[tone]
  return (
    <Card className={cn('group flex min-h-40 flex-col border bg-white p-4', styles.surface, className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Typography variant="h3" className="text-sm font-semibold text-gray-700">{title}</Typography>
          <Typography variant="p" className="mt-1 text-sm leading-5 text-gray-500">{detail}</Typography>
        </div>
        <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', styles.icon)}><Icon size={18} strokeWidth={1.8} aria-hidden="true" /></span>
      </div>
      <div className="mt-4 flex flex-1 items-end justify-between gap-3">
        <Typography variant="h2" className={cn('text-3xl font-bold leading-none', styles.value)}>{value}</Typography>
        {children}
      </div>
      {actionLabel && onAction ? <Button variant="managerGhost" size="sm" className="mt-3 min-h-10 w-full justify-between px-0 text-emerald-700" onClick={onAction}>{actionLabel}<span aria-hidden="true">→</span></Button> : null}
    </Card>
  )
}

export function MxStatusGauge({ value, label, ariaLabel, showLabel = true }: { value: number; label: string; ariaLabel: string; showLabel?: boolean }) {
  const normalized = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div role="progressbar" aria-label={ariaLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={normalized} className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-gray-100" style={{ background: `conic-gradient(var(--color-brand-primary) ${normalized * 3.6}deg, var(--color-surface-alt) 0deg)` }}>
      <div className="grid h-14 w-14 place-items-center rounded-full bg-white text-center">
        <strong className="text-base leading-none text-gray-800">{normalized}%</strong>
        {showLabel ? <span className="max-w-12 text-[9px] font-medium leading-tight text-gray-500">{label}</span> : null}
      </div>
    </div>
  )
}

export function MxSectionCard({ as: Component = 'section', children, className, ...props }: { as?: ElementType; children: ReactNode; className?: string } & HTMLAttributes<HTMLElement>) {
  return <InternalMxTemplateSection as={Component} data-mx-section-card="" className={cn('overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm', className)} {...props}>{children}</InternalMxTemplateSection>
}

export function MxSectionHeader({ title, description, actions, className }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <header data-mx-section-header="" data-mx-template-slot="section-header" className={cn('flex flex-col gap-3 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="min-w-0">
        <Typography as="h2" variant="h3" className="text-lg font-semibold text-gray-800">{title}</Typography>
        {description ? <Typography variant="p" className="mt-1 text-sm text-gray-500">{description}</Typography> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}

export function MxToolbar({ children, className, ...props }: HTMLAttributes<HTMLElement>) {
  return <InternalMxTemplateToolbar data-mx-toolbar="" className={cn('flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-center', className)} {...props}>{children}</InternalMxTemplateToolbar>
}

export function MxField({ label, hint, error, children, className, ...props }: { label: ReactNode; hint?: ReactNode; error?: ReactNode; children: ReactNode; className?: string } & LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn('flex min-w-0 flex-col gap-2', className)} {...props}>
      <Typography as="span" variant="caption" className="font-medium text-gray-600">{label}</Typography>
      {children}
      {error ? <Typography variant="tiny" className="text-red-600">{error}</Typography> : hint ? <Typography variant="tiny" className="text-gray-500">{hint}</Typography> : null}
    </label>
  )
}

export function MxInput(props: InputProps) { return <Input {...props} /> }
export function MxSelect(props: SelectProps) { return <Select {...props} /> }
export function MxTextarea(props: TextareaProps) { return <Textarea {...props} /> }
export function MxTableSurface({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) { return <InternalMxTemplateTable data-mx-table-surface="" className={cn('w-full overflow-x-auto rounded-2xl border border-gray-100 bg-white', className)} {...props}>{children}</InternalMxTemplateTable> }

export function MxEmptyState({ title, description, icon: Icon = Inbox, action, className }: { title: string; description?: string; icon?: LucideIcon; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-h-48 flex-col items-center justify-center px-5 py-10 text-center', className)}>
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gray-50 text-gray-400"><Icon size={24} strokeWidth={1.8} aria-hidden="true" /></span>
      <Typography variant="h3" className="mt-4 text-base text-gray-800">{title}</Typography>
      {description ? <Typography variant="p" className="mt-2 max-w-md text-sm leading-6 text-gray-500">{description}</Typography> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function MxLoadingState({ label = 'Carregando', className }: { label?: string; className?: string }) {
  return <div className={cn('flex min-h-48 flex-col items-center justify-center gap-3 text-gray-500', className)} aria-busy="true" aria-live="polite" aria-label={label}><LoaderCircle className="animate-spin text-emerald-600 motion-reduce:animate-none" size={28} aria-hidden="true" /><Typography variant="caption" className="font-medium text-gray-500">{label}</Typography></div>
}

export function MxErrorState({ title = 'Não foi possível carregar', description, retry, className }: { title?: string; description: string; retry?: () => void; className?: string }) {
  return (
    <div className={cn('flex min-h-48 flex-col items-center justify-center px-5 py-10 text-center', className)} role="alert">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-600"><AlertTriangle size={24} aria-hidden="true" /></span>
      <Typography variant="h3" className="mt-4 text-base text-gray-800">{title}</Typography>
      <Typography variant="p" className="mt-2 max-w-md text-sm leading-6 text-gray-500">{description}</Typography>
      {retry ? <Button variant="managerOutline" className="mt-4" onClick={retry}>Tentar novamente</Button> : null}
    </div>
  )
}

export function MxStatusBanner({ tone = 'neutral', children, className, ...props }: { tone?: MxTone; children: ReactNode; className?: string } & HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-xl border px-4 py-3 text-sm font-medium', toneStyles[tone].banner, className)} role={tone === 'danger' ? 'alert' : 'status'} {...props}>{children}</div>
}

export function MxChartCard({ title, description, actions, children, className }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return <MxSectionCard className={className}><MxSectionHeader title={title} description={description} actions={actions} /><div className="p-5">{children}</div></MxSectionCard>
}

export function MxSkeleton(props: SkeletonProps) { return <Skeleton {...props} /> }
export function MxProgress({ value, tone = 'brand', label }: { value: number; tone?: MxTone; label?: string }) {
  const normalized = Math.max(0, Math.min(100, Math.round(value)))
  return <div className="space-y-2">{label ? <div className="flex items-center justify-between text-xs text-gray-500"><span>{label}</span><span>{normalized}%</span></div> : null}<div className="h-2 overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={normalized}><div className={cn('h-full rounded-full transition-[width] motion-reduce:transition-none', toneStyles[tone].progress)} style={{ width: `${normalized}%` }} /></div></div>
}
export function MxActionGroup({ children, className }: { children: ReactNode; className?: string }) { return <div className={cn('flex flex-wrap items-center gap-2', className)}>{children}</div> }
